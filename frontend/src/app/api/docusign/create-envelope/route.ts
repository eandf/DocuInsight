import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import docusign, { EnvelopeSummary } from "docusign-esign";
import { EnvelopeDefinition, TemplateRole } from "docusign-esign";
import { randomBytes } from "crypto";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account_id") as string;
  const templateId = searchParams.get("template_id") as string;

  const body = await request.json();

  const session = await auth();
  if (!session) redirect(`${process.env.NEXT_PUBLIC_BASE_URL}`);
  const userId = session.user?.id;

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

  const templateRolesWithClientIds = body.templateRoles.map(
    (role: TemplateRole) => {
      return {
        ...role,
        clientUserId: randomBytes(16).toString("hex"),
      };
    }
  );

  const envelopeDefinition: EnvelopeDefinition = {
    templateId: templateId,
    templateRoles: templateRolesWithClientIds,
    status: "sent",
  };

  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  let envelopeSummary: EnvelopeSummary;

  try {
    envelopeSummary = await envelopesApi.createEnvelope(accountId, {
      envelopeDefinition,
    });
  } catch (error) {
    console.error(error);
    throw new Error("failed to create envelope");
  }

  try {
    const { error } = await supabase.from("docusign_envelopes").insert(
      templateRolesWithClientIds.map((role: TemplateRole) => {
        const inviteId = randomBytes(16).toString("hex");
        console.log(
          `CREATE ENVELOPE - recipient name: ${role.name} email: ${role.email} invite id: ${inviteId}`
        );
        // signing url is /sign/<inviteId>

        return {
          account_id: accountId,
          envelope_id: envelopeSummary.envelopeId,
          sender_user_id: userId,
          signer_name: role.name,
          signer_email: role.email,
          signer_client_user_id: role.clientUserId,
          invite_id: inviteId,
        };
      })
    );

    if (error) {
      console.error("Supabase insert error:", error);
      throw new Error(error.message);
    }
  } catch (err) {
    console.error("Error inserting into Supabase:", err);
    throw err;
  }

  return NextResponse.json({
    message: "created envelope from template",
    accountId,
    templateId,
    envelopeSummary,
  });
}
