import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { connectToDatabase } from '../../../lib/mongodb';

// Add function to get user's OpenAI API key
async function getUserOpenAIKey(username: string) {
  const db = await connectToDatabase();
  const user = await db.collection('users').findOne({ username });
  return user?.openai_api_key;
}

// Remove the global OpenAI client initialization
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FactorEvaluation {
  score: number;
  explanation: string;
}

interface ImageEvaluationResult {
  username: string;
  modelName: string;
  prompt: string;
  context: string;
  response: string;
  factors: {
    Accuracy: FactorEvaluation;
    Hallucination: FactorEvaluation;
    Groundedness: FactorEvaluation;
    Relevance: FactorEvaluation;
    Recall: FactorEvaluation;
    Precision: FactorEvaluation;
    Consistency: FactorEvaluation;
    BiasDetection: FactorEvaluation;
  };
  evaluatedAt: Date;
}

async function summarizeImage(base64Image: string, openaiApiKey: string): Promise<string> {
  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this image concisely." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
    });

    return response.choices[0].message.content || "Unable to summarize image.";
  } catch (error) {
    console.error('Error summarizing image:', error);
    return "Error occurred while summarizing image.";
  }
}

async function evaluateImageResponse(prompt: string, context: string, response: string, openaiApiKey: string): Promise<{ [key: string]: FactorEvaluation } | null> {
  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const evaluationPrompt = `
Evaluate the following image-based response based on the given prompt and context. 
Rate each factor on a scale of 0 to 1, where 1 is the best (or least problematic for negative factors like Hallucination and Bias).
Please provide scores with two decimal places, and avoid extreme scores of exactly 0 or 1 unless absolutely necessary.

Context: ${context}
Prompt: ${prompt}
Response: ${response}

Factors to evaluate:
1. Accuracy: How factually correct is the response image based on the descriptions?
2. Hallucination: To what extent does the response image contain elements not present in the prompt or context? (Higher score means less hallucination)
3. Groundedness: How well is the response image grounded in the given context and prompt?
4. Relevance: How relevant is the response image to the prompt?
5. Recall: How much of the relevant information from the context is included in the response image?
6. Precision: How precise and focused is the response image in addressing the prompt?
7. Consistency: How consistent is the response image with the given information?
8. BiasDetection: To what extent is the response image free from bias? (Higher score means less bias)

Provide the evaluation as a JSON object. Each factor should be a key mapping to an object containing 'score' and 'explanation'. 
Do not include any additional text, explanations, or markdown formatting.
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert evaluator of image-based AI responses.' },
        { role: 'user', content: evaluationPrompt },
      ],
      temperature: 0,
    });

    const content = completion.choices[0].message.content?.trim();

    if (!content || !content.startsWith('{') || !content.endsWith('}')) {
      console.error('Evaluation did not return a valid JSON object.');
      return null;
    }

    const evaluation = JSON.parse(content);

    const requiredFactors = [
      'Accuracy', 'Hallucination', 'Groundedness', 'Relevance',
      'Recall', 'Precision', 'Consistency', 'BiasDetection'
    ];

    for (const factor of requiredFactors) {
      if (!(factor in evaluation)) {
        console.error(`Missing factor in evaluation: ${factor}`);
        return null;
      }
    }

    return evaluation;
  } catch (error) {
    console.error(`Error in image evaluation: ${error}`);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const username = formData.get('username') as string;
    const modelName = formData.get('modelName') as string;
    
    // Get user's OpenAI API key
    const openaiApiKey = await getUserOpenAIKey(username);
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not found for user.' },
        { status: 400 }
      );
    }

    const promptType = formData.get('promptType') as string;
    const contextType = formData.get('contextType') as string;
    const responseType = formData.get('responseType') as string;

    const promptImage = formData.get('promptImage') as File | null;
    const contextImage = formData.get('contextImage') as File | null;
    const responseImage = formData.get('responseImage') as File | null;

    const promptText = formData.get('promptText') as string | null;
    const contextText = formData.get('contextText') as string | null;
    const responseText = formData.get('responseText') as string | null;

    if (!username || !modelName) {
      return NextResponse.json(
        { error: 'Missing required fields: username or modelName.' },
        { status: 400 }
      );
    }

    let prompt, context, response;

    // Handle prompt
    if (promptType === 'image' && promptImage) {
      const buffer = await promptImage.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');
      prompt = await summarizeImage(base64Image, openaiApiKey);
    } else if (promptType === 'text' && promptText) {
      prompt = promptText;
    } else {
      return NextResponse.json(
        { error: 'Invalid prompt data.' },
        { status: 400 }
      );
    }

    // Handle context
    if (contextType === 'image' && contextImage) {
      const buffer = await contextImage.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');
      context = await summarizeImage(base64Image, openaiApiKey);
    } else if (contextType === 'text' && contextText) {
      context = contextText;
    } else {
      return NextResponse.json(
        { error: 'Invalid context data.' },
        { status: 400 }
      );
    }

    // Handle response
    if (responseType === 'image' && responseImage) {
      const buffer = await responseImage.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');
      response = await summarizeImage(base64Image, openaiApiKey);
    } else if (responseType === 'text' && responseText) {
      response = responseText;
    } else {
      return NextResponse.json(
        { error: 'Invalid response data.' },
        { status: 400 }
      );
    }

    // Evaluate with user's API key
    const evaluation = await evaluateImageResponse(prompt, context, response, openaiApiKey);

    if (!evaluation) {
      return NextResponse.json(
        { error: 'Failed to evaluate the response.' },
        { status: 500 }
      );
    }

    const result: ImageEvaluationResult = {
      username,
      modelName,
      prompt,
      context,
      response,
      factors: evaluation as {
        Accuracy: FactorEvaluation;
        Hallucination: FactorEvaluation;
        Groundedness: FactorEvaluation;
        Relevance: FactorEvaluation;
        Recall: FactorEvaluation;
        Precision: FactorEvaluation;
        Consistency: FactorEvaluation;
        BiasDetection: FactorEvaluation;
      },
      evaluatedAt: new Date(),
    };

    // Save evaluation result to MongoDB
    const db = await connectToDatabase();
    await db.collection('evaluation_results').insertOne({
      ...result,
      inputType: 'image',
    });

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    console.error('Error in POST function:', error);
    return NextResponse.json(
      { error: 'Failed to process the image evaluation request.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
