"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Send, User, Bot, AlertTriangle } from "lucide-react";
import { useInterview } from "@/hooks/useInterview";

export default function InterviewPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const {
    messages,
    isLoading,
    error,
    isInterviewComplete,
    responseStartTime,
    responseTimes,
    initializeInterview,
    sendResponse,
  } = useInterview();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load saved job description and CV content, then initialize the interview
  useEffect(() => {
    const jobDescription = localStorage.getItem("jobDescription");
    const cvContent = localStorage.getItem("cvContent");

    if (!jobDescription || !cvContent) {
      // Handle missing data error
      return;
    }

    initializeInterview(jobDescription, cvContent);
  }, []);

  // Setup timer interval for response time
  useEffect(() => {
    if (!responseStartTime || isInterviewComplete) return;

    const interval = setInterval(() => {
      setElapsed((Date.now() - responseStartTime) / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, [responseStartTime, isInterviewComplete]);

  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Save transcript and response times when the interview is complete
  useEffect(() => {
    if (isInterviewComplete && messages.length > 0) {
      // Save the full transcript to localStorage
      localStorage.setItem("interviewTranscript", JSON.stringify(messages));

      // Save response times
      localStorage.setItem("responseTimes", JSON.stringify(responseTimes));
    }
  }, [isInterviewComplete, messages, responseTimes]);

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isSending || isInterviewComplete) return;

    setIsSending(true);

    try {
      // Send the message and get response
      const result = await sendResponse(input);
      setInput("");

      // If interview is complete, navigate to results after a delay
      if (result?.isComplete) {
        // Make sure data is saved before navigating
        localStorage.setItem("interviewTranscript", JSON.stringify(messages));
        localStorage.setItem("responseTimes", JSON.stringify(responseTimes));

        setTimeout(() => {
          // Navigate to results page
          router.push("/results");
        }, 3000);
      }
    } catch (err) {
      console.error("Error during message exchange:", err);
    } finally {
      setIsSending(false);

      // Focus the input field for the next response
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Format response time for display
  const formatResponseTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };

  // Handle Enter key to submit (Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <ArrowLeft size={16} className="mr-1" />
            Exit Interview
          </Link>
          <div className="flex items-center">
            <Clock size={16} className="mr-1 text-slate-500" />
            <span className="text-sm text-slate-500">
              {responseStartTime && !isInterviewComplete
                ? `Response time: ${formatResponseTime(elapsed)}`
                : "Interview in progress"}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4">
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
            <AlertTriangle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error</p>
              <p>{error}</p>
              <Link
                href="/upload"
                className="text-red-700 underline font-medium mt-2 inline-block"
              >
                Return to upload page
              </Link>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading interview questions...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : message.role === "system"
                        ? "bg-slate-200 text-slate-800"
                        : "bg-white border border-slate-200 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      {message.role === "user" ? (
                        <User size={16} className="mr-1" />
                      ) : message.role === "assistant" ? (
                        <Bot size={16} className="mr-1" />
                      ) : null}
                      <span className="text-xs opacity-75">
                        {message.role === "user"
                          ? "You"
                          : message.role === "system"
                          ? "System"
                          : "Interviewer"}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="bg-white border border-slate-200 rounded-lg p-2">
              <form onSubmit={handleSubmit}>
                <div className="flex items-start">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isInterviewComplete
                        ? "Interview completed"
                        : "Type your response..."
                    }
                    className="flex-1 p-2 focus:outline-none resize-none"
                    rows={3}
                    disabled={isInterviewComplete || isSending}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isSending || isInterviewComplete}
                    className={`p-2 rounded-md ${
                      !input.trim() || isSending || isInterviewComplete
                        ? "text-slate-400"
                        : "text-blue-600 hover:bg-blue-50"
                    } self-end`}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
              <div className="px-2 pt-1 text-xs text-slate-500 flex justify-between">
                <span>
                  {isInterviewComplete
                    ? "Interview completed"
                    : "Press Enter to send, Shift+Enter for a new line"}
                </span>
                {responseStartTime && !isInterviewComplete && (
                  <span className="flex items-center">
                    <Clock size={12} className="mr-1" />
                    {formatResponseTime(elapsed)}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
