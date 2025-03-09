import { auth } from "@/auth";
import Navbar from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";
import FileUploadDialog from "@/components/file-upload-dialog";
import { uploadDocument } from "@/actions/database";
import JobTable from "@/components/job-table";
import EnvelopeSendDialog from "@/components/envelope-send-dialog";

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
      <div className="space-y-4 max-w-screen-xl mx-auto p-4 pt-8">
        <div className="flex gap-4 items-center">
          <span className="text-xl font-medium mr-auto">Reports</span>
          <FileUploadDialog onClose={uploadDocument} />
          <EnvelopeSendDialog />
        </div>
        <JobTable jobs={jobsData} />
      </div>
    </>
  );
}
