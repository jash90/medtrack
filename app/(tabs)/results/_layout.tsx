import { Stack } from "expo-router";

export default function ResultsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Wyniki badań" }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: "Szczegóły wyniku" }}
      />
    </Stack>
  );
}
