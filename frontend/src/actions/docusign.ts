"use server";

import { DocusignAccountInfo } from "@/types/docusign";
import docusign from "docusign-esign";
import { getAccessToken } from "@/lib/docusign";
import type { Job, JobRecipient } from "@/types/database";
import type { RecipientViewRequest } from "docusign-esign";
import axios from "axios";

export async function getDocusignAccounts(): Promise<DocusignAccountInfo[]> {
  const accessToken = await getAccessToken();

  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(`${process.env.DOCUSIGN_API_BASE_PATH}/restapi`);
  apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);

  try {
    const userInfo = await apiClient.getUserInfo(accessToken);
    return userInfo.accounts.map((account: DocusignAccountInfo) => ({
      ...account,
    }));
  } catch (error) {
    console.error("Error fetching DocuSign user info:", error);
    throw error;
  }
}

export async function getRecipientViewUrl(
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
