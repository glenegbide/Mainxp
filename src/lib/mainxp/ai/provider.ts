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
  let waitMs = 0;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, waitMs));
    const res = await fetch(url, init);
    if (res.ok || !RETRYABLE.has(res.status)) return res;
    lastRes = res;
    // Free tiers name their own comeback delay — Gemini in the error body
    // ("Please retry in 7.9s"), others in a Retry-After header. Honor it up to
    // 20s so a quota blip one retry away doesn't surface as an error.
    let hinted = Number(res.headers.get("retry-after"));
    if (!Number.isFinite(hinted) || hinted <= 0) {
      const body = await res.clone().text().catch(() => "");
      hinted = Number(/retry in (\d+(?:\.\d+)?)s/i.exec(body)?.[1]);
    }
    waitMs =
      Number.isFinite(hinted) && hinted > 0
        ? Math.min(hinted * 1000 + 500, 20000)
        : 1500 * 2 ** attempt;
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

/** Anthropic keys are self-identifying ("sk-ant-…"); everything else is Gemini
 * (AI Studio "AIza…" and Vertex Express "AQ.…" both work on the Gemini host). */
export function providerForKey(key: string): AIProvider {
  return key.startsWith("sk-ant-") ? new AnthropicProvider(key) : new GeminiProvider(key);
}

/** Human name for the provider a key belongs to — for settings UI only. */
export function providerNameForKey(key: string): string {
  return key.startsWith("sk-ant-") ? "Claude (Anthropic)" : "Gemini (Google)";
}

/**
 * Provider selection: the user's own in-app key wins (no server config needed),
 * then env — Anthropic first, then Gemini.
 * Null when nothing is configured — callers must handle it honestly.
 */
export function getAIProvider(userKey?: string | null): AIProvider | null {
  if (userKey) return providerForKey(userKey);
  const anthropicKey = process.env.MAINXP_ANTHROPIC_API_KEY;
  if (anthropicKey) return new AnthropicProvider(anthropicKey);
  const geminiKey = process.env.MAINXP_GEMINI_API_KEY;
  if (geminiKey) return new GeminiProvider(geminiKey);
  return null;
}
