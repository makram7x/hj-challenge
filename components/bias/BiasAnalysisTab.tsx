"use client";

import React from "react";
import {
  PieChart,
  FileText,
  AlertCircle,
  CheckCircle,
  BarChart4,
  Scale,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { BiasDetectionResult } from "@/lib/ai/biasDetection";
import BiasReport from "./BiasReport";

interface BiasAnalysisTabProps {
  biasMetrics?: BiasDetectionResult;
  fairnessAssurance?: {
    potentialBiases: string;
    mitigationSteps: string;
    diverseEvaluationConsiderations: string;
  };
  onReanalyze?: () => void;
}

export default function BiasAnalysisTab({
  biasMetrics,
  fairnessAssurance,
  onReanalyze,
}: BiasAnalysisTabProps): JSX.Element {
  if (!biasMetrics && !fairnessAssurance) {
    return (
      <div className="py-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
          <Scale size={24} className="text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          No Bias Analysis Available
        </h3>
        <p className="text-slate-600 max-w-md mx-auto mb-6">
          Bias analysis data is not available for this interview. This could be
          because the analysis was performed with an older version of the
          system.
        </p>
        {onReanalyze && (
          <button
            onClick={onReanalyze}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <RefreshCw size={16} className="mr-2" />
            Re-analyze with Bias Detection
          </button>
        )}
      </div>
    );
  }

  // If we have bias metrics, display the comprehensive report
  return (
    <div className="space-y-8">
      {/* Bias Report Section */}
      {biasMetrics && (
        <div>
          <BiasReport biasResult={biasMetrics} context="analysis" />
        </div>
      )}

      {/* Fairness Assurance Details */}
      {fairnessAssurance && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-5">
            <FileText size={20} className="text-indigo-500 mr-2" />
            <h2 className="text-lg font-semibold text-slate-900">
              Fairness Assurance Details
            </h2>
          </div>

          <div className="space-y-6">
            {/* Potential Biases */}
            <div>
              <div className="flex items-center mb-2">
                <AlertCircle size={16} className="text-amber-500 mr-2" />
                <h3 className="font-medium">Potential Biases Addressed</h3>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  {fairnessAssurance.potentialBiases ||
                    "No specific bias concerns were identified in this evaluation."}
                </p>
              </div>
            </div>

            {/* Mitigation Steps */}
            <div>
              <div className="flex items-center mb-2">
                <BarChart4 size={16} className="text-blue-500 mr-2" />
                <h3 className="font-medium">Mitigation Steps Taken</h3>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  {fairnessAssurance.mitigationSteps ||
                    "No specific mitigation steps were required for this evaluation."}
                </p>
              </div>
            </div>

            {/* Diverse Evaluation */}
            <div>
              <div className="flex items-center mb-2">
                <Lightbulb size={16} className="text-purple-500 mr-2" />
                <h3 className="font-medium">
                  Diverse Evaluation Considerations
                </h3>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  {fairnessAssurance.diverseEvaluationConsiderations ||
                    "No specific diversity considerations were documented for this evaluation."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Best Practices Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <CheckCircle size={20} className="text-green-500 mr-2" />
          <h2 className="text-lg font-semibold text-slate-900">
            Fair Evaluation Best Practices
          </h2>
        </div>

        <div className="space-y-4">
          <p className="text-slate-700">
            Our interview analysis system is designed to help ensure fair
            candidate evaluation by:
          </p>

          <ul className="list-disc pl-6 text-slate-700 space-y-2">
            <li>Focusing only on job-relevant skills and qualifications</li>
            <li>
              Applying consistent evaluation criteria across all candidates
            </li>
            <li>
              Detecting and mitigating potential sources of bias in assessments
            </li>
            <li>
              Considering diverse ways candidates might demonstrate competence
            </li>
            <li>Using objective evidence rather than subjective impressions</li>
            <li>Providing transparency into the evaluation process</li>
          </ul>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <PieChart size={18} className="text-blue-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Continuous Improvement
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  Our fairness detection and mitigation systems are continuously
                  updated based on the latest research and best practices in
                  fair hiring.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
