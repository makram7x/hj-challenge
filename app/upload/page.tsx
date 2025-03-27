"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { parseAndEnhanceCv } from "@/lib/parser/aiDocumentParser";

export default function UploadPage() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState("");
  const [isJobDescriptionValid, setIsJobDescriptionValid] = useState<
    boolean | null
  >(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<string>("");

  // Validate job description (minimum 100 characters)
  const validateJobDescription = (text: string) => {
    const isValid = text.trim().length >= 100;
    setIsJobDescriptionValid(isValid);
    return isValid;
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFileError(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Check file type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (!validTypes.includes(selectedFile.type)) {
      setFileError("Please upload a PDF, DOCX, or TXT file");
      setFile(null);
      return;
    }

    // Check file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setFileError("File size must be less than 5MB");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    const isJdValid = validateJobDescription(jobDescription);
    if (!isJdValid || !file) {
      return;
    }

    setIsUploading(true);

    try {
      // Update progress and stage for better UX
      setProcessingStage("Parsing CV document...");
      updateProgress(10, 300);

      // Parse and enhance the CV
      const { rawText, enhancedText } = await parseAndEnhanceCv(file);

      setProcessingStage("Analyzing job requirements...");
      updateProgress(40, 400);

      // Store the job description and CV content in localStorage
      localStorage.setItem("jobDescription", jobDescription);
      localStorage.setItem("cvContent", enhancedText);
      localStorage.setItem("fileName", file.name);

      setProcessingStage("Generating tailored questions...");
      updateProgress(70, 500);

      // Simulate completing the process
      updateProgress(100, 600);
      setProcessingStage("Preparation complete!");

      // Navigate to interview page after a short delay
      setTimeout(() => {
        router.push("/interview");
      }, 1000);
    } catch (error: any) {
      console.error("Error processing upload:", error);
      setFileError(`Error processing your CV: ${error.message}`);
      setIsUploading(false);
      setUploadProgress(0);
      setProcessingStage("");
    }
  };

  // Helper function to update progress with animations
  const updateProgress = (targetProgress: number, delay: number) => {
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= targetProgress) {
          clearInterval(interval);
          return prev;
        }
        return prev + 5;
      });
    }, delay / 10);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">
            Upload Interview Materials
          </h1>
          <p className="text-slate-600 mt-2">
            Enter a detailed job description and upload the candidate's CV to
            generate personalized interview questions.
          </p>
        </div>

        {/* Main form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-md p-6"
        >
          {/* Job Description */}
          <div className="mb-6">
            <label
              htmlFor="jobDescription"
              className="block font-medium text-slate-700 mb-2"
            >
              Job Description
            </label>
            <textarea
              id="jobDescription"
              className={`w-full p-3 border rounded-md h-40 ${
                isJobDescriptionValid === false
                  ? "border-red-500"
                  : "border-slate-300"
              }`}
              placeholder="Paste or type the full job description here..."
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value);
                if (isJobDescriptionValid !== null) {
                  validateJobDescription(e.target.value);
                }
              }}
              onBlur={() => validateJobDescription(jobDescription)}
            />
            {isJobDescriptionValid === false && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle size={16} className="mr-1" />
                Job description must be at least 100 characters
              </p>
            )}
          </div>

          {/* CV Upload */}
          <div className="mb-6">
            <label
              htmlFor="cvUpload"
              className="block font-medium text-slate-700 mb-2"
            >
              Candidate CV
            </label>
            <div
              className={`border-2 border-dashed rounded-md p-6 text-center ${
                fileError
                  ? "border-red-300 bg-red-50"
                  : file
                  ? "border-green-300 bg-green-50"
                  : "border-slate-300 bg-slate-50"
              }`}
            >
              {!file ? (
                <div>
                  <FileText className="mx-auto h-12 w-12 text-slate-400" />
                  <div className="mt-4 flex text-sm leading-6 text-slate-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md font-semibold text-blue-600 hover:text-blue-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    PDF, DOCX or TXT up to 5MB
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center text-slate-700">
                  <CheckCircle size={20} className="mr-2 text-green-500" />
                  <span className="font-medium">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="ml-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            {fileError && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle size={16} className="mr-1" />
                {fileError}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUploading || !file || !jobDescription.trim()}
              className={`px-6 py-3 rounded-md font-medium text-white ${
                isUploading || !file || !jobDescription.trim()
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isUploading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center">
                  <Sparkles size={18} className="mr-2" />
                  Generate AI Interview
                </div>
              )}
            </button>
          </div>

          {/* Processing Progress */}
          {isUploading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                <span className="flex items-center">
                  <Sparkles size={16} className="mr-2 text-blue-500" />
                  {processingStage}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
