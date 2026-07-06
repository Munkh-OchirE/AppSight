import { lookup } from "node:dns/promises";
import net from "node:net";

export type SafeFetchOptions = {
  timeoutMs?: number;
  maxRedirects?: number;
  maxBytes?: number;
  userAgent?: string;
};

export type SafeFetchResult = {
  url: string;
  status: number;
  contentType: string;
  body: string;
};

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_MAX_BYTES = 1_000_000;
const DEFAULT_USER_AGENT =
  "ApplicationRiskSnapshotEvidenceDiscovery/0.1 (+security-assurance-discovery)";

function parseIpv4(address: string) {
  const parts = address.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }

  return parts;
}

function isBlockedIpv4(address: string) {
  const parts = parseIpv4(address);

  if (!parts) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254 && parts[2] === 169 && parts[3] === 254) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 0 && parts[2] === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && parts[2] === 100) ||
    (a === 203 && b === 0 && parts[2] === 113) ||
    (a >= 224 && a <= 239) ||
    a >= 240
  );
}

function extractMappedIpv4(address: string) {
  const lower = address.toLowerCase();

  if (!lower.startsWith("::ffff:")) {
    return null;
  }

  const candidate = lower.slice("::ffff:".length);
  return net.isIP(candidate) === 4 ? candidate : null;
}

function isBlockedIpv6(address: string) {
  const lower = address.toLowerCase();
  const mappedIpv4 = extractMappedIpv4(lower);

  if (mappedIpv4) {
    return isBlockedIpv4(mappedIpv4);
  }

  return (
    lower === "::1" ||
    lower === "::" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb") ||
    lower.startsWith("ff")
  );
}

function isBlockedIp(address: string) {
  const version = net.isIP(address);

  if (version === 4) {
    return isBlockedIpv4(address);
  }

  if (version === 6) {
    return isBlockedIpv6(address);
  }

  return true;
}

function validateProtocol(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed.");
  }
}

async function assertSafeUrl(input: string) {
  const url = new URL(input);
  validateProtocol(url);

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "0.0.0.0" ||
    hostname === "::1"
  ) {
    throw new Error("Unsafe host is not allowed.");
  }

  const literalVersion = net.isIP(hostname);

  if (literalVersion && isBlockedIp(hostname)) {
    throw new Error("Unsafe IP address is not allowed.");
  }

  const resolved = literalVersion
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });

  if (resolved.length === 0 || resolved.some((entry) => isBlockedIp(entry.address))) {
    throw new Error("Hostname resolves to an unsafe IP address.");
  }

  return url;
}

async function readLimitedBody(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();

  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    total += value.byteLength;

    if (total > maxBytes) {
      throw new Error("Response size limit exceeded.");
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export async function safeFetch(
  input: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  let currentUrl = input;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const url = await assertSafeUrl(currentUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": options.userAgent ?? DEFAULT_USER_AGENT,
          accept: "text/html,text/plain,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5"
        }
      });

      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.has("location")
      ) {
        const location = response.headers.get("location");

        if (!location) {
          throw new Error("Redirect location is missing.");
        }

        currentUrl = new URL(location, url).toString();
        continue;
      }

      const body = await readLimitedBody(response, maxBytes);

      return {
        url: url.toString(),
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
        body
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Redirect limit exceeded.");
}
