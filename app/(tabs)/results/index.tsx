import { useState, useEffect } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useRouter, useLocalSearchParams } from "expo-router";
import { TrendDetails } from "@/src/ui/components/TrendDetails";

type Tab = "results" | "trends";

export default function ResultsListScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const results = useQuery(api.queries.results.list, {});
  const [activeTab, setActiveTab] = useState<Tab>(
    tab === "trends" ? "trends" : "results"
  );

  useEffect(() => {
    if (tab === "trends") setActiveTab("trends");
  }, [tab]);

  if (!results) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-400">Ładowanie...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Tab Switcher */}
      <View className="flex-row bg-white mx-5 mt-4 rounded-xl p-1 border border-gray-100">
        <Pressable
          className={`flex-1 rounded-lg py-2.5 ${
            activeTab === "results" ? "bg-primary-600" : ""
          }`}
          onPress={() => setActiveTab("results")}
        >
          <Text
            className={`text-center text-sm font-semibold ${
              activeTab === "results" ? "text-white" : "text-gray-500"
            }`}
          >
            Wyniki
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 rounded-lg py-2.5 ${
            activeTab === "trends" ? "bg-primary-600" : ""
          }`}
          onPress={() => setActiveTab("trends")}
        >
          <Text
            className={`text-center text-sm font-semibold ${
              activeTab === "trends" ? "text-white" : "text-gray-500"
            }`}
          >
            Trendy
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {activeTab === "results" ? (
        results.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-xl font-semibold text-gray-900 mb-2">
              Brak wyników badań
            </Text>
            <Text className="text-gray-500 text-center mb-6">
              Zeskanuj wyniki badań, aby zacząć śledzić swoje zdrowie
            </Text>
            <Pressable
              className="bg-primary-600 rounded-xl px-8 py-4"
              onPress={() => router.push("/(tabs)/scan")}
            >
              <Text className="text-white font-semibold text-base">
                Dodaj pierwszy wynik
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <FlatList
              data={results}
              contentContainerClassName="px-5 pt-4 pb-24"
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <Pressable
                  className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
                  onPress={() => router.push(`/(tabs)/results/${item._id}`)}
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900">
                        {item.labName}
                      </Text>
                      <Text className="text-sm text-gray-500 mt-1">
                        {item.collectionDate}
                      </Text>
                    </View>
                    <View className="px-3 py-1 rounded-full bg-green-100">
                      <Text className="text-xs font-medium text-green-700">
                        Skan
                      </Text>
                    </View>
                  </View>
                  {item.notes && (
                    <Text
                      className="text-sm text-gray-400 mt-2"
                      numberOfLines={1}
                    >
                      {item.notes}
                    </Text>
                  )}
                </Pressable>
              )}
            />

            {/* FAB */}
            <Pressable
              className="absolute bottom-6 right-6 bg-primary-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
              onPress={() => router.push("/(tabs)/scan")}
            >
              <Text className="text-white text-2xl font-light">+</Text>
            </Pressable>
          </>
        )
      ) : (
        <TrendDetails />
      )}
    </View>
  );
}
