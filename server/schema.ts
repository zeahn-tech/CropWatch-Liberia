import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// 1. Users Table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  phoneNumber: text('phone_number'),
  role: text('role').notNull(), // 'farmer' | 'expert' | 'senior_expert' | 'admin'
  county: text('county').notNull(),
  organization: text('organization'),
  createdAt: text('created_at').notNull(),
  passwordHash: text('password_hash'),
  supabaseId: text('supabase_id'),
});

// 2. Expert Profiles Table
export const expertProfiles = sqliteTable('expert_profiles', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  organization: text('organization').notNull(),
  qualification: text('qualification').notNull(),
  yearsExperience: integer('years_experience').notNull(),
  verificationStatus: text('verification_status').notNull(), // 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended'
  specialties: text('specialties').notNull(), // JSON string representing string[]
  verifiedAt: text('verified_at'),
  verifiedByAdminName: text('verified_by_admin_name'),
  casesReviewedCount: integer('cases_reviewed_count').notNull().default(0),
  avgResponseHours: real('avg_response_hours').notNull().default(0),
});

// 3. Farms Table
export const farms = sqliteTable('farms', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  county: text('county').notNull(),
  district: text('district').notNull(),
  sizeHectares: real('size_hectares').notNull(),
  soilType: text('soil_type').notNull(),
  irrigationSource: text('irrigation_source').notNull(),
  createdAt: text('created_at').notNull(),
});

// 4. Fields Table
export const fields = sqliteTable('fields', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  areaHectares: real('area_hectares').notNull(),
  topography: text('topography').notNull(),
  createdAt: text('created_at').notNull(),
});

// 5. Crop Catalog Table
export const cropCatalog = sqliteTable('crop_catalog', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  scientificName: text('scientific_name').notNull(),
  growthDurationDaysMin: integer('growth_duration_days_min').notNull(),
  growthDurationDaysMax: integer('growth_duration_days_max').notNull(),
  icon: text('icon').notNull(),
  category: text('category').notNull(), // 'staple_root' | 'staple_cereal' | 'vegetable' | 'perennial_cash'
});

// 6. Crop Varieties Table
export const cropVarieties = sqliteTable('crop_varieties', {
  id: text('id').primaryKey(),
  cropId: text('crop_id').notNull().references(() => cropCatalog.id, { onDelete: 'cascade' }),
  varietyName: text('variety_name').notNull(),
  durationDays: integer('duration_days').notNull(),
  yieldPotential: text('yield_potential').notNull(),
  characteristics: text('characteristics').notNull(),
});

// 7. Crop Plantings Table
export const cropPlantings = sqliteTable('crop_plantings', {
  id: text('id').primaryKey(),
  fieldId: text('field_id').notNull().references(() => fields.id, { onDelete: 'cascade' }),
  farmId: text('farm_id').notNull().references(() => farms.id, { onDelete: 'cascade' }),
  cropId: text('crop_id').notNull(),
  cropName: text('crop_name').notNull(),
  varietyId: text('variety_id'),
  varietyName: text('variety_name'),
  plantingDate: text('planting_date').notNull(),
  expectedHarvestStart: text('expected_harvest_start').notNull(),
  expectedHarvestEnd: text('expected_harvest_end').notNull(),
  status: text('status').notNull(), // 'active' | 'harvested' | 'lost'
  currentGrowthStage: text('current_growth_stage').notNull(),
  latestHealthScore: integer('latest_health_score'),
  latestStatus: text('latest_status'),
  observationCount: integer('observation_count').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

// 8. Plant Observations Table
export const plantObservations = sqliteTable('plant_observations', {
  id: text('id').primaryKey(),
  plantingId: text('planting_id').notNull().references(() => cropPlantings.id, { onDelete: 'cascade' }),
  farmerId: text('farmer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  observedAt: text('observed_at').notNull(),
  notes: text('notes'),
  farmerReportedSymptoms: text('farmer_reported_symptoms'),
  aiAnalysis: text('ai_analysis'), // JSON string representing AIAnalysisResult
  weatherSnapshot: text('weather_snapshot'), // JSON string
  healthScore: integer('health_score'),
  healthStatus: text('health_status').notNull(), // 'excellent' | 'good' | 'needs_attention' | 'poor' | 'critical' | 'unknown'
});

// 9. Observation Images Table
export const observationImages = sqliteTable('observation_images', {
  id: text('id').primaryKey(),
  observationId: text('observation_id').notNull().references(() => plantObservations.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  capturedAt: text('captured_at').notNull(),
  qualityScore: real('quality_score').notNull(),
  isPrimary: integer('is_primary').notNull().default(1), // 1 = true, 0 = false
  size: integer('size'),
  mimeType: text('mime_type'),
});

// 10. Expert Review Cases Table
export const expertReviewCases = sqliteTable('expert_review_cases', {
  id: text('id').primaryKey(),
  observationId: text('observation_id').notNull().references(() => plantObservations.id, { onDelete: 'cascade' }),
  plantingId: text('planting_id').notNull().references(() => cropPlantings.id, { onDelete: 'cascade' }),
  farmId: text('farm_id').notNull().references(() => farms.id, { onDelete: 'cascade' }),
  farmerId: text('farmer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  farmerName: text('farmer_name').notNull(),
  farmerCounty: text('farmer_county').notNull(),
  cropName: text('crop_name').notNull(),
  varietyName: text('variety_name'),
  cropAgeDays: integer('crop_age_days').notNull(),
  status: text('status').notNull(), // 'queued' | 'assigned' | 'in_review' | etc.
  priority: text('priority').notNull(), // 'low' | 'medium' | 'high' | 'urgent'
  triggerType: text('trigger_type').notNull(),
  triggerReason: text('trigger_reason').notNull(),
  assignedExpertId: text('assigned_expert_id').references(() => users.id, { onDelete: 'set null' }),
  assignedExpertName: text('assigned_expert_name'),
  assignedAt: text('assigned_at'),
  suggestedExpertId: text('suggested_expert_id'),
  suggestedExpertName: text('suggested_expert_name'),
  escalationLevel: integer('escalation_level').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  waitingForInfoMessage: text('waiting_for_info_message'),
});

// 11. Expert Assessments Table
export const expertAssessments = sqliteTable('expert_assessments', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => expertReviewCases.id, { onDelete: 'cascade' }),
  observationId: text('observation_id').notNull().references(() => plantObservations.id, { onDelete: 'cascade' }),
  expertId: text('expert_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expertName: text('expert_name').notNull(),
  expertOrganization: text('expert_organization').notNull(),
  expertRole: text('expert_role').notNull(),
  version: integer('version').notNull(),
  isCurrent: integer('is_current').notNull().default(1), // 1 = true, 0 = false
  cropConfirmed: integer('crop_confirmed').notNull().default(1), // 1 = true, 0 = false
  correctedCropName: text('corrected_crop_name'),
  verifiedCondition: text('verified_condition').notNull(),
  decision: text('decision').notNull(), // 'confirmed' | 'modified' | 'rejected' | 'insufficient_evidence'
  severity: text('severity').notNull(), // 'low' | 'moderate' | 'high' | 'critical'
  expertConfidence: text('expert_confidence').notNull(), // 'high' | 'medium' | 'low'
  actionRecommendations: text('action_recommendations').notNull(),
  farmerExplanation: text('farmer_explanation').notNull(),
  internalNotes: text('internal_notes'),
  additionalInfoRequested: text('additional_info_requested'),
  resolvesEscalation: integer('resolves_escalation').notNull().default(0), // 0 = false, 1 = true
  escalationResolutionNotes: text('escalation_resolution_notes'),
  reviewedAt: text('reviewed_at').notNull(),
});

// 12. Agricultural Knowledge Table
export const agriculturalKnowledge = sqliteTable('agricultural_knowledge', {
  id: text('id').primaryKey(),
  cropId: text('crop_id').notNull().references(() => cropCatalog.id, { onDelete: 'cascade' }),
  cropName: text('crop_name').notNull(),
  topic: text('topic').notNull(),
  category: text('category').notNull(), // 'disease' | 'pest' | 'nutrient' | 'water' | 'harvest'
  symptomsDescription: text('symptoms_description').notNull(),
  preventativeMeasures: text('preventative_measures').notNull(),
  approvedOrganicTreatments: text('approved_organic_treatments').notNull(),
  approvedChemicalGuidance: text('approved_chemical_guidance').notNull(),
  governanceStatus: text('governance_status').notNull(), // 'draft' | 'review' | 'validated' | 'published'
  evidenceLevel: text('evidence_level').notNull(),
  sourceName: text('source_name').notNull(),
  sourceUrl: text('source_url'),
  authorName: text('author_name').notNull(),
  authorId: text('author_id'),
  reviewedByExpertName: text('reviewed_by_expert_name'),
  reviewedByExpertId: text('reviewed_by_expert_id'),
  publishedAt: text('published_at'),
  reviewDueDate: text('review_due_date'),
  updatedAt: text('updated_at').notNull(),
});

// 13. Farmer Feedback Table
export const farmerFeedback = sqliteTable('farmer_feedback', {
  id: text('id').primaryKey(),
  observationId: text('observation_id').notNull().references(() => plantObservations.id, { onDelete: 'cascade' }),
  farmerId: text('farmer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  farmerName: text('farmer_name').notNull(),
  category: text('category').notNull(),
  notes: text('notes').notNull(),
  resolved: integer('resolved').notNull().default(0), // 0 = false, 1 = true
  createdAt: text('created_at').notNull(),
});

// 14. Audit Logs Table
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  details: text('details').notNull(),
  timestamp: text('timestamp').notNull(),
});

// 15. Routing Thresholds Table
export const routingThresholds = sqliteTable('routing_thresholds', {
  id: text('id').primaryKey(), // Usually "config_default"
  aiHighConfidenceCutoff: real('ai_high_confidence_cutoff').notNull(),
  aiMediumConfidenceCutoff: real('ai_medium_confidence_cutoff').notNull(),
  rapidDeclineThresholdScore: integer('rapid_decline_threshold_score').notNull(),
  highRiskDiseases: text('high_risk_diseases').notNull(), // JSON string representing string[]
  mandatoryChemicalReview: integer('mandatory_chemical_review').notNull().default(1), // 1 = true, 0 = false
  autoEscalateDisagreement: integer('auto_escalate_disagreement').notNull().default(1), // 1 = true, 0 = false
  knowledgePeriodicReviewDays: integer('knowledge_periodic_review_days').notNull().default(365),
});
