// /**
//  * Service for AI-powered interview functionality
//  */

// // Types
// export interface Question {
//   id: string;
//   text: string;
//   category: "technical" | "behavioral" | "situational";
// }

// export interface Message {
//   id: string;
//   role: "system" | "user" | "assistant";
//   content: string;
//   timestamp: number;
// }

// export interface InterviewContext {
//   jobDescription: string;
//   cvHighlights: string[];
// }

// export interface AnalysisResult {
//   scores: {
//     technicalAcumen: number;
//     communication: number;
//     responseAgility: number;
//     problemSolving: number;
//     culturalFit: number;
//     overall: number;
//   };
//   strengths: string[];
//   improvements: string[];
//   summary: string;
// }

// // Generate interview questions based on job description and CV
// export async function generateQuestions(
//   jobDescription: string,
//   cvContent: string
// ): Promise<{ questions: Question[]; context: InterviewContext }> {
//   try {
//     const response = await fetch("/api/generate-questions", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         jobDescription,
//         cvContent,
//       }),
//     });

//     if (!response.ok) {
//       throw new Error(`Error: ${response.status}`);
//     }

//     return await response.json();
//   } catch (error) {
//     console.error("Error generating questions:", error);
//     throw error;
//   }
// }

// // Get AI response for the interview chat
// export async function getChatResponse(
//   message: string,
//   questionContext: InterviewContext,
//   chatHistory: Message[]
// ): Promise<string> {
//   try {
//     const response = await fetch("/api/chat", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         message,
//         questionContext,
//         chatHistory,
//       }),
//     });

//     if (!response.ok) {
//       throw new Error(`Error: ${response.status}`);
//     }

//     const data = await response.json();
//     return data.response;
//   } catch (error) {
//     console.error("Error getting chat response:", error);
//     throw error;
//   }
// }

// // Analyze the interview and generate scores
// export async function analyzeInterview(
//   jobDescription: string,
//   cvContent: string,
//   chatHistory: Message[],
//   responseTimes: Record<string, number>
// ): Promise<AnalysisResult> {
//   try {
//     // In a production app, you would call an API endpoint here
//     // For now, we'll simulate the analysis result

//     // Calculate average response time
//     const avgResponseTime =
//       Object.values(responseTimes).reduce((sum, time) => sum + time, 0) /
//       Object.values(responseTimes).length;

//     // Create mock analysis result
//     const analysisResult: AnalysisResult = {
//       scores: {
//         technicalAcumen: Math.floor(Math.random() * 20) + 75, // 75-95
//         communication: Math.floor(Math.random() * 20) + 75,
//         responseAgility: calculateTimeScore(avgResponseTime),
//         problemSolving: Math.floor(Math.random() * 20) + 75,
//         culturalFit: Math.floor(Math.random() * 20) + 75,
//         overall: 0, // Will be calculated below
//       },
//       strengths: [
//         "Strong communication skills with clear and concise responses",
//         "Excellent problem-solving approach with structured thinking",
//         "Good technical knowledge in relevant areas",
//       ],
//       improvements: [
//         "Could provide more specific examples from past experience",
//         "Consider organizing responses with clearer structure",
//         "Further demonstrate alignment with company culture and values",
//       ],
//       summary:
//         "The candidate demonstrated strong technical skills and communication abilities. Response times were appropriate, indicating good preparation. While there are some areas for improvement, overall performance was strong.",
//     };

//     // Calculate overall score
//     analysisResult.scores.overall = Math.round(
//       analysisResult.scores.technicalAcumen * 0.3 +
//         analysisResult.scores.communication * 0.2 +
//         analysisResult.scores.responseAgility * 0.15 +
//         analysisResult.scores.problemSolving * 0.25 +
//         analysisResult.scores.culturalFit * 0.1
//     );

//     return analysisResult;
//   } catch (error) {
//     console.error("Error analyzing interview:", error);
//     throw error;
//   }
// }

// // Helper function to score response time
// function calculateTimeScore(avgTime: number): number {
//   // Higher score for faster responses, but not too fast
//   if (avgTime < 5) {
//     return 70; // Too quick might indicate pre-prepared answers
//   } else if (avgTime < 15) {
//     return 95; // Optimal response time
//   } else if (avgTime < 30) {
//     return 85; // Good response time
//   } else if (avgTime < 60) {
//     return 75; // Slightly slow
//   } else {
//     return 65; // Too slow
//   }
// }
