import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  // CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ConnectDocusignPage() {
  return (
    <>
      <Navbar />

      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Connect Docusign Account
            </CardTitle>
            {/* <CardDescription className="text-center">
              {"We've sent a magic link to your email address"}
            </CardDescription> */}
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <p className="mb-4 text-center">
              {"You need to connect a docusign account to use DocuInsight"}
            </p>
            <Button asChild className="mt-4">
              <a href={"/api/auth/docusign/authorize"}>
                Connect Docusign Account
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
