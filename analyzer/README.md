# Analyzer

## About

The Analyzer is a backend component of the DocuInsight project, designed to process and extract insights from legal contracts. Built using Python, it leverages the advanced capabilities of OpenAI’s API, specifically the o1-preview model, to analyze legal documents and identify critical clauses, potential risks, and key commitments. The Analyzer accesses and interacts with the project’s database, hosted on Supabase, to retrieve and store analysis results. It employs tools like PyMuPDF, openpyxl, and python-docx to handle various file formats, such as PDFs and Word documents. Additionally, it uses the Resend API to send emails, primarily for notifying users about contract signing requirements, and supports Discord webhooks for real-time alerts on critical issues. The Analyzer operates on a Linode instance running Ubuntu, ensuring reliable performance and integration with the overall DocuInsight platform.

## Setup

1. Refer to the ".env_template" file ot see what environment variables you need for Analyzer to run correctly. Create a ".env" file with all the environment variables and API keys, listed in the ".env_template" file. You will need the following API keys:

   - [OPENAI_API_KEY](https://platform.openai.com/): This API key is used to query OpenAI's LLM model(s)
   - [RESEND_API_KEY](https://resend.com/): This API is used to send emails
   - [SUPABASE_KEY](https://supabase.com/): This API key is needed to access the database hosted on Supabase
   - [SUPABASE_URL](https://supabase.com/): This API key is needed to access the database hosted on Supabase
   - [SUPABASE_SERVICE](https://supabase.com/): This API key is needed to access the database hosted on Supabase
   - [DISCORD_SERVER_ALERT_WEBHOOK](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks): This ke-value is used to easily send messages to a Discord server of your choice for real time alerting/messaging of critical issues

2. (optional) This project supports alerting for any critical errors though Discord messages. You don't have to use this, the code accounts for this. But if you do want to use this feature, do the following:

   - Create a [Discord](https://discord.com/) account
   - Create a Discord server
   - Follow [these steps](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks) to get your Discord server's webhook
   - Add the webhook value to the "DISCORD_SERVER_ALERT_WEBHOOK" environment variable

3. Make sure [python & pip](https://www.python.org/) are installed on your system. They should be. Then run this command to install all python dependencies for this project:

   ```bash
   pip3 install -r requirements.txt
   ```

4. After ALL of this, to run the Analyzer, run this command locally:

   ```bash
   bash ./analyzer.sh &
   ```

5. To check the status of the Analyzer, like latest log details and if it's running or not, run this command:

   ```
   bash ./checkup.sh
   ```

6. (optional) If you want to deploy this project to the cloud, do the following:

   1. If you are running the Analyzer already locally, kill it. To do this, run the following commands:

      ```bash
      # get the Analyzer's PID value
      bash ./checkup.sh

      # kill the PID value for "analyzer.sh"
      kill -9 <pid_value>
      ```

   2. For a cloud solution, I recommend using Linode because it's easy and it works. Create a [Linode](https://www.linode.com/pricing/) account. Then select one of their "Dedicated CPU" or "Shared CPU" plans and deploy the node using Ubuntu. And install clone the code for Analzyer and install it as listed in the instructions above. In regards to the plan I recommend getting a plan with a 16 GB plan, with 16 GB of RAM, and 8 "CPUs" which will cost between $96 to $288 per month.

   3. You can access this Linode instance using [ssh](https://en.wikipedia.org/wiki/Secure_Shell) or though [Linode's Website/App](https://www.linode.com/).
