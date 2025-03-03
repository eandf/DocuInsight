import { auth } from "@/auth";
import Navbar from "@/components/navbar";
import Dashboard from "@/components/dashboard";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
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

  const supabase = await createClient();
  const { data: jobsData, error: getJobsError } = await supabase
    .schema("public")
    .from("jobs")
    .select("*")
    .eq("user_id", session.user?.id);

  if (getJobsError) {
    console.error(getJobsError);
    throw new Error("Failed to get jobs");
  }

  return (
    <>
      <Navbar />
      <Dashboard jobs={jobsData} />
    </>
  );
}
