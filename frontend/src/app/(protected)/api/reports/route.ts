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

    let dbQuery = supabase.from("reports").select(columns);
    dbQuery = applySupabaseFilters(dbQuery, queryConditions);

    if (limitValue) {
      dbQuery = dbQuery.limit(limitValue);
    }

    const { data, error } = await dbQuery;
    if (error) {
      console.error("Supabase error [reports]:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return Response.json(data);
  } catch (error) {
    console.error("Unexpected error [GET /reports]:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// export async function POST(request: NextRequest) {
//   const session = await auth();
//   if (!session) {
//     return NextResponse.redirect(new URL(request.nextUrl.origin));
//   }

//   const supabase = await createClient();

//   try {
//     const body = await request.json();
//     const { job_id, contract_content, final_report, trace_back, version } =
//       body;

//     if (!job_id || !version) {
//       return new Response(
//         JSON.stringify({
//           error: "Missing required fields: 'job_id' or 'version'.",
//         }),
//         { status: 400, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     // Check if the job exists
//     const { error: jobError } = await supabase
//       .from("jobs")
//       .select("id")
//       .eq("id", job_id)
//       .single();

//     if (jobError) {
//       console.error("Job check error:", jobError);
//       return new Response(
//         JSON.stringify({ error: "Associated job not found." }),
//         { status: 404, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     // Insert new report
//     const { data: newReport, error: insertError } = await supabase
//       .from("reports")
//       .insert([
//         {
//           job_id,
//           contract_content,
//           final_report: final_report || {},
//           trace_back: trace_back || {},
//           version,
//           created_at: new Date().toISOString(),
//           updated_at: new Date().toISOString(),
//         },
//       ])
//       .select("*");

//     if (insertError) {
//       console.error("Error creating report:", insertError);
//       return new Response(JSON.stringify({ error: insertError.message }), {
//         status: 400,
//         headers: { "Content-Type": "application/json" },
//       });
//     }

//     return new Response(JSON.stringify(newReport), {
//       status: 201,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("Unexpected error [POST /reports]:", error);
//     return new Response(JSON.stringify({ error: "Internal Server Error" }), {
//       status: 500,
//       headers: { "Content-Type": "application/json" },
//     });
//   }
// }

// export async function PUT(request: NextRequest) {
//   const session = await auth();
//   if (!session) {
//     return NextResponse.redirect(new URL(request.nextUrl.origin));
//   }

//   const supabase = await createClient();

//   try {
//     const body = await request.json();
//     const { id, contract_content, final_report, trace_back, version } = body;

//     if (!id) {
//       return new Response(
//         JSON.stringify({ error: "Missing required field: 'id'." }),
//         { status: 400, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     const fieldsToUpdate = {
//       ...(contract_content !== undefined && { contract_content }),
//       ...(final_report !== undefined && { final_report }),
//       ...(trace_back !== undefined && { trace_back }),
//       ...(version !== undefined && { version }),
//       updated_at: new Date().toISOString(),
//     };

//     if (Object.keys(fieldsToUpdate).length === 0) {
//       return new Response(
//         JSON.stringify({ error: "No valid fields provided for update." }),
//         { status: 400, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     const { data: updatedReport, error: updateError } = await supabase
//       .from("reports")
//       .update(fieldsToUpdate)
//       .eq("id", id)
//       .select("*");

//     if (updateError) {
//       console.error("Error updating report:", updateError);
//       return new Response(JSON.stringify({ error: updateError.message }), {
//         status: 400,
//         headers: { "Content-Type": "application/json" },
//       });
//     }

//     if (!updatedReport || updatedReport.length === 0) {
//       return new Response(JSON.stringify({ error: "Report not found." }), {
//         status: 404,
//         headers: { "Content-Type": "application/json" },
//       });
//     }

//     return new Response(JSON.stringify(updatedReport), {
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("Unexpected error [PUT /reports]:", error);
//     return new Response(JSON.stringify({ error: "Internal Server Error" }), {
//       status: 500,
//       headers: { "Content-Type": "application/json" },
//     });
//   }
// }

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

//     const { data: deletedReport, error: deleteError } = await supabase
//       .from("reports")
//       .delete()
//       .eq("id", id)
//       .select("*");

//     if (deleteError) {
//       console.error("Error deleting report:", deleteError);
//       return new Response(JSON.stringify({ error: deleteError.message }), {
//         status: 400,
//         headers: { "Content-Type": "application/json" },
//       });
//     }

//     if (!deletedReport || deletedReport.length === 0) {
//       return new Response(JSON.stringify({ error: "Report not found." }), {
//         status: 404,
//         headers: { "Content-Type": "application/json" },
//       });
//     }

//     return new Response(
//       JSON.stringify({
//         message: "Report deleted successfully.",
//         data: deletedReport,
//       }),
//       { headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     console.error("Unexpected error [DELETE /reports]:", error);
//     return new Response(JSON.stringify({ error: "Internal Server Error" }), {
//       status: 500,
//       headers: { "Content-Type": "application/json" },
//     });
//   }
// }
