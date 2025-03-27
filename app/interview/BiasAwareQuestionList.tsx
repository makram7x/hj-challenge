"use client";

import React, { JSX, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { BiasDetectionResult } from "@/lib/ai/biasDetection";
import BiasAlert from "@/components/bias/BiasAlert";

interface Question {
  id: string;
  text: string;
  category: "technical" | "behavioral" | "situational";
  hasBias?: boolean;
  biasType?: string;
  biasSeverity?: "low" | "medium" | "high";
  alternativeText?: string;
}

interface BiasAwareQuestionListProps {
  questions: Question[];
  biasMetrics?: BiasDetectionResult;
  onSelectQuestion: (question: Question) => void;
  selectedQuestions: string[];
  maxQuestions?: number;
}

export default function BiasAwareQuestionList({
  questions,
  biasMetrics,
  onSelectQuestion,
  selectedQuestions,
  maxQuestions = 5,
}: BiasAwareQuestionListProps): JSX.Element {
  const [showAlternatives, setShowAlternatives] = useState<
    Record<string, boolean>
  >({});

  // Toggle showing alternative text for biased questions
  const toggleShowAlternative = (id: string) => {
    setShowAlternatives((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Handle selecting a question or its alternative
  const handleSelectQuestion = (
    question: Question,
    useAlternative: boolean = false
  ) => {
    if (useAlternative && question.alternativeText) {
      // Create a new question object with the alternative text
      const alternativeQuestion = {
        ...question,
        text: question.alternativeText,
        hasBias: false, // The alternative is bias-free
      };
      onSelectQuestion(alternativeQuestion);
    } else {
      onSelectQuestion(question);
    }
  };


  // Get category badge style
  const getCategoryBadgeStyle = (category: string) => {
    switch (category) {
      case "technical":
        return "bg-blue-100 text-blue-800";
      case "behavioral":
        return "bg-green-100 text-green-800";
      case "situational":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isSelected = (id: string) => selectedQuestions.includes(id);
  const isMaxQuestionsSelected = selectedQuestions.length >= maxQuestions;

  return (
    <div className="space-y-6">
      {/* Bias Alert (if bias is detected) */}
      {biasMetrics && biasMetrics.biasScore > 0 && (
        <div className="mb-4">
          <BiasAlert biasResult={biasMetrics} compact={true} />
        </div>
      )}

      <ul className="space-y-4">
        {questions.map((question) => (
          <li
            key={question.id}
            className={`border rounded-lg ${
              isSelected(question.id)
                ? "border-blue-500 bg-blue-50"
                : question.hasBias
                ? "border-amber-200"
                : "border-slate-200"
            } transition-colors`}
          >
            <div className="p-4">
              {/* Question header with category badge and bias indicator */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryBadgeStyle(
                    question.category
                  )}`}
                >
                  {question.category}
                </span>
                {question.hasBias && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                    Potential bias: {question.biasType}
                  </span>
                )}
              </div>

              {/* Question text */}
              <div className="mb-3">
                <p className="text-slate-800 font-medium">{question.text}</p>
              </div>

              {/* Show alternative suggestion if question has bias */}
              {question.hasBias && question.alternativeText && (
                <div className="mt-2">
                  <button
                    onClick={() => toggleShowAlternative(question.id)}
                    className="text-amber-600 text-sm flex items-center"
                  >
                    <AlertTriangle size={14} className="mr-1" />
                    {showAlternatives[question.id] ? "Hide" : "Show"} bias-free
                    alternative
                  </button>

                  {showAlternatives[question.id] && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center mb-1">
                        <CheckCircle
                          size={14}
                          className="text-green-600 mr-1"
                        />
                        <span className="text-sm font-medium text-green-800">
                          Bias-free alternative:
                        </span>
                      </div>
                      <p className="text-slate-800">
                        {question.alternativeText}
                      </p>

                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => handleSelectQuestion(question, true)}
                          disabled={
                            isMaxQuestionsSelected && !isSelected(question.id)
                          }
                          className={`text-sm px-3 py-1 rounded ${
                            isMaxQuestionsSelected && !isSelected(question.id)
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-green-100 text-green-800 hover:bg-green-200"
                          }`}
                        >
                          Use this version
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => handleSelectQuestion(question)}
                  disabled={isMaxQuestionsSelected && !isSelected(question.id)}
                  className={`flex items-center px-3 py-1.5 rounded text-sm ${
                    isSelected(question.id)
                      ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                      : isMaxQuestionsSelected
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {isSelected(question.id) ? (
                    <>
                      <CheckCircle size={16} className="mr-1" />
                      Selected
                    </>
                  ) : (
                    <>
                      <ArrowRight size={16} className="mr-1" />
                      {isMaxQuestionsSelected ? "Max selected" : "Select"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Selected questions count */}
      <div className="text-right text-sm text-slate-600">
        Selected {selectedQuestions.length} of {maxQuestions} questions
      </div>
    </div>
  );
}
