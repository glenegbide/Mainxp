// AIProvider abstraction (docs/AI_ARCHITECTURE.md). Server-side only — the key
// never reaches the client. When no key is configured, getAIProvider() returns
// null and every AI surface renders an honest "coach offline" state (Part 72:
// nothing is faked).

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
}

export interface ChatResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AIProvider {
  /** Coach conversation. Tool-use loop arrives in Phase 1. */
  chat(req: ChatRequest): Promise<ChatResult>;
  /** Brain Dump / receipt extraction, voice, embeddings: implemented in their phases. */
}

class AnthropicProvider implements AIProvider {
  constructor(
    private apiKey: string,
    private model = process.env.MAINXP_AI_MODEL || "claude-sonnet-5"
  ) {}

  async chat(req: ChatRequest): Promise<ChatResult> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens ?? 1024,
        system: req.system,
        messages: req.messages,
      }),
    });
    if (!res.ok) {
      throw new Error(`AI provider error ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
      model: string;
      usage: { input_tokens: number; output_tokens: number };
    };
    return {
      text: data.content
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join(""),
      model: data.model,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
    };
  }
}

/** Null when MAINXP_ANTHROPIC_API_KEY is not configured — callers must handle it. */
export function getAIProvider(): AIProvider | null {
  const key = process.env.MAINXP_ANTHROPIC_API_KEY;
  if (!key) return null;
  return new AnthropicProvider(key);
}
