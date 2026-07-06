import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function DashboardPage() {
  const assessments = await db.assessment.findMany({
    orderBy: { updatedAt: "desc" },
    take: 12
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
    criticalRisk: assessments.filter((item) => item.riskRating === "Critical").length
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

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(([label, value]) => (
            <div key={label} className="rounded-md border border-line bg-white p-4">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-md border border-line bg-white">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-lg font-semibold">Recent assessments</h2>
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
                    <th className="px-4 py-3 font-medium">Criticality</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {assessments.map((assessment) => (
                    <tr key={assessment.id}>
                      <td className="px-4 py-3 font-medium text-ink">
                        <Link
                          href={`/assessments/${assessment.id}/draft`}
                          className="text-accent hover:underline"
                        >
                          {assessment.applicationName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{assessment.vendorName}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {statusLabel(assessment.status)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {assessment.criticality ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {assessment.updatedAt.toLocaleDateString()}
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
