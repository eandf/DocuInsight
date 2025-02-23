"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { Spinner } from "@/components/spinner";
import { signInAction } from "@/actions/auth";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(() => {
      signInAction();
    });
  };

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      {...props}
      onSubmit={handleSubmit}
    >
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
  );
}
