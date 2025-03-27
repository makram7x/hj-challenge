"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  BadgeCheck,
  MessageSquare,
  Zap,
  User,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  Briefcase,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Activity,
  Heart,
} from "lucide-react";
import SentimentChart from "@/components/sentiment/SentimentChart";
import SentimentSummary from "@/components/sentiment/SentimentSummary";
import { SentimentResult } from "@/lib/ai/sentimentAnalysis";
import FairnessAssuranceSection from "@/components/bias/FairnessAssuranceSection";
import { BiasDetectionResult } from "@/lib/ai/biasDetection";

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: number;
}

interface ScoreCategory {
  name: string;
  score: number;
  explanation: string;
  icon: React.ReactNode;
  color: string;
}

interface AnalysisResult {
  scores: {
    domainKnowledge: {
      score: number;
      explanation: string;
    };
    communication: {
      score: number;
      explanation: string;
    };
    responseQuality: {
      score: number;
      explanation: string;
    };
    experienceRelevance: {
      score: number;
      explanation: string;
    };
    culturalFit: {
      score: number;
      explanation: string;
    };
    emotionalIntelligence?: {
      score: number;
      explanation: string;
    };
    overall: number;
  };
  strengths: string[];
  improvements: string[];
  isQualified: boolean;
  qualificationReasoning: string;
  summary: string;
  sentiment?: SentimentResult;
  sentimentInsights?: {
    emotionalPatterns: string;
    confidenceObservations: string;
    engagementAssessment: string;
    recommendationsBasedOnSentiment: string;
  };
  fairnessAssurance?: {
    potentialBiases: string;
    mitigationSteps: string;
    diverseEvaluationConsiderations: string;
  };
  biasMetrics?: BiasDetectionResult;
}

export default function ResultsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [responseTimes, setResponseTimes] = useState<Record<string, number>>(
    {}
  );
  const [messageResponseTimes, setMessageResponseTimes] = useState<
    Record<string, number>
  >({});
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [scores, setScores] = useState<ScoreCategory[]>([]);
  const [averageResponseTime, setAverageResponseTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<string>("");

  useEffect(() => {
    // Retrieve interview data and analyze results
    const analyzeResults = async () => {
      try {
        // Get saved interview data
        const storedTranscript = localStorage.getItem("interviewTranscript");
        const storedResponseTimes = localStorage.getItem("responseTimes");
        const jobDescription = localStorage.getItem("jobDescription");
        const cvContent = localStorage.getItem("cvContent");

        if (!storedTranscript || !jobDescription) {
          throw new Error(
            "No interview data found. Please complete an interview first."
          );
        }

        // Try to extract job title from description
        const extractedTitle = extractJobTitle(jobDescription);
        setJobTitle(extractedTitle);

        // Parse stored data
        const parsedTranscript: Message[] = storedTranscript
          ? JSON.parse(storedTranscript)
          : [];
        const parsedResponseTimes: Record<string, number> = storedResponseTimes
          ? JSON.parse(storedResponseTimes)
          : {};

        setTranscript(parsedTranscript);

        // Process response times to associate with message IDs
        const userMessages = parsedTranscript.filter(
          (msg) => msg.role === "user"
        );
        const messageTimings: Record<string, number> = {};

        // Map response times to message IDs
        Object.entries(parsedResponseTimes).forEach(([key, value]) => {
          const index = parseInt(key, 10);
          if (!isNaN(index) && index < userMessages.length) {
            const messageId = userMessages[index].id;
            messageTimings[messageId] = value;
          }
        });

        setResponseTimes(parsedResponseTimes);
        setMessageResponseTimes(messageTimings);

        // Calculate average response time
        const timeValues = Object.values(parsedResponseTimes);
        const validTimes = timeValues.filter(
          (time) => !isNaN(time) && time > 0
        );
        const avgTime =
          validTimes.length > 0
            ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length
            : 0;

        setAverageResponseTime(avgTime);

        // Call the API to analyze the interview
        setIsLoading(true);
        const response = await fetch("/api/analyze-interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobDescription,
            cvContent,
            chatHistory: parsedTranscript,
            responseTimes: parsedResponseTimes,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to analyze interview: ${response.status}`);
        }

        const result = (await response.json()) as AnalysisResult;
        setAnalysisResult(result);

        // Format scores for display
        const formattedScores: ScoreCategory[] = [
          {
            name: "Domain Knowledge",
            score: result.scores.domainKnowledge.score,
            explanation: result.scores.domainKnowledge.explanation,
            icon: <BookOpen size={20} />,
            color: "text-indigo-500",
          },
          {
            name: "Communication",
            score: result.scores.communication.score,
            explanation: result.scores.communication.explanation,
            icon: <MessageSquare size={20} />,
            color: "text-blue-500",
          },
          {
            name: "Response Quality",
            score: result.scores.responseQuality.score,
            explanation: result.scores.responseQuality.explanation,
            icon: <Zap size={20} />,
            color: "text-amber-500",
          },
          {
            name: "Experience Relevance",
            score: result.scores.experienceRelevance.score,
            explanation: result.scores.experienceRelevance.explanation,
            icon: <Briefcase size={20} />,
            color: "text-green-500",
          },
          {
            name: "Cultural Fit",
            score: result.scores.culturalFit.score,
            explanation: result.scores.culturalFit.explanation,
            icon: <UserCheck size={20} />,
            color: "text-red-500",
          },
        ];

        // Add Emotional Intelligence if available
        if (result.scores.emotionalIntelligence) {
          formattedScores.push({
            name: "Emotional Intelligence",
            score: result.scores.emotionalIntelligence.score,
            explanation: result.scores.emotionalIntelligence.explanation,
            icon: <Heart size={20} />,
            color: "text-purple-500",
          });
        }

        setScores(formattedScores);
      } catch (err: any) {
        console.error("Error analyzing results:", err);
        setError(err.message || "Failed to analyze interview results");
      } finally {
        setIsLoading(false);
      }
    };

    analyzeResults();
  }, []);

  // Format time for display
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "N/A";

    if (seconds < 60) {
      return `${seconds.toFixed(1)} seconds`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Get the minimum response time
  const getMinResponseTime = (): number => {
    const times = Object.values(responseTimes).filter(
      (time) => !isNaN(time) && time > 0
    );
    return times.length > 0 ? Math.min(...times) : 0;
  };

  // Get the maximum response time
  const getMaxResponseTime = (): number => {
    const times = Object.values(responseTimes).filter(
      (time) => !isNaN(time) && time > 0
    );
    return times.length > 0 ? Math.max(...times) : 0;
  };

  // Extract job title from job description
  function extractJobTitle(description: string): string {
    // Common job title patterns
    const patterns = [
      /job title:?\s*([^.,:;\n]+)/i,
      /position:?\s*([^.,:;\n]+)/i,
      /role:?\s*([^.,:;\n]+)/i,
      /hiring\s+(?:a|an)\s+([^.,:;\n]+)/i,
      /^([^.,:;\n]{3,50})$/m, // First short line
    ];

    // Try each pattern
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1] && match[1].trim().length > 0) {
        return match[1].trim();
      }
    }

    // If no title found, get the first few words of the description
    const firstFewWords = description.trim().split(/\s+/).slice(0, 4).join(" ");
    return firstFewWords || "Position";
  }

  // Regenerate analysis (if needed)
  const handleRegenerateAnalysis = async () => {
    try {
      setIsLoading(true);
      const jobDescription = localStorage.getItem("jobDescription");
      const cvContent = localStorage.getItem("cvContent");

      const response = await fetch("/api/analyze-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          cvContent,
          chatHistory: transcript,
          responseTimes,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze interview: ${response.status}`);
      }

      const result = (await response.json()) as AnalysisResult;
      setAnalysisResult(result);

      // Update formatted scores
      const formattedScores: ScoreCategory[] = [
        {
          name: "Domain Knowledge",
          score: result.scores.domainKnowledge.score,
          explanation: result.scores.domainKnowledge.explanation,
          icon: <BookOpen size={20} />,
          color: "text-indigo-500",
        },
        {
          name: "Communication",
          score: result.scores.communication.score,
          explanation: result.scores.communication.explanation,
          icon: <MessageSquare size={20} />,
          color: "text-blue-500",
        },
        {
          name: "Response Quality",
          score: result.scores.responseQuality.score,
          explanation: result.scores.responseQuality.explanation,
          icon: <Zap size={20} />,
          color: "text-amber-500",
        },
        {
          name: "Experience Relevance",
          score: result.scores.experienceRelevance.score,
          explanation: result.scores.experienceRelevance.explanation,
          icon: <Briefcase size={20} />,
          color: "text-green-500",
        },
        {
          name: "Cultural Fit",
          score: result.scores.culturalFit.score,
          explanation: result.scores.culturalFit.explanation,
          icon: <UserCheck size={20} />,
          color: "text-red-500",
        },
      ];

      // Add Emotional Intelligence if available
      if (result.scores.emotionalIntelligence) {
        formattedScores.push({
          name: "Emotional Intelligence",
          score: result.scores.emotionalIntelligence.score,
          explanation: result.scores.emotionalIntelligence.explanation,
          icon: <Heart size={20} />,
          color: "text-purple-500",
        });
      }

      setScores(formattedScores);
      setError(null);
    } catch (err: any) {
      console.error("Error regenerating analysis:", err);
      setError(err.message || "Failed to regenerate analysis");
    } finally {
      setIsLoading(false);
    }
  };

  // Get qualification status color
  const getQualificationColor = (): string => {
    if (!analysisResult) return "bg-gray-100 text-gray-600";
    return analysisResult.isQualified
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  // Get qualification status icon
  const getQualificationIcon = () => {
    if (!analysisResult) return <HelpCircle size={24} />;
    return analysisResult.isQualified ? (
      <ThumbsUp size={24} className="text-green-600" />
    ) : (
      <ThumbsDown size={24} className="text-red-600" />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b p-4">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto p-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            Interview Results
          </h1>
          {jobTitle && (
            <div className="text-lg text-slate-600 mt-1 sm:mt-0">
              Position: {jobTitle}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Analyzing interview responses...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-start mb-8">
            <AlertTriangle size={24} className="mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-lg mb-1">Analysis Error</p>
              <p>{error}</p>
              <div className="mt-4 flex space-x-4">
                <Link
                  href="/upload"
                  className="text-red-700 underline font-medium"
                >
                  Start a new interview
                </Link>
                <button
                  onClick={handleRegenerateAnalysis}
                  className="text-red-700 underline font-medium flex items-center"
                >
                  <RefreshCw size={16} className="mr-1" />
                  Retry analysis
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Qualification Assessment */}
            <div
              className={`rounded-lg shadow-md p-6 ${getQualificationColor()}`}
            >
              <div className="flex items-start">
                <div className="mr-4 mt-1">{getQualificationIcon()}</div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    Qualification Assessment:{" "}
                    {analysisResult?.isQualified
                      ? "Qualified"
                      : "Not Qualified"}
                  </h2>
                  <p className="text-base">
                    {analysisResult?.qualificationReasoning}
                  </p>
                </div>
              </div>
            </div>

            {/* Overall score */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  Overall Assessment
                </h2>
                <div className="flex items-center">
                  <BadgeCheck size={24} className="text-blue-600 mr-2" />
                  <span className="text-2xl font-bold text-blue-600">
                    {analysisResult?.scores.overall}/100
                  </span>
                </div>
              </div>

              <p className="mt-4 text-slate-700">{analysisResult?.summary}</p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-slate-700 mb-2">
                    Key Strengths
                  </h3>
                  {analysisResult?.strengths &&
                  analysisResult.strengths.length > 0 ? (
                    <ul className="space-y-2">
                      {analysisResult.strengths.map((strength, i) => (
                        <li key={i} className="flex">
                          <CheckCircle
                            size={18}
                            className="text-green-500 mr-2 flex-shrink-0 mt-0.5"
                          />
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 italic">
                      No specific strengths highlighted
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="font-medium text-slate-700 mb-2">
                    Areas for Improvement
                  </h3>
                  {analysisResult?.improvements &&
                  analysisResult.improvements.length > 0 ? (
                    <ul className="space-y-2">
                      {analysisResult.improvements.map((improvement, i) => (
                        <li key={i} className="flex">
                          <ArrowLeft
                            size={18}
                            className="text-amber-500 mr-2 flex-shrink-0 mt-0.5"
                          />
                          <span>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 italic">
                      No specific improvements highlighted
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sentiment Analysis Section */}
            {analysisResult?.sentiment && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center mb-4">
                  <Activity size={22} className="text-purple-500 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-900">
                    Sentiment Analysis
                  </h2>
                </div>

                {/* Emotional Journey Chart */}
                <div className="mb-6">
                  <h3 className="font-medium text-slate-700 mb-3">
                    Emotional Journey
                  </h3>
                  <SentimentChart
                    emotionalJourney={analysisResult.sentiment.emotionalJourney}
                    height={200}
                    width={600}
                  />
                </div>

                {/* Sentiment Summary */}
                <SentimentSummary sentiment={analysisResult.sentiment} />

                {/* Sentiment insights from the AI */}
                {analysisResult.sentimentInsights && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h3 className="font-medium text-slate-700 mb-3">
                      Additional Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="text-sm text-slate-600">
                          <span className="font-medium">
                            Emotional Patterns:{" "}
                          </span>
                          {analysisResult.sentimentInsights.emotionalPatterns}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="text-sm text-slate-600">
                          <span className="font-medium">Confidence: </span>
                          {
                            analysisResult.sentimentInsights
                              .confidenceObservations
                          }
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="text-sm text-slate-600">
                          <span className="font-medium">Engagement: </span>
                          {
                            analysisResult.sentimentInsights
                              .engagementAssessment
                          }
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="text-sm text-slate-600">
                          <span className="font-medium">Recommendations: </span>
                          {
                            analysisResult.sentimentInsights
                              .recommendationsBasedOnSentiment
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fairness Assurance Section */}
            {analysisResult?.fairnessAssurance && (
              <div className="mt-8">
                <FairnessAssuranceSection
                  fairnessAssurance={analysisResult.fairnessAssurance}
                  biasMetrics={analysisResult.biasMetrics}
                />
              </div>
            )}

            {/* Category scores */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Performance by Category
              </h2>

              <div className="space-y-4">
                {scores.map((category) => (
                  <div
                    key={category.name}
                    className="border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <span className={`mr-2 ${category.color}`}>
                          {category.icon}
                        </span>
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="flex items-center">
                        <span
                          className={`font-semibold ${getScoreColor(
                            category.score
                          )}`}
                        >
                          {category.score}/100
                        </span>
                        <div
                          className="ml-2 w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: getScoreColorHex(category.score),
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getScoreBarColor(
                          category.score
                        )}`}
                        style={{ width: `${category.score}%` }}
                      ></div>
                    </div>

                    <p className="text-sm text-slate-600 mt-2">
                      {category.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Response time analysis */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Response Time Analysis
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-600">
                      Average Response Time
                    </span>
                    <span className="font-semibold">
                      {formatTime(averageResponseTime)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-600">Fastest Response</span>
                    <span className="font-semibold">
                      {formatTime(getMinResponseTime())}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Slowest Response</span>
                    <span className="font-semibold">
                      {formatTime(getMaxResponseTime())}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-slate-700">
                    <span className="font-medium">Time Assessment: </span>
                    {analysisResult?.scores.responseQuality.explanation?.split(
                      "."
                    )[0] ||
                      `The candidate's average response time was ${formatTime(
                        averageResponseTime
                      )}.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Interview transcript */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Interview Transcript
              </h2>

              {transcript.length === 0 ? (
                <p className="text-slate-500 italic text-center py-8">
                  No transcript data available
                </p>
              ) : (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-96 overflow-y-auto">
                  {transcript
                    .filter((msg) => msg.role !== "system") // Filter out system messages
                    .map((message, index) => (
                      <div key={message.id} className="p-4 hover:bg-slate-50">
                        <div className="flex justify-between items-start">
                          <div className="font-medium text-slate-700 flex items-center">
                            {message.role === "user" ? (
                              <>
                                <User size={16} className="mr-1" />
                                <span>Candidate</span>
                              </>
                            ) : (
                              <>
                                <MessageSquare size={16} className="mr-1" />
                                <span>Interviewer</span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            {message.role === "user" &&
                            messageResponseTimes[message.id]
                              ? `Response time: ${formatTime(
                                  messageResponseTimes[message.id]
                                )}`
                              : new Date(
                                  message.timestamp
                                ).toLocaleTimeString()}
                          </div>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-4 mt-8">
              <Link
                href="/"
                className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Return Home
              </Link>
              <button
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={() => window.print()}
              >
                Export Results
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Helper functions for score colors
function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-600";
  if (score >= 80) return "text-green-500";
  if (score >= 70) return "text-yellow-500";
  if (score >= 60) return "text-orange-500";
  return "text-red-500";
}

function getScoreColorHex(score: number): string {
  if (score >= 90) return "#059669"; // green-600
  if (score >= 80) return "#10B981"; // green-500
  if (score >= 70) return "#F59E0B"; // yellow-500
  if (score >= 60) return "#F97316"; // orange-500
  return "#EF4444"; // red-500
}

function getScoreBarColor(score: number): string {
  if (score >= 90) return "bg-green-600";
  if (score >= 80) return "bg-green-500";
  if (score >= 70) return "bg-yellow-500";
  if (score >= 60) return "bg-orange-500";
  return "bg-red-500";
}
