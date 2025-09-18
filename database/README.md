# DocuInsight's Database Setup

## About

DocuInsight uses Postgres as its main database. This database consists of two schemas and mainly 4 tables:

- schema: next_auth

  - accounts
  - verification_tokens

- schema: public
  - jobs
  - reports

This database is hosted on [Supabase](https://supabase.com/) and, in this project, is mainly accessed through Supabase's API. With all that in mind, follow the steps below to easily set up DocuInsight's database on Supabase.

## How To Setup Database For DocuInsight

1. Create a [Supabase](https://supabase.com/) account and/or sign in

2. Create a new project named "DocuInsight"

3. Go to the [projects](https://supabase.com/dashboard/projects) page and click on "DocuInsight"

4. On the left side of the window, click on the "Table Editor" tab where you will be presented with an editor. In that editor, copy the SQL code/commands located in the **setup.sql** file in the same directory as this README into that editor. Then click the green button with the label "Run" which is located on the right side of the window. These commands were written by us, the developers, and [Auth.js](https://authjs.dev/getting-started/adapters/supabase?framework=next-js) as we used **Auth.js** to handle the user authentication logic.

5. After the commands are run successfully, go to the far left side of the window and click the "Project Settings" tab then go to the "API" tab that is under the "CONFIGURATION" label.

6. Afterwards, scroll to the "Data API Settings" section and look at the "Exposed schemas" line. On that line, along with "public" and "graphql_public", add the following tag as well: "next_auth".

7. Then on the same page, click the "save" button at the bottom of the page where you added "next_auth".

8. Scroll back up on the same page and grab the API key(s) named **URL**, **anon public**, and **service_role**. You will need these for your environment variables for this project.

9. With all of that set, go to the far left side of the window and click on the "Storage" tab which will take you to the project's buckets page.

10. When you see the buckets page, click the "New bucket" button and create a new bucket named "contracts".

11. With all of these steps done, you can now focus on setting up the frontend and analyzer to run DocuInsight. Thanks for reading!
