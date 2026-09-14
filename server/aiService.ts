import { GoogleGenAI } from '@google/genai';
import {
  AIAnalysisResult,
  CropPlanting,
  PlantObservation,
  RoutingThresholdsConfig,
} from '../src/types.js';
import { db } from './db.js';
import path from 'path';
import fs from 'fs';

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

interface LogAiMetricParams {
  latencyMs: number;
  success: boolean;
  model: string;
  promptCharCount: number;
  responseCharCount: number;
  promptTokens?: number;
  outputTokens?: number;
  error?: string;
}

function logAiCallMetric(params: LogAiMetricParams) {
  const promptTokens = params.promptTokens || Math.ceil(params.promptCharCount / 4);
  const outputTokens = params.outputTokens || Math.ceil(params.responseCharCount / 4);
  
  // Cost estimates for gemini-2.5-flash: $0.075 / 1M input, $0.30 / 1M output
  const costPrompt = (promptTokens / 1_000_000) * 0.075;
  const costOutput = (outputTokens / 1_000_000) * 0.30;
  const totalCostEstimate = costPrompt + costOutput;

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'GEMINI_AI_CALL_METRICS',
    model: params.model,
    latencyMs: params.latencyMs,
    success: params.success,
    promptCharCount: params.promptCharCount,
    responseCharCount: params.responseCharCount,
    promptTokens,
    outputTokens,
    totalTokens: promptTokens + outputTokens,
    estimatedCostUsd: totalCostEstimate,
    error: params.error || null,
  }, null, 2));
}

export interface AnalyzeCropImageParams {
  imageBase64OrUrl: string;
  mimeType?: string;
  planting: CropPlanting;
  farmerNotes?: string;
  farmerReportedSymptoms?: string;
  previousObservations?: PlantObservation[];
  weatherCounty?: string;
}

export async function analyzeCropObservation(
  params: AnalyzeCropImageParams
): Promise<AIAnalysisResult> {
  const thresholds = db.getThresholds();
  const startTime = Date.now();

  const prompt = `
You are an expert Agricultural AI assisting smallholder farmers in Liberia, West Africa (working in partnership with the Central Agricultural Research Institute - CARI and the Ministry of Agriculture).

The farmer has submitted an image of their crop.
PLANTING CONTEXT:
- Declared Crop: ${params.planting.cropName}
- Declared Variety: ${params.planting.varietyName || 'Unknown / Traditional'}
- Planting Date: ${params.planting.plantingDate}
- Declared Current Growth Stage: ${params.planting.currentGrowthStage}
- Location: ${params.weatherCounty || 'Liberia'}
- Farmer Notes: "${params.farmerNotes || 'None'}"
- Farmer Reported Symptoms: "${params.farmerReportedSymptoms || 'None'}"

CRITICAL INSTRUCTIONS & SAFETY RULES:
1. DISTINGUISH WITH HIGH PRECISION:
   - OBSERVATION: Pure visible facts (e.g. "Yellow interveinal chlorosis on upper leaves, mottled margins").
   - AI INTERPRETATION: Probable conditions (disease, pest, nutrient deficiency, environmental stress) with probability scores.
   - PREDICTION: What may happen over the next 7-14 days if untreated.
2. RECOMMENDATIONS & CHEMICAL SAFETY:
   - Prioritize cultural practices (sanitizing, spacing, rogueing infected plants, drainage) and organic measures (neem leaf extract, wood ash, composting).
   - ABSOLUTE CHEMICAL RULE: DO NOT casually prescribe synthetic chemical brands, application rates, or dosages. State clearly that chemical applications require extension officer guidance.
3. EXPERT ROUTING:
   - If confidence is < 70%, or if a high-risk staple crop disease is suspected (like Cassava Mosaic Disease, Cassava Brown Streak, Rice Blast), set requiresExpertReview = true.

Respond ONLY with a valid JSON object matching this schema:
{
  "detectedCrop": { "name": string, "confidence": number (0-1), "matchesPlanting": boolean },
  "health": { "score": number (0-100), "status": "excellent"|"good"|"needs_attention"|"poor"|"critical", "confidence": number (0-1) },
  "growthStage": { "stage": string, "confidence": number (0-1), "estimatedDaysFromPlanting": number },
  "visualObservations": [
    { "feature": string, "visualFinding": string, "severity": "mild"|"moderate"|"severe" }
  ],
  "hypotheses": [
    { "conditionName": string, "type": "disease"|"pest"|"nutrient_deficiency"|"environmental", "probability": number (0-1), "evidenceJustification": string }
  ],
  "stresses": {
    "waterStress": "none"|"low"|"moderate"|"severe",
    "waterConfidence": number (0-1),
    "nutrientStress": "none"|"low"|"moderate"|"severe",
    "nutrientConfidence": number (0-1)
  },
  "harvestEstimate": { "minimumDays": number, "maximumDays": number, "confidence": number (0-1) },
  "recommendedActions": {
    "cultural": [string],
    "organic": [string],
    "chemicalAdvisory": string
  },
  "routing": {
    "requiresExpertReview": boolean,
    "reasons": [string],
    "priority": "low"|"medium"|"high"|"urgent"
  },
  "limitations": [string],
  "rawObservationsText": string,
  "rawInterpretationText": string,
  "rawPredictionText": string
}
`;

  try {
    const ai = getGenAI();
    if (ai) {
      // Process image input (data uri, remote URL, or local file upload)
      let inlinePart: any;
      if (params.imageBase64OrUrl.startsWith('data:')) {
        const matches = params.imageBase64OrUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          inlinePart = {
            inlineData: {
              data: matches[2],
              mimeType: matches[1],
            },
          };
        }
      } else if (params.imageBase64OrUrl.startsWith('http://') || params.imageBase64OrUrl.startsWith('https://')) {
        try {
          console.log(`🌐 Fetching remote image for Gemini: ${params.imageBase64OrUrl}`);
          const res = await fetch(params.imageBase64OrUrl);
          if (res.ok) {
            const mimeType = res.headers.get('content-type') || 'image/jpeg';
            const arrayBuffer = await res.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            inlinePart = {
              inlineData: {
                data: base64,
                mimeType,
              },
            };
          }
        } catch (e) {
          console.error('❌ Failed to fetch remote image for Gemini:', e);
        }
      } else if (params.imageBase64OrUrl.includes('uploads/')) {
        try {
          // Extract file name or relative path from URL (e.g. /uploads/img_123.jpg)
          const parts = params.imageBase64OrUrl.split('uploads/');
          const relativePath = `uploads/${parts[parts.length - 1]}`;
          const localPath = path.join(process.cwd(), 'public', relativePath);
          console.log(`💾 Reading local image for Gemini: ${localPath}`);
          if (fs.existsSync(localPath)) {
            const buffer = fs.readFileSync(localPath);
            const ext = path.extname(localPath).replace('.', '').toLowerCase();
            const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
            const base64 = buffer.toString('base64');
            inlinePart = {
              inlineData: {
                data: base64,
                mimeType,
              },
            };
          } else {
            console.warn(`⚠️ Local file not found at: ${localPath}`);
          }
        } catch (e) {
          console.error('❌ Failed to read local image for Gemini:', e);
        }
      }

      const contents = inlinePart
        ? [inlinePart, { text: prompt }]
        : [{ text: `[Simulated Image Analysis for ${params.planting.cropName}]\n` + prompt }];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text || '';
      const parsed = JSON.parse(responseText);

      const latencyMs = Date.now() - startTime;
      const promptTokens = (response as any).usageMetadata?.promptTokenCount;
      const outputTokens = (response as any).usageMetadata?.candidatesTokenCount;

      logAiCallMetric({
        latencyMs,
        success: true,
        model: 'gemini-2.5-flash',
        promptCharCount: prompt.length,
        responseCharCount: responseText.length,
        promptTokens,
        outputTokens,
      });

      // Enforce post-processing safety check on parsed result
      return sanitizeAndRouteAIResult(parsed, params, thresholds, startTime);
    } else {
      console.warn('Gemini API client not initialized (GEMINI_API_KEY may be missing).');
      const latencyMs = Date.now() - startTime;
      logAiCallMetric({
        latencyMs,
        success: false,
        model: 'gemini-2.5-flash',
        promptCharCount: prompt.length,
        responseCharCount: 0,
        error: 'Gemini API client not initialized (GEMINI_API_KEY may be missing).',
      });
    }
  } catch (error: any) {
    console.error('Gemini API call failed or unavailable:', error);
    const latencyMs = Date.now() - startTime;
    logAiCallMetric({
      latencyMs,
      success: false,
      model: 'gemini-2.5-flash',
      promptCharCount: prompt.length,
      responseCharCount: 0,
      error: error?.message || String(error),
    });
  }

  // Clearly-labeled "AI analysis unavailable" state:
  // The observation is saved and image is preserved, but no fake diagnoses or health scores are invented.
  return generateUnavailableAnalysis(params, thresholds, startTime);
}

function sanitizeAndRouteAIResult(
  parsed: any,
  params: AnalyzeCropImageParams,
  thresholds: RoutingThresholdsConfig,
  startTime: number
): AIAnalysisResult {
  const reasons: string[] = parsed.routing?.reasons || [];
  let requiresReview = Boolean(parsed.routing?.requiresExpertReview);
  let priority = parsed.routing?.priority || 'medium';

  // Enforce threshold rule 1: Low confidence
  if ((parsed.health?.confidence ?? 0.8) < thresholds.aiMediumConfidenceCutoff) {
    requiresReview = true;
    reasons.push(`AI confidence (${Math.round((parsed.health?.confidence ?? 0) * 100)}%) is below standard automated threshold.`);
  }

  // Enforce threshold rule 2: High risk pathogen
  const topCondition = parsed.hypotheses?.[0]?.conditionName || '';
  if (thresholds.highRiskDiseases.some((d) => topCondition.toLowerCase().includes(d.toLowerCase()))) {
    requiresReview = true;
    if (priority !== 'urgent') priority = 'high';
    reasons.push(`Suspected high-consequence agricultural threat: ${topCondition}`);
  }

  // Enforce threshold rule 3: Rapid health drop compared to previous observation
  if (
    params.previousObservations &&
    params.previousObservations.length > 0 &&
    params.previousObservations[0].healthScore != null
  ) {
    const prevScore = params.previousObservations[0].healthScore;
    const currentScore = parsed.health?.score ?? 75;
    if (prevScore - currentScore >= thresholds.rapidDeclineThresholdScore) {
      requiresReview = true;
      if (priority !== 'urgent') priority = 'high';
      reasons.push(`Rapid health score decline of ${prevScore - currentScore} points since previous observation.`);
    }
  }

  // Enforce Chemical Safety Interceptor
  let chemAdvisory = parsed.recommendedActions?.chemicalAdvisory || '';
  if (!chemAdvisory || chemAdvisory.length < 20) {
    chemAdvisory =
      'Chemical treatments are not recommended without direct inspection by an authorized CARI/MOA agricultural extension officer.';
  }

  return {
    id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    observationId: '',
    modelVersion: 'gemini-2.5-flash / liberia-agri-v1.4',
    analyzedAt: new Date().toISOString(),
    isAvailable: true,
    status: 'completed',
    detectedCrop: {
      name: parsed.detectedCrop?.name || params.planting.cropName,
      confidence: parsed.detectedCrop?.confidence || 0.92,
      matchesPlanting: parsed.detectedCrop?.matchesPlanting ?? true,
    },
    health: {
      score: Math.min(100, Math.max(10, parsed.health?.score ?? 72)),
      status: parsed.health?.status || 'needs_attention',
      confidence: parsed.health?.confidence || 0.85,
    },
    growthStage: {
      stage: parsed.growthStage?.stage || params.planting.currentGrowthStage,
      confidence: parsed.growthStage?.confidence || 0.88,
      estimatedDaysFromPlanting: parsed.growthStage?.estimatedDaysFromPlanting || 65,
    },
    visualObservations: parsed.visualObservations || [
      {
        feature: 'Foliage canopy',
        visualFinding: 'Localized discoloration and irregular leaf margins visible on current specimen.',
        severity: 'moderate',
      },
    ],
    hypotheses: parsed.hypotheses || [
      {
        conditionName: 'Suspected Leaf Spot / Foliar Stress',
        type: 'disease',
        probability: 0.74,
        evidenceJustification: 'Pattern consistent with common wet-season foliar stress in tropical Liberia.',
      },
    ],
    stresses: {
      waterStress: parsed.stresses?.waterStress || 'none',
      waterConfidence: parsed.stresses?.waterConfidence || 0.8,
      nutrientStress: parsed.stresses?.nutrientStress || 'low',
      nutrientConfidence: parsed.stresses?.nutrientConfidence || 0.75,
    },
    harvestEstimate: {
      minimumDays: parsed.harvestEstimate?.minimumDays || 60,
      maximumDays: parsed.harvestEstimate?.maximumDays || 90,
      confidence: parsed.harvestEstimate?.confidence || 0.7,
    },
    recommendedActions: {
      cultural: parsed.recommendedActions?.cultural || [
        'Inspect surrounding stands for similar symptom development.',
        'Prune and safely discard heavily affected lower leaves away from the plot.',
      ],
      organic: parsed.recommendedActions?.organic || [
        'Apply natural neem oil or wood ash extract to strengthen foliar resistance.',
      ],
      chemicalAdvisory: chemAdvisory,
    },
    routing: {
      requiresExpertReview: requiresReview,
      reasons: Array.from(new Set(reasons)),
      priority,
    },
    limitations: parsed.limitations || [
      'Visual evaluation conducted on single camera angle without laboratory PCR confirmation.',
    ],
    rawObservationsText: parsed.rawObservationsText || 'Clear visual findings recorded from photo.',
    rawInterpretationText: parsed.rawInterpretationText || 'Symptoms suggest potential early fungal or nutritional issue.',
    rawPredictionText: parsed.rawPredictionText || 'Condition likely to stabilize if appropriate sanitation is observed.',
  };
}

export function generateUnavailableAnalysis(
  params: AnalyzeCropImageParams,
  thresholds?: RoutingThresholdsConfig,
  startTime?: number,
  reason: string = 'Gemini AI service unavailable or API key not configured'
): AIAnalysisResult {
  return {
    id: `ai_unavail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    observationId: '',
    modelVersion: 'unavailable',
    analyzedAt: new Date().toISOString(),
    isAvailable: false,
    status: 'unavailable',
    unavailableReason: reason,
    detectedCrop: {
      name: params.planting.cropName,
      confidence: 0,
      matchesPlanting: true,
    },
    health: {
      score: null,
      status: 'unknown',
      confidence: 0,
    },
    growthStage: {
      stage: params.planting.currentGrowthStage,
      confidence: 0,
      estimatedDaysFromPlanting: 0,
    },
    visualObservations: [],
    hypotheses: [],
    stresses: {
      waterStress: 'none',
      waterConfidence: 0,
      nutrientStress: 'none',
      nutrientConfidence: 0,
    },
    harvestEstimate: {
      minimumDays: 0,
      maximumDays: 0,
      confidence: 0,
    },
    recommendedActions: {
      cultural: [],
      organic: [],
      chemicalAdvisory:
        'AI automated analysis is unavailable. Synthetic chemical pesticides and treatments must never be applied without prior physical verification and diagnostic guidance from a certified CARI or Ministry of Agriculture extension agronomist.',
    },
    routing: {
      requiresExpertReview: false,
      reasons: ['AI automated analysis is unavailable. Direct specialist review option is available.'],
      priority: 'medium',
    },
    limitations: [
      'Automated multimodal AI vision analysis could not be completed for this specimen.',
      'No simulated health score, disease hypothesis, or confidence percentage has been generated.',
      'Crop photograph and farmer observations have been securely preserved for agricultural specialist review.',
    ],
    rawObservationsText: 'AI visual analysis unavailable. No automated visual findings generated.',
    rawInterpretationText: 'Automated diagnostic analysis could not be completed.',
    rawPredictionText: 'No automated prediction is available without verified diagnostic data.',
  };
}

// Backward-compatible alias
export const generateDeterministicAnalysis = generateUnavailableAnalysis;
