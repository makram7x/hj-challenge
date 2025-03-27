import { NextResponse } from "next/server";
import { detectBias } from "@/lib/ai/biasDetection";
import { handleAiError } from "@/lib/ai/aiConfig";

export async function POST(request: Request) {
  try {
    // Parse the request body
    const { text, context } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "Missing required text parameter" },
        { status: 400 }
      );
    }

    // Validate context parameter
    const validContext =
      context === "jobDescription" ||
      context === "questions" ||
      context === "analysis"
        ? context
        : "jobDescription";

    // Perform bias detection
    const biasResult = await detectBias(text, validContext);

    // Return the bias detection result
    return NextResponse.json(biasResult);
  } catch (error) {
    const errorMessage = handleAiError(error);
    console.error("Error in bias detection API:", errorMessage);

    // Return error response
    return NextResponse.json(
      {
        error: "Failed to analyze bias",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
