"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";

const SYSTEM_PROMPT = `Jesteś ekspertem od wyników badań laboratoryjnych. Otrzymasz surowy tekst wyodrębniony z dokumentu laboratoryjnego za pomocą OCR.

Twoim zadaniem jest wyodrębnić:
1. **labName** — nazwa laboratorium (jeśli widoczna)
2. **collectionDate** — data pobrania próbki w formacie YYYY-MM-DD
3. **parameters** — tablica parametrów, gdzie każdy zawiera:
   - **name** — pełna nazwa parametru (np. "Hemoglobina", "CRP - met. ilościowa")
   - **value** — wartość liczbowa (użyj kropki jako separatora dziesiętnego)
   - **unit** — prawidłowa jednostka (np. "mg/dl", "µg/dl", "mmol/L", "U/l", "g/dl")
   - **referenceMin** — dolna granica normy (jeśli podana)
   - **referenceMax** — górna granica normy (jeśli podana)

Zasady:
- Popraw błędy OCR w nazwach parametrów i jednostkach (np. "mgldl" → "mg/dl", "ugldl" → "µg/dl")
- Ignoruj nagłówki sekcji (np. "BIOCHEMIA", "Lipidogram", "Próby wątrobowe")
- Ignoruj metadane pacjenta, lekarza, numery stron
- Jeśli zakres referencyjny to pojedyncza wartość (np. "200"), interpretuj ją jako referenceMax
- Wartości z przecinkiem (np. "55,14") zamień na kropkę (55.14)
- Zwróć WYŁĄCZNIE obiekt JSON, bez dodatkowego tekstu ani komentarzy`;

interface ParsedParam {
  name: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
}

interface ParsedResult {
  labName?: string;
  collectionDate?: string;
  parameters: ParsedParam[];
}

export const parseOcrText = action({
  args: {
    rawText: v.string(),
  },
  handler: async (_ctx, args): Promise<ParsedResult> => {
    const apiKey = process.env.GLM_API_KEY;
    if (!apiKey) {
      throw new Error("Brak klucza GLM API (GLM_API_KEY)");
    }

    // Text arrives already redacted (RODO) from on-device LLM
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
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Wyodrębnij parametry z poniższego tekstu OCR wyników badań laboratoryjnych:\n\n${args.rawText}`,
            },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
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
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("GLM API zwróciło pustą odpowiedź");
    }

    try {
      const parsed: ParsedResult = JSON.parse(content);

      // Validate and clean
      return {
        labName: parsed.labName || undefined,
        collectionDate: parsed.collectionDate || undefined,
        parameters: (parsed.parameters ?? [])
          .filter(
            (p) =>
              p.name &&
              typeof p.value === "number" &&
              !isNaN(p.value) &&
              p.unit
          )
          .map((p) => ({
            name: p.name.trim(),
            value: p.value,
            unit: p.unit.trim(),
            ...(p.referenceMin != null ? { referenceMin: p.referenceMin } : {}),
            ...(p.referenceMax != null ? { referenceMax: p.referenceMax } : {}),
          })),
      };
    } catch {
      throw new Error(
        `Nie udało się sparsować odpowiedzi GLM: ${content.slice(0, 200)}`
      );
    }
  },
});
