"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { Spinner } from "@/components/spinner";
import { signInAction } from "@/actions/auth";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  // Tracks loading state across concurrent React transitions
  const [isPending, startTransition] = useTransition();

  // Local state for storing the email address
  const [email, setEmail] = React.useState("");

  // Handler for Docusign sign-in
  const handleDocusignSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(() => {
      // This calls your server action that internally runs `signIn('docusign')`
      signInAction("docusign");
    });
  };

  // Handler for Email sign-in
  const handleEmailSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(() => {
      // Pass the email to your server action that internally runs `signIn('email', { email })`
      signInAction("email", email);
    });
  };

  return (
    <div className="flex flex-col gap-6 w-64">
      {/* Email sign-in form */}
      <form
        onSubmit={handleEmailSignIn}
        className={cn("flex flex-col gap-4", className)}
        {...props}
      >
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 p-2 rounded"
          required
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Sending Link...
            </>
          ) : (
            "Sign in with Email"
          )}
        </Button>
      </form>

      <form onSubmit={handleDocusignSignIn} className="flex flex-col gap-4">
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Signing In...
            </>
          ) : (
            "Sign in with Docusign"
          )}
        </Button>
      </form>
    </div>
  );
}
