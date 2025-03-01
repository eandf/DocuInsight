import NextAuth from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import type { Provider } from "next-auth/providers";
import Resend from "next-auth/providers/resend";

const supabaseAdapter = SupabaseAdapter({
  url: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ?? "",
  secret: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
});

const DocusignProvider: Provider = {
  id: "docusign",
  name: "Docusign",
  type: "oidc",
  clientId: process.env.DOCUSIGN_INTEGRATION_KEY ?? "",
  clientSecret: process.env.DOCUSIGN_SECRET_KEY ?? "",
  issuer: `${process.env.DOCUSIGN_AUTH_BASE_PATH}/`,
  authorization: {
    params: {
      scope: "openid profile email signature extended",
    },
  },
};

const ResendProvider = Resend({
  from: process.env.AUTH_RESEND_EMAIL,
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [DocusignProvider, ResendProvider],
  pages: {
    signIn: "/auth/sign-in",
    verifyRequest: "/auth/verify",
  },
  adapter: supabaseAdapter,
  session: { strategy: "database" },
});
