import { NextRequest } from "next/server";
import { auth } from "@/auth"; // TODO: session not available in API routes for some reason
import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";
import docusign, { EnvelopeDefinition, EnvelopeSummary } from "docusign-esign";
import { fileTypeFromBuffer } from "file-type";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
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

  const formData = await request.formData();

  const accountId = formData.get("docusign_account_id") as string;
  const templateId = formData.get("docusign_template_id") as string;
  const recipients = JSON.parse(formData.get("recipients") as string);

  const userId = session.user?.id;
  const supabase = await createClient();

  const { data: userData, error } = await supabase
    .schema("next_auth")
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const docusignAccessToken = userData.docusign_access_token;
  const docusignApi = new docusign.ApiClient();
  docusignApi.setBasePath(`${process.env.DOCUSIGN_API_BASE_PATH}/restapi`);
  docusignApi.addDefaultHeader(
    "Authorization",
    `Bearer ${docusignAccessToken}`
  );

  const docusignTemplatesApi = new docusign.TemplatesApi(docusignApi);
  const documentData = await docusignTemplatesApi.getDocument(
    accountId,
    templateId,
    "1"
  );

  const fileBytes = Uint8Array.from(documentData);

  const fileType = await fileTypeFromBuffer(fileBytes);

  if (!fileType || fileType.mime !== "application/pdf") {
    return new Response(
      JSON.stringify({ error: "Template document is not a PDF" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const fileHash = crypto.createHash("md5").update(fileBytes).digest("hex");
  const fileName = `${fileHash}.pdf`;

  const storageFilePath = `pdfs/${fileName}`;

  const { error: storageError } = await supabase.storage
    .from("contracts")
    .upload(storageFilePath, fileBytes, {
      upsert: true,
      contentType: "application/pdf",
    });

  if (storageError) {
    console.error("Storage upload error:", storageError);
    return new Response(JSON.stringify({ error: storageError.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: publicURLData } = supabase.storage
    .from("contracts")
    .getPublicUrl(storageFilePath);

  const bucketURL = publicURLData.publicUrl;

  const jobId = uuidv4();
  const inviteId = uuidv4();

  const jobRecipients = recipients.map(
    (recipient: {
      roleName: string;
      name: string;
      email: string;
      clientUserId: string;
    }) => {
      return {
        roleName: recipient.roleName,
        name: recipient.name,
        email: recipient.email,
        clientUserId: uuidv4(),
        inviteId: inviteId,
        signing_url: `${process.env.NEXT_PUBLIC_BASE_URL}/sign/?job=${jobId}&invite=${inviteId}`,
      };
    }
  );

  const envelopeDefinition: EnvelopeDefinition = {
    templateId: templateId,
    templateRoles: jobRecipients,
    status: "sent",
  };

  const docusignEnvelopesApi = new docusign.EnvelopesApi(docusignApi);

  let envelopeSummary: EnvelopeSummary;
  try {
    envelopeSummary = await docusignEnvelopesApi.createEnvelope(accountId, {
      envelopeDefinition,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    return Response.json(
      { "Error creating Docusign envelope:": error },
      { status: 400 }
    );
  }

  const { data: newJob, error: insertError } = await supabase
    .from("jobs")
    .insert([
      {
        id: jobId,
        user_id: userId,
        docu_sign_account_id: accountId,
        docu_sign_envelope_id: envelopeSummary.envelopeId,
        recipients: jobRecipients,
        file_name: fileName,
        file_hash: fileHash,
        bucket_url: bucketURL,
        status: "queued",
        created_at: new Date().toISOString(), // TODO: change these to uuids?
        updated_at: new Date().toISOString(),
      },
    ])
    .select("*");

  if (insertError) {
    console.error(error);
    return new Response(
      JSON.stringify({ "Error inserting into database:": error }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return Response.json(newJob, { status: 201 });
}
