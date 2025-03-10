"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import ReportView from "@/components/report-view";
import Chat from "@/components/chat";
import { Disclaimer } from "@/components/disclaimer";
import PDFViewer from "@/components/pdf-viewer";
import { buttonVariants } from "@/components/ui/button";
import { Job, Report } from "@/types/database";
import { useLocalStorage } from "usehooks-ts";
import { useEffect, useState, useCallback } from "react";
import { getRecipientViewUrl } from "@/actions/docusign";
import { redirect } from "next/navigation";

interface cachedSigningUrl {
  url: string | undefined;
  expiresAt: string | undefined; // Store as ISO string
}

export default function SigningView({
  inviteId,
  report,
  jobData,
  pdfUrl,
}: {
  inviteId: string;
  report: Report;
  jobData: Job;
  pdfUrl: string;
}) {
  const [signingUrl, setSigningUrl] = useLocalStorage<cachedSigningUrl>(
    inviteId,
    {
      url: undefined,
      expiresAt: undefined,
    }
  );

  const [isMounted, setIsMounted] = useState(false);

  const refreshSigningUrl = useCallback(async () => {
    const result = await getRecipientViewUrl(jobData, inviteId as string);
    const newSigningUrl = {
      url: result,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes expiration
    };
    setSigningUrl(newSigningUrl);
    return newSigningUrl.url;
  }, [jobData, inviteId, setSigningUrl]);

  useEffect(() => {
    setIsMounted(true);

    if (
      !signingUrl.url ||
      (signingUrl.expiresAt && new Date(signingUrl.expiresAt) < new Date())
    ) {
      console.log("No signing URL found or it has expired in local storage");
      refreshSigningUrl();
    }
  }, [
    inviteId,
    jobData,
    signingUrl.url,
    signingUrl.expiresAt,
    setSigningUrl,
    refreshSigningUrl,
  ]);

  // Handle button click to sign with DocuSign
  const handleSignClick = async () => {
    let urlToUse = signingUrl.url;
    if (signingUrl.expiresAt && new Date(signingUrl.expiresAt) < new Date()) {
      urlToUse = await refreshSigningUrl(); // Fetch a new URL if expired
    }
    redirect(urlToUse as string);
  };

  if (!isMounted) {
    return null; // Or a loading placeholder
  }
  return (
    <div className="h-screen w-full relative">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center">
                <div className="w-full h-full flex flex-col">
                  <div className="h-14 px-4 text-3xl font-medium flex items-center border-b bg-[#1a1d20] text-white">
                    DocuInsight
                  </div>
                  <ReportView data={report.final_report} />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-slate-600" />
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center">
                <Chat contractText={report.contract_content as string} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-slate-600" />
        <ResizablePanel defaultSize={70} minSize={20}>
          <div className="flex flex-col h-full items-center justify-center">
            <PDFViewer pdfUrl={pdfUrl} />

            {signingUrl.url && (
              <div className="h-[54px] border-t-2 w-full flex items-center px-4">
                <button
                  className={`ml-auto ${buttonVariants()}`}
                  onClick={handleSignClick}
                >
                  Sign with DocuSign
                </button>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <Disclaimer />
    </div>
  );
}
