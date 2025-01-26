--
-- 1) Make sure we clean up old references (if they exist).
--    For example, if you had already created job_status or the old tables,
--    you might need to drop them carefully if you are re-running this from scratch.
--

DROP TYPE IF EXISTS job_status CASCADE;

--
-- 2) Recreate the job_status enum type in public
--

CREATE TYPE job_status AS ENUM (
    'queued',
    'running',
    'completed',
    'failed',
    'canceled',
    'retrying'
);

--
-- 3) Create reports table (public)
--    (Unchanged aside from dropping references to the old public.users)
--

CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_content TEXT,
    final_report JSONB,
    trace_back JSONB,
    version VARCHAR(50),
    status job_status DEFAULT 'queued',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--
-- 4) Create next_auth schema (if not exists) and its tables
--    (Keeping these definitions intact except possibly adapting the UUID function
--     to match your environment (gen_random_uuid vs. uuid_generate_v4).
--

CREATE SCHEMA IF NOT EXISTS next_auth;

GRANT USAGE ON SCHEMA next_auth TO service_role;
GRANT ALL ON SCHEMA next_auth TO postgres;


--
-- next_auth.users
--

CREATE TABLE IF NOT EXISTS next_auth.users
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text,
    first_name text,
    last_name text,
    email text,
    "emailVerified" timestamp with time zone,
    image text,
    docusign_access_token text,
    docusign_refresh_token text,
    docusign_access_token_expires_at timestamp with time zone,
    docusign_account_connected_at timestamp with time zone,
    docusign_sub text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT email_unique UNIQUE (email)
);

GRANT ALL ON TABLE next_auth.users TO postgres;
GRANT ALL ON TABLE next_auth.users TO service_role;

--
-- Helper function for RLS (if you use it)
--

CREATE FUNCTION next_auth.uid()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT
  	COALESCE(
		NULLIF(current_setting('request.jwt.claim.sub', true), ''),
		(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
	)::uuid
$$;

--
-- next_auth.sessions
--

CREATE TABLE IF NOT EXISTS next_auth.sessions
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    expires timestamp with time zone NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" uuid,
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessionToken_unique UNIQUE ("sessionToken"),
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES next_auth.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

GRANT ALL ON TABLE next_auth.sessions TO postgres;
GRANT ALL ON TABLE next_auth.sessions TO service_role;

--
-- next_auth.accounts
--

CREATE TABLE IF NOT EXISTS next_auth.accounts
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at bigint,
    token_type text,
    scope text,
    id_token text,
    session_state text,
    oauth_token_secret text,
    oauth_token text,
    "userId" uuid,
    CONSTRAINT accounts_pkey PRIMARY KEY (id),
    CONSTRAINT provider_unique UNIQUE (provider, "providerAccountId"),
    CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES next_auth.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

GRANT ALL ON TABLE next_auth.accounts TO postgres;
GRANT ALL ON TABLE next_auth.accounts TO service_role;

--
-- next_auth.verification_tokens
--

CREATE TABLE IF NOT EXISTS next_auth.verification_tokens
(
    identifier text,
    token text,
    expires timestamp with time zone NOT NULL,
    CONSTRAINT verification_tokens_pkey PRIMARY KEY (token),
    CONSTRAINT token_unique UNIQUE (token),
    CONSTRAINT token_identifier_unique UNIQUE (token, identifier)
);

GRANT ALL ON TABLE next_auth.verification_tokens TO postgres;
GRANT ALL ON TABLE next_auth.verification_tokens TO service_role;


--
-- 5) Create jobs table in public
--    (Merging the docusign_envelopes fields where relevant)
--
--    - docu_sign_account_id for "account_id"
--    - docu_sign_envelope_id for "envelope_id"
--    - user_id references next_auth.users (this can be the "sender_user_id")
--    - recipients JSONB can hold the multiple signer_name, signer_email,
--      signer_client_user_id, invite_id, etc.
--

CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,                   -- maps to sender_user_id (FK to next_auth.users)
    docu_sign_account_id VARCHAR(255),       -- maps to account_id
    docu_sign_envelope_id VARCHAR(255),      -- maps to envelope_id
    bucket_url VARCHAR(255),
    file_name VARCHAR(255),
    file_hash VARCHAR(255),
    recipients JSONB, -- holds multiple signers: [ { signer_name, signer_email, signer_client_user_id, invite_id }, ... ]
    send_at TIMESTAMP WITH TIME ZONE,
    errors JSONB,
    status job_status DEFAULT 'queued',
    report_id UUID,  -- Foreign key to reports
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES next_auth.users(id)
        ON DELETE NO ACTION,
    CONSTRAINT fk_report
        FOREIGN KEY (report_id)
        REFERENCES public.reports(id)
        ON DELETE SET NULL
);

--
-- Done.
--
-- If you have old data in `public.users` or `public.docusign_envelopes`,
-- you will need to manually migrate it into:
--    - next_auth.users
--    - public.jobs (particularly into the recipients JSON array).
--
