"use client";

import type { ApprovalReadinessResult } from "@/lib/approval/approvalReadiness";

export function ApprovalModal({
  readiness,
  justification,
  acknowledgedExceptions,
  busy,
  error,
  onJustificationChange,
  onAcknowledgedExceptionsChange,
  onCancel,
  onSubmit
}: {
  readiness: ApprovalReadinessResult;
  justification: string;
  acknowledgedExceptions: boolean;
  busy: boolean;
  error: string | null;
  onJustificationChange: (value: string) => void;
  onAcknowledgedExceptionsChange: (value: boolean) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const canSubmit =
    justification.trim().length > 0 &&
    (!readiness.requiresExceptionApproval || acknowledgedExceptions);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-md border border-line bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {readiness.requiresExceptionApproval
                ? "Approve with exceptions"
                : "Approve assessment"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {readiness.requiresExceptionApproval
                ? "Mandatory evidence, checks, or controls are incomplete. Approving now records this as approved with exceptions."
                : "All mandatory checks are complete. Confirm approval with a justification."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-md border border-line px-3 text-sm font-semibold hover:bg-panel"
          >
            Close
          </button>
        </div>

        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <Info label="Risk rating" value={readiness.riskRating} />
          <Info label="Risk score" value={String(readiness.riskScore)} />
          <Info label="Recommended" value={readiness.recommendedDecision} />
        </dl>

        {readiness.blockingItems.length > 0 ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <h3 className="text-sm font-semibold text-warning">
              Incomplete mandatory items
            </h3>
            <ul className="mt-2 grid gap-2 text-sm text-amber-900">
              {readiness.blockingItems.map((item) => (
                <li key={`${item.type}-${item.title}`}>{item.title}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">
            Approval justification
          </span>
          <textarea
            value={justification}
            onChange={(event) => onJustificationChange(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-blue-100"
          />
        </label>

        {readiness.requiresExceptionApproval ? (
          <label className="mt-4 flex items-start gap-3 rounded-md border border-line p-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={acknowledgedExceptions}
              onChange={(event) =>
                onAcknowledgedExceptionsChange(event.target.checked)
              }
              className="mt-1 h-4 w-4"
            />
            <span>
              I acknowledge that required items are incomplete and this decision
              will be recorded as approved with exceptions.
            </span>
          </label>
        ) : null}

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-md border border-line px-3 text-sm font-semibold hover:bg-panel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy || !canSubmit}
            className="h-10 rounded-md bg-accent px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? "Saving..." : "Confirm approval"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-panel p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}
