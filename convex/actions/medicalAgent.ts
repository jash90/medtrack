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
- Bądź zwięzły ale dokładny

Masz dostęp do narzędzi, które pozwalają pobierać dane medyczne pacjenta. Używaj ich gdy potrzebujesz informacji do odpowiedzi.`;

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

    // 1. Get current user
    const user = await ctx.runQuery(internal.queries.users.getByAuthId, {});
    if (!user) {
      throw new Error("Nie jesteś zalogowany");
    }

    // 2. Load conversation history
    const history = await ctx.runQuery(internal.queries.chat.listMessages, {
      userId: user._id,
      conversationId: args.conversationId,
      limit: 20,
    });

    // 3. Build messages array
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // History is desc order, reverse for chronological
    for (const msg of [...history].reverse()) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: "user", content: args.message });

    // 4. Tool-calling loop (max 5 iterations)
    const MAX_ITERATIONS = 5;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await fetch(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "glm-5",
            messages,
            tools: TOOLS,
            temperature: 0.3,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `GLM API HTTP ${response.status}: ${errorText.slice(0, 200)}`
        );
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice) {
        throw new Error("GLM API zwróciło pustą odpowiedź");
      }

      const assistantMessage = choice.message;

      // No tool calls — we have the final answer
      if (
        choice.finish_reason !== "tool_calls" ||
        !assistantMessage.tool_calls?.length
      ) {
        const content =
          assistantMessage.content ??
          "Przepraszam, nie udało mi się wygenerować odpowiedzi.";

        // 5. Save messages
        await ctx.runMutation(internal.mutations.chat.saveMessages, {
          userId: user._id,
          conversationId: args.conversationId,
          userMessage: args.message,
          assistantMessage: content,
        });

        return { content };
      }

      // Tool calls — execute them
      messages.push({
        role: "assistant",
        content: assistantMessage.content,
        tool_calls: assistantMessage.tool_calls,
      });

      for (const toolCall of assistantMessage.tool_calls as ToolCall[]) {
        const toolResult = await executeToolCall(ctx, toolCall);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    // Exceeded max iterations
    const fallback =
      "Przepraszam, potrzebowałem zbyt wielu kroków żeby odpowiedzieć na to pytanie. Spróbuj zadać bardziej konkretne pytanie.";
    await ctx.runMutation(internal.mutations.chat.saveMessages, {
      userId: user._id,
      conversationId: args.conversationId,
      userMessage: args.message,
      assistantMessage: fallback,
    });

    return { content: fallback };
  },
});

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
