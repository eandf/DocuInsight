import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.redirect(
    "https://www.docuinsight.ai/sign?job=a070d50e-11dd-4bdc-b679-4182e7a303f4&invite=aa949bb8-11f0-4c66-a506-8d3946000432",
  );
}
