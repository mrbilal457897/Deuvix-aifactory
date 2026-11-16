import NextAuth, { type AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getUserByEmail, createUser, isAdminEmail } from "./users";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (user?.email) {
        const existing = await getUserByEmail(user.email);
        if (!existing) {
          await createUser({
            name: user.name || "User",
            email: user.email,
            provider: "google",
            image: user.image ?? undefined,
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await getUserByEmail(user.email!);
        token.role = isAdminEmail(user.email!) ? "admin" : "user";
        token.userId = dbUser?.id || user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.userId = token.userId;
      }
      return session;
    },
  },
  pages: {
    error: "/login",
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};

export default NextAuth(authOptions);
