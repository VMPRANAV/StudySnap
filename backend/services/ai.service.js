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
 taskType: isQuery ? TaskType.RETRIEVAL_QUERY : TaskType.RETRIEVAL_DOCUMENT,
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
    const embeddingModel = this.getEmbeddingsModel(false);
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
  const embeddingModel = this.getEmbeddingsModel(true);
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

 static async generateFlashcards(fileId, userQuery) {
  try {
    // 1. Query Expansion: If user asks for definitions, we help the vector search 
    // by adding synonyms like 'terminology' or 'glossary'.
    const expandedQuery = userQuery.toLowerCase().includes("definition") 
      ? `${userQuery} key terms, glossary, concepts, meaning` 
      : userQuery;

    const context = await this.retrieveContext(fileId, expandedQuery);

    const prompt = `
      SYSTEM: You are a strict document-parsing assistant.
      Use ONLY the provided Context to generate flashcards.
      If the information is not in the Context, return an empty array [].
      Do not use your own internal knowledge.

      Context:
      ${context}

      User Request: ${userQuery}
      
      Return ONLY a valid JSON array of objects: [{"question": "...", "answer": "..."}]`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1, // LOW temperature is critical to prevent generic "hallucinations"
      response_format: { "type": "json_object" }
    });

    return this.cleanAndParseJSON(chatCompletion.choices[0].message.content);
  } catch (error) {
    throw new Error(`Flashcard generation failed: ${error.message}`);
  }
}

/**
 * Optimized Quiz Generation
 * Ensures distractors (wrong options) are also context-relevant.
 */
static async generateQuiz(fileId, userQuery) {
  try {
    const context = await this.retrieveContext(fileId, userQuery);

    const prompt = `
      SYSTEM: Generate a quiz based SOLELY on the provided context.
      Context:
      ${context}

      Task: Generate an MCQ quiz for: ${userQuery}
      Requirement: Ensure all questions and answers are derived from the text above.
      
      Return ONLY a valid JSON array: [{"questionText": "...", "options": ["...", "...", "...", "..."], "correctAnswerIndex": 0}]`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2, 
      response_format: { "type": "json_object" }
    });

    return this.cleanAndParseJSON(chatCompletion.choices[0].message.content);
  } catch (error) {
    throw new Error(`Quiz generation failed: ${error.message}`);
  }
}

/**
 * Optimized Q&A Set
 * Handles the distribution of marks while maintaining document grounding.
 */
static async generateQaSet(fileId, userQuery, marksDistribution) {
  try {
    // Use retrieveContext (which should use RETRIEVAL_QUERY task type)
    const contextText = await this.retrieveContext(fileId, userQuery);

    const marksRequest = Object.entries(marksDistribution)
      .map(([marks, count]) => `- ${count} question(s) worth ${marks} marks each`)
      .join("\n");

    const prompt = `
      SYSTEM: You are an exam paper generator. You must use ONLY the provided Context.
      Context:
      ${contextText}

      Task: Generate questions for: "${userQuery}".
      Requirements:
      ${marksRequest}

      Strict Instructions:
      - For high-mark questions (e.g., 10+ marks), provide long, structured, and comprehensive answers from the text.
      - Do not provide information not found in the Context.
      
      Return ONLY a JSON array: [{"question": "...", "answer": "...", "marks": number}]
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_completion_tokens: 4096,
      response_format: { "type": "json_object" }
    });

    return this.cleanAndParseJSON(chatCompletion.choices[0].message.content);
  } catch (error) {
    throw new Error(`Q&A generation failed: ${error.message}`);
  }
}
}

module.exports = AiService;
