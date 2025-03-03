import { LoginForm } from "@/components/login-form";
import { Disclaimer } from "@/components/disclaimer";
import { ExternalLink } from "lucide-react";
import Image from "next/image";

export default function SignInPage() {
  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[1fr_2fr]">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start items-center">
          <Image
            src="/logo.png"
            alt=""
            width="64"
            height="64"
            className="h-12 w-auto"
          />
          <a href="#" className="flex items-center gap-2 text-4xl font-medium">
            DocuInsight
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center flex-col ">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
        <div className="flex flex-col items-start space-y-2 text-sm">
          <a
            href="https://support.docusign.com/s/document-item?bundleId=xry1643227563338&topicId=dqj1578456412286.html&_LANG=enus&language=en_US&rsc_301="
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center"
          >
            Docusign - Working With Templates
            <ExternalLink className="ml-1 h-4 w-4" />
          </a>
          <a
            href="https://forms.gle/jYdEvAedLm3Uc8416"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center"
          >
            Contact Us
            <ExternalLink className="ml-1 h-4 w-4" />
          </a>
        </div>
      </div>
      <div className="relative bg-muted flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <iframe
            src="https://www.youtube.com/embed/vechiKAvdDU?si=iK5x3v6p03Ug45y8"
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="w-full h-full object-cover"
          ></iframe>
        </div>
      </div>
      <Disclaimer />
    </div>
  );
}
