import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Password],
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
      if (existingUserId) {
        // Existing user signing in — update profile fields if provided
        const updates: Record<string, string> = {};
        if (profile.name) updates.name = profile.name as string;
        if (profile.email) updates.email = profile.email as string;
        if (Object.keys(updates).length > 0) {
          await ctx.db.patch(existingUserId, updates);
        }
        return existingUserId;
      }
      // New user — create with default role "patient"
      return await ctx.db.insert("users", {
        email: profile.email as string,
        name: (profile.name as string) ?? undefined,
        role: "patient",
      });
    },
  },
});
