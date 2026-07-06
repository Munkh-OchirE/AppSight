import type { Prisma } from "@prisma/client";
import { upsertDiscoveredAssuranceClaimAnswer } from "@/lib/assessment/assuranceClaims";
import { createAuditLog } from "@/lib/audit/auditLog";
import { db } from "@/lib/db";
import { crawlEvidencePages } from "@/lib/discovery/crawler";
import { classifyEvidence, type DiscoveredEvidence } from "@/lib/discovery/evidenceClassifier";

type DiscoveryClient = Prisma.TransactionClient;

function getDiscoveryMaxPages() {
  const value = Number(process.env.DISCOVERY_MAX_PAGES ?? 20);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 20) : 20;
}

function getDiscoveryTimeoutMs() {
  const value = Number(process.env.DISCOVERY_TIMEOUT_MS ?? 8000);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 15000) : 8000;
}

async function storeEvidenceItem(
  tx: DiscoveryClient,
  assessmentId: string,
  item: DiscoveredEvidence
) {
  const existing = await tx.evidenceItem.findFirst({
    where: {
      assessmentId,
      type: item.type,
      sourceUrl: item.sourceUrl
    }
  });

  const data = {
    type: item.type,
    status: item.status,
    confidence: item.confidence,
    sourceUrl: item.sourceUrl,
    sourceTextSnippet: item.sourceTextSnippet,
    notes: item.notes,
    recommendedAction: item.recommendedAction
  };

  if (existing) {
    return tx.evidenceItem.update({
      where: { id: existing.id },
      data
    });
  }

  return tx.evidenceItem.create({
    data: {
      assessmentId,
      ...data,
      verified: false
    }
  });
}

export async function runEvidenceDiscovery(input: {
  assessmentId: string;
  vendorWebsite?: string | null;
  trustCentreUrl?: string | null;
}) {
  const startUrls = [input.trustCentreUrl, input.vendorWebsite].filter(
    (url): url is string => Boolean(url)
  );

  if (startUrls.length === 0) {
    throw new Error("Vendor website or trust centre URL is required for discovery.");
  }

  const crawlResult = await crawlEvidencePages({
    startUrls,
    maxPages: getDiscoveryMaxPages(),
    timeoutMs: getDiscoveryTimeoutMs()
  });

  const discovered = crawlResult.pages.flatMap((page) =>
    classifyEvidence({
      url: page.url,
      text: page.text
    })
  );

  const storedItems = await db.$transaction(async (tx) => {
    const items = [];

    for (const item of discovered) {
      const storedItem = await storeEvidenceItem(tx, input.assessmentId, item);
      items.push(storedItem);

      await upsertDiscoveredAssuranceClaimAnswer(tx, {
        assessmentId: input.assessmentId,
        evidenceType: item.type,
        confidence: item.confidence
      });
    }

    await createAuditLog(tx, {
      assessmentId: input.assessmentId,
      action: "evidence_discovery_run",
      details: {
        pagesFetched: crawlResult.pages.length,
        evidenceFound: items.length,
        errors: crawlResult.errors.length
      }
    });

    return items;
  });

  return {
    pagesFetched: crawlResult.pages.length,
    errors: crawlResult.errors,
    evidenceItems: storedItems
  };
}
