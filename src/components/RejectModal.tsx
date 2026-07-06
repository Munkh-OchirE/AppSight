"use client";

export function RejectModal({
  rejectionReason,
  remediationActions,
  rejectionDueDate,
  rejectionOwner,
  busy,
  error,
  onRejectionReasonChange,
  onRemediationActionsChange,
  onRejectionDueDateChange,
  onRejectionOwnerChange,
  onCancel,
  onSubmit
}: {
  rejectionReason: string;
  remediationActions: string;
  rejectionDueDate: string;
  rejectionOwner: string;
  busy: boolean;
  error: string | null;
  onRejectionReasonChange: (value: string) => void;
  onRemediationActionsChange: (value: string) => void;
  onRejectionDueDateChange: (value: string) => void;
  onRejectionOwnerChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-md border border-line bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Reject assessment</h2>
            <p className="mt-2 text-sm text-slate-600">
              Record the rejection reason and optional remediation tracking details.
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

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">
            Rejection reason
          </span>
          <textarea
            value={rejectionReason}
            onChange={(event) => onRejectionReasonChange(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">
            Remediation actions
          </span>
          <textarea
            value={remediationActions}
            onChange={(event) => onRemediationActionsChange(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Due date</span>
            <input
              type="date"
              value={rejectionDueDate}
              onChange={(event) => onRejectionDueDateChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Owner</span>
            <input
              value={rejectionOwner}
              onChange={(event) => onRejectionOwnerChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

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
            disabled={busy || rejectionReason.trim().length === 0}
            className="h-10 rounded-md bg-danger px-3 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            {busy ? "Saving..." : "Confirm rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}
