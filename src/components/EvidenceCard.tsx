"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EvidenceItemDto = {
  id: string;
  type: string;
  status: string;
  confidence: string | null;
  sourceUrl: string | null;
  notes: string | null;
  recommendedAction: string | null;
  verified: boolean;
};

export function EvidenceCard({
  assessmentId,
  item
}: {
  assessmentId: string;
  item: EvidenceItemDto;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(item.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateEvidence(status: string, verified: boolean) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceItems: [
            {
              id: item.id,
              status,
              verified,
              notes
            }
          ]
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Unable to update evidence.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to update evidence.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-semibold">{item.type}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {item.status.replaceAll("_", " ")}
            {item.confidence ? ` / ${item.confidence}` : ""}
            {item.verified ? " / reviewer verified" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || item.verified}
            onClick={() => updateEvidence("verified_by_reviewer", true)}
            className="h-9 rounded-md border border-line px-3 text-sm font-semibold hover:bg-panel disabled:opacity-60"
          >
            Mark verified
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => updateEvidence("not_applicable", false)}
            className="h-9 rounded-md border border-line px-3 text-sm font-semibold hover:bg-panel disabled:opacity-60"
          >
            Not applicable
          </button>
        </div>
      </div>

      {item.sourceUrl ? (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block break-all text-sm text-accent"
        >
          {item.sourceUrl}
        </a>
      ) : null}
      {item.recommendedAction ? (
        <p className="mt-3 text-sm text-slate-700">{item.recommendedAction}</p>
      ) : null}
      <label className="mt-3 block">
        <span className="text-sm font-medium text-slate-700">Reviewer notes</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={() => updateEvidence(item.status, item.verified)}
          className="h-9 rounded-md bg-accent px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          Save notes
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
