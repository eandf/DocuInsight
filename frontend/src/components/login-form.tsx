"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { Spinner } from "@/components/spinner";
import { signInAction } from "@/actions/auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { getRandomEmailPlaceholder } from "@/lib/email-placeholder";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = React.useState("");
  const [emailPlaceholder, setEmailPlaceholder] = React.useState("your@ready.com");

  React.useEffect(() => {
    setEmailPlaceholder(getRandomEmailPlaceholder());
  }, []);

  const handleDocusignSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(() => {
      signInAction("docusign");
    });
  };

  const handleEmailSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(() => {
      signInAction("email", email);
    });
  };

  return (
    <div className="flex flex-col gap-6 w-72">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Sign in to your account</h1>
      </div>

      <form
        onSubmit={handleEmailSignIn}
        className={cn("flex flex-col gap-6", className)}
        {...props}
      >
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder={emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Sending Link...
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          {/* Divider line */}
          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border"></div>
        </div>
      </form>

      <form onSubmit={handleDocusignSignIn} className="flex flex-col gap-6">
        <Button
          variant="outline"
          type="submit"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Signing In...
            </>
          ) : (
            <>
              Sign in with{" "}
              <Image
                src="/Docusign Horizontal Mono_Black.png"
                alt=""
                width="2500"
                height="504"
                className="h-5 w-auto"
              />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}