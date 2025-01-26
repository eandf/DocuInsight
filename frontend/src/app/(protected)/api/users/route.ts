import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  parseSelect,
  parseLimit,
  parseQuery,
  applySupabaseFilters,
} from "@/utils/api-utils";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  // const session = await auth();
  // if (!session) return NextResponse.redirect(new URL(request.nextUrl.origin));

  const supabase = await createClient();

  const searchParams = request.nextUrl.searchParams;
  const select = searchParams.get("select");
  const limit = searchParams.get("limit");
  const query = searchParams.get("query");

  try {
    const columns = parseSelect(select);
    const limitValue = parseLimit(limit);
    const queryConditions = parseQuery(query);

    let dbQuery = supabase.schema("next_auth").from("users").select(columns);

    dbQuery = applySupabaseFilters(dbQuery, queryConditions);
    if (limitValue) {
      dbQuery = dbQuery.limit(limitValue);
    }

    const { data: users, error } = await dbQuery;
    if (error) {
      console.error("Supabase error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return Response.json(users);
  } catch (error) {
    console.error("Unexpected error:", error);

    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL(request.nextUrl.origin));
  }

  const supabase = await createClient();

  try {
    const body = await request.json();

    const { id, email, name, first_name, last_name, docusign_sub } = body;

    if (!email || !docusign_sub) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: 'email' or 'docusign_sub'.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (id) {
      const { data: existingUser, error: selectError } = await supabase
        .from("next_auth.users")
        .select("*")
        .eq("id", id)
        .single();

      if (selectError && selectError.code !== "PGRST116") {
        console.error("Error checking existing user:", selectError);
        return new Response(JSON.stringify({ error: selectError.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (existingUser) {
        const { data: updatedUser, error: updateError } = await supabase
          .from("next_auth.users")
          .update({
            email,
            name,
            first_name,
            last_name,
            docusign_sub,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("*");

        if (updateError) {
          console.error("Error updating user:", updateError);
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(updatedUser), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const { data: newUser, error: insertError } = await supabase
      .from("next_auth.users")
      .insert([
        {
          email,
          name,
          first_name,
          last_name,
          docusign_sub,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select("*");

    if (insertError) {
      console.error("Error creating user:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(newUser), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error [POST /users]:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL(request.nextUrl.origin));
  }

  const supabase = await createClient();

  try {
    const body = await request.json();
    const { id, docusign_sub } = body;

    if (!id && !docusign_sub) {
      return new Response(
        JSON.stringify({
          error: "Provide either 'id' or 'docusign_sub' to delete a user.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let deleteQuery = supabase.from("next_auth.users").delete();

    if (id) {
      deleteQuery = deleteQuery.eq("id", id);
    } else {
      deleteQuery = deleteQuery.eq("docusign_sub", docusign_sub);
    }

    const { data, error } = await deleteQuery.select("*");

    if (error) {
      console.error("Supabase error [DELETE /users]:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No user found with the provided identifier.",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ message: "User deleted successfully.", data }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error [DELETE /users]:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
