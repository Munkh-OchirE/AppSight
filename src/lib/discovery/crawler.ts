import * as cheerio from "cheerio";
import { safeFetch } from "@/lib/discovery/safeFetch";

export type CrawledPage = {
  url: string;
  status: number;
  text: string;
};

const priorityKeywords = [
  "trust",
  "security",
  "compliance",
  "privacy",
  "legal",
  "subprocessors",
  "dpa",
  "data-processing",
  "iso",
  "soc",
  "status",
  "vulnerability",
  "disclosure",
  "bug-bounty",
  "ai",
  "responsible-disclosure"
];

const commonPaths = [
  "/security",
  "/trust",
  "/compliance",
  "/privacy",
  "/legal",
  "/subprocessors",
  "/dpa",
  "/status"
];

function pageText(html: string) {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

function extractLinks(baseUrl: string, html: string) {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  $("a[href]").each((_index, element) => {
    const href = $(element).attr("href");

    if (!href) {
      return;
    }

    try {
      const url = new URL(href, baseUrl);

      if (url.protocol === "http:" || url.protocol === "https:") {
        links.add(url.toString());
      }
    } catch {
      // Ignore malformed links.
    }
  });

  return [...links];
}

function scoreUrl(url: string) {
  const lower = url.toLowerCase();
  return priorityKeywords.reduce(
    (score, keyword) => score + (lower.includes(keyword) ? 1 : 0),
    0
  );
}

function commonPathUrls(startUrls: string[]) {
  const urls = new Set<string>();

  for (const startUrl of startUrls) {
    try {
      const origin = new URL(startUrl).origin;
      commonPaths.forEach((path) => urls.add(`${origin}${path}`));
    } catch {
      // Ignore malformed start URLs.
    }
  }

  return [...urls];
}

export async function crawlEvidencePages(input: {
  startUrls: string[];
  maxPages: number;
  timeoutMs: number;
}) {
  const queue = [
    ...input.startUrls.filter(Boolean),
    ...commonPathUrls(input.startUrls)
  ];
  const queued = new Set(queue);
  const visited = new Set<string>();
  const pages: CrawledPage[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  while (queue.length > 0 && pages.length < input.maxPages) {
    queue.sort((a, b) => scoreUrl(b) - scoreUrl(a));
    const nextUrl = queue.shift();

    if (!nextUrl || visited.has(nextUrl)) {
      continue;
    }

    visited.add(nextUrl);

    try {
      const fetched = await safeFetch(nextUrl, {
        timeoutMs: input.timeoutMs
      });
      const text = pageText(fetched.body);

      pages.push({
        url: fetched.url,
        status: fetched.status,
        text
      });

      if (pages.length === 1) {
        const links = extractLinks(fetched.url, fetched.body)
          .filter((link) => scoreUrl(link) > 0)
          .sort((a, b) => scoreUrl(b) - scoreUrl(a));

        for (const link of links) {
          if (!queued.has(link)) {
            queued.add(link);
            queue.push(link);
          }
        }
      }
    } catch (error) {
      errors.push({
        url: nextUrl,
        error: error instanceof Error ? error.message : "Fetch failed."
      });
    }
  }

  return {
    pages,
    errors
  };
}
