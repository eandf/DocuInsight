export default async function SignRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  console.log("SIGN PAGE REDIRECT:", params);
  return <>SIGN PAGE REDIRECT:</>;
}
