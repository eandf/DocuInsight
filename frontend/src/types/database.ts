import { LegalReviewData } from "./report";

export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "canceled"
  | "retrying";

export interface Report {
  id: string;
  contract_content: string | null;
  final_report: LegalReviewData;
  trace_back: unknown;
  version: string | null;
  status: JobStatus;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  docusign_access_token: string | null;
  docusign_refresh_token: string | null;
  docusign_access_token_expires_at: Date | null;
  docusign_account_connected_at: Date | null;
  docusign_sub: string | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface Session {
  id: string;
  expires: Date;
  sessionToken: string;
  userId: string | null;
}

export interface Account {
  id: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
  oauth_token_secret: string | null;
  oauth_token: string | null;
  userId: string | null;
}

export interface VerificationToken {
  identifier: string;
  token: string;
  expires: Date;
}

export interface JobRecipient {
  name: string;
  email: string;
  clientUserId: string;
  inviteId: string;
  signing_url: string;
}

export interface Job {
  id: string;
  user_id: string;
  docu_sign_account_id: string | null;
  docu_sign_envelope_id: string | null;
  bucket_url: string | null;
  file_name: string | null;
  file_hash: string | null;
  recipients: JobRecipient[] | null;
  send_at: Date | null;
  errors: unknown;
  status: JobStatus;
  report_id: string | null;
  created_at: Date;
  updated_at: Date;
}
