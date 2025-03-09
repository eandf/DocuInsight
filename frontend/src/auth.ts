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
      prompt: "login",
    },
  },
};

const ResendProvider = Resend({
  from: process.env.AUTH_RESEND_EMAIL,
  async sendVerificationRequest(params) {
    const { identifier: to, provider, url } = params;
    const { host } = new URL(url);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: provider.from,
        to,
        subject: `Sign in to ${host}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
        <tr>
            <td align="center" style="padding: 20px;">
                <!-- Title -->
                <div style="font-size: 32px; color: #260559; font-weight: bold; margin-bottom: 20px;">
                    DocuInsight
                </div>

                <!-- Purple Section -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #260559; color: white; padding: 40px; margin-bottom: 30px;">
                    <tr>
                        <td align="center">
                           <!-- Circle with Document Icon -->
                                <table cellpadding="0" cellspacing="0" style="margin: 0 auto 20px;">
                                    <tr>
                                        <td style="width: 64px; height: 64px; border: 2px solid white; border-radius: 32px; text-align: center; vertical-align: middle;">
                                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                                <tr>
                                                    <td style="width: 28px; height: 36px; background-color: white; vertical-align: middle;">
                                                        <!-- Document lines using table rows -->
                                                        <table width="100%" cellpadding="0" cellspacing="0">
                                                            <tr><td height="6"></td></tr>
                                                            <tr><td height="3" bgcolor="#260559" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                                                            <tr><td height="4"></td></tr>
                                                            <tr><td height="3" bgcolor="#260559" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                                                            <tr><td height="4"></td></tr>
                                                            <tr><td height="3" bgcolor="#260559" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                                                            <tr><td height="4"></td></tr>
                                                            <tr><td height="3" bgcolor="#260559" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                                                            <tr><td height="4"></td></tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                            <!-- Message -->
                            <div style="font-size: 20px; margin-bottom: 20px;">
                                Click the button below to sign in to DocuInsight
                            </div>

                            <!-- Button -->
                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="background-color: #735AFF; border-radius: 4px;">
                                        <a href="${url}" style="display: inline-block; padding: 12px 24px; color: white; text-decoration: none; font-weight: bold; letter-spacing: 0.5px;">
                                            Sign In
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- Message Content -->
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 16px;">

                    <tr>
                        <td style="padding-bottom: 24px;">
                            If you didn't request this link, please ignore this email or contact our support team.
                        </td>
                    </tr>
                </table>

                <!-- Footer -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
                    <tr>
                        <td style="color: #666; font-size: 14px;">
                            <h3 style="margin: 0 0 8px 0; font-size: 14px;">Do Not Share This Email</h3>
                            <p style="margin: 0 0 20px 0;">This email contains a secure link to sign into DocuInsight. Please do not share this email or link with others as it provides direct access to your account.</p>

                            <h3 style="margin: 0 0 8px 0; font-size: 14px;">About DocuInsight</h3>
                            <p style="margin: 0;">Sign and understand documents intelligently in just minutes. DocuInsight simplifies complex legal contracts, making them accessible to everyone through AI-powered explanations and plain English translations. Whether you're at the office, at home, or on-the-go, DocuInsight provides a trusted solution for document understanding and digital transaction management.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`,
        text: `Sign in to ${host}\n${url}\n\n`,
      }),
    });

    if (!res.ok)
      throw new Error("Resend error: " + JSON.stringify(await res.json()));
  },
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

        const { error } = await supabase
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
        }
      }

      return true;
    },
  },
});
