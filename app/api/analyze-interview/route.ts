import { NextResponse } from "next/server";
import {
  openai,
  AI_CONFIG,
  handleAiError,
  isOpenAIConfigured,
  mockAIService,
  checkAndWarnAboutApiKey,
} from "@/lib/ai/aiConfig";
import { analyzeSentiment } from "@/lib/ai/sentimentAnalysis";
import { detectBias } from "@/lib/ai/biasDetection";

// Define interfaces for improved type safety
interface ScoreItem {
  score: number;
  explanation: string;
}

interface BiasMetrics {
  biasScore: number;
  fairnessScore: number;
  detectedBiases: Array<{
    text: string;
    type: string;
    severity: string;
    suggestions: string[];
  }>;
  overallAssessment: string;
}

interface SentimentResult {
  overall: string;
  confidence: number;
  enthusiasm: number;
  nervousness: number;
  engagement: number;
}

interface AnalysisResult {
  scores: {
    domainKnowledge: ScoreItem;
    communication: ScoreItem;
    responseQuality: ScoreItem;
    experienceRelevance: ScoreItem;
    culturalFit: ScoreItem;
    emotionalIntelligence: ScoreItem;
    overall: number;
  };
  strengths: string[];
  improvements: string[];
  isQualified: boolean;
  qualificationReasoning: string;
  summary: string;
  fairnessAssurance: {
    potentialBiases: string;
    mitigationSteps: string;
    diverseEvaluationConsiderations: string;
  };
  sentimentInsights: {
    emotionalPatterns: string;
    confidenceObservations: string;
    engagementAssessment: string;
    recommendationsBasedOnSentiment: string;
  };
  // These will be added after parsing
  biasMetrics?: BiasMetrics;
  sentiment?: SentimentResult;
}

export async function POST(request: Request) {
  try {
    const { jobDescription, cvContent, chatHistory, responseTimes } =
      await request.json();

    if (!jobDescription || !chatHistory || !responseTimes) {
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
      const mockResult = mockAIService.analyzeInterview(
        chatHistory,
        responseTimes
      );

      // Add sentiment analysis to mock result
      const sentimentResult = mockAIService.analyzeSentiment(chatHistory);

      // Add mock bias metrics
      const biasMetrics = mockAIService.detectBias("", "analysis");

      return NextResponse.json({
        ...mockResult,
        sentiment: sentimentResult,
        biasMetrics,
      });
    }

    // Perform sentiment analysis
    let sentimentResult: SentimentResult;
    try {
      console.log("Analyzing sentiment...");
      sentimentResult = await analyzeSentiment(chatHistory);
    } catch (sentimentError) {
      console.error("Error analyzing sentiment:", sentimentError);
      sentimentResult = mockAIService.analyzeSentiment(chatHistory);
    }

    // Format the transcript for better readability
    const formattedTranscript = chatHistory
      .filter((msg: { role: string }) => msg.role !== "system") // Exclude system messages
      .map((msg: { role: string; content: string }, index: number) => {
        const role = msg.role === "user" ? "Candidate" : "Interviewer";
        const responseTime =
          msg.role === "user"
            ? `(Response time: ${
                responseTimes[index]
                  ? `${responseTimes[index].toFixed(1)}s`
                  : "N/A"
              })`
            : "";

        return `${role} ${responseTime}: ${msg.content}`;
      })
      .join("\n\n");

    // Calculate average response time - FIX HERE
    // First, ensure we have an array of numbers
    const userResponseTimes: number[] = Array.isArray(
      Object.values(responseTimes)
    )
      ? Object.values(responseTimes).filter(
          (time): time is number => typeof time === "number" && Boolean(time)
        )
      : [];

    // Then calculate the average
    const avgResponseTime = userResponseTimes.length
      ? userResponseTimes.reduce((sum: number, time: number) => sum + time, 0) /
        userResponseTimes.length
      : 0;

    // Determine job category
    const jobCategory = determineJobCategory(jobDescription);

    // Update the prompt to include bias mitigation guidance
    const prompt = `
You are an expert recruiter analyzing an interview transcript to evaluate a candidate for a ${jobCategory} position. Your goal is to provide a fair, unbiased assessment focusing solely on job-relevant qualifications. Below is the job description, candidate's CV, and the full interview transcript with response times.

Job Description:
${jobDescription}

Candidate CV:
${cvContent || "Not provided"}

Interview Transcript:
${formattedTranscript}

Response Time Summary:
- Average response time: ${avgResponseTime.toFixed(1)} seconds
- Fastest response: ${Math.min(...userResponseTimes).toFixed(1)} seconds
- Slowest response: ${Math.max(...userResponseTimes).toFixed(1)} seconds

Sentiment Analysis:
- Overall emotional tone: ${sentimentResult.overall}
- Confidence level: ${sentimentResult.confidence}/100
- Enthusiasm level: ${sentimentResult.enthusiasm}/100 
- Nervousness level: ${sentimentResult.nervousness}/100
- Engagement level: ${sentimentResult.engagement}/100

IMPORTANT FAIRNESS GUIDELINES:
1. Focus ONLY on skills, experiences, and behaviors that are directly relevant to job performance
2. Evaluate all candidates using the same criteria and standards
3. Avoid assumptions based on perceived identity, background, or personal characteristics
4. Do not let factors like accent, speech patterns, or cultural references influence your assessment
5. Consider diverse ways candidates might demonstrate competence based on different backgrounds
6. Be aware of and mitigate your own potential biases in the evaluation process
7. Give equal weight to equivalent experiences from different sectors or contexts
8. Focus on future potential to perform in the role, not just past accomplishments
9. Use objective evidence from the interview, not subjective impressions or "gut feelings"
10. Ensure your language is neutral and free from bias or stereotypes

Carefully analyze the interview and evaluate the candidate based on the following universal criteria:

1. Domain Knowledge & Expertise (0-100):
   - Assess the candidate's depth of understanding in their field
   - Consider their grasp of key concepts, methodologies, and tools relevant to the role
   - Evaluate examples they provided of applying knowledge to solve problems
   - Higher scores indicate comprehensive knowledge and proven expertise

2. Communication Skills (0-100):
   - Evaluate clarity, coherence, and effectiveness in conveying ideas
   - Consider organization of thoughts and ability to explain complex concepts
   - Assess listening skills (how well they addressed the questions asked)
   - Higher scores indicate clear, concise, effective communication with appropriate detail level

3. Response Quality & Critical Thinking (0-100):
   - Assess depth and thoughtfulness of responses
   - Evaluate analytical skills, problem-solving approach, and logical reasoning
   - Consider their ability to connect ideas, anticipate challenges, and propose solutions
   - Higher scores indicate nuanced, well-reasoned responses that demonstrate critical thinking

4. Experience Relevance (0-100):
   - Evaluate how well the candidate's past experience aligns with the role requirements
   - Consider specific accomplishments they shared that relate to key responsibilities
   - Assess level of expertise demonstrated through concrete examples
   - Higher scores indicate highly relevant experience with demonstrable results

5. Cultural & Role Fit (0-100):
   - Assess alignment with company values and team dynamics as described in the job description
   - Consider adaptability, interpersonal skills, and collaboration approach
   - Evaluate motivation and interest in the specific role
   - Higher scores indicate strong alignment with company culture and role requirements
   - IMPORTANT: Assess "fit" ONLY in terms of values, work style, and approach - NOT in terms of who the candidate is

6. Emotional Intelligence (0-100):
   - Evaluate the candidate's self-awareness and emotional regulation during the interview
   - Consider how they handled difficult questions or pressure points
   - Assess their ability to connect emotionally and demonstrate empathy
   - Use the sentiment analysis as input, but make your own judgment based on the transcript

Qualification Assessment:
After your detailed evaluation, determine if the candidate is qualified for the position. A qualified candidate should:
- Score at least 75 in their areas of primary responsibility
- Have no score below 65 in any category
- Demonstrate specific relevant experience for key job requirements
- Show clear evidence of success in similar responsibilities
- Have an overall score of at least 75

For a senior-level position, standards should be higher, requiring scores of 80+ in primary areas and an overall score of at least 80.

Fairness Self-Check: Before finalizing your assessment, review your evaluation for potential bias by asking:
- Am I evaluating this candidate solely on job-relevant criteria?
- Would I assess a candidate with a different background but identical responses the same way?
- Am I considering diverse ways that expertise might be demonstrated?
- Am I giving equal weight to equivalent experiences from different sectors or contexts?
- Is my language free from bias or stereotypes?

Your response should be in JSON format as follows:

{
  "scores": {
    "domainKnowledge": {
      "score": 85,
      "explanation": "Detailed explanation here with specific examples from the interview"
    },
    "communication": {
      "score": 80,
      "explanation": "Detailed explanation here with specific examples from the interview"
    },
    "responseQuality": {
      "score": 75,
      "explanation": "Detailed explanation here with specific examples from the interview"
    },
    "experienceRelevance": {
      "score": 90,
      "explanation": "Detailed explanation here with specific examples from the interview"
    },
    "culturalFit": {
      "score": 85,
      "explanation": "Detailed explanation here with specific examples from the interview"
    },
    "emotionalIntelligence": {
      "score": 82,
      "explanation": "Detailed explanation here with specific examples from the interview"
    },
    "overall": 83
  },
  "strengths": [
    "Specific strength with example from the interview",
    "Specific strength with example from the interview",
    "Specific strength with example from the interview"
  ],
  "improvements": [
    "Specific area for improvement with example from the interview",
    "Specific area for improvement with example from the interview",
    "Specific area for improvement with example from the interview"
  ],
  "isQualified": true,
  "qualificationReasoning": "Detailed explanation of why the candidate is qualified or not qualified, citing specific evidence from the interview",
  "summary": "Overall assessment summary with recommendation for next steps",
  "fairnessAssurance": {
    "potentialBiases": "Any potential biases you identified and mitigated in your evaluation",
    "mitigationSteps": "Steps you took to ensure a fair assessment",
    "diverseEvaluationConsiderations": "How you considered diverse ways of demonstrating competence"
  },
  "sentimentInsights": {
    "emotionalPatterns": "Analysis of emotional patterns throughout the interview",
    "confidenceObservations": "Specific observations about candidate's confidence",
    "engagementAssessment": "Assessment of how engagement affected interview performance",
    "recommendationsBasedOnSentiment": "Any recommendations based on emotional patterns observed"
  }
}
`;

    // Perform the analysis
    try {
      // Call OpenAI API with safe error handling
      console.log("Calling OpenAI API for interview analysis...");
      const response = await openai!.chat.completions
        .create({
          model: AI_CONFIG.scoringModel,
          messages: [
            {
              role: "system",
              content:
                "You are an AI assistant specialized in candidate evaluation and recruiting for all industries and position types. You prioritize fairness and focus solely on job-relevant qualifications.",
            },
            { role: "user", content: prompt },
          ],
          temperature: AI_CONFIG.scoringTemperature,
          max_tokens: AI_CONFIG.scoringMaxTokens,
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
        const mockResult = mockAIService.analyzeInterview(
          chatHistory,
          responseTimes
        );
        return NextResponse.json({
          ...mockResult,
          sentiment: sentimentResult,
          biasMetrics: mockAIService.detectBias("", "analysis"),
        });
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
      const analysisResult = JSON.parse(jsonContent) as AnalysisResult;

      // Perform bias detection on the analysis result
      let biasMetrics: BiasMetrics;
      try {
        // Extract evaluation text from only the specific score items we know have explanations
        const scoreKeys = [
          "domainKnowledge",
          "communication",
          "responseQuality",
          "experienceRelevance",
          "culturalFit",
          "emotionalIntelligence",
        ];

        // More explicit type assertion approach
        const evaluationText =
          scoreKeys
            .map((key) => {
              // Explicitly assert this is a ScoreItem (we know these keys have ScoreItem values)
              const scoreItem = analysisResult.scores[
                key as keyof typeof analysisResult.scores
              ] as ScoreItem;
              return scoreItem.explanation || "";
            })
            .join("\n") +
          "\n" +
          analysisResult.qualificationReasoning +
          "\n" +
          analysisResult.summary;

        console.log("Analyzing evaluation for bias...");
        biasMetrics = (await detectBias(
          evaluationText,
          "analysis"
        )) as BiasMetrics;
      } catch (biasError) {
        console.error("Error detecting bias in analysis:", biasError);
        // Use mock bias detection as fallback
        biasMetrics = mockAIService.detectBias("", "analysis") as BiasMetrics;
      }

      // Add bias and sentiment data to the result
      analysisResult.biasMetrics = biasMetrics;
      analysisResult.sentiment = sentimentResult;

      // Return the complete analysis with sentiment and bias data
      return NextResponse.json(analysisResult);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);

      // Fall back to mock data on error
      console.log("Falling back to mock analysis due to error");
      const mockResult = mockAIService.analyzeInterview(
        chatHistory,
        responseTimes
      );
      return NextResponse.json({
        ...mockResult,
        sentiment: sentimentResult,
        biasMetrics: mockAIService.detectBias("", "analysis"),
      });
    }
  } catch (error) {
    const errorMessage = handleAiError(error);
    console.log("Using mock data due to error:", errorMessage);

    // Return mock data instead of an error
    try {
      const { chatHistory, responseTimes } = await request.json();
      const mockResult = mockAIService.analyzeInterview(
        chatHistory || [],
        responseTimes || {}
      );
      const sentimentResult = mockAIService.analyzeSentiment(chatHistory || []);
      const biasMetrics = mockAIService.detectBias("", "analysis");

      return NextResponse.json({
        ...mockResult,
        sentiment: sentimentResult,
        biasMetrics,
      });
    } catch (error) {
      // If we can't extract request data, create mock data with empty inputs
      const mockResult = mockAIService.analyzeInterview([], {});
      const sentimentResult = mockAIService.analyzeSentiment([]);
      const biasMetrics = mockAIService.detectBias("", "analysis");

      console.log("Using default mock data due to error:", error);

      return NextResponse.json({
        ...mockResult,
        sentiment: sentimentResult,
        biasMetrics,
      });
    }
  }
}

// Helper function to determine job category from job description
function determineJobCategory(jobDescription: string): string {
  const jobDescLower = jobDescription.toLowerCase();

  // Check for technical positions
  if (
    jobDescLower.includes("software") ||
    jobDescLower.includes("developer") ||
    jobDescLower.includes("engineer") ||
    jobDescLower.includes("data scientist") ||
    jobDescLower.includes("programmer") ||
    jobDescLower.includes("it ") ||
    jobDescLower.includes("information technology")
  ) {
    return "technical";
  }

  // Check for sales/marketing positions
  if (
    jobDescLower.includes("marketing") ||
    jobDescLower.includes("sales") ||
    jobDescLower.includes("account executive") ||
    jobDescLower.includes("business development")
  ) {
    return "sales/marketing";
  }

  // Check for management positions
  if (
    jobDescLower.includes("manager") ||
    jobDescLower.includes("director") ||
    jobDescLower.includes("lead") ||
    jobDescLower.includes("chief") ||
    jobDescLower.includes(" cxo")
  ) {
    return "management";
  }

  // Check for finance positions
  if (
    jobDescLower.includes("finance") ||
    jobDescLower.includes("accountant") ||
    jobDescLower.includes("financial") ||
    jobDescLower.includes("accounting")
  ) {
    return "finance";
  }

  // Check for design positions
  if (
    jobDescLower.includes("design") ||
    jobDescLower.includes("ux") ||
    jobDescLower.includes("ui") ||
    jobDescLower.includes("graphic")
  ) {
    return "design";
  }

  // Check for HR positions
  if (
    jobDescLower.includes("hr") ||
    jobDescLower.includes("human resources") ||
    jobDescLower.includes("recruiter") ||
    jobDescLower.includes("talent")
  ) {
    return "human resources";
  }

  // Default to general if no specific category is found
  return "professional";
}
