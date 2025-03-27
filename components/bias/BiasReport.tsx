"use client";

import React from "react";
import { BiasDetectionResult } from "@/lib/ai/biasDetection";
import {
  AlertTriangle,
  BarChart,
  Scale,
  MessageSquare,
  Share2,
  AlertCircle,
  CheckCircle,
  List,
} from "lucide-react";

// Detailed bias report component
interface BiasReportProps {
  biasResult: BiasDetectionResult;
  context: "questions" | "analysis" | "jobDescription";
}

export default function BiasReport({
  biasResult,
  context,
}: BiasReportProps): JSX.Element {
  // Calculate statistics for the report
  const biasTypeCount: Record<string, number> = {};
  const severityCount: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
  };

  biasResult.detectedBiases.forEach((bias) => {
    // Count bias types
    biasTypeCount[bias.type] = (biasTypeCount[bias.type] || 0) + 1;

    // Count severities
    severityCount[bias.severity] += 1;
  });

  // Get context-specific title and description
  const getContextInfo = () => {
    switch (context) {
      case "jobDescription":
        return {
          title: "Job Description Bias Analysis",
          description:
            "Analysis of potentially biased language in your job description that might discourage qualified candidates from applying.",
        };
      case "questions":
        return {
          title: "Interview Questions Bias Analysis",
          description:
            "Analysis of potential bias in your interview questions that might disadvantage certain candidate groups.",
        };
      case "analysis":
        return {
          title: "Candidate Evaluation Bias Analysis",
          description:
            "Analysis of potential bias in the evaluation of candidates that might result in unfair assessment.",
        };
      default:
        return {
          title: "Bias Analysis",
          description: "Analysis of potential bias in your content.",
        };
    }
  };

  const contextInfo = getContextInfo();

  // Helper function to get color class based on fairness score
  const getFairnessColorClass = () => {
    if (biasResult.fairnessScore >= 90) return "text-green-600";
    if (biasResult.fairnessScore >= 75) return "text-green-500";
    if (biasResult.fairnessScore >= 60) return "text-amber-500";
    if (biasResult.fairnessScore >= 40) return "text-orange-500";
    return "text-red-500";
  };

  // Helper function to get background color class based on fairness score
  const getFairnessBackgroundClass = () => {
    if (biasResult.fairnessScore >= 90) return "bg-green-100";
    if (biasResult.fairnessScore >= 75) return "bg-green-50";
    if (biasResult.fairnessScore >= 60) return "bg-amber-50";
    if (biasResult.fairnessScore >= 40) return "bg-orange-50";
    return "bg-red-50";
  };

  // Helper function to get icon based on fairness score
  const getFairnessIcon = () => {
    if (biasResult.fairnessScore >= 90)
      return <CheckCircle className="text-green-500" />;
    if (biasResult.fairnessScore >= 75)
      return <CheckCircle className="text-green-400" />;
    if (biasResult.fairnessScore >= 60)
      return <AlertTriangle className="text-amber-500" />;
    if (biasResult.fairnessScore >= 40)
      return <AlertTriangle className="text-orange-500" />;
    return <AlertCircle className="text-red-500" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-5">
        <Scale size={24} className="text-indigo-500 mr-2" />
        <h2 className="text-xl font-semibold">{contextInfo.title}</h2>
      </div>

      <p className="text-slate-600 mb-6">{contextInfo.description}</p>

      {/* Fairness Score Card */}
      <div
        className={`flex items-center p-4 rounded-lg mb-6 ${getFairnessBackgroundClass()}`}
      >
        <div className="mr-4">{getFairnessIcon()}</div>
        <div>
          <div className="flex items-baseline">
            <span
              className={`text-2xl font-bold mr-2 ${getFairnessColorClass()}`}
            >
              {biasResult.fairnessScore}
            </span>
            <span className="text-slate-600">Fairness Score</span>
          </div>
          <p className="text-sm text-slate-600">
            {biasResult.fairnessScore >= 90
              ? "Excellent! Your content is fair and inclusive."
              : biasResult.fairnessScore >= 75
              ? "Good job! Your content is mostly fair with minor improvements possible."
              : biasResult.fairnessScore >= 60
              ? "Your content has some bias issues that should be addressed."
              : biasResult.fairnessScore >= 40
              ? "Your content has significant bias that may impact fairness."
              : "Your content has severe bias issues that require immediate attention."}
          </p>
        </div>
      </div>

      {/* Overall Assessment */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <MessageSquare size={18} className="text-slate-700 mr-2" />
          <h3 className="font-medium text-slate-800">Overall Assessment</h3>
        </div>
        <p className="text-slate-600 pl-6">{biasResult.overallAssessment}</p>
      </div>

      {/* Bias Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Bias Types */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="flex items-center mb-3">
            <List size={18} className="text-slate-700 mr-2" />
            <h3 className="font-medium text-slate-800">Bias Types Detected</h3>
          </div>
          {Object.keys(biasTypeCount).length > 0 ? (
            <ul className="space-y-2 pl-6">
              {Object.entries(biasTypeCount).map(([type, count]) => (
                <li key={type} className="flex justify-between">
                  <span className="capitalize">{type}</span>
                  <span className="font-medium">
                    {count} {count === 1 ? "instance" : "instances"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-600 pl-6">No bias types detected</p>
          )}
        </div>

        {/* Severity Breakdown */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="flex items-center mb-3">
            <AlertTriangle size={18} className="text-slate-700 mr-2" />
            <h3 className="font-medium text-slate-800">Severity Breakdown</h3>
          </div>
          {biasResult.detectedBiases.length > 0 ? (
            <ul className="space-y-2 pl-6">
              <li className="flex justify-between">
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  High
                </span>
                <span className="font-medium">{severityCount.high}</span>
              </li>
              <li className="flex justify-between">
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-amber-500 rounded-full mr-2"></span>
                  Medium
                </span>
                <span className="font-medium">{severityCount.medium}</span>
              </li>
              <li className="flex justify-between">
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  Low
                </span>
                <span className="font-medium">{severityCount.low}</span>
              </li>
            </ul>
          ) : (
            <p className="text-slate-600 pl-6">No bias issues detected</p>
          )}
        </div>
      </div>

      {/* Detailed Bias Findings */}
      {biasResult.detectedBiases.length > 0 && (
        <div>
          <div className="flex items-center mb-3">
            <Share2 size={18} className="text-slate-700 mr-2" />
            <h3 className="font-medium text-slate-800">
              Detailed Bias Findings
            </h3>
          </div>

          <div className="space-y-4 mt-3">
            {biasResult.detectedBiases.map((bias, index) => {
              const severityColor =
                bias.severity === "high"
                  ? "border-red-200 bg-red-50"
                  : bias.severity === "medium"
                  ? "border-amber-200 bg-amber-50"
                  : "border-blue-200 bg-blue-50";

              const typeColor =
                bias.type === "gender"
                  ? "bg-purple-100 text-purple-800"
                  : bias.type === "racial"
                  ? "bg-red-100 text-red-800"
                  : bias.type === "age"
                  ? "bg-amber-100 text-amber-800"
                  : bias.type === "cultural"
                  ? "bg-green-100 text-green-800"
                  : "bg-blue-100 text-blue-800";

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${severityColor}`}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor}`}
                    >
                      {bias.type}
                    </span>
                    <span className="px-2 py-0.5 bg-white rounded-full text-xs font-medium border">
                      {bias.severity} severity
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="font-medium mb-1">Detected Text:</p>
                    <div className="bg-white p-2 rounded border">
                      "{bias.text}"
                    </div>
                  </div>

                  <div>
                    <p className="font-medium mb-1">Suggested Alternatives:</p>
                    <ul className="space-y-1">
                      {bias.suggestions.map((suggestion, i) => (
                        <li
                          key={i}
                          className="bg-white p-2 rounded border flex"
                        >
                          <span className="text-gray-500 mr-2">{i + 1}.</span>"
                          {suggestion}"
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex items-center mb-3">
          <BarChart size={18} className="text-slate-700 mr-2" />
          <h3 className="font-medium text-slate-800">Recommendations</h3>
        </div>

        {biasResult.detectedBiases.length > 0 ? (
          <ul className="space-y-2 pl-6">
            <li className="text-slate-600">
              Review and replace biased language with suggested alternatives.
            </li>
            {context === "jobDescription" && (
              <>
                <li className="text-slate-600">
                  Focus on essential skills and qualifications rather than
                  personal attributes.
                </li>
                <li className="text-slate-600">
                  Use inclusive language that appeals to a diverse candidate
                  pool.
                </li>
              </>
            )}
            {context === "questions" && (
              <>
                <li className="text-slate-600">
                  Ensure questions focus on job-relevant skills and experiences.
                </li>
                <li className="text-slate-600">
                  Structure questions to allow equitable responses from all
                  candidates.
                </li>
              </>
            )}
            {context === "analysis" && (
              <>
                <li className="text-slate-600">
                  Apply consistent evaluation criteria to all candidates.
                </li>
                <li className="text-slate-600">
                  Focus assessment on job-relevant skills and accomplishments.
                </li>
              </>
            )}
            <li className="text-slate-600">
              Consider having multiple reviewers check content for bias.
            </li>
          </ul>
        ) : (
          <div className="flex items-center pl-6 text-green-600">
            <CheckCircle size={16} className="mr-2" />
            <p>Great job! No significant bias was detected in your content.</p>
          </div>
        )}
      </div>
    </div>
  );
}
