import { createClient } from "@supabase/supabase-js";
import express from "express";
import multer from "multer";
import crypto from "crypto";
import {
  parseSelect,
  parseLimit,
  parseQuery,
  applySupabaseFilters,
} from "./utils.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

const upload = multer({ storage: multer.memoryStorage() });
const app = express();

// middleware to parse json bodies
app.use(express.json());

////////////////////////////////////////////[ALL_TABLES_GET_ENDPOINTS]////////////////////////////////////////////

/**
 * GET /users endpoint
 * Query Params:
 *   - ?select=... (columns)
 *   - ?limit=... (int)
 *   - ?query=... (JSON of filters)
 */
app.get("/users", async (req, res) => {
  try {
    const { select, limit, query } = req.query;

    // parse each param
    const columns = parseSelect(select);
    const limitValue = parseLimit(limit);
    const queryConditions = parseQuery(query);

    // start the supabase query
    let dbQuery = supabase.from("users").select(columns);

    // apply filters
    dbQuery = applySupabaseFilters(dbQuery, queryConditions);

    // apply limit
    if (limitValue) {
      dbQuery = dbQuery.limit(limitValue);
    }

    // execute
    const { data, error } = await dbQuery;

    if (error) {
      console.error("Supabase error:", error);
      return res.status(400).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /jobs endpoint
 * Query Params:
 *   - ?select=... (columns)
 *   - ?limit=... (int)
 *   - ?query=... (JSON of filters)
 */
app.get("/jobs", async (req, res) => {
  try {
    const { select, limit, query } = req.query;

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
      return res.status(400).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error("Unexpected error [GET /jobs]:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /reports endpoint
 * Query Params:
 *   - ?select=... (columns)
 *   - ?limit=... (int)
 *   - ?query=... (JSON of filters)
 */
app.get("/reports", async (req, res) => {
  try {
    const { select, limit, query } = req.query;

    const columns = parseSelect(select);
    const limitValue = parseLimit(limit);
    const queryConditions = parseQuery(query);

    let dbQuery = supabase.from("reports").select(columns);
    dbQuery = applySupabaseFilters(dbQuery, queryConditions);

    if (limitValue) {
      dbQuery = dbQuery.limit(limitValue);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error("Supabase error [reports]:", error);
      return res.status(400).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error("Unexpected error [GET /reports]:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/** Root route just to verify the server is running */
app.get("/", (req, res) => {
  res.send("Welcome To The Middle API For DocuInsight!");
});

////////////////////////////////////////////[USERS_NONE_GET_ENDPOINTS]////////////////////////////////////////////

// POST /users
app.post("/users", async (req, res) => {
  try {
    const { id, email, name, given_name, family_name, sub } = req.body;

    // Validate essential fields (adjust as needed for your use case)
    if (!email || !sub) {
      return res
        .status(400)
        .json({ error: "Missing required fields: 'email' or 'sub'." });
    }

    if (id) {
      // 1. Check if a user with this 'id' already exists
      const { data: existingUser, error: selectError } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (selectError && selectError.code !== "PGRST116") {
        // 'PGRST116' = no rows found in Supabase/PostgREST
        console.error("Error checking existing user:", selectError);
        return res.status(400).json({ error: selectError.message });
      }

      if (existingUser) {
        // 2. If user exists, update it
        const { data: updatedUser, error: updateError } = await supabase
          .from("users")
          .update({
            email,
            name,
            given_name,
            family_name,
            sub,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("*");

        if (updateError) {
          console.error("Error updating user:", updateError);
          return res.status(400).json({ error: updateError.message });
        }

        return res.json(updatedUser);
      }
    }

    // 3. If no 'id' or user doesn't exist, create a new user
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          email,
          name,
          given_name,
          family_name,
          sub,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select("*");

    if (insertError) {
      console.error("Error creating user:", insertError);
      return res.status(400).json({ error: insertError.message });
    }

    return res.status(201).json(newUser);
  } catch (err) {
    console.error("Unexpected error [POST /users]:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /users - Update user details (excluding 'id' and 'sub')
app.put("/users", async (req, res) => {
  try {
    const { id, email, name, given_name, family_name, sub, ...rest } = req.body;

    // 1) Validate that 'id' is provided
    if (!id) {
      return res.status(400).json({ error: "Missing required field: 'id'." });
    }

    // 2) Prevent modification of 'id' and 'sub'
    if (sub !== undefined) {
      return res
        .status(400)
        .json({ error: "Modification of 'sub' is not allowed." });
    }

    // 3) Check for unexpected fields
    const allowedFields = ["email", "name", "given_name", "family_name"];
    const unexpectedFields = Object.keys(rest);
    if (unexpectedFields.length > 0) {
      return res.status(400).json({
        error: `Unexpected field(s): ${unexpectedFields.join(", ")}.`,
      });
    }

    // 4) Prepare fields to update
    const fieldsToUpdate = {};
    if (email !== undefined) fieldsToUpdate.email = email;
    if (name !== undefined) fieldsToUpdate.name = name;
    if (given_name !== undefined) fieldsToUpdate.given_name = given_name;
    if (family_name !== undefined) fieldsToUpdate.family_name = family_name;

    // If no updatable fields are provided, respond accordingly
    if (Object.keys(fieldsToUpdate).length === 0) {
      return res
        .status(400)
        .json({ error: "No valid fields provided for update." });
    }

    // 5) Update the 'updated_at' timestamp
    fieldsToUpdate.updated_at = new Date().toISOString();

    // 6) Attempt to update the user in the database
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update(fieldsToUpdate)
      .eq("id", id)
      .select("*");

    if (updateError) {
      console.error("Error updating user:", updateError);

      // Handle unique constraint violation for 'email'
      if (updateError.code === "23505") {
        // PostgreSQL unique_violation error code
        return res.status(400).json({ error: "Email already exists." });
      }

      return res.status(400).json({ error: updateError.message });
    }

    if (!updatedUser || updatedUser.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    // 7) Respond with the updated user
    return res.json(updatedUser);
  } catch (err) {
    console.error("Unexpected error [PUT /users]:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /users
app.delete("/users", async (req, res) => {
  try {
    const { id, sub } = req.body;
    if (!id && !sub) {
      return res
        .status(400)
        .json({ error: "Provide either 'id' or 'sub' to delete a user." });
    }

    // Include .select("*") to get the deleted rows in "data"
    let deleteQuery = supabase.from("users").delete().select("*");

    if (id) {
      deleteQuery = deleteQuery.eq("id", id);
    } else {
      deleteQuery = deleteQuery.eq("sub", sub);
    }

    const { data, error } = await deleteQuery;

    if (error) {
      console.error("Supabase error [DELETE /users]:", error);
      return res.status(400).json({ error: error.message });
    }

    // If no rows were actually deleted, data will be an empty array
    if (!data || data.length === 0) {
      return res
        .status(404)
        .json({ message: "No user found with the provided identifier." });
    }

    return res.json({ message: "User deleted successfully.", data });
  } catch (err) {
    console.error("Unexpected error [DELETE /users]:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

////////////////////////////////////////////[JOBS_NONE_GET_ENDPOINTS]/////////////////////////////////////////////

// POST /jobs - Create a new job row, optionally uploading PDF if not already existing
app.post("/jobs", upload.single("file"), async (req, res) => {
  try {
    // 1) Extract JSON fields from the request body (excluding the file)
    const {
      user_id,
      docu_sign_account_id,
      docu_sign_template_id,
      signing_url,
      recipients,
    } = req.body;

    // 2) Validate required fields
    const requiredFields = ["user_id"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required field(s): ${missingFields.join(", ")}.`,
      });
    }

    // 3) Check that the user exists in the "users" table
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", user_id)
      .single();

    if (userError) {
      console.error("User check error:", userError);
      // Supabase returns a specific error code for no data found
      // Adjust based on actual Supabase error code for "no data found"
      if (
        userError.code === "PGRST116" ||
        userError.message === "No rows found"
      ) {
        return res.status(404).json({
          error: "User does not exist. Provide a valid 'user_id'.",
        });
      } else {
        return res.status(400).json({
          error: "Error checking user existence.",
        });
      }
    }

    // 4) Prepare variables for file-related columns
    let fileName = null;
    let fileHash = null;
    let bucketURL = null;

    // 5) If a file was uploaded, handle it
    if (req.file) {
      // 5.1) Validate MIME type to ensure it's a PDF
      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({ error: "Only PDF files are allowed." });
      }

      // 5.2) Compute a full MD5 hash of the file buffer
      fileHash = crypto.createHash("md5").update(req.file.buffer).digest("hex");
      // No truncation to ensure uniqueness

      // 5.3) Check if a file with the same hash already exists in the "jobs" table
      const { data: existingJob, error: existingJobError } = await supabase
        .from("jobs")
        .select("file_name, bucket_url")
        .eq("file_hash", fileHash)
        .maybeSingle(); // Retrieves one record or null

      if (existingJobError) {
        console.error("Error checking existing file hash:", existingJobError);
        return res.status(400).json({ error: "Error checking existing file." });
      }

      if (existingJob) {
        // File already exists; reuse its information
        console.log(
          `File with hash ${fileHash} already exists. Reusing existing file.`,
        );
        fileName = existingJob.file_name;
        bucketURL = existingJob.bucket_url;
      } else {
        // 5.4) Construct a unique filename and upload to Supabase Storage
        // Sanitize the original filename to remove any unwanted characters
        const originalNameSanitized = req.file.originalname
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9-_]/g, "_");
        fileName = `${originalNameSanitized}_${fileHash}.pdf`;
        const storageFilePath = `pdfs/${fileName}`;

        // Attempt to upload to Supabase Storage (upsert=false to prevent overwriting)
        const { error: storageError } = await supabase.storage
          .from("contracts") // Consistent bucket name
          .upload(storageFilePath, req.file.buffer, {
            upsert: false, // Prevent overwriting existing files
            contentType: "application/pdf",
          });

        if (storageError) {
          console.error("Storage upload error:", storageError);
          return res.status(400).json({ error: storageError.message });
        }

        // 5.5) Generate the public URL (ensure "contracts" bucket is public or handle accordingly)
        const { data: publicURLData, error: publicURLError } =
          await supabase.storage
            .from("contracts") // Consistent bucket name
            .getPublicUrl(storageFilePath);

        if (publicURLError) {
          console.error("Error generating public URL:", publicURLError);
          return res.status(400).json({ error: "Error generating file URL." });
        }

        bucketURL = publicURLData.publicUrl;
      }
    }

    // 6) Insert a new row into the "jobs" table
    const { data: newJob, error: insertError } = await supabase
      .from("jobs")
      .insert([
        {
          user_id,
          docu_sign_account_id,
          docu_sign_template_id,
          bucket_url: bucketURL,
          file_name: fileName,
          file_hash: fileHash,
          signing_url: signing_url,
          recipients: recipients ? JSON.parse(recipients) : null, // Ensure recipients is JSON
          errors: {}, // Initialize as empty object
          status: "queued", // Set default status
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select("*");

    if (insertError) {
      console.error("Error inserting job:", insertError);

      // 7) If insertion failed, delete the uploaded file from storage if it was newly uploaded
      if (fileName && !existingJob) {
        // Only delete if we uploaded the file just now
        const { error: removeError } = await supabase.storage
          .from("contracts") // Consistent bucket name
          .remove([`pdfs/${fileName}`]);

        if (removeError) {
          console.error(
            "Error removing file from storage after failed DB insert:",
            removeError,
          );
          // Optionally handle this scenario further (e.g., notify admins)
        }
      }

      return res.status(400).json({ error: insertError.message });
    }

    // 8) Respond with the newly inserted job row
    return res.status(201).json(newJob);
  } catch (err) {
    console.error("Unexpected error [POST /jobs]:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /jobs - Update specific fields of a job row
app.put("/jobs", async (req, res) => {
  try {
    const {
      id,
      report_generated,
      signing_url,
      recipients,
      send_at,
      errors,
      status,
    } = req.body;

    // 1) Validate that 'id' is provided
    if (!id) {
      return res.status(400).json({ error: "Missing required field: 'id'." });
    }

    // 2) Define allowed fields for updating
    const allowedFields = {
      report_generated,
      signing_url,
      recipients,
      send_at,
      errors,
      status,
    };

    // 3) Filter out undefined fields to update only provided keys
    const fieldsToUpdate = {};
    Object.keys(allowedFields).forEach((key) => {
      if (allowedFields[key] !== undefined) {
        fieldsToUpdate[key] = allowedFields[key];
      }
    });

    // If no fields are provided to update, respond accordingly
    if (Object.keys(fieldsToUpdate).length === 0) {
      return res
        .status(400)
        .json({ error: "No valid fields provided for update." });
    }

    // 4) Retrieve the job to ensure it exists
    const { data: existingJob, error: fetchError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching job:", fetchError);
      if (
        fetchError.code === "PGRST116" ||
        fetchError.message === "No rows found"
      ) {
        // Adjust based on actual error
        return res.status(404).json({ error: "Job not found." });
      } else {
        return res.status(400).json({ error: "Error fetching job." });
      }
    }

    // 5) Update the 'updated_at' timestamp
    fieldsToUpdate.updated_at = new Date().toISOString();

    // 6) If 'recipients' is provided as a string, parse it to JSON
    if (
      fieldsToUpdate.recipients &&
      typeof fieldsToUpdate.recipients === "string"
    ) {
      try {
        fieldsToUpdate.recipients = JSON.parse(fieldsToUpdate.recipients);
      } catch (parseError) {
        return res
          .status(400)
          .json({ error: "Invalid JSON format for 'recipients'." });
      }
    }

    // 7) Update the job in the database
    const { data: updatedJob, error: updateError } = await supabase
      .from("jobs")
      .update(fieldsToUpdate)
      .eq("id", id)
      .select("*");

    if (updateError) {
      console.error("Error updating job:", updateError);
      return res.status(400).json({ error: updateError.message });
    }

    // 8) Respond with the updated job row
    return res.json(updatedJob);
  } catch (err) {
    console.error("Unexpected error [PUT /jobs]:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /jobs - Delete a job row and its associated PDF if no other jobs reference it
app.delete("/jobs", async (req, res) => {
  try {
    const { id } = req.body;

    // 1) Validate that 'id' is provided
    if (!id) {
      return res.status(400).json({ error: "Missing required field: 'id'." });
    }

    // 2) Retrieve the job to get file details
    const { data: job, error: fetchError } = await supabase
      .from("jobs")
      .select("file_name, file_hash")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching job:", fetchError);
      if (
        fetchError.code === "PGRST116" ||
        fetchError.message === "No rows found"
      ) {
        // Adjust based on actual error
        return res.status(404).json({ error: "Job not found." });
      } else {
        return res.status(400).json({ error: "Error fetching job." });
      }
    }

    const { file_name: fileName, file_hash: fileHash } = job;

    // 3) Delete the job row from the database
    const { data: deletedJob, error: deleteError } = await supabase
      .from("jobs")
      .delete()
      .eq("id", id)
      .select("*"); // To return the deleted row

    if (deleteError) {
      console.error("Error deleting job:", deleteError);
      return res.status(400).json({ error: deleteError.message });
    }

    // 4) If the job had an associated file, check if other jobs reference it
    if (fileHash) {
      // Count how many jobs still reference this file_hash
      const { count, error: countError } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("file_hash", fileHash);

      if (countError) {
        console.error("Error counting file references:", countError);
        // Proceeding without deleting the file to prevent accidental deletions
      } else if (count === 0) {
        // No other jobs reference this file; safe to delete the PDF
        const filePath = `pdfs/${fileName}`;

        const { error: storageRemoveError } = await supabase.storage
          .from("contracts") // Ensure consistent bucket name
          .remove([filePath]);

        if (storageRemoveError) {
          console.error(
            "Error removing file from storage:",
            storageRemoveError,
          );
          // Optionally, you can notify or log this error further
          // For now, we'll respond with a partial success message
          return res.status(500).json({
            message: "Job deleted, but failed to delete the associated PDF.",
            deletedJob: deletedJob[0],
            error: storageRemoveError.message,
          });
        }

        // File deleted successfully
        return res.json({
          message: "Job and associated PDF deleted successfully.",
          deletedJob: deletedJob[0],
        });
      }
    }

    // 5) If other jobs reference the file, do not delete the PDF
    return res.json({
      message:
        "Job deleted successfully. Associated PDF is still referenced by other jobs.",
      deletedJob: deletedJob[0],
    });
  } catch (err) {
    console.error("Unexpected error [DELETE /jobs]:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
