// Text summary of sentiment findings
import React, { JSX } from "react";
import { SentimentResult } from "@/lib/ai/sentimentAnalysis";
import {
  TrendingUp,
  AlertCircle,
  ThumbsUp,
  BarChart,
  Smile,
  Meh,
  Frown,
  Activity,
} from "lucide-react";

interface SentimentSummaryProps {
  sentiment: SentimentResult;
}

export default function SentimentSummary({
  sentiment,
}: SentimentSummaryProps): JSX.Element {
  // Helper function to get color class based on score
  const getColorClass = (score: number, isReversed = false) => {
    if (isReversed) {
      if (score >= 70) return "text-red-500";
      if (score >= 50) return "text-amber-500";
      return "text-green-500";
    } else {
      if (score >= 80) return "text-green-500";
      if (score >= 60) return "text-amber-500";
      return "text-red-500";
    }
  };

  // Get overall sentiment icon
  const getOverallIcon = () => {
    switch (sentiment.overall) {
      case "positive":
        return <Smile className="text-green-500" />;
      case "neutral":
        return <Meh className="text-amber-500" />;
      case "negative":
        return <Frown className="text-red-500" />;
      default:
        return <Activity className="text-blue-500" />;
    }
  };

  // Generate text descriptions based on scores
  const getConfidenceDescription = () => {
    if (sentiment.confidence >= 80)
      return "The candidate displayed high confidence throughout the interview, speaking with clarity and conviction.";
    if (sentiment.confidence >= 60)
      return "The candidate showed moderate confidence during the interview, with some variation in their assurance level.";
    return "The candidate appeared to lack confidence in several responses, showing signs of uncertainty.";
  };

  const getEnthusiasmDescription = () => {
    if (sentiment.enthusiasm >= 80)
      return "The candidate showed strong enthusiasm for the role and company, demonstrating genuine interest.";
    if (sentiment.enthusiasm >= 60)
      return "The candidate showed adequate enthusiasm for the position, though it varied throughout the interview.";
    return "The candidate showed limited enthusiasm during the interview, which may indicate reduced interest in the role.";
  };

  const getNervousnessDescription = () => {
    if (sentiment.nervousness >= 70)
      return "The candidate exhibited notable signs of nervousness throughout the interview.";
    if (sentiment.nervousness >= 50)
      return "The candidate showed some signs of nervousness initially but became more comfortable as the interview progressed.";
    return "The candidate appeared quite relaxed throughout the interview process.";
  };

  const getEngagementDescription = () => {
    if (sentiment.engagement >= 80)
      return "The candidate was highly engaged, providing detailed responses and asking thoughtful questions.";
    if (sentiment.engagement >= 60)
      return "The candidate maintained reasonable engagement throughout the interview process.";
    return "The candidate showed limited engagement, with shorter responses and minimal elaboration.";
  };

  return (
    <div className="space-y-6">
      {/* Overall sentiment section */}
      <div className="flex items-start space-x-3">
        <div className="mt-1">{getOverallIcon()}</div>
        <div>
          <h3 className="font-medium text-slate-900">Overall Emotional Tone</h3>
          <p className="text-slate-700 mt-1">
            The candidate overall emotional tone was{" "}
            <span
              className={`font-medium ${
                sentiment.overall === "positive"
                  ? "text-green-600"
                  : sentiment.overall === "negative"
                  ? "text-red-600"
                  : "text-amber-600"
              }`}
            >
              {sentiment.overall}
            </span>
            .
            {sentiment.overall === "positive"
              ? " This suggests they were comfortable with the interview process and interested in the position."
              : sentiment.overall === "neutral"
              ? " This balanced emotional tone indicates neither strong enthusiasm nor discomfort with the process."
              : " This may indicate discomfort with the interview questions or less interest in the position."}
          </p>
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Confidence */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="font-medium text-slate-900 flex items-center">
              <ThumbsUp size={16} className="mr-2" />
              Confidence
            </div>
            <div
              className={`font-semibold ${getColorClass(sentiment.confidence)}`}
            >
              {sentiment.confidence}/100
            </div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full mb-3">
            <div
              className={`h-2 rounded-full ${
                sentiment.confidence >= 80
                  ? "bg-green-500"
                  : sentiment.confidence >= 60
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${sentiment.confidence}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-600">{getConfidenceDescription()}</p>
        </div>

        {/* Enthusiasm */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="font-medium text-slate-900 flex items-center">
              <TrendingUp size={16} className="mr-2" />
              Enthusiasm
            </div>
            <div
              className={`font-semibold ${getColorClass(sentiment.enthusiasm)}`}
            >
              {sentiment.enthusiasm}/100
            </div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full mb-3">
            <div
              className={`h-2 rounded-full ${
                sentiment.enthusiasm >= 80
                  ? "bg-green-500"
                  : sentiment.enthusiasm >= 60
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${sentiment.enthusiasm}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-600">{getEnthusiasmDescription()}</p>
        </div>

        {/* Nervousness (reverse scale) */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="font-medium text-slate-900 flex items-center">
              <AlertCircle size={16} className="mr-2" />
              Nervousness
            </div>
            <div
              className={`font-semibold ${getColorClass(
                sentiment.nervousness,
                true
              )}`}
            >
              {sentiment.nervousness}/100
            </div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full mb-3">
            <div
              className={`h-2 rounded-full ${
                sentiment.nervousness >= 70
                  ? "bg-red-500"
                  : sentiment.nervousness >= 50
                  ? "bg-amber-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${sentiment.nervousness}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-600">
            {getNervousnessDescription()}
          </p>
        </div>

        {/* Engagement */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="font-medium text-slate-900 flex items-center">
              <BarChart size={16} className="mr-2" />
              Engagement
            </div>
            <div
              className={`font-semibold ${getColorClass(sentiment.engagement)}`}
            >
              {sentiment.engagement}/100
            </div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full mb-3">
            <div
              className={`h-2 rounded-full ${
                sentiment.engagement >= 80
                  ? "bg-green-500"
                  : sentiment.engagement >= 60
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${sentiment.engagement}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-600">{getEngagementDescription()}</p>
        </div>
      </div>

      {/* Emotional journey summary */}
      <div>
        <h3 className="font-medium text-slate-900 mb-2">
          Emotional Journey Insights
        </h3>
        <p className="text-slate-700">
          {sentiment.emotionalJourney.length > 3
            ? `The candidate began the interview with a ${
                sentiment.emotionalJourney[0].emotion
              } 
            emotional tone. As the interview progressed, they showed shifts in emotional state, 
            ending with ${
              sentiment.emotionalJourney[sentiment.emotionalJourney.length - 1]
                .emotion
            } 
            responses. ${
              sentiment.emotionalJourney[sentiment.emotionalJourney.length - 1]
                .intensity > sentiment.emotionalJourney[0].intensity
                ? "Overall, there was a positive trend in emotional engagement throughout the process."
                : "The emotional intensity remained relatively consistent throughout the interview."
            }`
            : "There was insufficient data to analyze the complete emotional journey of the candidate."}
        </p>
      </div>
    </div>
  );
}
