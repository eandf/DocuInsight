"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export function Disclaimer() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    const isDisclaimerAccepted = localStorage.getItem("disclaimerAccepted");
    if (isDisclaimerAccepted !== "true") {
      setShowDisclaimer(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("disclaimerAccepted", "true");
    setShowDisclaimer(false);
  };

  if (!showDisclaimer) {
    return null;
  }

  return (
    <div className="fixed bottom-0 inset-x-0 p-2 z-50">
      <div className="max-w-7xl mx-auto">
        <div className="p-2 rounded-lg bg-background border-4 border-red-800 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <p className="text-sm text-center sm:text-left font-medium text-foreground">
                <span className="font-bold">Disclaimer:</span> The summaries and
                analyses provided are AI-generated for informational purposes
                only and do not constitute legal advice.
              </p>
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto">
              <Button onClick={handleAccept} className="w-full">
                I Understand
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
