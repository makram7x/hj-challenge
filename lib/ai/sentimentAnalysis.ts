// Core sentiment analysis service
import { openai, AI_CONFIG, isOpenAIConfigured } from "@/lib/ai/aiConfig";

// Message interface to replace 'any' types
interface Message {
  role: string;
  content: string;
  timestamp?: number;
  id?: string; // Added optional id property
}

// Emotion data interface
interface EmotionData {
  emotion: string;
  intensity: number;
  messageIndex: number;
  timestamp: number;
}

// Emotional shift interface
interface EmotionalShift {
  from: {
    emotion: string;
    intensity: number;
    messageIndex: number;
  };
  to: {
    emotion: string;
    intensity: number;
    messageIndex: number;
  };
  type: "positive" | "negative" | "neutral";
  timestamp: number;
}

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
  messages: Message[]
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
  candidateMessages: Message[]
): Promise<Omit<SentimentResult, "emotionalJourney">> {
  // Combine all candidate messages for overall analysis
  const allResponses = candidateMessages.map((msg) => msg.content).join("\n\n");

  // Create the prompt for sentiment analysis
  const prompt = `
You are an expert in analyzing job interview responses for emotional signals and professional communication patterns. Analyze the following set of candidate responses from a job interview.

CANDIDATE RESPONSES:
${allResponses}

JOB CONTEXT:
This is a professional job interview.

Provide a detailed emotional and communication analysis in JSON format with these fields:
1. overall: The overall emotional tone ("positive", "neutral", or "negative")
2. confidence: A score from 0-100 representing how confident the candidate appears in their abilities and responses
3. enthusiasm: A score from 0-100 representing the candidate's enthusiasm for the role, company, and interview topics
4. nervousness: A score from 0-100 representing how nervous the candidate appears throughout their responses
5. engagement: A score from 0-100 representing how engaged and present the candidate is with the interview questions

Base your analysis on:
- Professional language markers (formal vs casual language, industry terminology)
- Confidence indicators (assertive statements, use of "I know" vs "I think", hesitation words)
- Enthusiasm signals (positive language about the role/company, future-focused statements)
- Nervousness patterns (self-corrections, apologies, qualifying statements)
- Engagement evidence (detailed responses, follow-up thoughts, question references)

IMPORTANT: Calibrate scores based on professional interview context, not casual conversation.
`;

  try {
    const response = await openai!.chat.completions.create({
      model: AI_CONFIG.sentimentAnalysisModel,
      messages: [
        {
          role: "system",
          content:
            "You are an AI specialized in sentiment analysis for professional job interview responses.",
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
 * Analyzes the emotional journey throughout the interview with improved context awareness
 */
async function analyzeEmotionalJourney(
  candidateMessages: Message[]
): Promise<Array<{ timestamp: number; emotion: string; intensity: number }>> {
  const journey: Array<{
    timestamp: number;
    emotion: string;
    intensity: number;
  }> = [];

  try {
    // Instead of analyzing in isolated batches, include context from previous messages
    // Process in smaller batches but with overlapping context
    const batchSize = 3;
    const contextSize = 1; // How many previous messages to include for context

    for (let i = 0; i < candidateMessages.length; i += batchSize) {
      // Calculate start index with context (don't go below 0)
      const startIndex = Math.max(0, i - contextSize);
      // Get batch with context
      const contextBatch = candidateMessages.slice(startIndex, i + batchSize);
      // Track which messages are context vs. target for analysis
      const contextIndices = Array.from(
        { length: contextBatch.length },
        (_, idx) => startIndex + idx < i
      );

      const batchJourney = await analyzeMessageBatchWithContext(
        contextBatch,
        contextIndices
      );

      // Only add the newly analyzed messages (not the context ones)
      const newJourneyEntries = batchJourney.slice(
        contextIndices.filter(Boolean).length
      );
      journey.push(...newJourneyEntries);
    }

    // Post-process the journey to smooth out anomalies
    return smoothEmotionalJourney(journey);
  } catch (error) {
    console.error("Error analyzing emotional journey:", error);
    // Enhanced fallback
    return generateFallbackEmotionalJourney(candidateMessages);
  }
}

/**
 * Analyzes a batch of messages with context awareness for the emotional journey
 */
async function analyzeMessageBatchWithContext(
  messages: Message[],
  contextIndices: boolean[]
): Promise<Array<{ timestamp: number; emotion: string; intensity: number }>> {
  const results: Array<{
    timestamp: number;
    emotion: string;
    intensity: number;
  }> = [];

  // Format messages for analysis, marking which are context vs. targets
  const messagesToAnalyze = messages
    .map((msg, idx) => {
      const prefix = contextIndices[idx] ? "[CONTEXT] " : "[ANALYZE] ";
      return `${prefix}Message ${idx + 1}: ${msg.content}`;
    })
    .join("\n\n");

  // Create an enhanced prompt that understands context vs. target messages
  const prompt = `
Analyze the emotional tone of interview responses with context awareness.

INTERVIEW CONTEXT:
This is a professional job interview.

RESPONSES:
${messagesToAnalyze}

For each message marked with [ANALYZE] (not the context messages), identify:
1. The primary emotion expressed (choose the most accurate from: enthusiastic, confident, engaged, neutral, thoughtful, uncertain, nervous, defensive, evasive)
2. The intensity of that emotion on a scale of 0-100
3. Consider how the emotion relates to previous context messages marked with [CONTEXT]

Provide your analysis in JSON format as an array of objects, one for each [ANALYZE] message, with these fields:
- emotion: The primary emotion detected
- intensity: A number from 0-100 representing the intensity of the emotion

Focus on how emotions develop in sequence through the interview, particularly noting shifts in emotional state.
Use context from previous messages to better understand emotional progression.
`;

  try {
    const response = await openai!.chat.completions.create({
      model: AI_CONFIG.sentimentAnalysisModel,
      messages: [
        {
          role: "system",
          content:
            "You are an AI specialized in sequential emotional analysis of interview responses.",
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

    // Only process the non-context messages (the ones we want to analyze)
    const targetMessages = messages.filter((_, idx) => !contextIndices[idx]);

    targetMessages.forEach((msg, index) => {
      if (index < emotionResults.length) {
        results.push({
          timestamp:
            msg.timestamp ||
            Date.now() - (targetMessages.length - index) * 60000,
          emotion: emotionResults[index].emotion || "neutral",
          intensity: emotionResults[index].intensity || 50,
        });
      }
    });

    return results;
  } catch (error) {
    console.error("Error in batch emotion analysis with context:", error);

    // Fallback for the batch
    return messages
      .filter((_, idx) => !contextIndices[idx])
      .map((msg, index) => {
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
 * Smooths the emotional journey to eliminate unlikely rapid changes
 */
function smoothEmotionalJourney(
  journey: Array<{ timestamp: number; emotion: string; intensity: number }>
): Array<{ timestamp: number; emotion: string; intensity: number }> {
  if (journey.length <= 2) return journey;

  const smoothed = [...journey];

  // Simple smoothing algorithm - look for outliers
  for (let i = 1; i < smoothed.length - 1; i++) {
    const prev = smoothed[i - 1];
    const current = smoothed[i];
    const next = smoothed[i + 1];

    // If current emotion is different from both neighbors, and they're the same
    if (prev.emotion === next.emotion && current.emotion !== prev.emotion) {
      // This might be an outlier - adjust it
      current.emotion = prev.emotion;
      // Smooth the intensity too
      current.intensity = Math.round((prev.intensity + next.intensity) / 2);
    }

    // Check for drastic intensity changes
    const prevDiff = Math.abs(current.intensity - prev.intensity);
    const nextDiff = Math.abs(current.intensity - next.intensity);

    if (prevDiff > 30 && nextDiff > 30) {
      // This is likely an intensity outlier
      current.intensity = Math.round((prev.intensity + next.intensity) / 2);
    }
  }

  return smoothed;
}

/**
 * Generates a more sophisticated fallback emotional journey
 */
function generateFallbackEmotionalJourney(
  candidateMessages: Message[]
): Array<{ timestamp: number; emotion: string; intensity: number }> {
  return candidateMessages.map((msg, index) => {
    const progress = index / candidateMessages.length;
    const text = msg.content.toLowerCase();

    // More sophisticated pattern based on message content and position
    let emotion, intensity;

    // Check for specific emotional indicators in the text
    if (
      text.includes("excited") ||
      text.includes("love") ||
      text.includes("thrilled")
    ) {
      emotion = "enthusiastic";
      intensity = 75 + Math.floor(Math.random() * 15);
    } else if (
      text.includes("confident") ||
      text.includes("certain") ||
      text.includes("sure")
    ) {
      emotion = "confident";
      intensity = 70 + Math.floor(Math.random() * 20);
    } else if (
      text.includes("interesting") ||
      text.includes("tell me more") ||
      text.includes("curious")
    ) {
      emotion = "engaged";
      intensity = 65 + Math.floor(Math.random() * 20);
    } else if (
      text.includes("think") ||
      text.includes("consider") ||
      text.includes("perhaps")
    ) {
      emotion = "thoughtful";
      intensity = 60 + Math.floor(Math.random() * 15);
    } else if (
      text.includes("not sure") ||
      text.includes("possibly") ||
      text.includes("might")
    ) {
      emotion = "uncertain";
      intensity = 40 + Math.floor(Math.random() * 20);
    } else if (
      text.includes("sorry") ||
      text.includes("nervous") ||
      text.includes("worried")
    ) {
      emotion = "nervous";
      intensity = 45 + Math.floor(Math.random() * 25);
    } else {
      // Position-based progression pattern
      if (progress < 0.2) {
        emotion = index % 2 === 0 ? "uncertain" : "thoughtful";
        intensity = 45 + Math.floor(progress * 100 * 0.8);
      } else if (progress < 0.5) {
        emotion = index % 2 === 0 ? "thoughtful" : "engaged";
        intensity = 55 + Math.floor((progress - 0.2) * 100 * 0.6);
      } else if (progress < 0.8) {
        emotion = index % 2 === 0 ? "engaged" : "confident";
        intensity = 65 + Math.floor((progress - 0.5) * 100 * 0.6);
      } else {
        emotion = index % 2 === 0 ? "confident" : "enthusiastic";
        intensity = 75 + Math.floor((progress - 0.8) * 100 * 0.5);
      }
    }

    // Add some natural variation
    intensity = Math.max(
      30,
      Math.min(95, intensity + (Math.random() > 0.5 ? 5 : -5))
    );

    return {
      timestamp:
        msg.timestamp ||
        Date.now() - (candidateMessages.length - index) * 60000,
      emotion,
      intensity,
    };
  });
}

/**
 * Analyzes sentiment using a more sophisticated rule-based approach when AI is not available
 */
function analyzeWithBasicApproach(
  candidateMessages: Message[]
): SentimentResult {
  // Extract all the text content
  const allText = candidateMessages
    .map((msg) => msg.content.toLowerCase())
    .join(" ");

  // Define more comprehensive emotion indicators with weighted patterns
  const emotionPatterns = {
    enthusiastic: {
      phrases: [
        "excited",
        "passionate",
        "love",
        "thrilled",
        "can't wait",
        "looking forward",
        "eager",
      ],
      expressionPatterns: [
        /!{1,}/g,
        /\bgreat\b/g,
        /\bexcellent\b/g,
        /\bamazing\b/g,
      ],
      weight: 1.2, // Enthusiasm is important in interviews
    },
    confident: {
      phrases: [
        "certain",
        "sure",
        "confident",
        "definitely",
        "absolutely",
        "I know",
        "I've accomplished",
        "I led",
        "I achieved",
      ],
      expressionPatterns: [
        /\bI [a-z]+ [a-z]+ experience\b/gi,
        /\bmy strength\b/gi,
        /\bI succeeded\b/gi,
      ],
      weight: 1.5, // Confidence is very important in interviews
    },
    engaged: {
      phrases: [
        "interesting",
        "curious",
        "tell me more",
        "question",
        "wonder",
        "understand",
        "learn about",
        "research",
        "explored",
      ],
      expressionPatterns: [
        /\?/g,
        /\bfor example\b/gi,
        /\bspecifically\b/gi,
        /\bin particular\b/gi,
      ],
      weight: 1.3,
    },
    thoughtful: {
      phrases: [
        "think",
        "consider",
        "perhaps",
        "maybe",
        "might",
        "reflect",
        "analyze",
        "evaluate",
      ],
      expressionPatterns: [
        /\bon one hand\b/gi,
        /\bon the other hand\b/gi,
        /\bhowever\b/gi,
        /\btherefore\b/gi,
      ],
      weight: 1.0,
    },
    uncertain: {
      phrases: [
        "not sure",
        "possibly",
        "I guess",
        "kind of",
        "sort of",
        "somewhat",
        "I think",
        "typically",
      ],
      expressionPatterns: [
        /\bmaybe\b/gi,
        /\bperhaps\b/gi,
        /\bI'm not certain\b/gi,
        /\bcould be\b/gi,
      ],
      weight: 0.8, // Some uncertainty is normal in interviews
    },
    nervous: {
      phrases: [
        "sorry",
        "apologize",
        "nervous",
        "worried",
        "concern",
        "stress",
        "anxiety",
        "mistake",
      ],
      expressionPatterns: [
        /um+/gi,
        /uh+/gi,
        /er+/gi,
        /\bI apologize\b/gi,
        /\bsorry about\b/gi,
      ],
      weight: 0.7,
    },
    disinterested: {
      phrases: [
        "whatever",
        "doesn't matter",
        "I don't know",
        "not sure why",
        "not interested",
      ],
      expressionPatterns: [
        /\bbasically\b/gi,
        /\banyway\b/gi,
        /\bnot really\b/gi,
      ],
      weight: 0.5, // Least weight as these might be false positives
    },
  };

  // Calculate weighted emotion scores
  const emotionScores: Record<string, number> = {
    enthusiastic: 0,
    confident: 0,
    engaged: 0,
    thoughtful: 0,
    uncertain: 0,
    nervous: 0,
    disinterested: 0,
  };

  // Count indicator occurrences
  for (const [emotion, patterns] of Object.entries(emotionPatterns)) {
    let score = 0;

    // Check phrases
    patterns.phrases.forEach((phrase) => {
      // Count how many times the phrase appears
      const regex = new RegExp(`\\b${phrase}\\b`, "gi");
      const matches = allText.match(regex);
      if (matches) {
        score += matches.length * patterns.weight;
      }
    });

    // Check expression patterns
    patterns.expressionPatterns.forEach((pattern) => {
      const matches = allText.match(pattern);
      if (matches) {
        score += matches.length * patterns.weight;
      }
    });

    emotionScores[emotion] = score;
  }

  // Analyze response length and complexity as indicators of engagement
  const avgResponseLength =
    candidateMessages.reduce((sum, msg) => sum + msg.content.length, 0) /
    candidateMessages.length;

  // Average words per response as measure of detail/thoroughness
  const wordCount = allText.split(/\s+/).length;
  const avgWordsPerResponse = wordCount / candidateMessages.length;

  // Adjust engagement score based on response length and word count
  if (avgResponseLength > 500)
    emotionScores.engaged += 3 * emotionPatterns.engaged.weight;
  else if (avgResponseLength > 300)
    emotionScores.engaged += 2 * emotionPatterns.engaged.weight;
  else if (avgResponseLength > 100)
    emotionScores.engaged += 1 * emotionPatterns.engaged.weight;

  if (avgWordsPerResponse > 100)
    emotionScores.engaged += 3 * emotionPatterns.engaged.weight;
  else if (avgWordsPerResponse > 50)
    emotionScores.engaged += 2 * emotionPatterns.engaged.weight;
  else if (avgWordsPerResponse > 25)
    emotionScores.engaged += 1 * emotionPatterns.engaged.weight;

  // Calculate metrics based on emotion scores
  const positiveEmotions =
    emotionScores.enthusiastic +
    emotionScores.confident +
    emotionScores.engaged;

  const negativeEmotions =
    emotionScores.uncertain +
    emotionScores.nervous +
    emotionScores.disinterested;

  const neutralEmotions = emotionScores.thoughtful;

  // Determine overall sentiment with more nuance
  let overall = "neutral";
  const emotionTotal = positiveEmotions + negativeEmotions + neutralEmotions;

  if (emotionTotal > 0) {
    const positiveRatio = positiveEmotions / emotionTotal;
    const negativeRatio = negativeEmotions / emotionTotal;

    if (positiveRatio > 0.6) overall = "positive";
    else if (negativeRatio > 0.6) overall = "negative";
  }

  // Calculate normalized metrics (0-100 scale)
  const normalizeValue = (value: number): number => {
    return Math.max(0, Math.min(100, Math.round(value)));
  };

  // Base values for metrics
  const baseConfidence =
    50 +
    emotionScores.confident * 2 -
    emotionScores.uncertain * 2 -
    emotionScores.nervous * 1;
  const baseEnthusiasm =
    50 + emotionScores.enthusiastic * 3 - emotionScores.disinterested * 2;
  const baseNervousness =
    50 + emotionScores.nervous * 3 - emotionScores.confident * 1;
  const baseEngagement =
    50 +
    emotionScores.engaged * 2 +
    emotionScores.enthusiastic * 1 -
    emotionScores.disinterested * 3;

  // Create emotional journey
  const emotionalJourney = candidateMessages.map((msg, index) => {
    const progress = index / Math.max(1, candidateMessages.length - 1);
    const text = msg.content.toLowerCase();

    // Analyze this specific message
    const messageEmotions: Record<string, number> = {};

    for (const [emotion, patterns] of Object.entries(emotionPatterns)) {
      let score = 0;

      // Check phrases
      patterns.phrases.forEach((phrase) => {
        if (text.includes(phrase)) {
          score += patterns.weight;
        }
      });

      // Check expression patterns
      patterns.expressionPatterns.forEach((pattern) => {
        const matches = text.match(pattern);
        if (matches) {
          score += matches.length * patterns.weight;
        }
      });

      messageEmotions[emotion] = score;
    }

    // Find dominant emotion
    let dominantEmotion = "neutral";
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(messageEmotions)) {
      if (score > maxScore) {
        maxScore = score;
        dominantEmotion = emotion;
      }
    }

    // If no strong emotion detected, use position-based progression pattern
    if (maxScore < 1) {
      if (progress < 0.2) {
        dominantEmotion = "uncertain"; // Start of interview is often cautious
      } else if (progress < 0.4) {
        dominantEmotion = "thoughtful"; // Middle early - getting into details
      } else if (progress < 0.7) {
        dominantEmotion = "engaged"; // Middle late - fully engaged in topics
      } else {
        dominantEmotion = "confident"; // End - wrapping up with confidence
      }
    }

    // Calculate intensity with more factors
    const messageLength = text.length;
    const wordsInMessage = text.split(/\s+/).length;

    // Length factor - longer responses typically show higher engagement/emotion intensity
    const lengthFactor = Math.min(30, Math.floor(messageLength / 100));

    // Word count factor - more words usually indicate more detailed/intense responses
    const wordFactor = Math.min(20, Math.floor(wordsInMessage / 15));

    // Position factor - emotions tend to intensify as interview progresses
    const positionFactor = Math.floor(progress * 15);

    // Emotion factor - from dominant emotion detection
    const emotionFactor = Math.floor(maxScore * 10);

    // Base intensity on these factors
    let intensity =
      50 + lengthFactor + wordFactor + positionFactor + emotionFactor;

    // Normalize to 0-100
    intensity = Math.max(0, Math.min(100, intensity));

    return {
      timestamp:
        msg.timestamp ||
        Date.now() - (candidateMessages.length - index) * 60000,
      emotion: dominantEmotion,
      intensity,
    };
  });

  return {
    overall,
    confidence: normalizeValue(baseConfidence),
    enthusiasm: normalizeValue(baseEnthusiasm),
    nervousness: normalizeValue(baseNervousness),
    engagement: normalizeValue(baseEngagement),
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
 * Detects significant emotional shifts during the interview with improved accuracy
 */
export function detectEmotionalShifts(messages: Message[]): {
  shifts: EmotionalShift[];
  significant: boolean;
} {
  // Filter to just get candidate messages
  const candidateMessages = messages.filter((msg) => msg.role === "user");

  // If we don't have enough messages, return empty result
  if (candidateMessages.length < 3) {
    return { shifts: [], significant: false };
  }

  // Define emotion classifications for more precise shift detection
  const emotionCategories = {
    positive: ["enthusiastic", "confident", "engaged"],
    neutral: ["thoughtful", "neutral"],
    negative: ["uncertain", "nervous", "defensive", "evasive", "disinterested"],
  };

  // Get emotion data using enhanced detection
  const emotions: EmotionData[] = detectMessageEmotions(candidateMessages);

  // Look for significant changes in emotion or intensity
  const shifts: EmotionalShift[] = [];
  const significantIntensityChange = 20; // More conservative threshold

  for (let i = 1; i < emotions.length; i++) {
    const current = emotions[i];
    const previous = emotions[i - 1];

    // Get emotion categories
    const getPrevCategory = () => {
      for (const [category, emotions] of Object.entries(emotionCategories)) {
        if (emotions.includes(previous.emotion)) return category;
      }
      return "neutral";
    };

    const getCurrCategory = () => {
      for (const [category, emotions] of Object.entries(emotionCategories)) {
        if (emotions.includes(current.emotion)) return category;
      }
      return "neutral";
    };

    const prevCategory = getPrevCategory();
    const currCategory = getCurrCategory();

    // Calculate time between messages (in seconds)
    const timeDiff = (current.timestamp - previous.timestamp) / 1000;

    // Only consider shifts if:
    // 1. The emotion changed
    // 2. OR there was a significant intensity change
    // 3. AND there wasn't a huge time gap (which would make shifts less relevant)
    if (
      (current.emotion !== previous.emotion ||
        Math.abs(current.intensity - previous.intensity) >=
          significantIntensityChange) &&
      timeDiff < 600 // Less than 10 minutes between messages
    ) {
      // Determine shift type based on emotion categories
      let shiftType: "positive" | "negative" | "neutral" = "neutral";

      if (prevCategory !== currCategory) {
        if (currCategory === "positive") shiftType = "positive";
        else if (currCategory === "negative") shiftType = "negative";
      } else if (
        Math.abs(current.intensity - previous.intensity) >=
        significantIntensityChange
      ) {
        // Same category but significant intensity change
        shiftType =
          current.intensity > previous.intensity && currCategory === "positive"
            ? "positive"
            : current.intensity < previous.intensity &&
              currCategory === "positive"
            ? "negative"
            : current.intensity > previous.intensity &&
              currCategory === "negative"
            ? "negative"
            : current.intensity < previous.intensity &&
              currCategory === "negative"
            ? "positive"
            : "neutral";
      }

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
        type: shiftType,
        timestamp: current.timestamp,
      });
    }
  }

  // Determine if shifts are significant with more nuanced criteria
  const significant =
    shifts.length > 0 &&
    // Multiple negative shifts is significant
    (shifts.filter((shift) => shift.type === "negative").length > 1 ||
      // A dramatic single shift is significant (large intensity change)
      shifts.some(
        (shift) =>
          shift.type === "negative" &&
          Math.abs(shift.to.intensity - shift.from.intensity) > 30
      ) ||
      // Several shifts of any type might be significant
      shifts.length > 2);

  return {
    shifts,
    significant,
  };
}

/**
 * More sophisticated emotion detection for individual messages
 */
function detectMessageEmotions(messages: Message[]): EmotionData[] {
  return messages.map((msg, index) => {
    const text = msg.content.toLowerCase();

    // Define more comprehensive emotion indicators with weighting
    const emotionIndicators = {
      enthusiastic: {
        keywords: [
          "excited",
          "passionate",
          "love",
          "thrilled",
          "great",
          "amazing",
          "excellent",
        ],
        patterns: [/!{1,}/g, /\blove (this|that|the)\b/gi],
        weight: 1.2,
      },
      confident: {
        keywords: [
          "certain",
          "sure",
          "confident",
          "definitely",
          "absolutely",
          "without doubt",
          "clearly",
        ],
        patterns: [/\bI know\b/gi, /\bI'm sure\b/gi, /\bI've done this\b/gi],
        weight: 1.4,
      },
      engaged: {
        keywords: [
          "interesting",
          "curious",
          "fascinating",
          "tell me more",
          "intriguing",
          "compelling",
        ],
        patterns: [
          /\?$/m,
          /\bfor example\b/gi,
          /\bspecifically\b/gi,
          /\bin my experience\b/gi,
        ],
        weight: 1.1,
      },
      thoughtful: {
        keywords: [
          "think",
          "consider",
          "reflect",
          "analyze",
          "evaluate",
          "assess",
          "ponder",
        ],
        patterns: [
          /\bon one hand\b/gi,
          /\bon the other hand\b/gi,
          /\bhowever\b/gi,
          /\btherefore\b/gi,
        ],
        weight: 1.0,
      },
      neutral: {
        keywords: ["okay", "fine", "alright", "understand", "see", "good"],
        patterns: [/\bok\b/gi, /^(yes|no)$/im, /\bmakes sense\b/gi],
        weight: 0.9,
      },
      uncertain: {
        keywords: [
          "not sure",
          "possibly",
          "perhaps",
          "might",
          "maybe",
          "could be",
          "I guess",
        ],
        patterns: [
          /\bif I'm not mistaken\b/gi,
          /\bkind of\b/gi,
          /\bsort of\b/gi,
        ],
        weight: 0.8,
      },
      nervous: {
        keywords: [
          "sorry",
          "apologize",
          "nervous",
          "worried",
          "anxiety",
          "concerned",
          "stress",
        ],
        patterns: [/um+/gi, /uh+/gi, /\bI'm sorry\b/gi, /\bI apologize\b/gi],
        weight: 0.7,
      },
      defensive: {
        keywords: [
          "actually",
          "to be fair",
          "to be honest",
          "in fact",
          "contrary to",
          "defend",
        ],
        patterns: [
          /\bI didn't\b/gi,
          /\bThat's not\b/gi,
          /\bI disagree\b/gi,
          /\bI meant\b/gi,
        ],
        weight: 0.6,
      },
      evasive: {
        keywords: [
          "generally",
          "typically",
          "usually",
          "often",
          "sometimes",
          "occasionally",
        ],
        patterns: [
          /\bI'd rather not\b/gi,
          /\bcan we move on\b/gi,
          /\blet's talk about\b/gi,
        ],
        weight: 0.5,
      },
    };

    // Score each emotion
    const scores: Record<string, number> = {};

    for (const [emotion, data] of Object.entries(emotionIndicators)) {
      let score = 0;

      // Check keywords
      data.keywords.forEach((keyword) => {
        if (text.includes(keyword)) {
          score += data.weight;
        }
      });

      // Check patterns
      data.patterns.forEach((pattern) => {
        const matches = text.match(pattern);
        if (matches) {
          score += matches.length * data.weight;
        }
      });

      scores[emotion] = score;
    }

    // Find dominant emotion
    let dominantEmotion = "neutral";
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        dominantEmotion = emotion;
      }
    }

    // If no strong emotion, use position-based prediction
    if (maxScore < 0.5) {
      const progress = index / Math.max(1, messages.length - 1);
      if (progress < 0.25) {
        dominantEmotion = "neutral"; // Interview start is often neutral
      } else if (progress < 0.5) {
        dominantEmotion = "engaged"; // Getting into the interview
      } else if (progress < 0.75) {
        dominantEmotion = "confident"; // Deeper into questions
      } else {
        dominantEmotion = "thoughtful"; // Wrapping up
      }
    }

    // Calculate intensity based on multiple factors
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).length - 1;

    // Response complexity and length affect intensity
    const lengthFactor = Math.min(20, Math.floor(text.length / 150));
    const wordFactor = Math.min(15, Math.floor(wordCount / 20));
    const sentenceFactor = Math.min(10, sentenceCount);

    // Emotion-based intensity
    const emotionFactor = Math.min(25, Math.floor(maxScore * 15));

    // Position-based intensity (interviews often get more intense in the middle)
    const progress = index / Math.max(1, messages.length - 1);
    const positionFactor = Math.floor(
      20 *
        (progress < 0.5
          ? progress * 2 // Ramping up in first half
          : 2 - progress * 2) // Tapering in second half
    );

    // Calculate intensity
    let intensity =
      40 +
      lengthFactor +
      wordFactor +
      sentenceFactor +
      emotionFactor +
      positionFactor;

    // Normalize to 0-100
    intensity = Math.max(0, Math.min(100, intensity));

    return {
      emotion: dominantEmotion,
      intensity,
      messageIndex: index,
      timestamp:
        msg.timestamp || Date.now() - (messages.length - index) * 60000,
    };
  });
}

// Optional: Caching layer for performance optimization
// In-memory cache for sentiment results
const sentimentCache = new Map<
  string,
  { timestamp: number; result: SentimentResult }
>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache validity

/**
 * Generate a cache key based on messages
 */
function generateCacheKey(messages: Message[]): string {
  // Create a stable hash from message content and ids
  const contentHash = messages
    .filter((msg) => msg.role === "user")
    .map((msg) => `${msg.id || ""}:${msg.content.substring(0, 50)}`)
    .join("|");

  return `sentiment_${Buffer.from(contentHash).toString("base64")}`;
}

/**
 * Get cached sentiment result if available
 */
function getCachedSentiment(messages: Message[]): SentimentResult | null {
  const key = generateCacheKey(messages);
  const cached = sentimentCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  return null;
}

/**
 * Cache sentiment result
 */
function cacheSentimentResult(
  messages: Message[],
  result: SentimentResult
): void {
  const key = generateCacheKey(messages);
  sentimentCache.set(key, {
    timestamp: Date.now(),
    result,
  });
}

/**
 * Wrapped version of analyzeSentiment with caching
 */
export async function analyzeSentimentWithCache(
  messages: Message[]
): Promise<SentimentResult> {
  // Check cache first
  const cached = getCachedSentiment(messages);
  if (cached) {
    return cached;
  }

  // Perform analysis
  const result = await analyzeSentiment(messages);

  // Cache result
  cacheSentimentResult(messages, result);

  return result;
}
