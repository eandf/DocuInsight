import { LoginForm } from "@/components/login-form";
import { Disclaimer } from "@/components/disclaimer";

export default function SignInPage() {
  // const demoVideoUrl = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL;
  // if (!demoVideoUrl) {
  //   throw new Error("Missing demo video URL");
  // }

  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[1fr_2fr]">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 text-2xl font-medium">
            DocuInsight
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative bg-muted flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <iframe
            src="https://www.youtube.com/embed/oviyDYKbzGc?si=0fBzOtjOETHvThdp"
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
