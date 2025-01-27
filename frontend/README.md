# DocuInsight Frontend

## Setup

You will need an account for each of the external services listed below.
    - Resend
    - Docusign Developers
    - Supabase
    - OpenAI API
    - Tavily

Once you have crated the accounts, you will need to create a .env.local file to store the api keys and other values needed to interact with each service. Refer to `example.env.local` to see what all is needed.

### 1. Auth.js
The Auth.js package is used to handle user authentication. The package requires the `AUTH_SECRET` variable in `.env.local` key to be set. `AUTH_SECRET` can be set to any string, but it would be good to set it something hard to guess. In Linux/MacOS environments you can use the command `openssl rand -base64 32` to generate a value for `AUTH_SECRET`

### 2. Resend
Resend is used by Auth.js to send emails for user authentication. You will need to create a free resend account

You will need to connect a domain

You will need to create an api key and add it the env file as `AUTH_RESEND_KEY`

You will need to put an email address to send emails from in the env file as `AUTH_RESEND_EMAIL`
the email can be anything as long as it is @ the domain connected to resend

### 3. Docusign
You need to create an account at https://developers.docusign.com/

Once you have an account click on your profile in the top right and then click on "My Apps & Keys"

Scroll down until you see the integration section on the left side of the page
Click on Apps and Keys

Click on the blue "Add App an Integration Key" button
add integration key to env file as DOCUSIGN_INTEGRATION_KEY
fill out the form

Is your application able to securely store a client secret? - Yes
Require Proof Key for Code Exchange (PKCE) - unchecked
Add a secret key and add it the the env file as `DOCUSIGN_SECRET_KEY`
You don't need to create an RSA key pair

Add a redirect URI
    - dev: http://localhost:3000/api/auth/docusign/callback
    - prod: https://your-domain/api/auth/docusign/callback

leave everything else default and click save

### 4. Supabase
create supabase account
create a project in supabase

add the project url to the env file as `NEXT_PUBLIC_SUPABASE_PROJECT_URL`
add the service role key to the env file as `SUPABASE_SERVICE_ROLE_KEY`

### 5. OpenAI API

create openai account
create openai api key
add to env file as `OPENAI_API_KEY`

### 6. Tavily

create tavily account
create tavily api key
add to env file as `TAVILY_API_KEY`

### 7. install packages

`npm install`

### 8. run local dev server

`npm run dev`

visit site at http://localhost:3000
