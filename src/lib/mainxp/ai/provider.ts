// AIProvider abstraction (docs/AI_ARCHITECTURE.md). Server-side only — keys
// never reach the client. When no provider is configured, getAIProvider()
// returns null and every AI surface renders an honest "coach offline" state.
//
// Memory does NOT live in the provider: conversations, coach memories and all
// context are stored in MAINXP's own database and assembled per request
// (src/lib/mainxp/ai/coach.ts) — providers are stateless and swappable.

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
  /** Coach conversation. */
  chat(req: ChatRequest): Promise<ChatResult>;
  /** One-shot structured extraction (Brain Dump, receipts). Returns raw model text. */
  structuredExtract(instruction: string, input: string): Promise<string>;
}

/**
 * Overload/rate-limit resilience: free tiers (Gemini 429/503, Anthropic 429/529)
 * fail transiently under load — verified live. Retry with short backoff before
 * surfacing an error to the user.
 */
const RETRYABLE = new Set([429, 500, 503, 529]);

async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let lastRes: Response | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1500 * 2 ** (attempt - 1)));
    const res = await fetch(url, init);
    if (res.ok || !RETRYABLE.has(res.status)) return res;
    lastRes = res;
  }
  return lastRes!;
}

// ── Anthropic ──

class AnthropicProvider implements AIProvider {
  constructor(
    private apiKey: string,
    private model = process.env.MAINXP_AI_MODEL || "claude-sonnet-5"
  ) {}

  async structuredExtract(instruction: string, input: string): Promise<string> {
    const result = await this.chat({
      system: instruction,
      messages: [{ role: "user", content: input }],
      maxTokens: 1200,
    });
    return result.text;
  }

  async chat(req: ChatRequest): Promise<ChatResult> {
    const res = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
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

// ── Gemini ──
// Uses the Gemini API host, which accepts both AI Studio ("AIza…") and Vertex
// Express ("AQ.…") keys — verified live. Default model is the stable
// `gemini-flash-latest` alias (fixed model names age out for new users).

class GeminiProvider implements AIProvider {
  constructor(
    private apiKey: string,
    private model = process.env.MAINXP_AI_MODEL || "gemini-flash-latest"
  ) {}

  private endpoint(): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
  }

  async structuredExtract(instruction: string, input: string): Promise<string> {
    const result = await this.chat({
      system: instruction,
      messages: [{ role: "user", content: input }],
      maxTokens: 1200,
    });
    return result.text;
  }

  async chat(req: ChatRequest): Promise<ChatResult> {
    const res = await fetchWithRetry(this.endpoint(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: req.messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        // Gemini flash models are thinking models: internal reasoning consumes
        // output budget before any text. Keep generous headroom so small
        // caller budgets never yield empty replies (verified live).
        generationConfig: { maxOutputTokens: Math.max(req.maxTokens ?? 1024, 2048) },
      }),
    });
    if (!res.ok) {
      throw new Error(`AI provider error ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("");
    if (!text) throw new Error("AI provider error: empty Gemini response");
    return {
      text,
      model: this.model,
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}

/**
 * Provider selection: Anthropic key wins when both are set, then Gemini.
 * Null when neither is configured — callers must handle it honestly.
 */
export function getAIProvider(): AIProvider | null {
  const anthropicKey = process.env.MAINXP_ANTHROPIC_API_KEY;
  if (anthropicKey) return new AnthropicProvider(anthropicKey);
  const geminiKey = process.env.MAINXP_GEMINI_API_KEY;
  if (geminiKey) return new GeminiProvider(geminiKey);
  return null;
}
