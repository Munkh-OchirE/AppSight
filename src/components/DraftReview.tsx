"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type DraftAnswer = {
  id: string;
  section: string;
  field: string;
  value: string;
  state: string;
  confidence: string | null;
  confirmed: boolean;
};

type DraftEvidence = {
  id: string;
  type: string;
  status: string;
  confidence: string | null;
  sourceUrl: string | null;
  sourceTextSnippet: string | null;
  notes: string | null;
  recommendedAction: string | null;
  verified: boolean;
};

type DraftAssessment = {
  id: string;
  applicationName: string;
  vendorName: string;
  vendorWebsite: string | null;
  trustCentreUrl: string | null;
  description: string;
  businessOwner: string | null;
  procurementStage: string | null;
  vendorStatus: string | null;
  criticality: string | null;
};

function stateLabel(state: string) {
  const labels: Record<string, string> = {
    user_confirmed: "User confirmed",
    ai_detected: "Detected",
    ai_inferred: "Inferred",
    vendor_claimed: "Claimed",
    publicly_found: "Publicly found",
    unknown: "Unknown",
    not_applicable: "Not applicable",
    verified_by_reviewer: "Verified"
  };

  return labels[state] ?? state;
}

export function DraftReview({
  assessment,
  answers,
  evidenceItems
}: {
  assessment: DraftAssessment;
  answers: DraftAnswer[];
  evidenceItems: DraftEvidence[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [answerValues, setAnswerValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(answers.map((answer) => [answer.id, answer.value]))
  );

  const groupedAnswers = useMemo(
    () =>
      answers.reduce<Record<string, DraftAnswer[]>>((grouped, answer) => {
        grouped[answer.section] ??= [];
        grouped[answer.section].push(answer);
        return grouped;
      }, {}),
    [answers]
  );

  async function runAiIntake() {
    setBusyAction("ai");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/assessments/ai-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: assessment.id })
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "AI intake failed.");
        return;
      }

      setMessage(`AI intake saved ${payload.answersStored} draft fields.`);
      router.refresh();
    } catch {
      setError("AI intake failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function runDiscovery() {
    setBusyAction("discovery");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/assessments/${assessment.id}/run-evidence-discovery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Evidence discovery failed.");
        return;
      }

      setMessage(
        `Evidence discovery fetched ${payload.pagesFetched} pages and stored ${payload.evidenceItems.length} evidence items.`
      );
      router.refresh();
    } catch {
      setError("Evidence discovery failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function confirmAnswer(answer: DraftAnswer) {
    setBusyAction(answer.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/assessments/${assessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: [
            {
              section: answer.section,
              field: answer.field,
              value: answerValues[answer.id] ?? answer.value,
              state: "user_confirmed",
              confidence: answer.confidence ?? "high",
              source: "draft_review",
              confirmed: true
            }
          ]
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Unable to confirm answer.");
        return;
      }

      setMessage("Answer confirmed.");
      router.refresh();
    } catch {
      setError("Unable to confirm answer.");
    } finally {
      setBusyAction(null);
    }
  }

  async function verifyEvidence(item: DraftEvidence) {
    setBusyAction(item.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/assessments/${assessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceItems: [
            {
              id: item.id,
              status: "verified_by_reviewer",
              verified: true,
              notes: item.notes ?? "Reviewer verified during draft review."
            }
          ]
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Unable to verify evidence.");
        return;
      }

      setMessage("Evidence marked as reviewer verified.");
      router.refresh();
    } catch {
      setError("Unable to verify evidence.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-md border border-line bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Assessment review
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-ink">
              {assessment.applicationName}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{assessment.vendorName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runAiIntake}
              disabled={busyAction !== null}
              className="h-10 rounded-md border border-line px-3 text-sm font-semibold text-ink hover:bg-panel disabled:opacity-60"
            >
              {busyAction === "ai" ? "Running..." : "Extract from description"}
            </button>
            <button
              type="button"
              onClick={runDiscovery}
              disabled={busyAction !== null}
              className="h-10 rounded-md bg-accent px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busyAction === "discovery" ? "Searching..." : "Find public evidence"}
            </button>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
          <Info label="Vendor website" value={assessment.vendorWebsite} />
          <Info label="Trust centre URL" value={assessment.trustCentreUrl} />
          <Info label="Business owner" value={assessment.businessOwner} />
          <Info label="Criticality" value={assessment.criticality} />
          <Info label="Procurement stage" value={assessment.procurementStage} />
          <Info label="Vendor status" value={assessment.vendorStatus} />
        </dl>
        <p className="mt-4 text-sm text-slate-700">{assessment.description}</p>
      </section>

      {message ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-success">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="rounded-md border border-line bg-white">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-lg font-semibold">AI intake and reviewer answers</h2>
        </div>
        {answers.length === 0 ? (
          <div className="px-4 py-8 text-sm text-slate-500">
            No draft fields yet. Run AI intake to populate suggested assessment fields.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {Object.entries(groupedAnswers).map(([section, sectionAnswers]) => (
              <div key={section} className="p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {section.replaceAll("_", " ")}
                </h3>
                <div className="mt-3 grid gap-3">
                  {sectionAnswers.map((answer) => (
                    <div
                      key={answer.id}
                      className="grid gap-2 rounded-md border border-line p-3 md:grid-cols-[1fr_2fr_auto]"
                    >
                      <div>
                        <p className="font-medium">{answer.field}</p>
                        <p className="text-xs text-slate-500">
                          {stateLabel(answer.state)}
                          {answer.confidence ? ` / ${answer.confidence}` : ""}
                        </p>
                      </div>
                      <input
                        value={answerValues[answer.id] ?? answer.value}
                        onChange={(event) =>
                          setAnswerValues((current) => ({
                            ...current,
                            [answer.id]: event.target.value
                          }))
                        }
                        className="h-10 rounded-md border border-line px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => confirmAnswer(answer)}
                        disabled={busyAction !== null}
                        className="h-10 rounded-md border border-line px-3 text-sm font-semibold hover:bg-panel disabled:opacity-60"
                      >
                        {answer.confirmed ? "Confirmed" : "Confirm"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-md border border-line bg-white">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-lg font-semibold">Public evidence discovery</h2>
        </div>
        {evidenceItems.length === 0 ? (
          <div className="px-4 py-8 text-sm text-slate-500">
            No evidence items yet. Run evidence discovery to check public assurance pages.
          </div>
        ) : (
          <div className="grid gap-3 p-4">
            {evidenceItems.map((item) => (
              <div key={item.id} className="rounded-md border border-line p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-semibold">{item.type}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {stateLabel(item.status)}
                      {item.confidence ? ` / ${item.confidence}` : ""}
                      {item.verified ? " / reviewer verified" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => verifyEvidence(item)}
                    disabled={busyAction !== null || item.verified}
                    className="h-10 rounded-md border border-line px-3 text-sm font-semibold hover:bg-panel disabled:opacity-60"
                  >
                    {item.verified ? "Verified" : "Mark verified"}
                  </button>
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
                {item.sourceTextSnippet ? (
                  <p className="mt-3 text-sm text-slate-700">{item.sourceTextSnippet}</p>
                ) : null}
                {item.notes ? (
                  <p className="mt-3 text-sm text-slate-600">{item.notes}</p>
                ) : null}
                {item.recommendedAction ? (
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    {item.recommendedAction}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-slate-700">{value || "Unknown"}</dd>
    </div>
  );
}
