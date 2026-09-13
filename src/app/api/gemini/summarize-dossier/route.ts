import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 503 });
  try {
    const body = await request.json();
    if (!body.record || typeof body.record !== 'object') return NextResponse.json({ error: 'A dossier record is required.' }, { status: 400 });
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      systemInstruction: 'You are LOKNIDHI AI Copilot preparing an executive MPLADS audit briefing. Use only the supplied record. Explain fraud or compliance risks, baseline cost variances, SLA concerns, and recommended next steps. Return concise bullets and do not invent facts.',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            headline: { type: SchemaType.STRING },
            bullets: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            recommendedActions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
          required: ['headline', 'bullets', 'recommendedActions'],
        },
      },
    });
    const response = await model.generateContent(`Summarize this dossier as JSON:\n${JSON.stringify(body.record)}`);
    return NextResponse.json(JSON.parse(response.response.text()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Dossier summarization failed.' }, { status: 502 });
  }
}
