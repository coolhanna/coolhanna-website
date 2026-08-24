import assert from "node:assert/strict";
import test from "node:test";

import {
  buildQuickFoodEntry,
  estimateFoodCalories,
  parseQuickFoodEntry,
  prepareFoodDay,
  sanitizeFoodValue,
} from "../lib/food-journal-rules.ts";

const emptyNutrition = {
  calorie_min: null,
  calorie_max: null,
  confidence: "unknown",
  concern: "",
  advice: "",
  basis: [],
};

test("a one-line manual entry extracts an explicit meal without losing the food", () => {
  assert.deepEqual(parseQuickFoodEntry("점심 김치볶음밥", "저녁"), {
    meal: "점심",
    food: "김치볶음밥",
  });
  assert.deepEqual(parseQuickFoodEntry("간식: 복숭아 1개", "저녁"), {
    meal: "간식",
    food: "복숭아 1개",
  });
  assert.deepEqual(parseQuickFoodEntry("김치볶음밥", "점심"), {
    meal: "점심",
    food: "김치볶음밥",
  });
  assert.deepEqual(parseQuickFoodEntry("점심", "저녁"), {
    meal: "점심",
    food: "",
  });
  assert.deepEqual(buildQuickFoodEntry("점심 김치볶음밥", "저녁"), {
    meal: "저녁",
    food: "김치볶음밥",
  });
});

test("water and breath mints are removed without deleting real dishes", () => {
  assert.equal(sanitizeFoodValue("물 섭취 발언 · 이클립스 · 복숭아 1개"), "복숭아 1개");
  assert.equal(sanitizeFoodValue("이클립스 먹고 복숭아 1개"), "복숭아 1개");
  assert.equal(sanitizeFoodValue("생수 한 잔"), "");
  assert.equal(sanitizeFoodValue("물냉면 · 국물 조금"), "물냉면 · 국물 조금");
});

test("rough calorie ranges use portions when known and stay conservative", () => {
  assert.deepEqual(estimateFoodCalories("올리브유 1큰술 + 레몬즙", "아침"), {
    min: 105,
    max: 135,
    basis: "올리브유 1큰술 기준",
  });
  assert.deepEqual(estimateFoodCalories("믹스커피 1잔", "아침"), {
    min: 45,
    max: 70,
    basis: "믹스커피 1잔 기준",
  });
  assert.deepEqual(estimateFoodCalories("맥심 커피 1잔", "아침"), {
    min: 45,
    max: 70,
    basis: "믹스커피 1잔 기준",
  });
  assert.deepEqual(estimateFoodCalories("신라면 큰 컵", "점심"), {
    min: 450,
    max: 600,
    basis: "일반 1회분 기준",
  });
  assert.deepEqual(estimateFoodCalories("달걀 3개", "아침"), {
    min: 180,
    max: 270,
    basis: "달걀 3개 기준",
  });
  assert.deepEqual(estimateFoodCalories("김밥 · 치킨", "저녁"), {
    min: 750,
    max: 1_350,
    basis: "일반적인 1회 섭취량 기준",
  });
  assert.deepEqual(estimateFoodCalories("김밥과 치킨", "저녁"), {
    min: 750,
    max: 1_350,
    basis: "일반적인 1회 섭취량 기준",
  });
  assert.deepEqual(estimateFoodCalories("달걀 2개와 빵 2개", "아침"), {
    min: 420,
    max: 980,
    basis: "일반적인 1회 섭취량 기준",
  });
  assert.deepEqual(estimateFoodCalories("라면 2개", "점심"), {
    min: 900,
    max: 1_200,
    basis: "라면 2개 기준",
  });
  assert.deepEqual(estimateFoodCalories("믹스커피 2잔", "아침"), {
    min: 90,
    max: 140,
    basis: "믹스커피 2잔 기준",
  });
  assert.deepEqual(estimateFoodCalories("올리브유 2큰술 + 레몬즙", "아침"), {
    min: 210,
    max: 270,
    basis: "올리브유 2큰술 기준",
  });
  assert.deepEqual(estimateFoodCalories("믹스커피 2잔 · 빵 1개", "아침"), {
    min: 240,
    max: 540,
    basis: "일반적인 1회 섭취량 기준",
  });
  assert.deepEqual(estimateFoodCalories("올리브유 2큰술 + 레몬즙 + 달걀 2개", "아침"), {
    min: 330,
    max: 450,
    basis: "일반적인 1회 섭취량 기준",
  });
  assert.deepEqual(estimateFoodCalories("김밥과 정체불명 반찬", "점심"), {
    min: 350,
    max: 550,
    basis: "김밥 1줄 기준",
    partial: true,
  });
  assert.deepEqual(estimateFoodCalories("달걀 두 개", "아침"), {
    min: 120,
    max: 180,
    basis: "달걀 2개 기준",
  });
  assert.deepEqual(estimateFoodCalories("김밥 두 줄", "점심"), {
    min: 700,
    max: 1_100,
    basis: "김밥 2줄 기준",
  });
  assert.deepEqual(estimateFoodCalories("믹스커피 두 잔", "아침"), {
    min: 90,
    max: 140,
    basis: "믹스커피 2잔 기준",
  });
  assert.deepEqual(estimateFoodCalories("달걀 1개와 달걀 2개", "아침"), {
    min: 180,
    max: 270,
    basis: "일반적인 1회 섭취량 기준",
  });
  assert.deepEqual(estimateFoodCalories("믹스커피 한 잔과 믹스커피 두 잔", "아침"), {
    min: 135,
    max: 210,
    basis: "일반적인 1회 섭취량 기준",
  });
  assert.deepEqual(
    estimateFoodCalories("올리브유 한 큰술 + 레몬즙과 올리브유 두 큰술 + 레몬즙", "아침"),
    {
      min: 315,
      max: 405,
      basis: "일반적인 1회 섭취량 기준",
    },
  );
  assert.deepEqual(estimateFoodCalories("올리브유 한 큰술과 레몬즙", "아침"), {
    min: 105,
    max: 135,
    basis: "올리브유 1큰술 기준",
  });
});

test("daily view adds the morning routine, flags late food, and asks unknown meals", () => {
  const day = prepareFoodDay({
    date: "2026-08-21",
    source_status: "ok",
    confirmed: [
      { label: "음료", value: "물", meal: "간식", source: "life_audio", time: "09:00" },
      { label: "간식", value: "이클립스", meal: "간식", source: "life_audio", time: "16:00" },
      { label: "섭취", value: "김밥 한 줄", meal: "기타", source: "life_audio" },
      { label: "저녁", value: "라면", meal: "저녁", source: "life_audio", time: "21:10" },
    ],
    uncertain: [],
    excluded: [],
    nutrition: emptyNutrition,
  }, "2026-08-22");

  assert.deepEqual(
    day.confirmed.filter((entry) => entry.source === "routine").map((entry) => entry.value),
    ["올리브유 1큰술 + 레몬즙 · 믹스커피 1잔"],
  );
  assert.ok(!day.confirmed.some((entry) => /물|이클립스/.test(entry.value)));
  assert.equal(day.late_night_count, 1);
  assert.equal(day.confirmed.find((entry) => entry.value === "라면")?.late_night, true);
  assert.equal(day.uncertain[0]?.question, "김밥 한 줄은 아침·점심·저녁·간식 중 언제 먹었어?");
  assert.ok((day.estimated_calorie_min ?? 0) > 0);
  assert.ok((day.estimated_calorie_max ?? 0) >= (day.estimated_calorie_min ?? 0));
});

test("a manual meal answer resolves the matching uncertain audio entry", () => {
  const day = prepareFoodDay({
    date: "2026-08-20",
    source_status: "ok",
    confirmed: [
      { label: "섭취", value: "복숭아 1개", meal: "기타", source: "life_audio" },
      { label: "점심", value: "복숭아 1개", meal: "점심", source: "manual" },
    ],
    uncertain: [],
    excluded: [],
    nutrition: emptyNutrition,
  }, "2026-08-22");

  assert.ok(day.confirmed.some((entry) => entry.meal === "점심" && entry.value === "복숭아 1개"));
  assert.ok(!day.uncertain.some((entry) => entry.value === "복숭아 1개"));
});

test("confirmed meals are shown in breakfast, lunch, dinner, snack order", () => {
  const day = prepareFoodDay({
    date: "2026-08-23",
    source_status: "ok",
    confirmed: [
      { label: "저녁", value: "김치찌개", meal: "저녁", source: "manual", time: "19:30" },
      { label: "점심", value: "김밥", meal: "점심", source: "manual", time: "12:10" },
    ],
    uncertain: [],
    excluded: [],
    nutrition: emptyNutrition,
  }, "2026-08-23");

  assert.deepEqual(day.confirmed.map((entry) => entry.meal), ["아침", "점심", "저녁"]);
});

test("a ranged meal beginning after 21:00 remains a late-night meal", () => {
  const day = prepareFoodDay({
    date: "2026-08-23",
    source_status: "ok",
    confirmed: [
      { label: "간식", value: "야식", meal: "간식", source: "manual", time: "21:10~21:45" },
    ],
    uncertain: [],
    excluded: [],
    nutrition: emptyNutrition,
  }, "2026-08-23");

  const lateMeal = day.confirmed.find((entry) => entry.value === "야식");
  assert.equal(lateMeal?.late_night, true);
  assert.equal(day.late_night_count, 1);
});

test("an uncertain consumption is not presented as a meal-only correction", () => {
  const day = prepareFoodDay({
    date: "2026-08-20",
    source_status: "ok",
    confirmed: [],
    uncertain: [
      { label: "섭취 여부", value: "치킨 주문 정황", meal: "기타", source: "life_audio" },
    ],
    excluded: [],
    nutrition: emptyNutrition,
  }, "2026-08-22");

  assert.equal(day.uncertain[0]?.question_kind, "consumption");
  assert.equal(day.uncertain[0]?.question, "치킨 주문 정황은 실제로 먹은 게 맞아?");
});

test("a time-less recorded morning routine is confirmed once without a duplicate question", () => {
  const day = prepareFoodDay({
    date: "2026-08-20",
    source_status: "ok",
    confirmed: [
      { label: "섭취", value: "맥심 커피 1잔", meal: "기타", source: "life_audio" },
    ],
    uncertain: [],
    excluded: [],
    nutrition: emptyNutrition,
  }, "2026-08-22");

  assert.equal(day.confirmed.filter((entry) => /(?:믹스커피|맥심 커피)/.test(entry.value)).length, 1);
  assert.ok(day.confirmed.some((entry) => entry.value === "올리브유 1큰술 + 레몬즙 · 믹스커피 1잔" && entry.meal === "아침"));
  assert.ok(!day.uncertain.some((entry) => /커피/.test(entry.value)));
});

test("the declared morning routine appears through today even without an audio record", () => {
  const blankDay = {
    date: "2026-08-22",
    source_status: "missing",
    confirmed: [],
    uncertain: [],
    excluded: [],
    nutrition: emptyNutrition,
  };

  const today = prepareFoodDay(blankDay, "2026-08-22");
  const future = prepareFoodDay({ ...blankDay, date: "2026-08-23" }, "2026-08-22");

  assert.deepEqual(today.confirmed.map((entry) => entry.value), [
    "올리브유 1큰술 + 레몬즙 · 믹스커피 1잔",
  ]);
  assert.equal(future.confirmed.length, 0);
});

test("routine compaction never swallows extra food, larger quantities, or late records", () => {
  const compound = prepareFoodDay({
    date: "2026-08-22",
    source_status: "ok",
    confirmed: [
      { id: "compound", label: "아침", value: "믹스커피 1잔 · 빵 1개", meal: "아침", source: "life_audio", time: "09:00" },
    ],
    uncertain: [],
    excluded: [],
    nutrition: emptyNutrition,
  }, "2026-08-22");
  assert.ok(compound.confirmed.some((entry) => entry.value.includes("빵 1개")));
  assert.equal(compound.confirmed.filter((entry) => /(?:믹스커피|맥심 커피)/.test(entry.value)).length, 1);

  const larger = prepareFoodDay({
    date: "2026-08-22",
    source_status: "ok",
    confirmed: [
      { id: "larger", label: "아침", value: "맥심 커피 2잔", meal: "아침", source: "life_audio", time: "09:30" },
      { id: "late", label: "야식", value: "올리브유 1큰술 + 레몬즙", meal: "간식", source: "life_audio", time: "21:30" },
    ],
    uncertain: [],
    excluded: [],
    nutrition: emptyNutrition,
  }, "2026-08-22");
  assert.ok(larger.confirmed.some((entry) => entry.id === "larger" && entry.value === "맥심 커피 2잔"));
  assert.equal(larger.confirmed.filter((entry) => /(?:믹스커피|맥심 커피)/.test(entry.value)).length, 1);
  assert.equal(larger.confirmed.find((entry) => entry.id === "late")?.late_night, true);
});

test("the same food at a different time remains a separate question", () => {
  const day = prepareFoodDay({
    date: "2026-08-20",
    source_status: "ok",
    confirmed: [
      { label: "점심", value: "복숭아 1개", meal: "점심", source: "manual", time: "12:00" },
    ],
    uncertain: [
      { label: "섭취 여부", value: "복숭아 1개", meal: "기타", source: "life_audio", time: "20:00" },
    ],
    excluded: [],
    nutrition: emptyNutrition,
  }, "2026-08-22");

  assert.ok(day.uncertain.some((entry) => entry.value === "복숭아 1개" && entry.time === "20:00"));
});

test("partially matched compound food is labelled as a partial calorie range", () => {
  const day = prepareFoodDay({
    date: "2026-08-20",
    source_status: "ok",
    confirmed: [
      { label: "점심", value: "김밥 · 정체불명 반찬", meal: "점심", source: "life_audio" },
    ],
    uncertain: [],
    excluded: [],
    nutrition: emptyNutrition,
  }, "2026-08-22");

  const meal = day.confirmed.find((entry) => entry.value.includes("김밥"));
  assert.equal(meal?.calorie_partial, true);
  assert.equal(day.estimated_calorie_partial, true);
});
