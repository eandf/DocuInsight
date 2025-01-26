import { auth } from "@/auth";
import fs from "fs";
import path from "path";

async function getUser() {
  const response = await fetch("http://localhost:3000/api/users");
  const data = await response.json();
  return data[0];
}

export default async function HomePage() {
  const session = await auth();
  console.log("SESSION:", session);

  const userData = await getUser();

  const formData = new FormData();
  formData.append("user_id", userData.id);
  formData.append("docusign_account_id", userData.docusign_account_id);
  formData.append("docu_sign_envelope_id", userData.docu_sign_envelope_id);
  formData.append(
    "recipients",
    JSON.stringify([
      {
        name: "Dylan Eck",
        email: "akdylaneck@gmail.com",
        signing_url: "https://notifycyber.com",
      },
      {
        name: "Mehmet Yilmaz",
        email: "mehmet.mhy@gmail.com",
        signing_url: "https://notifycyber.com",
      },
    ])
  );

  // Read file contents into a Buffer, then convert to a File
  const filePath = path.join(process.cwd(), "public", "example.pdf");
  const fileBuffer = fs.readFileSync(filePath);
  // Create a browser-compatible File object
  const file = new File([fileBuffer], "example.pdf", {
    type: "application/pdf",
  });

  formData.append("file", file);

  let response;
  try {
    response = await fetch("http://localhost:3000/api/jobs", {
      method: "POST",
      body: formData,
      // Don't set "Content-Type"; fetch + FormData sets it automatically.
    });
  } catch (error) {
    console.error(error);
    return <>Error</>;
  }

  const data = await response.json();
  console.log(data);

  return <>HOME</>;
}
