import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectToDatabase } from '../../../lib/mongodb';
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getEmbedding(text: string | undefined): Promise<number[]> {
  if (typeof text !== 'string') {
    console.error('Invalid input for getEmbedding:', text);
    throw new Error('Invalid input for getEmbedding: text must be a string');
  }

  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text.replace(/\n/g, " "), // Replace newlines with spaces
  });
  return response.data[0].embedding;
}

function chunkText(text: string, chunkSize: number = 1000): string[] {
  console.log('Chunking text...');
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = '';

  for (const word of words) {
    if ((currentChunk + ' ' + word).length <= chunkSize) {
      currentChunk += (currentChunk ? ' ' : '') + word;
    } else {
      chunks.push(currentChunk);
      currentChunk = word;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  console.log(`Text chunked into ${chunks.length} chunks`);
  return chunks;
}

async function upsertToPinecone(chunks: string[], modelId: string) {
  console.log(`Upserting ${chunks.length} chunks to Pinecone for model ${modelId}`);
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
  const namespace = modelId; // Use modelId directly as the namespace

  const vectors = await Promise.all(chunks.map(async (chunk, i) => {
    const embedding = await getEmbedding(chunk);
    return {
      id: `chunk_${i}`,
      values: embedding,
      metadata: { text: chunk }
    };
  }));

  await index.namespace(namespace).upsert(vectors);
  console.log(`Upserted ${vectors.length} vectors to Pinecone`);
}

async function queryPinecone(prompt: string, modelId: string): Promise<string> {
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
  const namespace = modelId; // Use modelId directly as the namespace
  const queryEmbedding = await getEmbedding(prompt);

  const queryResponse = await index.namespace(namespace).query({
    topK: 1,
    vector: queryEmbedding,
    includeMetadata: true,
  });

  return queryResponse.matches[0]?.metadata?.text || '';
}

async function evaluateWithTeacherModel(prompt: string, response: string, context: string): Promise<any> {
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

  try {
    const teacherResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: 'user', content: evaluationPrompt }],
    });

    const content = teacherResponse.choices[0]?.message?.content;
    console.log('Raw teacher model response:', content);

    if (!content) {
      throw new Error('Empty response from teacher model');
    }

    // Parse the JSON response
    const parsedContent = JSON.parse(content);

    return parsedContent;
  } catch (error) {
    console.error('Error in evaluateWithTeacherModel:', error);
    // Return a default evaluation object in case of error
    return {
      Accuracy: { score: 0.5, explanation: 'Evaluation failed' },
      Hallucination: { score: 0.5, explanation: 'Evaluation failed' },
      Groundedness: { score: 0.5, explanation: 'Evaluation failed' },
      Relevance: { score: 0.5, explanation: 'Evaluation failed' },
      Recall: { score: 0.5, explanation: 'Evaluation failed' },
      Precision: { score: 0.5, explanation: 'Evaluation failed' },
      Consistency: { score: 0.5, explanation: 'Evaluation failed' },
      BiasDetection: { score: 0.5, explanation: 'Evaluation failed' }
    };
  }
}

export async function POST(request: Request) {
  try {
    console.log('Received POST request for custom model evaluation');
    const { modelName, testData, username } = await request.json();

    if (!modelName || !testData || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the model details from the database
    const db = await connectToDatabase();
    const model = await db.collection('models').findOne({ model_name: modelName, username });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const modelId = model.model_id;

    // Ensure testData is an array and has at least one item
    if (!Array.isArray(testData) || testData.length === 0) {
      return NextResponse.json({ error: 'Invalid testData format' }, { status: 400 });
    }

    // Ensure the first item in testData has a context property
    if (typeof testData[0].context !== 'string') {
      return NextResponse.json({ error: 'Invalid context in testData' }, { status: 400 });
    }

    console.log(`Processing ${testData.length} test items for model ${modelName} (ID: ${modelId})`);

    // Chunk and upsert context to Pinecone
    console.log('Chunking and upserting context to Pinecone...');
    const contextChunks = chunkText(testData[0].context);
    await upsertToPinecone(contextChunks, modelId);
    console.log('Context chunked and upserted to Pinecone');

    const results = [];

    for (const item of testData) {
      console.log('Processing item:', item);  // Log the entire item for debugging

      if (typeof item !== 'object' || item === null) {
        console.error('Invalid item in testData:', item);
        continue;  // Skip this item and move to the next one
      }

      const { prompt, context } = item;

      // Handle nested prompt structure
      let promptText;
      if (typeof prompt === 'object' && prompt !== null) {
        promptText = prompt.prompt?.prompt || prompt.prompt;
      } else if (typeof prompt === 'string') {
        promptText = prompt;
      } else {
        console.error('Invalid prompt structure in item:', item);
        continue;  // Skip this item and move to the next one
      }

      if (typeof promptText !== 'string') {
        console.error('Invalid prompt text:', promptText);
        continue;  // Skip this item and move to the next one
      }

      console.log(`Processing prompt: ${promptText.substring(0, 50)}...`);
      const relevantContext = await queryPinecone(promptText, modelId);
      console.log(`Retrieved relevant context: ${relevantContext.substring(0, 50)}...`);

      let result: string;
      const startTime = Date.now();

      // Construct the full prompt
      const fullPrompt = `Context: ${relevantContext}\n\nPrompt: ${promptText}`;

      // Process with the selected model
      switch (modelName) {
        case 'gpt-4o':
        case 'gpt-4o-mini':
          const customOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const openAIResponse = await customOpenAI.chat.completions.create({
            model: modelName,
            messages: [{ role: 'user', content: fullPrompt }],
          });
          result = openAIResponse.choices[0]?.message?.content || '';
          break;

        case 'claude-3-sonnet':
          const customAnthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const anthropicResponse = await customAnthropic.messages.create({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 1000,
            messages: [{ role: 'user', content: fullPrompt }],
          });
          result = anthropicResponse.content[0].type === 'text' 
            ? anthropicResponse.content[0].text 
            : '';
          break;

        case 'gemini-pro':
          const customGenAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
          const model = customGenAI.getGenerativeModel({ model: 'gemini-pro' });
          const geminiResponse = await model.generateContent(fullPrompt);
          result = geminiResponse.response.text();
          break;

        default:
          throw new Error('Unsupported model');
      }

      const endTime = Date.now();
      const latency = endTime - startTime;

      // Evaluate with teacher model
      let evaluation;
      try {
        evaluation = await evaluateWithTeacherModel(promptText, result, relevantContext);
      } catch (error) {
        console.error('Error evaluating with teacher model:', error);
        evaluation = {
          Accuracy: { score: 0.5, explanation: 'Evaluation failed' },
          Hallucination: { score: 0.5, explanation: 'Evaluation failed' },
          Groundedness: { score: 0.5, explanation: 'Evaluation failed' },
          Relevance: { score: 0.5, explanation: 'Evaluation failed' },
          Recall: { score: 0.5, explanation: 'Evaluation failed' },
          Precision: { score: 0.5, explanation: 'Evaluation failed' },
          Consistency: { score: 0.5, explanation: 'Evaluation failed' },
          BiasDetection: { score: 0.5, explanation: 'Evaluation failed' }
        };
      }

      // Create and save evaluation result
      const evaluationResult = {
        username,
        modelName,
        prompt: promptText,
        context: relevantContext,
        response: result,
        factors: evaluation,
        evaluatedAt: new Date(),
        latency,
      };

      const db = await connectToDatabase();
      await db.collection('evaluation_results').insertOne(evaluationResult);

      results.push(evaluationResult);
    }

    console.log(`Evaluation completed. Returning ${results.length} results.`);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'An error occurred while processing the request', details: error.message }, { status: 500 });
  }
}
