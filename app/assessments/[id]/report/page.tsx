import { notFound } from "next/navigation";
import { AssessmentNav } from "@/components/AssessmentNav";
import { DecisionCard } from "@/components/DecisionCard";
import { LlmSummaryPanel } from "@/components/LlmSummaryPanel";
import { ReportActions } from "@/components/ReportActions";
import {
  getReportData,
  type ReportEvidenceRequirement,
  type ReportFinding
} from "@/lib/report/reportBuilder";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function statusLabel(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ratingTone(rating: string) {
  if (rating === "Critical") {
    return "border-red-200 bg-red-50 text-danger";
  }

  if (rating === "High") {
    return "border-amber-200 bg-amber-50 text-warning";
  }

  if (rating === "Medium") {
    return "border-blue-200 bg-blue-50 text-accent";
  }

  return "border-green-200 bg-green-50 text-success";
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}

function FindingList({ findings }: { findings: ReportFinding[] }) {
  if (findings.length === 0) {
    return <Empty text="No findings in this section." />;
  }

  return (
    <div className="grid gap-3">
      {findings.map((finding) => (
        <div
          key={`${finding.category}-${finding.title}`}
          className="rounded-md border border-line p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{finding.title}</h3>
            <span className="rounded-sm bg-panel px-2 py-1 text-xs font-medium text-slate-600">
              {finding.severity} / +{finding.scoreImpact}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-700">{finding.reason}</p>
          {finding.recommendation ? (
            <p className="mt-2 text-sm font-medium text-slate-700">
              {finding.recommendation}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function EvidenceList({
  items,
  emptyText
}: {
  items: ReportEvidenceRequirement[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return <Empty text={emptyText} />;
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-md border border-line p-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{item.type}</h3>
            <span className="rounded-sm bg-panel px-2 py-1 text-xs font-medium text-slate-600">
              {item.requirementLevel.replaceAll("_", " ")}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-700">{item.notes}</p>
        </div>
      ))}
    </div>
  );
}

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;
  const report = await getReportData(id);

  if (!report) {
    notFound();
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AssessmentNav assessmentId={report.assessment.id} current="report" />

        <header className="rounded-md border border-line bg-white p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                Risk report
              </p>
              <h1 className="mt-1 text-3xl font-semibold text-ink">
                {report.assessment.applicationName}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {report.assessment.vendorName}
              </p>
            </div>
            <ReportActions assessmentId={report.assessment.id} />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className={`rounded-md border p-4 ${ratingTone(report.assessment.riskRating)}`}>
              <p className="text-sm font-medium">Risk rating</p>
              <p className="mt-2 text-3xl font-semibold">
                {report.assessment.riskRating}
              </p>
              <p className="mt-1 text-sm">Score {report.assessment.riskScore}</p>
            </div>
            <Info label="Assessment level" value={report.assessment.assessmentLevel} />
            <Info label="Criticality" value={report.assessment.criticality ?? "Unknown"} />
            <Info
              label="Decision"
              value={statusLabel(report.assessment.decisionStatus ?? report.assessment.status)}
            />
          </div>
        </header>

        <DecisionCard assessmentId={report.assessment.id} />

        <section className="rounded-md border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">Executive summary</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {report.executiveSummary}
          </p>
          <p className="mt-4 rounded-md border border-line bg-panel p-3 text-sm font-medium text-slate-700">
            {report.approvalRecommendation}
          </p>
        </section>

        <LlmSummaryPanel
          assessmentId={report.assessment.id}
          initialSummary={report.latestSummary}
        />

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-line bg-white p-5">
            <h2 className="text-lg font-semibold">Category scores</h2>
            <div className="mt-4 grid gap-3">
              {Object.entries(report.categoryScores).map(([category, score]) => (
                <div key={category}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-700">{category}</span>
                    <span className="text-slate-600">{score}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-sm bg-panel">
                    <div
                      className="h-2 rounded-sm bg-accent"
                      style={{ width: `${Math.min(score, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-line bg-white p-5">
            <h2 className="text-lg font-semibold">Profile summaries</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <Summary label="Access" value={report.summaries.access} />
              <Summary label="Data" value={report.summaries.data} />
              <Summary label="Integration" value={report.summaries.integration} />
              <Summary label="Evidence" value={report.summaries.evidence} />
            </dl>
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">Key risk drivers</h2>
          <div className="mt-4">
            <FindingList findings={report.keyRiskDrivers} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-line bg-white p-5">
            <h2 className="text-lg font-semibold">Required evidence</h2>
            <div className="mt-4">
              <EvidenceList
                items={report.evidence.required}
                emptyText="No required evidence applies yet."
              />
            </div>
          </div>
          <div className="rounded-md border border-line bg-white p-5">
            <h2 className="text-lg font-semibold">Missing evidence</h2>
            <div className="mt-4">
              <EvidenceList
                items={report.evidence.missing}
                emptyText="No missing required evidence."
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-line bg-white p-5">
            <h2 className="text-lg font-semibold">Contract/legal gaps</h2>
            <div className="mt-4">
              <FindingList findings={report.contractLegalGaps} />
            </div>
          </div>
          <div className="rounded-md border border-line bg-white p-5">
            <h2 className="text-lg font-semibold">Not applicable evidence</h2>
            <div className="mt-4">
              <EvidenceList
                items={report.evidence.notApplicable}
                emptyText="No evidence is marked not applicable."
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <ListSection
            title="Required controls"
            items={report.requiredControls}
            emptyText="No additional controls generated."
          />
          <ListSection
            title="Vendor follow-up questions"
            items={report.vendorFollowUpQuestions}
            emptyText="No follow-up questions generated."
          />
        </section>

        <section className="rounded-md border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">Approval/rejection details</h2>
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <Summary
              label="Approved with exceptions"
              value={report.approvalDetails.approvedWithExceptions ? "Yes" : "No"}
            />
            <Summary
              label="Decision by"
              value={report.assessment.decisionBy ?? "Not recorded"}
            />
            <Summary
              label="Decision at"
              value={formatDate(report.assessment.decisionAt)}
            />
            <Summary
              label="Rejection owner"
              value={report.approvalDetails.rejectionOwner ?? "Not recorded"}
            />
            <Summary
              label="Rejection due date"
              value={formatDate(report.approvalDetails.rejectionDueDate)}
            />
            <Summary
              label="Decision justification"
              value={report.assessment.decisionJustification ?? "Not recorded"}
            />
            <Summary
              label="Rejection reason"
              value={report.assessment.rejectionReason ?? "Not recorded"}
            />
            <Summary
              label="Remediation actions"
              value={report.assessment.remediationActions ?? "Not recorded"}
            />
          </dl>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-panel p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-ink">{value}</p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-slate-700">{value}</dd>
    </div>
  );
}

function ListSection({
  title,
  items,
  emptyText
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <section className="rounded-md border border-line bg-white p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <div className="mt-4">
          <Empty text={emptyText} />
        </div>
      ) : (
        <ul className="mt-4 grid gap-2 text-sm text-slate-700">
          {items.map((item) => (
            <li key={item} className="rounded-md border border-line p-3">
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
