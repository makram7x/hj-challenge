"use client";

import React from "react";
import {
  Scale,
  Shield,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  LineChart,
  ListChecks,
} from "lucide-react";
import BiasAlert from "./BiasAlert";
import { BiasDetectionResult } from "@/lib/ai/biasDetection";

interface FairnessAssuranceProps {
  fairnessAssurance: {
    potentialBiases: string;
    mitigationSteps: string;
    diverseEvaluationConsiderations: string;
  };
  biasMetrics?: BiasDetectionResult;
}

export default function FairnessAssuranceSection({
  fairnessAssurance,
  biasMetrics,
}: FairnessAssuranceProps): JSX.Element {
  // Function to get color based on fairness score
  const getFairnessScoreColor = () => {
    if (!biasMetrics) return "text-blue-600";

    if (biasMetrics.fairnessScore >= 90) return "text-green-600";
    if (biasMetrics.fairnessScore >= 75) return "text-green-500";
    if (biasMetrics.fairnessScore >= 60) return "text-amber-500";
    return "text-red-500";
  };

  // Function to get icon based on fairness score
  const getFairnessScoreIcon = () => {
    if (!biasMetrics) return <Shield className="text-blue-500" />;

    if (biasMetrics.fairnessScore >= 90)
      return <CheckCircle className="text-green-500" />;
    if (biasMetrics.fairnessScore >= 75)
      return <Shield className="text-green-500" />;
    if (biasMetrics.fairnessScore >= 60)
      return <AlertCircle className="text-amber-500" />;
    return <AlertCircle className="text-red-500" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-5">
        <Scale size={22} className="text-indigo-500 mr-2" />
        <h2 className="text-xl font-semibold text-slate-900">
          Fairness Assurance
        </h2>
      </div>

      {/* Fairness Score Card (if bias metrics are available) */}
      {biasMetrics && (
        <div className="mb-6">
          <BiasAlert biasResult={biasMetrics} compact={true} />

          <div className="mt-4 bg-slate-50 p-4 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              {getFairnessScoreIcon()}
              <span className="ml-2 font-medium">
                Evaluation Fairness Score
              </span>
            </div>
            <div className={`font-bold text-lg ${getFairnessScoreColor()}`}>
              {biasMetrics.fairnessScore}/100
            </div>
          </div>
        </div>
      )}

      {/* Fairness Assurance Information */}
      <div className="grid grid-cols-1 gap-5">
        {/* Potential Biases */}
        <div className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertCircle size={18} className="text-amber-500 mr-2" />
            <h3 className="font-medium text-slate-800">
              Potential Biases Addressed
            </h3>
          </div>
          <p className="text-slate-700">
            {fairnessAssurance.potentialBiases ||
              "No specific bias concerns were identified in this evaluation."}
          </p>
        </div>

        {/* Mitigation Steps */}
        <div className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <ListChecks size={18} className="text-blue-500 mr-2" />
            <h3 className="font-medium text-slate-800">
              Mitigation Steps Taken
            </h3>
          </div>
          <p className="text-slate-700">
            {fairnessAssurance.mitigationSteps ||
              "No specific mitigation steps were required for this evaluation."}
          </p>
        </div>

        {/* Diverse Evaluation Considerations */}
        <div className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Lightbulb size={18} className="text-purple-500 mr-2" />
            <h3 className="font-medium text-slate-800">
              Diverse Evaluation Considerations
            </h3>
          </div>
          <p className="text-slate-700">
            {fairnessAssurance.diverseEvaluationConsiderations ||
              "No specific diversity considerations were documented for this evaluation."}
          </p>
        </div>
      </div>

      {/* Bias Details Section (if bias is detected) */}
      {biasMetrics && biasMetrics.detectedBiases.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center mb-3">
            <LineChart size={18} className="text-slate-700 mr-2" />
            <h3 className="font-medium text-slate-800">
              Potential Bias Details
            </h3>
          </div>

          <div className="space-y-4">
            {biasMetrics.detectedBiases.map((bias, index) => {
              // Get appropriate styling based on bias type and severity
              const severityColor =
                bias.severity === "high"
                  ? "bg-red-50 border-red-200"
                  : bias.severity === "medium"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-blue-50 border-blue-200";

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${severityColor}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">
                      {bias.type} bias - {bias.severity} severity
                    </div>
                  </div>
                  <p className="text-slate-700 mb-2">"{bias.text}"</p>
                  <div>
                    <div className="text-sm font-medium mb-1">Suggestions:</div>
                    <ul className="text-sm text-slate-600 pl-5 list-disc">
                      {bias.suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Best Practices Footer */}
      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex items-start">
          <div className="mt-0.5 mr-3">
            <Shield size={18} className="text-blue-500" />
          </div>
          <div className="text-sm text-slate-600">
            <p className="font-medium text-slate-700 mb-1">
              Fair Evaluation Commitment
            </p>
            <p>
              This assessment was conducted using industry best practices for
              fair candidate evaluation. The analysis focuses solely on
              job-relevant qualifications and applies consistent criteria to
              ensure all candidates receive equal consideration regardless of
              background.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
