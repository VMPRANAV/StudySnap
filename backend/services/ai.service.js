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
    console.log("Raw AI response:", aiResponse);
    
    let cleanedString = aiResponse.trim();

    // Remove markdown code blocks
    cleanedString = cleanedString.replace(/^```json\s*\n?/i, '');
    cleanedString = cleanedString.replace(/\n?\s*```$/i, '');
    cleanedString = cleanedString.replace(/^```\s*\n?/i, '');
    cleanedString = cleanedString.replace(/\n?\s*```$/i, '');
    cleanedString = cleanedString.replace(/^`+|`+$/g, '');
    
    cleanedString = cleanedString.trim();
    
    console.log("Cleaned string:", cleanedString);

    try {
      return JSON.parse(cleanedString);
    } catch (error) {
      console.error("Parse error:", error.message);
      console.error("Failed to parse:", cleanedString);
      throw new Error(`AI returned invalid JSON: ${error.message}`);
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
    const prompt = `Based on the following document text, fulfill the user's request.
    Context: ${documentText}
    User Request: ${userQuery}
    
    Return the result as a valid JSON array of objects. Each object must have a "questionText" key, an "options" array of 4 strings, and a "correctAnswerIndex" key.
    Example: [{"questionText": "What is A?", "options": ["A", "B", "C", "D"], "correctAnswerIndex": 0}]
    IMPORTANT: You must respond with only the raw JSON array, without any markdown formatting or code blocks.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
  temperature: 1,
  max_completion_tokens: 32768,
  top_p: 1.79,
  stream: false,
  stop: null
    });

    const result = chatCompletion?.choices?.[0]?.message?.content || '';
    return this.cleanAndParseJSON(result);
  }
}

module.exports = AiService;

