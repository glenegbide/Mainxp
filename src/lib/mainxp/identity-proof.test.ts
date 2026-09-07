import { describe, expect, it } from "vitest";
import { proofSentence, proofStage, selfTrustVerdict } from "./identity-proof";

describe("proofStage — the voice strengthens only with the evidence", () => {
  it("nothing recorded stays at the beginning", () => {
    expect(proofStage(0, 0)).toBe("debut");
    expect(proofStage(0, 5)).toBe("debut");
  });

  it("thin history is « building proof », never « you ARE »", () => {
    expect(proofStage(1, 1)).toBe("preuve");
    expect(proofStage(2, 3)).toBe("preuve");
  });

  it("half of at least four observed weeks becomes a pattern", () => {
    expect(proofStage(3, 4)).toBe("pattern");
    expect(proofStage(5, 9)).toBe("pattern");
    expect(proofStage(3, 8)).toBe("preuve"); // under half — still proof
  });

  it("eight of ten-plus weeks speaks as identity", () => {
    expect(proofStage(8, 10)).toBe("identite");
    expect(proofStage(11, 12)).toBe("identite");
    expect(proofStage(7, 12)).toBe("pattern"); // one short — still a pattern
  });

  it("each stage has its own sentence", () => {
    expect(proofSentence("debut", 0, 0)).toContain("première semaine");
    expect(proofSentence("preuve", 2, 3)).toContain("construis la preuve");
    expect(proofSentence("pattern", 4, 6)).toContain("pattern");
    expect(proofSentence("identite", 9, 12)).toContain("devenir toi");
  });
});

describe("selfTrustVerdict — promises kept, honestly counted", () => {
  it("counts kept vs total, no trend from thin air", () => {
    expect(selfTrustVerdict([true, false, true])).toEqual({ kept: 2, total: 3, trend: null });
    expect(selfTrustVerdict([])).toEqual({ kept: 0, total: 0, trend: null });
  });

  it("recent improvement reads as building", () => {
    expect(selfTrustVerdict([false, false, false, true, true, true]).trend).toBe("building");
  });

  it("recent slipping reads as rebuilding — never shame", () => {
    expect(selfTrustVerdict([true, true, true, false, false, false]).trend).toBe("rebuilding");
  });

  it("consistency reads as steady", () => {
    expect(selfTrustVerdict([true, true, false, true, true, false]).trend).toBe("steady");
  });
});
