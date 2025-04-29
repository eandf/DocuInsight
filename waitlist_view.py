# NOTE: the goal of this script is to get a quick overview of the waitlist table for DocuInsight

from supabase import create_client, Client
from datetime import datetime, timezone
from dotenv import load_dotenv
from dateutil import parser
import logging
import time
import json
import os


# underline text for printing
def underline(text):
    UNDERLINE = "\033[4m"
    END = "\033[0m"
    return f"{UNDERLINE}{text}{END}"


# suppress supabase's nosiy logging
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("supabase_py").setLevel(logging.WARNING)

# load env variables
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "analyzer", ".env")
load_dotenv(dotenv_path=env_path)

# main function calls
if __name__ == "__main__":
    start_time = time.time()

    # grab all rows from waitlist table
    supabase: Client = create_client(
        os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY")
    )
    resp = supabase.table("waitlist").select("*").execute()
    waitlist = resp.data if resp.data else []

    # get latest created_at value from the table's content
    latest_created_epoch = -1
    latest_created_timestamp = "?"
    for entry in waitlist:
        dt = parser.isoparse(entry["created_at"])
        epoch_secs = dt.timestamp()
        if epoch_secs > latest_created_epoch:
            latest_created_epoch = epoch_secs
            latest_created_timestamp = entry["created_at"]

    # get current UTC timestamp real time
    timestamp_utc = datetime.now(timezone.utc).isoformat()

    runtime = time.time() - start_time

    # print results
    print(underline(f"CURRENT DATE:"))
    print(f"{timestamp_utc} UTC")
    print()
    print(underline(f"RUNTIME:"))
    print(f"{runtime} seconds")
    print()
    print(underline(f"WAITLIST TABLE ENTRIES:"))
    print(json.dumps(waitlist, indent=4))
    print()
    print(underline(f"LATEST CREATED AT:"))
    print(latest_created_timestamp)
    print()
    print(underline(f"TOTAL WAITLIST ENTRIES:"))
    print(len(waitlist))
