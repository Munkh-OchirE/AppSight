"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReportActions({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function recalculateRisk() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assessments/${assessmentId}/calculate-risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true })
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Unable to calculate risk.");
        return;
      }

      setMessage(`Risk recalculated: ${payload.riskRating} (${payload.riskScore}).`);
      router.refresh();
    } catch {
      setError("Unable to calculate risk.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={recalculateRisk}
          disabled={busy}
          className="h-10 rounded-md border border-line px-3 text-sm font-semibold text-ink hover:bg-panel disabled:opacity-60"
        >
          {busy ? "Calculating..." : "Recalculate risk"}
        </button>
        <a
          href={`/api/assessments/${assessmentId}/export/markdown`}
          className="inline-flex h-10 items-center rounded-md bg-accent px-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Export markdown
        </a>
      </div>
      {message ? <p className="text-sm text-success">{message}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
