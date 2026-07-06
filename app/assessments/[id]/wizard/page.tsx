import { notFound } from "next/navigation";
import { AssessmentNav } from "@/components/AssessmentNav";
import { DecisionCard } from "@/components/DecisionCard";
import { DynamicWizard } from "@/components/DynamicWizard";
import { questions } from "@/config/questions";
import { db } from "@/lib/db";
import { calculateSmartEvidenceRequirements } from "@/lib/evidence/smartEvidenceRequest";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function WizardPage({ params }: PageProps) {
  const { id } = await params;

  const assessment = await db.assessment.findUnique({
    where: { id },
    include: {
      answers: { orderBy: [{ section: "asc" }, { field: "asc" }] },
      evidenceItems: { orderBy: [{ type: "asc" }, { createdAt: "desc" }] }
    }
  });

  if (!assessment) {
    notFound();
  }

  const evidencePreview = calculateSmartEvidenceRequirements({
    assessment,
    answers: assessment.answers,
    evidenceItems: assessment.evidenceItems
  });

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AssessmentNav assessmentId={assessment.id} current="questionnaire" />
        <header className="border-b border-line pb-5">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Security questionnaire
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">
            {assessment.applicationName}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{assessment.vendorName}</p>
        </header>
        <DecisionCard assessmentId={assessment.id} />
        <DynamicWizard
          assessmentId={assessment.id}
          questions={questions}
          answers={assessment.answers.map((answer) => ({
            id: answer.id,
            section: answer.section,
            field: answer.field,
            value: answer.value
          }))}
          evidencePreview={evidencePreview}
        />
      </div>
    </main>
  );
}
