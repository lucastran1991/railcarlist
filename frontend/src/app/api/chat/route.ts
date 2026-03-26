import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createGroq } from '@ai-sdk/groq';
import { streamText } from 'ai';
import { readFileSync } from 'fs';
import { join } from 'path';

const API = process.env.BACKEND_URL || 'http://localhost:8888';

function loadAssistantConfig() {
  try {
    const cfgPath = join(process.cwd(), '..', 'system.cfg.json');
    return JSON.parse(readFileSync(cfgPath, 'utf-8')).assistant ?? {};
  } catch {
    try {
      const cfgPath = join(process.cwd(), 'public', 'system.cfg.json');
      return JSON.parse(readFileSync(cfgPath, 'utf-8')).assistant ?? {};
    } catch {
      return {};
    }
  }
}

function getModel() {
  const cfg = loadAssistantConfig();
  const provider = cfg.provider || 'google';
  const modelName = cfg.model || 'gemini-2.0-flash';

  if (cfg.api_key && cfg.api_key !== 'DEFAULT' && cfg.api_key !== '') {
    if (provider === 'google' && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = cfg.api_key;
    } else if ((provider === 'anthropic' || provider === 'claude') && !process.env.ANTHROPIC_API_KEY) {
      process.env.ANTHROPIC_API_KEY = cfg.api_key;
    }
  }

  if (provider === 'anthropic' || provider === 'claude') {
    return anthropic(modelName || 'claude-sonnet-4-20250514');
  }
  if (provider === 'ollama') {
    const baseURL = cfg.base_url || 'http://localhost:11434/v1';
    const ollama = createOpenAICompatible({ name: 'ollama', baseURL, apiKey: 'ollama' });
    return ollama(modelName || 'qwen3:4b');
  }
  if (provider === 'groq') {
    if (!process.env.GROQ_API_KEY) {
      process.env.GROQ_API_KEY = cfg.api_key || '';
    }
    const groq = createGroq();
    return groq(modelName || 'llama-3.1-8b-instant');
  }
  return google(modelName);
}

// Cache server-side auth token for backend calls
let _serverToken: string | null = null;
let _serverTokenExp = 0;

async function getServerToken(): Promise<string | null> {
  if (_serverToken && Date.now() < _serverTokenExp) return _serverToken;
  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Password@876' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    _serverToken = data.access_token;
    _serverTokenExp = Date.now() + 23 * 60 * 60 * 1000; // 23h
    return _serverToken;
  } catch {
    return null;
  }
}

async function fetchJSON(path: string, terminalId: string): Promise<unknown> {
  try {
    const token = await getServerToken();
    const headers: Record<string, string> = { 'X-Terminal-Id': terminalId };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API}${path}`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function buildDataContext(terminalId: string): Promise<string> {
  // Fetch all key data in parallel using server-side auth
  const f = (path: string) => fetchJSON(path, terminalId);
  const [
    electricityKpis,
    steamKpis,
    boilerKpis,
    tankKpis,
    substationKpis,
    tankLevels,
    alertKpis,
    alerts,
    boilerReadings,
  ] = await Promise.all([
    f('/api/electricity/kpis'),
    f('/api/steam/kpis'),
    f('/api/boiler/kpis'),
    f('/api/tank/kpis'),
    f('/api/substation/kpis'),
    f('/api/tank/levels'),
    f('/api/alerts/kpis'),
    f('/api/alerts?page=1&limit=5'),
    f('/api/boiler/readings'),
  ]);

  const sections: string[] = [];

  if (electricityKpis) sections.push(`## Electricity KPIs\n${JSON.stringify(electricityKpis)}`);
  if (steamKpis) sections.push(`## Steam KPIs\n${JSON.stringify(steamKpis)}`);
  if (boilerKpis) sections.push(`## Boiler KPIs\n${JSON.stringify(boilerKpis)}`);
  if (tankKpis) sections.push(`## Tank KPIs\n${JSON.stringify(tankKpis)}`);
  if (substationKpis) sections.push(`## SubStation KPIs\n${JSON.stringify(substationKpis)}`);
  if (boilerReadings) sections.push(`## Boiler Readings\n${JSON.stringify(boilerReadings)}`);
  if (alertKpis) sections.push(`## Alert Summary\n${JSON.stringify(alertKpis)}`);
  if (alerts) sections.push(`## Recent Alerts (latest 5)\n${JSON.stringify(alerts)}`);

  // Tank levels — summarize top/bottom to keep prompt compact
  if (tankLevels && Array.isArray(tankLevels)) {
    const sorted = [...tankLevels].sort((a: any, b: any) => b.level - a.level);
    const top5 = sorted.slice(0, 5).map((t: any) => `${t.tank}: ${t.level}% ${t.product} (${t.volume}/${t.capacity} bbl, status: ${t.status})`);
    const bottom5 = sorted.slice(-5).map((t: any) => `${t.tank}: ${t.level}% ${t.product} (${t.volume}/${t.capacity} bbl, status: ${t.status})`);
    const statusCounts: Record<string, number> = {};
    const productCounts: Record<string, number> = {};
    let totalVolume = 0, totalCapacity = 0, totalLevel = 0;
    tankLevels.forEach((t: any) => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      productCounts[t.product] = (productCounts[t.product] || 0) + 1;
      totalVolume += t.volume || 0;
      totalCapacity += t.capacity || 0;
      totalLevel += t.level || 0;
    });
    const avgLevel = (totalLevel / tankLevels.length).toFixed(1);
    sections.push(`## Tank Levels (${tankLevels.length} tanks)\nAggregate: avg level ${avgLevel}%, total volume ${Math.round(totalVolume).toLocaleString()} bbl, total capacity ${Math.round(totalCapacity).toLocaleString()} bbl, utilization ${(totalVolume/totalCapacity*100).toFixed(1)}%\nProducts: ${JSON.stringify(productCounts)}\nStatus: ${JSON.stringify(statusCounts)}\nTop 5 highest:\n${top5.join('\n')}\nBottom 5 lowest:\n${bottom5.join('\n')}`);
  }

  return sections.join('\n\n');
}

const BASE_PROMPT = `You are an AI assistant for Vopak Terminal — an industrial petroleum/chemical storage terminal.
You have access to real-time operational data provided below. Use this data to answer questions accurately.

Domains:
- Electricity: load, consumption, power factor, peak demand, cost
- Steam: supply/demand, header pressure, condensate recovery
- Boiler: fleet status (4 boilers), efficiency, emissions
- Tank: storage tanks with levels, products, throughput
- SubStation: voltage, transformers, harmonics, faults
- Alerts: system alerts with severity levels

Rules:
- Use the data below to answer — it is current and real-time
- Be concise. Use numbers with units.
- Format comparisons in tables when appropriate
- When asked about tanks, show tank ID, product, level %, and volume
- Respond in the same language the user uses
- If data for a specific question is not in the context below, say so clearly`;

// Sanitize messages — strip reasoning parts that Ollama can't handle
// AI SDK v6 sends assistant messages as parts[] with reasoning/step-start/text
// Ollama expects simple { role, content } format
function sanitizeMessages(msgs: any[]): any[] {
  return msgs.map((msg) => {
    if (msg.role === 'assistant' && msg.parts) {
      // Extract only text parts, ignore reasoning/step-start
      const textParts = msg.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
      return { role: 'assistant', content: textParts || '(no response)' };
    }
    return msg;
  });
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const terminalId = req.headers.get('X-Terminal-Id') || 'savannah';

  // Pre-fetch all data using server-side auth
  const dataContext = await buildDataContext(terminalId);
  const systemPrompt = `${BASE_PROMPT}\n\n# Current Terminal Data (${terminalId})\n\n${dataContext}`;

  const result = streamText({
    model: getModel(),
    system: systemPrompt,
    messages: sanitizeMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
