"use server";

import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/auth";
import { fileTypeFromBuffer } from "file-type";

export async function uploadDocument(file: File | null) {
  if (!file) return;

  const session = await auth();
  if (!session || !session.user) return;
  const user = session.user;

  const buffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(buffer);

  const fileType = await fileTypeFromBuffer(fileBytes);
  if (!fileType || fileType.mime !== "application/pdf") {
    throw new Error("document is not a pdf");
  }

  const fileHash = crypto.createHash("md5").update(fileBytes).digest("hex");
  const fileName = `${fileHash}.pdf`;
  const storageFilePath = `pdfs/${fileName}`;

  const supabase = await createClient();

  const { error: storageError } = await supabase.storage
    .from("contracts")
    .upload(storageFilePath, Buffer.from(fileBytes), {
      upsert: true,
      contentType: "application/pdf",
    });

  if (storageError) {
    console.error("Storage upload error:", storageError);
    throw new Error("failed to upload document to storage");
  }

  const { data: signedURLData } = await supabase.storage
    .from("contracts")
    .createSignedUrl(storageFilePath, 3600);

  const bucketURL = signedURLData?.signedUrl;

  const jobId = uuidv4();

  const { data: newJob, error: insertError } = await supabase
    .from("jobs")
    .insert([
      {
        id: jobId,
        user_id: user.id,
        recipients: [
          {
            name: user.name,
            email: user.email,
            signing_url: `https://www.docuinsight.ai/sign/?job=${jobId}`,
          },
        ],
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
    throw new Error("failed to create job");
  }

  console.log(newJob);
}
