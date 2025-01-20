import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.DOCUSIGN_INTEGRATION_KEY!;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/docusign/callback`;
  const scopes = process.env.DOCUSIGN_AUTH_SCOPES!;

  const params = new URLSearchParams({
    response_type: "code",
    scope: scopes,
    client_id: clientId,
    redirect_uri: redirectUri,
    prompt: "login", // Force a login prompt
  });

  const url = `${
    process.env.DOCUSIGN_AUTH_BASE_PATH
  }/oauth/auth?${params.toString()}`;

  return NextResponse.redirect(url);
}
