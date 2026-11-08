import { describe, it, expect } from "vitest";
import { validatePreferences, validateRecommendations, isRegionalPlace } from "../../supabase/functions/recommend-places/validation";

describe("Visitor recommendations", () => {
  it("accepts descriptions but rejects empty or oversized requests", () => {
    expect(validatePreferences("  Café tranquilo  ")).toBe("Café tranquilo");
    expect(validatePreferences(" ")).toBeNull();
    expect(validatePreferences("a".repeat(1001))).toBeNull();
    expect(validatePreferences({ preferences: "Café" })).toBeNull();
  });
  it("only returns registered catalog IDs, without duplicates", () => {
    expect(validateRecommendations([
      { id: "place-1", reason: "Café tranquilo" },
      { id: "invented", reason: "Fake place" },
      { id: "place-1", reason: "Duplicate" },
      { id: "place-2", reason: "" },
    ], new Set(["place-1", "place-2"]))).toEqual([{ id: "place-1", reason: "Café tranquilo" }]);
  });
  it("accepts Gramado and Canela, not distant places or missing coordinates", () => {
    expect(isRegionalPlace(-29.3788, -50.8769)).toBe(true);
    expect(isRegionalPlace(-29.3656, -50.8151)).toBe(true);
    expect(isRegionalPlace(-23.5505, -46.6333)).toBe(false);
    expect(isRegionalPlace(null, null)).toBe(false);
  });
});