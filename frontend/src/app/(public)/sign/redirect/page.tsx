import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";

export default function SigningCompletePage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6 md:p-10">
      <Card className="w-72">
        <CardHeader>
          <span className="w-full">
            <Image
              src="/logo.png"
              alt=""
              width="32"
              height="32"
              className="mx-auto"
            />
          </span>

          <CardTitle className="text-2xl text-center">
            Signing Complete
          </CardTitle>
          <CardDescription className="text-center">
            Thank you for using DocuInsight!
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <p className="mb-4 text-center">
            You will recieve an email from Docusign confirming that the document
            has been signed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
