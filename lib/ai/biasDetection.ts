import {
  openai,
  AI_CONFIG,
  isOpenAIConfigured,
} from "@/lib/ai/aiConfig";

// Bias detection service
export interface BiasDetectionResult {
  biasScore: number; // 0-100, lower is better
  detectedBiases: Array<{
    text: string;
    type: "gender" | "racial" | "age" | "cultural" | "other";
    severity: "low" | "medium" | "high";
    suggestions: string[];
  }>;
  overallAssessment: string;
  fairnessScore: number; // 0-100
}

/**
 * Detects potential biases in the provided text
 * @param text Text to analyze for bias
 * @param context The context in which the text is being used ('jobDescription', 'questions', 'analysis')
 * @returns BiasDetectionResult with details about detected biases
 */
export async function detectBias(
  text: string,
  context: "jobDescription" | "questions" | "analysis" = "jobDescription"
): Promise<BiasDetectionResult> {
  // If no text provided or it's too short, return a default "no bias" result
  if (!text || text.trim().length < 10) {
    return {
      biasScore: 0,
      detectedBiases: [],
      overallAssessment: "No text provided for bias detection.",
      fairnessScore: 100,
    };
  }

  // If OpenAI is not configured, use mock service
  if (!isOpenAIConfigured()) {
    console.log("OpenAI not configured, using mock bias detection");
    return mockBiasDetection(text, context);
  }

  try {
    const contextPrompt = getContextSpecificPrompt(context);

    // Create a comprehensive prompt for the AI
    const prompt = `
You are an AI specialized in detecting potential biases in hiring and recruitment processes.
Your task is to analyze the following text for any language that might introduce bias related to:
- Gender (pronouns, gendered terms, stereotypes)
- Age (age-specific requirements or limitations)
- Race/ethnicity (terms with racial connotations or assumptions)
- Cultural background (assumptions about cultural knowledge or behavior)
- Disability (ableist language or unnecessary physical requirements)
- Socioeconomic status (class-based assumptions)
- Other forms of bias

${contextPrompt}

TEXT TO ANALYZE:
"""
${text}
"""

Provide your analysis in a structured JSON format with the following fields:
1. biasScore: A number from 0-100 representing the overall bias level (0 = no bias, 100 = extremely biased)
2. detectedBiases: An array of detected bias instances, each with:
   - text: The specific text containing bias
   - type: The bias category ('gender', 'racial', 'age', 'cultural', 'other')
   - severity: The severity level ('low', 'medium', 'high')
   - suggestions: Array of alternative phrasings that are more inclusive
3. overallAssessment: A brief textual assessment of the overall bias level and key concerns
4. fairnessScore: A number from 0-100 representing how fair and inclusive the text is (higher is better)

Ensure you only flag genuine bias issues, not false positives. If no bias is detected, return an empty detectedBiases array and appropriate scores.
`;

    // Make API call to OpenAI
    const response = await openai!.chat.completions.create({
      model: AI_CONFIG.biasDetectionModel || AI_CONFIG.scoringModel,
      messages: [
        {
          role: "system",
          content:
            "You are an AI specialized in detecting bias in hiring and recruitment processes.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent, conservative results
      max_tokens: 2000,
    });

    // Extract and parse response
    if (!response.choices[0]?.message?.content) {
      throw new Error("No response received from AI service");
    }

    const content = response.choices[0].message.content;

    // Try to extract JSON from the response
    let jsonContent = content;

    // Check if content contains JSON within ``` code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonContent = jsonMatch[1];
    }

    // Find JSON object boundaries if needed
    if (jsonContent.includes("{") && jsonContent.includes("}")) {
      const startIndex = jsonContent.indexOf("{");
      const endIndex = jsonContent.lastIndexOf("}") + 1;
      if (startIndex >= 0 && endIndex > startIndex) {
        jsonContent = jsonContent.substring(startIndex, endIndex);
      }
    }

    // Parse the result
    const result: BiasDetectionResult = JSON.parse(jsonContent);

    // Ensure all required properties exist
    return {
      biasScore: result.biasScore || 0,
      detectedBiases: result.detectedBiases || [],
      overallAssessment:
        result.overallAssessment || "No bias assessment provided.",
      fairnessScore: result.fairnessScore || 100 - (result.biasScore || 0),
    };
  } catch (error) {
    console.error("Error in bias detection:", error);
    // Fallback to mock data on error
    return mockBiasDetection(text, context);
  }
}

/**
 * Returns context-specific prompt additions for different use cases
 */
function getContextSpecificPrompt(
  context: "jobDescription" | "questions" | "analysis"
): string {
  switch (context) {
    case "jobDescription":
      return `
This text is a JOB DESCRIPTION. Pay particular attention to:
- Requirements that might exclude qualified candidates from certain groups
- Language that suggests preference for a particular demographic
- Unnecessary qualifications that could create barriers
- "Culture fit" language that might favor certain backgrounds
- Terms that have gendered connotations (e.g., "rockstar", "ninja")`;

    case "questions":
      return `
This text contains INTERVIEW QUESTIONS. Pay particular attention to:
- Questions that might disadvantage certain groups
- Assumptions embedded in the questions
- Questions that might reveal protected characteristics
- Different standards applied based on presumed background
- Leading questions that might introduce bias`;

    case "analysis":
      return `
This text is an EVALUATION or ANALYSIS of a candidate. Pay particular attention to:
- Different standards applied to candidates of different backgrounds
- Coded language that might relate to protected characteristics
- Subjective assessments that might reflect personal bias
- "Culture fit" assessments that might favor similar backgrounds to existing team
- Emphasis on characteristics not related to job performance`;

    default:
      return "";
  }
}

/**
 * Get alternative wording suggestions based on bias detection results
 */
export function getSuggestions(biasResult: BiasDetectionResult): string[] {
  // Extract all suggestions from the bias result
  const allSuggestions: string[] = [];

  biasResult.detectedBiases.forEach((bias) => {
    bias.suggestions.forEach((suggestion) => {
      if (!allSuggestions.includes(suggestion)) {
        allSuggestions.push(suggestion);
      }
    });
  });

  return allSuggestions;
}

/**
 * Mock bias detection function for development/testing
 */
function mockBiasDetection(
  text: string,
  context: "jobDescription" | "questions" | "analysis"
): BiasDetectionResult {
  console.log(`Using mock bias detection for ${context}`);

  // Look for common bias indicators in the text
  const textLower = text.toLowerCase();
  const detectedBiases = [];

  // Check for gender-biased terms
  const genderTerms = [
    "he ",
    "him",
    "his",
    "she ",
    "her",
    "hers",
    "manpower",
    "mankind",
    "businessman",
    "businesswoman",
    "chairman",
    "manmade",
    "salesman",
    "saleswoman",
    "rockstar",
    "ninja",
    "guru",
    "strong man",
  ];

  for (const term of genderTerms) {
    if (textLower.includes(term)) {
      detectedBiases.push({
        text: term,
        type: "gender" as const,
        severity: "medium" as const,
        suggestions: getGenderNeutralSuggestion(term),
      });
      break; // Just detect one gender bias for mock
    }
  }

  // Check for age-biased terms
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

  for (const term of ageTerms) {
    if (textLower.includes(term)) {
      detectedBiases.push({
        text: term,
        type: "age" as const,
        severity: "medium" as const,
        suggestions: getAgeFairSuggestion(term),
      });
      break; // Just detect one age bias for mock
    }
  }

  // Create a bias score based on the number of detected biases
  const biasScore = Math.min(detectedBiases.length * 25, 80);
  const fairnessScore = 100 - biasScore;

  // Generate an overall assessment
  let overallAssessment = "";
  if (detectedBiases.length === 0) {
    overallAssessment = "No significant bias detected in the text.";
  } else if (detectedBiases.length === 1) {
    overallAssessment = `The text contains some potentially biased language related to ${detectedBiases[0].type}. Consider more inclusive alternatives.`;
  } else {
    overallAssessment = `The text contains several instances of potentially biased language related to ${detectedBiases
      .map((b) => b.type)
      .join(" and ")}. Consider more inclusive alternatives.`;
  }

  // Return the mock bias detection result
  return {
    biasScore,
    detectedBiases,
    overallAssessment,
    fairnessScore,
  };
}

/**
 * Helper function to get gender-neutral suggestions for gendered terms
 */
function getGenderNeutralSuggestion(term: string): string[] {
  const suggestions: Record<string, string[]> = {
    "he ": ["they", "the person", "the individual", "the candidate"],
    him: ["them", "the person", "the individual", "the candidate"],
    his: ["their", "the person's", "the individual's", "the candidate's"],
    "she ": ["they", "the person", "the individual", "the candidate"],
    her: ["them", "their", "the person", "the individual", "the candidate"],
    hers: ["theirs", "the person's", "the individual's", "the candidate's"],
    manpower: ["workforce", "staff", "personnel", "team members"],
    mankind: ["humanity", "humankind", "people", "human beings"],
    businessman: ["businessperson", "professional", "executive"],
    businesswoman: ["businessperson", "professional", "executive"],
    chairman: ["chairperson", "chair", "leader", "head"],
    manmade: ["artificial", "synthetic", "manufactured", "constructed"],
    salesman: ["salesperson", "sales representative", "sales associate"],
    saleswoman: ["salesperson", "sales representative", "sales associate"],
    rockstar: ["top performer", "high achiever", "outstanding contributor"],
    ninja: ["expert", "specialist", "professional"],
    guru: ["expert", "specialist", "authority", "leader"],
    "strong man": [
      "strong person",
      "physically strong individual",
      "person with physical strength",
    ],
  };

  return suggestions[term] || ["Use gender-neutral language"];
}

/**
 * Helper function to get age-fair suggestions for age-biased terms
 */
function getAgeFairSuggestion(term: string): string[] {
  const suggestions: Record<string, string[]> = {
    young: ["motivated", "adaptable", "dynamic"],
    fresh: ["new", "innovative", "creative"],
    energetic: ["motivated", "dynamic", "enthusiastic"],
    "digital native": [
      "proficient with digital technology",
      "experienced with digital tools",
    ],
    "recent graduate": ["early-career professional", "entry-level candidate"],
    junior: ["early-career", "entry-level", "developing professional"],
    senior: ["experienced", "advanced", "seasoned professional"],
    experienced: ["skilled", "knowledgeable", "proficient"],
    "over 5 years": ["significant experience", "established expertise"],
    "over 10 years": ["extensive experience", "comprehensive expertise"],
  };

  return suggestions[term] || ["Use age-neutral language"];
}
