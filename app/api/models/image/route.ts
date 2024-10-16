import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { connectToDatabase } from '../../../lib/mongodb';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Adjust as needed
    },
  },
};

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

async function summarizeImage(base64Image: string): Promise<string> {
  try {
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

async function evaluateImageResponse(prompt: string, context: string, response: string): Promise<{ [key: string]: FactorEvaluation } | null> {
  try {
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
    const body = await req.json();

    const { username, modelName, promptImage, contextImage, responseImage } = body;

    if (!username || !modelName || !promptImage || !contextImage || !responseImage) {
      return NextResponse.json(
        { error: 'Missing required fields: username, modelName, promptImage, contextImage, or responseImage.' },
        { status: 400 }
      );
    }

    // Summarize images
    const [prompt, context, response] = await Promise.all([
      summarizeImage(promptImage),
      summarizeImage(contextImage),
      summarizeImage(responseImage)
    ]);

    // Evaluate the response based on the summaries
    const evaluation = await evaluateImageResponse(prompt, context, response);

    if (!evaluation) {
      return NextResponse.json(
        { error: 'Failed to evaluate the image response.' },
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
