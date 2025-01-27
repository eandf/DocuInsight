"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[380px] max-w-[90vw]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            An error occurred while rendering this page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error?.message || "An unexpected error occurred."}
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => reset()} className="w-full">
            Try again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
