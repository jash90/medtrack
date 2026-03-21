import { query, internalQuery } from "../_generated/server";
import { getCurrentUserOrNull } from "../lib/auth";
import { auth } from "../auth";

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUserOrNull(ctx);
  },
});

export const getByAuthId = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});
