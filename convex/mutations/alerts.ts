import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../lib/auth";

export const markRead = mutation({
  args: {
    alertId: v.id("alerts"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const alert = await ctx.db.get(args.alertId);
    if (!alert || alert.userId !== currentUser._id) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.alertId, { isRead: true });
  },
});

export const markAllRead = mutation({
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);

    const unread = await ctx.db
      .query("alerts")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", currentUser._id).eq("isRead", false)
      )
      .collect();

    for (const alert of unread) {
      await ctx.db.patch(alert._id, { isRead: true });
    }
  },
});
