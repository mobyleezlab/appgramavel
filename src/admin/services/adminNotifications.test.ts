import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), getUser: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from, rpc: mocks.rpc, auth: { getUser: mocks.getUser } } }));
import { deleteNotification, listNotificationsWithPerformance, sendTestToCurrentUser } from "./adminNotifications";

describe("admin notification history", () => {
  beforeEach(() => vi.resetAllMocks());

  it("records a test in history and dispatches it only to the signed-in administrator", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    const insert = vi.fn().mockReturnValue({ select: () => ({ single: async () => ({ data: { id: "campaign-1" }, error: null }) }) });
    mocks.from.mockReturnValue({ insert });
    mocks.rpc.mockResolvedValue({ data: 1, error: null });
    await sendTestToCurrentUser({ title: "Teste", body: "Mensagem", segment: { kind: "all" } });
    expect(mocks.from).toHaveBeenCalledWith("admin_notifications");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ target: "ids", target_ids: ["admin-1"], scheduled_at: null }));
    expect(mocks.rpc).toHaveBeenCalledWith("dispatch_admin_notification", { p_notification_id: "campaign-1" });
  });

  it("does not create a fake recipient when signed out", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await sendTestToCurrentUser({ title: "Teste", body: "Mensagem" });
    expect(result.error).toBeTruthy();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("deletes the campaign once so the database cascades every delivery atomically", async () => {
    const eq = vi.fn().mockReturnValue({ select: () => ({ single: async () => ({ data: { id: "campaign-1" }, error: null }) }) });
    mocks.from.mockReturnValue({ delete: () => ({ eq }) });
    await deleteNotification("campaign-1");
    expect(mocks.from.mock.calls).toEqual([["admin_notifications"]]);
    expect(eq).toHaveBeenCalledWith("id", "campaign-1");
  });

  it("loads history beyond the former 500-entry limit without a date filter", async () => {
    const range = vi.fn().mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, i) => ({ id: String(i), sent: false })), error: null })
      .mockResolvedValueOnce({ data: [{ id: "500", sent: false }], error: null });
    const or = vi.fn();
    const query = { order: vi.fn(), range, or };
    query.order.mockReturnValue(query);
    mocks.from.mockReturnValue({ select: () => query });
    expect(await listNotificationsWithPerformance("all")).toHaveLength(501);
    expect(range.mock.calls).toEqual([[0, 499], [500, 999]]);
    expect(or).not.toHaveBeenCalled();
  });
});