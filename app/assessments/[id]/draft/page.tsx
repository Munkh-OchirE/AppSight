import { notFound } from "next/navigation";
import { AssessmentNav } from "@/components/AssessmentNav";
import { DecisionCard } from "@/components/DecisionCard";
import { buildDraftAssessment } from "@/lib/assessment/draftBuilder";
import { db } from "@/lib/db";
import { DraftReview } from "@/components/DraftReview";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DraftPage({ params }: PageProps) {
  const { id } = await params;

  const assessment = await db.assessment.findUnique({
    where: { id },
    include: {
      answers: { orderBy: [{ section: "asc" }, { field: "asc" }] },
      evidenceItems: { orderBy: [{ type: "asc" }, { createdAt: "desc" }] },
      llmOutputs: { orderBy: { createdAt: "desc" } },
      auditLogs: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!assessment) {
    notFound();
  }

  const draft = buildDraftAssessment({
    assessment,
    answers: assessment.answers,
    evidenceItems: assessment.evidenceItems,
    llmOutputs: assessment.llmOutputs,
    auditLogs: assessment.auditLogs
  });

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AssessmentNav assessmentId={assessment.id} current="draft" />
        <DecisionCard assessmentId={assessment.id} />
        <DraftReview
          assessment={{
            id: draft.assessment.id,
            applicationName: draft.assessment.applicationName,
            vendorName: draft.assessment.vendorName,
            vendorWebsite: draft.assessment.vendorWebsite,
            trustCentreUrl: draft.assessment.trustCentreUrl,
            description: draft.assessment.description,
            businessOwner: draft.assessment.businessOwner,
            procurementStage: draft.assessment.procurementStage,
            vendorStatus: draft.assessment.vendorStatus,
            criticality: draft.assessment.criticality
          }}
          answers={assessment.answers.map((answer) => ({
            id: answer.id,
            section: answer.section,
            field: answer.field,
            value: answer.value,
            state: answer.state,
            confidence: answer.confidence,
            confirmed: answer.confirmed
          }))}
          evidenceItems={assessment.evidenceItems.map((item) => ({
            id: item.id,
            type: item.type,
            status: item.status,
            confidence: item.confidence,
            sourceUrl: item.sourceUrl,
            sourceTextSnippet: item.sourceTextSnippet,
            notes: item.notes,
            recommendedAction: item.recommendedAction,
            verified: item.verified
          }))}
        />
      </div>
    </main>
  );
}
