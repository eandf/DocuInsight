import { createClient } from "@/utils/supabase/server";
import { getPdfUrl, getReport } from "@/actions/database";
import SigningView from "@/components/signing-view";
import Report from "@/components/report";
import Chat from "@/components/chat";
import Disclaimer from "@/components/disclaimer";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/resizable-panel";

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
    console.error("Failed to get report");
    throw error;
  }

  const pdfUrl = await getPdfUrl(jobData.file_name);

  return (
    <div className="h-screen w-full relative">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center">
                <div className="w-full h-full flex flex-col">
                  <div
                    className={`h-[57px] px-[15px] text-3xl font-medium flex items-center border-b bg-[#1a1d20] text-white`}
                  >
                    DocuInsight
                  </div>
                  <Report data={reportData.final_report} />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-slate-600" />
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center">
                <Chat
                  contractText={reportData.contract_content}
                  finalReport={reportData.final_report}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-slate-600" />
        <ResizablePanel defaultSize={70} minSize={20}>
          <div className="flex h-full items-center justify-center">
            <SigningView
              inviteId={inviteId as string}
              report={reportData}
              jobData={jobData}
              pdfUrl={pdfUrl}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <Disclaimer />
    </div>
  );
}
