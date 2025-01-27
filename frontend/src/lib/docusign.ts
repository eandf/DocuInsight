import { createClient } from "@/utils/supabase/server";
import type { User } from "@/types/database";

export async function getAccessToken(userData: User): Promise<string> {
  const supabase = await createClient();

  const {
    docusign_access_token,
    docusign_refresh_token,
    docusign_access_token_expires_at,
  } = userData;

  const currentTime = new Date();

  if (
    !docusign_access_token_expires_at ||
    currentTime >= new Date(docusign_access_token_expires_at)
  ) {
    const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY!;
    const secretKey = process.env.DOCUSIGN_SECRET_KEY!;
    const combined = `${integrationKey}:${secretKey}`;
    const base64Auth = Buffer.from(combined).toString("base64");

    const tokenResponse = await fetch(
      "https://account-d.docusign.com/oauth/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${base64Auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: docusign_refresh_token as string,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(
        "Failed to refresh DocuSign token:",
        tokenResponse.status,
        errorText
      );
      throw new Error("Error refreshing DocuSign tokens");
    }

    const tokenData = await tokenResponse.json();

    const { error: tokenRefreshError } = await supabase
      .schema("next_auth")
      .from("users")
      .update({
        docusign_access_token: tokenData.access_token,
        docusign_refresh_token:
          tokenData.refresh_token || docusign_refresh_token,
        docusign_access_token_expires_at: new Date(
          Date.now() + tokenData.expires_in * 1000
        ).toISOString(),
      })
      .eq("id", userData.id);

    if (tokenRefreshError) {
      console.error(
        "Error updating DocuSign tokens in database:",
        tokenRefreshError
      );
      throw new Error("Error updating DocuSign tokens in database");
    }

    console.log("Access token refreshed successfully.");

    return tokenData.access_token;
  }

  return docusign_access_token as string;
}
