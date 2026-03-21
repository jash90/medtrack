"use node";

import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";

const SYSTEM_PROMPT = `Jesteś MedTrack Asystentem — pomocnym asystentem medycznym dla pacjentów. Odpowiadasz ZAWSZE po polsku.

Twoja rola:
- Pomagasz pacjentom zrozumieć ich wyniki badań laboratoryjnych
- Wyjaśniasz parametry prostym, zrozumiałym językiem
- Podajesz wartości, jednostki i zakresy referencyjne
- Analizujesz trendy w wynikach
- Informujesz o alertach i przypomnieniach o badaniach

WAŻNE ZASADY:
- NIE jesteś lekarzem i NIGDY nie diagnozujesz chorób
- NIGDY nie przepisujesz leków ani nie sugerujesz leczenia
- Przy wartościach krytycznych lub znacznie poza normą ZAWSZE sugeruj konsultację z lekarzem
- Używaj prostego języka, unikaj żargonu medycznego
- Jeśli nie masz wystarczających danych, powiedz o tym wprost
- Bądź zwięzły ale dokładny`;

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "getUserProfile",
      description:
        "Pobiera profil aktualnie zalogowanego pacjenta (imię, data urodzenia, segment medyczny)",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getRecentResults",
      description:
        "Pobiera ostatnie wyniki badań laboratoryjnych pacjenta (domyślnie 5)",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Ile ostatnich wyników pobrać (domyślnie 5)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getResultDetails",
      description:
        "Pobiera szczegóły konkretnego wyniku badania wraz z listą parametrów, wartościami i zakresami referencyjnymi",
      parameters: {
        type: "object",
        properties: {
          resultId: {
            type: "string",
            description: "ID wyniku badania",
          },
        },
        required: ["resultId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getAllResults",
      description: "Pobiera wszystkie wyniki badań laboratoryjnych pacjenta",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getParameterTrends",
      description:
        "Pobiera historię wartości konkretnego parametru (np. Hemoglobina, CRP) w czasie — do analizy trendów",
      parameters: {
        type: "object",
        properties: {
          parameterName: {
            type: "string",
            description:
              "Dokładna nazwa parametru (np. 'Hemoglobina', 'CRP - met. ilościowa')",
          },
        },
        required: ["parameterName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getDistinctParameters",
      description:
        "Pobiera listę wszystkich dostępnych nazw parametrów badań pacjenta — użyj zanim wywołasz getParameterTrends żeby znać dokładne nazwy",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getUnreadAlerts",
      description:
        "Pobiera nieprzeczytane alerty o nieprawidłowych wartościach parametrów",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getUpcomingReminders",
      description:
        "Pobiera nadchodzące przypomnienia o badaniach do wykonania",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Ile przypomnień pobrać (domyślnie 10)",
          },
        },
        required: [],
      },
    },
  },
];

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

// Min ms between DB writes during streaming
const STREAM_DB_INTERVAL = 100;
// Chunk size for simulated streaming fallback
const SIM_CHUNK = 20;
const SIM_DELAY = 40;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callGlm(
  apiKey: string,
  messages: ChatMessage[],
  options: { tools?: typeof TOOLS; stream?: boolean } = {}
) {
  return fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "glm-5",
      messages,
      temperature: 0.3,
      ...(options.tools ? { tools: options.tools } : {}),
      ...(options.stream ? { stream: true } : {}),
    }),
  });
}

export const chat = action({
  args: {
    conversationId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args): Promise<{ content: string }> => {
    const apiKey = process.env.GLM_API_KEY;
    if (!apiKey) {
      throw new Error("Brak klucza GLM API (GLM_API_KEY)");
    }

    const user = await ctx.runQuery(internal.queries.users.getByAuthId, {});
    if (!user) throw new Error("Nie jesteś zalogowany");

    const history = await ctx.runQuery(internal.queries.chat.listMessages, {
      userId: user._id,
      conversationId: args.conversationId,
      limit: 20,
    });

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];
    for (const msg of [...history].reverse()) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: "user", content: args.message });

    // Save user message + create streaming placeholder
    await ctx.runMutation(internal.mutations.chat.saveUserMessage, {
      userId: user._id,
      conversationId: args.conversationId,
      content: args.message,
    });
    const streamingMsgId = await ctx.runMutation(
      internal.mutations.chat.createStreamingMessage,
      { userId: user._id, conversationId: args.conversationId }
    );

    // ── Tool-calling loop (non-streaming) ──
    const MAX_ITERATIONS = 5;
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await callGlm(apiKey, messages, { tools: TOOLS });

      if (!response.ok) {
        const err = await response.text();
        await finishStream(ctx, streamingMsgId, "Przepraszam, wystąpił błąd. Spróbuj ponownie.");
        throw new Error(`GLM API HTTP ${response.status}: ${err.slice(0, 200)}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      if (!choice) {
        return { content: await finishStream(ctx, streamingMsgId, "Przepraszam, nie udało mi się wygenerować odpowiedzi.") };
      }

      const msg = choice.message;

      // ── Final answer (no tool calls) ──
      if (choice.finish_reason !== "tool_calls" || !msg.tool_calls?.length) {
        // Try real SSE streaming for the final response
        const content = await streamFinalAnswer(ctx, apiKey, messages, streamingMsgId);
        return { content };
      }

      // ── Tool calls → execute ──
      messages.push({
        role: "assistant",
        content: msg.content,
        tool_calls: msg.tool_calls,
      });

      await ctx.runMutation(internal.mutations.chat.updateStreamingContent, {
        messageId: streamingMsgId,
        content: "Analizuję dane...",
        isStreaming: true,
      });

      for (const tc of msg.tool_calls as ToolCall[]) {
        const result = await executeToolCall(ctx, tc);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    return { content: await finishStream(ctx, streamingMsgId, "Przepraszam, potrzebowałem zbyt wielu kroków. Spróbuj bardziej konkretne pytanie.") };
  },
});

/** Mark streaming message as done with given content. */
async function finishStream(ctx: any, msgId: any, content: string): Promise<string> {
  await ctx.runMutation(internal.mutations.chat.updateStreamingContent, {
    messageId: msgId,
    content,
    isStreaming: false,
  });
  return content;
}

/**
 * Streams the final answer. Tries SSE stream first;
 * falls back to simulated streaming if body isn't readable.
 */
async function streamFinalAnswer(
  ctx: any,
  apiKey: string,
  messages: ChatMessage[],
  streamingMsgId: any
): Promise<string> {
  // Try streaming request
  const response = await callGlm(apiKey, messages, { stream: true });

  if (!response.ok) {
    return finishStream(ctx, streamingMsgId, "Przepraszam, wystąpił błąd podczas generowania odpowiedzi.");
  }

  // Try to consume as SSE stream
  const body = response.body;
  if (body && typeof (body as any)[Symbol.asyncIterator] === "function") {
    // Node.js async iterable (works in Convex runtime)
    return await consumeAsyncIterable(ctx, body as any, streamingMsgId);
  }

  if (body && typeof (body as any).getReader === "function") {
    // Web ReadableStream fallback
    return await consumeReadableStream(ctx, body, streamingMsgId);
  }

  // No streaming support → get full text and simulate
  const fullText = await response.text();
  const content = extractContentFromSSE(fullText);
  return await simulateStream(ctx, streamingMsgId, content);
}

/** Parse SSE content from full response text (fallback). */
function extractContentFromSSE(text: string): string {
  let content = "";
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const jsonStr = trimmed.slice(5).trim();
    if (jsonStr === "[DONE]") continue;
    try {
      const parsed = JSON.parse(jsonStr);
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) content += delta;
    } catch { /* skip */ }
  }
  return content || "Przepraszam, nie udało mi się wygenerować odpowiedzi.";
}

/** Consume body as Node.js async iterable (most reliable in Convex). */
async function consumeAsyncIterable(
  ctx: any,
  body: AsyncIterable<Uint8Array>,
  msgId: any
): Promise<string> {
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";
  let lastWrite = 0;

  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          accumulated += delta;
          const now = Date.now();
          if (now - lastWrite >= STREAM_DB_INTERVAL) {
            lastWrite = now;
            await ctx.runMutation(internal.mutations.chat.updateStreamingContent, {
              messageId: msgId,
              content: accumulated,
              isStreaming: true,
            });
          }
        }
      } catch { /* skip */ }
    }
  }

  return finishStream(ctx, msgId, accumulated || "Przepraszam, nie udało mi się wygenerować odpowiedzi.");
}

/** Consume body via Web ReadableStream getReader(). */
async function consumeReadableStream(
  ctx: any,
  body: ReadableStream<Uint8Array>,
  msgId: any
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";
  let lastWrite = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            accumulated += delta;
            const now = Date.now();
            if (now - lastWrite >= STREAM_DB_INTERVAL) {
              lastWrite = now;
              await ctx.runMutation(internal.mutations.chat.updateStreamingContent, {
                messageId: msgId,
                content: accumulated,
                isStreaming: true,
              });
            }
          }
        } catch { /* skip */ }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return finishStream(ctx, msgId, accumulated || "Przepraszam, nie udało mi się wygenerować odpowiedzi.");
}

/** Simulated streaming — reveals text chunk by chunk when real SSE isn't available. */
async function simulateStream(
  ctx: any,
  msgId: any,
  fullContent: string
): Promise<string> {
  let pos = 0;
  while (pos < fullContent.length) {
    pos = Math.min(pos + SIM_CHUNK, fullContent.length);
    const isDone = pos >= fullContent.length;
    await ctx.runMutation(internal.mutations.chat.updateStreamingContent, {
      messageId: msgId,
      content: fullContent.slice(0, pos),
      isStreaming: !isDone,
    });
    if (!isDone) await sleep(SIM_DELAY);
  }
  return fullContent;
}

async function executeToolCall(
  ctx: any,
  toolCall: ToolCall
): Promise<unknown> {
  const { name, arguments: argsStr } = toolCall.function;
  let parsedArgs: Record<string, unknown> = {};

  try {
    parsedArgs = JSON.parse(argsStr || "{}");
  } catch {
    return { error: "Nieprawidłowe argumenty narzędzia" };
  }

  try {
    switch (name) {
      case "getUserProfile":
        return await ctx.runQuery(api.queries.users.getCurrent, {});

      case "getRecentResults":
        return await ctx.runQuery(api.queries.results.listRecent, {
          limit: (parsedArgs.limit as number) ?? 5,
        });

      case "getResultDetails":
        return await ctx.runQuery(api.queries.results.getById, {
          resultId: parsedArgs.resultId as string,
        });

      case "getAllResults":
        return await ctx.runQuery(api.queries.results.list, {});

      case "getParameterTrends":
        return await ctx.runQuery(
          api.queries.parameters.listByNameForTrends,
          { parameterName: parsedArgs.parameterName as string }
        );

      case "getDistinctParameters":
        return await ctx.runQuery(
          api.queries.parameters.listDistinctNames,
          {}
        );

      case "getUnreadAlerts":
        return await ctx.runQuery(api.queries.alerts.listUnread, {});

      case "getUpcomingReminders":
        return await ctx.runQuery(api.queries.reminders.listUpcoming, {
          limit: (parsedArgs.limit as number) ?? 10,
        });

      default:
        return { error: `Nieznane narzędzie: ${name}` };
    }
  } catch (e: any) {
    return { error: e.message ?? "Błąd wykonania narzędzia" };
  }
}
