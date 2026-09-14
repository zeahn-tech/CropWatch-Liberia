/**
 * Domain types for CropWatch Liberia
 * AI & Human-in-the-Loop Agricultural Decision Platform
 */

export type UserRole = 'farmer' | 'expert' | 'senior_expert' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
  county: string; // Liberia's 15 counties (e.g. Montserrado, Nimba, Bong, Lofa, Margibi)
  organization?: string;
  createdAt: string;
  passwordHash?: string; // bcrypt hash, never stored or returned in plaintext
  supabaseId?: string; // Supabase Auth UID if authenticated via Supabase
}

export interface Farm {
  id: string;
  userId: string;
  name: string;
  county: string;
  district: string;
  sizeHectares: number;
  soilType: string;
  irrigationSource: string;
  createdAt: string;
}

export interface Field {
  id: string;
  farmId: string;
  name: string;
  areaHectares: number;
  topography: string;
  createdAt: string;
}

export interface CropCatalogItem {
  id: string;
  name: string; // e.g. Cassava, Upland Rice, Lowland Rice, Okra, Hot Pepper, Oil Palm, Rubber
  scientificName: string;
  growthDurationDaysMin: number;
  growthDurationDaysMax: number;
  icon: string;
  category: 'staple_root' | 'staple_cereal' | 'vegetable' | 'perennial_cash';
}

export interface CropVariety {
  id: string;
  cropId: string;
  varietyName: string; // e.g., CARICASS-1, CARICASS-2, Suakoko 8, Nerica L-19
  durationDays: number;
  yieldPotential: string;
  characteristics: string;
}

export interface CropPlanting {
  id: string;
  fieldId: string;
  farmId: string;
  cropId: string;
  cropName: string;
  varietyId?: string;
  varietyName?: string;
  plantingDate: string; // YYYY-MM-DD
  expectedHarvestStart: string;
  expectedHarvestEnd: string;
  status: 'active' | 'harvested' | 'lost';
  currentGrowthStage: string;
  latestHealthScore?: number | null;
  latestStatus?: 'excellent' | 'good' | 'needs_attention' | 'poor' | 'critical' | 'unknown';
  observationCount: number;
  createdAt: string;
}

export interface ObservationImage {
  id: string;
  observationId: string;
  imageUrl: string; // Data URL or storage path
  capturedAt: string;
  qualityScore: number; // 0.0 - 1.0
  isPrimary: boolean;
}

export interface AIVisualSymptom {
  feature: string; // e.g., 'Lower leaves', 'Stem', 'Young shoots'
  visualFinding: string; // e.g., 'Yellow mosaic mottling with leaf curling'
  severity: 'mild' | 'moderate' | 'severe';
}

export interface AIHypothesis {
  conditionName: string; // e.g., 'Cassava Mosaic Disease (CMD)'
  type: 'disease' | 'pest' | 'nutrient_deficiency' | 'environmental';
  probability: number; // 0.0 to 1.0
  evidenceJustification: string;
}

export interface AIAnalysisResult {
  id: string;
  observationId: string;
  modelVersion: string; // e.g., 'gemini-2.5-flash / liberia-agri-v1' or 'unavailable'
  analyzedAt: string;
  isAvailable?: boolean; // false when AI analysis is unavailable
  status?: 'completed' | 'unavailable';
  unavailableReason?: string;
  detectedCrop: {
    name: string;
    confidence: number;
    matchesPlanting: boolean;
  };
  health: {
    score: number | null; // 0-100 or null when unavailable
    status: 'excellent' | 'good' | 'needs_attention' | 'poor' | 'critical' | 'unknown';
    confidence: number; // 0.0 to 1.0
  };
  growthStage: {
    stage: string;
    confidence: number;
    estimatedDaysFromPlanting: number;
  };
  visualObservations: AIVisualSymptom[];
  hypotheses: AIHypothesis[];
  stresses: {
    waterStress: 'none' | 'low' | 'moderate' | 'severe';
    waterConfidence: number;
    nutrientStress: 'none' | 'low' | 'moderate' | 'severe';
    nutrientConfidence: number;
  };
  harvestEstimate: {
    minimumDays: number;
    maximumDays: number;
    confidence: number;
  };
  recommendedActions: {
    cultural: string[]; // Sanitization, rogueing, spacing
    organic: string[];  // Neem extract, wood ash, composting
    chemicalAdvisory: string; // Strictly regulated disclaimer
  };
  routing: {
    requiresExpertReview: boolean;
    reasons: string[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
  };
  limitations: string[];
  rawObservationsText: string;
  rawInterpretationText: string;
  rawPredictionText: string;
}

export type CaseStatus = 
  | 'not_required'
  | 'requested'
  | 'queued'
  | 'assigned'
  | 'in_review'
  | 'waiting_for_farmer'
  | 'expert_reviewed'
  | 'escalated'
  | 'closed';

export type CasePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ExpertReviewCase {
  id: string;
  observationId: string;
  plantingId: string;
  farmId: string;
  farmerId: string;
  farmerName: string;
  farmerCounty: string;
  cropName: string;
  varietyName?: string;
  cropAgeDays: number;
  status: CaseStatus;
  priority: CasePriority;
  triggerType: 'low_confidence' | 'high_risk_disease' | 'chemical_advisory' | 'rapid_decline' | 'farmer_request' | 'novel_condition';
  triggerReason: string;
  assignedExpertId?: string;
  assignedExpertName?: string;
  assignedAt?: string;
  suggestedExpertId?: string;
  suggestedExpertName?: string;
  escalationLevel: number; // 1 = Expert, 2 = Senior Expert / CARI Lead
  createdAt: string;
  updatedAt: string;
  waitingForInfoMessage?: string;
}

export interface ExpertAssessment {
  id: string;
  caseId: string;
  observationId: string;
  expertId: string;
  expertName: string;
  expertOrganization: string;
  expertRole: string;
  version: number;
  isCurrent: boolean;
  cropConfirmed: boolean;
  correctedCropName?: string;
  verifiedCondition: string;
  decision: 'confirmed' | 'modified' | 'rejected' | 'insufficient_evidence';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  expertConfidence: 'high' | 'medium' | 'low';
  actionRecommendations: string;
  farmerExplanation: string;
  internalNotes?: string;
  additionalInfoRequested?: string;
  resolvesEscalation?: boolean;
  escalationResolutionNotes?: string;
  reviewedAt: string;
}

export interface PlantObservation {
  id: string;
  plantingId: string;
  farmerId: string;
  observedAt: string;
  notes?: string;
  farmerReportedSymptoms?: string;
  images: ObservationImage[];
  aiAnalysis?: AIAnalysisResult;
  expertReviewCase?: ExpertReviewCase;
  latestExpertAssessment?: ExpertAssessment;
  weatherSnapshot?: {
    tempC: number;
    humidity: number;
    rain24hMm: number;
    description: string;
  };
  healthScore: number | null;
  healthStatus: 'excellent' | 'good' | 'needs_attention' | 'poor' | 'critical' | 'unknown';
  isOfflineSynced?: boolean;
}

export interface ExpertProfile {
  userId: string;
  fullName: string;
  organization: string; // e.g. 'CARI Suakoko', 'Ministry of Agriculture', 'Cuttington Univ'
  qualification: string; // e.g. 'MSc Plant Pathology', 'BSc Agronomy'
  yearsExperience: number;
  verificationStatus: 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended';
  specialties: string[]; // ['Cassava Pathology', 'Rice Agronomy', 'Integrated Pest Management']
  verifiedAt?: string;
  verifiedByAdminName?: string;
  casesReviewedCount: number;
  avgResponseHours: number;
}

export interface AgriculturalKnowledgeItem {
  id: string;
  cropId: string;
  cropName: string;
  topic: string;
  category: 'disease' | 'pest' | 'nutrient' | 'water' | 'harvest';
  symptomsDescription: string;
  preventativeMeasures: string;
  approvedOrganicTreatments: string;
  approvedChemicalGuidance: string;
  governanceStatus: 'draft' | 'review' | 'validated' | 'published' | 'periodic_review';
  evidenceLevel: 'peer_reviewed' | 'university_extension' | 'government_bulletin' | 'field_validated';
  sourceName: string;
  sourceUrl?: string;
  authorName: string;
  authorId?: string;
  reviewedByExpertName?: string;
  reviewedByExpertId?: string;
  publishedAt?: string;
  reviewDueDate?: string;
  updatedAt: string;
}

export interface WeatherContext {
  county: string;
  temperatureC: number;
  relativeHumidity: number;
  rainfall24hMm: number;
  forecastSummary: string;
  agroAdvisory: string;
  fungalRiskLevel: 'low' | 'moderate' | 'high';
  droughtRiskLevel: 'low' | 'moderate' | 'high';
}

export interface FarmerFeedbackItem {
  id: string;
  observationId: string;
  farmerId: string;
  farmerName: string;
  category: 'wrong_crop' | 'wrong_disease' | 'wrong_pest' | 'wrong_health_score' | 'inaccurate_recommendation' | 'expert_dispute' | 'other';
  notes: string;
  resolved: boolean;
  createdAt: string;
}

export interface SystemAuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export interface RoutingThresholdsConfig {
  aiHighConfidenceCutoff: number; // e.g. 0.90
  aiMediumConfidenceCutoff: number; // e.g. 0.70
  rapidDeclineThresholdScore: number; // e.g. 20 point drop
  highRiskDiseases: string[];
  mandatoryChemicalReview: boolean;
  autoEscalateDisagreement: boolean;
  knowledgePeriodicReviewDays?: number; // Configurable knowledge periodic review period in days
}
