import { NextResponse } from "next/server";
import {
  openai,
  AI_CONFIG,
  handleAiError,
  isOpenAIConfigured,
  mockAIService,
  checkAndWarnAboutApiKey,
} from "@/lib/ai/aiConfig";
import { detectBias } from "@/lib/ai/biasDetection";

// Add these interfaces at the top of the file
interface Question {
  id: string;
  text: string;
  category: string;
  hasBias?: boolean;
  biasType?: string;
  biasSeverity?: "low" | "medium" | "high";
  alternativeText?: string;
}

interface BiasDetection {
  text: string;
  type: string;
  severity: "low" | "medium" | "high";
  suggestions: string[];
}

interface BiasMetrics {
  biasScore: number;
  fairnessScore: number;
  detectedBiases: BiasDetection[];
  overallAssessment: string;
}

export async function POST(request: Request) {
  try {
    const { jobDescription, cvContent } = await request.json();

    if (!jobDescription) {
      return NextResponse.json(
        { error: "Missing job description" },
        { status: 400 }
      );
    }

    // Check OpenAI configuration and warn if not properly set up
    checkAndWarnAboutApiKey();

    // If OpenAI is not configured, use mock data immediately
    if (!isOpenAIConfigured()) {
      console.log(
        "OpenAI not configured, using mock data for question generation"
      );

      // Combine jobDescription and cvContent if available
      const combinedInput = cvContent
        ? `${jobDescription}\n\nCV Content:\n${cvContent}`
        : jobDescription;

      const mockResult = mockAIService.generateQuestions(combinedInput);
      return NextResponse.json(mockResult);
    }

    // Design the prompt for bias-aware question generation
    const prompt = `
As an expert in inclusive recruiting, your task is to generate balanced, fair interview questions based on the job description and candidate's CV provided below.

Job Description:
${jobDescription}

${
  cvContent
    ? `Candidate's CV:\n${cvContent}`
    : "No CV provided. Generate questions based only on the job description."
}

Please create 5 high-quality interview questions that:
1. Focus on skills, experience, and competencies truly relevant to job performance
2. Avoid assumptions about background, identity, or personal characteristics
3. Allow candidates from diverse backgrounds to demonstrate their qualifications
4. Are phrased in inclusive, neutral language
5. Evaluate candidates on job-relevant criteria only

For each question, specify a category:
- "technical" for questions about skills and knowledge
- "behavioral" for questions about past behavior and experiences
- "situational" for questions about hypothetical scenarios

The questions should comprehensively assess the candidate's fit for this specific role while providing equal opportunity for all qualified candidates to succeed.

Format the response as a JSON object:
{
  "questions": [
    {
      "id": "1",
      "text": "Question text here",
      "category": "technical/behavioral/situational"
    },
    ...
  ],
  "context": {
    "jobDescription": "Brief summary of the job",
    "cvHighlights": ["Key point from CV", "Another key point"],
    "keyCompetencies": ["Competency 1", "Competency 2", "Competency 3"]
  }
}

Ensure the questions are fair, relevant to the position, free from bias, and allow candidates to demonstrate their qualifications regardless of their background.
`;

    try {
      // Call OpenAI API with safe error handling
      console.log("Calling OpenAI API for question generation...");
      const response = await openai!.chat.completions
        .create({
          model: AI_CONFIG.questionGenerationModel,
          messages: [
            {
              role: "system",
              content:
                "You are an AI assistant specialized in creating fair and effective interview questions for recruiting.",
            },
            { role: "user", content: prompt },
          ],
          temperature: AI_CONFIG.questionGenerationTemperature,
          max_tokens: AI_CONFIG.questionGenerationMaxTokens,
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

        // Combine jobDescription and cvContent if available
        const combinedInput = cvContent
          ? `${jobDescription}\n\nCV Content:\n${cvContent}`
          : jobDescription;

        const mockResult = mockAIService.generateQuestions(combinedInput);
        return NextResponse.json(mockResult);
      }

      // Get AI response
      const content = response.choices[0].message.content;

      // Try to extract only JSON content - some models add explanatory text
      let jsonContent = content;

      // Check if content contains JSON within ``` code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonContent = jsonMatch[1];
      }

      // Another approach - find where JSON object starts and ends
      if (jsonContent.includes("{") && jsonContent.includes("}")) {
        const startIndex = jsonContent.indexOf("{");
        const endIndex = jsonContent.lastIndexOf("}") + 1;
        if (startIndex >= 0 && endIndex > startIndex) {
          jsonContent = jsonContent.substring(startIndex, endIndex);
        }
      }

      // Parse JSON response with proper typing
      const questionsResult = JSON.parse(jsonContent) as {
        questions: Question[];
        context: Record<string, unknown>;
      };

      // Check questions for bias
      let biasMetrics: BiasMetrics;
      try {
        // Combine all questions for bias analysis
        const allQuestions = questionsResult.questions
          .map((q: Question) => q.text)
          .join("\n");

        // Perform bias detection on the generated questions
        biasMetrics = (await detectBias(allQuestions)) as BiasMetrics;

        // If high bias detected, provide alternative questions
        if (biasMetrics.biasScore > 50) {
          console.log(
            "High bias detected in generated questions, adding alternative suggestions"
          );

          // Mark questions with bias and add alternative suggestions
          for (const bias of biasMetrics.detectedBiases) {
            for (const question of questionsResult.questions) {
              if (
                question.text.toLowerCase().includes(bias.text.toLowerCase())
              ) {
                question.hasBias = true;
                question.biasType = bias.type;
                question.biasSeverity = bias.severity;

                // Create alternative version of the question
                const alternativeSuggestion =
                  bias.suggestions[0] || "Use more inclusive language";
                question.alternativeText = question.text.replace(
                  new RegExp(bias.text, "i"),
                  alternativeSuggestion
                );
              }
            }
          }
        }
      } catch (biasError) {
        console.error("Error during bias detection:", biasError);
        // Create a default bias metrics object if bias detection fails
        biasMetrics = {
          biasScore: 0,
          fairnessScore: 100,
          detectedBiases: [],
          overallAssessment:
            "Bias detection failed. Unable to analyze questions for bias.",
        };
      }

      // Add bias metrics to the result
      const result = {
        ...questionsResult,
        biasMetrics,
      };

      // Return the questions with bias analysis
      return NextResponse.json(result);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);

      // Fall back to mock data on error
      console.log("Falling back to mock questions due to error");

      // Combine jobDescription and cvContent if available
      const combinedInput = cvContent
        ? `${jobDescription}\n\nCV Content:\n${cvContent}`
        : jobDescription;

      const mockResult = mockAIService.generateQuestions(combinedInput);
      return NextResponse.json(mockResult);
    }
  } catch (error) {
    const errorMessage = handleAiError(error);
    console.log("Using mock data due to error:", errorMessage);

    // Return mock data instead of an error
    try {
      const { jobDescription, cvContent } = await request.json();
      const defaultJobDesc = jobDescription || "Software Developer position";

      // Combine jobDescription and cvContent if available
      const combinedInput = cvContent
        ? `${defaultJobDesc}\n\nCV Content:\n${cvContent}`
        : defaultJobDesc;

      const mockResult = mockAIService.generateQuestions(combinedInput);
      return NextResponse.json(mockResult);
    } catch (e) {
      // If we can't extract request data, create mock data with empty inputs
      console.log("Using default mock data due to error:", e);
      // Call with just one parameter
      const mockResult = mockAIService.generateQuestions(
        "Software Developer position"
      );
      return NextResponse.json(mockResult);
    }
  }
}
