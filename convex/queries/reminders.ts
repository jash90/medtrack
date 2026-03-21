import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth";

export const listUpcoming = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const now = Date.now();
    const limit = args.limit ?? 10;

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.gte(q.field("scheduledAt"), now)
        )
      )
      .order("asc")
      .take(limit);

    return reminders;
  },
});

export const listPast = query({
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    const now = Date.now();

    return await ctx.db
      .query("reminders")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .filter((q) => q.lt(q.field("scheduledAt"), now))
      .order("desc")
      .collect();
  },
});
