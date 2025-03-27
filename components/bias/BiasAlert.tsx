"use client";

import React, { useState } from "react";
import { AlertTriangle, XCircle, CheckCircle, ArrowRight } from "lucide-react";
import { BiasDetectionResult } from "@/lib/ai/biasDetection";

// Component to show bias warnings
interface BiasAlertProps {
  biasResult: BiasDetectionResult;
  onApplySuggestion?: (suggestion: string, originalText: string) => void;
  compact?: boolean;
}

export default function BiasAlert({
  biasResult,
  onApplySuggestion,
  compact = false,
}: BiasAlertProps): JSX.Element {
  const [expandedBias, setExpandedBias] = useState<number | null>(null);

  // Helper function to get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Helper function to get bias type badge
  const getBiasTypeBadge = (type: string) => {
    switch (type) {
      case "gender":
        return "bg-purple-100 text-purple-800";
      case "racial":
        return "bg-red-100 text-red-800";
      case "age":
        return "bg-amber-100 text-amber-800";
      case "cultural":
        return "bg-green-100 text-green-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  // Helper function to get the alert container color based on bias score
  const getAlertContainerClass = () => {
    if (biasResult.biasScore >= 70) {
      return "bg-red-50 border-red-200";
    } else if (biasResult.biasScore >= 40) {
      return "bg-amber-50 border-amber-200";
    } else if (biasResult.biasScore > 10) {
      return "bg-blue-50 border-blue-200";
    } else {
      return "bg-green-50 border-green-200";
    }
  };

  // Helper to get the icon based on bias score
  const getAlertIcon = () => {
    if (biasResult.biasScore >= 70) {
      return <XCircle size={compact ? 18 : 24} className="text-red-500" />;
    } else if (biasResult.biasScore >= 40) {
      return (
        <AlertTriangle size={compact ? 18 : 24} className="text-amber-500" />
      );
    } else if (biasResult.biasScore > 10) {
      return (
        <AlertTriangle size={compact ? 18 : 24} className="text-blue-500" />
      );
    } else {
      return (
        <CheckCircle size={compact ? 18 : 24} className="text-green-500" />
      );
    }
  };

  // If there are no biases detected and we're in compact mode, show a minimal success indicator
  if (biasResult.detectedBiases.length === 0 && compact) {
    return (
      <div className="flex items-center text-sm text-green-600 my-1">
        <CheckCircle size={16} className="mr-1" />
        <span>No potential bias detected</span>
      </div>
    );
  }

  return (
    <div
      className={`border rounded-lg p-4 ${getAlertContainerClass()} ${
        compact ? "text-sm" : ""
      }`}
    >
      {/* Alert Header */}
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5 mr-3">{getAlertIcon()}</div>

        <div className="flex-1">
          <h3 className={`font-medium ${compact ? "text-base" : "text-lg"}`}>
            Bias Analysis:{" "}
            {biasResult.fairnessScore >= 90
              ? "Fair"
              : biasResult.fairnessScore >= 70
              ? "Mostly Fair"
              : biasResult.fairnessScore >= 50
              ? "Some Bias Detected"
              : "Significant Bias Detected"}
          </h3>

          {!compact && (
            <div className="mt-1">
              <div className="flex items-center mb-1">
                <span className="text-sm mr-2">Fairness Score:</span>
                <div className="w-full bg-gray-200 rounded-full h-2 max-w-md">
                  <div
                    className={`h-2 rounded-full ${
                      biasResult.fairnessScore >= 80
                        ? "bg-green-500"
                        : biasResult.fairnessScore >= 60
                        ? "bg-amber-400"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${biasResult.fairnessScore}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-sm font-medium">
                  {biasResult.fairnessScore}/100
                </span>
              </div>

              <p className="text-sm mt-2">{biasResult.overallAssessment}</p>
            </div>
          )}
        </div>
      </div>

      {/* Detected Biases List */}
      {biasResult.detectedBiases.length > 0 && (
        <div className={`mt-${compact ? "2" : "4"} space-y-2`}>
          {!compact && <h4 className="font-medium">Potential Bias Detected</h4>}

          <ul className="space-y-2">
            {biasResult.detectedBiases.map((bias, index) => (
              <li
                key={index}
                className={`border rounded-md ${getSeverityColor(
                  bias.severity
                )}`}
              >
                <div
                  className="p-3 cursor-pointer"
                  onClick={() =>
                    setExpandedBias(expandedBias === index ? null : index)
                  }
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getBiasTypeBadge(
                          bias.type
                        )} mr-2`}
                      >
                        {bias.type}
                      </span>
                      <span className="font-medium">"{bias.text}"</span>
                    </div>
                    <span className="text-xs uppercase font-medium">
                      {bias.severity} severity
                    </span>
                  </div>
                </div>

                {expandedBias === index && (
                  <div className="px-3 pb-3 pt-1 border-t border-gray-200">
                    <p className="text-sm mb-2">Suggested alternatives:</p>
                    <ul className="space-y-1 mb-3">
                      {bias.suggestions.map((suggestion, suggIndex) => (
                        <li
                          key={suggIndex}
                          className="flex items-center text-sm"
                        >
                          <ArrowRight
                            size={12}
                            className="mr-1 flex-shrink-0"
                          />
                          <span className="mr-2">"{suggestion}"</span>
                          {onApplySuggestion && (
                            <button
                              onClick={() =>
                                onApplySuggestion(suggestion, bias.text)
                              }
                              className="text-xs px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50"
                            >
                              Apply
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
