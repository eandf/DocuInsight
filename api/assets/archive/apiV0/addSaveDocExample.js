import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

function generateMD5(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(fileBuffer).digest("hex");
}

async function uploadPdfToStorage(bucketName, filePath, hashedFileName) {
  const fileBuffer = fs.readFileSync(filePath);

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(hashedFileName, fileBuffer, {
      contentType: "application/pdf",
    });

  if (error) {
    console.error("Error uploading PDF:", error);
    throw error;
  }

  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucketName}/${data.path}`;
}

async function downloadPdfFromStorage(bucketName, fileName, destinationPath) {
  // generate a signed URL for the file
  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(fileName, 60); // URL valid for 60 seconds

  if (signedUrlError) {
    console.error("Error creating signed URL:", signedUrlError);
    throw signedUrlError;
  }

  console.log("Signed URL generated:", signedUrl.signedUrl);

  // fetch the file content using the signed URL
  const response = await fetch(signedUrl.signedUrl);

  if (!response.ok) {
    console.error("Failed to download PDF:", response.statusText);
    throw new Error(`Failed to fetch the file: ${response.statusText}`);
  }

  const fileBuffer = await response.arrayBuffer();
  fs.writeFileSync(destinationPath, Buffer.from(fileBuffer));
  console.log("PDF downloaded successfully to:", destinationPath);
}

async function addDocument({ sub, filePath }) {
  try {
    // find the user by sub
    const { data: user, error: selectError } = await supabase
      .from("users")
      .select("*")
      .eq("sub", sub)
      .single();

    if (selectError) {
      console.error("Error checking user by sub:", selectError);
      throw selectError;
    }

    if (!user) {
      throw new Error("User with the given sub not found.");
    }

    console.log("User found:", user);

    const fileHash = generateMD5(filePath);
    const fileName = path.basename(filePath);

    // check if the file with the same hash already exists in the database
    const { data: existingDocument, error: hashCheckError } = await supabase
      .from("documents")
      .select("*")
      .eq("file_hash", fileHash)
      .single();

    if (hashCheckError && hashCheckError.code !== "PGRST116") {
      console.error("Error checking file hash:", hashCheckError);
      throw hashCheckError;
    }

    if (existingDocument) {
      console.log("Document with the same content already exists.");

      // check if the current user is associated with the document
      if (existingDocument.user_id === user.id) {
        console.log("User already has this document. Skipping upload.");
        return existingDocument;
      } else {
        console.log("Associating existing document with new user.");
        await supabase.from("documents").insert([
          {
            ...existingDocument,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
        return existingDocument;
      }
    }

    // rename the file with the hash appended
    const hashedFileName = `${path.basename(filePath, path.extname(filePath))}_${fileHash}.pdf`;

    // upload the PDF to Supabase Storage
    const fileUrl = await uploadPdfToStorage(
      "contracts",
      filePath,
      hashedFileName,
    );

    // insert a new document with the file URL and hash
    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert([
        {
          user_id: user.id,
          docusign_doc_id: `docusign_${Date.now()}`,
          file_name: hashedFileName,
          file_content: fileUrl, // store the file URL
          document_url: fileUrl, // save to the new column
          file_hash: fileHash, // save the hash
          report_generated: false,
          document_chunked: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select("*");

    if (insertError) {
      console.error("Error inserting document:", insertError);
      throw insertError;
    }

    console.log("Document added successfully:", document);

    // download the uploaded PDF
    const copyFileName = `${path.basename(filePath, path.extname(filePath))}_copy_${fileHash}.pdf`;
    const destinationPath = path.join(path.dirname(filePath), copyFileName);
    await downloadPdfFromStorage("contracts", hashedFileName, destinationPath);

    return document;
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

// MAIN FUNCTION CALLS
(async () => {
  // NOTE: set these inputs as you need for testing
  const userSub = "4799e5e9-1234-5678-9abc-cf4713bbcacc";
  const filePath = "./example.pdf";

  const result = await addDocument({ sub: userSub, filePath });
  console.log("Result:", result);
})();
