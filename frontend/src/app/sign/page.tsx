import { createClient } from "@/utils/supabase/server";
import { getAccessToken } from "@/lib/docusign";
import docusign from "docusign-esign";
import { RecipientViewRequest } from "docusign-esign";
import axios from "axios";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import Report from "@/components/report";
import Chat from "@/components/chat";
import { JobRecipient } from "@/types/database";
import { Disclaimer } from "@/components/disclaimer";
import type { Job } from "@/types/database";
import PDFViewer from "@/components/pdf-viewer";
import { buttonVariants } from "@/components/ui/button";

async function getRecipientViewUrl(
  jobData: Job,
  inviteId: string
): Promise<string> {
  if (!jobData.recipients) {
    throw new Error("job does not have any recipients");
  }

  const signer = jobData.recipients.find(
    (recipient: JobRecipient) => recipient.inviteId === inviteId
  );

  if (!signer) {
    throw new Error("Invalid invite ID");
  }

  const accessToken = await getAccessToken(jobData.user_id);

  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(`${process.env.DOCUSIGN_API_BASE_PATH}/restapi`);
  apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  const viewRequest: RecipientViewRequest = {
    returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/sign/redirect`,
    authenticationMethod: "none",
    email: signer.email,
    userName: signer.name,
    clientUserId: signer.clientUserId,
  };

  try {
    const recipientView = await envelopesApi.createRecipientView(
      jobData.docu_sign_account_id as string,
      jobData.docu_sign_envelope_id as string,
      { recipientViewRequest: viewRequest }
    );
    return recipientView.url as string;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error response:", error.response);
    } else {
      console.error("Unexpected error:", error);
    }
    throw new Error("Error creating recipient view");
  }
}

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

  const { data: reportData, error: reportError } = await supabase
    .from("reports")
    .select("*")
    .eq("id", jobData.report_id)
    .single();

  if (reportError) {
    throw new Error("Report not found");
  }

  const fileName = jobData.file_name;
  const storageFilePath = `pdfs/${fileName}`;
  const { data: signedURLData } = await supabase.storage
    .from("contracts")
    .createSignedUrl(storageFilePath, 3600);

  const pdfUrl = signedURLData?.signedUrl as string;

  let docusignSigningUrl = "";
  if (inviteId) {
    docusignSigningUrl = await getRecipientViewUrl(jobData, inviteId as string);
  }

  return (
    <div className="h-screen w-full relative">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center">
                <div className="w-full h-full flex flex-col">
                  <div className="h-14 px-4 text-3xl font-medium flex items-center border-b bg-[#1a1d20] text-white">
                    DocuInsight
                  </div>
                  <Report data={reportData.final_report} />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-slate-600" />
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center">
                <Chat contractText={reportData.contract_content} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-slate-600" />
        <ResizablePanel defaultSize={70} minSize={20}>
          <div className="flex flex-col h-full items-center justify-center">
            <PDFViewer pdfUrl={pdfUrl} />

            {docusignSigningUrl && (
              <div className="h-[54px] border-t-2 w-full flex items-center px-4">
                <a
                  className={`ml-auto ${buttonVariants()}`}
                  href={docusignSigningUrl}
                >
                  Sign with DocuSign
                </a>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <Disclaimer />
    </div>
  );
}
