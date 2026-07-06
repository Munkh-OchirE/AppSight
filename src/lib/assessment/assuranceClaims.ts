import type { Answer, Prisma } from "@prisma/client";

export const securityAssuranceSection = "security_assurance_evidence";

export const assuranceClaimFieldsByEvidenceType: Record<string, string> = {
  "SOC 2 Type II": "soc2Type2Available",
  "ISO 27001": "iso27001Available"
};

const assuranceClaimFields = new Set(Object.values(assuranceClaimFieldsByEvidenceType));
const reviewerOwnedStates = new Set(["user_confirmed", "verified_by_reviewer"]);

export function isSecurityAssuranceClaimField(section: string, field: string) {
  return section === securityAssuranceSection && assuranceClaimFields.has(field);
}

function isAffirmativeClaim(value: unknown) {
  if (value === true) {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  return [
    "true",
    "yes",
    "available",
    "current",
    "claimed",
    "claimed only",
    "vendor_claimed",
    "publicly_found"
  ].includes(normalized);
}

export function normalizeAssuranceClaimValue(input: {
  section: string;
  field: string;
  value: unknown;
  state: string;
}) {
  if (
    isSecurityAssuranceClaimField(input.section, input.field) &&
    !reviewerOwnedStates.has(input.state) &&
    isAffirmativeClaim(input.value)
  ) {
    return "Claimed only";
  }

  return typeof input.value === "string" ? input.value : JSON.stringify(input.value);
}

export function reviewerOwnsAnswer(answer: Pick<Answer, "state" | "confirmed">) {
  return answer.confirmed || reviewerOwnedStates.has(answer.state);
}

export async function upsertDiscoveredAssuranceClaimAnswer(
  tx: Prisma.TransactionClient,
  input: {
    assessmentId: string;
    evidenceType: string;
    confidence: string | null;
  }
) {
  const field = assuranceClaimFieldsByEvidenceType[input.evidenceType];

  if (!field) {
    return null;
  }

  const existing = await tx.answer.findUnique({
    where: {
      assessmentId_section_field: {
        assessmentId: input.assessmentId,
        section: securityAssuranceSection,
        field
      }
    }
  });

  if (existing && reviewerOwnsAnswer(existing)) {
    return existing;
  }

  const data = {
    value: "Claimed only",
    state: "publicly_found",
    confidence: input.confidence,
    source: "evidence_discovery",
    confirmed: false
  };

  if (existing) {
    return tx.answer.update({
      where: { id: existing.id },
      data
    });
  }

  return tx.answer.create({
    data: {
      assessmentId: input.assessmentId,
      section: securityAssuranceSection,
      field,
      ...data
    }
  });
}
