# Analyzer

## About

The **Analyzer** is a backend component of the **DocuInsight** project, designed to process and extract insights from legal contracts. Developed in Python, it utilizes the advanced capabilities of OpenAI's API (o1-preview model) to analyze legal documents, identifying critical clauses, potential risks, and key commitments.

The Analyzer integrates seamlessly with the project's database, hosted on **Supabase**, to retrieve and store analysis results. It also supports handling various file formats (e.g., PDFs, Word documents) through tools like **PyMuPDF**, **openpyxl**, and **python-docx**. For notifications, the Analyzer employs the **Resend API** to send emails (e.g., contract signing reminders) and **Discord webhooks** for real-time alerts on critical issues.

The system runs reliably on a **Linode instance** with Ubuntu, ensuring high performance and seamless integration within the broader DocuInsight platform.

## Setup

### 1. Environment Variables

To get started, configure the required environment variables. Use the `.env_template` file as a reference to create your `.env` file, populating it with the necessary API keys:

- **[OPENAI_API_KEY](https://platform.openai.com/):** For querying OpenAI's LLM model(s).
- **[RESEND_API_KEY](https://resend.com/):** For sending email notifications.
- **[SUPABASE_KEY](https://supabase.com/):** For accessing the database on Supabase.
- **[SUPABASE_URL](https://supabase.com/):** The URL for the Supabase database.
- **[SUPABASE_SERVICE](https://supabase.com/):** Service-specific key for Supabase database access.
- **[DISCORD_SERVER_ALERT_WEBHOOK](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks):** Webhook URL for sending real-time Discord alerts (optional).

### 2. (Optional) Enabling Discord Alerts

The Analyzer supports Discord-based real-time alerts for critical issues. To enable this:

1. Create a [Discord](https://discord.com/) account and server.
2. Set up a webhook by following [these steps](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks).
3. Add the webhook URL to the `DISCORD_SERVER_ALERT_WEBHOOK` variable in the `.env` file.

This step is optional; the Analyzer will work without Discord alerts.

### 3. Install Dependencies

Ensure **Python** and **pip** are installed on your system. Then, install the required dependencies by running:

```bash
pip3 install -r requirements.txt
```

### 4. Running the Analyzer Locally

To start the Analyzer locally, run:

```bash
bash ./analyzer.sh &
```

### 5. Checking Status

To view the Analyzer's status, including logs and whether it's running, use:

```bash
bash ./checkup.sh
```

## Deployment (Optional)

To deploy the Analyzer on the cloud:

### Step 1: Stop the Local Instance

If the Analyzer is running locally, stop it:

```bash
# Get the PID of the Analyzer
bash ./checkup.sh

# Kill the process
kill -9 <pid_value>
```

### Step 2: Choose a Cloud Provider

For deployment, **Linode** is recommended for its simplicity and reliability.

1. Sign up for a [Linode](https://www.linode.com/pricing/) account.
2. Select a "Dedicated CPU" or "Shared CPU" plan. A **16 GB RAM, 8 CPU instance** is recommended, costing approximately $96–$288 per month.
3. Deploy an **Ubuntu** node and clone the Analyzer repository to the instance.
4. Follow the setup instructions above to install dependencies and configure environment variables.

### Step 3: Access the Linode Instance

You can access your Linode instance via:

- [SSH](https://en.wikipedia.org/wiki/Secure_Shell)
- The [Linode Website or App](https://www.linode.com/)

By following these steps, you can ensure the Analyzer is set up and running effectively, either locally or on the cloud.
