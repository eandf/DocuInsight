import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import docusign from "docusign-esign";
import { getAccessToken } from "@/lib/docusign";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("account_id");

    if (!accountId) {
      return NextResponse.json(
        { error: "Missing account_id parameter" },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Missing or invalid session" },
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const accessToken = await getAccessToken();

    const apiClient = new docusign.ApiClient();
    apiClient.setBasePath(`${process.env.DOCUSIGN_API_BASE_PATH}/restapi`);
    apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);

    const templatesApi = new docusign.TemplatesApi(apiClient);

    const result = await templatesApi.listTemplates(accountId, {
      include: "recipients,documents",
    });

    return NextResponse.json(result, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in GET handler:", error);
    return NextResponse.json(
      { error: error || "Internal Server Error" },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
