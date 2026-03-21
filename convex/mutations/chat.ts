import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const saveMessages = internalMutation({
  args: {
    userId: v.id("users"),
    conversationId: v.string(),
    userMessage: v.string(),
    assistantMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatMessages", {
      userId: args.userId,
      conversationId: args.conversationId,
      role: "user",
      content: args.userMessage,
    });
    await ctx.db.insert("chatMessages", {
      userId: args.userId,
      conversationId: args.conversationId,
      role: "assistant",
      content: args.assistantMessage,
    });
  },
});

export const saveUserMessage = internalMutation({
  args: {
    userId: v.id("users"),
    conversationId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatMessages", {
      userId: args.userId,
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
    });
  },
});

export const createStreamingMessage = internalMutation({
  args: {
    userId: v.id("users"),
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chatMessages", {
      userId: args.userId,
      conversationId: args.conversationId,
      role: "assistant",
      content: "",
      isStreaming: true,
    });
  },
});

export const updateStreamingContent = internalMutation({
  args: {
    messageId: v.id("chatMessages"),
    content: v.string(),
    isStreaming: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      content: args.content,
      isStreaming: args.isStreaming,
    });
  },
});
