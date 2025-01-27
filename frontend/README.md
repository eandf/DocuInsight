# DocuInsight Frontend

This sub-directory contains all the frontend code for DocuInsight. To learn how to setup it up, follow the instructions below.

## Setup Instructions

To get started, follow these steps:

### Prerequisites

1. **Accounts Required**  
   You will need accounts for the following external services:

   - [Resend](https://resend.com)
   - [DocuSign Developers](https://developers.docusign.com/)
   - [Supabase](https://supabase.com/)
   - [OpenAI API](https://platform.openai.com/)
   - [Tavily](https://tavily.com/)

2. **Environment Variables**  
   Create a `.env.local` file in the root directory to store API keys and configuration values. Refer to the provided `example.env.local` for the required variables.

### Configuration Details

#### 1. **Auth.js**

[Auth.js](https://authjs.dev/) is used for user authentication.

- Set the `AUTH_SECRET` variable in `.env.local`.  
  To generate a strong value, use the command:
  ```bash
  openssl rand -base64 32
  ```
- Required variables:
  - `AUTH_SECRET`: Authentication secret
  - `AUTH_RESEND_KEY`: Resend API key
  - `AUTH_RESEND_EMAIL`: Email address to send authentication emails (must belong to the domain connected to Resend)

#### 2. **Resend**

Resend is used by Auth.js to send authentication emails.

- Create a [Resend account](https://resend.com).
- Connect a domain to Resend.
- Generate an API key and add it to `.env.local` as `AUTH_RESEND_KEY`.
- Set a `AUTH_RESEND_EMAIL` (e.g., `noreply@yourdomain.com`).

#### 3. **DocuSign**

- Create a [DocuSign Developer account](https://developers.docusign.com/).
- Navigate to **My Apps & Keys** under your profile.
- Create a new integration key:
  - Add the integration key to `.env.local` as `DOCUSIGN_INTEGRATION_KEY`.
  - Generate a secret key and add it to `.env.local` as `DOCUSIGN_SECRET_KEY`.
- Add the following redirect URIs:
  - Development: `http://localhost:3000/api/auth/docusign/callback`
  - Production: `https://your-domain/api/auth/docusign/callback`

#### 4. **Supabase**

- Create a [Supabase account](https://supabase.com) and a project.
- Add the following to `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_PROJECT_URL`: Your project URL.
  - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key.

#### 5. **OpenAI API**

- Create an [OpenAI account](https://platform.openai.com/) and generate an API key.
- Add the API key to `.env.local` as `OPENAI_API_KEY`.

#### 6. **Tavily**

- Create a [Tavily account](https://tavily.com) and generate an API key.
- Add the API key to `.env.local` as `TAVILY_API_KEY`.

### Installation and Running the Project

1. **Setup environment variables**:  
   Create the environment variable file `.env.local` and set all the environment variables listed in the `example.env.local`. This file contains all required environment variables and their expected structure.

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Run the development server**:

   ```bash
   npm run dev
   ```

4. **Access the app**:  
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deploy to Production

To deploy this project to production, follow these steps:

1. **Add Your Code to GitHub**

   - Ensure your project code is version-controlled and pushed to a GitHub repository.  
     If your project isn't already a Git repository, initialize it with:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin <your-repo-url>
     git push -u origin main
     ```

2. **Create a Vercel Account**

   - Go to [Vercel](https://vercel.com) and sign up (or log in if you already have an account).

3. **Connect GitHub to Vercel**

   - In Vercel, connect your GitHub account by selecting **Add New Project**.
   - Locate and select your repository from the list.

4. **Deploy the Project**

   - When prompted, select **Next.js** as the project framework.
   - During the setup, add all environment variables from your `.env.local` file into Vercel's Environment Variables settings.

5. **Complete Deployment**

   - Follow the remaining steps in Vercel's guided setup.
   - Once deployment is complete, Vercel will provide a production URL (e.g., `https://your-project-name.vercel.app`).

6. **Need Help?**  
   If you encounter any issues, refer to these resources:
   - [Next.js Deployment Guide](https://nextjs.org/learn-pages-router/basics/deploying-nextjs-app/deploy)
   - [Vercel Deployment Tutorial (YouTube)](https://www.youtube.com/watch?v=2HBIzEx6IZA)

### Example `.env.local`

Refer to the `example.env.local` file for all required environment variables and their expected structure.
