import { auth, signOut } from "@/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default async function Navbar() {
  const session = await auth();

  return (
    <div className="w-full border-b">
      <nav className="flex px-4 py-2 items-center justify-between max-w-screen-xl mx-auto h-16">
        <div className="flex justify-center gap-2 md:justify-start items-center">
          <Image
            src="/logo.png"
            alt=""
            width="64"
            height="64"
            className="h-8 w-auto"
          />
          <Link className="text-2xl font-medium" href="/">
            DocuInsight
          </Link>
        </div>
        
        <ul className="flex gap-2">
          <li>
            {session ? (
              <form
                action={async () => {
                  "use server";
                  await signOut({
                    redirectTo: "/auth/sign-in",
                    redirect: true,
                  });
                }}
              >
                <Button type="submit">Sign out</Button>
              </form>
            ) : (
              <a href="/auth/sign-in" className={buttonVariants()}>
                Sign In
              </a>
            )}
          </li>
        </ul>
      </nav>
    </div>
  );
}
