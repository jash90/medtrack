import { useCallback, useEffect, useState } from "react";
import { useLLM, QWEN3_1_7B_QUANTIZED } from "react-native-executorch";
import type { Message } from "react-native-executorch";

const SYSTEM_PROMPT = `Usuń z tekstu WSZYSTKIE dane osobowe. Zastąp je placeholderami:
- Imiona i nazwiska → [PACJENT] lub [LEKARZ] lub [DIAGNOSTA]
- PESEL (11 cyfr) → [PESEL]
- Adresy (ul., al., os., kod pocztowy) → [ADRES]
- Telefony → [TELEFON]
- Email → [EMAIL]
- Data urodzenia → [DATA_URODZENIA]
- Nazwy płatników/oddziałów → [PLATNIK]/[ODDZIAL]
- Numery identyfikacyjne (Nr + cyfry) → [NUMER]

NIE zmieniaj:
- Nazw parametrów medycznych (Hemoglobina, CRP, Glukoza itp.)
- Wartości liczbowych parametrów
- Jednostek (mg/dl, mmol/L, U/l itp.)
- Zakresów referencyjnych
- Nazw laboratoriów
- Dat pobrania/wykonania badania

Zwróć TYLKO zredagowany tekst, bez komentarzy. /no_think`;

export function useRodoRedactor() {
  const llm = useLLM({ model: QWEN3_1_7B_QUANTIZED });
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    if (llm.isReady && !configured) {
      llm.configure({
        chatConfig: {
          systemPrompt: SYSTEM_PROMPT,
          contextWindowLength: 4,
        },
        generationConfig: {
          temperature: 0.1,
        },
      });
      setConfigured(true);
    }
  }, [llm.isReady, configured]);

  const redact = useCallback(
    async (text: string): Promise<string> => {
      if (!llm.isReady) {
        console.warn("[RODO] LLM not ready, returning original text");
        return text;
      }

      try {
        const messages: Message[] = [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Zredaguj dane osobowe w poniższym tekście OCR wyników badań:\n\n${text}`,
          },
        ];

        const response = await llm.generate(messages);

        if (!response || !response.trim()) {
          console.warn("[RODO] Empty LLM response, returning original text");
          return text;
        }

        return response.trim();
      } catch (e: any) {
        console.error("[RODO] LLM redaction failed:", e.message);
        return text;
      }
    },
    [llm]
  );

  return {
    redact,
    isReady: llm.isReady && configured,
    downloadProgress: llm.downloadProgress,
    error: llm.error,
  };
}
