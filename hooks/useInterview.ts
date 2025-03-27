import { useState, useCallback, useEffect, useRef } from "react";

// Define types for our hook
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

interface InterviewContext {
  jobDescription: string;
  cvHighlights: string[];
  keyCompetencies: string[];
}

interface InterviewState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isInterviewComplete: boolean;
  responseStartTime: number | null;
  responseTimes: Record<string, number>;
  questionCount: number;
  context: InterviewContext | null;
}

// Simple ID generator
function generateId(prefix: string = ""): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function useInterview() {
  // Track initialization state to prevent duplicate initialization
  const isInitialized = useRef(false);

  // Track message index for response times
  const messageIndexRef = useRef(0);

  // Interview state
  const [state, setState] = useState<InterviewState>({
    messages: [],
    isLoading: true,
    error: null,
    isInterviewComplete: false,
    responseStartTime: null,
    responseTimes: {},
    questionCount: 0,
    context: null,
  });

  // Initialize interview with job description and CV
  const initializeInterview = useCallback(
    async (jobDescription: string, cvContent: string) => {
      // Prevent multiple initializations
      if (isInitialized.current) {
        console.log("Interview already initialized, skipping");
        return;
      }

      // Mark as initialized immediately to prevent race conditions
      isInitialized.current = true;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        // Fetch initial questions from API
        const response = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobDescription, cvContent }),
        });

        if (!response.ok) {
          throw new Error(`Failed to generate questions: ${response.status}`);
        }

        const data = await response.json();

        // Ensure each question has a unique ID
        const questions = data.questions.map((q: any) => ({
          ...q,
          id: generateId("q-"),
        }));

        // Format the welcome message and first question
        const welcomeMessage: Message = {
          id: generateId("system-"),
          role: "system",
          content:
            "Welcome to your interview. I'll be asking you a series of questions to evaluate your fit for the position. Please provide detailed responses.",
          timestamp: Date.now(),
        };

        const firstQuestion: Message = {
          id: generateId("assistant-"),
          role: "assistant",
          content: questions[0].text,
          timestamp: Date.now() + 100, // Add slight offset to ensure different timestamps
        };

        // Update state with initial messages and context
        setState((prev) => ({
          ...prev,
          messages: [welcomeMessage, firstQuestion],
          isLoading: false,
          responseStartTime: Date.now(),
          context: {
            jobDescription: data.context.jobDescription,
            cvHighlights: data.context.cvHighlights || [],
            keyCompetencies: data.context.keyCompetencies || [],
          },
          questionCount: 1, // We've asked one question
        }));
      } catch (error: any) {
        console.error("Error initializing interview:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || "Failed to initialize interview",
        }));
        // Reset initialization flag to allow retry
        isInitialized.current = false;
      }
    },
    []
  );

  // Send user response and get next question
  const sendResponse = useCallback(
    async (content: string) => {
      if (state.isInterviewComplete) return null;

      const userMessageId = generateId("user-");
      const responseTime = state.responseStartTime
        ? (Date.now() - state.responseStartTime) / 1000
        : 0;

      // Create user message
      const userMessage: Message = {
        id: userMessageId,
        role: "user",
        content,
        timestamp: Date.now(),
      };

      // Add user message and reset response time
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        responseStartTime: null,
        responseTimes: {
          ...prev.responseTimes,
          [messageIndexRef.current]: responseTime,
        },
      }));

      // Increment message index for the next response time
      messageIndexRef.current++;

      // Check if we should end the interview
      if (state.questionCount >= 5) {
        // Assuming 5 questions total
        setState((prev) => ({
          ...prev,
          isInterviewComplete: true,
        }));

        return { isComplete: true };
      }

      try {
        // IMPORTANT FIX: Use the correct API endpoint - /api/chat instead of /api/interview-chat
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            questionContext: state.context,
            chatHistory: [...state.messages, userMessage],
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to get response: ${response.status}`);
        }

        const { response: aiResponse } = await response.json();

        // Create assistant message with response
        const assistantMessage: Message = {
          id: generateId("assistant-"),
          role: "assistant",
          content: aiResponse,
          timestamp: Date.now(),
        };

        // Update state with new message and start timer for next response
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
          responseStartTime: Date.now(),
          questionCount: prev.questionCount + 1,
        }));

        // Check if this was the last question
        if (state.questionCount + 1 >= 5) {
          return { isComplete: true };
        }

        return { isComplete: false };
      } catch (error: any) {
        console.error("Error getting response:", error);
        setState((prev) => ({
          ...prev,
          error: error.message || "Failed to get response",
        }));
        return null;
      }
    },
    [state]
  );

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    isInterviewComplete: state.isInterviewComplete,
    responseStartTime: state.responseStartTime,
    responseTimes: state.responseTimes,
    initializeInterview,
    sendResponse,
  };
}
