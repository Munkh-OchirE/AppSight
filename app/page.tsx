import Link from "next/link";
import { DeleteAssessmentButton } from "@/components/DeleteAssessmentButton";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function riskTone(rating: string | null) {
  switch (rating) {
    case "Critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "High":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "Medium":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Low":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function statusTone(status: string) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "approved_with_exceptions":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "in_review":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function pieBackground(
  data: Array<{ count: number; hex: string }>,
  total: number
) {
  if (total === 0) {
    return "#e2e8f0";
  }

  let offset = 0;
  const segments = data.flatMap((item) => {
    if (item.count === 0) {
      return [];
    }

    const start = offset;
    offset += (item.count / total) * 100;
    return `${item.hex} ${start}% ${offset}%`;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

type PieDatum = {
  label: string;
  count: number;
  color: string;
  hex: string;
  percentage: number;
};

function PortfolioPieChart({
  title,
  subtitle,
  emptyText,
  total,
  data
}: {
  title: string;
  subtitle: string;
  emptyText: string;
  total: number;
  data: PieDatum[];
}) {
  return (
    <section className="border-y border-line bg-white py-5">
      <div className="flex h-full flex-col gap-5 px-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <p className="text-2xl font-semibold text-ink">{total}</p>
        </div>

        {total === 0 ? (
          <p className="py-6 text-sm text-slate-500">{emptyText}</p>
        ) : (
          <div className="grid flex-1 items-center gap-6 sm:grid-cols-[minmax(180px,240px)_1fr]">
            <div
              className="mx-auto aspect-square w-full max-w-56 rounded-full border border-line shadow-sm"
              role="img"
              aria-label={data.map((item) => `${item.label}: ${item.count}`).join(", ")}
              style={{ background: pieBackground(data, total) }}
            />

            <div className="grid gap-y-2">
              {data.map((item) => (
                <div
                  key={item.label}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-2"
                >
                  <span
                    className={`h-3 w-3 rounded-sm ${item.color}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.percentage}%</p>
                  </div>
                  <p className="text-sm font-semibold text-ink">{item.count}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

type DashboardPageProps = {
  searchParams: Promise<{ decision?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const query = await searchParams;
  const assessments = await db.assessment.findMany({
    orderBy: { updatedAt: "desc" }
  });

  const summary = {
    total: assessments.length,
    draft: assessments.filter((item) => item.status === "draft").length,
    inReview: assessments.filter((item) => item.status === "in_review").length,
    approved: assessments.filter((item) => item.status === "approved").length,
    approvedWithExceptions: assessments.filter(
      (item) => item.status === "approved_with_exceptions"
    ).length,
    rejected: assessments.filter((item) => item.status === "rejected").length,
    highRisk: assessments.filter((item) => item.riskRating === "High").length,
    criticalRisk: assessments.filter((item) => item.riskRating === "Critical").length,
    mediumRisk: assessments.filter((item) => item.riskRating === "Medium").length,
    lowRisk: assessments.filter((item) => item.riskRating === "Low").length,
    notScored: assessments.filter((item) => !item.riskRating).length
  };

  const statCards = [
    ["Total", summary.total],
    ["Needs review", summary.draft],
    ["In review", summary.inReview],
    ["Approved", summary.approved],
    ["Approved with exceptions", summary.approvedWithExceptions],
    ["Rejected", summary.rejected],
    ["High risk", summary.highRisk],
    ["Critical risk", summary.criticalRisk]
  ];
  const statusData = [
    {
      label: "Pending review",
      count: summary.draft,
      color: "bg-slate-500",
      hex: "#64748b"
    },
    {
      label: "In review",
      count: summary.inReview,
      color: "bg-blue-600",
      hex: "#2563eb"
    },
    {
      label: "Approved",
      count: summary.approved,
      color: "bg-emerald-600",
      hex: "#059669"
    },
    {
      label: "Approved with exceptions",
      count: summary.approvedWithExceptions,
      color: "bg-amber-500",
      hex: "#f59e0b"
    },
    {
      label: "Rejected",
      count: summary.rejected,
      color: "bg-red-600",
      hex: "#dc2626"
    }
  ].map((item) => ({
    ...item,
    percentage: summary.total === 0 ? 0 : Math.round((item.count / summary.total) * 100)
  }));
  const riskData = [
    {
      label: "Critical",
      count: summary.criticalRisk,
      color: "bg-red-600",
      hex: "#dc2626"
    },
    {
      label: "High",
      count: summary.highRisk,
      color: "bg-orange-600",
      hex: "#ea580c"
    },
    {
      label: "Medium",
      count: summary.mediumRisk,
      color: "bg-amber-400",
      hex: "#fbbf24"
    },
    {
      label: "Low",
      count: summary.lowRisk,
      color: "bg-emerald-600",
      hex: "#059669"
    },
    {
      label: "Not scored",
      count: summary.notScored,
      color: "bg-slate-400",
      hex: "#94a3b8"
    }
  ].map((item) => ({
    ...item,
    percentage: summary.total === 0 ? 0 : Math.round((item.count / summary.total) * 100)
  }));
  const decisionNotice =
    query.decision === "approved"
      ? {
          title: "Assessment approved",
          message: "The decision was saved and the portfolio overview is up to date.",
          tone: "border-emerald-200 bg-emerald-50 text-emerald-800"
        }
      : query.decision === "approved_with_exceptions"
        ? {
            title: "Assessment approved with exceptions",
            message: "The decision was saved with outstanding items recorded for review.",
            tone: "border-amber-200 bg-amber-50 text-amber-900"
          }
        : null;

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col justify-between gap-4 border-b border-line pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Application Risk Snapshot
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">All assessments</h1>
          </div>
          <Link
            href="/assessments/new"
            className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Start new assessment
          </Link>
        </header>

        {decisionNotice ? (
          <section className={`border px-4 py-3 ${decisionNotice.tone}`} role="status">
            <p className="text-sm font-semibold">{decisionNotice.title}</p>
            <p className="mt-1 text-sm">{decisionNotice.message}</p>
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(([label, value]) => (
            <div key={label} className="rounded-md border border-line bg-white p-4">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <PortfolioPieChart
            title="Application status"
            subtitle="Current assessment workflow distribution"
            emptyText="No status data is available yet."
            total={summary.total}
            data={statusData}
          />
          <PortfolioPieChart
            title="Application risk level"
            subtitle="Current assessed risk distribution"
            emptyText="No risk data is available yet."
            total={summary.total}
            data={riskData}
          />
        </div>

        <section className="overflow-hidden rounded-md border border-line bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold">Assessment overview</h2>
              <p className="mt-1 text-sm text-slate-500">
                Sorted by most recently updated
              </p>
            </div>
            <p className="text-sm font-medium text-slate-600">
              {assessments.length} total
            </p>
          </div>
          {assessments.length === 0 ? (
            <div className="px-4 py-10 text-center text-slate-500">
              No assessments yet. Start one from the new assessment page.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line text-sm">
                <thead className="bg-panel text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Application</th>
                    <th className="px-4 py-3 font-medium">Vendor</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Risk</th>
                    <th className="px-4 py-3 font-medium">Criticality</th>
                    <th className="px-4 py-3 font-medium">Procurement stage</th>
                    <th className="px-4 py-3 font-medium">Business owner</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {assessments.map((assessment) => (
                    <tr key={assessment.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-ink">
                        <Link
                          href={`/assessments/${assessment.id}/draft`}
                          className="font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                        >
                          {assessment.applicationName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{assessment.vendorName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold ${statusTone(assessment.status)}`}
                        >
                          {statusLabel(assessment.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold ${riskTone(assessment.riskRating)}`}
                        >
                          {assessment.riskRating
                            ? `${assessment.riskRating} (${assessment.riskScore ?? 0})`
                            : "Not scored"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {assessment.criticality ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {assessment.procurementStage ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {assessment.businessOwner ?? "Unassigned"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {assessment.updatedAt.toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteAssessmentButton
                          assessmentId={assessment.id}
                          applicationName={assessment.applicationName}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
