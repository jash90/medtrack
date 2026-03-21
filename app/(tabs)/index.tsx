import { View, Text, ScrollView, Pressable } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useRouter } from "expo-router";

export default function DashboardScreen() {
  const router = useRouter();
  const recentResults = useQuery(api.queries.results.listRecent, { limit: 5 });
  const alerts = useQuery(api.queries.alerts.listUnread);
  const reminders = useQuery(api.queries.reminders.listUpcoming, { limit: 3 });
  const user = useQuery(api.queries.users.getCurrent);

  const greeting = getGreeting();

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-6">
        {/* Greeting */}
        <Text className="text-2xl font-bold text-gray-900">
          {greeting}, {user?.name?.split(" ")[0] ?? "Pacjencie"}
        </Text>
        <Text className="text-sm text-gray-500 mt-1">
          Twoje wyniki badań w jednym miejscu
        </Text>

        {/* Alerts */}
        {alerts && alerts.length > 0 && (
          <View className="mt-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Wymagają uwagi
            </Text>
            {alerts.slice(0, 3).map((alert) => (
              <View
                key={alert._id}
                className={`rounded-xl p-4 mb-2 ${
                  alert.type === "critical"
                    ? "bg-red-50 border border-red-200"
                    : "bg-amber-50 border border-amber-200"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    alert.type === "critical"
                      ? "text-red-800"
                      : "text-amber-800"
                  }`}
                >
                  {alert.message}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent Results */}
        <View className="mt-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-gray-900">
              Ostatnie wyniki
            </Text>
            <Pressable onPress={() => router.push("/(tabs)/results")}>
              <Text className="text-sm text-primary-600">Zobacz wszystkie</Text>
            </Pressable>
          </View>

          {recentResults && recentResults.length > 0 ? (
            recentResults.map((result) => (
              <Pressable
                key={result._id}
                className="bg-white rounded-xl p-4 mb-2 border border-gray-100"
                onPress={() => router.push(`/(tabs)/results/${result._id}`)}
              >
                <Text className="text-base font-medium text-gray-900">
                  {result.labName}
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                  {result.collectionDate}
                </Text>
              </Pressable>
            ))
          ) : (
            <View className="bg-white rounded-xl p-8 items-center border border-gray-100">
              <Text className="text-gray-400 text-base mb-3">
                Brak wyników badań
              </Text>
              <Pressable
                className="bg-primary-600 rounded-xl px-6 py-3"
                onPress={() => router.push("/(tabs)/scan")}
              >
                <Text className="text-white font-semibold">
                  Dodaj pierwszy wynik
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Upcoming Reminders */}
        <View className="mt-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-gray-900">
              Nadchodzące badania
            </Text>
            <Pressable onPress={() => router.push("/reminders")}>
              <Text className="text-sm text-primary-600">Wszystkie</Text>
            </Pressable>
          </View>

          {reminders && reminders.length > 0 ? (
            reminders.map((reminder) => (
              <View
                key={reminder._id}
                className="bg-white rounded-xl p-4 mb-2 border border-gray-100"
              >
                <Text className="text-base font-medium text-gray-900">
                  {reminder.title}
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                  {new Date(reminder.scheduledAt).toLocaleDateString("pl-PL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </View>
            ))
          ) : (
            <View className="bg-white rounded-xl p-6 items-center border border-gray-100">
              <Text className="text-gray-400 text-sm">
                Brak zaplanowanych badań
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Dzień dobry";
  if (hour < 18) return "Cześć";
  return "Dobry wieczór";
}
