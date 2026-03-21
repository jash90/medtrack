import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth";
import { hasPermission } from "../lib/permissions";

export const list = query({
  args: {
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const userId = args.targetUserId ?? currentUser._id;

    if (args.targetUserId && args.targetUserId !== currentUser._id) {
      const allowed = await hasPermission(ctx, "results:view", userId);
      if (!allowed) throw new Error("Forbidden");
    }

    return await ctx.db
      .query("labResults")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const limit = args.limit ?? 5;

    const results = await ctx.db
      .query("labResults")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .order("desc")
      .take(limit);

    return results;
  },
});

export const getById = query({
  args: {
    resultId: v.id("labResults"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const result = await ctx.db.get(args.resultId);

    if (!result) return null;

    if (result.userId !== currentUser._id) {
      const allowed = await hasPermission(ctx, "results:view", result.userId);
      if (!allowed) throw new Error("Forbidden");
    }

    const parameters = await ctx.db
      .query("parameters")
      .withIndex("by_result", (q) => q.eq("resultId", args.resultId))
      .collect();

    return { ...result, parameters };
  },
});
