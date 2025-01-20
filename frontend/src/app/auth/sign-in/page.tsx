import { signIn } from "@/auth";

export default async function SignInPage() {
  return (
    <form
      action={async (formData: FormData) => {
        "use server";
        console.log("SIGN IN:", formData.get("email"));
        await signIn("resend", {
          email: formData.get("email"),
          redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
        });
      }}
    >
      <input type="email" name="email" placeholder="Email" />
      <button type="submit">Get sign in link</button>
    </form>
  );
}
