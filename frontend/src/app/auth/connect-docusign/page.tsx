import Navbar from "@/components/navbar";

export default async function ConnectDocusignPage() {
  return (
    <>
      <Navbar />
      <form action="/api/auth/docusign/authorize" method="GET">
        <button type="submit">Connect Docusign Account</button>
      </form>
    </>
  );
}
