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
import type { ReportSection } from "@/types/report";
import Report from "@/components/report";
import Chat from "@/components/chat";

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

  // console.log("USER DATA:", data);

  const currentTime = new Date();
  const accessTokenEpireTime = new Date(data.docusign_access_token_expires_at);

  if (accessTokenEpireTime > currentTime) {
    return data.docusign_access_token;
  }

  return data.docusign_access_token;
}

async function getReport(): Promise<ReportSection[]> {
  return [
    {
      title: "Key Clauses",
      content: [
        "Non-Solicit (Section 8): Can't recruit company employees/clients for 1 year after leaving",
        "Termination (Section 11): Either party can cancel with notice, but key obligations continue forever",
        "Liability Cap (Section 10): Company's maximum responsibility is limited to what they paid you, but your liability is unlimited",
        "Confidentiality (Section 4): Never disclose company info without written permission, even after contract ends",
        "Governing Law (Section 16a): Disputes will use state laws specified in blank space (major red flag if left empty)",
        "Indemnification (Section 9): You must pay company's legal costs for any claims related to your work, even if not your fault",
        "Invention Assignment (Section 5): Company owns everything you create during contract, including ideas not directly related to your work",
      ],
    },
    {
      title: "Unusual Terms",
      content: [
        "Moral rights waiver (Section 5d) - gives company right to modify your work without credit",
        "Perpetual license for pre-existing inventions (Section 5b)",
        "$1,000 injunction bond requirement (Section 16g)",
        "Electronic monitoring consent (Section 6)",
        "Automatic renewal if rehired within 1 year (Section 1)",
        "Requirement to disclose future inventions for 12 months after termination (Section 5g)",
        "Company can act as your legal representative for patent filings (Section 5f)",
      ],
    },
    {
      title: "Important Risks",
      content: [
        "Unlimited personal liability for damages/legal claims (Section 9)",
        "Company can terminate access to documents/templates at any time",
        "Must pay back company for expenses if rules aren't followed",
        "No guarantee documents are legally compliant or up-to-date",
        "Company retains rights to modify agreement terms unilaterally",
        "Waives normal legal protections for confidential disclosures (DTSA exceptions only)",
        "Responsible for assistants' compliance with agreement terms",
        "Potential permanent loss of rights to inventions through disclosure requirements",
      ],
    },
    {
      title: "Key Commitments",
      content: [
        "Maintain strict confidentiality of company information indefinitely",
        "Assign all intellectual property created during consulting to the company",
        "Prohibited from soliciting employees/clients for 12 months after termination",
        "Responsible for taxes/legal compliance for themselves and any assistants",
        "Must disclose all prior inventions before signing",
        "Allow company to monitor all electronic systems/devices used",
        "Indemnify company against legal claims arising from consulting work",
        "Follow company's guidelines when modifying template documents",
      ],
    },
    {
      title: "Recommended Actions",
      content: [
        "Consult employment lawyer before signing - especially regarding liability clauses",
        "Negotiate liability caps matching insurance coverage",
        "Document all prior inventions thoroughly in Exhibit C",
        "Request errors & omissions insurance coverage verification",
        "Clarify reimbursement process for expenses",
        "Request modification of blanket indemnification clause",
        "Verify non-solicit period complies with state laws",
        "Review conflict with existing NDAs/non-competes (Exhibit F)",
      ],
    },
    {
      title: "Plain English Summary",
      content: [
        "This agreement makes you legally responsible for protecting the company's secrets forever, gives them ownership of anything you create while consulting, and restricts your future work opportunities. You could be on the hook financially for mistakes, legal issues, or even your assistants' actions. The company disclaims all responsibility for the quality of their templates and can change rules anytime. You must get their approval before working with competitors and help them secure patents for your work even after leaving. The most concerning parts are the unlimited financial liability and permanent intellectual property claims.",
      ],
    },
  ];
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

  const report = await getReport();

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
                  <Report data={report} />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-slate-600" />
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center">
                <Chat />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-slate-600" />
        <ResizablePanel defaultSize={70} minSize={20}>
          <div className="flex h-full items-center justify-center">
            <iframe className="w-full h-full" src={recipientView?.url} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
