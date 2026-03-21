import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  normal: { bg: "bg-green-100", text: "text-green-700", label: "Norma" },
  elevated: { bg: "bg-amber-100", text: "text-amber-700", label: "Podwyższony" },
  low: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Obniżony" },
  critical: { bg: "bg-red-100", text: "text-red-700", label: "Krytyczny" },
};

export default function ShareViewScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const data = useQuery(api.queries.shares.getByToken, {
    token: token ?? "",
  });

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-400">Ładowanie...</Text>
      </View>
    );
  }

  if (data.expired) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="text-xl font-semibold text-gray-900 mb-2">
          Link wygasł
        </Text>
        <Text className="text-gray-500 text-center">
          Ten link do wyników nie jest już aktywny. Poproś pacjenta o nowy.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-5 pt-8 pb-8">
        <Text className="text-2xl font-bold text-gray-900 mb-1">
          Wyniki badań
        </Text>
        <Text className="text-sm text-gray-500 mb-6">
          Pacjent: {data.patientName} • Dostęp:{" "}
          {data.accessLevel === "full" ? "pełny" : "filtrowany"}
        </Text>

        {data.results?.map((result: any) => (
          <View
            key={result._id}
            className="bg-white rounded-xl p-5 border border-gray-100 mb-4"
          >
            <Text className="text-lg font-semibold text-gray-900">
              {result.labName}
            </Text>
            <Text className="text-sm text-gray-500 mb-3">
              {result.collectionDate}
            </Text>

            {result.parameters?.map((param: any) => {
              const style = statusColors[param.status] ?? statusColors.normal;
              return (
                <View
                  key={param._id}
                  className="flex-row justify-between items-center py-2 border-b border-gray-50"
                >
                  <Text className="text-sm text-gray-700">{param.name}</Text>
                  <View className="flex-row items-center">
                    <Text className="text-sm font-semibold text-gray-900 mr-2">
                      {param.value} {param.unit}
                    </Text>
                    <View className={`px-2 py-0.5 rounded-full ${style.bg}`}>
                      <Text className={`text-xs ${style.text}`}>
                        {style.label}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        <View className="bg-amber-50 rounded-xl p-4 border border-amber-200 mt-4">
          <Text className="text-xs text-amber-700">
            Dane wprowadzone samodzielnie przez pacjenta. Nie stanowią
            dokumentacji medycznej w rozumieniu przepisów prawa.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
