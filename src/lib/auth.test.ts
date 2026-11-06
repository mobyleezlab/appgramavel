import { describe, it, expect } from "vitest";
import { getSafeRedirect } from "./auth";

describe("getSafeRedirect", () => {
  it("aceita caminhos internos", () => {
    expect(getSafeRedirect("/map")).toBe("/map");
    expect(getSafeRedirect("/estabelecimento/mini-mundo?x=1")).toBe("/estabelecimento/mini-mundo?x=1");
  });

  it("rejeita URLs externas e protocol-relative", () => {
    expect(getSafeRedirect("https://evil.com")).toBe("/");
    expect(getSafeRedirect("//evil.com")).toBe("/");
    expect(getSafeRedirect("/\\evil.com")).toBe("/");
    expect(getSafeRedirect("/redir?next=https://evil.com")).toBe("/");
  });

  it("rejeita rotas de admin", () => {
    expect(getSafeRedirect("/admin")).toBe("/");
    expect(getSafeRedirect("/admin/users")).toBe("/");
  });

  it("retorna / para vazio ou inválido", () => {
    expect(getSafeRedirect(null)).toBe("/");
    expect(getSafeRedirect("")).toBe("/");
    expect(getSafeRedirect("map")).toBe("/");
  });
});
