import { query } from "../_generated/server";
import { getCurrentUser } from "../lib/auth";

export const listUnread = query({
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);

    return await ctx.db
      .query("alerts")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", currentUser._id).eq("isRead", false)
      )
      .order("desc")
      .collect();
  },
});
