import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { connectToDatabase } from '../../../lib/mongodb';

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!, // Added non-null assertion to ensure it's a string
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CustomModelRequest {
  username: string;
  modelName: string;
  promptJson: string;
  contextTxt: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, modelName, promptJson, contextTxt } = body as CustomModelRequest;

    if (!username || !modelName || !promptJson || !contextTxt) {
      return NextResponse.json({ success: false, message: 'Missing required fields.' }, { status: 400 });
    }

    const index = pinecone.Index('llm-evaluation-system');

    const namespace = `${username}_${modelName}`;

    const contextChunks = contextTxt.match(/.{1,500}/g) || [];
    const vectors = await Promise.all(
      contextChunks.map(async (chunk, idx) => {
        const embedding = await getEmbedding(chunk);
        return {
          id: `${namespace}_${idx}`,
          values: embedding,
          metadata: { text: chunk },
        };
      })
    );

    await index.namespace(namespace).upsert(vectors);

    const prompts = JSON.parse(promptJson) as (string | { prompt: string })[];

    const results: { prompt: string; response: string; context: string; factors: EvaluationResult }[] = [];

    for (const promptObj of prompts) {
      const prompt = typeof promptObj === 'string' ? promptObj : promptObj.prompt;
      const clean_prompt = prompt.replace(/\n/g, ' ');
      const queryEmbedding = await getEmbedding(clean_prompt);

      const queryResponse = await index.namespace(namespace).query({
        vector: queryEmbedding,
        topK: 5,
        includeMetadata: true,
      });

      const retrievedContext = queryResponse.matches
        .map((match) => match.metadata?.text ?? '')
        .join('\n');

      const combinedPrompt = `${retrievedContext}\n\nPrompt: ${prompt}`;

      const aiResponse = await openai.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: combinedPrompt }
        ],
        model: 'gpt-4o-mini',
      });

      const aiContent = aiResponse.choices[0]?.message?.content?.trim() ?? '';

      const factors = await evaluateResponse(username, modelName, prompt, retrievedContext, aiContent);
      
      if (!factors) {
        throw new Error('Failed to evaluate response.');
      }

      results.push({
        prompt: prompt,
        response: aiContent,
        context: retrievedContext,
        factors: factors, // Ensure 'factors' is always provided
      });
    }

    // Save results to MongoDB
    const db = await connectToDatabase();
    const collection = db.collection('evaluation_results');
    
    const resultsWithMetadata = results.map(result => ({
      ...result,
      username,
      modelName,
      evaluatedAt: new Date(),
    }));

    await collection.insertMany(resultsWithMetadata);

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error.' }, { status: 500 });
  }
}

// Updated the embedding function to use the correct input format and model
async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002', // Updated to use the ada model
    input: text,
  });
  
  return response.data[0].embedding;
}

// Add the evaluation function
async function evaluateResponse(
  username: string,
  modelName: string,
  prompt: string,
  context: string,
  response: string
): Promise<EvaluationResult> { // Removed | null
  try {
    const evaluationPrompt = `
    Evaluate the following response based on the given prompt and context. 
    Rate each factor on a scale of 0 to 1, where 1 is the best (or least problematic for negative factors like Hallucination and Bias).
    Please provide scores with two decimal places, and avoid extreme scores of exactly 0 or 1 unless absolutely necessary.

    Context: ${context}
    Prompt: ${prompt}
    Response: ${response}

    Factors to evaluate:
    1. Accuracy: How factually correct is the response?
    2. Hallucination: To what extent does the response contain made-up information? (Higher score means less hallucination)
    3. Groundedness: How well is the response grounded in the given context and prompt?
    4. Relevance: How relevant is the response to the prompt?
    5. Recall: How much of the relevant information from the context is included in the response?
    6. Precision: How precise and focused is the response in addressing the prompt?
    7. Consistency: How consistent is the response with the given information and within itself?
    8. BiasDetection: To what extent is the response free from bias? (Higher score means less bias)

    Provide the evaluation as a JSON object. Each factor should be a key mapping to an object containing 'score' and 'explanation'. 
    Do not include any additional text, explanations, or markdown formatting.
    `;

    const evaluationResponse = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert evaluator of language model responses.' },
        { role: 'user', content: evaluationPrompt }
      ],
      model: 'gpt-4o-mini',
    });

    const content = evaluationResponse.choices[0]?.message?.content?.trim() || '';

    // Ensure the response is a valid JSON object
    if (!content.startsWith('{') || !content.endsWith('}')) {
      console.error('Evaluation did not return a valid JSON object:', content);
      throw new Error('Evaluation did not return a valid JSON object'); // Throw error instead of returning null
    }

    const evaluation: EvaluationResult = JSON.parse(content);
    return evaluation;
  } catch (error: any) {
    console.error('Error in evaluateResponse:', error);
    throw error; // Throw error instead of returning null
  }
}

// Define the EvaluationResult interface
interface EvaluationResult {
  Accuracy: { score: number; explanation: string };
  Hallucination: { score: number; explanation: string };
  Groundedness: { score: number; explanation: string };
  Relevance: { score: number; explanation: string };
  Recall: { score: number; explanation: string };
  Precision: { score: number; explanation: string };
  Consistency: { score: number; explanation: string };
  BiasDetection: { score: number; explanation: string };
}