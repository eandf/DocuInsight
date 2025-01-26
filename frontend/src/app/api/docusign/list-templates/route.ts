import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import docusign from "docusign-esign";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account_id") as string;

  const session = await auth();
  if (!session) {
    return Response.json(
      { error: "missing session" },
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("next_auth")
    .from("users")
    .select("*")
    .eq("id", session.user?.id)
    .single();

  if (error) {
    console.error(error);
  }

  const accessToken = data.docusign_access_token;

  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(`${process.env.DOCUSIGN_API_BASE_PATH}/restapi`);
  apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);

  const templatesApi = new docusign.TemplatesApi(apiClient);

  let result;
  try {
    result = await templatesApi.listTemplates(accountId, {
      include: "recipients,documents",
    });
  } catch (error) {
    console.error(error);
    throw new Error("failed to fetch templates");
  }

  return NextResponse.json(result);
}
