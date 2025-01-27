import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";
import docusign, { EnvelopeDefinition, EnvelopeSummary } from "docusign-esign";
import { fileTypeFromBuffer } from "file-type";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { getAccessToken } from "@/lib/docusign";

export async function POST(request: NextRequest) {
  try {
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

    const userId = session.user.id;

    const formData = await request.formData();

    const accountId = formData.get("docusign_account_id") as string;
    const templateId = formData.get("docusign_template_id") as string;
    const recipients = JSON.parse(formData.get("recipients") as string);

    if (!accountId || !templateId || !recipients) {
      return NextResponse.json(
        { error: "Missing required form data" },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const supabase = await createClient();

    const { data: userData, error: userError } = await supabase
      .schema("next_auth")
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Supabase user fetch error:", userError);
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!userData) {
      return NextResponse.json(
        { error: "User data not found" },
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const docusignAccessToken = await getAccessToken(userData);

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
      return NextResponse.json(
        { error: "Template document is not a PDF" },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const fileHash = crypto.createHash("md5").update(fileBytes).digest("hex");
    const fileName = `${fileHash}.pdf`;

    const storageFilePath = `pdfs/${fileName}`;

    const { error: storageError } = await supabase.storage
      .from("contracts")
      .upload(storageFilePath, Buffer.from(fileBytes), {
        upsert: true,
        contentType: "application/pdf",
      });

    if (storageError) {
      console.error("Storage upload error:", storageError);
      return NextResponse.json(
        { error: storageError.message },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
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
      }) => ({
        roleName: recipient.roleName,
        name: recipient.name,
        email: recipient.email,
        clientUserId: uuidv4(),
        inviteId: inviteId,
        signing_url: `${process.env.NEXT_PUBLIC_BASE_URL}/sign/?job=${jobId}&invite=${inviteId}`,
      })
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
        console.error("Axios error:", error.message);
      } else {
        console.error("Unexpected error:", error);
      }

      return NextResponse.json(
        { error: "Error creating DocuSign envelope" },
        { status: 400, headers: { "Content-Type": "application/json" } }
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select("*");

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json(
        { error: "Error inserting job into database" },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return NextResponse.json(newJob, {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.json(
      { error: error || "Internal Server Error" },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
