export type DiscoveredEvidence = {
  type: string;
  status: string;
  confidence: "high" | "medium" | "low";
  sourceUrl: string;
  sourceTextSnippet?: string;
  notes: string;
  recommendedAction: string;
};

type EvidenceRule = {
  type: string;
  keywords: string[];
  status: "publicly_claimed" | "public_document_found";
  recommendedAction: string;
};

const rules: EvidenceRule[] = [
  {
    type: "SOC 2 Type II",
    keywords: ["soc 2 type ii", "soc2 type ii", "soc 2"],
    status: "publicly_claimed",
    recommendedAction:
      "Request the latest SOC 2 Type II report and verify scope, reporting period, exceptions, and complementary user entity controls."
  },
  {
    type: "ISO 27001",
    keywords: ["iso 27001", "iso/iec 27001"],
    status: "publicly_claimed",
    recommendedAction:
      "Request current ISO 27001 certificate details and verify scope, issuer, and expiry date."
  },
  {
    type: "Privacy policy",
    keywords: ["privacy policy"],
    status: "public_document_found",
    recommendedAction: "Review privacy policy for data handling, retention, and disclosure terms."
  },
  {
    type: "Data Processing Agreement",
    keywords: ["data processing agreement", "dpa"],
    status: "public_document_found",
    recommendedAction: "Review DPA terms for processing, breach notification, and subprocessors."
  },
  {
    type: "Subprocessor list",
    keywords: ["subprocessor", "sub-processors", "sub processors"],
    status: "public_document_found",
    recommendedAction: "Review subprocessor list for hosting, support, and data transfer exposure."
  },
  {
    type: "Status page",
    keywords: ["status page", "system status", "service status"],
    status: "public_document_found",
    recommendedAction: "Review incident history and service availability signals."
  },
  {
    type: "Vulnerability disclosure",
    keywords: ["vulnerability disclosure", "responsible disclosure", "bug bounty"],
    status: "public_document_found",
    recommendedAction: "Review vulnerability disclosure process and security contact path."
  },
  {
    type: "Business continuity / disaster recovery",
    keywords: ["business continuity", "disaster recovery", "bcp", "dr plan"],
    status: "publicly_claimed",
    recommendedAction: "Request BCP/DR evidence or summary for high criticality use cases."
  },
  {
    type: "Incident response",
    keywords: ["incident response", "security incident"],
    status: "publicly_claimed",
    recommendedAction: "Request incident response summary and customer notification commitments."
  },
  {
    type: "MFA support",
    keywords: ["multi-factor authentication", "multifactor authentication", "mfa"],
    status: "publicly_claimed",
    recommendedAction: "Confirm MFA enforcement options for users and administrators."
  },
  {
    type: "AI data usage policy",
    keywords: ["model training", "ai data", "artificial intelligence", "machine learning"],
    status: "publicly_claimed",
    recommendedAction: "Confirm whether customer data is used for AI or model training."
  }
];

function makeSnippet(text: string, keyword: string) {
  const lower = text.toLowerCase();
  const index = lower.indexOf(keyword.toLowerCase());

  if (index === -1) {
    return text.slice(0, 240).replace(/\s+/g, " ").trim();
  }

  const start = Math.max(0, index - 100);
  const end = Math.min(text.length, index + keyword.length + 140);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

export function classifyEvidence(input: {
  url: string;
  text: string;
}): DiscoveredEvidence[] {
  const lowerText = input.text.toLowerCase();
  const found: DiscoveredEvidence[] = [];

  for (const rule of rules) {
    const matchedKeyword = rule.keywords.find((keyword) =>
      lowerText.includes(keyword.toLowerCase())
    );

    if (!matchedKeyword) {
      continue;
    }

    found.push({
      type: rule.type,
      status: rule.status,
      confidence: lowerText.includes("trust") || lowerText.includes("security") ? "medium" : "low",
      sourceUrl: input.url,
      sourceTextSnippet: makeSnippet(input.text, matchedKeyword),
      notes:
        rule.status === "publicly_claimed"
          ? `Vendor page mentions ${rule.type}. This is not reviewer verified.`
          : `Public page appears to contain ${rule.type}.`,
      recommendedAction: rule.recommendedAction
    });
  }

  return found;
}
