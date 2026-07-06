"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { QuestionDefinition } from "@/config/questions";

type AnswerDto = {
  id: string;
  section: string;
  field: string;
  value: string;
};

type EvidenceRequirementDto = {
  id: string;
  type: string;
  requirementLevel: string;
  baseRequirementLevel: string;
  complete: boolean;
  notes: string;
};

function keyFor(section: string, field: string) {
  return `${section}.${field}`;
}

function parseValue(value: string) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

const accessConflicts = [
  "access.ssoAccess",
  "access.apiAccess",
  "access.vpnAccess",
  "access.remoteDesktopAccess",
  "access.adminAccess",
  "access.productionAccess",
  "access.cloudEnvironmentAccess",
  "access.otDigitalSystemsAccess"
];

const dataConflicts = [
  "data.publicData",
  "data.internalData",
  "data.confidentialData",
  "data.personalInformation",
  "data.financialData",
  "data.customerData",
  "data.operationallySensitiveData"
];

const sensitiveDataFields = [
  "data.confidentialData",
  "data.personalInformation",
  "data.financialData",
  "data.customerData",
  "data.operationallySensitiveData"
];

function isTruthy(value: unknown) {
  return value === true || value === "true" || value === "Yes";
}

function isVisible(question: QuestionDefinition, values: Record<string, unknown>) {
  const rule = question.visibleWhen;

  if (!rule) {
    return true;
  }

  if (rule.sensitiveData && !sensitiveDataFields.some((field) => isTruthy(values[field]))) {
    return false;
  }

  if (rule.criticality) {
    const criticality = values["business_criticality.criticality"];

    if (typeof criticality !== "string" || !rule.criticality.includes(criticality as never)) {
      return false;
    }
  }

  if (rule.all && !rule.all.every((field) => isTruthy(values[field]))) {
    return false;
  }

  if (rule.any && !rule.any.some((field) => isTruthy(values[field]))) {
    return false;
  }

  return true;
}

export function DynamicWizard({
  assessmentId,
  questions,
  answers,
  evidencePreview
}: {
  assessmentId: string;
  questions: QuestionDefinition[];
  answers: AnswerDto[];
  evidencePreview: EvidenceRequirementDto[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(
      answers.map((answer) => [
        keyFor(answer.section, answer.field),
        parseValue(answer.value)
      ])
    )
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const visibleQuestions = useMemo(
    () => questions.filter((question) => isVisible(question, values)),
    [questions, values]
  );

  const groupedQuestions = useMemo(
    () =>
      visibleQuestions.reduce<Record<string, QuestionDefinition[]>>((grouped, question) => {
        grouped[question.section] ??= [];
        grouped[question.section].push(question);
        return grouped;
      }, {}),
    [visibleQuestions]
  );

  function setValue(question: QuestionDefinition, value: unknown) {
    const key = keyFor(question.section, question.field);

    setValues((current) => {
      const next = { ...current, [key]: value };

      if (key === "access.noSystemAccess" && value === true) {
        accessConflicts.forEach((field) => {
          next[field] = false;
        });
      } else if (accessConflicts.includes(key) && value === true) {
        next["access.noSystemAccess"] = false;
      }

      if (key === "data.noCompanyData" && value === true) {
        dataConflicts.forEach((field) => {
          next[field] = false;
        });
      } else if (dataConflicts.includes(key) && value === true) {
        next["data.noCompanyData"] = false;
      }

      return next;
    });
  }

  async function saveAnswers() {
    setSaving(true);
    setError(null);
    setMessage(null);

    const payloadAnswers = visibleQuestions.map((question) => ({
      section: question.section,
      field: question.field,
      value: values[keyFor(question.section, question.field)] ?? (question.type === "checkbox" ? false : "Unknown"),
      state: "user_confirmed",
      confirmed: true
    }));

    try {
      const response = await fetch(`/api/assessments/${assessmentId}/submit-answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payloadAnswers })
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Unable to save questionnaire answers.");
        return;
      }

      setMessage("Questionnaire answers saved.");
      router.refresh();
    } catch {
      setError("Unable to save questionnaire answers.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-5">
        {Object.entries(groupedQuestions).map(([section, sectionQuestions]) => (
          <section key={section} className="rounded-md border border-line bg-white">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-lg font-semibold capitalize">
                {section.replaceAll("_", " ")}
              </h2>
            </div>
            <div className="grid gap-4 p-4">
              {sectionQuestions.map((question) => (
                <QuestionControl
                  key={question.id}
                  question={question}
                  value={values[keyFor(question.section, question.field)]}
                  onChange={(value) => setValue(question, value)}
                />
              ))}
            </div>
          </section>
        ))}

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

        <div className="flex justify-end">
          <button
            type="button"
            onClick={saveAnswers}
            disabled={saving}
            className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save questionnaire"}
          </button>
        </div>
      </div>

      <aside className="rounded-md border border-line bg-white p-4 lg:sticky lg:top-6 lg:self-start">
        <h2 className="text-lg font-semibold">Required evidence preview</h2>
        {evidencePreview.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No evidence requirements apply yet.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {evidencePreview.map((item) => (
              <div key={item.id} className="rounded-md border border-line p-3">
                <p className="text-sm font-semibold">{item.type}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  {item.requirementLevel.replaceAll("_", " ")}
                </p>
                <p className="mt-2 text-sm text-slate-600">{item.notes}</p>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function QuestionControl({
  question,
  value,
  onChange
}: {
  question: QuestionDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (question.type === "checkbox") {
    return (
      <label className="flex items-center gap-3 rounded-md border border-line p-3">
        <input
          type="checkbox"
          checked={value === true || value === "true"}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium text-slate-800">{question.label}</span>
      </label>
    );
  }

  if (question.type === "select") {
    return (
      <label className="block">
        <span className="text-sm font-medium text-slate-700">{question.label}</span>
        <select
          value={typeof value === "string" ? value : "Unknown"}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-blue-100"
        >
          {question.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{question.label}</span>
      <input
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
