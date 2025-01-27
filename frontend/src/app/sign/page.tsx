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

  const signer = jobData.recipients.find(
    (recipient: JobRecipient) => recipient.inviteId === inviteId
  );

  if (!signer) {
    throw new Error("Invalid invite ID");
  }

  const { data: userData, error: userError } = await supabase
    .schema("next_auth")
    .from("users")
    .select("*")
    .eq("id", jobData.user_id)
    .single();

  if (userError) {
    throw new Error("Sender not found");
  }

  const { data: reportData, error: reportError } = await supabase
    .from("reports")
    .select("*")
    .eq("id", jobData.report_id)
    .single();

  if (reportError) {
    throw new Error("Report not found");
  }

  const contractText = reportData.contract_content;

  const accessToken = await getAccessToken(userData);

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

  let recipientView: docusign.ViewUrl | undefined;
  try {
    recipientView = await envelopesApi.createRecipientView(
      jobData.docu_sign_account_id,
      jobData.docu_sign_envelope_id,
      { recipientViewRequest: viewRequest }
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error response:", error.response);
    } else {
      console.error("Unexpected error:", error);
    }
    throw new Error("Error creating recipient view");
  }

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
                <Chat contractText={contractText} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-slate-600" />
        <ResizablePanel defaultSize={70} minSize={20}>
          <div className="flex h-full items-center justify-center">
            {recipientView?.url ? (
              <iframe className="w-full h-full" src={recipientView.url} />
            ) : (
              <p>Loading...</p>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <Disclaimer />
    </div>
  );
}
