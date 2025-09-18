<h1 align="center">DocuInsight</h1>

<p align="center">
    <img width="200" src="./assets/images/logo.png" alt="DocuInsight Logo">
</p>

> ⚠️ This project has been retired and fully open source as of **May 2025**. The original url [docuinsight.ai](https://www.docuinsight.ai/) will expire in **January 2027** but the tribute page [eandf.github.io/DocuInsight](https://eandf.github.io/DocuInsight/) will remain available.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [About](#about)
- [Events](#events)
- [Links](#links)
- [Features](#features)
- [Datasets](#datasets)
- [Setup and Running](#setup-and-running)
- [Helpful Resources](#helpful-resources)

## About

DocuInsight leverages the power of the OpenAI API to analyze contracts and provide AI-generated insights, helping signers better understand the agreements they are entering into. Integrated with the DocuSign eSignature API, DocuInsight displays these insights alongside an embedded DocuSign signing session, ensuring that signers have quick and easy access to important information. Additionally, a chatbot is available to answer questions about the contract and assist users in finding legal counsel in real-time. The site is live and you can visit it at [docuinsight.ai](https://docuinsight.ai) and check out the [live demo](https://www.docuinsight.ai/sign?job=a070d50e-11dd-4bdc-b679-4182e7a303f4&invite=aa949bb8-11f0-4c66-a506-8d3946000432) to get an idea of how DocuInsight works.

## Events

In January 2025, this project was open-sourced for the DocuSign hackathon. After the final results came in for the hackathon around late February 2025, this project was temporarily closed-sourced. But, as of May 2025, DocuInsight has been retired and the entire codebase is now permanently open source!

## Links

- **This Repo** https://github.com/eandf/DocuInsight/
- **E&F's Website:** https://www.efgroupinc.com/
- **Devpost Submission:** https://devpost.com/software/legalease-07rlgu
- **Production Instance:** https://www.docuinsight.ai/
- **Live Example:** https://www.docuinsight.ai/sign?job=a070d50e-11dd-4bdc-b679-4182e7a303f4&invite=aa949bb8-11f0-4c66-a506-8d3946000432
- **Demo Video #1:** https://www.youtube.com/watch?v=vechiKAvdDU
- **Demo Video #2:** https://www.youtube.com/watch?v=XpOqN_SWHrI

## Features

- **AI-Powered Contract Analysis:** Utilize OpenAI's capabilities to break down and explain contract terms.
- **Seamless Integration with DocuSign:** Embed insights directly within the signing session for effortless access.
- **Interactive Chatbot:** Get real-time answers to contract-related questions and find legal assistance when needed.
- **User-Friendly Frontend:** Built with Next.js 15, TypeScript, and Tailwind CSS for a responsive and intuitive user experience.
- **Robust Backend:** Structured database setup and efficient contract analysis workflows.

## Datasets

### Legal Contracts

For testing purposes, we utilized publicly available legal contracts to ensure privacy and compliance. Below are the sources of the contracts used:

- [Legally Binding Agreement (Attachment 11-03)](<https://dlg.ky.gov/DLG%20Documents/Legally%20Binding%20Agreement%20(Attachment%2011-03).pdf>)
- [Stripe Atlas Consulting Agreement](<https://assets.super.so/175a15eb-e555-4078-9949-a94a9e3cad74/files/30278d46-046a-4870-a594-a5e5fc849538/Stripe_Atlas_Consulting_Agreement_Entity_Consultant_(CA)_-_FORM.docx>)
- [Stripe Atlas Mutual Nondisclosure Agreement](https://assets.super.so/175a15eb-e555-4078-9949-a94a9e3cad74/files/c1c9e3ac-26e0-46df-b0e3-bb5575ac7dc9/Stripe_Atlas_Mutual_Nondisclosure_Agreement_-_FORM.docx)

These contracts are publicly accessible and are ideal for thoroughly testing the functionalities of DocuInsight.

## Setup and Running

To set up and run this project, follow the instructions in the respective component directories:

- **Frontend:** [frontend/README.md](/frontend/README.md)
- **Database:** [database/README.md](/database/README.md)
- **Analyzer:** [analyzer/README.md](/analyzer/README.md)

Also, if you want a quick overview of the **waitlist** table for DocuInsight, you can make sure to set up the [Analyzer](analyzer/README.md) service which includes installing all the Python dependencies and the environment variables. Then, make sure to be in the root directory for this repo/project and run the following script:

```bash
python3 waitlist_view.py
```

## Helpful Resources

- [OpenAI API Reference](https://platform.openai.com/docs/api-reference/introduction)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [DocuSign eSignature API Reference](https://developers.docusign.com/docs/esign-rest-api/reference/)
- [DocuSign Node SDK](https://developers.docusign.com/docs/esign-rest-api/sdks/node/)
