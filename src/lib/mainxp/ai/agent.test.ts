// Agent layer tests (audit P1).
// 1) Exact wire shapes for both providers — pure, always run.
// 2) Full agent loop against the real DB with a scripted provider — proves
//    tool execution, caps, and message threading without an AI key.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { toAnthropicWire, toGeminiWire, type AgentMessage, type AIProvider, type AgentTurn } from "./provider";

const conversation: AgentMessage[] = [
  { role: "user", content: "Ajoute une mission : Appeler le notaire" },
  {
    role: "assistant",
    content: "Je vérifie la capacité.",
    toolCalls: [{ id: "toolu_1", name: "get_capacity", input: {} }],
  },
  { role: "tool", results: [{ id: "toolu_1", name: "get_capacity", output: '{"ok":true}' }] },
];

describe("provider wire formats", () => {
  it("maps the neutral shape to Anthropic content blocks exactly", () => {
    expect(toAnthropicWire(conversation)).toEqual([
      { role: "user", content: "Ajoute une mission : Appeler le notaire" },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Je vérifie la capacité." },
          { type: "tool_use", id: "toolu_1", name: "get_capacity", input: {} },
        ],
      },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "toolu_1", content: '{"ok":true}' }],
      },
    ]);
  });

  it("maps the neutral shape to Gemini contents exactly (functionResponse as user)", () => {
    expect(toGeminiWire(conversation)).toEqual([
      { role: "user", parts: [{ text: "Ajoute une mission : Appeler le notaire" }] },
      {
        role: "model",
        parts: [
          { text: "Je vérifie la capacité." },
          { functionCall: { name: "get_capacity", args: {} } },
        ],
      },
      {
        role: "user",
        parts: [{ functionResponse: { name: "get_capacity", response: { output: '{"ok":true}' } } }],
      },
    ]);
  });

  it("echoes Gemini thought signatures back on functionCall parts (400 without)", () => {
    const withSig: AgentMessage[] = [
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "get_goals", name: "get_goals", input: {}, signature: "sig123" }],
      },
    ];
    expect(toGeminiWire(withSig)).toEqual([
      {
        role: "model",
        parts: [{ functionCall: { name: "get_goals", args: {} }, thoughtSignature: "sig123" }],
      },
    ]);
    // Anthropic ignores the signature — its wire stays clean
    expect(toAnthropicWire(withSig)).toEqual([
      { role: "assistant", content: [{ type: "tool_use", id: "get_goals", name: "get_goals", input: {} }] },
    ]);
  });

  it("keeps plain turns plain", () => {
    const plain: AgentMessage[] = [
      { role: "user", content: "salut" },
      { role: "assistant", content: "salut !" },
    ];
    expect(toAnthropicWire(plain)).toEqual([
      { role: "user", content: "salut" },
      { role: "assistant", content: "salut !" },
    ]);
    expect(toGeminiWire(plain)).toEqual([
      { role: "user", parts: [{ text: "salut" }] },
      { role: "model", parts: [{ text: "salut !" }] },
    ]);
  });
});

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("agent loop end-to-end (scripted provider, real DB)", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let runCoachAgentLoop: typeof import("./coach").runCoachAgentLoop;
  let userId: string;
  let user: import("@/generated/prisma/client").MxUser;

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    ({ runCoachAgentLoop } = await import("./coach"));
    user = await prisma.mxUser.create({
      data: { email: `agent-loop-${Date.now()}@test.local`, passwordHash: "x", name: "Loop" },
    });
    userId = user.id;
  });
  afterAll(async () => {
    if (userId) await prisma.mxUser.delete({ where: { id: userId } });
  });

  it("executes create_task through the validated layer, then answers", async () => {
    // Scripted provider: round 1 calls the tool, round 2 (after seeing the
    // result) speaks. Exactly how a real model behaves — minus the network.
    let sawToolResult = "";
    const scripted: AIProvider = {
      chat: async () => { throw new Error("unused"); },
      structuredExtract: async () => { throw new Error("unused"); },
      agentChat: async (_system, messages): Promise<AgentTurn> => {
        const last = messages[messages.length - 1];
        if (last.role === "tool") {
          sawToolResult = last.results[0].output;
          return { text: "Mission ajoutée : Appeler le notaire.", toolCalls: [], model: "scripted" };
        }
        return {
          text: "",
          toolCalls: [{ id: "c1", name: "create_task", input: { title: "Appeler le notaire", tier: "DAILY_MISSION" } }],
          model: "scripted",
        };
      },
    };

    const reply = await runCoachAgentLoop(scripted, user, "system", [
      { role: "user", content: "Ajoute une mission : appeler le notaire" },
    ]);

    expect(reply).toContain("Mission ajoutée");
    expect(JSON.parse(sawToolResult).ok).toBe(true);
    const task = await prisma.mxTask.findFirst({ where: { userId, title: "Appeler le notaire" } });
    expect(task).not.toBeNull();
    expect(task!.tier).toBe("DAILY_MISSION");
    expect(task!.status).toBe("OPEN"); // created ≠ completed: 0 XP
    const txCount = await prisma.mxXpTransaction.count({ where: { userId } });
    expect(txCount).toBe(0);
  });

  it("enforces the mission cap inside the tool (6th create reroutes to side quest)", async () => {
    const mk = (i: number): AIProvider => ({
      chat: async () => { throw new Error("unused"); },
      structuredExtract: async () => { throw new Error("unused"); },
      agentChat: async (_s, messages): Promise<AgentTurn> => {
        const last = messages[messages.length - 1];
        if (last.role === "tool") return { text: JSON.parse(last.results[0].output).data?.tier ?? "?", toolCalls: [], model: "s" };
        return { text: "", toolCalls: [{ id: "c", name: "create_task", input: { title: `Cap ${i}` } }], model: "s" };
      },
    });
    // 4 more missions (one exists from the previous test) → cap of 5 reached
    for (let i = 1; i <= 4; i++) {
      await runCoachAgentLoop(mk(i), user, "system", [{ role: "user", content: "add" }]);
    }
    const sixth = await runCoachAgentLoop(mk(6), user, "system", [{ role: "user", content: "add" }]);
    expect(sixth).toBe("SIDE_QUEST");
    const missions = await prisma.mxTask.count({ where: { userId, tier: "DAILY_MISSION" } });
    expect(missions).toBe(5);
  });

  it("returns unknown tools and bad input as honest data, not crashes", async () => {
    const bad: AIProvider = {
      chat: async () => { throw new Error("unused"); },
      structuredExtract: async () => { throw new Error("unused"); },
      agentChat: async (_s, messages): Promise<AgentTurn> => {
        const last = messages[messages.length - 1];
        if (last.role === "tool") return { text: last.results.map((r) => r.output).join("|"), toolCalls: [], model: "s" };
        return {
          text: "",
          toolCalls: [
            { id: "a", name: "drop_database", input: {} },
            { id: "b", name: "create_task", input: { title: "" } },
          ],
          model: "s",
        };
      },
    };
    const reply = await runCoachAgentLoop(bad, user, "system", [{ role: "user", content: "x" }]);
    expect(reply).toContain('"ok":false');
    expect(reply).toContain("outil inconnu");
  });
});
