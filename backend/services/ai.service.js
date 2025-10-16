// --- Step 1: Import Core Dependencies ---
const { Groq } = require('groq-sdk');
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");

// --- Step 2: Initialize the Groq client ---
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// The simplified AiService class
class AiService {
  /**
   * Extracts all text content from a PDF file.
   */
  static async extractTextFromPdf(pdfPath) {
    const loader = new PDFLoader(pdfPath);
    const docs = await loader.load();
    return docs.map((doc) => doc.pageContent).join("\n\n");
  }

  /**
   * Helper method to clean the AI's string response and safely parse it as JSON.
   */
  static cleanAndParseJSON(aiResponse) {
    console.log("Raw AI response length:", aiResponse.length);
    console.log("Raw AI response preview:", aiResponse.substring(0, 500));
    
    let cleanedString = aiResponse.trim();

    // Remove markdown code blocks
    cleanedString = cleanedString.replace(/^```json\s*\n?/i, '');
    cleanedString = cleanedString.replace(/\n?\s*```$/i, '');
    cleanedString = cleanedString.replace(/^```\s*\n?/i, '');
    cleanedString = cleanedString.replace(/\n?\s*```$/i, '');
    cleanedString = cleanedString.replace(/^`+|`+$/g, '');
    
    // Remove any text before the first [ or {
    const jsonStart = cleanedString.search(/[\[{]/);
    if (jsonStart > 0) {
      console.log('Removing leading text before JSON');
      cleanedString = cleanedString.substring(jsonStart);
    }
    
    // Remove any text after the last ] or }
    const jsonEnd = cleanedString.lastIndexOf(']') !== -1 
      ? cleanedString.lastIndexOf(']') + 1 
      : cleanedString.lastIndexOf('}') + 1;
    if (jsonEnd > 0 && jsonEnd < cleanedString.length) {
      console.log('Removing trailing text after JSON');
      cleanedString = cleanedString.substring(0, jsonEnd);
    }
    
    cleanedString = cleanedString.trim();
    
    console.log("Cleaned string length:", cleanedString.length);
    console.log("Cleaned string preview:", cleanedString.substring(0, 500));

    try {
      const parsed = JSON.parse(cleanedString);
      console.log("Successfully parsed JSON with", Array.isArray(parsed) ? parsed.length : 'N/A', 'items');
      return parsed;
    } catch (error) {
      console.error("JSON Parse error:", error.message);
      console.error("Failed string (first 1000 chars):", cleanedString.substring(0, 1000));
      
      // Try to extract JSON array as last resort
      try {
        const match = cleanedString.match(/\[[\s\S]*\]/);
        if (match) {
          console.log("Attempting fallback: extract JSON array from string");
          const fallbackParsed = JSON.parse(match[0]);
          console.log("Fallback parse succeeded");
          return fallbackParsed;
        }
      } catch (retryError) {
        console.error("Fallback parse also failed:", retryError.message);
      }
      
      throw new Error(`AI returned invalid JSON format: ${error.message}`);
    }
  }

  /**
   * Generates flashcards using Groq API
   */
  static async generateFlashcards(documentText, userQuery) {
    const prompt = `Based on the following document text, fulfill the user's request.
    Document Text: ${documentText}
    User Request: ${userQuery}
    
    Return ONLY a valid JSON array. No markdown, no code blocks, no explanations.
    Format: [{"question": "What is X?", "answer": "X is Y."}]
    
    Do NOT wrap your response in \`\`\`json or any other formatting.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
  temperature: 1,
  max_completion_tokens: 1024,
  top_p: 1,
  stream: false,
  stop: null
    });
console.log('chatCompletion:', JSON.stringify(chatCompletion, null, 2));
    const result = chatCompletion?.choices?.[0]?.message?.content || '';
    return this.cleanAndParseJSON(result);
  }

  /**
   * Generates a quiz using Groq API
   */
  static async generateQuiz(documentText, userQuery) {
    try {
      // ✅ Limit document text to prevent token overflow
      const maxContextLength = 6000;
      const truncatedText = documentText.length > maxContextLength 
        ? documentText.substring(0, maxContextLength) + '...[truncated]'
        : documentText;

      const prompt = `Based on the following document text, fulfill the user's request.

Document Text:
${truncatedText}

User Request: ${userQuery}

IMPORTANT INSTRUCTIONS:
1. Generate quiz questions based on the document content
2. Return ONLY a valid JSON array - no markdown, no code blocks, no explanations
3. Each object must have: "questionText", "options" (array of 4 strings), and "correctAnswerIndex" (0-3)
4. Ensure all questions are relevant to the document content

Response format example (respond with ONLY the JSON array):
[
  {
    "questionText": "What is the main topic discussed?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0
  }
]`;

      console.log('Sending request to Groq with text length:', truncatedText.length);

      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
         model: "llama-3.3-70b-versatile",
  temperature: 1,
  max_completion_tokens: 1024,
  top_p: 1,
  stream: false,
  stop: null
      });

      console.log('Received response from Groq');

      const result = chatCompletion?.choices?.[0]?.message?.content || '';
      
      if (!result) {
        throw new Error('Empty response from AI service');
      }

      console.log('Raw AI response preview:', result.substring(0, 200));

      const parsedQuiz = this.cleanAndParseJSON(result);

      // ✅ Validate the parsed quiz structure
      if (!Array.isArray(parsedQuiz) || parsedQuiz.length === 0) {
        throw new Error('AI returned invalid quiz format: not an array or empty');
      }

      // ✅ Validate each question
      for (let i = 0; i < parsedQuiz.length; i++) {
        const q = parsedQuiz[i];
        if (!q.questionText || !Array.isArray(q.options) || q.options.length !== 4 || 
            typeof q.correctAnswerIndex !== 'number' || q.correctAnswerIndex < 0 || q.correctAnswerIndex > 3) {
          throw new Error(`Invalid question structure at index ${i}: ${JSON.stringify(q)}`);
        }
      }

      console.log('Successfully generated and validated quiz with', parsedQuiz.length, 'questions');
      return parsedQuiz;

    } catch (error) {
      console.error('Error in generateQuiz:', {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      });
      throw new Error(`Quiz generation failed: ${error.message}`);
    }
  }
}

module.exports = AiService;

