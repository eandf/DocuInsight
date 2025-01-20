from supabase import create_client, Client
import json
import os

"""
--- Drop the enum type after dropping tables that use it
DROP TYPE IF EXISTS job_status;

-- Recreate the job status enum
CREATE TYPE job_status AS ENUM (
    'queued',
    'running',
    'completed',
    'failed',
    'canceled',
    'retrying'
);

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    given_name VARCHAR(255),
    family_name VARCHAR(255),
    sub VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    docu_sign_account_id VARCHAR(255),
    docu_sign_template_id VARCHAR(255),
    bucket_url VARCHAR(255),
    file_name VARCHAR(255),
    file_hash VARCHAR(255),
    report_id UUID UNIQUE,
    report_generated BOOLEAN DEFAULT FALSE,
    signing_url VARCHAR(255),
    recipients JSONB,
    send_at TIMESTAMP WITH TIME ZONE,
    errors JSONB,
    status job_status DEFAULT 'queued',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID UNIQUE,
    contract_content TEXT,
    final_report JSONB,
    trace_back JSONB,
    version VARCHAR(50),
    status job_status DEFAULT 'queued',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_job FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- Add the foreign key constraint to jobs table for report_id
ALTER TABLE jobs
ADD CONSTRAINT fk_report FOREIGN KEY (report_id) REFERENCES reports(id);
"""

# Initialize the Supabase client
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)


def get_jobs_by_status():
    try:
        # Query the 'jobs' table for specific statuses
        response = (
            supabase.table("jobs")
            .select("*")
            .in_("status", ["queued", "failed", "retrying"])
            .execute()
        )
        # Check if data is present in the response
        if response.data:
            return response.data
        else:
            print("No matching jobs found.")
            return []
    except Exception as e:
        print(f"An error occurred while fetching jobs: {e}")
        return []


# Fetch jobs with the specified statuses
jobs = get_jobs_by_status()
print(json.dumps(jobs, indent=4))
