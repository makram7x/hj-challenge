import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-3xl mx-auto text-center">
        <div className="flex justify-center mb-6">
          <Image
            src="/interview-icon.svg"
            alt="Interview Assistant Logo"
            width={80}
            height={80}
            className="mb-4"
            priority
          />
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-4">
          AI-Powered Dynamic Interview Assistant
        </h1>

        <p className="text-xl text-slate-600 mb-8">
          Streamline your recruiting process with AI-driven interviews,
          real-time candidate assessment, and comprehensive scoring.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-left">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-2">Upload & Generate</h3>
            <p className="text-slate-500">
              Upload job descriptions and candidate CVs to generate tailored
              interview questions.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-2">Dynamic Interview</h3>
            <p className="text-slate-500">
              Conduct AI-driven interviews with adaptive follow-up questions and
              response timing.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-2">
              Comprehensive Scoring
            </h3>
            <p className="text-slate-500">
              Receive detailed candidate evaluations with multi-dimensional
              scoring criteria.
            </p>
          </div>
        </div>

        <Link
          href="/upload"
          className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 transition-colors"
        >
          Start New Interview
        </Link>
      </div>

      <div className="mt-16 text-center max-w-2xl">
        <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
        <ol className="flex flex-col md:flex-row gap-4 justify-between">
          <li className="bg-white p-4 rounded-lg shadow-sm flex-1 flex flex-col items-center">
            <div className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2">
              1
            </div>
            <p>Upload job description and candidate CV</p>
          </li>
          <li className="bg-white p-4 rounded-lg shadow-sm flex-1 flex flex-col items-center">
            <div className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2">
              2
            </div>
            <p>Conduct one-shot dynamic interview</p>
          </li>
          <li className="bg-white p-4 rounded-lg shadow-sm flex-1 flex flex-col items-center">
            <div className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2">
              3
            </div>
            <p>Review comprehensive candidate scoring</p>
          </li>
        </ol>
      </div>
    </main>
  );
}
