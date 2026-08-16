import { describe, expect, it } from "vitest";
import { focusBlocks } from "./curve";

describe("focusBlocks (server-verified focus XP)", () => {
  it("counts whole 25-minute blocks actually elapsed", () => {
    expect(focusBlocks(25, 25)).toBe(1);
    expect(focusBlocks(50, 50)).toBe(2);
    expect(focusBlocks(90, 90)).toBe(3);
  });

  it("gives nothing for sessions under one block — ending early is honest", () => {
    expect(focusBlocks(25, 0)).toBe(0);
    expect(focusBlocks(25, 24)).toBe(0);
    expect(focusBlocks(90, 20)).toBe(0);
  });

  it("caps at the planned duration — leaving the timer running earns nothing extra", () => {
    expect(focusBlocks(25, 500)).toBe(1);
    expect(focusBlocks(50, 300)).toBe(2);
  });

  it("never returns negative blocks", () => {
    expect(focusBlocks(25, -10)).toBe(0);
  });
});
