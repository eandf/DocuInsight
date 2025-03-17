import { NextResponse } from "next/server";

// LAST UPDATED: March 17, 2025
const MAIN_DEMO_LINK_HARD_CODED =
  "https://www.docuinsight.ai/sign?job=a070d50e-11dd-4bdc-b679-4182e7a303f4&invite=aa949bb8-11f0-4c66-a506-8d3946000432";

export async function GET() {
  return NextResponse.redirect(MAIN_DEMO_LINK_HARD_CODED);
}
