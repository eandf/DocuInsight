"use server";

import { createClient } from "@/utils/supabase/server";
import type { WaitlistEntry, WaitlistSurveyResponse } from "@/types/database";

export async function addToWaitlist({
  name,
  email,
  survey_responses,
}: {
  name: string;
  email: string;
  survey_responses: WaitlistSurveyResponse;
}) {
  const supabase = await createClient();

  const { error } = await supabase.schema("public").from("waitlist").upsert({
    name,
    email,
    survey_responses: survey_responses,
    approved: false,
  });

  if (error) {
    console.error("error adding to waitlist:", error);
  }
}

export async function isOnWaitlist(email: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("waitlist")
    .select("id")
    .eq("email", email)
    .single();

  if (error) {
    console.error(`Error checking waitlist approval for ${email}:`, error);
    return false;
  }

  return !!data;
}

export async function checkEmailOnWaitlist(email: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("waitlist")
    .select("*")
    .eq("email", email)
    .single();

  if (error) {
    console.error(`Error checking waitlist approval for ${email}:`, error);
    return false;
  }

  return !!data;
}

export async function checkWaitlistApproval(email: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("waitlist")
    .select("*")
    .eq("email", email)
    .single();

  if (error) {
    console.error(`Error checking waitlist approval for ${email}:`, error);
    return false;
  }

  console.log(!!data && (data as WaitlistEntry).approved);
  return !!data && (data as WaitlistEntry).approved;
}
