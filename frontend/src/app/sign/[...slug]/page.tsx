import { createClient } from "@/utils/supabase/server";
import docusign from "docusign-esign";
import { RecipientViewRequest } from "docusign-esign";
import axios from "axios";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { SupabaseClient } from "@supabase/supabase-js";

async function getEnvelope(db: SupabaseClient, inviteId: string) {
  const { data, error } = await db
    .from("docusign_envelopes")
    .select("*")
    .eq("invite_id", inviteId)
    .single();

  if (error) {
    console.error("Error fetching envelope by invite_id:", error);
    throw error;
  }

  return data;
}

async function getAccessToken(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .schema("next_auth")
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error(error);
  }

  return data.docusign_access_token;
}

export default async function SignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const inviteId = (await params).slug;

  const supabase = await createClient();
  const envelopeData = await getEnvelope(supabase, inviteId);

  const accessToken = await getAccessToken(
    supabase,
    envelopeData.sender_user_id
  );

  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(`${process.env.DOCUSIGN_API_BASE_PATH}/restapi`);
  apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  const viewRequest: RecipientViewRequest = {
    returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/sign/redirect`,
    authenticationMethod: "none",
    email: envelopeData.signer_email,
    userName: envelopeData.signer_name,
    clientUserId: envelopeData.signer_client_user_id,
  };

  let recipientView: docusign.ViewUrl | undefined;
  try {
    recipientView = await envelopesApi.createRecipientView(
      envelopeData.account_id,
      envelopeData.envelope_id,
      { recipientViewRequest: viewRequest }
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log("Axios error response:", error.response);
    } else {
      console.log("Unexpected error:", error);
    }
  }

  return (
    <div className="h-screen w-full">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={80} minSize={20}>
          <div className="flex h-full items-center justify-center">
            <iframe className="w-full h-full" src={recipientView?.url} />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={20}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center p-6">
                <span className="font-semibold">Top Right Section</span>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center p-6">
                <span className="font-semibold">Bottom Right Section</span>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
