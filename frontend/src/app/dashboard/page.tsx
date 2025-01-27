import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";
import docusign from "docusign-esign";
import Dashboard from "@/components/dashboard";
import { DocusignAccountInfo } from "@/types/docusign";
import type { User } from "@/types/database";
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

  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("next_auth")
    .from("users")
    .select("*")
    .eq("id", session.user?.id)
    .single();

  if (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }

  if (!data || !data.docusign_sub) {
    redirect("/auth/connect-docusign");
  }

  const userData: User = data as User;

  let accessToken: string;
  try {
    accessToken = await getAccessToken(userData);
  } catch (tokenError) {
    console.error("Error obtaining access token:", tokenError);
    redirect("/auth/connect-docusign");
  }

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
