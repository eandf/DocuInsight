import { NextRequest, NextResponse } from "next/server";
import { handleUserMessage } from "@/lib/chat";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userInput } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing sessionId",
        },
        { status: 400 }
      );
    }
    if (!userInput) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing userInput",
        },
        { status: 400 }
      );
    }

    const assistantMessage = await handleUserMessage(sessionId, userInput);

    return NextResponse.json({
      success: true,
      assistantMessage,
    });
  } catch (error) {
    console.error("/api/chat error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
