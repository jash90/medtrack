import { Stack, useRouter } from "expo-router";
import { Pressable, Text } from "react-native";

export default function AddResultLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        presentation: "modal",
        headerShown: true,
        headerTitleStyle: { fontWeight: "600" },
        headerLeft: () => (
          <Pressable onPress={() => router.back()} className="pr-4">
            <Text className="text-primary-600 text-base font-medium">
              Anuluj
            </Text>
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="review" options={{ title: "Sprawdź wyniki" }} />
    </Stack>
  );
}
