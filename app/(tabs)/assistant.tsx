import { useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useQuery, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import Markdown from "react-native-markdown-display";

function generateId(): string {
  return (
    Math.random().toString(36).substring(2) +
    Date.now().toString(36) +
    Math.random().toString(36).substring(2)
  );
}

interface Message {
  _id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export default function AssistantScreen() {
  const [conversationId] = useState(() => generateId());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUserMsg, setPendingUserMsg] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const prevMessagesRef = useRef<Message[]>([]);

  const serverMessages = useQuery(api.queries.chat.listForUser, {
    conversationId,
    limit: 50,
  });

  const chatAction = useAction(api.actions.medicalAgent.chat);

  // Build display messages: keep previous data when server returns undefined
  const displayMessages: Message[] = useMemo(() => {
    let msgs: Message[];

    if (serverMessages !== undefined) {
      msgs = serverMessages.map((m) => ({
        _id: m._id,
        role: m.role,
        content: m.content,
        isStreaming: (m as any).isStreaming ?? false,
      }));
      prevMessagesRef.current = msgs;
    } else {
      // Server is re-fetching — use cached messages
      msgs = prevMessagesRef.current;
    }

    // If user just sent a message but server hasn't saved it yet, show it optimistically
    if (pendingUserMsg) {
      const alreadySaved = msgs.some(
        (m) => m.role === "user" && m.content === pendingUserMsg
      );
      if (!alreadySaved) {
        msgs = [
          ...msgs,
          {
            _id: `pending-${Date.now()}`,
            role: "user",
            content: pendingUserMsg,
          },
        ];
      } else {
        // Server caught up — clear pending
        setPendingUserMsg(null);
      }
    }

    return msgs;
  }, [serverMessages, pendingUserMsg]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setIsLoading(true);
    setPendingUserMsg(text);

    try {
      await chatAction({
        conversationId,
        message: text,
      });
    } catch {
      // Error is handled by the action (saved to DB)
    } finally {
      setIsLoading(false);
      setPendingUserMsg(null);
    }
  }, [input, isLoading, conversationId, chatAction]);

  const mdStyles = useMemo(
    () =>
      StyleSheet.create({
        body: { color: "#111827", fontSize: 15, lineHeight: 22 },
        heading1: { fontSize: 20, fontWeight: "700", color: "#111827", marginTop: 8, marginBottom: 4 },
        heading2: { fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 8, marginBottom: 4 },
        heading3: { fontSize: 16, fontWeight: "600", color: "#111827", marginTop: 6, marginBottom: 2 },
        strong: { fontWeight: "700" },
        em: { fontStyle: "italic" },
        bullet_list: { marginVertical: 4 },
        ordered_list: { marginVertical: 4 },
        list_item: { flexDirection: "row", marginVertical: 2 },
        code_inline: {
          backgroundColor: "#F3F4F6",
          color: "#7C3AED",
          borderRadius: 4,
          paddingHorizontal: 4,
          paddingVertical: 1,
          fontSize: 13,
          fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
        },
        fence: {
          backgroundColor: "#F3F4F6",
          borderRadius: 8,
          padding: 12,
          marginVertical: 6,
          fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
          fontSize: 13,
          color: "#111827",
        },
        code_block: {
          backgroundColor: "#F3F4F6",
          borderRadius: 8,
          padding: 12,
          marginVertical: 6,
          fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
          fontSize: 13,
        },
        blockquote: {
          borderLeftWidth: 3,
          borderLeftColor: "#2563EB",
          paddingLeft: 12,
          marginVertical: 6,
          backgroundColor: "#EFF6FF",
          borderRadius: 4,
          padding: 8,
        },
        hr: { backgroundColor: "#E5E7EB", height: 1, marginVertical: 8 },
        paragraph: { marginVertical: 2 },
        link: { color: "#2563EB" },
        table: { borderColor: "#E5E7EB" },
        tr: { borderBottomWidth: 1, borderColor: "#E5E7EB" },
        th: { padding: 6, fontWeight: "600" },
        td: { padding: 6 },
      }),
    []
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View
        className={`mb-3 max-w-[85%] ${isUser ? "self-end" : "self-start"}`}
      >
        <View
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-primary-600 rounded-br-md"
              : "bg-white border border-gray-200 rounded-bl-md"
          }`}
        >
          {isUser ? (
            <Text className="text-base leading-6 text-white">
              {item.content}
            </Text>
          ) : item.content ? (
            <Markdown style={mdStyles}>{item.content}</Markdown>
          ) : (
            <View className="flex-row items-center gap-2 py-1">
              <ActivityIndicator size="small" color="#2563EB" />
              <Text className="text-sm text-gray-400">Myślę...</Text>
            </View>
          )}
        </View>
        {item.isStreaming && item.content ? (
          <View className="flex-row items-center mt-1 ml-1 gap-1">
            <ActivityIndicator size="small" color="#9CA3AF" />
          </View>
        ) : null}
      </View>
    );
  };

  // Show a typing indicator when waiting for any assistant response
  const isWaitingForResponse =
    isLoading ||
    displayMessages.some((m) => m.role === "assistant" && m.isStreaming);

  // Check if the last message is already a streaming/empty assistant bubble
  const lastMsg = displayMessages[displayMessages.length - 1];
  const needsTypingBubble =
    isLoading && (!lastMsg || lastMsg.role === "user");

  const hasContent = displayMessages.length > 0 || isLoading;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      {!hasContent ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">🩺</Text>
          <Text className="text-xl font-bold text-gray-900 text-center mb-2">
            Asystent MedTrack
          </Text>
          <Text className="text-base text-gray-500 text-center leading-6">
            Zapytaj mnie o swoje wyniki badań, trendy parametrów, alerty lub
            nadchodzące badania.
          </Text>
          <View className="mt-6 gap-2">
            {[
              "Jakie mam ostatnie wyniki?",
              "Czy mam jakieś nieprawidłowe wartości?",
              "Pokaż trend hemoglobiny",
            ].map((suggestion) => (
              <Pressable
                key={suggestion}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 active:bg-gray-100"
                onPress={() => {
                  setInput(suggestion);
                }}
              >
                <Text className="text-sm text-gray-700">{suggestion}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          extraData={serverMessages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            needsTypingBubble ? (
              <View className="mb-3 max-w-[85%] self-start">
                <View className="rounded-2xl px-4 py-3 bg-white border border-gray-200 rounded-bl-md">
                  <View className="flex-row items-center gap-2 py-1">
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text className="text-sm text-gray-400">Myślę...</Text>
                  </View>
                </View>
              </View>
            ) : null
          }
        />
      )}

      <View className="flex-row items-end px-4 pb-4 pt-2 bg-white border-t border-gray-100 gap-2">
        <TextInput
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-base text-gray-900 max-h-24"
          placeholder="Zadaj pytanie o swoje wyniki..."
          placeholderTextColor="#9CA3AF"
          value={input}
          onChangeText={setInput}
          multiline
          editable={!isLoading}
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <Pressable
          className={`rounded-full w-11 h-11 items-center justify-center ${
            input.trim() && !isLoading
              ? "bg-primary-600 active:bg-primary-700"
              : "bg-gray-200"
          }`}
          onPress={sendMessage}
          disabled={!input.trim() || isLoading}
        >
          <Text className="text-white text-lg font-bold">↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
