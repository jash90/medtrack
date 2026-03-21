import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "expo-router";

export default function SignUpScreen() {
  const { signIn } = useAuthActions();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!name || !email || !password) {
      Alert.alert("Błąd", "Wypełnij wszystkie pola");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Błąd", "Hasło musi mieć minimum 8 znaków");
      return;
    }

    setLoading(true);
    try {
      await signIn("password", {
        email,
        password,
        name,
        flow: "signUp",
      });
    } catch (e: any) {
      Alert.alert("Błąd rejestracji", e.message ?? "Spróbuj ponownie");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-8"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold text-center text-primary-600 mb-2">
          Utwórz konto
        </Text>
        <Text className="text-base text-gray-500 text-center mb-10">
          Zacznij śledzić swoje wyniki badań
        </Text>

        <Text className="text-sm font-medium text-gray-700 mb-1">
          Imię i nazwisko
        </Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-base"
          placeholder="Jan Kowalski"
          value={name}
          onChangeText={setName}
          autoComplete="name"
        />

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
          placeholder="Minimum 8 znaków"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <Pressable
          className={`rounded-xl py-4 items-center ${loading ? "bg-primary-400" : "bg-primary-600"}`}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? "Rejestracja..." : "Zarejestruj się"}
          </Text>
        </Pressable>

        <View className="flex-row justify-center mt-6 mb-8">
          <Text className="text-gray-500">Masz już konto? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text className="text-primary-600 font-semibold">
                Zaloguj się
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
