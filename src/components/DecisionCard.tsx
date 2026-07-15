"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApprovalModal } from "@/components/ApprovalModal";
import { RejectModal } from "@/components/RejectModal";
import type {
  ApprovalReadinessItem,
  ApprovalReadinessResult
} from "@/lib/approval/approvalReadiness";

type ModalState = "approve" | "reject" | null;

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function readinessTone(readiness: ApprovalReadinessResult) {
  if (readiness.recommendedDecision === "reject_review_required") {
    return "border-red-200 bg-red-50 text-danger";
  }

  if (readiness.requiresExceptionApproval) {
    return "border-amber-200 bg-amber-50 text-warning";
  }

  return "border-green-200 bg-green-50 text-success";
}

function ItemList({
  title,
  items,
  emptyText
}: {
  title: string;
  items: ApprovalReadinessItem[];
  emptyText: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mt-2 grid gap-2 text-sm text-slate-700">
          {items.slice(0, 6).map((item) => (
            <li key={`${item.type}-${item.title}`} className="rounded-md border border-line p-3">
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-slate-600">{item.details}</p>
            </li>
          ))}
          {items.length > 6 ? (
            <li className="text-sm text-slate-500">
              {items.length - 6} more item(s)
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

export function DecisionCard({
  assessmentId,
  compact = false
}: {
  assessmentId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [readiness, setReadiness] = useState<ApprovalReadinessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justification, setJustification] = useState("");
  const [acknowledgedExceptions, setAcknowledgedExceptions] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [remediationActions, setRemediationActions] = useState("");
  const [rejectionDueDate, setRejectionDueDate] = useState("");
  const [rejectionOwner, setRejectionOwner] = useState("");

  async function loadReadiness() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/assessments/${assessmentId}/approval-readiness`
      );
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Unable to load approval readiness.");
        return;
      }

      setReadiness(payload);
    } catch {
      setError("Unable to load approval readiness.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReadiness();

    function handleRiskUpdated() {
      void loadReadiness();
    }

    window.addEventListener("assessment:risk-updated", handleRiskUpdated);

    return () => {
      window.removeEventListener("assessment:risk-updated", handleRiskUpdated);
    };
  }, [assessmentId]);

  async function submitDecision(decision: "approve" | "reject") {
    setBusy(true);
    setError(null);
    setMessage(null);

    const body =
      decision === "approve"
        ? {
            decision,
            justification,
            acknowledgedExceptions
          }
        : {
            decision,
            rejectionReason,
            remediationActions: remediationActions || undefined,
            rejectionDueDate: rejectionDueDate || undefined,
            rejectionOwner: rejectionOwner || undefined
          };

    try {
      const response = await fetch(`/api/assessments/${assessmentId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Unable to save decision.");
        if (payload.readiness) {
          setReadiness(payload.readiness);
        }
        return;
      }

      setModal(null);
      setMessage(`Decision saved: ${statusLabel(payload.assessment.status)}.`);
      setJustification("");
      setAcknowledgedExceptions(false);
      setRejectionReason("");
      setRemediationActions("");
      setRejectionDueDate("");
      setRejectionOwner("");
      setReadiness(payload.readiness);

      if (decision === "approve") {
        const outcome =
          payload.assessment.status === "approved_with_exceptions"
            ? "approved_with_exceptions"
            : "approved";
        router.push(`/?decision=${outcome}`);
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to save decision.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-line bg-white p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Decision
          </p>
          <h2 className="mt-1 text-lg font-semibold text-ink">
            Approval readiness
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModal("approve")}
            disabled={!readiness || loading || busy}
            className="h-10 rounded-md bg-accent px-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-60"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setModal("reject")}
            disabled={!readiness || loading || busy}
            className="h-10 rounded-md border border-line px-3 text-sm font-semibold text-ink transition hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Checking readiness...</p>
      ) : readiness ? (
        <div className="mt-4 grid gap-4">
          <div className={`rounded-md border p-3 ${readinessTone(readiness)}`}>
            <p className="text-sm font-semibold">
              {readiness.canApproveCleanly
                ? "Ready for clean approval"
                : readiness.recommendedDecision === "reject_review_required"
                  ? "Review required before approval"
                  : "Exceptions required for approval"}
            </p>
            <p className="mt-1 text-sm">
              {readiness.riskRating} risk / score {readiness.riskScore} /{" "}
              {statusLabel(readiness.recommendedDecision)}
            </p>
          </div>

          {!compact ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <ItemList
                title="Blocking items"
                items={readiness.blockingItems}
                emptyText="No mandatory blockers."
              />
              <ItemList
                title="Warnings"
                items={readiness.warningItems}
                emptyText="No warnings."
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      {modal === "approve" && readiness ? (
        <ApprovalModal
          readiness={readiness}
          justification={justification}
          acknowledgedExceptions={acknowledgedExceptions}
          busy={busy}
          error={error}
          onJustificationChange={setJustification}
          onAcknowledgedExceptionsChange={setAcknowledgedExceptions}
          onCancel={() => setModal(null)}
          onSubmit={() => submitDecision("approve")}
        />
      ) : null}

      {modal === "reject" ? (
        <RejectModal
          rejectionReason={rejectionReason}
          remediationActions={remediationActions}
          rejectionDueDate={rejectionDueDate}
          rejectionOwner={rejectionOwner}
          busy={busy}
          error={error}
          onRejectionReasonChange={setRejectionReason}
          onRemediationActionsChange={setRemediationActions}
          onRejectionDueDateChange={setRejectionDueDate}
          onRejectionOwnerChange={setRejectionOwner}
          onCancel={() => setModal(null)}
          onSubmit={() => submitDecision("reject")}
        />
      ) : null}
    </section>
  );
}
