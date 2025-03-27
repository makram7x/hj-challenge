import { NextResponse } from "next/server";
import {
  openai,
  AI_CONFIG,
  handleAiError,
  isOpenAIConfigured,
  mockAIService,
  checkAndWarnAboutApiKey,
} from "@/lib/ai/aiConfig";

// Define proper types for the expected data structure
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface QuestionContext {
  jobDescription: string;
  cvHighlights: string[];
}

interface ChatRequestData {
  message: string;
  questionContext: QuestionContext;
  chatHistory: ChatMessage[];
}

export async function POST(request: Request) {
  try {
    // Parse with type assertion
    const { message, questionContext, chatHistory } =
      (await request.json()) as ChatRequestData;

    if (!message || !questionContext || !chatHistory) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Check OpenAI configuration and warn if not properly set up
    checkAndWarnAboutApiKey();

    // If OpenAI is not configured, use mock data immediately
    if (!isOpenAIConfigured()) {
      console.log("OpenAI not configured, using mock data");
      const mockResponse = mockAIService.generateChatResponse(message);
      return NextResponse.json({ response: mockResponse });
    }

    // Format chat history for the API with proper type safety
    const formattedHistory: ChatMessage[] = Array.isArray(chatHistory)
      ? chatHistory
          .filter(
            (msg): msg is ChatMessage =>
              typeof msg === "object" &&
              msg !== null &&
              "role" in msg &&
              "content" in msg &&
              msg.role !== "system" // Filter out any existing system messages to avoid conflicts
          )
          .map((msg) => ({
            role: msg.role,
            content:
              typeof msg.content === "string"
                ? msg.content
                : String(msg.content),
          }))
      : [];

    // Create system message with interview context
    const systemMessage: ChatMessage = {
      role: "system",
      content: `
You are an expert technical interviewer conducting a job interview. Your goal is to evaluate the candidate's suitability for the position.

Job context:
${questionContext.jobDescription || "Not provided"}

Candidate highlights:
${
  Array.isArray(questionContext.cvHighlights)
    ? questionContext.cvHighlights.join("\n")
    : "Not provided"
}

Guidelines for this interview:
1. Ask thoughtful, relevant follow-up questions based on the candidate's responses
2. Maintain a professional and balanced tone
3. Dig deeper when answers lack specific details or examples
4. Explore both technical skills and soft skills
5. Keep your responses concise and focused
6. Respond as if you are in a live interview setting
7. Don't break character or reference that you are an AI

Your responses should be direct interview questions or follow-ups, without additional commentary.
`,
    };

    // Add the latest user message
    const userMessage: ChatMessage = {
      role: "user",
      content: message,
    };

    try {
      // Call OpenAI API with safe error handling
      console.log("Calling OpenAI API for chat response...");
      const response = await openai!.chat.completions
        .create({
          model: AI_CONFIG.interviewChatModel,
          messages: [systemMessage, ...formattedHistory, userMessage],
          temperature: AI_CONFIG.interviewChatTemperature,
          max_tokens: AI_CONFIG.interviewChatMaxTokens,
        })
        .catch((error) => {
          console.error("OpenAI API error:", error);
          // Explicitly return null on API error to trigger fallback
          return null;
        });

      // If API call failed, fall back to mock data
      if (
        !response ||
        !response.choices ||
        !response.choices[0]?.message?.content
      ) {
        console.log(
          "API call failed or returned empty response, using mock data"
        );
        const mockResponse = mockAIService.generateChatResponse(message);
        return NextResponse.json({ response: mockResponse });
      }

      // Get AI response
      const aiResponse = response.choices[0].message.content;

      return NextResponse.json({ response: aiResponse });
    } catch (apiError) {
      console.error("Error calling AI API:", apiError);

      // Fall back to mock response
      console.log("Falling back to mock chat response due to error");
      const mockResponse = mockAIService.generateChatResponse(message);
      return NextResponse.json({ response: mockResponse });
    }
  } catch (error) {
    const errorMessage = handleAiError(error);
    console.log("Using mock data due to error:", errorMessage);

    // Return mock data instead of an error
    try {
      const { message } = (await request.json()) as { message?: string };
      const mockResponse = mockAIService.generateChatResponse(message || "");
      return NextResponse.json({ response: mockResponse });
    } catch (e) {
      // If we can't extract request data, create mock data with empty input
      console.log("Using mock data due to error:", e);
      const mockResponse = mockAIService.generateChatResponse("");
      return NextResponse.json({ response: mockResponse });
    }
  }
}
