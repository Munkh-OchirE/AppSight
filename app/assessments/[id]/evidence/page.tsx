import { notFound } from "next/navigation";
import { AssessmentNav } from "@/components/AssessmentNav";
import { EvidenceCard } from "@/components/EvidenceCard";
import { db } from "@/lib/db";
import { calculateSmartEvidenceRequirements } from "@/lib/evidence/smartEvidenceRequest";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EvidencePage({ params }: PageProps) {
  const { id } = await params;

  const assessment = await db.assessment.findUnique({
    where: { id },
    include: {
      answers: true,
      evidenceItems: { orderBy: [{ type: "asc" }, { createdAt: "desc" }] }
    }
  });

  if (!assessment) {
    notFound();
  }

  const requirements = calculateSmartEvidenceRequirements({
    assessment,
    answers: assessment.answers,
    evidenceItems: assessment.evidenceItems
  });

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AssessmentNav assessmentId={assessment.id} current="evidence" />

        <header className="border-b border-line pb-5">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Evidence review
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">
            {assessment.applicationName}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{assessment.vendorName}</p>
        </header>

        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Publicly claimed SOC 2 Type II or ISO 27001 is not verified evidence.
          Reviewer verification is required before it counts as complete.
        </section>

        <section className="rounded-md border border-line bg-white">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-lg font-semibold">Required evidence</h2>
          </div>
          {requirements.length === 0 ? (
            <div className="px-4 py-8 text-sm text-slate-500">
              No evidence requirements apply yet.
            </div>
          ) : (
            <div className="grid gap-3 p-4 md:grid-cols-2">
              {requirements.map((requirement) => (
                <div key={requirement.id} className="rounded-md border border-line p-4">
                  <h3 className="font-semibold">{requirement.type}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {requirement.requirementLevel.replaceAll("_", " ")}
                    {" / "}
                    {requirement.baseRequirementLevel}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">{requirement.notes}</p>
                  {requirement.acceptableTypes.length > 1 ? (
                    <p className="mt-2 text-sm text-slate-600">
                      Accepts: {requirement.acceptableTypes.join(" or ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4">
          <h2 className="text-lg font-semibold">Evidence items</h2>
          {assessment.evidenceItems.length === 0 ? (
            <div className="rounded-md border border-line bg-white px-4 py-8 text-sm text-slate-500">
              No evidence items found yet. Run evidence discovery from the draft page.
            </div>
          ) : (
            assessment.evidenceItems.map((item) => (
              <EvidenceCard
                key={item.id}
                assessmentId={assessment.id}
                item={{
                  id: item.id,
                  type: item.type,
                  status: item.status,
                  confidence: item.confidence,
                  sourceUrl: item.sourceUrl,
                  notes: item.notes,
                  recommendedAction: item.recommendedAction,
                  verified: item.verified
                }}
              />
            ))
          )}
        </section>
      </div>
    </main>
  );
}
