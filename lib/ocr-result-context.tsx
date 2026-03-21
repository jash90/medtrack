import { createContext, useContext, useState, useCallback } from "react";
import type { ParsedLabResult } from "@medtrack/utils";

interface OcrResultContextValue {
  parsedResult: ParsedLabResult | null;
  imageUri: string | null;
  setParsedResult: (result: ParsedLabResult, uri: string) => void;
  clear: () => void;
}

const OcrResultContext = createContext<OcrResultContextValue>({
  parsedResult: null,
  imageUri: null,
  setParsedResult: () => {},
  clear: () => {},
});

export function OcrResultProvider({ children }: { children: React.ReactNode }) {
  const [parsedResult, setParsed] = useState<ParsedLabResult | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const setParsedResult = useCallback(
    (result: ParsedLabResult, uri: string) => {
      setParsed(result);
      setImageUri(uri);
    },
    []
  );

  const clear = useCallback(() => {
    setParsed(null);
    setImageUri(null);
  }, []);

  return (
    <OcrResultContext.Provider
      value={{ parsedResult, imageUri, setParsedResult, clear }}
    >
      {children}
    </OcrResultContext.Provider>
  );
}

export function useOcrResult() {
  return useContext(OcrResultContext);
}
