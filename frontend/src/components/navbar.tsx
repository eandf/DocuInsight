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

        <ul className="flex gap-8">
          <li>
            <a
              href="https://support.docusign.com/s/document-item?bundleId=xry1643227563338&topicId=dqj1578456412286.html&_LANG=enus&language=en_US&rsc_301="
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center underline"
            >
              Docusign - Working With Templates
            </a>
          </li>
          <li>
            <a
              href="https://forms.gle/jYdEvAedLm3Uc8416"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center underline"
            >
              Contact Us
            </a>
          </li>
        </ul>
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
