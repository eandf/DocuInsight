import { NextRequest, NextResponse } from "next/server";
import { handleUserMessageStream } from "@/lib/chat";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userInput, userLocation, contractText, finalReport } =
      await request.json();

    if (!sessionId || !userInput) {
      return NextResponse.json(
        { success: false, error: "Missing sessionId or userInput" },
        { status: 400 },
      );
    }

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    (async () => {
      try {
        await handleUserMessageStream(
          sessionId,
          userInput,
          userLocation,
          contractText,
          finalReport,
          (partial: string) => {
            writer.write(encoder.encode(partial));
          },
        );
      } catch (err) {
        console.error("Error in handleUserMessageStream:", err);
        // an error occurred with the chat bot
        writer.write(encoder.encode("\nSomething went wrong. Please try again.\n"));
      } finally {
        writer.close();
      }
    })();

    return new Response(stream.readable, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("/api/chat error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
