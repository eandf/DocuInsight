from datetime import datetime
from typing import Dict, Any
import threading
import traceback
import requests
import logging
import time
import uuid
import json
import time
import sys
import os

from concurrent.futures import ThreadPoolExecutor, as_completed
from requests.packages.urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
import pytz

from supabase import create_client, Client
from dotenv import load_dotenv
from openai import OpenAI

import o_agent
import mail


# load environment variables which should be in the same directory as this script
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path)

# global variables
supabase: Client = None
DISCORD_SERVER_ALERT_WEBHOOK = None
_worker_ids = {}

# logging setup - configure overall logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# logging setup - configure log file location
log_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "analyzer.log")
file_handler = logging.FileHandler(log_file_path)
file_handler.setLevel(logging.INFO)

# logging setup - configure logger to also output to console
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.DEBUG)

# logging setup - configure each logs' formatting
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)
logger.addHandler(file_handler)
logger.addHandler(console_handler)


def get_worker_id():
    """
    Assigns and returns a unique ID (short, random) for each worker (thread).
    """
    tid = threading.get_ident()
    if tid not in _worker_ids:
        _worker_ids[tid] = f"W-{uuid.uuid4().hex[:6]}"
    return _worker_ids[tid]


def send_alert(message: str):
    """
    Sends an alert message (Discord channel, etc.) via webhook
    """
    global DISCORD_SERVER_ALERT_WEBHOOK
    url = DISCORD_SERVER_ALERT_WEBHOOK
    headers = {"Content-Type": "application/json"}
    data = {"content": message}

    try:
        retry_strategy = Retry(
            total=3,
            status_forcelist=list(range(400, 600)),
            allowed_methods=["POST"],
            backoff_factor=1,
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        http = requests.Session()
        http.mount("https://", adapter)

        response = http.post(url, json=data, headers=headers, timeout=5)
        if response.status_code != 204:
            raise Exception(
                f"Failed to send message with status code: {response.status_code}"
            )
    except Exception as e:
        error_trace = traceback.format_exception(
            etype=type(e), value=e, tb=e.__traceback__
        )
        logger.error(f"Failed to send alert due to error: {error_trace}")


def retry_operation(operation_name: str, func, max_retries=3, delay=2, *args, **kwargs):
    """
    Retry a function up to `max_retries` times with `delay` seconds in between.
    If it fails all attempts, the exception is propagated.
    """
    worker_id = get_worker_id()
    for attempt in range(max_retries):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.warning(
                f"[{worker_id}] {operation_name} failed on attempt {attempt+1} of {max_retries}. "
                f"Error: {type(e).__name__} - {e}"
            )
            if attempt < max_retries - 1:
                time.sleep(delay)
            else:
                raise


def fail_job(worker_id: str, job_id: str, error_message: str, trace_back: dict):
    """
    Mark a job as failed, log the error in the jobs.errors column, and
    store the traceback in the reports table if applicable. Also send an alert.
    """
    logger.error(f"[{worker_id}] Failing Job {job_id}: {error_message}")

    # 1. update job to 'failed' with errors
    combined_errors = {"error_message": error_message}
    try:
        response = (
            supabase.table("jobs")
            .update({"status": "failed", "errors": combined_errors})
            .eq("id", job_id)
            .execute()
        )

        logger.info(f"[{worker_id}] Result of failing job {job_id}: {response.data}")
        if not response.data:
            logger.error(
                f"[{worker_id}] No data returned when updating job status to 'failed'."
            )
    except Exception as e:
        logger.error(
            f"[{worker_id}] Failed to update job to 'failed' for job_id {job_id} due to: {e}"
        )

    # 2. if we know the report_id from trace_back, update its trace_back
    report_id = trace_back.get("report_id")
    if report_id:
        try:
            resp = (
                supabase.table("reports")
                .update({"trace_back": trace_back})
                .eq("id", report_id)
                .execute()
            )
            logger.info(
                f"[{worker_id}] Result of updating reports.trace_back: {resp.data}"
            )
            if not resp.data:
                logger.error(
                    f"[{worker_id}] No data returned when updating reports.trace_back for report {report_id}."
                )
        except Exception as e:
            logger.error(
                f"[{worker_id}] Failed to update 'reports.trace_back' for report {report_id}: {e}"
            )

    # 3. send alert to the team
    try:
        send_alert(f"Job failed (ID: {job_id}). Reason: {error_message}")
    except Exception as e:
        logger.error(
            f"[{worker_id}] Failed to send alert message for job {job_id}: {e}"
        )


def create_signed_url(bucket_name: str, file_path: str, expires_in=60):
    """
    Creates a signed URL from Supabase Storage.
    This method returns a dict-like object with the "signedURL" key.
    """
    worker_id = get_worker_id()
    response = supabase.storage.from_(bucket_name).create_signed_url(
        file_path, expires_in
    )

    logger.info(
        f"[{worker_id}] Result of create_signed_url for bucket [{bucket_name}] file_path [{file_path}]: {response}"
    )

    # response is typically a dict containing "signedURL" and possibly "error" if there's an error
    if "error" in response and response["error"]:
        raise Exception(f"Error creating signed URL: {response['error']}")
    return response.get("signedURL")


def download_bucket_file(bucket_name: str, file_path: str, destination_path: str):
    """
    Downloads a file from Supabase Storage using the generated signed URL.
    """
    worker_id = get_worker_id()
    signed_url = create_signed_url(bucket_name, file_path)
    if not signed_url:
        raise Exception("Failed to generate signed URL.")
    resp = requests.get(signed_url)
    if resp.status_code == 200:
        with open(destination_path, "wb") as file:
            file.write(resp.content)
        logger.info(
            f"[{worker_id}] Successfully downloaded file to {destination_path}."
        )
    else:
        raise Exception(f"Failed to download file. Status code: {resp.status_code}")


def delete_bucket_file(document: dict):
    worker_id = get_worker_id()
    # remove file in supabase bucket
    storage_response = supabase.storage.from_("contracts").remove(
        [document["file_name"]]
    )

    logger.info(
        f"[{worker_id}] Result of removing file from 'contracts': {storage_response}"
    )

    # if there's no error key, we assume success, else check
    if "error" in storage_response and storage_response["error"]:
        raise Exception(
            f"Error deleting file from storage: {storage_response['error']}"
        )

    # delete the document row from the database
    db_response = (
        supabase.table("documents").delete().eq("id", document["id"]).execute()
    )
    logger.info(
        f"[{worker_id}] Result of deleting document from DB: {db_response.data}"
    )
    if not db_response.data:
        raise Exception("Error: No data returned when deleting document from DB.")


from supabase.lib.client_options import ClientOptions


def get_jobs_with_users_by_status():
    """
    Fetch jobs with statuses 'queued', 'failed', or 'retrying',
    and include user information for each job.
    """

    worker_id = get_worker_id()
    try:
        # Fetch jobs with specified statuses
        job_response = (
            supabase.table("jobs")
            .select("*")
            .in_("status", ["queued", "failed", "retrying"])
            .execute()
        )
        logger.info(f"[{worker_id}] Result of fetching jobs: {job_response.data}")

        if not job_response.data:
            logger.info(f"[{worker_id}] No jobs found with the specified statuses.")
            return []

        jobs = job_response.data
        user_ids = list({job["user_id"] for job in jobs if "user_id" in job})

        if user_ids:
            # NOTE: (1-25-2025) Supabase's python SDK is dumb and requires you to setup a new client for a different schema
            supabase_auth_schema_client = create_client(
                supabase_url=os.getenv("SUPABASE_URL"),
                supabase_key=os.getenv("SUPABASE_SERVICE"),
                options=ClientOptions(schema="next_auth"),
            )

            user_response = (
                supabase_auth_schema_client.table("users")
                .select(
                    "id, name, first_name, last_name, email, emailVerified, created_at, updated_at"
                )
                .in_("id", user_ids)
                .execute()
            )

            logger.info(f"[{worker_id}] Result of fetching users: {user_response.data}")

            if user_response.data:
                user_map = {u["id"]: u for u in user_response.data}
                for job in jobs:
                    job["user"] = user_map.get(job["user_id"])
        return jobs
    except Exception as e:
        logger.error(
            f"[{worker_id}] An error occurred while fetching jobs and users: {e}"
        )
        return []
    finally:
        if (
            "supabase_auth_schema_client" in locals()
            or "supabase_auth_schema_client" in globals()
        ):
            del supabase_auth_schema_client


def get_contract_pdf(file_bucket_url: str, root_destination_dir="."):
    """
    Retrieves (downloads) the contract PDF if it's not already present.
    Uses retry logic for the download.
    """
    worker_id = get_worker_id()
    try:
        url_parts = file_bucket_url.split("/")
        bucket_name = url_parts[-3]
        file_path = "/".join(url_parts[-2:])
        destination_path = os.path.join(root_destination_dir, url_parts[-1])
        if not os.path.exists(destination_path):
            retry_operation(
                operation_name="download_bucket_file",
                func=download_bucket_file,
                max_retries=3,
                delay=2,
                bucket_name=bucket_name,
                file_path=file_path,
                destination_path=destination_path,
            )
        return True
    except Exception as e:
        logger.error(f"[{worker_id}] Failed to get contract PDF: {e}")
        return False


def update_jobs_table(job_id: str, updated_values: dict):
    """
    Updates a job record with the specified key-values if they're valid.
    Logs and returns the final result.
    """
    worker_id = get_worker_id()
    try:
        valid_updatable_columns = [
            "report_id",
            "report_generated",
            "send_at",
            "errors",
            "status",
        ]
        filtered = {
            k: v for k, v in updated_values.items() if k in valid_updatable_columns
        }
        if not filtered:
            raise ValueError("No valid fields provided for job update.")

        response = supabase.table("jobs").update(filtered).eq("id", job_id).execute()
        logger.info(f"[{worker_id}] Result of updating jobs table: {response.data}")
        if not response.data:
            raise Exception("No data returned when updating jobs table.")
        return response
    except Exception as e:
        error_msg = f"update_jobs_table() failed: {str(e)}"
        logger.error(f"[{worker_id}] {error_msg}")
        return {"error": error_msg}


def create_report(report_id: str, new_report_data: dict):
    """
    If report_id is provided, attempt to fetch that report.
    If it doesn't exist, create a new 'reports' record.
    Logs the result.
    Returns either the existing or newly created report as a dict.
    """
    worker_id = get_worker_id()
    try:
        if report_id:
            existing_report_response = (
                supabase.table("reports").select("*").eq("id", report_id).execute()
            )
            logger.info(
                f"[{worker_id}] Result of selecting existing report {report_id}: {existing_report_response.data}"
            )
            if existing_report_response.data:
                return existing_report_response.data[0]

        valid_columns = [
            "contract_content",
            "final_report",
            "trace_back",
            "version",
            "status",
        ]
        filtered_data = {k: v for k, v in new_report_data.items() if k in valid_columns}
        if not filtered_data:
            raise ValueError("No valid columns provided for creating a report.")

        response = supabase.table("reports").insert(filtered_data).execute()
        logger.info(f"[{worker_id}] Result of inserting new report: {response.data}")
        if not response.data:
            raise Exception("No data returned when creating new report.")

        return response.data[0]
    except Exception as err:
        err_msg = f"create_report() failed: {str(err)}"
        logger.error(f"[{worker_id}] {err_msg}")
        return {"error": err_msg}


def update_report(report_id: str, updated_values: dict):
    """
    Updates a 'reports' record with the specified key-values if they're valid.
    Logs the result.
    """
    worker_id = get_worker_id()
    try:
        valid_updatable_columns = [
            "contract_content",
            "final_report",
            "trace_back",
            "version",
            "status",
        ]
        filtered_data = {
            k: v for k, v in updated_values.items() if k in valid_updatable_columns
        }
        if not filtered_data:
            raise ValueError("No valid columns to update in report.")

        response = (
            supabase.table("reports")
            .update(filtered_data)
            .eq("id", report_id)
            .execute()
        )
        logger.info(
            f"[{worker_id}] Result of updating report {report_id}: {response.data}"
        )
        if not response.data:
            raise Exception("No data returned when updating report.")
        return response
    except Exception as e:
        err_msg = f"update_report() failed: {str(e)}"
        logger.error(f"[{worker_id}] {err_msg}")
        return {"error": err_msg}


def process_single_job(
    worker_id: str,
    job: dict,
    openai_client: OpenAI,
    prices: dict,
    big_model_name: str,
    small_model_name: str,
):
    """
    Processes a single job from 'queued_jobs' in a production-ready manner.
    - Creates/fetches a report
    - Downloads contract PDF
    - Runs analysis via o_agent
    - Updates the report
    - Sends emails
    - Marks the job 'completed'
    On error, fails the job with a stored traceback and alert.
    """
    job_id = job["id"]

    # traceback logic handler
    trace_back = {"job_id": job_id, "worker_id": worker_id, "steps": []}

    def _trace(msg: str, data: Any = None):
        step_info = {
            "timestamp": str(datetime.now(pytz.utc)),
            "message": f"[{worker_id}] {msg}",
        }
        if data is not None:
            step_info["data"] = data
        trace_back["steps"].append(step_info)
        logger.info(step_info["message"])

    try:
        _trace(f"Beginning processing for job {job_id}.")

        # create or fetch a report record
        _trace("Creating or fetching report for this job.")
        new_report_entry = create_report(
            job.get("report_id"),  # NOTE: this value might be None
            {"version": "0.0.0", "status": "queued"},
        )
        if isinstance(new_report_entry, dict) and "error" in new_report_entry:
            raise Exception(
                f"Unable to create/fetch report: {new_report_entry['error']}"
            )

        report_id = new_report_entry["id"]
        trace_back["report_id"] = report_id

        # download contract PDF
        _trace("Downloading contract PDF if not present.")
        pdfs_directory = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "pdfs"
        )
        os.makedirs(pdfs_directory, exist_ok=True)

        got_pdf = get_contract_pdf(job["bucket_url"], pdfs_directory)
        if not got_pdf:
            raise Exception("Failed to retrieve contract PDF.")

        local_file_path = os.path.join(pdfs_directory, job["file_name"])
        if not os.path.exists(local_file_path):
            raise Exception("Contract PDF still does not exist locally after download.")

        # create config for OAgent
        config = o_agent.OAgentConfig(
            big_model=big_model_name,
            small_model=small_model_name,
            document_type="UNKNOWN",
            specific_concerns="UNKNOWN",
            last_cost_values_set_date="January 20, 2025",
            prices=prices,
        )

        # run analysis
        _trace("Running contract analysis via OAgent.")
        oagent = o_agent.OAgent(openai_client=openai_client, config=config)
        output = oagent.run(contract_path=local_file_path)
        if output.get("error"):
            raise Exception(f"OAgent error: {output['error']}")

        # Update report
        _trace("Updating report with final analysis data.")
        report_update_resp = update_report(
            report_id,
            {
                "final_report": output["report"],
                "status": "completed",
                "contract_content": output["contract_content"],
            },
        )
        if isinstance(report_update_resp, dict) and "error" in report_update_resp:
            raise Exception(f"Error updating report: {report_update_resp['error']}")

        # Send emails
        recipients = job.get("recipients", [])
        if recipients:
            for recipient in recipients:
                try:
                    if not isinstance(recipient, dict):
                        raise ValueError(
                            f"Recipient data is not a dictionary: {recipient}"
                        )

                    def send_email_and_return():
                        return mail.send_document_review_email(
                            sender_name=job["user"]["name"],
                            sender_email=job["user"]["email"],
                            recipient_name=recipient["name"],
                            recipient_email=[recipient["email"]],
                            document_link=recipient["signing_url"],
                            document_message="Please review and sign this document using DocuInsight.",
                            signature_line=job["user"]["name"],
                            email_from_name="DocuInsight",
                            from_email_address="noreply@docuinsight.ai",
                            action_description="sent you a document to review and sign",
                            button_text="REVIEW DOCUMENT",
                        )

                    email_resp = retry_operation(
                        operation_name="Send Email",
                        func=send_email_and_return,
                        max_retries=3,
                        delay=2,
                    )
                    _trace(
                        f"Email successfully sent to {recipient['email']}.",
                        data=email_resp,
                    )
                except Exception as e:
                    _trace(
                        f"Failed to send email to {recipient.get('email', 'unknown')}: {e}"
                    )
        else:
            _trace("No recipients found for this job, skipping email sending.")

        # Mark job as 'completed'
        _trace("Updating job status to 'completed'.")
        job_update_result = update_jobs_table(
            job_id=job_id,
            updated_values={
                "status": "completed",
                "send_at": str(datetime.now(pytz.utc)),
                "errors": {},
                "report_id": report_id,
            },
        )
        if isinstance(job_update_result, dict) and "error" in job_update_result:
            raise Exception(f"Error updating job: {job_update_result['error']}")

        # Final trace update
        trace_back["final_state"] = "completed"
        _trace("Saving final trace_back to the report.")
        final_trace_resp = update_report(report_id, {"trace_back": trace_back})
        if isinstance(final_trace_resp, dict) and "error" in final_trace_resp:
            raise Exception(
                f"Error updating trace_back in report: {final_trace_resp['error']}"
            )

        _trace(f"Job {job_id} completed successfully.")

    except Exception as e:
        # If an error happens at any point, fail the job and store partial trace
        trace_back["final_state"] = "failed"
        error_trace = traceback.format_exception(type(e), e, e.__traceback__)
        logger.error(f"[{worker_id}] An error occurred: {error_trace}")

        # Provide error details in the 'fail_job'
        fail_job(worker_id, job_id, str(e), trace_back)


def manager(
    max_workers=None,
    openai_api_key=None,
    supabase_url=None,
    supabase_key=None,
    discord_webhook_url=None,
    prices=None,
    big_model=None,
    small_model=None,
):
    """
    Parameters:
      - max_workers: number of threads to use
      - openai_api_key: key for OpenAI
      - supabase_url: URL for Supabase
      - supabase_key: key for Supabase
      - discord_webhook_url: webhook for Discord alerts
      - prices: dictionary of model pricing
    """

    if openai_api_key is None:
        openai_api_key = os.getenv("OPENAI_API_KEY")
    if supabase_url is None:
        supabase_url = os.getenv("SUPABASE_URL")
    if supabase_key is None:
        supabase_key = os.getenv("SUPABASE_KEY")
    if discord_webhook_url is None:
        discord_webhook_url = os.getenv("DISCORD_SERVER_ALERT_WEBHOOK")
    if prices is None:
        raise Exception("Model prices data not provided")
    if big_model is None:
        raise Exception("Big model name not provided")
    if small_model is None:
        raise Exception("Small model name not provided")

    # Set globals
    global supabase
    supabase = create_client(supabase_url, supabase_key)

    global DISCORD_SERVER_ALERT_WEBHOOK
    DISCORD_SERVER_ALERT_WEBHOOK = discord_webhook_url

    worker_id = "[MAIN]"  # For main logs, just use a static placeholder

    logger.info(f"{worker_id} Starting job processor...")

    # Create fresh client instances for each thread to avoid sharing locks
    def create_job_processing_function(job):
        # Each thread will get its own worker_id upon entering the function:
        w_id = get_worker_id()
        local_openai_client = OpenAI(api_key=openai_api_key)
        return process_single_job(
            w_id,
            job,
            local_openai_client,
            prices,
            big_model,
            small_model,
        )

    queued_jobs = get_jobs_with_users_by_status()
    if not queued_jobs:
        logger.info(f"{worker_id} No jobs pending.")
        return

    # Use provided max_workers or default to minimum of 8 and job count
    workers = max_workers or min(8, len(queued_jobs))

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(create_job_processing_function, job): job
            for job in queued_jobs
        }

        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                logger.error(f"{worker_id} Job processing failed: {e}")


if __name__ == "__main__":
    manager(
        # NOTE: A practical range is between 10 and 16 workers, balancing CPU-intensive operations with I/O-bound tasks
        max_workers=int((16 + 10) / 2),
        big_model="o1-preview",
        small_model="gpt-4o-mini",
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        supabase_url=os.getenv("SUPABASE_URL"),
        supabase_key=os.getenv("SUPABASE_KEY"),
        discord_webhook_url=os.getenv("DISCORD_SERVER_ALERT_WEBHOOK"),
        prices={
            "openai": {
                "gpt-4o": {"input": 2.5, "output": 10},
                "gpt-4o-mini": {"input": 0.15, "output": 0.6},
                "o1": {"input": 15, "output": 60},
                "o1-preview": {"input": 15, "output": 60},
                "o1-mini": {"input": 3, "output": 12},
            }
        },
    )
