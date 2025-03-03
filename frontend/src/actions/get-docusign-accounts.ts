"use server";

import { DocusignAccountInfo } from "@/types/docusign";
import docusign from "docusign-esign";
import { getAccessToken } from "@/lib/docusign";

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
