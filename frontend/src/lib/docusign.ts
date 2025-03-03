import { createClient } from "@/utils/supabase/server";
import { auth } from "@/auth";

export async function getAccessToken(userId?: string): Promise<string> {
  if (!userId) {
    const session = await auth();
    if (!session) {
      throw new Error("not authenticated");
    }

    userId = session.user?.id as string;
  }

  const supabase = await createClient();

  const { data: accountData, error } = await supabase
    .schema("next_auth")
    .from("accounts")
    .select("*")
    .eq("userId", userId)
    .single();

  if (error) {
    console.error("Error fetching Docusign account data:", error);
    throw error;
  }

  const currentTime = new Date();

  const { access_token, expires_at, refresh_token } = accountData;

  if (!expires_at || currentTime >= new Date(expires_at)) {
    const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY!;
    const secretKey = process.env.DOCUSIGN_SECRET_KEY!;
    const combined = `${integrationKey}:${secretKey}`;
    const base64Auth = Buffer.from(combined).toString("base64");

    const tokenResponse = await fetch(
      `${process.env.DOCUSIGN_AUTH_BASE_PATH}/oauth/token`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${base64Auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refresh_token as string,
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
      .from("accounts")
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refresh_token,
        expires_at: new Date(
          Date.now() + tokenData.expires_in * 1000
        ).toISOString(),
      })
      .eq("id", userId);

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

  return access_token as string;
}
