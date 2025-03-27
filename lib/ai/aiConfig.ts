import OpenAI from "openai";
import { SentimentResult } from "./sentimentAnalysis";
import { BiasDetectionResult } from "./biasDetection";

// Initialize OpenAI client
// In a production app, you would use environment variables for the API key
const API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || "";

// Flag to track if we've already shown the API key warning
let apiKeyWarningShown = false;

// Check if the API key looks valid (basic format check)
const isValidApiKeyFormat = (key: string): boolean => {
  // OpenAI keys typically start with "sk-" and are fairly long
  return key.startsWith("sk-") && key.length > 20;
};

// More robust initialization
let openaiClient: OpenAI | null = null;
try {
  if (API_KEY && isValidApiKeyFormat(API_KEY)) {
    openaiClient = new OpenAI({
      apiKey: API_KEY,
      dangerouslyAllowBrowser: true,
    });
  } else {
    console.warn(
      "OpenAI API key not provided or invalid format. Mock data will be used."
    );
    apiKeyWarningShown = true;
  }
} catch (error) {
  console.error("Error initializing OpenAI client:", error);
  openaiClient = null;
}

// Export the client
export const openai = openaiClient;

// AI model configuration
export const AI_CONFIG = {
  // Model selection for different functions
  questionGenerationModel: "gpt-4o-mini",
  interviewChatModel: "gpt-4o-mini",
  scoringModel: "gpt-4o-mini",
  sentimentAnalysisModel: "gpt-4o-mini",
  biasDetectionModel: "gpt-4o-mini",

  // Temperature settings for different tasks
  questionGenerationTemperature: 0.7, // More creative for diverse questions
  interviewChatTemperature: 0.8, // Creative for dynamic conversation
  scoringTemperature: 0.2, // Lower temperature for more consistent scoring
  sentimentAnalysisTemperature: 0.3, // Balanced for sentiment detection
  biasDetectionTemperature: 0.3, // Lower temperature for bias detection to minimize false positives

  // Max tokens for different tasks
  questionGenerationMaxTokens: 2000,
  interviewChatMaxTokens: 1500,
  scoringMaxTokens: 3000,
  sentimentAnalysisMaxTokens: 1500,
  biasDetectionMaxTokens: 2000,
};

// Helper function to handle API errors
export function handleAiError(error: unknown): string {
  console.error("AI API Error:", error);

  // Type guard to check if error has a response property
  type ErrorWithResponse = {
    status?: number;
    response?: {
      status: number;
      data?: unknown;
    };
    message?: string;
  };

  // Check for API key related errors
  const err = error as ErrorWithResponse;

  if (err.status === 401 || (err.response && err.response.status === 401)) {
    console.error("API key error - unauthorized access");
    return "OpenAI API key error: The provided API key is invalid or has expired. Using mock data instead.";
  }

  if (err.response) {
    console.error("Status:", err.response.status);
    console.error("Data:", err.response.data);

    // Handle specific error cases
    if (err.response.status === 403) {
      return `API access error: The API key doesn't have access to the required models. Please check your OpenAI account.`;
    }

    return `API error: ${err.response.status}`;
  } else if (err.message) {
    return `Error: ${err.message}`;
  } else {
    return "An unknown error occurred with the AI service";
  }
}

// Function to check if OpenAI is configured
export function isOpenAIConfigured(): boolean {
  return !!openai;
}

// Show one-time warning for missing API key
export function checkAndWarnAboutApiKey(): void {
  if (!apiKeyWarningShown && !isOpenAIConfigured()) {
    console.warn("OpenAI API is not configured. Mock data will be used.");
    apiKeyWarningShown = true;
  }
}

// Define interfaces for the message types
interface Message {
  id?: string;
  role: string;
  content: string;
  timestamp?: number;
}

// Define types that align with BiasDetectionResult
type BiasType = "gender" | "age" | "cultural" | "racial" | "other";
type BiasSeverity = "low" | "medium" | "high";

// Mock data generator for development when API isn't available
export const mockAIService = {
  generateQuestions: (jobDescription: string) => {
    console.log("Using mock question generation");

    // Parse job description for role hints
    const jobDescLower = jobDescription.toLowerCase();

    // Determine job type
    let jobType = "general";
    if (
      jobDescLower.includes("developer") ||
      jobDescLower.includes("engineer")
    ) {
      jobType = "tech";
    } else if (
      jobDescLower.includes("marketing") ||
      jobDescLower.includes("sales")
    ) {
      jobType = "sales";
    } else if (
      jobDescLower.includes("manager") ||
      jobDescLower.includes("director")
    ) {
      jobType = "management";
    }

    // Create mock questions based on job type
    const mockQuestions = [
      // Tech role questions
      ...(jobType === "tech"
        ? [
            {
              id: "1",
              text: "Can you describe your experience with modern web development frameworks?",
              category: "technical",
            },
            {
              id: "2",
              text: "How do you approach testing and quality assurance in your development process?",
              category: "technical",
            },
          ]
        : []),

      // Sales role questions
      ...(jobType === "sales"
        ? [
            {
              id: "1",
              text: "Describe your approach to prospecting and qualifying leads.",
              category: "technical",
            },
            {
              id: "2",
              text: "How do you handle objections during the sales process?",
              category: "technical",
            },
          ]
        : []),

      // Management role questions
      ...(jobType === "management"
        ? [
            {
              id: "1",
              text: "How do you approach setting goals and KPIs for your team?",
              category: "technical",
            },
            {
              id: "2",
              text: "Describe your leadership style and how you adapt it to different team members.",
              category: "technical",
            },
          ]
        : []),

      // General fallback questions if job type wasn't identified
      ...(jobType === "general"
        ? [
            {
              id: "1",
              text: "What specific skills and experience do you have that make you a good fit for this role?",
              category: "technical",
            },
            {
              id: "2",
              text: "How do you stay updated with industry trends and developments?",
              category: "technical",
            },
          ]
        : []),

      // Common behavioral questions for all roles
      {
        id: "3",
        text: "Tell me about a challenging situation you faced in your previous role and how you handled it.",
        category: "behavioral",
      },
      {
        id: "4",
        text: "How do you approach working in a team environment?",
        category: "behavioral",
      },

      // Situational question
      {
        id: "5",
        text: "How would you handle a situation where priorities change unexpectedly and you need to adjust your work plan?",
        category: "situational",
      },
    ];

    // Extract some keywords from job description for context
    const jobKeywords = jobDescription
      .split(" ")
      .filter((word) => word.length > 5)
      .slice(0, 5)
      .map((word) => word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ""));

    return {
      questions: mockQuestions.slice(0, 5), // Ensure we return exactly 5 questions
      context: {
        jobDescription: `Position requiring skills in ${
          jobType === "tech"
            ? "software development and programming"
            : jobType === "sales"
            ? "sales and client relationships"
            : jobType === "management"
            ? "leadership and team management"
            : "professional expertise and communication"
        }.`,
        cvHighlights: [
          `Experience with ${
            jobKeywords[0] ||
            (jobType === "tech"
              ? "software development"
              : jobType === "sales"
              ? "client acquisition"
              : jobType === "management"
              ? "team leadership"
              : "professional work")
          }`,
          `Background in ${
            jobKeywords[1] ||
            (jobType === "tech"
              ? "programming languages"
              : jobType === "sales"
              ? "sales strategies"
              : jobType === "management"
              ? "performance management"
              : "project execution")
          }`,
          `Knowledge of ${
            jobKeywords[2] ||
            (jobType === "tech"
              ? "development tools"
              : jobType === "sales"
              ? "market trends"
              : jobType === "management"
              ? "business operations"
              : "industry practices")
          }`,
        ],
        keyCompetencies: [
          jobType === "tech"
            ? "Technical proficiency"
            : jobType === "sales"
            ? "Persuasive communication"
            : jobType === "management"
            ? "Leadership"
            : "Professional expertise",
          "Problem solving",
          "Team collaboration",
        ],
      },
      biasMetrics: {
        // Added bias metrics to mock response
        biasScore: 15,
        fairnessScore: 85,
        detectedBiases: [],
      },
    };
  },

  generateChatResponse: (message: string) => {
    console.log("Using mock chat response generation");

    // Based on the message content, generate appropriate follow-up questions
    if (message.length < 100) {
      return "Could you elaborate on that more? I'm interested in hearing specific examples.";
    }

    const followUps = [
      "That's interesting. How did that experience shape your approach to similar situations later in your career?",
      "Can you tell me about a specific challenge you faced during this project and how you overcame it?",
      "How would you apply what you learned from this experience to the role you're interviewing for?",
      "That's helpful context. What would you say was the most important skill you developed from this experience?",
      "I'd like to understand more about your process. Could you walk me through your thinking?",
    ];

    return followUps[Math.floor(Math.random() * followUps.length)];
  },

  analyzeInterview: (
    chatHistory: Message[],
    responseTimes: Record<string, number>
  ) => {
    console.log("Using mock interview analysis");

    // Calculate average response time
    const avgTime = Object.values(responseTimes).length
      ? Object.values(responseTimes).reduce((a, b) => a + b, 0) /
        Object.values(responseTimes).length
      : 0;

    // Generate mock scores
    const domainScore = Math.floor(Math.random() * 15) + 75; // 75-90
    const commScore =
      avgTime < 30
        ? Math.floor(Math.random() * 10) + 80
        : Math.floor(Math.random() * 10) + 70;
    const responseScore =
      avgTime < 15 ? 90 : avgTime < 30 ? 80 : avgTime < 60 ? 70 : 60;
    const experienceScore = Math.floor(Math.random() * 15) + 75;
    const cultureFitScore = Math.floor(Math.random() * 15) + 75;
    const emotionalIntelligenceScore = Math.floor(Math.random() * 15) + 75;

    // Calculate overall score
    const overallScore = Math.round(
      domainScore * 0.2 +
        commScore * 0.2 +
        responseScore * 0.15 +
        experienceScore * 0.2 +
        cultureFitScore * 0.15 +
        emotionalIntelligenceScore * 0.1
    );

    // Determine if qualified (basic threshold check)
    const isQualified =
      overallScore >= 75 &&
      domainScore >= 70 &&
      commScore >= 65 &&
      experienceScore >= 70;

    return {
      scores: {
        domainKnowledge: {
          score: domainScore,
          explanation:
            "The candidate demonstrated good domain knowledge relevant to the position through their detailed responses.",
        },
        communication: {
          score: commScore,
          explanation:
            "The candidate's communication style was clear and well-structured, showing an ability to explain concepts effectively.",
        },
        responseQuality: {
          score: responseScore,
          explanation:
            avgTime < 15
              ? "The candidate provided thoughtful responses quickly, indicating good preparation and quick thinking."
              : avgTime < 30
              ? "Responses were well-considered and timely, demonstrating good cognitive processing."
              : "Response quality was good, though some answers took longer to formulate than optimal.",
        },
        experienceRelevance: {
          score: experienceScore,
          explanation:
            "The candidate's past experience aligns well with the key requirements of this position.",
        },
        culturalFit: {
          score: cultureFitScore,
          explanation:
            "The candidate's described work style and values appear aligned with the company culture.",
        },
        emotionalIntelligence: {
          score: emotionalIntelligenceScore,
          explanation:
            "The candidate demonstrated good emotional awareness and regulation throughout the interview, responding appropriately to questions and showing empathy when discussing team interactions.",
        },
        overall: overallScore,
      },
      strengths: [
        "Clear communication with well-structured responses",
        "Good domain knowledge demonstrated through specific examples",
        "Relevant experience that aligns with key job requirements",
      ],
      improvements: [
        "Could provide more quantifiable achievements in examples",
        "Further development in technical depth would be beneficial",
        "Consider more concise responses to complex questions",
      ],
      isQualified: isQualified,
      qualificationReasoning: isQualified
        ? "The candidate meets or exceeds the requirements for this position across all evaluation criteria. Their domain knowledge and relevant experience are particularly strong, and they communicate clearly. They demonstrate the necessary skills and experience to perform well in this role."
        : "While the candidate has notable strengths, they don't fully meet the threshold requirements for this position. There are gaps in their domain knowledge and relevant experience that would make it challenging for them to succeed in this role without significant additional training.",
      summary: `Overall, the candidate scored ${overallScore}/100. They showed ${
        isQualified ? "strong" : "moderate"
      } domain knowledge and communication skills. Response times were ${
        avgTime < 30 ? "good" : "moderate"
      }, and their experience ${
        isQualified ? "aligns well with" : "partially matches"
      } the position requirements.`,
      fairnessAssurance: {
        potentialBiases:
          "The evaluation was conducted with fairness in mind, focusing solely on job-relevant qualifications and competencies.",
        mitigationSteps:
          "Care was taken to assess the candidate based on demonstrated skills and relevant experience, rather than subjective impressions.",
        diverseEvaluationConsiderations:
          "Multiple dimensions of job performance were considered, allowing for various ways candidates might demonstrate competence.",
      },
      biasMetrics: {
        biasScore: 10,
        fairnessScore: 90,
        detectedBiases: [],
      },
    };
  },

  // Improved sentiment analysis mock
  analyzeSentiment: (messages: Message[]): SentimentResult => {
    console.log("Using improved mock sentiment analysis");

    // Filter to just get candidate messages
    const candidateMessages = messages.filter((msg) => msg.role === "user");

    if (candidateMessages.length === 0) {
      return {
        overall: "neutral",
        confidence: 50,
        enthusiasm: 50,
        nervousness: 50,
        engagement: 50,
        emotionalJourney: [],
      };
    }

    // Extract all the text content
    const allText = candidateMessages
      .map((msg) => msg.content.toLowerCase())
      .join(" ");

    // Define emotion indicators - simple keyword based approach
    const emotionIndicators = {
      enthusiastic: ["excited", "passionate", "love", "thrilled", "!"],
      confident: ["certain", "sure", "confident", "definitely", "absolutely"],
      engaged: ["interesting", "curious", "tell me more", "question", "wonder"],
      thoughtful: ["think", "consider", "perhaps", "maybe", "might"],
      uncertain: ["not sure", "possibly", "i guess", "kind of", "sort of"],
      nervous: ["sorry", "apologize", "nervous", "worried", "concern"],
    };

    // Count occurrences of emotion indicators
    const emotionCounts: Record<string, number> = {
      enthusiastic: 0,
      confident: 0,
      engaged: 0,
      thoughtful: 0,
      uncertain: 0,
      nervous: 0,
    };

    // Count indicator occurrences
    Object.entries(emotionIndicators).forEach(([emotion, indicators]) => {
      indicators.forEach((indicator) => {
        const regex = new RegExp(indicator, "gi");
        const matches = allText.match(regex);
        if (matches) {
          emotionCounts[emotion] += matches.length;
        }
      });
    });

    // Calculate basic metrics
    const positiveEmotions =
      emotionCounts.enthusiastic +
      emotionCounts.confident +
      emotionCounts.engaged;
    const negativeEmotions = emotionCounts.uncertain + emotionCounts.nervous;
    const neutralEmotions = emotionCounts.thoughtful;

    // Determine overall sentiment
    let overall = "neutral";
    if (positiveEmotions > negativeEmotions + neutralEmotions) {
      overall = "positive";
    } else if (negativeEmotions > positiveEmotions + neutralEmotions) {
      overall = "negative";
    }

    // Calculate metrics
    const confidence =
      50 + emotionCounts.confident * 5 - emotionCounts.uncertain * 5;
    const enthusiasm =
      50 + emotionCounts.enthusiastic * 5 - emotionCounts.nervous * 2;
    const nervousness =
      50 + emotionCounts.nervous * 5 - emotionCounts.confident * 3;
    const engagement = 50 + emotionCounts.engaged * 5;

    // Normalize values between 0-100
    const normalizeValue = (value: number) => Math.max(0, Math.min(100, value));

    // Create emotional journey
    const emotionalJourney = candidateMessages.map((msg, index) => {
      // Try to determine emotion from message content
      const text = msg.content.toLowerCase();
      let primaryEmotion = "neutral";
      let maxCount = 0;

      Object.entries(emotionIndicators).forEach(([emotion, indicators]) => {
        let count = 0;
        indicators.forEach((indicator) => {
          if (text.includes(indicator)) {
            count++;
          }
        });

        if (count > maxCount) {
          maxCount = count;
          primaryEmotion = emotion;
        }
      });

      // Default pattern if no strong indicators
      if (maxCount === 0) {
        const progress = index / candidateMessages.length;
        if (progress < 0.3) {
          primaryEmotion = "uncertain";
        } else if (progress < 0.7) {
          primaryEmotion = index % 2 === 0 ? "thoughtful" : "engaged";
        } else {
          primaryEmotion = index % 2 === 0 ? "confident" : "enthusiastic";
        }
      }

      // Calculate intensity based on position and message length
      const positionFactor = Math.min(
        1,
        index / Math.max(1, candidateMessages.length - 1)
      );
      const lengthFactor = Math.min(1, text.length / 500); // Longer responses tend to show more engagement

      const intensity = Math.floor(
        50 + positionFactor * 20 + lengthFactor * 15 + maxCount * 5
      );

      return {
        timestamp:
          msg.timestamp ||
          Date.now() - (candidateMessages.length - index) * 60000,
        emotion: primaryEmotion,
        intensity: Math.min(100, intensity),
      };
    });

    return {
      overall,
      confidence: normalizeValue(confidence),
      enthusiasm: normalizeValue(enthusiasm),
      nervousness: normalizeValue(nervousness),
      engagement: normalizeValue(engagement),
      emotionalJourney,
    };
  },

  // Bias detection mock
  detectBias: (text: string): BiasDetectionResult => {
    console.log("Using mock bias detection");

    // Simulate bias detection based on common patterns
    const textLower = text.toLowerCase();
    const biases: Array<{
      text: string;
      type: BiasType;
      severity: BiasSeverity;
      suggestions: string[];
    }> = [];

    // Check for gender-biased terms
    const genderTerms = [
      "he is",
      "she is",
      "his",
      "her",
      "himself",
      "herself",
      "man",
      "woman",
      "male",
      "female",
      "guys",
      "girls",
      "boys",
      "manpower",
      "mankind",
      "chairman",
      "manmade",
      "salesman",
      "saleswoman",
      "businessman",
      "businesswoman",
      "rockstar",
      "ninja",
      "guru",
    ];

    const ageTerms = [
      "young",
      "fresh",
      "energetic",
      "digital native",
      "recent graduate",
      "junior",
      "senior",
      "experienced",
      "over 5 years",
      "over 10 years",
    ];

    const culturalTerms = [
      "culture fit",
      "cultural fit",
      "team player",
      "work hard play hard",
      "fast-paced environment",
    ];

    // Check for gender bias
    for (const term of genderTerms) {
      if (textLower.includes(term)) {
        biases.push({
          text: term,
          type: "gender",
          severity: "medium",
          suggestions: [
            term === "he is"
              ? "they are"
              : term === "she is"
              ? "they are"
              : term === "his"
              ? "their"
              : term === "her"
              ? "their"
              : term === "himself"
              ? "themselves"
              : term === "herself"
              ? "themselves"
              : term === "man"
              ? "person"
              : term === "woman"
              ? "person"
              : term === "male"
              ? "individual"
              : term === "female"
              ? "individual"
              : term === "guys"
              ? "team members"
              : term === "girls"
              ? "team members"
              : term === "boys"
              ? "team members"
              : term === "manpower"
              ? "workforce"
              : term === "mankind"
              ? "humanity"
              : term === "chairman"
              ? "chairperson"
              : term === "manmade"
              ? "artificial"
              : term === "salesman"
              ? "salesperson"
              : term === "saleswoman"
              ? "salesperson"
              : term === "businessman"
              ? "businessperson"
              : term === "businesswoman"
              ? "businessperson"
              : term === "rockstar"
              ? "top performer"
              : term === "ninja"
              ? "expert"
              : term === "guru"
              ? "specialist"
              : "neutral alternative",
          ],
        });
        break; // Just detect one gender bias for mock
      }
    }

    // Check for age bias
    for (const term of ageTerms) {
      if (textLower.includes(term)) {
        biases.push({
          text: term,
          type: "age",
          severity: "medium",
          suggestions: [
            term === "young"
              ? "motivated"
              : term === "fresh"
              ? "new to the field"
              : term === "energetic"
              ? "motivated"
              : term === "digital native"
              ? "technically proficient"
              : term === "recent graduate"
              ? "early-career professional"
              : term === "junior"
              ? "early-career"
              : term === "senior"
              ? "experienced"
              : term === "experienced"
              ? "skilled"
              : term.includes("over 5 years")
              ? "significant experience"
              : term.includes("over 10 years")
              ? "extensive experience"
              : "neutral alternative",
          ],
        });
        break; // Just detect one age bias for mock
      }
    }

    // Check for cultural bias
    for (const term of culturalTerms) {
      if (textLower.includes(term)) {
        biases.push({
          text: term,
          type: "cultural",
          severity: "low",
          suggestions: [
            term.includes("culture fit")
              ? "alignment with company values"
              : term.includes("cultural fit")
              ? "alignment with company values"
              : term === "team player"
              ? "collaborative"
              : term === "work hard play hard"
              ? "dedicated and social team"
              : term === "fast-paced environment"
              ? "dynamic environment"
              : "neutral alternative",
          ],
        });
        break; // Just detect one cultural bias for mock
      }
    }

    // Create bias score based on number of found biases
    const biasScore = Math.min(biases.length * 30, 90);
    const fairnessScore = 100 - biasScore;

    return {
      biasScore,
      detectedBiases: biases,
      overallAssessment:
        biases.length === 0
          ? "No significant bias detected in the text."
          : `The text contains some potentially biased language that could limit candidate diversity. Consider using more inclusive language.`,
      fairnessScore,
    };
  },
};
