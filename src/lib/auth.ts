import NextAuth, { type AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail, createUser, verifyPassword, isAdminEmail } from "./users";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await verifyPassword(credentials.email, credentials.password);
        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;

      if (user?.email) {
        const existing = await getUserByEmail(user.email);
        if (!existing) {
          await createUser({
            name: user.name || "User",
            email: user.email,
            provider: account?.provider === "google" ? "google" : "github",
            image: user.image ?? undefined,
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await getUserByEmail(user.email!);
        token.role = isAdminEmail(user.email!) ? "admin" : dbUser?.role || "user";
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
