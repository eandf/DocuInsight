import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";

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

  return (
    <>
      <Navbar />
      {JSON.stringify(session, null, 4)}
    </>
  );
}
