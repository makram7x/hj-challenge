import { openai } from "@/lib/ai/aiConfig";

/**
 * AI-enhanced document parsing to extract structured information from CV/resume
 */
export async function extractCvInfo(cvText: string) {
  try {
    const prompt = `
You are an expert CV analyzer. Extract the key information from the following CV/resume.

CV Content:
${cvText}

Extract and organize the following information:
1. Candidate name (if present)
2. Contact information (if present)
3. Professional summary
4. Key skills and technologies
5. Professional experience (with company names, roles, dates, and key achievements)
6. Education
7. Certifications (if any)
8. Languages (if any)
9. Any other notable information

Format the information in a structured way. If any section is not present in the CV, indicate that it's not available.
`;

    if (!openai) {
      throw new Error("OpenAI client is not initialized");
    }
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using a cheaper model for parsing
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant specialized in parsing and extracting information from CVs and resumes.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 1500,
    });

    return response.choices[0]?.message?.content || cvText;
  } catch (error) {
    console.error("Error extracting CV information:", error);
    // Return the original text if extraction fails
    return cvText;
  }
}

// Enhancement of the original parseCV function to include AI extraction
export async function parseAndEnhanceCv(
  file: File
): Promise<{ rawText: string; enhancedText: string }> {
  if (!file) {
    throw new Error("No file provided");
  }

  try {
    // First, parse the raw text based on file type
    let rawText = "";

    if (file.type === "application/pdf") {
      rawText = await parsePDF(file);
    } else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      rawText = await parseDocx(file);
    } else if (file.type === "text/plain") {
      rawText = await parseText(file);
    } else {
      throw new Error("Unsupported file type");
    }

    // Then, use AI to enhance and structure the CV information
    const enhancedText = await extractCvInfo(rawText);

    return { rawText, enhancedText };
  } catch (error) {
    console.error("Error parsing and enhancing CV:", error);
    throw error;
  }
}

// The following functions can remain the same as in the original documentParser.ts
// But in a real implementation, you would use proper libraries for parsing different file types

async function parsePDF(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      console.log("Parsing PDF file:", file.name);
      // In a real implementation, use a library like pdf.js
      resolve(`
        [Extracted content from ${file.name}]
        
        PROFESSIONAL SUMMARY
        Experienced software engineer with expertise in JavaScript, React, and Node.js.
        
        SKILLS
        - JavaScript/TypeScript
        - React.js
        - Node.js
        - Next.js
        - Express
        - MongoDB
        - SQL
        
        EXPERIENCE
        Senior Software Engineer | Tech Company Inc. | 2020-Present
        - Developed scalable web applications using React and Node.js
        - Implemented CI/CD pipelines and improved code quality
        - Led team of 4 developers on key projects
        
        Software Developer | Digital Solutions Ltd. | 2018-2020
        - Built RESTful APIs with Express and MongoDB
        - Developed frontend features using React
        
        EDUCATION
        BS in Computer Science | University of Technology | 2018
      `);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

async function parseDocx(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      console.log("Parsing DOCX file:", file.name);
      // In a real implementation, use a library like mammoth.js
      resolve(`
        [Extracted content from ${file.name}]
        
        PROFESSIONAL SUMMARY
        Experienced software engineer with expertise in JavaScript, React, and Node.js.
        
        SKILLS
        - JavaScript/TypeScript
        - React.js
        - Node.js
        - Next.js
        - Express
        - MongoDB
        - SQL
        
        EXPERIENCE
        Senior Software Engineer | Tech Company Inc. | 2020-Present
        - Developed scalable web applications using React and Node.js
        - Implemented CI/CD pipelines and improved code quality
        - Led team of 4 developers on key projects
        
        Software Developer | Digital Solutions Ltd. | 2018-2020
        - Built RESTful APIs with Express and MongoDB
        - Developed frontend features using React
        
        EDUCATION
        BS in Computer Science | University of Technology | 2018
      `);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

async function parseText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const content = reader.result as string;
      resolve(content);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}
