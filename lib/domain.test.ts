import { describe, expect, it } from "vitest";
import { DEMO_IDEAS } from "./demo-data";
import {
  getAverageResolutionDays,
  getBudgetTotals,
  getMonthlySubmissionCounts,
  getStatusCounts,
  ideaFormSchema,
  filterIdeas,
} from "./domain";

describe("idea form validation", () => {
  it("accepts a clear idea with an optional budget", () => {
    expect(ideaFormSchema.safeParse({
      title: "Make meeting rooms easier to book",
      description: "Show room availability in one place and let people reserve the right space.",
      categoryId: "category-tools",
      estimatedCost: 850,
      costCurrency: "GBP",
      budgetPeriod: "FY 2026/27",
    }).success).toBe(true);
  });

  it("rejects a short title and description", () => {
    expect(ideaFormSchema.safeParse({
      title: "Tiny",
      description: "Too short",
      categoryId: "category-tools",
      estimatedCost: null,
      costCurrency: "GBP",
      budgetPeriod: null,
    }).success).toBe(false);
  });
});

describe("idea reporting helpers", () => {
  it("filters ideas by text, status, category and submitter together", () => {
    const result = filterIdeas(DEMO_IDEAS, {
      query: "room",
      status: "in_review",
      categoryId: "category-workplace",
      submittedBy: "person-jamie",
    });
    expect(result).toHaveLength(1);
    expect(result[0].title.toLowerCase()).toContain("room");
  });

  it("returns every status, including statuses with no current ideas", () => {
    const counts = getStatusCounts(DEMO_IDEAS);
    expect(counts.submitted).toBeGreaterThan(0);
    expect(counts.duplicate).toBe(0);
  });

  it("keeps budget totals separate by currency", () => {
    const totals = getBudgetTotals([
      DEMO_IDEAS[1],
      { ...DEMO_IDEAS[1], cost_currency: "USD" },
    ]);
    expect(totals.has("GBP")).toBe(true);
    expect(totals.has("USD")).toBe(true);
    expect(totals.get("GBP")?.requested).toBeGreaterThan(0);
  });

  it("returns a stable six-month series and a non-negative resolution average", () => {
    const months = getMonthlySubmissionCounts(DEMO_IDEAS, new Date("2026-10-17T12:00:00Z"));
    expect(months).toHaveLength(6);
    expect(months.at(-1)?.key).toBe("2026-10");
    expect(getAverageResolutionDays(DEMO_IDEAS)).toBeGreaterThanOrEqual(0);
  });
});
