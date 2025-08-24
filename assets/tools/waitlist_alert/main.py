from supabase import create_client
from dotenv import load_dotenv
import logging
import resend
import time
import json
import os

ROOT_DIR_PATH = os.path.dirname(os.path.abspath(__file__))

log_file = os.path.join(ROOT_DIR_PATH, "state.log")
logging.basicConfig(
    filename=log_file,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

load_dotenv(dotenv_path=os.path.join(ROOT_DIR_PATH, ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
ALERT_EMAIL = os.getenv("ALERT_EMAIL")
COUNT_FILE = os.path.join(ROOT_DIR_PATH, "count.txt")
resend.api_key = RESEND_API_KEY


def get_waitlist_count():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    resp = supabase.table("waitlist").select("id").execute()
    count = len(resp.data) if resp.data else 0
    logging.info(f"Fetched waitlist count: {count}")
    return count


def get_saved_count():
    if not os.path.exists(COUNT_FILE):
        logging.info("No saved count found.")
        return None
    with open(COUNT_FILE, "r") as f:
        count = int(f.read().strip())
    logging.info(f"Loaded saved count: {count}")
    return count


def save_count(count):
    with open(COUNT_FILE, "w") as f:
        f.write(str(count))
    logging.info(f"Saved new count: {count}")


def send_email(new_count):
    params = {
        "from": "DocuInsight <noreply@docuinsight.ai>",
        "to": [ALERT_EMAIL],
        "subject": f"DocuInsight Waitlist Updated: {new_count}",
        "html": f"DocuInsight's waitlist count has increased to {new_count} as of {time.time()} seconds",
    }
    resend.Emails.send(params)
    logging.info(f"Sent email notification for new count: {new_count}")


if __name__ == "__main__":
    try:
        count = get_waitlist_count()
        old_count = get_saved_count()
        if old_count is None or count != old_count:
            send_email(count)
            save_count(count)
        else:
            logging.info("No change in waitlist count. No action taken.")
    except Exception as e:
        logging.error(f"Exception occurred: {e}", exc_info=True)
