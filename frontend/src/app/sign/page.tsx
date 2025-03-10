import { createClient } from "@/utils/supabase/server";
import { getPdfUrl, getReport } from "@/actions/database";
import SigningView from "@/components/signing-view";

export default async function SignPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { job: jobId, invite: inviteId } = await searchParams;

  const supabase = await createClient();

  const { data: jobData, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError) {
    console.error(jobError);
    throw new Error("Job not found");
  }

  let reportData;
  try {
    reportData = await getReport(jobData.report_id);
  } catch (error) {
    console.error("failed to get report");
    throw error;
  }

  const pdfUrl = await getPdfUrl(jobData.file_name);

  return (
    <SigningView
      inviteId={inviteId as string}
      report={reportData}
      jobData={jobData}
      pdfUrl={pdfUrl}
    />
  );
}