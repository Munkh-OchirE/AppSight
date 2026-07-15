"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteAssessmentButton({
  assessmentId,
  applicationName
}: {
  assessmentId: string;
  applicationName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAssessment() {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        method: "DELETE"
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Unable to delete assessment.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("Unable to delete assessment. Check the server and try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="h-9 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
      >
        Delete
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-title-${assessmentId}`}
            className="w-full max-w-md rounded-md border border-line bg-white p-5 shadow-xl"
          >
            <h2 id={`delete-title-${assessmentId}`} className="text-lg font-semibold text-ink">
              Delete assessment?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This permanently deletes the assessment for <strong>{applicationName}</strong>,
              including its questionnaire answers, evidence, risk findings, and reports.
            </p>

            {error ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="h-10 rounded-md border border-line px-3 text-sm font-semibold text-ink hover:bg-panel disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteAssessment}
                disabled={deleting}
                className="h-10 rounded-md bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete assessment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
