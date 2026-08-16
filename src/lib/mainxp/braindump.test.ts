import { describe, expect, it } from "vitest";
import { decodeProposals, encodeProposals, parseDumpReply } from "./braindump";

describe("Brain Dump parsing (defensive)", () => {
  it("parses a clean JSON array", () => {
    const out = parseDumpReply(
      '[{"kind":"task","title":"Appeler Paul"},{"kind":"idea","title":"Club de course","detail":"dimanche matin"}]'
    );
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ kind: "task", title: "Appeler Paul" });
    expect(out[1].detail).toBe("dimanche matin");
  });

  it("tolerates fenced code blocks and surrounding prose", () => {
    const out = parseDumpReply('Voici :\n```json\n[{"kind":"journal","title":"Stress loyer"}]\n```');
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("journal");
  });

  it("drops malformed entries, unknown kinds, and caps at 8", () => {
    const many = JSON.stringify(
      Array.from({ length: 12 }, (_, i) => ({ kind: "task", title: `T${i}` })).concat([
        { kind: "hack", title: "nope" },
        { kind: "task", title: "" },
      ] as never)
    );
    const out = parseDumpReply(many);
    expect(out).toHaveLength(8);
    expect(out.every((p) => p.kind === "task" && p.title)).toBe(true);
  });

  it("returns [] on garbage", () => {
    expect(parseDumpReply("pas de json ici")).toEqual([]);
    expect(parseDumpReply("[{broken")).toEqual([]);
  });

  it("round-trips through the confirm encoding", () => {
    const proposals = [{ kind: "reminder" as const, title: "Appeler Paul demain" }];
    expect(decodeProposals(encodeProposals(proposals))).toEqual(proposals);
    expect(decodeProposals("not-base64!!")).toEqual([]);
  });
});
