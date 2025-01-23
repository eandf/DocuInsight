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
        "Sale of Stock and Consideration: John is buying 1 million shares for $10 by assigning certain assets to the company.",
        "Vesting and Repurchase Option: The shares vest over four years; if John leaves the company, it can buy back unvested shares at the original price.",
        "Limitations on Transfer: He cannot transfer shares without company approval, and any transfer requires the company's consent.",
        "Right of First Refusal: If he wants to sell shares, he must first offer them to the company, which can choose to buy them instead.",
        "Lock-Up Agreement: He agrees not to sell his shares for a period (up to 216 days) after the company goes public if requested.",
        "Assignment of IP and Other Assets: He is transferring ownership of certain intellectual property and assets to the company as part of the purchase price.",
      ],
    },
    {
      title: "Summary",
      content: [
        "John Adams is purchasing 1 million shares of Apple Inc. for $10 by assigning certain intellectual property and assets to the company. The shares will vest over four years, with 25% vesting after one year and the rest monthly thereafter. If he leaves the company before fully vested, the company can buy back his unvested shares at the original price he paid, which is effectively zero. He cannot sell or transfer his shares without company approval, and if he wants to sell, the company has the first right to buy them. If the company goes public, he agrees not to sell his shares for up to approximately seven months after the IPO. He is also making representations about the intellectual property he's assigning, ensuring it's free of others' claims.",
      ],
    },
    {
      title: "Key Commitments",
      content: [
        "John Adams agrees to purchase 1,000,000 shares of Apple Inc. common stock at a total price of $10.",
        "He agrees to pay for the shares by assigning certain intellectual property and other assets to the company.",
        "He agrees that the shares will be subject to a 4-year vesting schedule with a one-year cliff.",
        "He accepts that the company has a Repurchase Option on any Unvested Shares if his service with the company ends.",
        "He agrees to limitations on transferring the shares, including requiring company approval for any transfer.",
        "He grants the company a Right of First Refusal if he intends to sell or transfer his shares.",
        "He agrees to certain lock-up provisions restricting the sale of shares in the event of an initial public offering (IPO).",
      ],
    },
    {
      title: "Important Risks",
      content: [
        "If John leaves the company before the shares are fully vested, the company can repurchase the unvested shares at the original purchase price, potentially resulting in loss of equity value.",
        "The company has broad discretion to deny any transfer of shares, limiting his ability to sell or transfer his shares.",
        "The definitions of 'Cause' and 'Good Reason' for termination are broad and may result in loss of unvested shares if not carefully considered.",
        "The lock-up agreement can prevent him from selling shares for up to 216 days after an IPO, limiting liquidity.",
        "By assigning his intellectual property and other assets, he may be transferring valuable rights to the company for minimal cash consideration.",
        "Automatic exercise of the Repurchase Option without additional notice may catch him unaware if not monitored closely.",
      ],
    },
    {
      title: "Unusual Terms",
      content: [
        "The requirement that any transfer of shares, including gifts or transfers upon death, requires company approval.",
        "The company's Repurchase Option can be automatically exercised without additional notice to John.",
        "The consideration for the shares is the assignment of assets, potentially of greater value than the shares' purchase price.",
        "The definitions of 'Cause' and 'Good Reason' are detailed and may be weighted in favor of the company.",
        "The transfer restrictions apply to involuntary transfers, such as those resulting from divorce or bankruptcy.",
      ],
    },
    {
      title: "Recommended Actions",
      content: [
        "Consult with an attorney to review the terms, especially concerning the assignment of intellectual property and the value exchanged.",
        "Negotiate the terms of the Repurchase Option to seek more favorable conditions or clarify ambiguous terms.",
        "Carefully review the definitions of 'Cause' and 'Good Reason' to understand the circumstances that could affect vesting.",
        "Assess the value of the assets being assigned compared to the potential value of the shares to ensure fair consideration.",
        "Consider requesting modifications to the transfer restrictions to allow more flexibility in transferring shares.",
        "Ensure understanding of tax implications, including the possibility of making an 83(b) election, and consult a tax professional.",
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
                  <span className="font-medium h-14 content-center pl-4 text-3xl border-b">
                    Docuinsight
                  </span>
                  <Report data={report} />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="!h-[0.15rem]" />
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center">
                <Chat />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle className="w-[0.15rem]" />
        <ResizablePanel defaultSize={70} minSize={20}>
          <div className="flex h-full items-center justify-center">
            <iframe className="w-full h-full" src={recipientView?.url} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
