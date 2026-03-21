import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Id } from "@convex/_generated/dataModel";

const statusColors = {
  normal: { bg: "bg-green-100", text: "text-green-700", label: "Norma" },
  elevated: { bg: "bg-amber-100", text: "text-amber-700", label: "Podwyższony" },
  low: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Obniżony" },
  critical: { bg: "bg-red-100", text: "text-red-700", label: "Krytyczny" },
};

export default function ResultDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const result = useQuery(api.queries.results.getById, {
    resultId: id as Id<"labResults">,
  });
  const removeResult = useMutation(api.mutations.results.remove);

  if (result === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-400">Ładowanie...</Text>
      </View>
    );
  }

  if (result === null) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          Wynik nie został znaleziony
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text className="text-primary-600 font-medium">Wróć</Text>
        </Pressable>
      </View>
    );
  }

  function handleDelete() {
    Alert.alert(
      "Usuń wynik",
      "Czy na pewno chcesz usunąć ten wynik? Tej operacji nie można cofnąć.",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: async () => {
            await removeResult({ resultId: id as Id<"labResults"> });
            router.back();
          },
        },
      ]
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-8">
        {/* Header */}
        <View className="bg-white rounded-xl p-5 border border-gray-100 mb-4">
          <Text className="text-xl font-bold text-gray-900">
            {result.labName}
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            Data pobrania: {result.collectionDate}
          </Text>
          {result.notes && (
            <Text className="text-sm text-gray-600 mt-3">{result.notes}</Text>
          )}
        </View>

        {/* Parameters */}
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Parametry ({result.parameters.length})
        </Text>

        {result.parameters.map((param) => {
          const style = statusColors[param.status];
          return (
            <View
              key={param._id}
              className="bg-white rounded-xl p-4 mb-2 border border-gray-100"
            >
              <View className="flex-row justify-between items-start">
                <Text className="text-base font-medium text-gray-900 flex-1">
                  {param.name}
                </Text>
                <View className={`px-3 py-1 rounded-full ${style.bg}`}>
                  <Text className={`text-xs font-medium ${style.text}`}>
                    {style.label}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-baseline mt-2">
                <Text className="text-2xl font-bold text-gray-900">
                  {param.value}
                </Text>
                <Text className="text-sm text-gray-500 ml-1">
                  {param.unit}
                </Text>
              </View>

              {(param.referenceMin !== undefined ||
                param.referenceMax !== undefined) && (
                <View className="mt-2">
                  <View className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                    <ReferenceBar
                      value={param.value}
                      min={param.referenceMin}
                      max={param.referenceMax}
                      status={param.status}
                    />
                  </View>
                  <Text className="text-xs text-gray-400 mt-1">
                    Norma: {param.referenceMin ?? "–"} – {param.referenceMax ?? "–"}{" "}
                    {param.unit}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Actions */}
        <View className="mt-6 gap-3">
          <Pressable
            className="bg-primary-600 rounded-xl py-4 items-center"
            onPress={() => router.push({ pathname: "/(tabs)/results", params: { tab: "trends" } })}
          >
            <Text className="text-white font-semibold">
              Zobacz trendy parametrów
            </Text>
          </Pressable>

          <Pressable
            className="bg-red-50 rounded-xl py-4 items-center border border-red-200"
            onPress={handleDelete}
          >
            <Text className="text-red-600 font-semibold">Usuń wynik</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function ReferenceBar({
  value,
  min,
  max,
  status,
}: {
  value: number;
  min?: number;
  max?: number;
  status: string;
}) {
  const rangeMin = min ?? 0;
  const rangeMax = max ?? value * 2;
  const range = rangeMax - rangeMin;
  const displayMin = rangeMin - range * 0.3;
  const displayMax = rangeMax + range * 0.3;
  const displayRange = displayMax - displayMin;

  const position = Math.max(
    0,
    Math.min(100, ((value - displayMin) / displayRange) * 100)
  );

  const normalStart = ((rangeMin - displayMin) / displayRange) * 100;
  const normalWidth = (range / displayRange) * 100;

  const dotColor =
    status === "normal"
      ? "bg-green-500"
      : status === "critical"
        ? "bg-red-500"
        : status === "elevated"
          ? "bg-amber-500"
          : "bg-indigo-500";

  return (
    <View className="relative h-2 w-full">
      <View
        className="absolute h-full bg-green-200 rounded-full"
        style={{ left: `${normalStart}%`, width: `${normalWidth}%` }}
      />
      <View
        className={`absolute w-3 h-3 rounded-full -top-0.5 ${dotColor}`}
        style={{ left: `${position}%`, marginLeft: -6 }}
      />
    </View>
  );
}
