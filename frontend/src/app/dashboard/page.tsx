import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";
import docusign from "docusign-esign";
import axios from "axios";
import Dashboard from "@/components/dashboard";
import { DocusignAccountInfo } from "@/types/docusign";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/");

  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("next_auth")
    .from("users")
    .select("*")
    .eq("id", session.user?.id)
    .single();

  if (error) {
    console.error(error);
  }

  if (!data.docusign_sub) redirect("/auth/connect-docusign");

  const { docusign_access_token } = data;

  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(`${process.env.DOCUSIGN_API_BASE_PATH}/restapi`);

  let userInfo;
  try {
    userInfo = await apiClient.getUserInfo(docusign_access_token);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(error.response?.data);
    }
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
