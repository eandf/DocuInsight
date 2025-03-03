import NextAuth from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import type { Provider } from "next-auth/providers";
import Resend from "next-auth/providers/resend";
import { createClient } from "./utils/supabase/server";

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
  callbacks: {
    signIn: async ({ profile, account }) => {
      if (profile && account && account.provider === "docusign") {
        const supabase = await createClient();

        const { data, error } = await supabase
          .schema("next_auth")
          .from("users")
          .update({
            name: profile.name,
            first_name: profile.given_name,
            last_name: profile.family_name,
            docusign_access_token: account.access_token,
            docusign_refresh_token: account.refresh_token,
            docusign_access_token_expires_at: new Date(
              account.expires_at! * 1000
            ).toISOString(),
            docusign_account_connected_at: new Date().toISOString(),
            docusign_sub: profile.sub,
            updated_at: new Date().toISOString,
          })
          .eq("email", profile.email);

        if (error) {
          console.error("error updating user:", error);
        } else {
          console.log("update user data:", data);
        }
      }

      return true;
    },
  },
});
