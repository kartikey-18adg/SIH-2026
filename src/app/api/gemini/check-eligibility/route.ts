import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const guidance = `You evaluate MPLADS work descriptions against the MoSPI MPLADS Guidelines (2023) and eSAKSHI workflow. Durable public/community assets are generally eligible when recommended by an MP and executed by the designated IDA. Private property repairs, individual-benefit works, commercial ventures, religious works, grants, revenue expenditure, and recurring operating costs are generally non-permissible or restricted. Flag recommendations pending beyond 45 days for District Authority sanction and execution beyond one year unless documented justification is present. This is an operational screening aid, not a legal determination.`;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 503 });
  try {
    const body = await request.json();
    const workDescription = typeof body.workDescription === 'string' ? body.workDescription.trim() : '';
    if (!workDescription) return NextResponse.json({ error: 'workDescription is required.' }, { status: 400 });
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      systemInstruction: guidance,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            eligible: { type: SchemaType.BOOLEAN },
            confidence: { type: SchemaType.NUMBER },
            flags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            reasoning: { type: SchemaType.STRING },
            requiredEvidence: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
          required: ['eligible', 'confidence', 'flags', 'reasoning', 'requiredEvidence'],
        },
      },
    });
    const response = await model.generateContent(`Evaluate this work and return only the requested JSON:\n${JSON.stringify({ workDescription, record: body.record || null })}`);
    return NextResponse.json(JSON.parse(response.response.text()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Eligibility evaluation failed.' }, { status: 502 });
  }
}
