import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { connectToDatabase } from '../../../lib/mongodb';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface EvaluationEntry {
  prompt: string;
  context: string;
  response: string;
}

interface FactorEvaluation {
  score: number;
  explanation: string;
}

interface EvaluationResult {
  username: string; // Added username field
  modelName: string; // Added modelName field
  prompt: string;
  context: string; // Added context field
  response: string; // Added response field
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
  latency: number; // Added latency field per evaluation
}

async function evaluateResponse(
  prompt: string,
  context: string,
  response: string,
  username: string,
  modelName: string
): Promise<EvaluationResult | null> {
  const evaluationStartTime = Date.now(); // Start time for this evaluation

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert evaluator of language model responses.' },
        { role: 'user', content: evaluationPrompt },
      ],
      temperature: 0, // Set temperature to 0 for deterministic output
    });

    const content = completion.choices[0].message.content?.trim();

    // Validate JSON format
    if (!content || !content.startsWith('{') || !content.endsWith('}')) {
      console.error('Teacher evaluation did not return a valid JSON object.');
      console.error(`Response content: ${content}`);
      return null;
    }

    try {
      const evaluation: { [key: string]: { score: number; explanation: string } } = JSON.parse(content);

      // Ensure all required factors are present
      const requiredFactors = [
        'Accuracy',
        'Hallucination',
        'Groundedness',
        'Relevance',
        'Recall',
        'Precision',
        'Consistency',
        'BiasDetection',
      ];

      for (const factor of requiredFactors) {
        if (!(factor in evaluation)) {
          console.error(`Missing factor in evaluation: ${factor}`);
          return null;
        }
      }

      const evaluationEndTime = Date.now(); // End time for this evaluation
      const evaluationLatency = evaluationEndTime - evaluationStartTime; // Latency in milliseconds

      return {
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
        latency: evaluationLatency,
      };
    } catch (e) {
      console.error(`Error decoding evaluation response: ${e}`);
      console.error(`Response content: ${content}`);
      return null;
    }
  } catch (error) {
    console.error(`Error in teacher evaluation: ${error}`);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { testData, username, modelName } = await req.json();

    if (!Array.isArray(testData)) {
      console.error('Invalid data format. Expected an array.');
      return NextResponse.json(
        { error: 'Invalid data format. Expected an array of prompt, context, and response objects.' },
        { status: 400 }
      );
    }

    const evaluationPromises = testData.map(async (entry) => {
      const { prompt, context, response } = entry;

      if (!prompt || !context || !response) {
        return {
          username,
          modelName,
          prompt: prompt || 'N/A',
          context: context || 'N/A',
          response: response || 'N/A',
          factors: {
            Accuracy: { score: 0, explanation: 'Missing prompt, context, or response.' },
            Hallucination: { score: 0, explanation: 'Missing prompt, context, or response.' },
            Groundedness: { score: 0, explanation: 'Missing prompt, context, or response.' },
            Relevance: { score: 0, explanation: 'Missing prompt, context, or response.' },
            Recall: { score: 0, explanation: 'Missing prompt, context, or response.' },
            Precision: { score: 0, explanation: 'Missing prompt, context, or response.' },
            Consistency: { score: 0, explanation: 'Missing prompt, context, or response.' },
            BiasDetection: { score: 0, explanation: 'Missing prompt, context, or response.' },
          },
          evaluatedAt: new Date(),
          latency: 0,
        };
      }

      const result = await evaluateResponse(prompt, context, response, username, modelName);
      return result || {
        username,
        modelName,
        prompt,
        context,
        response,
        factors: {
          Accuracy: { score: 0, explanation: 'Evaluation failed.' },
          Hallucination: { score: 0, explanation: 'Evaluation failed.' },
          Groundedness: { score: 0, explanation: 'Evaluation failed.' },
          Relevance: { score: 0, explanation: 'Evaluation failed.' },
          Recall: { score: 0, explanation: 'Evaluation failed.' },
          Precision: { score: 0, explanation: 'Evaluation failed.' },
          Consistency: { score: 0, explanation: 'Evaluation failed.' },
          BiasDetection: { score: 0, explanation: 'Evaluation failed.' },
        },
        evaluatedAt: new Date(),
        latency: 0,
      };
    });

    const results = await Promise.all(evaluationPromises);

    // Save evaluation results to MongoDB
    const db = await connectToDatabase();
    await db.collection('evaluation_results').insertMany(results);

    // Return the response in the expected format
    return NextResponse.json({ 
      success: true, 
      result: results[0] // Return the first result as the client expects a single result
    }, { status: 200 });
  } catch (error) {
    console.error('Error in POST function:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process the evaluation request.' },
      { status: 500 }
    );
  }
}
