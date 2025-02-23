import { auth } from "@/auth";
import Navbar from "@/components/navbar";
import docusign from "docusign-esign";
import Dashboard from "@/components/dashboard";
import { DocusignAccountInfo } from "@/types/docusign";
import { getAccessToken } from "@/lib/docusign";

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

  // TODO: error handling
  const accessToken = await getAccessToken();

  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(`${process.env.DOCUSIGN_API_BASE_PATH}/restapi`);
  apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);

  let userInfo;
  try {
    userInfo = await apiClient.getUserInfo(accessToken);
  } catch (error) {
    console.error("Error fetching DocuSign user info:", error);
    throw error;
  }

  const accounts = userInfo.accounts.map((account: DocusignAccountInfo) => {
    return { ...account };
  });

  return (
    <>
      <Navbar />
      <Dashboard accounts={accounts} />
    </>
  );
}
