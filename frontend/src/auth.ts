import NextAuth from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import Resend from "next-auth/providers/resend";

const supabaseAdapter = SupabaseAdapter({
  url: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL as string,
  secret: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Resend({
      from: process.env.AUTH_RESEND_EMAIL,
    }),
  ],
  pages: {
    signIn: "/auth/sign-in",
    verifyRequest: "/auth/verify",
  },
  adapter: supabaseAdapter,
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
