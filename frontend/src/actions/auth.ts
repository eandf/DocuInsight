"use server";

import { signIn } from "@/auth";

export async function signInAction() {
  await signIn("docusign", {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
  });
}
