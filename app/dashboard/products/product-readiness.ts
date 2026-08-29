type IngredientEvidence = {
  status?: "verified" | "partial";
} | undefined;

export function ingredientEvidenceNeedsReview(evidence: IngredientEvidence) {
  return evidence?.status !== "verified";
}
