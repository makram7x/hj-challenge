// Core sentiment analysis service
import OpenAI from "openai";
import { openai, AI_CONFIG, isOpenAIConfigured } from "@/lib/ai/aiConfig";

export interface SentimentResult {
  overall: string; // positive, neutral, negative
  confidence: number; // 0-100
  enthusiasm: number; // 0-100
  nervousness: number; // 0-100
  engagement: number; // 0-100
  emotionalJourney: Array<{
    timestamp: number;
    emotion: string;
    intensity: number;
  }>;
}

/**
 * Analyzes the sentiment of a candidate's responses during an interview
 * @param messages The chat history messages from the interview
 * @returns A SentimentResult object with detailed sentiment analysis
 */
export async function analyzeSentiment(
  messages: any[]
): Promise<SentimentResult> {
  // Filter to only candidate messages (user role)
  const candidateMessages = messages.filter((msg) => msg.role === "user");

  if (candidateMessages.length === 0) {
    return createDefaultSentimentResult();
  }

  // Check if OpenAI is configured
  if (!isOpenAIConfigured()) {
    console.log("OpenAI not configured, using basic sentiment analysis");
    return analyzeWithBasicApproach(candidateMessages);
  }

  try {
    // First analyze the overall sentiment metrics
    const overallMetrics = await analyzeOverallSentiment(candidateMessages);

    // Then analyze each message for the emotional journey
    const emotionalJourney = await analyzeEmotionalJourney(candidateMessages);

    return {
      ...overallMetrics,
      emotionalJourney,
    };
  } catch (error) {
    console.error("Error in sentiment analysis:", error);
    // Fall back to basic approach if AI analysis fails
    return analyzeWithBasicApproach(candidateMessages);
  }
}

/**
 * Analyzes the overall sentiment metrics for an interview
 */
async function analyzeOverallSentiment(
  candidateMessages: any[]
): Promise<Omit<SentimentResult, "emotionalJourney">> {
  // Combine all candidate messages for overall analysis
  const allResponses = candidateMessages.map((msg) => msg.content).join("\n\n");

  // Create the prompt for sentiment analysis
  const prompt = `
You are an expert in analyzing interview responses for emotional signals. Analyze the following set of candidate responses from a job interview.

CANDIDATE RESPONSES:
${allResponses}

Analyze the emotions, confidence, enthusiasm, nervousness, and engagement levels shown in these responses. 
Provide your analysis in JSON format with these fields:
1. overall: The overall emotional tone ("positive", "neutral", or "negative")
2. confidence: A score from 0-100 representing how confident the candidate appears
3. enthusiasm: A score from 0-100 representing the candidate's enthusiasm for the role/company
4. nervousness: A score from 0-100 representing how nervous the candidate appears
5. engagement: A score from 0-100 representing how engaged the candidate is with the interview

Base your analysis on specific language cues, response patterns, and emotional indicators in the text.
`;

  try {
    const response = await openai!.chat.completions.create({
      model: AI_CONFIG.sentimentAnalysisModel,
      messages: [
        {
          role: "system",
          content:
            "You are an AI specialized in sentiment analysis for interview responses.",
        },
        { role: "user", content: prompt },
      ],
      temperature: AI_CONFIG.sentimentAnalysisTemperature,
      max_tokens: AI_CONFIG.sentimentAnalysisMaxTokens,
    });

    // Extract response content
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from sentiment analysis");
    }

    // Extract JSON from the response
    let jsonContent = content;

    // Check if content contains JSON within code blocks
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
    const result = JSON.parse(jsonContent);

    // Validate and ensure all required fields
    return {
      overall: result.overall || "neutral",
      confidence: result.confidence || 50,
      enthusiasm: result.enthusiasm || 50,
      nervousness: result.nervousness || 50,
      engagement: result.engagement || 50,
    };
  } catch (error) {
    console.error("Error in overall sentiment analysis:", error);
    return {
      overall: "neutral",
      confidence: 50,
      enthusiasm: 50,
      nervousness: 50,
      engagement: 50,
    };
  }
}

/**
 * Analyzes the emotional journey throughout the interview
 */
async function analyzeEmotionalJourney(
  candidateMessages: any[]
): Promise<Array<{ timestamp: number; emotion: string; intensity: number }>> {
  const journey: Array<{
    timestamp: number;
    emotion: string;
    intensity: number;
  }> = [];

  try {
    // Analyze each message in batches of 3 to reduce API calls
    const batchSize = 3;
    for (let i = 0; i < candidateMessages.length; i += batchSize) {
      const batch = candidateMessages.slice(i, i + batchSize);
      const batchJourney = await analyzeMessageBatch(batch);
      journey.push(...batchJourney);
    }

    return journey;
  } catch (error) {
    console.error("Error analyzing emotional journey:", error);

    // Fall back to basic pattern if journey analysis fails
    return candidateMessages.map((msg, index) => {
      // Simplified emotion pattern based on position in interview
      let emotion, intensity;
      const progress = index / candidateMessages.length;

      if (progress < 0.3) {
        emotion = index % 2 === 0 ? "uncertain" : "thoughtful";
        intensity = 50 + Math.floor(progress * 100 * 0.5);
      } else if (progress < 0.7) {
        emotion = index % 2 === 0 ? "thoughtful" : "engaged";
        intensity = 60 + Math.floor((progress - 0.3) * 100 * 0.5);
      } else {
        emotion = index % 2 === 0 ? "confident" : "enthusiastic";
        intensity = 70 + Math.floor((progress - 0.7) * 100 * 0.5);
      }

      return {
        timestamp:
          msg.timestamp ||
          Date.now() - (candidateMessages.length - index) * 60000,
        emotion,
        intensity,
      };
    });
  }
}

/**
 * Analyzes a batch of messages for the emotional journey
 */
async function analyzeMessageBatch(
  messages: any[]
): Promise<Array<{ timestamp: number; emotion: string; intensity: number }>> {
  const results: Array<{
    timestamp: number;
    emotion: string;
    intensity: number;
  }> = [];

  // Format messages for analysis
  const messagesToAnalyze = messages
    .map((msg, idx) => {
      return `Message ${idx + 1}: ${msg.content}`;
    })
    .join("\n\n");

  // Create the prompt
  const prompt = `
Analyze the emotional tone of each of these interview responses individually.

RESPONSES:
${messagesToAnalyze}

For each message, identify:
1. The primary emotion expressed (choose one from: enthusiastic, confident, engaged, neutral, thoughtful, uncertain, nervous, disinterested)
2. The intensity of that emotion on a scale of 0-100

Provide your analysis in JSON format as an array of objects, one for each message, with these fields:
- emotion: The primary emotion detected
- intensity: A number from 0-100 representing the intensity of the emotion

Base your analysis on specific language cues, word choice, and emotional indicators in each response.
`;

  try {
    const response = await openai!.chat.completions.create({
      model: AI_CONFIG.sentimentAnalysisModel,
      messages: [
        {
          role: "system",
          content: "You are an AI specialized in emotional analysis of text.",
        },
        { role: "user", content: prompt },
      ],
      temperature: AI_CONFIG.sentimentAnalysisTemperature,
      max_tokens: AI_CONFIG.sentimentAnalysisMaxTokens,
    });

    // Extract response content
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from emotional journey analysis");
    }

    // Extract JSON from the response
    let jsonContent = content;

    // Check if content contains JSON within code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonContent = jsonMatch[1];
    }

    // Find JSON array boundaries if needed
    if (jsonContent.includes("[") && jsonContent.includes("]")) {
      const startIndex = jsonContent.indexOf("[");
      const endIndex = jsonContent.lastIndexOf("]") + 1;
      if (startIndex >= 0 && endIndex > startIndex) {
        jsonContent = jsonContent.substring(startIndex, endIndex);
      }
    }

    // Parse the result
    const emotionResults = JSON.parse(jsonContent);

    // Pair the results with the original messages
    messages.forEach((msg, index) => {
      if (index < emotionResults.length) {
        results.push({
          timestamp:
            msg.timestamp || Date.now() - (messages.length - index) * 60000,
          emotion: emotionResults[index].emotion || "neutral",
          intensity: emotionResults[index].intensity || 50,
        });
      }
    });

    return results;
  } catch (error) {
    console.error("Error in batch emotion analysis:", error);

    // Simple fallback for each message in the batch
    return messages.map((msg, index) => {
      return {
        timestamp:
          msg.timestamp || Date.now() - (messages.length - index) * 60000,
        emotion: "neutral",
        intensity: 50 + index * 5,
      };
    });
  }
}

/**
 * Analyzes sentiment using a basic rule-based approach when AI is not available
 */
function analyzeWithBasicApproach(candidateMessages: any[]): SentimentResult {
  // This is a more sophisticated version of the basic approach that attempts
  // to actually analyze the text content rather than just generating a predetermined pattern

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

  // Determine primary emotions
  const totalEmotionCounts = Object.values(emotionCounts).reduce(
    (a, b) => a + b,
    0
  );

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
  const baseValue = 50; // Base value for balanced metrics
  const confidence =
    baseValue + emotionCounts.confident * 5 - emotionCounts.uncertain * 5;
  const enthusiasm =
    baseValue + emotionCounts.enthusiastic * 5 - emotionCounts.nervous * 2;
  const nervousness =
    baseValue + emotionCounts.nervous * 5 - emotionCounts.confident * 3;
  const engagement = baseValue + emotionCounts.engaged * 5;

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
    const baseFactor = 0.5; // Base factor

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
}

/**
 * Creates a default sentiment result when no messages are available
 */
function createDefaultSentimentResult(): SentimentResult {
  return {
    overall: "neutral",
    confidence: 50,
    enthusiasm: 50,
    nervousness: 50,
    engagement: 50,
    emotionalJourney: [],
  };
}

/**
 * Detects significant emotional shifts during the interview
 */
export function detectEmotionalShifts(messages: any[]): {
  shifts: any[];
  significant: boolean;
} {
  // Filter to just get candidate messages
  const candidateMessages = messages.filter((msg) => msg.role === "user");

  // If we don't have enough messages, return empty result
  if (candidateMessages.length < 3) {
    return { shifts: [], significant: false };
  }

  // Analyze the content for emotional shifts
  const textContent = candidateMessages.map((msg) => msg.content);

  // Simplified emotion detection based on keywords
  const emotions = textContent.map((text, index) => {
    const textLower = text.toLowerCase();

    // Simple keyword-based emotion detection
    let emotion = "neutral";
    let intensity = 50;

    // Positive emotions
    if (
      textLower.includes("excited") ||
      textLower.includes("happy") ||
      textLower.includes("thrilled") ||
      textLower.includes("love")
    ) {
      emotion = "enthusiastic";
      intensity = 80;
    } else if (
      textLower.includes("confident") ||
      textLower.includes("certain") ||
      textLower.includes("sure") ||
      textLower.includes("definitely")
    ) {
      emotion = "confident";
      intensity = 75;
    } else if (
      textLower.includes("interested") ||
      textLower.includes("engaging") ||
      textLower.includes("fascinating")
    ) {
      emotion = "engaged";
      intensity = 70;
    }
    // Neutral emotions
    else if (
      textLower.includes("think") ||
      textLower.includes("consider") ||
      textLower.includes("perhaps")
    ) {
      emotion = "thoughtful";
      intensity = 60;
    }
    // Negative emotions
    else if (
      textLower.includes("unsure") ||
      textLower.includes("perhaps") ||
      textLower.includes("maybe") ||
      textLower.includes("might")
    ) {
      emotion = "uncertain";
      intensity = 40;
    } else if (
      textLower.includes("nervous") ||
      textLower.includes("worried") ||
      textLower.includes("anxious") ||
      textLower.includes("sorry")
    ) {
      emotion = "nervous";
      intensity = 30;
    }
    // Default pattern based on position in interview
    else {
      const progress = index / candidateMessages.length;
      if (progress < 0.25) {
        emotion = "uncertain";
        intensity = 45 + progress * 40;
      } else if (progress < 0.5) {
        emotion = "thoughtful";
        intensity = 55 + (progress - 0.25) * 40;
      } else if (progress < 0.75) {
        emotion = "engaged";
        intensity = 65 + (progress - 0.5) * 40;
      } else {
        emotion = "confident";
        intensity = 75 + (progress - 0.75) * 40;
      }
    }

    return {
      emotion,
      intensity,
      messageIndex: index,
      timestamp:
        candidateMessages[index].timestamp ||
        Date.now() - (candidateMessages.length - index) * 60000,
    };
  });

  // Look for significant changes in emotion or intensity
  const shifts = [];

  for (let i = 1; i < emotions.length; i++) {
    const current = emotions[i];
    const previous = emotions[i - 1];

    // Detect emotion changes
    if (current.emotion !== previous.emotion) {
      // Define emotion types
      const positiveEmotions = ["enthusiastic", "confident", "engaged"];
      const negativeEmotions = ["uncertain", "nervous", "disinterested"];

      // If changing to a "negative" emotion
      const isNegativeShift =
        negativeEmotions.includes(current.emotion) &&
        !negativeEmotions.includes(previous.emotion);

      // If changing to a "positive" emotion
      const isPositiveShift =
        positiveEmotions.includes(current.emotion) &&
        !positiveEmotions.includes(previous.emotion);

      // Only record significant shifts
      if (
        isNegativeShift ||
        isPositiveShift ||
        Math.abs(current.intensity - previous.intensity) > 15
      ) {
        shifts.push({
          from: {
            emotion: previous.emotion,
            intensity: previous.intensity,
            messageIndex: previous.messageIndex,
          },
          to: {
            emotion: current.emotion,
            intensity: current.intensity,
            messageIndex: current.messageIndex,
          },
          type: isPositiveShift
            ? "positive"
            : isNegativeShift
            ? "negative"
            : "neutral",
          timestamp: current.timestamp,
        });
      }
    }
  }

  // Determine if shifts are significant
  const significant =
    shifts.length > 0 &&
    (shifts.some((shift) => shift.type === "negative") || shifts.length > 2);

  return {
    shifts,
    significant,
  };
}
