import multer from "multer";
import crypto from "crypto";
import express from "express";
import { createClient } from "@supabase/supabase-js";
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
const port = 3000;

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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// POST /jobs - Create a new job row, upload PDF, store file info in DB
app.post("/jobs", upload.single("file"), async (req, res) => {
  try {
    // 1) Extract JSON fields from the request body (besides the file)
    const {
      user_id,
      docu_sign_account_id,
      docu_sign_template_id,
      signing_url,
      recipients
    } = req.body;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ error: "Missing required field: 'user_id'." });
    }

    // Prepare variables for file-related columns
    let fileName = null;
    let fileHash = null;
    let bucketURL = null;

    // 2) If a file was uploaded, handle it
    if (req.file) {
      // Compute a hash of the file buffer
      fileHash = crypto
        .createHash("sha256")
        .update(req.file.buffer)
        .digest("hex")
        .substring(0, 16); 
      // substring(0,16) just to shorten the hash in the filename (optional)

      // Construct a unique path in the bucket. E.g.: "pdfs/originalName_hash.pdf"
      fileName = `${req.file.originalname.replace(/\.[^/.]+$/, "")}_${fileHash}.pdf`;
      const storageFilePath = `pdfs/${fileName}`;

      // Attempt to upload to Supabase storage (upsert=false to catch duplicates)
      const { data: storageData, error: storageError } = await supabase.storage
        .from("contracts") // your bucket name
        .upload(storageFilePath, req.file.buffer, {
          upsert: false, // If false, an error occurs if file already exists
          contentType: "application/pdf",
        });

      if (storageError) {
        // If it's a duplicate error or any other storage error, return early
        console.error("Storage upload error:", storageError);
        return res.status(400).json({ error: storageError.message });
      }

      // Optionally build a public URL if your bucket is public, or store the path
      const { data: publicURLData } = supabase.storage
        .from("documents")
        .getPublicUrl(storageFilePath);

      bucketURL = publicURLData.publicUrl; 
      // or, if not public, just store "pdfs/<fileName>" so you can refer to it later
    }

    // 3) Insert a new row into the "jobs" table
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
          recipients: recipients,
          errors: {},
          // Additional columns here...
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select("*");

    if (insertError) {
      console.error("Error inserting job:", insertError);

      // If insertion failed, consider deleting the file from storage if it was uploaded.
      if (fileName) {
        await supabase.storage
          .from("documents")
          .remove([`pdfs/${fileName}`]);
      }

      return res.status(400).json({ error: insertError.message });
    }

    // 4) Respond with the newly inserted job row
    return res.status(201).json(newJob);
  } catch (err) {
    console.error("Unexpected error [POST /jobs]:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
