import { NextRequest, NextResponse } from "next/server";
import docusign from "docusign-esign";
import { auth } from "@/auth";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}`);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")!;

  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(`${process.env.DOCUSIGN_API_BASE_PATH}/restapi`);

  const result = await apiClient.generateAccessToken(
    process.env.DOCUSIGN_INTEGRATION_KEY!,
    process.env.DOCUSIGN_SECRET_KEY!,
    code
  );

  const userInfo = await apiClient.getUserInfo(result.accessToken);

  const supabase = await createClient();
  const { error } = await supabase
    .schema("next_auth")
    .from("users")
    .update({
      name: userInfo.name,
      first_name: userInfo.givenName,
      last_name: userInfo.familyName,
      docusign_access_token: result.accessToken,
      docusign_refresh_token: result.refreshToken,
      docusign_access_token_expires_at: new Date(
        Date.now() + result.expiresIn * 1000
      ),
      docusign_account_connected_at: new Date(),
      docusign_sub: userInfo.sub,
      updated_at: new Date(),
    })
    .eq("id", session.user?.id);

  if (error) {
    console.error(error);
  }
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`);
}
