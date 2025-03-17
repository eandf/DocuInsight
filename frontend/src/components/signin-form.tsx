"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, Mail, FileText, ArrowLeft } from "lucide-react";
import { z } from "zod";
import {
  addToWaitlist,
  checkWaitlistApproval,
  checkEmailOnWaitlist,
} from "@/actions/util";
import { signInAction } from "@/actions/auth";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(1, "Name is required"),
  industry: z.string().optional(),
  linkedin: z.string().optional(),
  interest: z.string().optional(),
  questions: z.string().optional(),
});

export default function SigninForm() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);

  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [interest, setInterest] = useState("");
  const [questions, setQuestions] = useState("");
  const [isWaitlistSubmitting, setIsWaitlistSubmitting] = useState(false);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const checkEmailApproval = async (email: string) => {
    setIsLoading(true);
    try {
      const approved = await checkWaitlistApproval(email);
      setIsApproved(approved);

      if (!approved) {
        const onWaitlist = await checkEmailOnWaitlist(email);
        setIsOnWaitlist(onWaitlist);
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error("Error checking email status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && !isLoading) {
      checkEmailApproval(email);
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      formSchema.parse({
        email,
        name,
        industry,
        linkedin,
        interest,
        questions,
      });

      setIsWaitlistSubmitting(true);
      await addToWaitlist({
        name,
        email,
        survey_responses: {
          linkedinProfileUrl: linkedin,
          industry,
          interest,
          questions,
        },
      });

      setWaitlistSubmitted(true);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ form: "Something went wrong. Please try again." });
      }
    } finally {
      setIsWaitlistSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setShowWaitlistForm(false);
    setIsOnWaitlist(false);
    setEmail("");
    setName("");
    setIndustry("");
    setLinkedin("");
    setInterest("");
    setQuestions("");
    setWaitlistSubmitted(false);
    setErrors({});
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-2 p-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight">
          {showWaitlistForm ? "Join Our Waitlist" : "Welcome"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {!isSubmitted
            ? "Enter your email to continue"
            : isApproved
            ? "You're approved! Choose how to sign in"
            : isOnWaitlist
            ? "You're already on our waitlist"
            : showWaitlistForm
            ? "Be one of the first users of DocuInsight"
            : "You're not on our approved list yet"}
        </p>
      </div>
      <div className="p-6 pt-0">
        {!isSubmitted ? (
          <form onSubmit={handleInitialSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={!email || isLoading}
            >
              {isLoading ? "Checking..." : "Continue"}
            </Button>
          </form>
        ) : isApproved ? (
          <div className="space-y-3">
            <Button
              className="w-full flex items-center justify-center gap-2"
              variant="outline"
              onClick={() => signInAction("email", email)}
            >
              <Mail size={16} />
              Sign in with Email
            </Button>
            <Button
              className="w-full flex items-center justify-center gap-2"
              onClick={() => signInAction("docusign")}
            >
              <FileText size={16} />
              Sign in with DocuSign
            </Button>
          </div>
        ) : isOnWaitlist ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <p>
              {
                "You're already on our waitlist! We'll notify you when you're approved."
              }
            </p>
          </div>
        ) : showWaitlistForm ? (
          waitlistSubmitted ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <p>
                {"Thank you for joining our waitlist! We'll be in touch soon."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-muted"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full"
                  required
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="industry">Industry/Field</Label>
                <Input
                  id="industry"
                  type="text"
                  placeholder="Your industry or field"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full"
                />
                {errors.industry && (
                  <p className="text-sm text-destructive">{errors.industry}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="linkedin">
                  LinkedIn Profile URL (optional)
                </Label>
                <Input
                  id="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full"
                />
                {errors.linkedin && (
                  <p className="text-sm text-destructive">{errors.linkedin}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="interest">
                  Why are you interested in DocuInsight?
                </Label>
                <Textarea
                  id="interest"
                  placeholder="Tell us why you're interested..."
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className="w-full min-h-[80px]"
                />
                {errors.interest && (
                  <p className="text-sm text-destructive">{errors.interest}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="questions">
                  Any questions for us? (optional)
                </Label>
                <Textarea
                  id="questions"
                  placeholder="Any questions you have..."
                  value={questions}
                  onChange={(e) => setQuestions(e.target.value)}
                  className="w-full min-h-[80px]"
                />
                {errors.questions && (
                  <p className="text-sm text-destructive">{errors.questions}</p>
                )}
              </div>

              {errors.form && (
                <p className="text-sm text-destructive">{errors.form}</p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-1"
                  onClick={() => setShowWaitlistForm(false)}
                >
                  <ArrowLeft size={16} />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isWaitlistSubmitting}
                >
                  {isWaitlistSubmitting ? "Submitting..." : "Join Waitlist"}
                </Button>
              </div>
            </form>
          )
        ) : (
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => setShowWaitlistForm(true)}
          >
            Join Waitlist
          </Button>
        )}
      </div>
      <div className="flex justify-center p-6 pt-0">
        {isSubmitted && !showWaitlistForm && (
          <div className="flex justify-center">
            {isApproved ? (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="mr-1" size={16} />
                Your email is approved
              </div>
            ) : (
              <Button
                variant="link"
                className="text-sm p-0"
                onClick={resetForm}
              >
                Try a different email
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
