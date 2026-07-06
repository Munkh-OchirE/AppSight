"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckpointTimeline } from "@/components/CheckpointTimeline";
import type { SummaryCheckpoint } from "@/lib/llm/checkpoints";
import type { SummaryOutput } from "@/lib/llm/schemas";

type LatestSummary = {
  id: string;
  createdAt: string;
  summary: SummaryOutput | null;
  checkpoints: SummaryCheckpoint[];
  parseError: string | null;
} | null;

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">None recorded.</p>
      ) : (
        <ul className="mt-2 grid gap-2 text-sm text-slate-700">
          {items.map((item) => (
            <li key={item} className="rounded-md border border-line p-3">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LlmSummaryPanel({
  assessmentId,
  initialSummary
}: {
  assessmentId: string;
  initialSummary: LatestSummary;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryOutput | null>(
    initialSummary?.summary ?? null
  );
  const [checkpoints, setCheckpoints] = useState<SummaryCheckpoint[]>(
    initialSummary?.checkpoints ?? []
  );
  const [parseError, setParseError] = useState<string | null>(
    initialSummary?.parseError ?? null
  );
  const [generatedAt, setGeneratedAt] = useState<string | null>(
    initialSummary?.createdAt ?? null
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function generateSummary() {
    setBusy(true);
    setError(null);
    setMessage(null);
    setParseError(null);

    try {
      const response = await fetch(
        `/api/assessments/${assessmentId}/generate-summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regenerate: true })
        }
      );
      const payload = await response.json();

      setCheckpoints(payload.checkpoints ?? []);

      if (!response.ok) {
        setError(payload.error ?? "Unable to generate summary.");
        return;
      }

      setSummary(payload.summary);
      setGeneratedAt(new Date().toISOString());
      setMessage("Summary generated.");
      router.refresh();
    } catch {
      setError("Unable to generate summary.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-line bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">LLM summary</h2>
          {generatedAt ? (
            <p className="mt-1 text-sm text-slate-500">
              Generated {new Date(generatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={generateSummary}
          disabled={busy}
          className="h-10 rounded-md border border-line px-3 text-sm font-semibold text-ink hover:bg-panel disabled:opacity-60"
        >
          {busy ? "Generating..." : summary ? "Regenerate summary" : "Generate summary"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {parseError ? <p className="mt-3 text-sm text-danger">{parseError}</p> : null}

      {summary ? (
        <div className="mt-5 grid gap-5">
          <div>
            <h3 className="text-sm font-semibold text-ink">Executive summary</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {summary.executiveSummary}
            </p>
          </div>
          <SummaryList title="Key risk drivers" items={summary.keyRiskDrivers} />
          <div>
            <h3 className="text-sm font-semibold text-ink">Evidence summary</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {summary.evidenceSummary}
            </p>
          </div>
          <SummaryList title="Missing evidence" items={summary.missingEvidence} />
          <SummaryList title="Required controls" items={summary.requiredControls} />
          <SummaryList
            title="Vendor follow-up questions"
            items={summary.vendorFollowUpQuestions}
          />
          <div>
            <h3 className="text-sm font-semibold text-ink">
              Approval recommendation wording
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {summary.approvalRecommendationWording}
            </p>
          </div>
          {summary.riskAcceptanceWording ? (
            <div>
              <h3 className="text-sm font-semibold text-ink">
                Risk acceptance wording
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {summary.riskAcceptanceWording}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          No LLM summary has been generated yet.
        </p>
      )}

      <div className="mt-6 border-t border-line pt-4">
        <h3 className="text-sm font-semibold text-ink">Checkpoints</h3>
        <div className="mt-3">
          <CheckpointTimeline checkpoints={checkpoints} />
        </div>
      </div>
    </section>
  );
}
