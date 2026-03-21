import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "expo-router";

export default function SignInScreen() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert("Błąd", "Podaj email i hasło");
      return;
    }

    setLoading(true);
    try {
      await signIn("password", { email, password, flow: "signIn" });
    } catch (e: any) {
      Alert.alert("Błąd logowania", e.message ?? "Spróbuj ponownie");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-8">
        <Text className="text-3xl font-bold text-center text-primary-600 mb-2">
          MedTrack
        </Text>
        <Text className="text-base text-gray-500 text-center mb-10">
          Śledź wyniki badań laboratoryjnych
        </Text>

        <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-base"
          placeholder="jan@przykład.pl"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">Hasło</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-base"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <Pressable
          className={`rounded-xl py-4 items-center ${loading ? "bg-primary-400" : "bg-primary-600"}`}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? "Logowanie..." : "Zaloguj się"}
          </Text>
        </Pressable>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">Nie masz konta? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text className="text-primary-600 font-semibold">
                Zarejestruj się
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
