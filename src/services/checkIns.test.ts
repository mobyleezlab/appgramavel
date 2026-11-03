import { describe, it, expect, vi, beforeEach } from "vitest";

const { insert, from } = vi.hoisted(() => {
  const insert = vi.fn().mockResolvedValue({ data: null, error: null });
  return { insert, from: vi.fn(() => ({ insert })) };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
vi.mock("@/lib/auth", () => ({ getCurrentUserId: vi.fn().mockResolvedValue("u1") }));

import { createCheckIn } from "./checkIns";

describe("createCheckIn", () => {
  beforeEach(() => { insert.mockClear(); from.mockClear(); });

  it("does not send a check-in without coordinates", async () => {
    const res = await createCheckIn("e1", null, "u1");
    expect(res.error).not.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("sends latitude, longitude and rounded accuracy_m", async () => {
    await createCheckIn("e1", { lat: -29.37, lng: -50.87, accuracy: 12.6 }, "u1");
    expect(insert).toHaveBeenCalledWith({
      user_id: "u1", establishment_id: "e1", latitude: -29.37, longitude: -50.87, accuracy_m: 13,
    });
  });
});
