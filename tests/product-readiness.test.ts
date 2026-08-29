import assert from "node:assert/strict";
import test from "node:test";

import { ingredientEvidenceNeedsReview } from "../app/dashboard/products/product-readiness.ts";

test("partial ingredient evidence always stays in review", () => {
  assert.equal(ingredientEvidenceNeedsReview({ status: "partial" }), true);
});

test("missing ingredient evidence stays in review", () => {
  assert.equal(ingredientEvidenceNeedsReview(undefined), true);
});

test("verified ingredient evidence can become an order candidate", () => {
  assert.equal(ingredientEvidenceNeedsReview({ status: "verified" }), false);
});
