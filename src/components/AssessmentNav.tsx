import Link from "next/link";

export type AssessmentNavStep = "draft" | "questionnaire" | "evidence" | "report";

const steps: Array<{
  id: AssessmentNavStep;
  label: string;
  href: (assessmentId: string) => string;
}> = [
  {
    id: "draft",
    label: "Review draft",
    href: (assessmentId) => `/assessments/${assessmentId}/draft`
  },
  {
    id: "questionnaire",
    label: "Questionnaire",
    href: (assessmentId) => `/assessments/${assessmentId}/wizard`
  },
  {
    id: "evidence",
    label: "Evidence review",
    href: (assessmentId) => `/assessments/${assessmentId}/evidence`
  },
  {
    id: "report",
    label: "Risk report",
    href: (assessmentId) => `/assessments/${assessmentId}/report`
  }
];

export function AssessmentNav({
  assessmentId,
  current
}: {
  assessmentId: string;
  current: AssessmentNavStep;
}) {
  return (
    <nav
      aria-label="Assessment workflow"
      className="overflow-x-auto rounded-md border border-line bg-white p-2"
    >
      <div className="flex min-w-max items-center gap-2">
        <Link
          href="/"
          className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-panel hover:text-ink"
        >
          All assessments
        </Link>
        <span className="h-5 w-px bg-line" aria-hidden="true" />
        {steps.map((step) => {
          const isActive = step.id === current;

          return (
            <Link
              key={step.id}
              href={step.href(assessmentId)}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white"
                  : "rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-panel hover:text-ink"
              }
            >
              {step.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
