import { describe, expect, it } from "vitest";
import { isFrameworkSignal } from "./index";

describe("isFrameworkSignal", () => {
  it("recognises the control-flow errors Next.js throws", () => {
    expect(
      isFrameworkSignal(Object.assign(new Error(), { digest: "NEXT_REDIRECT;replace;/login" })),
    ).toBe(true);
    expect(isFrameworkSignal(Object.assign(new Error(), { digest: "DYNAMIC_SERVER_USAGE" }))).toBe(
      true,
    );
    expect(isFrameworkSignal(Object.assign(new Error(), { digest: "NEXT_NOT_FOUND" }))).toBe(true);
  });

  it("leaves genuine failures to be handled as provider errors", () => {
    expect(isFrameworkSignal(new Error("fetch failed"))).toBe(false);
    expect(isFrameworkSignal(Object.assign(new Error(), { digest: 42 }))).toBe(false);
    expect(isFrameworkSignal(null)).toBe(false);
    expect(isFrameworkSignal("boom")).toBe(false);
  });
});
