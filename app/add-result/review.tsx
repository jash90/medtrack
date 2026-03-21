import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useOcrResult } from "@/lib/ocr-result-context";

interface EditableParameter {
  name: string;
  value: string;
  unit: string;
  referenceMin: string;
  referenceMax: string;
}

function computePreviewStatus(
  value: number,
  min?: number,
  max?: number
): { label: string; color: string; bg: string } {
  if (min === undefined && max === undefined)
    return { label: "Norma", color: "text-green-700", bg: "bg-green-100" };

  if (max !== undefined && value > max) {
    const overshoot = (value - max) / max;
    return overshoot > 0.2
      ? { label: "Krytyczny", color: "text-red-700", bg: "bg-red-100" }
      : { label: "Podwyższony", color: "text-amber-700", bg: "bg-amber-100" };
  }

  if (min !== undefined && value < min) {
    const undershoot = (min - value) / min;
    return undershoot > 0.2
      ? { label: "Krytyczny", color: "text-red-700", bg: "bg-red-100" }
      : { label: "Obniżony", color: "text-indigo-700", bg: "bg-indigo-100" };
  }

  return { label: "Norma", color: "text-green-700", bg: "bg-green-100" };
}

export default function ReviewScreen() {
  const router = useRouter();
  const { parsedResult, imageUri, clear } = useOcrResult();
  const saveResult = useMutation(api.mutations.results.saveScannedResult);
  const generateUploadUrl = useMutation(
    api.mutations.storage.generateUploadUrl
  );

  const [labName, setLabName] = useState("");
  const [collectionDate, setCollectionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [parameters, setParameters] = useState<EditableParameter[]>([]);
  const [saving, setSaving] = useState(false);

  // Initialize form from OCR data
  useEffect(() => {
    if (parsedResult) {
      setLabName(parsedResult.labName ?? "");
      setCollectionDate(
        parsedResult.collectionDate ??
          new Date().toISOString().slice(0, 10)
      );
      setParameters(
        parsedResult.parameters.map((p) => ({
          name: p.name ?? "",
          value: String(p.value ?? ""),
          unit: p.unit ?? "",
          referenceMin:
            p.referenceMin != null ? String(p.referenceMin) : "",
          referenceMax:
            p.referenceMax != null ? String(p.referenceMax) : "",
        }))
      );
    }
  }, [parsedResult]);

  // Redirect if no data
  useEffect(() => {
    if (!parsedResult) {
      router.back();
    }
  }, []);

  function addParameter() {
    setParameters([
      ...parameters,
      { name: "", value: "", unit: "", referenceMin: "", referenceMax: "" },
    ]);
  }

  function removeParameter(index: number) {
    setParameters(parameters.filter((_, i) => i !== index));
  }

  function updateParameter(
    index: number,
    field: keyof EditableParameter,
    value: string
  ) {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  }

  async function handleSave() {
    if (!labName.trim()) {
      Alert.alert("Błąd", "Podaj nazwę laboratorium");
      return;
    }
    if (!collectionDate.trim()) {
      Alert.alert("Błąd", "Podaj datę pobrania");
      return;
    }
    if (parameters.length === 0) {
      Alert.alert("Błąd", "Dodaj co najmniej jeden parametr");
      return;
    }

    const validParams = parameters.filter(
      (p) => p.name.trim() && p.value.trim() && p.unit.trim()
    );

    if (validParams.length === 0) {
      Alert.alert("Błąd", "Uzupełnij dane przynajmniej jednego parametru");
      return;
    }

    setSaving(true);
    try {
      // Optionally upload image for archival
      let fileId: string | undefined;
      if (imageUri) {
        try {
          const uploadUrl = await generateUploadUrl();
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": blob.type || "image/jpeg" },
            body: blob,
          });
          const data = await uploadResponse.json();
          fileId = data.storageId;
        } catch {
          // Image upload failure is non-critical — continue saving
        }
      }

      await saveResult({
        labName: labName.trim(),
        collectionDate: collectionDate.trim(),
        notes: notes.trim() || undefined,
        fileId: fileId as any,
        parameters: validParams.map((p) => ({
          name: p.name.trim(),
          value: parseFloat(p.value.replace(",", ".")),
          unit: p.unit.trim(),
          referenceMin: p.referenceMin
            ? parseFloat(p.referenceMin.replace(",", "."))
            : undefined,
          referenceMax: p.referenceMax
            ? parseFloat(p.referenceMax.replace(",", "."))
            : undefined,
        })),
      });

      clear();
      Alert.alert("Zapisano", "Wynik badania został dodany", [
        { text: "OK", onPress: () => router.dismissAll() },
      ]);
    } catch (e: any) {
      Alert.alert("Błąd", e.message ?? "Nie udało się zapisać wyniku");
    } finally {
      setSaving(false);
    }
  }

  if (!parsedResult) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-400">Ładowanie...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        {/* OCR info banner */}
        {parameters.length > 0 ? (
          <View className="bg-green-50 rounded-xl p-4 mb-4 border border-green-200">
            <Text className="text-sm text-green-800">
              Rozpoznano {parameters.length} parametrów. Sprawdź poprawność
              danych przed zapisaniem.
            </Text>
          </View>
        ) : (
          <View className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-200">
            <Text className="text-sm text-amber-800">
              Nie udało się automatycznie rozpoznać parametrów. Dodaj je ręcznie
              poniżej.
            </Text>
          </View>
        )}

        {/* Lab info */}
        <Text className="text-sm font-medium text-gray-700 mb-1">
          Laboratorium
        </Text>
        <TextInput
          className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-3 text-base"
          placeholder="Np. Diagnostyka, ALAB, Synevo"
          value={labName}
          onChangeText={setLabName}
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">
          Data pobrania
        </Text>
        <TextInput
          className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-3 text-base"
          placeholder="RRRR-MM-DD"
          value={collectionDate}
          onChangeText={setCollectionDate}
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">
          Notatki (opcjonalnie)
        </Text>
        <TextInput
          className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-6 text-base"
          placeholder="Dodatkowe informacje"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {/* Parameters */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold text-gray-900">
            Parametry ({parameters.length})
          </Text>
          <Pressable
            className="bg-primary-100 rounded-lg px-4 py-2"
            onPress={addParameter}
          >
            <Text className="text-primary-700 font-medium text-sm">
              + Dodaj
            </Text>
          </Pressable>
        </View>

        {parameters.map((param, i) => {
          const value = parseFloat(param.value.replace(",", "."));
          const min = param.referenceMin
            ? parseFloat(param.referenceMin.replace(",", "."))
            : undefined;
          const max = param.referenceMax
            ? parseFloat(param.referenceMax.replace(",", "."))
            : undefined;
          const status =
            !isNaN(value) && param.value
              ? computePreviewStatus(value, min, max)
              : null;

          return (
            <View
              key={i}
              className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
            >
              {/* Header with status and delete */}
              <View className="flex-row justify-between items-center mb-2">
                {status && (
                  <View className={`px-3 py-1 rounded-full ${status.bg}`}>
                    <Text
                      className={`text-xs font-medium ${status.color}`}
                    >
                      {status.label}
                    </Text>
                  </View>
                )}
                <Pressable onPress={() => removeParameter(i)} className="p-1">
                  <Text className="text-red-500 text-sm">Usuń</Text>
                </Pressable>
              </View>

              {/* Name */}
              <TextInput
                className="border border-gray-200 rounded-lg px-3 py-2 mb-2 text-sm"
                placeholder="Nazwa parametru"
                value={param.name}
                onChangeText={(v) => updateParameter(i, "name", v)}
              />

              {/* Value + Unit */}
              <View className="flex-row gap-2 mb-2">
                <TextInput
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Wartość"
                  value={param.value}
                  onChangeText={(v) => updateParameter(i, "value", v)}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Jedn."
                  value={param.unit}
                  onChangeText={(v) => updateParameter(i, "unit", v)}
                />
              </View>

              {/* Reference range */}
              <View className="flex-row gap-2 items-center">
                <Text className="text-xs text-gray-400 w-12">Norma:</Text>
                <TextInput
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Min"
                  value={param.referenceMin}
                  onChangeText={(v) => updateParameter(i, "referenceMin", v)}
                  keyboardType="decimal-pad"
                />
                <Text className="text-gray-400">–</Text>
                <TextInput
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Max"
                  value={param.referenceMax}
                  onChangeText={(v) => updateParameter(i, "referenceMax", v)}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          );
        })}

        {/* Save */}
        <Pressable
          className={`rounded-xl py-4 items-center mt-4 ${saving ? "bg-primary-400" : "bg-primary-600"}`}
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-white font-semibold text-base">
            {saving ? "Zapisywanie..." : "Zapisz wynik"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
