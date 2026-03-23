// @ts-nocheck — AI SDK v6 tool() type inference issue with zod schemas
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, stepCountIs } from 'ai';
import { z } from 'zod';
import { tool } from 'ai';
import { readFileSync } from 'fs';
import { join } from 'path';

const API = process.env.BACKEND_URL || 'http://localhost:8888';

// Load assistant config from system.cfg.json
function loadAssistantConfig() {
  try {
    const cfgPath = join(process.cwd(), '..', 'system.cfg.json');
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
    return cfg.assistant ?? {};
  } catch {
    try {
      const cfgPath = join(process.cwd(), 'public', 'system.cfg.json');
      const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
      return cfg.assistant ?? {};
    } catch {
      return {};
    }
  }
}

function getModel() {
  const cfg = loadAssistantConfig();
  const provider = cfg.provider || 'google';
  const modelName = cfg.model || 'gemini-2.0-flash';

  // Set API key from config if not already in env
  if (cfg.api_key && cfg.api_key !== 'DEFAULT') {
    if (provider === 'google' && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = cfg.api_key;
    } else if ((provider === 'anthropic' || provider === 'claude') && !process.env.ANTHROPIC_API_KEY) {
      process.env.ANTHROPIC_API_KEY = cfg.api_key;
    }
  }

  if (provider === 'anthropic' || provider === 'claude') {
    return anthropic(modelName || 'claude-sonnet-4-20250514');
  }
  return google(modelName);
}

async function fetchBackend(path: string): Promise<unknown> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`Backend ${res.status}: ${path}`);
  return res.json();
}

const SYSTEM_PROMPT = `You are an AI assistant for Vopak Terminal — an industrial petroleum/chemical storage terminal.
You have access to real-time operational data across 5 domains:
- **Electricity**: load profiles, consumption, power factor, peak demand, phase balance, cost
- **Steam**: supply/demand balance, header pressure (HP/MP/LP), condensate recovery, fuel ratio
- **Boiler**: fleet status (4 boilers), efficiency, combustion, emissions, stack temperature
- **Tank**: 59 storage tanks (Crude Oil, Diesel, Gasoline, Ethanol, LPG), levels, throughput, inventory
- **Sub Station**: voltage profiles, transformer loading/temp, harmonics, feeder distribution, faults
- **Alerts**: system alerts with severity (critical/warning/info/resolved)

Rules:
- Always call tools to get current data before answering — never guess or use stale info
- Be concise. Use numbers with units. Format comparisons in tables when appropriate.
- When asked about tanks, show tank ID, product, level %, and volume
- When asked about trends, mention the time period of the data
- Respond in the same language the user uses
- If data is unavailable, say so clearly`;

const domainEnum = z.enum(['electricity', 'steam', 'boiler', 'tank', 'substation']);
const aggregateEnum = z.enum(['daily', 'monthly', 'quarterly', 'yearly']).default('daily');

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    messages,
    stopWhen: stepCountIs(5),
    tools: {
      getDomainKpis: tool({
        description: 'Get KPI summary metrics for a domain.',
        parameters: z.object({ domain: domainEnum }),
        execute: async ({ domain }: { domain: string }) => fetchBackend(`/api/${domain}/kpis`),
      }),
      getTankLevels: tool({
        description: 'Get current levels, volumes, capacities, and products for all 59 storage tanks.',
        parameters: z.object({ _unused: z.string().optional() }),
        execute: async () => fetchBackend('/api/tank/levels'),
      }),
      getTankProductDistribution: tool({
        description: 'Get total volume stored by product type.',
        parameters: z.object({ _unused: z.string().optional() }),
        execute: async () => fetchBackend('/api/tank/product-distribution'),
      }),
      getAlerts: tool({
        description: 'Get system alerts sorted by most recent. Returns severity, title, description, source.',
        parameters: z.object({
          page: z.number().default(1),
          limit: z.number().default(10),
        }),
        execute: async ({ page, limit }: { page: number; limit: number }) =>
          fetchBackend(`/api/alerts?page=${page}&limit=${limit}`),
      }),
      getAlertKpis: tool({
        description: 'Get alert counts: total, critical, warning, info, resolved, unread.',
        parameters: z.object({ _unused: z.string().optional() }),
        execute: async () => fetchBackend('/api/alerts/kpis'),
      }),
      getBoilerReadings: tool({
        description: 'Get current readings for all boilers: efficiency, load %, steam output.',
        parameters: z.object({ _unused: z.string().optional() }),
        execute: async () => fetchBackend('/api/boiler/readings'),
      }),
      getBoilerEmissions: tool({
        description: 'Get current emission levels (CO, NOx, SOx) vs regulatory limits.',
        parameters: z.object({ _unused: z.string().optional() }),
        execute: async () => fetchBackend('/api/boiler/emissions'),
      }),
      getSubStationTransformers: tool({
        description: 'Get transformer loading, capacity, and temperature data.',
        parameters: z.object({ _unused: z.string().optional() }),
        execute: async () => fetchBackend('/api/substation/transformers'),
      }),
      getChartData: tool({
        description: 'Get historical chart data for any domain. Charts: electricity(load-profiles,weekly-consumption,power-factor,cost-breakdown,peak-demand,phase-balance), steam(balance,header-pressure,distribution,condensate,fuel-ratio,loss), boiler(efficiency-trend,steam-fuel,stack-temp,combustion), tank(inventory-trend,throughput,level-changes,temperatures), substation(voltage-profile,transformer-temp,feeder-distribution,harmonics,fault-events)',
        parameters: z.object({
          domain: domainEnum,
          chart: z.string().describe('Chart slug'),
          start: z.string().optional(),
          end: z.string().optional(),
          aggregate: aggregateEnum,
          limit: z.number().default(30),
        }),
        execute: async ({ domain, chart, start, end, aggregate, limit }: {
          domain: string; chart: string; start?: string; end?: string; aggregate: string; limit: number;
        }) => {
          const params = new URLSearchParams({ aggregate, limit: String(limit) });
          if (start) params.set('start', start);
          if (end) params.set('end', end);
          return fetchBackend(`/api/${domain}/${chart}?${params}`);
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
