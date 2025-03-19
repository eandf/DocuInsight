from concurrent.futures import ThreadPoolExecutor, as_completed
from requests.packages.urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
from dotenv import load_dotenv
import traceback
import requests
import os

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.env"))


def send_alert(message: str):
    """
    Sends an alert message (Discord channel, etc.) via webhook
    """
    if (
        "DISCORD_SERVER_ALERT_WEBHOOK" not in os.environ
        or "https://discord.com/api/webhooks/"
        not in str(os.getenv("DISCORD_SERVER_ALERT_WEBHOOK"))
    ):
        print(
            f"DISCORD_SERVER_ALERT_WEBHOOK environment variable is NOT defined; printing instead of sending an alert now send_alert() basic print: {message}"
        )
        return

    url = os.getenv("DISCORD_SERVER_ALERT_WEBHOOK")
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
        print(f"Failed to send alert due to error: {error_trace}")


# main function calls

msg = input("Test Message: ")
send_alert(msg)
