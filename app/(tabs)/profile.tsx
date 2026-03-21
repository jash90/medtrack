import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";

export default function ProfileScreen() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.queries.users.getCurrent);
  const deleteAccount = useMutation(api.mutations.users.deleteAccount);

  function handleSignOut() {
    Alert.alert("Wyloguj", "Czy na pewno chcesz się wylogować?", [
      { text: "Anuluj", style: "cancel" },
      { text: "Wyloguj", onPress: () => signOut() },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Usuń konto",
      "Wszystkie dane (wyniki, przypomnienia, udostępnienia) zostaną trwale usunięte. Tej operacji nie można cofnąć.",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń konto",
          style: "destructive",
          onPress: async () => {
            await deleteAccount();
            await signOut();
          },
        },
      ]
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-400">Ładowanie...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-5 pt-6 pb-8">
        {/* Avatar */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-3">
            <Text className="text-2xl font-bold text-primary-600">
              {user.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text className="text-xl font-bold text-gray-900">
            {user.name ?? "Pacjent"}
          </Text>
          <Text className="text-sm text-gray-500">{user.email}</Text>
        </View>

        {/* Info */}
        <View className="bg-white rounded-xl border border-gray-100 mb-4">
          <InfoRow label="Rola" value="Pacjent" />
          <InfoRow
            label="Data urodzenia"
            value={user.dateOfBirth ?? "Nie podano"}
            isLast
          />
        </View>

        {/* Actions */}
        <Pressable
          className="bg-white rounded-xl p-4 border border-gray-100 mb-4"
          onPress={handleSignOut}
        >
          <Text className="text-base font-medium text-primary-600 text-center">
            Wyloguj się
          </Text>
        </Pressable>

        <Pressable
          className="bg-red-50 rounded-xl p-4 border border-red-200"
          onPress={handleDeleteAccount}
        >
          <Text className="text-base font-medium text-red-600 text-center">
            Usuń konto i dane (RODO)
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row justify-between px-4 py-3 ${
        !isLast ? "border-b border-gray-50" : ""
      }`}
    >
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="text-sm font-medium text-gray-900">{value}</Text>
    </View>
  );
}
