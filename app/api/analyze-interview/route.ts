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
    emotionalIntelligence?: ScoreItem;
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
      const biasMetrics = mockAIService.detectBias("");

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

    // Calculate average response time
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

    // Get min and max times safely
    const minResponseTime = userResponseTimes.length
      ? Math.min(...userResponseTimes)
      : 0;

    const maxResponseTime = userResponseTimes.length
      ? Math.max(...userResponseTimes)
      : 0;

    // Extract key requirements from job description
    const keyRequirements = extractKeyRequirements(jobDescription);

    // Create a completely revised prompt that addresses score inflation and requires specific evidence
    const prompt = `
You are an experienced technical recruiter conducting a rigorous assessment of an interview candidate. Your goal is to provide an honest, critical evaluation that accurately reflects the candidate's demonstrated abilities. 

# CRITICAL ASSESSMENT INSTRUCTIONS
- AVOID SCORE INFLATION: Most real candidates show significant room for improvement. Use the full range of scores (0-100).
- Reserve scores above 80 only for truly exceptional, standout performance.
- Typical qualified candidates should score in the 60-75 range.
- Provide SPECIFIC EVIDENCE for every score and feedback point. Reference exact statements or behaviors.
- Do not assume skills or knowledge not directly demonstrated in the transcript.
- When uncertain about a skill, assign moderate scores (50-65) rather than giving benefit of doubt.
- Identify clear strengths AND concrete areas for improvement for ALL candidates.
- Be direct and honest. Candidates benefit more from accurate assessment than from inflated praise.

# SCORING CALIBRATION REFERENCE
- 90-100: Exceptional, rare excellence (top 2% of candidates)
- 80-89: Outstanding, exceeds expectations (top 10%)
- 70-79: Strong performance, meets all expectations well
- 60-69: Competent, meets basic requirements
- 50-59: Developing skills, partially meets requirements
- 40-49: Below expectations, significant gaps
- Below 40: Substantial deficiencies in this area

# INTERVIEW MATERIALS
Job Description:
${jobDescription}

Key Requirements:
${keyRequirements.map((req) => `- ${req}`).join("\n")}

Candidate CV:
${cvContent || "Not provided"}

Interview Transcript:
${formattedTranscript}

Response Time Summary:
- Average response time: ${avgResponseTime.toFixed(1)} seconds
- Fastest response: ${minResponseTime.toFixed(1)} seconds
- Slowest response: ${maxResponseTime.toFixed(1)} seconds

Sentiment Analysis:
- Overall emotional tone: ${sentimentResult.overall}
- Confidence level: ${sentimentResult.confidence}/100
- Enthusiasm level: ${sentimentResult.enthusiasm}/100 
- Nervousness level: ${sentimentResult.nervousness}/100
- Engagement level: ${sentimentResult.engagement}/100

# ASSESSMENT CRITERIA
1. Domain Knowledge & Expertise (0-100):
   - Evaluate depth and accuracy of technical/professional knowledge relevant to the role
   - Assess DEMONSTRATED understanding through specific examples, not assumed knowledge
   - Consider problem-solving approach and how they apply concepts

2. Communication Skills (0-100):
   - Evaluate clarity, structure, and precision in conveying ideas
   - Consider organization of thoughts, use of examples, and listening comprehension
   - Assess appropriateness of language and ability to explain complex concepts

3. Response Quality & Critical Thinking (0-100):
   - Assess depth, coherence, and thoughtfulness of responses
   - Evaluate analytical skills and logical reasoning demonstrated
   - Consider response times in context of question complexity

4. Experience Relevance (0-100):
   - Evaluate how well past experience aligns with specific job requirements
   - Assess level of responsibility and accomplishment in relevant areas
   - Consider depth of experience vs. breadth of exposure

5. Cultural & Role Fit (0-100):
   - Assess alignment with company values and working style (not personality)
   - Consider adaptability, collaboration approach, and problem-solving style
   - Evaluate motivation for this specific role

6. Emotional Intelligence (0-100) [OPTIONAL]:
   - Evaluate self-awareness and emotional regulation
   - Consider interpersonal awareness and relationship management signals
   - Assess adaptability and resilience indicators

# QUALIFICATION ASSESSMENT
A candidate is qualified if they meet these realistic standards:
- Score at least 65 in primary responsibility areas (more moderate than previous 75)
- Have no scores below 50 in any category
- Demonstrate SPECIFIC relevant experience for key job requirements
- Show evidence of success in similar responsibilities
- Have an overall score of at least 65 (more moderate than previous 75)

Senior positions should require scores of at least 70 in primary areas and an overall score of at least 70.

# REQUIRED OUTPUT FORMAT
Respond in JSON format with the structure below. For EVERY score and feedback point, include SPECIFIC EVIDENCE from the transcript:

{
  "scores": {
    "domainKnowledge": {
      "score": 65,
      "explanation": "Detailed explanation with specific quotes or examples from the interview that justify this score"
    },
    "communication": {
      "score": 70,
      "explanation": "Detailed explanation with specific examples"
    },
    "responseQuality": {
      "score": 60,
      "explanation": "Detailed explanation with specific examples"
    },
    "experienceRelevance": {
      "score": 55,
      "explanation": "Detailed explanation with specific examples"
    },
    "culturalFit": {
      "score": 65,
      "explanation": "Detailed explanation with specific examples"
    },
    "emotionalIntelligence": {
      "score": 62,
      "explanation": "Assessment based on communication style and emotional awareness"
    },
    "overall": 63
  },
  "strengths": [
    "Specific strength with concrete evidence: 'When asked about X, candidate demonstrated Y by saying Z'",
    "Specific strength with concrete evidence",
    "Specific strength with concrete evidence"
  ],
  "improvements": [
    "Specific area for improvement with evidence: 'When discussing X, candidate could have improved by Y'",
    "Specific area for improvement with evidence",
    "Specific area for improvement with evidence"
  ],
  "isQualified": true,
  "qualificationReasoning": "Clear explanation of qualification decision with specific evidence",
  "summary": "Concise overall assessment highlighting key points with specific examples",
  "fairnessAssurance": {
    "potentialBiases": "Any potential biases identified in your evaluation",
    "mitigationSteps": "Steps taken to ensure a fair assessment",
    "diverseEvaluationConsiderations": "How you considered diverse ways of demonstrating competence"
  },
  "sentimentInsights": {
    "emotionalPatterns": "Analysis of emotional patterns throughout the interview with specific examples",
    "confidenceObservations": "Specific observations about candidate's confidence with examples",
    "engagementAssessment": "Assessment of how engagement affected interview performance with examples",
    "recommendationsBasedOnSentiment": "Specific recommendations based on emotional patterns observed"
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
                "You are an AI assistant specialized in rigorous, critical candidate evaluation. You provide detailed, evidence-based assessments without score inflation. You are direct, honest, and focused on concrete observations rather than assumptions.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2, // Lower temperature for more consistent and critical evaluation
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
          biasMetrics: mockAIService.detectBias(""),
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

      // Apply score calibration to counter potential inflation
      calibrateScores(analysisResult);

      // Validate feedback quality and enhance if needed
      enhanceFeedbackQuality(analysisResult);

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
              ] as ScoreItem | undefined;
              return scoreItem?.explanation || "";
            })
            .join("\n") +
          "\n" +
          analysisResult.qualificationReasoning +
          "\n" +
          analysisResult.summary;

        console.log("Analyzing evaluation for bias...");
        biasMetrics = (await detectBias(evaluationText)) as BiasMetrics;
      } catch (biasError) {
        console.error("Error detecting bias in analysis:", biasError);
        // Use mock bias detection as fallback
        biasMetrics = mockAIService.detectBias("") as BiasMetrics;
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
        biasMetrics: mockAIService.detectBias(""),
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
      const biasMetrics = mockAIService.detectBias("");

      return NextResponse.json({
        ...mockResult,
        sentiment: sentimentResult,
        biasMetrics,
      });
    } catch (error) {
      // If we can't extract request data, create mock data with empty inputs
      const mockResult = mockAIService.analyzeInterview([], {});
      const sentimentResult = mockAIService.analyzeSentiment([]);
      const biasMetrics = mockAIService.detectBias("");

      console.log("Using default mock data due to error:", error);

      return NextResponse.json({
        ...mockResult,
        sentiment: sentimentResult,
        biasMetrics,
      });
    }
  }
}

/**
 * Apply calibration to counter score inflation
 */
function calibrateScores(result: AnalysisResult): void {
  // Apply calibration to category scores
  const categories = [
    "domainKnowledge",
    "communication",
    "responseQuality",
    "experienceRelevance",
    "culturalFit",
    "emotionalIntelligence",
  ] as const;

  // Strength of calibration (higher = more aggressive adjustment)
  const calibrationStrength = 0.15;

  for (const category of categories) {
    if (category in result.scores) {
      const scoreItem = result.scores[
        category as keyof typeof result.scores
      ] as ScoreItem | undefined;

      if (scoreItem && typeof scoreItem.score === "number") {
        // Apply stronger calibration to higher scores
        if (scoreItem.score > 85) {
          scoreItem.score = Math.round(
            scoreItem.score - (scoreItem.score - 85) * 0.7 - 2
          );
        } else if (scoreItem.score > 75) {
          scoreItem.score = Math.round(
            scoreItem.score - (scoreItem.score - 75) * calibrationStrength * 2
          );
        } else if (scoreItem.score > 65) {
          scoreItem.score = Math.round(
            scoreItem.score - (scoreItem.score - 65) * calibrationStrength
          );
        }

        // Add a small random adjustment to avoid uniform scores
        scoreItem.score += Math.floor(Math.random() * 3) - 1;

        // Keep within bounds
        scoreItem.score = Math.max(30, Math.min(95, scoreItem.score));
      }
    }
  }

  // Recalculate overall score based on calibrated category scores
  const weights = {
    domainKnowledge: 0.25,
    communication: 0.2,
    responseQuality: 0.15,
    experienceRelevance: 0.25,
    culturalFit: 0.15,
  };

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const [category, weight] of Object.entries(weights)) {
    if (category in result.scores) {
      const scoreItem = result.scores[
        category as keyof typeof result.scores
      ] as ScoreItem | undefined;

      if (scoreItem && typeof scoreItem.score === "number") {
        totalWeightedScore += scoreItem.score * weight;
        totalWeight += weight;
      }
    }
  }

  // Add emotional intelligence with a lower weight if present
  if (
    result.scores.emotionalIntelligence &&
    typeof result.scores.emotionalIntelligence.score === "number"
  ) {
    totalWeightedScore += result.scores.emotionalIntelligence.score * 0.1;
    totalWeight += 0.1;
  }

  // Calculate new overall score
  if (totalWeight > 0) {
    result.scores.overall = Math.round(totalWeightedScore / totalWeight);

    // Apply similar calibration to overall score
    if (result.scores.overall > 85) {
      result.scores.overall = Math.round(
        result.scores.overall - (result.scores.overall - 85) * 0.7
      );
    } else if (result.scores.overall > 75) {
      result.scores.overall = Math.round(
        result.scores.overall -
          (result.scores.overall - 75) * calibrationStrength * 2
      );
    } else if (result.scores.overall > 65) {
      result.scores.overall = Math.round(
        result.scores.overall -
          (result.scores.overall - 65) * calibrationStrength
      );
    }
  }

  // Update qualification based on calibrated scores
  updateQualificationStatus(result);
}

/**
 * Update qualification status based on calibrated scores
 */
function updateQualificationStatus(result: AnalysisResult): void {
  // Get primary responsibility categories from the scores
  const primaryCategories = ["domainKnowledge", "experienceRelevance"];

  // Check if all primary categories meet minimum threshold
  const primaryThreshold = 65;
  const minimumThreshold = 50;
  const overallThreshold = 65;

  let primaryRequirementsMet = true;
  let minimumRequirementsMet = true;

  for (const category of primaryCategories) {
    const scoreItem = result.scores[category as keyof typeof result.scores] as
      | ScoreItem
      | undefined;

    if (scoreItem && typeof scoreItem.score === "number") {
      if (scoreItem.score < primaryThreshold) {
        primaryRequirementsMet = false;
      }

      if (scoreItem.score < minimumThreshold) {
        minimumRequirementsMet = false;
      }
    }
  }

  // Check other categories for minimum threshold
  const otherCategories = ["communication", "responseQuality", "culturalFit"];

  for (const category of otherCategories) {
    const scoreItem = result.scores[category as keyof typeof result.scores] as
      | ScoreItem
      | undefined;

    if (scoreItem && typeof scoreItem.score === "number") {
      if (scoreItem.score < minimumThreshold) {
        minimumRequirementsMet = false;
      }
    }
  }

  // Check overall score
  const overallRequirementMet = result.scores.overall >= overallThreshold;

  // Update qualification status
  const isQualified =
    primaryRequirementsMet && minimumRequirementsMet && overallRequirementMet;

  // Only update if there's a discrepancy
  if (result.isQualified !== isQualified) {
    result.isQualified = isQualified;

    // Update reasoning if needed
    if (!isQualified) {
      const reasons = [];

      if (!primaryRequirementsMet) {
        reasons.push(
          "primary domain knowledge or experience requirements not fully met"
        );
      }

      if (!minimumRequirementsMet) {
        reasons.push(
          "one or more critical skill areas falling below minimum thresholds"
        );
      }

      if (!overallRequirementMet) {
        reasons.push("overall score falling below the required threshold");
      }

      const reasonText = reasons.join(", and ");
      result.qualificationReasoning = `After calibrated assessment, the candidate does not fully meet qualification requirements due to ${reasonText}. The scores reflect areas needing development before they would be ready for this role.`;
    }
  }
}

/**
 * Validate and enhance feedback quality
 */
function enhanceFeedbackQuality(result: AnalysisResult): void {
  // Check for specific evidence in explanations
  const evidencePatterns = [
    /candidate mentioned/i,
    /candidate stated/i,
    /candidate demonstrated/i,
    /candidate showed/i,
    /candidate explained/i,
    /candidate described/i,
    /candidate discussed/i,
    /candidate responded/i,
    /candidate said/i,
    /example[s]? include/i,
    /said.*specifically/i,
    /"[^"]{10,}"/, // Quoted text at least 10 chars
    /'[^']{10,}'/, // Single-quoted text at least 10 chars
  ];

  // Function to check if an explanation has specific evidence
  const hasSpecificEvidence = (text: string): boolean => {
    return evidencePatterns.some((pattern) => pattern.test(text));
  };

  // Check category explanations
  const categories = [
    "domainKnowledge",
    "communication",
    "responseQuality",
    "experienceRelevance",
    "culturalFit",
    "emotionalIntelligence",
  ] as const;

  for (const category of categories) {
    if (category in result.scores) {
      const scoreItem = result.scores[
        category as keyof typeof result.scores
      ] as ScoreItem | undefined;

      if (scoreItem && scoreItem.explanation) {
        // Check if the explanation lacks specific evidence
        if (!hasSpecificEvidence(scoreItem.explanation)) {
          scoreItem.explanation += ` [Note: This assessment would benefit from more specific examples from the interview transcript to support the evaluation.]`;
        }
      }
    }
  }

  // Check strengths for specific evidence
  result.strengths = result.strengths.map((strength) => {
    if (!hasSpecificEvidence(strength)) {
      return `${strength} [Note: This would be more credible with specific examples from the interview.]`;
    }
    return strength;
  });

  // Check improvements for specific evidence
  result.improvements = result.improvements.map((improvement) => {
    if (!hasSpecificEvidence(improvement)) {
      return `${improvement} [Note: This recommendation would be stronger with specific examples from the interview.]`;
    }
    return improvement;
  });

  // Check qualification reasoning
  if (!hasSpecificEvidence(result.qualificationReasoning)) {
    result.qualificationReasoning += ` [Note: This assessment would be strengthened with specific examples from the interview to support the qualification decision.]`;
  }

  // Check summary
  if (!hasSpecificEvidence(result.summary)) {
    result.summary += ` [Note: This summary would benefit from specific examples from the interview to support the overall assessment.]`;
  }
}

/**
 * Extract key requirements from job description
 */
function extractKeyRequirements(jobDescription: string): string[] {
  // Look for requirement sections
  const requirementSections = jobDescription.match(
    /requirements:?|qualifications:?|what you'll need:?|we're looking for:?|you should have:?|skills:?|expertise:?/gi
  );

  let requirements: string[] = [];

  if (requirementSections) {
    // Try to extract structured requirements using common patterns
    const requirementPatterns = [
      /[•●■◆]\s*([^•●■◆\n]+)/g, // Bullet points
      /-\s*([^-\n]+)/g, // Dash lists
      /\d+\.\s*([^\d\n]+)/g, // Numbered lists
      /\n\s*([A-Z][^.\n]+)/g, // Capitalized lines
    ];

    for (const pattern of requirementPatterns) {
      const matches = [...jobDescription.matchAll(pattern)];
      if (matches.length > 0) {
        requirements = matches
          .map((match) => match[1].trim())
          .filter((r) => r.length > 10);
        break;
      }
    }
  }

  // If no structured requirements found, extract key phrases
  if (requirements.length === 0) {
    // Look for key requirement indicators
    const keyPhrases = [
      /experience (?:with|in) ([^.,;]+)/gi,
      /knowledge of ([^.,;]+)/gi,
      /familiar with ([^.,;]+)/gi,
      /proficient in ([^.,;]+)/gi,
      /understand(?:ing)? ([^.,;]+)/gi,
      /ability to ([^.,;]+)/gi,
      /skilled in ([^.,;]+)/gi,
    ];

    const allMatches: string[] = [];

    for (const phrase of keyPhrases) {
      const matches = [...jobDescription.matchAll(phrase)];
      allMatches.push(...matches.map((match) => match[0].trim()));
    }

    // Deduplicate and clean
    requirements = [...new Set(allMatches)].filter(
      (r) => r.length > 10 && r.length < 100
    );
  }

  // If still no requirements found, fallback to key technical terms
  if (requirements.length === 0) {
    const techTerms = jobDescription.match(
      /(?:\b[A-Z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+\b|\b[A-Za-z]+\+\+\b|\b[A-Za-z]+#\b|\b[A-Za-z0-9]+-[A-Za-z0-9]+\b)/g
    );

    if (techTerms && techTerms.length > 0) {
      requirements = [`Technical skills including: ${techTerms.join(", ")}`];
    }
  }

  // Ensure we have at least some requirements
  if (requirements.length === 0) {
    // Parse generic requirements from the job description
    const sentences = jobDescription
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 20);
    requirements = sentences
      .filter(
        (s) =>
          s.toLowerCase().includes("experience") ||
          s.toLowerCase().includes("skill") ||
          s.toLowerCase().includes("ability") ||
          s.toLowerCase().includes("knowledge")
      )
      .map((s) => s.trim())
      .slice(0, 5);
  }

  // Limit to a reasonable number of requirements
  return requirements.slice(0, 10);
}
