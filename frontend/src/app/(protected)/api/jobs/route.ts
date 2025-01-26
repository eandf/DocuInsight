import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth"; // TODO: session not available in API routes for some reason
import {
  parseSelect,
  parseLimit,
  parseQuery,
  applySupabaseFilters,
} from "@/utils/api-utils";
import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL(request.nextUrl.origin));
  }

  const supabase = await createClient();

  const searchParams = request.nextUrl.searchParams;
  const select = searchParams.get("select");
  const limit = searchParams.get("limit");
  const query = searchParams.get("query");

  try {
    const columns = parseSelect(select);
    const limitValue = parseLimit(limit);
    const queryConditions = parseQuery(query);

    let dbQuery = supabase.from("jobs").select(columns);
    dbQuery = applySupabaseFilters(dbQuery, queryConditions);

    if (limitValue) {
      dbQuery = dbQuery.limit(limitValue);
    }

    const { data, error } = await dbQuery;
    if (error) {
      console.error("Supabase error [jobs]:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return Response.json(data);
  } catch (error) {
    console.error("Unexpected error [GET /jobs]:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const formData = await request.formData();

  try {
    const user_id = formData.get("user_id") as string;
    const docu_sign_account_id = formData.get("docu_sign_account_id") as string;
    const docu_sign_envelope_id = formData.get(
      "docu_sign_envelope_id"
    ) as string;
    const recipients = formData.get("recipients") as string;
    const file = formData.get("file"); // File input

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: 'user_id'." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate and handle recipients
    let parsedRecipients = null;
    if (recipients) {
      try {
        parsedRecipients = JSON.parse(recipients);
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON format for 'recipients'." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    let fileHash,
      fileName,
      bucketURL,
      isNewUpload = false;

    if (file && file instanceof File) {
      // 1. Validate MIME type
      const mimeType = file.type;
      if (mimeType !== "application/pdf") {
        return new Response(
          JSON.stringify({ error: "Only PDF files are allowed." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 2. Compute MD5 hash
      const buffer = await file.arrayBuffer();
      fileHash = crypto
        .createHash("md5")
        .update(Buffer.from(buffer))
        .digest("hex");

      // 3. Check for existing file by hash
      const { data: existingJobs, error: existingJobError } = await supabase
        .from("jobs")
        .select("file_name, bucket_url")
        .eq("file_hash", fileHash)
        .limit(1);

      if (existingJobError) {
        console.error("Error checking existing file hash:", existingJobError);
        return new Response(
          JSON.stringify({ error: "Error checking existing file." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (existingJobs && existingJobs.length > 0) {
        // File already exists; reuse details
        fileName = existingJobs[0].file_name;
        bucketURL = existingJobs[0].bucket_url;
      } else {
        // 4. Generate unique filename and upload new file
        const originalNameSanitized = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9-_]/g, "_");
        fileName = `${originalNameSanitized}_${fileHash}.pdf`;
        const storageFilePath = `pdfs/${fileName}`;

        const { error: storageError } = await supabase.storage
          .from("contracts")
          .upload(storageFilePath, Buffer.from(buffer), {
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

        bucketURL = publicURLData.publicUrl;
        isNewUpload = true;
      }
    }

    // Insert the job record
    const { data: newJob, error: insertError } = await supabase
      .from("jobs")
      .insert([
        {
          user_id,
          docu_sign_account_id,
          docu_sign_envelope_id,
          recipients: parsedRecipients,
          file_name: fileName,
          file_hash: fileHash,
          bucket_url: bucketURL,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select("*");

    if (insertError) {
      console.error("Error inserting job:", insertError);

      if (fileName && isNewUpload) {
        const { error: removeError } = await supabase.storage
          .from("contracts")
          .remove([`pdfs/${fileName}`]);

        if (removeError) {
          console.error(
            "Error removing file from storage after failed DB insert:",
            removeError
          );
        } else {
          console.log(
            `Removed uploaded file due to failed job insert: ${fileName}`
          );
        }
      }
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return Response.json(newJob, { status: 201 });
  } catch (error) {
    console.error("Error [POST /jobs]:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL(request.nextUrl.origin));
  }

  const supabase = await createClient();

  try {
    const body = await request.json();
    const {
      id,
      docu_sign_account_id,
      docu_sign_envelope_id,
      recipients,
      send_at,
      errors,
      status,
    } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: 'id'." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const fieldsToUpdate = {
      ...(docu_sign_account_id !== undefined && { docu_sign_account_id }),
      ...(docu_sign_envelope_id !== undefined && { docu_sign_envelope_id }),
      ...(send_at !== undefined && { send_at }),
      ...(errors !== undefined && { errors }),
      ...(status !== undefined && { status }),
      ...(recipients &&
        (typeof recipients === "string"
          ? { recipients: JSON.parse(recipients) }
          : { recipients })),
      updated_at: new Date().toISOString(),
    };

    const { data: updatedJob, error: updateError } = await supabase
      .from("jobs")
      .update(fieldsToUpdate)
      .eq("id", id)
      .select("*");

    if (updateError) throw updateError;

    if (!updatedJob || updatedJob.length === 0) {
      return new Response(JSON.stringify({ error: "Job not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return Response.json(updatedJob);
  } catch (error) {
    console.error("Error [PUT /jobs]:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// export async function DELETE(request: NextRequest) {
//   const session = await auth();
//   if (!session) {
//     return NextResponse.redirect(new URL(request.nextUrl.origin));
//   }

//   const supabase = await createClient();

//   try {
//     const body = await request.json();
//     const { id } = body;

//     if (!id) {
//       return new Response(
//         JSON.stringify({ error: "Missing required field: 'id'." }),
//         { status: 400, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     const { data: job, error: fetchError } = await supabase
//       .from("jobs")
//       .select("file_name, file_hash")
//       .eq("id", id)
//       .single();

//     if (fetchError) {
//       if (
//         fetchError.code === "PGRST116" ||
//         fetchError.message === "No rows found"
//       ) {
//         return new Response(JSON.stringify({ error: "Job not found." }), {
//           status: 404,
//           headers: { "Content-Type": "application/json" },
//         });
//       }
//       throw fetchError;
//     }

//     const { data: deletedJob, error: deleteError } = await supabase
//       .from("jobs")
//       .delete()
//       .eq("id", id)
//       .select("*");

//     if (deleteError) throw deleteError;

//     return new Response(
//       JSON.stringify({ message: "Job deleted successfully.", deletedJob }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     console.error("Error [DELETE /jobs]:", error);
//     return new Response(JSON.stringify({ error: "Internal Server Error" }), {
//       status: 500,
//       headers: { "Content-Type": "application/json" },
//     });
//   }
// }
