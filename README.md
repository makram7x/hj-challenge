unfortunatly I wasn't able to deploy the system on vercerl I run into some issues and the time wasn't enough BUT!!! I have implemented 2 extra features that I think are worth considering, sentiment analyses and bias mitigation

# To run the project
1. npm install
2. npm run dev

# AI-Enhanced Interview System

## Overview

The AI-Enhanced Interview System leverages artificial intelligence to create fair, balanced, and effective interview processes. By analyzing job descriptions and candidate CVs, the system generates contextually relevant questions while mitigating bias and providing advanced sentiment analysis of candidate responses.

## Approach to Parsing Job Descriptions and Candidate CVs

### Job Description Processing

Our system accepts job descriptions in plain text format, which are then analyzed to identify:
- Key skills and competencies required for the role
- Technical requirements and qualifications
- Experience level expectations
- Team and company context information

### CV Parsing

We've implemented an AI-enhanced document parser that handles multiple file formats:
- PDF documents
- DOCX files
- Plain text files

The CV parsing process follows these steps:

1. **Initial Text Extraction**: Raw text is extracted from the uploaded file based on its type.
2. **AI-Enhanced Information Extraction**: Using the `extractCvInfo` function, the system processes the raw text through an LLM (GPT-4o-mini) with a specialized prompt to structure the information into:
   - Candidate name and contact information
   - Professional summary
   - Key skills and technologies
   - Professional experience with company names, roles, dates, and achievements
   - Education and certifications
   - Languages and other notable information

```typescript
// Example of the structured prompt used for CV extraction
const prompt = `
You are an expert CV analyzer. Extract the key information from the following CV/resume.

CV Content:
${cvText}

Extract and organize the following information:
1. Candidate name (if present)
2. Contact information (if present)
3. Professional summary
...
`;
```

## AI Prompt Engineering for Context-Aware Questions

### Combined Input Analysis

The system ingeniously combines both the job description and CV content to create a comprehensive context for question generation:

```typescript
// Combining inputs for context-aware processing
const combinedInput = cvContent
  ? `${jobDescription}\n\nCV Content:\n${cvContent}`
  : jobDescription;
```

### Advanced Prompt Design

The system uses a sophisticated prompt strategy that:

1. **Sets expert context**: Positions the AI as an "expert in inclusive recruiting"
2. **Provides clear inputs**: Formats both job description and CV content for analysis
3. **Establishes quality criteria**: Explicitly requires questions to:
   - Focus on skills and experience relevant to job performance
   - Avoid assumptions about background or identity
   - Allow candidates from diverse backgrounds to demonstrate qualifications
   - Use inclusive, neutral language
   - Evaluate candidates on job-relevant criteria only

4. **Requires question categorization**:
   - Technical: Skills and knowledge assessment
   - Behavioral: Past behavior and experiences evaluation
   - Situational: Hypothetical scenario handling

5. **Specifies structured output format**: Requests a JSON response with:
   - Questions array with ID, text, and category
   - Context object containing job summary and key competencies
   - CV highlights when available

### Error Handling and Fallbacks

The system incorporates robust error handling with fallback to mock data when necessary, ensuring reliability even when API calls fail.

## Scoring Criteria and Timing Metrics

While the code doesn't explicitly show scoring implementation, it captures several metrics that could inform candidate evaluation:

### Sentiment Analysis Metrics

The sentiment analysis provides quantifiable metrics that can factor into scoring:
- **Confidence score** (0-100): Measures how confident the candidate appears
- **Enthusiasm score** (0-100): Evaluates excitement about the role/company
- **Nervousness score** (0-100): Quantifies anxiety or stress signals
- **Engagement score** (0-100): Assesses how actively involved the candidate is

### Timing and Response Patterns

The system tracks:
- **Timestamp data** for each message
- **Time between responses** (used in emotional shift detection)
- **Response length and complexity** as engagement indicators

```typescript
// Time-based metrics example
const timeDiff = (current.timestamp - previous.timestamp) / 1000;
```

These metrics enable the creation of a comprehensive emotional journey map throughout the interview, capturing how candidates evolve from initial nervousness to engagement or confidence.

## Sentiment Analysis Feature

### Comprehensive Emotional Detection

The sentiment analysis feature is one of the system's most sophisticated components, providing:

1. **Overall emotional tone assessment**: Positive, neutral, or negative
2. **Four key metrics**: Confidence, enthusiasm, nervousness, and engagement
3. **Emotional journey mapping**: Tracking emotional states throughout the interview

### Advanced Analysis Methodology

The system uses a multi-layered approach:

1. **AI-Based Analysis**: When OpenAI is configured, the system uses LLMs to analyze candidate responses with specialized prompts.

2. **Sophisticated Rule-Based Fallback**: When AI services are unavailable, the system falls back to an advanced rule-based approach that:
   - Analyzes text for emotional indicators using weighted patterns
   - Considers response length and complexity
   - Factors in interview stage progression

3. **Context-Aware Processing**: The system analyzes messages in context rather than isolation:
   ```typescript
   // Context-aware batch processing
   const contextBatch = candidateMessages.slice(startIndex, i + batchSize);
   const contextIndices = Array.from(
     { length: contextBatch.length },
     (_, idx) => startIndex + idx < i
   );
   ```

4. **Emotional Shift Detection**: The system identifies significant emotional transitions:
   ```typescript
   // Detecting emotional shifts
   if (prevCategory !== currCategory) {
     if (currCategory === "positive") shiftType = "positive";
     else if (currCategory === "negative") shiftType = "negative";
   }
   ```

5. **Pattern Recognition**: The system looks for linguistic patterns that indicate emotions:
   ```typescript
   const emotionPatterns = {
     enthusiastic: {
       phrases: ["excited", "passionate", "love", "thrilled", ...],
       expressionPatterns: [/!{1,}/g, /\bgreat\b/g, ...],
       weight: 1.2,
     },
     // More emotion patterns...
   };
   ```

6. **Results Smoothing**: The system applies post-processing to eliminate unlikely rapid changes and outliers.

## Bias Mitigation Feature

### Comprehensive Bias Detection

The system includes a sophisticated bias detection engine that:

1. **Analyzes generated questions** for potential bias related to:
   - Gender (pronouns, gendered terms)
   - Age (age-specific requirements)
   - Race/ethnicity (terms with racial connotations)
   - Cultural background (cultural assumptions)
   - Disability (ableist language)
   - Socioeconomic status (class-based assumptions)

2. **Context-aware analysis**: The system adapts its bias detection based on whether it's analyzing:
   - Job descriptions
   - Interview questions
   - Candidate evaluations

3. **Quantifiable metrics**:
   - Bias score (0-100, lower is better)
   - Fairness score (0-100, higher is better)
   - Detailed bias instances with severity levels

### Bias Remediation

The system doesn't just detect bias - it actively addresses it:

1. **Alternative suggestion generation**: For each detected bias instance, the system provides inclusive alternatives:
   ```typescript
   // Gender-neutral suggestion examples
   const suggestions: Record<string, string[]> = {
     "he ": ["they", "the person", "the individual", "the candidate"],
     // More suggestions...
   };
   ```

2. **Question reformulation**: When high bias is detected in generated questions:
   ```typescript
   // Reformulating biased questions
   if (biasMetrics.biasScore > 50) {
     console.log(
       "High bias detected in generated questions, adding alternative suggestions"
     );
     
     // Mark questions with bias and add alternative suggestions
     for (const bias of biasMetrics.detectedBiases) {
       for (const question of questionsResult.questions) {
         if (question.text.toLowerCase().includes(bias.text.toLowerCase())) {
           question.hasBias = true;
           question.biasType = bias.type;
           question.biasSeverity = bias.severity;
           
           // Create alternative version of the question
           const alternativeSuggestion = 
             bias.suggestions[0] || "Use more inclusive language";
           question.alternativeText = question.text.replace(
             new RegExp(bias.text, "i"),
             alternativeSuggestion
           );
         }
       }
     }
   }
   ```

### Bias Detection Fallback

When AI services are unavailable, the system uses a sophisticated rule-based approach to check for common bias indicators, ensuring continuous bias mitigation even without external AI services.

## Conclusion

The AI-Enhanced Interview System represents a significant advancement in applying artificial intelligence to recruitment processes. By combining sophisticated document parsing, context-aware question generation, sentiment analysis, and bias mitigation, the system helps create fairer, more effective interviews while providing valuable insights into candidate responses.
