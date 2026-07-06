import {
  assessmentLevelsByRating,
  riskBands,
  type RiskRating
} from "@/config/riskRules";

export function getRiskRating(score: number): RiskRating {
  const band = riskBands.find(
    (item) => score >= item.min && (item.max === undefined || score <= item.max)
  );

  return band?.rating ?? "Critical";
}

export function getAssessmentLevel(rating: RiskRating) {
  return assessmentLevelsByRating[rating];
}
