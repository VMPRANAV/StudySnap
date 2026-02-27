// --- Step 1: Import Core Dependencies ---
const { Groq } = require('groq-sdk');
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { TaskType } = require("@google/generative-ai");
const Chunk= require('../models/chunk.model');
// --- Step 2: Initialize the Groq client ---
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-embedding-001", // Or "text-embedding-004"
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  dimensions: 768, // Add this line to fix the mismatch
});


class AiService {
  
  static async extractAndStorePdf(pdfPath,userId,fileId) {
    const loader = new PDFLoader(pdfPath);
    const docs = await loader.load();
   const fullText= docs.map((doc) => doc.pageContent).join("\n\n");
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize:1000,
    chunkOverlap:200,
  });
  const splitDocs = await splitter.createDocuments([fullText]);
  const chunkDocs=[];
  for(const doc of splitDocs){
    const vector =await this.generateEmbedding(doc.pageContent);
    chunkDocs.push({
      fileId:fileId,
      userId: userId,
      text:doc.pageContent,
      embedding:vector

    });

    
  }
      await Chunk.insertMany(chunkDocs);
  return chunkDocs.length;
  }
// Generate Embeddings
static async generateEmbedding(text){
  try{


    return await embeddings.embedQuery(text);;
  }
  catch(error){
    console.error("Gemini Embedding Error:",error);
    throw new Error("Failed to generate embedding vector");
  }
}
static async retrieveContext(fileId,query){
  const queryVector= await this.generateEmbedding(query);
  const relevantChunks= await Chunk.aggregate([{
    "$vectorSearch": {
      "index": "vector_index",
      "path": "embedding",
      "queryVector": queryVector,
      "numCandidates": 100,
      "limit": 5,
      "filter": { "fileId": fileId }
    }
  }]);
  return relevantChunks.map(c=>c.text).join("\n\n");
}
/**
   * Helper method to clean the AI's string response and safely parse it as JSON.
   */
  static cleanAndParseJSON(aiResponse) {
    let cleanedString = aiResponse.trim();
    cleanedString = cleanedString.replace(/^```json\s*\n?/i, '').replace(/\n?\s*```$/i, '');
    cleanedString = cleanedString.replace(/^```\s*\n?/i, '').replace(/\n?\s*```$/i, '');
    cleanedString = cleanedString.replace(/^`+|`+$/g, '');
    
    const jsonStart = cleanedString.search(/[\[{]/);
    if (jsonStart > 0) cleanedString = cleanedString.substring(jsonStart);
    
    const jsonEnd = cleanedString.lastIndexOf(']') !== -1 
      ? cleanedString.lastIndexOf(']') + 1 
      : cleanedString.lastIndexOf('}') + 1;
    if (jsonEnd > 0 && jsonEnd < cleanedString.length) cleanedString = cleanedString.substring(0, jsonEnd);
    
    try {
      return JSON.parse(cleanedString);
    } catch (error) {
      const match = cleanedString.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
      throw new Error(`AI returned invalid JSON: ${error.message}`);
    }
  }

  /**
   * 5. Updated Flashcard Generation (Using RAG)
   */
  static async generateFlashcards(fileId, userQuery) {
    try {
      const context = await this.retrieveContext(fileId, userQuery);

      const prompt = `Based on the following document context, generate flashcards.
Context:
${context}

User Request: ${userQuery}
Return ONLY a valid JSON array: [{"question": "...", "answer": "..."}]`;

      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.8,
      });

      return this.cleanAndParseJSON(chatCompletion.choices[0].message.content);
    } catch (error) {
      throw new Error(`Flashcard generation failed: ${error.message}`);
    }
  }

  /**
   * 6. Updated Quiz Generation (Using RAG)
   */
  static async generateQuiz(fileId, userQuery) {
    try {
      const context = await this.retrieveContext(fileId, userQuery);

      const prompt = `Based on the following document context, generate an MCQ quiz.
Context:
${context}

User Request: ${userQuery}
Return ONLY a valid JSON array of objects with "questionText", "options" (4 strings), and "correctAnswerIndex" (0-3).`;

      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.8,
      });

      const parsedQuiz = this.cleanAndParseJSON(chatCompletion.choices[0].message.content);

      // Validation logic
      for (const q of parsedQuiz) {
        if (!q.questionText || q.options.length !== 4) throw new Error("Invalid quiz structure");
      }

      return parsedQuiz;
    } catch (error) {
      throw new Error(`Quiz generation failed: ${error.message}`);
    }
  }

static async generateQaSet(fileId, userQuery, marksDistribution) {
  try {
    // 1. Vector Search with a higher limit for detailed answers
    const queryVector = await this.generateEmbedding(userQuery);
    const relevantChunks = await Chunk.aggregate([
      {
        "$vectorSearch": {
          "index": "vector_index",
          "path": "embedding",
          "queryVector": queryVector,
          "numCandidates": 150,
          "limit": 8, // More context for longer answers
          "filter": { "fileId": fileId }
        }
      }
    ]);

    const contextText = relevantChunks.map(c => c.text).join("\n\n");

    const marksRequest = Object.entries(marksDistribution)
      .map(([marks, count]) => `- ${count} question(s) worth ${marks} marks each`)
      .join("\n");

    const prompt = `
      Context from Study Document:
      ${contextText}

      Task: Generate questions for the topic "${userQuery}".
      
      Requirements:
      ${marksRequest}

      Instructions:
      - Detail must match the marks (e.g., 14-mark answers must be comprehensive).
      - Return ONLY a JSON array: [{"question": "...", "answer": "...", "marks": number}]
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_completion_tokens: 4096, // High limit for long answers
    });

    return this.cleanAndParseJSON(chatCompletion.choices[0].message.content);
  } catch (error) {
    throw new Error(`Q&A generation failed: ${error.message}`);
  }
}
}

module.exports = AiService;