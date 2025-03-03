"use server";

import { signIn } from "@/auth";

export async function signInAction(
  provider: string = "docusign",
  email?: string
) {
  if (provider === "email") {
    console.log("SIGNING IN WITH RESEND");
    return await signIn("resend", {
      email,
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    });
  } else {
    console.log("SIGNING IN WITH DOCUSIGN");
    return await signIn("docusign", {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    });
  }
}
