import * as cheerio from "cheerio";
import { safeFetch } from "@/lib/discovery/safeFetch";

export type ApplicationSearchResult = {
  id: string;
  title: string;
  url: string;
  displayUrl: string;
  snippet?: string;
};

export type ApplicationDetails = {
  applicationName?: string;
  vendorName?: string;
  applicationUrl?: string;
  vendorWebsite?: string;
  trustCentreUrl?: string;
  description?: string;
  criticality?: "Low" | "Medium" | "High" | "Critical";
};

const SEARCH_TIMEOUT_MS = 8000;
const MULTI_LABEL_PUBLIC_SUFFIXES = new Set([
  "ac.uk",
  "co.in",
  "co.jp",
  "co.kr",
  "co.nz",
  "co.uk",
  "co.za",
  "com.au",
  "com.br",
  "com.cn",
  "com.mx",
  "com.sg",
  "com.tr",
  "edu.au",
  "gov.au",
  "gov.uk",
  "net.au",
  "org.au",
  "org.uk"
]);
const GENERIC_TITLE_WORDS = new Set([
  "about",
  "app",
  "application",
  "download",
  "home",
  "homepage",
  "official",
  "product",
  "site",
  "software",
  "website",
  "welcome"
]);
const TRUST_KEYWORDS = [
  "trust",
  "security",
  "compliance",
  "privacy",
  "legal",
  "subprocessor",
  "soc",
  "iso"
];

function normalizeText(value: string | undefined | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function resultUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl, "https://duckduckgo.com");
    const redirected = parsed.searchParams.get("uddg");
    const resolved = new URL(redirected ?? parsed.toString());

    resolved.hash = "";
    [...resolved.searchParams.keys()].forEach((key) => {
      if (key.toLowerCase().startsWith("utm_") || ["ref", "source"].includes(key)) {
        resolved.searchParams.delete(key);
      }
    });
    resolved.pathname = resolved.pathname.replace(/\/+$/, "") || "/";

    return resolved.toString();
  } catch {
    return rawUrl;
  }
}

function resultId(url: string) {
  return Buffer.from(url).toString("base64url");
}

function hostLabel(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname;
  } catch {
    return url;
  }
}

function applicationHostKey(url: string) {
  try {
    let hostname = new URL(url).hostname.toLowerCase();

    while (/^(www|app|help|support|docs|learn)\./.test(hostname)) {
      hostname = hostname.replace(/^(www|app|help|support|docs|learn)\./, "");
    }

    return hostname;
  } catch {
    return url.toLowerCase();
  }
}

function applicationOrganizationKey(url: string) {
  const hostname = applicationHostKey(url);
  const labels = hostname.split(".").filter(Boolean);

  if (labels.length <= 2) {
    return hostname;
  }

  const suffix = labels.slice(-2).join(".");
  return labels
    .slice(MULTI_LABEL_PUBLIC_SUFFIXES.has(suffix) ? -3 : -2)
    .join(".");
}

function comparableText(value: string) {
  return value
    .toLowerCase()
    .replace(/[\u00ae\u2122\u00a9]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanApplicationTitle(title: string, applicationName: string) {
  const query = comparableText(applicationName);
  const parts = title
    .split(/\s+[|\u2013\u2014-]\s+|:\s+/)
    .map((part) => normalizeText(part))
    .filter(Boolean);
  const matchingPart = parts.find((part) => comparableText(part).includes(query));

  return matchingPart && matchingPart.length <= 100 ? matchingPart : title;
}

function applicationTitleKey(title: string, applicationName: string) {
  const cleanedTitle = comparableText(cleanApplicationTitle(title, applicationName));
  const significantWords = cleanedTitle
    .split(" ")
    .filter((word) => word && !GENERIC_TITLE_WORDS.has(word));

  return significantWords.join(" ") || cleanedTitle;
}

function applicationResultScore(
  result: ApplicationSearchResult,
  applicationName: string
) {
  const query = comparableText(applicationName);
  const title = comparableText(result.title);
  const snippet = comparableText(result.snippet ?? "");
  let score = 0;

  if (title === query) {
    score += 20;
  } else if (title.startsWith(query)) {
    score += 12;
  } else if (title.includes(query)) {
    score += 8;
  }

  if (snippet.includes(query)) {
    score += 3;
  }

  try {
    const parsed = new URL(result.url);
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const compactQuery = query.replace(/\s+/g, "");
    const compactHost = applicationHostKey(result.url).replace(/[^a-z0-9]/g, "");

    if (compactQuery && compactHost.includes(compactQuery)) {
      score += 8;
    }

    if (pathSegments.length === 0) {
      score += 6;
    } else if (pathSegments.length === 1) {
      score += 3;
    }

    if (/\/(blog|news|login|signin|support|help|docs)(\/|$)/i.test(parsed.pathname)) {
      score -= 5;
    }
  } catch {
    score -= 10;
  }

  return score;
}

function uniqueApplicationResults(
  results: ApplicationSearchResult[],
  applicationName: string,
  maxResults: number
) {
  const ranked = results
    .map((result, index) => ({
      result,
      index,
      score: applicationResultScore(result, applicationName)
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const seenHosts = new Set<string>();
  const seenOrganizations = new Set<string>();
  const seenTitles = new Set<string>();
  const unique: ApplicationSearchResult[] = [];
  const query = comparableText(applicationName);
  const compactQuery = query.replace(/\s+/g, "");
  let hasPrimaryBrandResult = false;

  for (const { result } of ranked) {
    const hostKey = applicationHostKey(result.url);
    const organizationKey = applicationOrganizationKey(result.url);
    const compactHost = hostKey.replace(/[^a-z0-9]/g, "");
    const cleanTitle = cleanApplicationTitle(result.title, applicationName);
    const title = comparableText(cleanTitle);
    const titleKey = applicationTitleKey(result.title, applicationName);
    const titleWordCount = titleKey.split(" ").filter(Boolean).length;
    const hostMatchesQuery = compactHost.includes(compactQuery);
    const titleMatchesQuery =
      title === query ||
      title.startsWith(`${query} `) ||
      title.endsWith(` ${query}`) ||
      title.includes(` ${query} `);
    const isPrimaryBrandResult =
      compactQuery.length >= 3 &&
      hostMatchesQuery &&
      titleMatchesQuery;

    if (!hostMatchesQuery && (!titleMatchesQuery || titleWordCount > 5)) {
      continue;
    }

    if (
      seenHosts.has(hostKey) ||
      seenOrganizations.has(organizationKey) ||
      seenTitles.has(titleKey) ||
      (isPrimaryBrandResult && hasPrimaryBrandResult)
    ) {
      continue;
    }

    seenHosts.add(hostKey);
    seenOrganizations.add(organizationKey);
    seenTitles.add(titleKey);
    hasPrimaryBrandResult ||= isPrimaryBrandResult;
    unique.push({
      ...result,
      title: cleanTitle
    });

    if (unique.length === maxResults) {
      break;
    }
  }

  return unique;
}

function isLikelySearchNoise(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return [
      "duckduckgo.com",
      "google.com",
      "bing.com",
      "youtube.com",
      "facebook.com",
      "instagram.com",
      "linkedin.com",
      "x.com",
      "twitter.com",
      "wikipedia.org",
      "wikiwand.com",
      "wikidata.org",
      "fandom.com",
      "handwiki.org",
      "github.com",
      "g2.com",
      "capterra.com",
      "getapp.com",
      "saasworthy.com",
      "alternativeto.net",
      "sourceforge.net",
      "crunchbase.com",
      "apps.apple.com",
      "play.google.com"
    ].some((blockedHost) => hostname === blockedHost || hostname.endsWith(`.${blockedHost}`));
  } catch {
    return true;
  }
}

async function searchWeb(query: string, maxResults: number) {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const fetched = await safeFetch(searchUrl, {
    timeoutMs: SEARCH_TIMEOUT_MS,
    maxBytes: 750_000
  });
  const $ = cheerio.load(fetched.body);
  const results: ApplicationSearchResult[] = [];
  const seenUrls = new Set<string>();

  $(".result").each((_index, element) => {
    const link = $(element).find(".result__a").first();
    const title = normalizeText(link.text());
    const href = link.attr("href");

    if (!title || !href) {
      return;
    }

    const url = resultUrl(href);

    if (seenUrls.has(url) || isLikelySearchNoise(url)) {
      return;
    }

    seenUrls.add(url);
    results.push({
      id: resultId(url),
      title,
      url,
      displayUrl: hostLabel(url),
      snippet: normalizeText($(element).find(".result__snippet").first().text()) || undefined
    });
  });

  return results.slice(0, maxResults);
}

function metaContent($: cheerio.CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const value = normalizeText($(selector).first().attr("content"));

    if (value) {
      return value;
    }
  }

  return undefined;
}

function pageTitle($: cheerio.CheerioAPI) {
  return (
    metaContent($, [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[name="application-name"]'
    ]) ?? normalizeText($("title").first().text())
  );
}

function cleanResearchSnippet(value: string) {
  return normalizeText(value)
    .replace(/^[A-Z][a-z]{2} \d{1,2}, \d{4}\s*[-|:]\s*/, "")
    .replace(/\s+(learn|read|find out) more\.?$/i, "")
    .slice(0, 500);
}

function bestResearchSnippet(
  results: ApplicationSearchResult[],
  applicationName: string
) {
  const query = comparableText(applicationName);
  const snippets = results
    .map((result) => cleanResearchSnippet(result.snippet ?? ""))
    .filter((snippet) => snippet.length >= 40);

  return (
    snippets.find((snippet) => comparableText(snippet).includes(query)) ??
    snippets[0]
  );
}

async function researchApplicationProfile(input: {
  applicationName: string;
  vendorName: string;
}) {
  const subject = `"${input.applicationName}" ${input.vendorName}`;
  const topics = [
    {
      label: "General business use cases",
      query: `${subject} software common business use cases`,
      fallback:
        "Public search did not provide enough information to confirm common business use cases."
    },
    {
      label: "Integration patterns",
      query: `${subject} integrations API SSO connectors`,
      fallback:
        "Common integrations were not confirmed and should be reviewed against vendor documentation."
    },
    {
      label: "Access and authentication",
      query: `${subject} user access authentication SSO roles permissions`,
      fallback:
        "Authentication and role-management options were not confirmed and require vendor review."
    },
    {
      label: "Implementation approach",
      query: `${subject} implementation deployment setup onboarding`,
      fallback:
        "Implementation and deployment requirements were not confirmed and require vendor review."
    }
  ];

  const researchedTopics = await Promise.all(
    topics.map(async (topic) => {
      try {
        const results = await searchWeb(topic.query, 6);
        return {
          ...topic,
          summary:
            bestResearchSnippet(results, input.applicationName) ?? topic.fallback
        };
      } catch {
        return { ...topic, summary: topic.fallback };
      }
    })
  );

  return researchedTopics
    .map((topic) => `${topic.label}: ${topic.summary}`)
    .join("\n\n");
}

function inferBusinessCriticality(text: string) {
  const normalized = text.toLowerCase();
  const includesAny = (terms: string[]) =>
    terms.some((term) => normalized.includes(term));

  if (
    includesAny([
      "clinical",
      "patient care",
      "emergency response",
      "life safety",
      "industrial control",
      "operational technology"
    ])
  ) {
    return "Critical" as const;
  }

  if (
    includesAny([
      "identity and access",
      "identity management",
      "cybersecurity",
      "payroll",
      "accounting",
      "financial management",
      "payment processing",
      "enterprise resource planning",
      "customer relationship management",
      "data warehouse",
      "production infrastructure"
    ])
  ) {
    return "High" as const;
  }

  if (includesAny(["entertainment", "social network", "video game", "wallpaper"])) {
    return "Low" as const;
  }

  return "Medium" as const;
}

function vendorNameFromPage($: cheerio.CheerioAPI, url: string) {
  const siteName = metaContent($, ['meta[property="og:site_name"]']);

  if (siteName) {
    return siteName;
  }

  const title = pageTitle($);

  if (title) {
    return title.split(/[|-]/)[0].trim();
  }

  return hostLabel(url).split(".")[0];
}

function scoreTrustUrl(url: string, text: string) {
  const lower = `${url} ${text}`.toLowerCase();
  return TRUST_KEYWORDS.reduce(
    (score, keyword) => score + (lower.includes(keyword) ? 1 : 0),
    0
  );
}

function trustUrlFromPage($: cheerio.CheerioAPI, baseUrl: string) {
  const links: Array<{ url: string; text: string; score: number }> = [];

  $("a[href]").each((_index, element) => {
    const href = $(element).attr("href");

    if (!href) {
      return;
    }

    try {
      const url = new URL(href, baseUrl).toString();
      const text = normalizeText($(element).text());
      const score = scoreTrustUrl(url, text);

      if (score > 0) {
        links.push({ url, text, score });
      }
    } catch {
      // Ignore malformed links.
    }
  });

  links.sort((a, b) => b.score - a.score);
  return links[0]?.url;
}

export async function searchApplications(applicationName: string) {
  const candidates = await searchWeb(
    `${applicationName} official website application vendor`,
    30
  );

  return uniqueApplicationResults(candidates, applicationName, 8);
}

export async function lookupApplicationDetails(input: {
  applicationName: string;
  selectedUrl: string;
}) {
  const fetched = await safeFetch(input.selectedUrl, {
    timeoutMs: SEARCH_TIMEOUT_MS,
    maxBytes: 1_000_000
  });
  const $ = cheerio.load(fetched.body);
  $("script, style, noscript, svg").remove();

  const resolvedUrl = fetched.url;
  const origin = new URL(resolvedUrl).origin;
  const title = pageTitle($);
  const vendorName = vendorNameFromPage($, resolvedUrl);
  const localTrustUrl = trustUrlFromPage($, resolvedUrl);
  const [searchTrustUrl, description] = await Promise.all([
    localTrustUrl
      ? Promise.resolve(undefined)
      : searchWeb(
          `${input.applicationName} trust center security compliance`,
          3
        ).then(
          (results) =>
            results.find((result) => scoreTrustUrl(result.url, result.title) > 0)
              ?.url
        ).catch(() => undefined),
    researchApplicationProfile({
      applicationName: input.applicationName,
      vendorName
    })
  ]);

  return {
    applicationName: title
      ? cleanApplicationTitle(title, input.applicationName)
      : input.applicationName,
    vendorName,
    applicationUrl: resolvedUrl,
    vendorWebsite: origin,
    trustCentreUrl: localTrustUrl ?? searchTrustUrl,
    description,
    criticality: inferBusinessCriticality(
      [title, description].filter(Boolean).join(" ")
    )
  } satisfies ApplicationDetails;
}
