import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const guidelineContext = `MoSPI MPLADS/eSAKSHI reference context:
- MPLADS funds are for durable community assets and public utility works serving the local population.
- Works are recommended by an MP and executed by the designated Implementing District Authority (IDA).
- Private or individual-benefit works, religious buildings, grants, revenue expenditure, and recurring operating costs are generally restricted or ineligible.
- The IDA verifies feasibility, prepares estimates, obtains sanctions, executes the work, performs quality/completion checks, and maintains evidence.
- eSAKSHI records should be supported by sanction, expenditure, inspection, and completion documentation.
- A District Authority should process the MP-recommended work within the applicable 45-day sanction window, and execution should not exceed the applicable one-year timeline without documented justification.
This is an operational reference, not legal advice. Do not invent clause numbers or claim a live database lookup.`;

const tools: Tool[] = [{
  functionDeclarations: [{
    name: 'apply_dashboard_filters',
    description: 'Apply filters to the audit dashboard when the auditor asks to show, find, list, or filter works.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        activeFilter: { type: SchemaType.STRING, description: 'Location, state, constituency, or agency text to scope the dashboard. Use empty string when none.' },
        riskGrade: { type: SchemaType.STRING, format: 'enum', enum: ['ALL', 'HIGH', 'MEDIUM', 'LOW'] },
        anomalyType: { type: SchemaType.STRING, format: 'enum', enum: ['ALL', 'DUPLICATE_WORK', 'COST_INFLATION', 'EXECUTION_DELAY', 'SPLIT_BILL_EVASION', 'DISCREPANCY_OVERRUN'] },
      },
      required: ['activeFilter', 'riskGrade', 'anomalyType'],
    },
  }],
}];

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 503 });

  try {
    const body = await request.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) return NextResponse.json({ error: 'A prompt is required.' }, { status: 400 });
    const recordContext = body.record ? JSON.stringify(body.record) : 'No dossier selected.';
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      systemInstruction: `You are LOKNIDHI AI Copilot for an MPLADS audit workstation. Be concise, evidence-led, and transparent about uncertainty. Use bullet points for dossier summaries. For filter commands, call apply_dashboard_filters and do not merely describe the filters.\n\n${guidelineContext}`,
      tools,
    });
    const response = await model.generateContent(`User request:\n${prompt}\n\nSelected dossier data (source data only):\n${recordContext}`);
    const candidate = response.response.candidates?.[0];
    const functionCall = candidate?.content?.parts?.find((part) => part.functionCall)?.functionCall;
    const text = candidate?.content?.parts?.map((part) => part.text || '').join('').trim() || 'Request analyzed.';
    return NextResponse.json({ text, action: functionCall ? { name: functionCall.name, args: functionCall.args } : null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gemini request failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
