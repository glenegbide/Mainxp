import { afterEach, describe, expect, it } from "vitest";
import { getAIProvider } from "./provider";

const reset = () => {
  delete process.env.MAINXP_ANTHROPIC_API_KEY;
  delete process.env.MAINXP_GEMINI_API_KEY;
};
afterEach(reset);

describe("AI provider selection (memory lives in OUR database either way)", () => {
  it("is honestly null with no key", () => {
    reset();
    expect(getAIProvider()).toBeNull();
  });

  it("uses Gemini when only a Gemini key exists", () => {
    reset();
    process.env.MAINXP_GEMINI_API_KEY = "AQ.test";
    expect(getAIProvider()?.constructor.name).toBe("GeminiProvider");
  });

  it("prefers Anthropic when both keys are set", () => {
    reset();
    process.env.MAINXP_GEMINI_API_KEY = "AIzaTest";
    process.env.MAINXP_ANTHROPIC_API_KEY = "sk-ant-test";
    expect(getAIProvider()?.constructor.name).toBe("AnthropicProvider");
  });

  it("lets the user's in-app key beat env, routed by key shape", () => {
    reset();
    process.env.MAINXP_ANTHROPIC_API_KEY = "sk-ant-env";
    expect(getAIProvider("AIzaUser")?.constructor.name).toBe("GeminiProvider");
    expect(getAIProvider("AQ.user")?.constructor.name).toBe("GeminiProvider");
    expect(getAIProvider("sk-ant-user")?.constructor.name).toBe("AnthropicProvider");
    // no user key → env still applies
    expect(getAIProvider(null)?.constructor.name).toBe("AnthropicProvider");
  });
});
