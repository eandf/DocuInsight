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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
