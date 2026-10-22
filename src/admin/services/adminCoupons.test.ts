import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const query: Record<string, any> = {};
  for (const method of ["select", "eq", "update", "single"]) query[method] = vi.fn(() => query);
  return { query, from: vi.fn(() => query) };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
import { setCouponVisibility } from "./adminCoupons";
import { getAllCoupons, getCoupons } from "@/services/coupons";

describe("Coupon visibility", () => {
  beforeEach(() => vi.clearAllMocks());
  it("persists activation for the selected coupon only", async () => {
    await setCouponVisibility("coupon-1", true);
    expect(mocks.from).toHaveBeenCalledWith("coupons");
    expect(mocks.query.update).toHaveBeenCalledWith({ is_active: true });
    expect(mocks.query.eq).toHaveBeenCalledWith("id", "coupon-1");
  });
  it("persists deactivation without changing lifecycle status", async () => {
    await setCouponVisibility("coupon-2", false);
    expect(mocks.query.update).toHaveBeenCalledWith({ is_active: false });
    expect(mocks.query.eq).toHaveBeenCalledWith("id", "coupon-2");
  });
  it("excludes disabled coupons from all user listings", async () => {
    await getAllCoupons();
    expect(mocks.query.eq).toHaveBeenCalledWith("is_active", true);
  });
  it("excludes disabled coupons from available offers", async () => {
    await getCoupons();
    expect(mocks.query.eq).toHaveBeenCalledWith("is_active", true);
    expect(mocks.query.eq).toHaveBeenCalledWith("status", "active");
  });
});