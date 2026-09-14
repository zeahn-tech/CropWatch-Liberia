import { hashPasswordSync } from './auth.js';
import {
  User,
  Farm,
  Field,
  CropCatalogItem,
  CropVariety,
  CropPlanting,
  PlantObservation,
  ExpertProfile,
  ExpertReviewCase,
  ExpertAssessment,
  AgriculturalKnowledgeItem,
  FarmerFeedbackItem,
  SystemAuditLog,
  RoutingThresholdsConfig,
} from '../src/types.js';
import { dbConnection, initializeSqliteSchema } from './dbConnection.js';
import * as schema from './schema.js';
import { eq, and } from 'drizzle-orm';

// Initial Seeds for Liberia Context
const INITIAL_CROPS: CropCatalogItem[] = [
  {
    id: 'crop_cassava',
    name: 'Cassava',
    scientificName: 'Manihot esculenta',
    growthDurationDaysMin: 240,
    growthDurationDaysMax: 365,
    icon: 'Carrot',
    category: 'staple_root',
  },
  {
    id: 'crop_rice_lowland',
    name: 'Lowland Rice (Swamp)',
    scientificName: 'Oryza sativa',
    growthDurationDaysMin: 110,
    growthDurationDaysMax: 140,
    icon: 'Wheat',
    category: 'staple_cereal',
  },
  {
    id: 'crop_rice_upland',
    name: 'Upland Rice',
    scientificName: 'Oryza sativa',
    growthDurationDaysMin: 95,
    growthDurationDaysMax: 120,
    icon: 'Wheat',
    category: 'staple_cereal',
  },
  {
    id: 'crop_okra',
    name: 'Okra',
    scientificName: 'Abelmoschus esculentus',
    growthDurationDaysMin: 55,
    growthDurationDaysMax: 75,
    icon: 'Sprout',
    category: 'vegetable',
  },
  {
    id: 'crop_pepper',
    name: 'Hot Pepper (Scotch Bonnet)',
    scientificName: 'Capsicum chinense',
    growthDurationDaysMin: 90,
    growthDurationDaysMax: 130,
    icon: 'Flame',
    category: 'vegetable',
  },
  {
    id: 'crop_oilpalm',
    name: 'Oil Palm',
    scientificName: 'Elaeis guineensis',
    growthDurationDaysMin: 1095,
    growthDurationDaysMax: 1460,
    icon: 'Palmtree',
    category: 'perennial_cash',
  },
];

const INITIAL_VARIETIES: CropVariety[] = [
  {
    id: 'var_cass_1',
    cropId: 'crop_cassava',
    varietyName: 'CARICASS-2',
    durationDays: 270,
    yieldPotential: '25-30 tons/ha',
    characteristics: 'High resistance to Cassava Mosaic Disease; high starch content; adapted to Liberian acidic soils.',
  },
  {
    id: 'var_cass_2',
    cropId: 'crop_cassava',
    varietyName: 'Bassa Girl (Traditional)',
    durationDays: 330,
    yieldPotential: '18-22 tons/ha',
    characteristics: 'Highly favored for fufu; sweet culinary taste; moderate susceptibility to brown streak disease.',
  },
  {
    id: 'var_rice_1',
    cropId: 'crop_rice_lowland',
    varietyName: 'Suakoko 8',
    durationDays: 130,
    yieldPotential: '4.5 tons/ha',
    characteristics: 'Iron-toxicity tolerant swamp rice developed at CARI Suakoko; excellent milling recovery.',
  },
  {
    id: 'var_rice_2',
    cropId: 'crop_rice_lowland',
    varietyName: 'NERICA-L-19',
    durationDays: 115,
    yieldPotential: '5.0 tons/ha',
    characteristics: 'High tillering, resistant to rice blast; thrives in inland valley swamps.',
  },
  {
    id: 'var_okra_1',
    cropId: 'crop_okra',
    varietyName: 'Liberian Local Dwarf',
    durationDays: 60,
    yieldPotential: '8-12 tons/ha',
    characteristics: 'Dark green pods, tender flesh, tolerance to heavy rainy season precipitation.',
  },
];

const INITIAL_USERS: User[] = [
  {
    id: 'usr_farmer_1',
    email: 'emmanuelzeahn45@gmail.com',
    fullName: 'Emmanuel Zeahn',
    phoneNumber: '+231 77 012 3456',
    role: 'farmer',
    county: 'Bong',
    organization: 'Bong Farmers Cooperative',
    passwordHash: hashPasswordSync('Password123!'),
    createdAt: '2026-06-01T08:00:00Z',
  },
  {
    id: 'usr_farmer_2',
    email: 'moses.kollie@nimba.farmers.lr',
    fullName: 'Moses Kollie',
    phoneNumber: '+231 77 999 1122',
    role: 'farmer',
    county: 'Nimba',
    organization: 'Sanniquellie Smallholder Union',
    passwordHash: hashPasswordSync('Password123!'),
    createdAt: '2026-06-10T09:00:00Z',
  },
  {
    id: 'usr_expert_1',
    email: 'expert.marie@cari.gov.lr',
    fullName: 'Dr. Marie Kromah',
    phoneNumber: '+231 88 654 3210',
    role: 'expert',
    county: 'Bong',
    organization: 'Central Agricultural Research Institute (CARI)',
    passwordHash: hashPasswordSync('Password123!'),
    createdAt: '2026-05-15T09:30:00Z',
  },
  {
    id: 'usr_senior_1',
    email: 'senior.flomo@cuttington.edu.lr',
    fullName: 'Prof. Josephus Flomo',
    phoneNumber: '+231 77 888 9999',
    role: 'senior_expert',
    county: 'Nimba',
    organization: 'Cuttington University / National Agronomy Board',
    passwordHash: hashPasswordSync('Password123!'),
    createdAt: '2026-04-10T10:00:00Z',
  },
  {
    id: 'usr_candidate_1',
    email: 'arthur.doe@extension.moa.gov.lr',
    fullName: 'Arthur Doe',
    phoneNumber: '+231 77 444 3322',
    role: 'expert',
    county: 'Margibi',
    organization: 'Ministry of Agriculture Field Extension',
    passwordHash: hashPasswordSync('Password123!'),
    createdAt: '2026-09-02T11:00:00Z',
  },
  {
    id: 'usr_admin_1',
    email: 'admin.barclay@cropwatch.gov.lr',
    fullName: 'Helena Barclay',
    phoneNumber: '+231 88 111 2233',
    role: 'admin',
    county: 'Montserrado',
    organization: 'National Agricultural Technology Directorate',
    passwordHash: hashPasswordSync('Password123!'),
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const INITIAL_EXPERT_PROFILES: ExpertProfile[] = [
  {
    userId: 'usr_expert_1',
    fullName: 'Dr. Marie Kromah',
    organization: 'Central Agricultural Research Institute (CARI)',
    qualification: 'PhD in Plant Pathology & Crop Protection',
    yearsExperience: 14,
    verificationStatus: 'verified',
    specialties: ['Cassava Viral & Fungal Pathology', 'Lowland Rice Diseases', 'Integrated Pest Management'],
    verifiedAt: '2026-05-20T10:00:00Z',
    verifiedByAdminName: 'Helena Barclay',
    casesReviewedCount: 38,
    avgResponseHours: 4.8,
  },
  {
    userId: 'usr_senior_1',
    fullName: 'Prof. Josephus Flomo',
    organization: 'Cuttington University / National Agronomy Board',
    qualification: 'DSc in Agronomy & Tropical Soil Fertility',
    yearsExperience: 22,
    verificationStatus: 'verified',
    specialties: ['Agronomic Adjudication', 'Soil Acidification & Iron Toxicity', 'National Pest Escalation'],
    verifiedAt: '2026-04-15T09:00:00Z',
    verifiedByAdminName: 'Helena Barclay',
    casesReviewedCount: 64,
    avgResponseHours: 3.2,
  },
  {
    userId: 'usr_candidate_1',
    fullName: 'Arthur Doe',
    organization: 'Ministry of Agriculture Field Extension',
    qualification: 'BSc General Agriculture (Univ. of Liberia)',
    yearsExperience: 3,
    verificationStatus: 'pending',
    specialties: ['Smallholder Vegetable Production', 'Weed Management'],
    casesReviewedCount: 0,
    avgResponseHours: 0,
  },
];

const INITIAL_FARMS: Farm[] = [
  {
    id: 'farm_suakoko',
    userId: 'usr_farmer_1',
    name: 'Suakoko Valley Agro Farm',
    county: 'Bong',
    district: 'Suakoko District',
    sizeHectares: 3.8,
    soilType: 'Loamy red laterite, acidic pH 5.2',
    irrigationSource: 'Perennial valley stream & rainwater harvesting',
    createdAt: '2026-06-05T10:00:00Z',
  },
  {
    id: 'farm_nimba',
    userId: 'usr_farmer_2',
    name: 'Mount Nimba Terrace Farm',
    county: 'Nimba',
    district: 'Sanniquellie-Mah District',
    sizeHectares: 2.5,
    soilType: 'Clay-loam fertile topsoil',
    irrigationSource: 'Mountain runoff stream',
    createdAt: '2026-06-12T10:00:00Z',
  },
];

const INITIAL_FIELDS: Field[] = [
  {
    id: 'fld_cassava_ridge',
    farmId: 'farm_suakoko',
    name: 'Plot 1 - North Upland Ridge',
    areaHectares: 2.2,
    topography: 'Gentle slope (5%), well drained',
    createdAt: '2026-06-05T10:30:00Z',
  },
  {
    id: 'fld_swamp_lowland',
    farmId: 'farm_suakoko',
    name: 'Plot 2 - Inland Valley Swamp',
    areaHectares: 1.6,
    topography: 'Flooded lowland basin',
    createdAt: '2026-06-05T11:00:00Z',
  },
  {
    id: 'fld_nimba_1',
    farmId: 'farm_nimba',
    name: 'Nimba Terrace Plot A',
    areaHectares: 1.5,
    topography: 'Terraced mountain hillside',
    createdAt: '2026-06-12T10:30:00Z',
  },
];

const INITIAL_PLANTINGS: CropPlanting[] = [
  {
    id: 'plt_cass_2026',
    fieldId: 'fld_cassava_ridge',
    farmId: 'farm_suakoko',
    cropId: 'crop_cassava',
    cropName: 'Cassava',
    varietyId: 'var_cass_1',
    varietyName: 'CARICASS-2',
    plantingDate: '2026-06-15',
    expectedHarvestStart: '2027-03-15',
    expectedHarvestEnd: '2027-05-30',
    status: 'active',
    currentGrowthStage: 'Vegetative Canopy Expansion (91 days)',
    latestHealthScore: 68,
    latestStatus: 'needs_attention',
    observationCount: 3,
    createdAt: '2026-06-15T08:00:00Z',
  },
  {
    id: 'plt_rice_2026',
    fieldId: 'fld_swamp_lowland',
    farmId: 'farm_suakoko',
    cropId: 'crop_rice_lowland',
    cropName: 'Lowland Rice (Swamp)',
    varietyId: 'var_rice_1',
    varietyName: 'Suakoko 8',
    plantingDate: '2026-07-20',
    expectedHarvestStart: '2026-11-15',
    expectedHarvestEnd: '2026-12-05',
    status: 'active',
    currentGrowthStage: 'Tillering / Stem Elongation (56 days)',
    latestHealthScore: 88,
    latestStatus: 'good',
    observationCount: 2,
    createdAt: '2026-07-20T08:00:00Z',
  },
  {
    id: 'plt_nimba_rice',
    fieldId: 'fld_nimba_1',
    farmId: 'farm_nimba',
    cropId: 'crop_rice_upland',
    cropName: 'Upland Rice',
    varietyName: 'NERICA-4',
    plantingDate: '2026-06-25',
    expectedHarvestStart: '2026-10-15',
    expectedHarvestEnd: '2026-11-05',
    status: 'active',
    currentGrowthStage: 'Grain Filling',
    latestHealthScore: 78,
    latestStatus: 'good',
    observationCount: 1,
    createdAt: '2026-06-25T08:00:00Z',
  },
];

const INITIAL_OBSERVATIONS: PlantObservation[] = [
  {
    id: 'obs_cass_1',
    plantingId: 'plt_cass_2026',
    farmerId: 'usr_farmer_1',
    observedAt: '2026-07-25T09:00:00Z',
    notes: 'First shoot emergence is uniform across all ridges.',
    farmerReportedSymptoms: 'None. Healthy green foliage.',
    images: [
      {
        id: 'img_c1',
        observationId: 'obs_cass_1',
        imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22d57?auto=format&fit=crop&w=800&q=80',
        capturedAt: '2026-07-25T09:00:00Z',
        qualityScore: 0.94,
        isPrimary: true,
      },
    ],
    healthScore: 94,
    healthStatus: 'excellent',
    weatherSnapshot: {
      tempC: 27,
      humidity: 82,
      rain24hMm: 12.4,
      description: 'Morning cloudiness with light afternoon monsoon shower.',
    },
  },
  {
    id: 'obs_cass_2',
    plantingId: 'plt_cass_2026',
    farmerId: 'usr_farmer_1',
    observedAt: '2026-08-20T10:15:00Z',
    notes: 'Good vigorous growth, slight insect feeding marks on outermost leaves.',
    farmerReportedSymptoms: 'Small holes on lower leaves.',
    images: [
      {
        id: 'img_c2',
        observationId: 'obs_cass_2',
        imageUrl: 'https://images.unsplash.com/photo-1598512752271-33f913a5af13?auto=format&fit=crop&w=800&q=80',
        capturedAt: '2026-08-20T10:15:00Z',
        qualityScore: 0.91,
        isPrimary: true,
      },
    ],
    healthScore: 86,
    healthStatus: 'good',
    weatherSnapshot: {
      tempC: 28,
      humidity: 86,
      rain24hMm: 24.0,
      description: 'Heavy continuous monsoonal rain over central Bong.',
    },
  },
  {
    id: 'obs_cass_3',
    plantingId: 'plt_cass_2026',
    farmerId: 'usr_farmer_1',
    observedAt: '2026-09-12T14:30:00Z',
    notes: 'Noticed yellow mosaic pattern and puckering on upper leaf canopy.',
    farmerReportedSymptoms: 'Yellowing leaves, deformed leaf blades, whiteflies spotted under leaves.',
    images: [
      {
        id: 'img_c3',
        observationId: 'obs_cass_3',
        imageUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80',
        capturedAt: '2026-09-12T14:30:00Z',
        qualityScore: 0.88,
        isPrimary: true,
      },
    ],
    healthScore: 68,
    healthStatus: 'needs_attention',
    weatherSnapshot: {
      tempC: 29,
      humidity: 89,
      rain24hMm: 18.5,
      description: 'Humid tropical afternoon with scattered thunderstorms.',
    },
    aiAnalysis: {
      id: 'ai_cass_3',
      observationId: 'obs_cass_3',
      modelVersion: 'gemini-2.5-flash / liberia-agri-v1.4',
      analyzedAt: '2026-09-12T14:31:20Z',
      detectedCrop: {
        name: 'Cassava',
        confidence: 0.97,
        matchesPlanting: true,
      },
      health: {
        score: 68,
        status: 'needs_attention',
        confidence: 0.82,
      },
      growthStage: {
        stage: 'Vegetative Canopy Development',
        confidence: 0.89,
        estimatedDaysFromPlanting: 89,
      },
      visualObservations: [
        {
          feature: 'Upper young leaves',
          visualFinding: 'Irregular yellow and green mosaic mottling with leaf lamina distortion',
          severity: 'moderate',
        },
        {
          feature: 'Leaf undersides',
          visualFinding: 'Presence of small white powdery insects consistent with Bemisia tabaci',
          severity: 'mild',
        },
      ],
      hypotheses: [
        {
          conditionName: 'Cassava Mosaic Disease (CMD)',
          type: 'disease',
          probability: 0.76,
          evidenceJustification: 'Classic chlorotic mosaic pattern, leaf curling, and whitefly vector presence in humid Bong agro-zone.',
        },
        {
          conditionName: 'Zinc or Nitrogen Micronutrient Deficiency',
          type: 'nutrient_deficiency',
          probability: 0.24,
          evidenceJustification: 'Interveinal leaf yellowing can mimic early viral symptoms on acidic laterite soils.',
        },
      ],
      stresses: {
        waterStress: 'none',
        waterConfidence: 0.90,
        nutrientStress: 'low',
        nutrientConfidence: 0.72,
      },
      harvestEstimate: {
        minimumDays: 160,
        maximumDays: 240,
        confidence: 0.75,
      },
      recommendedActions: {
        cultural: [
          'Carefully inspect neighboring plants within 5 meters for similar mosaic patterns.',
          'If symptoms worsen, rogue (uproot) severely stunted infected plants and destroy them away from the field.',
          'Always use disease-free certified stems (such as CARICASS-2) for new vegetative propagation.',
        ],
        organic: [
          'Apply diluted neem leaf aqueous extract or wood ash tea to the underside of leaves to discourage whitefly vectors.',
        ],
        chemicalAdvisory: 'Synthetic chemical insecticides for whitefly control are not recommended for smallholder root crops due to cost and safety risks. Consult an agricultural extension agent before any chemical intervention.',
      },
      routing: {
        requiresExpertReview: true,
        reasons: [
          'AI diagnostic confidence is in medium tier (76%)',
          'Suspected viral disease impacting staple food security',
          'Health score declined by 18 points since previous observation',
        ],
        priority: 'high',
      },
      limitations: [
        'Assessment is based solely on 2D foliar photographs without laboratory molecular confirmation (PCR).',
        'Root tuber development cannot be evaluated from leaf images alone.',
      ],
      rawObservationsText: 'Clear yellow-green mosaic mottling visible across top 3 tiers of leaves with moderate curling along leaf margins.',
      rawInterpretationText: 'Symptom geometry aligns with begomovirus transmission via whiteflies (Cassava Mosaic Disease).',
      rawPredictionText: 'If whitefly infestation continues unchecked during this rainy period, yield may decline by 20-35% on susceptible stands.',
    },
  },
  {
    id: 'obs_nimba_1',
    plantingId: 'plt_nimba_rice',
    farmerId: 'usr_farmer_2',
    observedAt: '2026-09-10T11:00:00Z',
    notes: 'Grain filling stage on mountain terrace. Observed minor leaf tip browning on upper canopy.',
    farmerReportedSymptoms: 'Leaf tips slightly brown.',
    images: [
      {
        id: 'img_nimba_1',
        observationId: 'obs_nimba_1',
        imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22d57?auto=format&fit=crop&w=800&q=80',
        capturedAt: '2026-09-10T11:00:00Z',
        qualityScore: 0.9,
        isPrimary: true,
      },
    ],
    healthScore: 78,
    healthStatus: 'good',
  },
];

const INITIAL_EXPERT_CASES: ExpertReviewCase[] = [
  {
    id: 'case_cmd_001',
    observationId: 'obs_cass_3',
    plantingId: 'plt_cass_2026',
    farmId: 'farm_suakoko',
    farmerId: 'usr_farmer_1',
    farmerName: 'Emmanuel Zeahn',
    farmerCounty: 'Bong',
    cropName: 'Cassava',
    varietyName: 'CARICASS-2',
    cropAgeDays: 89,
    status: 'in_review',
    priority: 'high',
    triggerType: 'high_risk_disease',
    triggerReason: 'Suspected Cassava Mosaic Disease with rapid 18-point health drop.',
    assignedExpertId: 'usr_expert_1',
    assignedExpertName: 'Dr. Marie Kromah',
    assignedAt: '2026-09-13T08:00:00Z',
    escalationLevel: 1,
    createdAt: '2026-09-12T14:32:00Z',
    updatedAt: '2026-09-13T08:00:00Z',
  },
  {
    id: 'case_nimba_1',
    observationId: 'obs_nimba_1',
    plantingId: 'plt_nimba_rice',
    farmId: 'farm_nimba',
    farmerId: 'usr_farmer_2',
    farmerName: 'Moses Kollie',
    farmerCounty: 'Nimba',
    cropName: 'Upland Rice',
    varietyName: 'NERICA-4',
    cropAgeDays: 77,
    status: 'queued',
    priority: 'medium',
    triggerType: 'farmer_request',
    triggerReason: 'Farmer requested review on grain filling leaf tips.',
    escalationLevel: 1,
    createdAt: '2026-09-10T11:15:00Z',
    updatedAt: '2026-09-10T11:15:00Z',
  },
  {
    id: 'case_unassigned_1',
    observationId: 'obs_cass_2',
    plantingId: 'plt_cass_2026',
    farmId: 'farm_suakoko',
    farmerId: 'usr_farmer_1',
    farmerName: 'Emmanuel Zeahn',
    farmerCounty: 'Bong',
    cropName: 'Cassava',
    varietyName: 'CARICASS-2',
    cropAgeDays: 75,
    status: 'queued',
    priority: 'medium',
    triggerType: 'high_risk_disease',
    triggerReason: 'Early spotting on foliage under high humidity.',
    escalationLevel: 1,
    createdAt: '2026-09-11T10:00:00Z',
    updatedAt: '2026-09-11T10:00:00Z',
  },
];

const INITIAL_EXPERT_ASSESSMENTS: ExpertAssessment[] = [
  {
    id: 'asmt_cmd_v1',
    caseId: 'case_cmd_001',
    observationId: 'obs_cass_3',
    expertId: 'usr_expert_1',
    expertName: 'Dr. Marie Kromah',
    expertOrganization: 'Central Agricultural Research Institute (CARI)',
    expertRole: 'Plant Pathologist',
    version: 1,
    isCurrent: true,
    cropConfirmed: true,
    verifiedCondition: 'Cassava Mosaic Disease (CMD) - Early Inoculation Stage',
    decision: 'confirmed',
    severity: 'moderate',
    expertConfidence: 'high',
    actionRecommendations:
      'Immediately rogue and bury or burn the 3 symptomatic plants to protect the rest of the CARICASS-2 stand. CARICASS-2 has moderate tolerance, but early rogueing prevents viral buildup while the canopy is closing. Do not spray synthetic insecticides; neem extract on surrounding stands is sufficient.',
    farmerExplanation:
      'I have reviewed your photos and confirmed early Cassava Mosaic Disease. CARICASS-2 is a resilient variety, but during the wet September rains, whiteflies transfer the virus between young plants. Removing the specific infected plants today will protect the rest of your harvest.',
    internalNotes: 'Symptoms are classic for East African Cassava Mosaic Virus (EACMV-UG). CARI extension should monitor Suakoko district for vector buildup.',
    reviewedAt: '2026-09-13T10:45:00Z',
  },
];

const INITIAL_KNOWLEDGE: AgriculturalKnowledgeItem[] = [
  {
    id: 'kno_cmd',
    cropId: 'crop_cassava',
    cropName: 'Cassava',
    topic: 'Cassava Mosaic Disease (CMD)',
    category: 'disease',
    symptomsDescription: 'Severe chlorotic mosaic pattern on leaves, leaf distortion and twisting, stunted shoot growth.',
    preventativeMeasures: 'Plant certified resistant varieties (CARICASS-1, CARICASS-2). Use virus-free stem cuttings from mature healthy plants.',
    approvedOrganicTreatments: 'Rogueing infected stands within first 3 months; neem extract to suppress whitefly populations.',
    approvedChemicalGuidance: 'Chemical controls are uneconomical and unsafe for smallholder cassava farms. Cultural management is strictly required.',
    governanceStatus: 'published',
    evidenceLevel: 'peer_reviewed',
    sourceName: 'CARI Technical Bulletin #14 on Root & Tuber Crops',
    authorName: 'Dr. Marie Kromah',
    reviewedByExpertName: 'Prof. Josephus Flomo',
    publishedAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-10T00:00:00Z',
  },
  {
    id: 'kno_rice_blast',
    cropId: 'crop_rice_lowland',
    cropName: 'Lowland Rice (Swamp)',
    topic: 'Rice Blast (Pyricularia oryzae)',
    category: 'disease',
    symptomsDescription: 'Spindle-shaped diamond lesions on leaf blades with gray centers and dark reddish-brown borders. Severe neck rot during heading.',
    preventativeMeasures: 'Maintain continuous water depth in lowland paddy (avoid dry spells); avoid excessive nitrogen fertilizer in damp weather.',
    approvedOrganicTreatments: 'Burning crop residues post-harvest, applying rice husk ash rich in silica to strengthen plant cell walls.',
    approvedChemicalGuidance: 'Fungicide applications (such as tricyclazole) must only be conducted under direct supervision of MOA extension officers using full personal protective equipment.',
    governanceStatus: 'published',
    evidenceLevel: 'university_extension',
    sourceName: 'West Africa Rice Development Association (WARDA) / AfricaRice Field Guide',
    authorName: 'Prof. Josephus Flomo',
    reviewedByExpertName: 'Dr. Marie Kromah',
    publishedAt: '2026-04-18T00:00:00Z',
    updatedAt: '2026-04-18T00:00:00Z',
  },
  {
    id: 'kno_okra_curl',
    cropId: 'crop_okra',
    cropName: 'Okra',
    topic: 'Okra Leaf Curl Virus (OLCV)',
    category: 'disease',
    symptomsDescription: 'Upward leaf curling, thickened veins, yellowing of younger foliage, and stunted fruit production.',
    preventativeMeasures: 'Destroy volunteer weeds around garden beds; plant border crops like maize to serve as physical barrier to whiteflies.',
    approvedOrganicTreatments: 'Weekly foliar spraying with diluted garlic-chili or neem oil solution early in the morning.',
    approvedChemicalGuidance: 'Insecticides do not cure the virus once the plant is infected. Rogueing is mandatory.',
    governanceStatus: 'published',
    evidenceLevel: 'government_bulletin',
    sourceName: 'Liberia Ministry of Agriculture Horticulture Handbook',
    authorName: 'Arthur Doe',
    reviewedByExpertName: 'Dr. Marie Kromah',
    publishedAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  },
];

const INITIAL_THRESHOLDS: RoutingThresholdsConfig = {
  aiHighConfidenceCutoff: 0.90,
  aiMediumConfidenceCutoff: 0.70,
  rapidDeclineThresholdScore: 20,
  highRiskDiseases: [
    'Cassava Mosaic Disease (CMD)',
    'Cassava Brown Streak Disease (CBSD)',
    'Rice Blast (Pyricularia oryzae)',
    'Bacterial Panicle Blight',
    'Fall Armyworm (Spodoptera frugiperda)',
  ],
  mandatoryChemicalReview: true,
  autoEscalateDisagreement: true,
  knowledgePeriodicReviewDays: 365,
};

class CropWatchDatabase {
  constructor() {
    this.load();
  }

  private load() {
    try {
      initializeSqliteSchema();

      // Check if already seeded
      const usersExist = dbConnection.select().from(schema.users).all();
      if (usersExist.length === 0) {
        console.log('🌱 Seeding database with CropWatch Liberia initial agricultural baselines...');

        // 1. Users
        for (const u of INITIAL_USERS) {
          dbConnection.insert(schema.users).values({
            id: u.id,
            email: u.email.trim().toLowerCase(),
            fullName: u.fullName,
            phoneNumber: u.phoneNumber || null,
            role: u.role,
            county: u.county,
            organization: u.organization || null,
            createdAt: u.createdAt,
            passwordHash: u.passwordHash || null,
            supabaseId: u.supabaseId || null,
          }).run();
        }

        // 2. Expert Profiles
        for (const p of INITIAL_EXPERT_PROFILES) {
          dbConnection.insert(schema.expertProfiles).values({
            userId: p.userId,
            fullName: p.fullName,
            organization: p.organization,
            qualification: p.qualification,
            yearsExperience: p.yearsExperience,
            verificationStatus: p.verificationStatus,
            specialties: JSON.stringify(p.specialties),
            verifiedAt: p.verifiedAt || null,
            verifiedByAdminName: p.verifiedByAdminName || null,
            casesReviewedCount: p.casesReviewedCount,
            avgResponseHours: p.avgResponseHours,
          }).run();
        }

        // 3. Farms
        for (const f of INITIAL_FARMS) {
          dbConnection.insert(schema.farms).values({
            id: f.id,
            userId: f.userId,
            name: f.name,
            county: f.county,
            district: f.district,
            sizeHectares: f.sizeHectares,
            soilType: f.soilType,
            irrigationSource: f.irrigationSource,
            createdAt: f.createdAt,
          }).run();
        }

        // 4. Fields
        for (const fld of INITIAL_FIELDS) {
          dbConnection.insert(schema.fields).values({
            id: fld.id,
            farmId: fld.farmId,
            name: fld.name,
            areaHectares: fld.areaHectares,
            topography: fld.topography,
            createdAt: fld.createdAt,
          }).run();
        }

        // 5. Crop Catalog
        for (const crop of INITIAL_CROPS) {
          dbConnection.insert(schema.cropCatalog).values({
            id: crop.id,
            name: crop.name,
            scientificName: crop.scientificName,
            growthDurationDaysMin: crop.growthDurationDaysMin,
            growthDurationDaysMax: crop.growthDurationDaysMax,
            icon: crop.icon,
            category: crop.category,
          }).run();
        }

        // 6. Crop Varieties
        for (const v of INITIAL_VARIETIES) {
          dbConnection.insert(schema.cropVarieties).values({
            id: v.id,
            cropId: v.cropId,
            varietyName: v.varietyName,
            durationDays: v.durationDays,
            yieldPotential: v.yieldPotential,
            characteristics: v.characteristics,
          }).run();
        }

        // 7. Crop Plantings
        for (const p of INITIAL_PLANTINGS) {
          dbConnection.insert(schema.cropPlantings).values({
            id: p.id,
            fieldId: p.fieldId,
            farmId: p.farmId,
            cropId: p.cropId,
            cropName: p.cropName,
            varietyId: p.varietyId || null,
            varietyName: p.varietyName || null,
            plantingDate: p.plantingDate,
            expectedHarvestStart: p.expectedHarvestStart,
            expectedHarvestEnd: p.expectedHarvestEnd,
            status: p.status,
            currentGrowthStage: p.currentGrowthStage,
            latestHealthScore: p.latestHealthScore || null,
            latestStatus: p.latestStatus || null,
            observationCount: p.observationCount,
            createdAt: p.createdAt,
          }).run();
        }

        // 8. Plant Observations & Images
        for (const obs of INITIAL_OBSERVATIONS) {
          dbConnection.insert(schema.plantObservations).values({
            id: obs.id,
            plantingId: obs.plantingId,
            farmerId: obs.farmerId,
            observedAt: obs.observedAt,
            notes: obs.notes || null,
            farmerReportedSymptoms: obs.farmerReportedSymptoms || null,
            aiAnalysis: obs.aiAnalysis ? JSON.stringify(obs.aiAnalysis) : null,
            weatherSnapshot: obs.weatherSnapshot ? JSON.stringify(obs.weatherSnapshot) : null,
            healthScore: obs.healthScore || null,
            healthStatus: obs.healthStatus,
          }).run();

          if (obs.images) {
            for (const img of obs.images) {
              dbConnection.insert(schema.observationImages).values({
                id: img.id,
                observationId: obs.id,
                imageUrl: img.imageUrl,
                capturedAt: img.capturedAt,
                qualityScore: img.qualityScore,
                isPrimary: img.isPrimary ? 1 : 0,
              }).run();
            }
          }
        }

        // 9. Expert Review Cases
        for (const c of INITIAL_EXPERT_CASES) {
          dbConnection.insert(schema.expertReviewCases).values({
            id: c.id,
            observationId: c.observationId,
            plantingId: c.plantingId,
            farmId: c.farmId,
            farmerId: c.farmerId,
            farmerName: c.farmerName,
            farmerCounty: c.farmerCounty,
            cropName: c.cropName,
            varietyName: c.varietyName || null,
            cropAgeDays: c.cropAgeDays,
            status: c.status,
            priority: c.priority,
            triggerType: c.triggerType,
            triggerReason: c.triggerReason,
            assignedExpertId: c.assignedExpertId || null,
            assignedExpertName: c.assignedExpertName || null,
            assignedAt: c.assignedAt || null,
            escalationLevel: c.escalationLevel,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            waitingForInfoMessage: c.waitingForInfoMessage || null,
          }).run();
        }

        // 10. Expert Assessments
        for (const as of INITIAL_EXPERT_ASSESSMENTS) {
          dbConnection.insert(schema.expertAssessments).values({
            id: as.id,
            caseId: as.caseId,
            observationId: as.observationId,
            expertId: as.expertId,
            expertName: as.expertName,
            expertOrganization: as.expertOrganization,
            expertRole: as.expertRole,
            version: as.version,
            isCurrent: as.isCurrent ? 1 : 0,
            cropConfirmed: as.cropConfirmed ? 1 : 0,
            correctedCropName: as.correctedCropName || null,
            verifiedCondition: as.verifiedCondition,
            decision: as.decision,
            severity: as.severity,
            expertConfidence: as.expertConfidence,
            actionRecommendations: as.actionRecommendations,
            farmerExplanation: as.farmerExplanation,
            internalNotes: as.internalNotes || null,
            additionalInfoRequested: as.additionalInfoRequested || null,
            reviewedAt: as.reviewedAt,
          }).run();
        }

        // 11. Agricultural Knowledge
        for (const k of INITIAL_KNOWLEDGE) {
          dbConnection.insert(schema.agriculturalKnowledge).values({
            id: k.id,
            cropId: k.cropId,
            cropName: k.cropName,
            topic: k.topic,
            category: k.category,
            symptomsDescription: k.symptomsDescription,
            preventativeMeasures: k.preventativeMeasures,
            approvedOrganicTreatments: k.approvedOrganicTreatments,
            approvedChemicalGuidance: k.approvedChemicalGuidance,
            governanceStatus: k.governanceStatus,
            evidenceLevel: k.evidenceLevel,
            sourceName: k.sourceName,
            sourceUrl: k.sourceUrl || null,
            authorName: k.authorName,
            reviewedByExpertName: k.reviewedByExpertName || null,
            publishedAt: k.publishedAt || null,
            updatedAt: k.updatedAt,
          }).run();
        }

        // 12. Routing Thresholds
        dbConnection.insert(schema.routingThresholds).values({
          id: 'config_default',
          aiHighConfidenceCutoff: INITIAL_THRESHOLDS.aiHighConfidenceCutoff,
          aiMediumConfidenceCutoff: INITIAL_THRESHOLDS.aiMediumConfidenceCutoff,
          rapidDeclineThresholdScore: INITIAL_THRESHOLDS.rapidDeclineThresholdScore,
          highRiskDiseases: JSON.stringify(INITIAL_THRESHOLDS.highRiskDiseases),
          mandatoryChemicalReview: INITIAL_THRESHOLDS.mandatoryChemicalReview ? 1 : 0,
          autoEscalateDisagreement: INITIAL_THRESHOLDS.autoEscalateDisagreement ? 1 : 0,
          knowledgePeriodicReviewDays: INITIAL_THRESHOLDS.knowledgePeriodicReviewDays || 365,
        }).run();

        // 13. Audit Log
        dbConnection.insert(schema.auditLogs).values({
          id: 'log_seed_1',
          actorId: 'usr_admin_1',
          actorName: 'Helena Barclay',
          actorRole: 'admin',
          action: 'SYSTEM_INITIALIZED',
          entityType: 'system',
          entityId: 'root',
          details: 'CropWatch Liberia system initialized with CARI & MOA agronomic baselines and real SQLite database.',
          timestamp: new Date().toISOString(),
        }).run();

        console.log('✅ Seeding completed.');
      } else {
        console.log('👍 Database already contains seeded records.');
      }
    } catch (e) {
      console.error('❌ Failed to load or seed the database schema:', e);
    }
  }

  // Getters
  public getUsers(): User[] {
    const rows = dbConnection.select().from(schema.users).all();
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      fullName: r.fullName,
      phoneNumber: r.phoneNumber || undefined,
      role: r.role as any,
      county: r.county,
      organization: r.organization || undefined,
      createdAt: r.createdAt,
      passwordHash: r.passwordHash || undefined,
      supabaseId: r.supabaseId || undefined,
    }));
  }

  public getSafeUser(user: User): User {
    const { passwordHash, ...safe } = user;
    return safe as User;
  }

  public getSafeUsers(): User[] {
    return this.getUsers().map((u) => this.getSafeUser(u));
  }

  public getUserById(id: string): User | undefined {
    const row = dbConnection.select().from(schema.users).where(eq(schema.users.id, id)).get();
    if (!row) return undefined;
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      phoneNumber: row.phoneNumber || undefined,
      role: row.role as any,
      county: row.county,
      organization: row.organization || undefined,
      createdAt: row.createdAt,
      passwordHash: row.passwordHash || undefined,
      supabaseId: row.supabaseId || undefined,
    };
  }

  public getUserByEmail(email: string): User | undefined {
    const row = dbConnection
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.trim().toLowerCase()))
      .get();
    if (!row) return undefined;
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      phoneNumber: row.phoneNumber || undefined,
      role: row.role as any,
      county: row.county,
      organization: row.organization || undefined,
      createdAt: row.createdAt,
      passwordHash: row.passwordHash || undefined,
      supabaseId: row.supabaseId || undefined,
    };
  }

  public addUser(user: User): User {
    dbConnection
      .insert(schema.users)
      .values({
        id: user.id,
        email: user.email.trim().toLowerCase(),
        fullName: user.fullName,
        phoneNumber: user.phoneNumber || null,
        role: user.role,
        county: user.county,
        organization: user.organization || null,
        createdAt: user.createdAt,
        passwordHash: user.passwordHash || null,
        supabaseId: user.supabaseId || null,
      })
      .run();
    return user;
  }

  public getExpertProfiles(): ExpertProfile[] {
    const rows = dbConnection.select().from(schema.expertProfiles).all();
    return rows.map((r) => ({
      userId: r.userId,
      fullName: r.fullName,
      organization: r.organization,
      qualification: r.qualification,
      yearsExperience: r.yearsExperience,
      verificationStatus: r.verificationStatus as any,
      specialties: r.specialties ? JSON.parse(r.specialties) : [],
      verifiedAt: r.verifiedAt || undefined,
      verifiedByAdminName: r.verifiedByAdminName || undefined,
      casesReviewedCount: r.casesReviewedCount,
      avgResponseHours: r.avgResponseHours,
    }));
  }

  public getExpertProfileByUserId(userId: string): ExpertProfile | undefined {
    const row = dbConnection
      .select()
      .from(schema.expertProfiles)
      .where(eq(schema.expertProfiles.userId, userId))
      .get();
    if (!row) return undefined;
    return {
      userId: row.userId,
      fullName: row.fullName,
      organization: row.organization,
      qualification: row.qualification,
      yearsExperience: row.yearsExperience,
      verificationStatus: row.verificationStatus as any,
      specialties: row.specialties ? JSON.parse(row.specialties) : [],
      verifiedAt: row.verifiedAt || undefined,
      verifiedByAdminName: row.verifiedByAdminName || undefined,
      casesReviewedCount: row.casesReviewedCount,
      avgResponseHours: row.avgResponseHours,
    };
  }

  public updateExpertProfile(userId: string, updates: Partial<ExpertProfile>): ExpertProfile | undefined {
    const current = this.getExpertProfileByUserId(userId);
    if (!current) return undefined;
    const next = { ...current, ...updates };
    dbConnection
      .update(schema.expertProfiles)
      .set({
        fullName: next.fullName,
        organization: next.organization,
        qualification: next.qualification,
        yearsExperience: next.yearsExperience,
        verificationStatus: next.verificationStatus,
        specialties: JSON.stringify(next.specialties),
        verifiedAt: next.verifiedAt || null,
        verifiedByAdminName: next.verifiedByAdminName || null,
        casesReviewedCount: next.casesReviewedCount,
        avgResponseHours: next.avgResponseHours,
      })
      .where(eq(schema.expertProfiles.userId, userId))
      .run();
    return next;
  }

  public addExpertProfile(profile: ExpertProfile): ExpertProfile {
    dbConnection
      .insert(schema.expertProfiles)
      .values({
        userId: profile.userId,
        fullName: profile.fullName,
        organization: profile.organization,
        qualification: profile.qualification,
        yearsExperience: profile.yearsExperience,
        verificationStatus: profile.verificationStatus,
        specialties: JSON.stringify(profile.specialties),
        verifiedAt: profile.verifiedAt || null,
        verifiedByAdminName: profile.verifiedByAdminName || null,
        casesReviewedCount: profile.casesReviewedCount,
        avgResponseHours: profile.avgResponseHours,
      })
      .run();
    return profile;
  }

  public getFarms(userId?: string): Farm[] {
    let query = dbConnection.select().from(schema.farms);
    const rows = userId ? query.where(eq(schema.farms.userId, userId)).all() : query.all();
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.name,
      county: r.county,
      district: r.district,
      sizeHectares: r.sizeHectares,
      soilType: r.soilType,
      irrigationSource: r.irrigationSource,
      createdAt: r.createdAt,
    }));
  }

  public getFarmById(id: string): Farm | undefined {
    const r = dbConnection.select().from(schema.farms).where(eq(schema.farms.id, id)).get();
    if (!r) return undefined;
    return {
      id: r.id,
      userId: r.userId,
      name: r.name,
      county: r.county,
      district: r.district,
      sizeHectares: r.sizeHectares,
      soilType: r.soilType,
      irrigationSource: r.irrigationSource,
      createdAt: r.createdAt,
    };
  }

  public addFarm(farm: Farm): Farm {
    dbConnection
      .insert(schema.farms)
      .values({
        id: farm.id,
        userId: farm.userId,
        name: farm.name,
        county: farm.county,
        district: farm.district,
        sizeHectares: farm.sizeHectares,
        soilType: farm.soilType,
        irrigationSource: farm.irrigationSource,
        createdAt: farm.createdAt,
      })
      .run();
    return farm;
  }

  public getFields(farmId?: string): Field[] {
    let query = dbConnection.select().from(schema.fields);
    const rows = farmId ? query.where(eq(schema.fields.farmId, farmId)).all() : query.all();
    return rows.map((r) => ({
      id: r.id,
      farmId: r.farmId,
      name: r.name,
      areaHectares: r.areaHectares,
      topography: r.topography,
      createdAt: r.createdAt,
    }));
  }

  public addField(field: Field): Field {
    dbConnection
      .insert(schema.fields)
      .values({
        id: field.id,
        farmId: field.farmId,
        name: field.name,
        areaHectares: field.areaHectares,
        topography: field.topography,
        createdAt: field.createdAt,
      })
      .run();
    return field;
  }

  public getCrops(): CropCatalogItem[] {
    const rows = dbConnection.select().from(schema.cropCatalog).all();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      scientificName: r.scientificName,
      growthDurationDaysMin: r.growthDurationDaysMin,
      growthDurationDaysMax: r.growthDurationDaysMax,
      icon: r.icon,
      category: r.category as any,
    }));
  }

  public getVarieties(cropId?: string): CropVariety[] {
    let query = dbConnection.select().from(schema.cropVarieties);
    const rows = cropId ? query.where(eq(schema.cropVarieties.cropId, cropId)).all() : query.all();
    return rows.map((r) => ({
      id: r.id,
      cropId: r.cropId,
      varietyName: r.varietyName,
      durationDays: r.durationDays,
      yieldPotential: r.yieldPotential,
      characteristics: r.characteristics,
    }));
  }

  private mapPlantingRow(r: any): CropPlanting {
    return {
      id: r.id,
      fieldId: r.fieldId,
      farmId: r.farmId,
      cropId: r.cropId,
      cropName: r.cropName,
      varietyId: r.varietyId || undefined,
      varietyName: r.varietyName || undefined,
      plantingDate: r.plantingDate,
      expectedHarvestStart: r.expectedHarvestStart,
      expectedHarvestEnd: r.expectedHarvestEnd,
      status: r.status as any,
      currentGrowthStage: r.currentGrowthStage,
      latestHealthScore: r.latestHealthScore,
      latestStatus: r.latestStatus as any,
      observationCount: r.observationCount,
      createdAt: r.createdAt,
    };
  }

  public getPlantings(userId?: string): CropPlanting[] {
    if (userId) {
      const userFarms = this.getFarms(userId).map((f) => f.id);
      if (userFarms.length === 0) return [];
      const rows = dbConnection.select().from(schema.cropPlantings).all();
      return rows.filter((r) => userFarms.includes(r.farmId)).map((r) => this.mapPlantingRow(r));
    }
    const rows = dbConnection.select().from(schema.cropPlantings).all();
    return rows.map((r) => this.mapPlantingRow(r));
  }

  public getPlantingById(id: string): CropPlanting | undefined {
    const r = dbConnection.select().from(schema.cropPlantings).where(eq(schema.cropPlantings.id, id)).get();
    if (!r) return undefined;
    return this.mapPlantingRow(r);
  }

  public addPlanting(planting: CropPlanting): CropPlanting {
    dbConnection
      .insert(schema.cropPlantings)
      .values({
        id: planting.id,
        fieldId: planting.fieldId,
        farmId: planting.farmId,
        cropId: planting.cropId,
        cropName: planting.cropName,
        varietyId: planting.varietyId || null,
        varietyName: planting.varietyName || null,
        plantingDate: planting.plantingDate,
        expectedHarvestStart: planting.expectedHarvestStart,
        expectedHarvestEnd: planting.expectedHarvestEnd,
        status: planting.status,
        currentGrowthStage: planting.currentGrowthStage,
        latestHealthScore: planting.latestHealthScore || null,
        latestStatus: planting.latestStatus || null,
        observationCount: planting.observationCount,
        createdAt: planting.createdAt,
      })
      .run();
    return planting;
  }

  public updatePlanting(id: string, updates: Partial<CropPlanting>): CropPlanting | undefined {
    const current = this.getPlantingById(id);
    if (!current) return undefined;
    const next = { ...current, ...updates };
    dbConnection
      .update(schema.cropPlantings)
      .set({
        fieldId: next.fieldId,
        farmId: next.farmId,
        cropId: next.cropId,
        cropName: next.cropName,
        varietyId: next.varietyId || null,
        varietyName: next.varietyName || null,
        plantingDate: next.plantingDate,
        expectedHarvestStart: next.expectedHarvestStart,
        expectedHarvestEnd: next.expectedHarvestEnd,
        status: next.status,
        currentGrowthStage: next.currentGrowthStage,
        latestHealthScore: next.latestHealthScore || null,
        latestStatus: next.latestStatus || null,
        observationCount: next.observationCount,
      })
      .where(eq(schema.cropPlantings.id, id))
      .run();
    return next;
  }

  private mapObservationRow(r: any): PlantObservation {
    const imageRows = dbConnection
      .select()
      .from(schema.observationImages)
      .where(eq(schema.observationImages.observationId, r.id))
      .all();

    const images = imageRows.map((img) => ({
      id: img.id,
      observationId: img.observationId,
      imageUrl: img.imageUrl,
      capturedAt: img.capturedAt,
      qualityScore: img.qualityScore,
      isPrimary: img.isPrimary === 1,
    }));

    const expertCase = dbConnection
      .select()
      .from(schema.expertReviewCases)
      .where(eq(schema.expertReviewCases.observationId, r.id))
      .get();

    const expertReviewCase = expertCase ? this.mapExpertCaseRow(expertCase) : undefined;

    let latestExpertAssessment: any = undefined;
    if (expertCase) {
      const assessmentRow = dbConnection
        .select()
        .from(schema.expertAssessments)
        .where(and(eq(schema.expertAssessments.caseId, expertCase.id), eq(schema.expertAssessments.isCurrent, 1)))
        .get();
      if (assessmentRow) {
        latestExpertAssessment = this.mapAssessmentRow(assessmentRow);
      }
    }

    return {
      id: r.id,
      plantingId: r.plantingId,
      farmerId: r.farmerId,
      observedAt: r.observedAt,
      notes: r.notes || undefined,
      farmerReportedSymptoms: r.farmerReportedSymptoms || undefined,
      images,
      aiAnalysis: r.aiAnalysis ? JSON.parse(r.aiAnalysis) : undefined,
      weatherSnapshot: r.weatherSnapshot ? JSON.parse(r.weatherSnapshot) : undefined,
      healthScore: r.healthScore,
      healthStatus: r.healthStatus as any,
      expertReviewCase,
      latestExpertAssessment,
    };
  }

  public getObservations(plantingId?: string): PlantObservation[] {
    let rows: any[];
    if (plantingId) {
      rows = dbConnection
        .select()
        .from(schema.plantObservations)
        .where(eq(schema.plantObservations.plantingId, plantingId))
        .all();
    } else {
      rows = dbConnection.select().from(schema.plantObservations).all();
    }

    const results = rows.map((r) => this.mapObservationRow(r));
    return results.sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime());
  }

  public getObservationById(id: string): PlantObservation | undefined {
    const r = dbConnection.select().from(schema.plantObservations).where(eq(schema.plantObservations.id, id)).get();
    if (!r) return undefined;
    return this.mapObservationRow(r);
  }

  public addObservation(observation: PlantObservation): PlantObservation {
    dbConnection
      .insert(schema.plantObservations)
      .values({
        id: observation.id,
        plantingId: observation.plantingId,
        farmerId: observation.farmerId,
        observedAt: observation.observedAt,
        notes: observation.notes || null,
        farmerReportedSymptoms: observation.farmerReportedSymptoms || null,
        aiAnalysis: observation.aiAnalysis ? JSON.stringify(observation.aiAnalysis) : null,
        weatherSnapshot: observation.weatherSnapshot ? JSON.stringify(observation.weatherSnapshot) : null,
        healthScore: observation.healthScore || null,
        healthStatus: observation.healthStatus,
      })
      .run();

    if (observation.images && observation.images.length > 0) {
      for (const img of observation.images) {
        dbConnection
          .insert(schema.observationImages)
          .values({
            id: img.id,
            observationId: observation.id,
            imageUrl: img.imageUrl,
            capturedAt: img.capturedAt,
            qualityScore: img.qualityScore,
            isPrimary: img.isPrimary ? 1 : 0,
          })
          .run();
      }
    }

    return observation;
  }

  public updateObservation(id: string, updates: Partial<PlantObservation>): PlantObservation | undefined {
    const current = this.getObservationById(id);
    if (!current) return undefined;
    const next = { ...current, ...updates };
    dbConnection
      .update(schema.plantObservations)
      .set({
        notes: next.notes || null,
        farmerReportedSymptoms: next.farmerReportedSymptoms || null,
        aiAnalysis: next.aiAnalysis ? JSON.stringify(next.aiAnalysis) : null,
        weatherSnapshot: next.weatherSnapshot ? JSON.stringify(next.weatherSnapshot) : null,
        healthScore: next.healthScore || null,
        healthStatus: next.healthStatus,
      })
      .where(eq(schema.plantObservations.id, id))
      .run();
    return next;
  }

  private mapExpertCaseRow(r: any): ExpertReviewCase {
    return {
      id: r.id,
      observationId: r.observationId,
      plantingId: r.plantingId,
      farmId: r.farmId,
      farmerId: r.farmerId,
      farmerName: r.farmerName,
      farmerCounty: r.farmerCounty,
      cropName: r.cropName,
      varietyName: r.varietyName || undefined,
      cropAgeDays: r.cropAgeDays,
      status: r.status as any,
      priority: r.priority as any,
      triggerType: r.triggerType as any,
      triggerReason: r.triggerReason,
      assignedExpertId: r.assignedExpertId || undefined,
      assignedExpertName: r.assignedExpertName || undefined,
      assignedAt: r.assignedAt || undefined,
      suggestedExpertId: r.suggestedExpertId || undefined,
      suggestedExpertName: r.suggestedExpertName || undefined,
      escalationLevel: r.escalationLevel,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      waitingForInfoMessage: r.waitingForInfoMessage || undefined,
    };
  }

  public getExpertCases(statusFilter?: string): ExpertReviewCase[] {
    let query = dbConnection.select().from(schema.expertReviewCases);
    let rows: any[];
    if (statusFilter && statusFilter !== 'all') {
      rows = query.where(eq(schema.expertReviewCases.status, statusFilter)).all();
    } else {
      rows = query.all();
    }
    return rows
      .map((r) => this.mapExpertCaseRow(r))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getExpertCaseById(id: string): ExpertReviewCase | undefined {
    const r = dbConnection
      .select()
      .from(schema.expertReviewCases)
      .where(eq(schema.expertReviewCases.id, id))
      .get();
    if (!r) return undefined;
    return this.mapExpertCaseRow(r);
  }

  public findSuggestedExpert(cropName: string, county: string): { id: string; fullName: string } | undefined {
    const ADJACENT_COUNTIES: Record<string, string[]> = {
      'Bong': ['Lofa', 'Nimba', 'Grand Bassa', 'Margibi', 'Montserrado', 'Gbarpolu'],
      'Lofa': ['Bong', 'Gbarpolu'],
      'Nimba': ['Bong', 'Grand Bassa', 'Rivercess', 'Grand Gedeh'],
      'Grand Bassa': ['Margibi', 'Bong', 'Nimba', 'Rivercess'],
      'Montserrado': ['Bomi', 'Margibi', 'Bong'],
      'Margibi': ['Montserrado', 'Grand Bassa', 'Bong'],
      'Gbarpolu': ['Lofa', 'Bomi', 'Grand Cape Mount', 'Bong'],
      'Bomi': ['Grand Cape Mount', 'Gbarpolu', 'Montserrado'],
      'Grand Cape Mount': ['Bomi', 'Gbarpolu'],
      'Rivercess': ['Grand Bassa', 'Nimba', 'Sinoe'],
      'Sinoe': ['Rivercess', 'Grand Gedeh', 'River Gee', 'Grand Kru'],
      'Grand Gedeh': ['Nimba', 'Sinoe', 'River Gee'],
      'River Gee': ['Grand Gedeh', 'Sinoe', 'Maryland', 'Grand Kru'],
      'Maryland': ['River Gee', 'Grand Kru'],
      'Grand Kru': ['Sinoe', 'River Gee', 'Maryland'],
    };

    // 1. Get all expert profiles that are verified
    const profiles = dbConnection
      .select()
      .from(schema.expertProfiles)
      .where(eq(schema.expertProfiles.verificationStatus, 'verified'))
      .all();

    if (profiles.length === 0) return undefined;

    // 2. Map verified expert profiles to their user's county
    const matches: Array<{
      userId: string;
      fullName: string;
      county: string;
      specialties: string[];
    }> = [];

    for (const p of profiles) {
      const u = dbConnection
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, p.userId))
        .get();
      if (u) {
        let parsedSpecs: string[] = [];
        try {
          parsedSpecs = typeof p.specialties === 'string' ? JSON.parse(p.specialties) : p.specialties;
          if (!Array.isArray(parsedSpecs)) {
            parsedSpecs = [];
          }
        } catch (e) {
          parsedSpecs = [];
        }
        matches.push({
          userId: p.userId,
          fullName: p.fullName,
          county: u.county || '',
          specialties: parsedSpecs,
        });
      }
    }

    // 3. Filter by specialty match (case-insensitive on cropName)
    const specialtyMatches = matches.filter((m) => {
      return m.specialties.some((spec) => {
        return (
          spec.toLowerCase().includes(cropName.toLowerCase()) ||
          cropName.toLowerCase().includes(spec.toLowerCase())
        );
      });
    });

    if (specialtyMatches.length === 0) return undefined;

    // 4. Rank by county proximity
    // Level 1: Same county
    const sameCounty = specialtyMatches.filter((m) => m.county.toLowerCase() === county.toLowerCase());
    if (sameCounty.length > 0) {
      return { id: sameCounty[0].userId, fullName: sameCounty[0].fullName };
    }

    // Level 2: Neighboring county
    const neighbors = ADJACENT_COUNTIES[county] || [];
    const neighborMatches = specialtyMatches.filter((m) => {
      return neighbors.some((n) => n.toLowerCase() === m.county.toLowerCase());
    });
    if (neighborMatches.length > 0) {
      return { id: neighborMatches[0].userId, fullName: neighborMatches[0].fullName };
    }

    // Level 3: Any specialty match
    return { id: specialtyMatches[0].userId, fullName: specialtyMatches[0].fullName };
  }

  public addExpertCase(c: ExpertReviewCase): ExpertReviewCase {
    dbConnection
      .insert(schema.expertReviewCases)
      .values({
        id: c.id,
        observationId: c.observationId,
        plantingId: c.plantingId,
        farmId: c.farmId,
        farmerId: c.farmerId,
        farmerName: c.farmerName,
        farmerCounty: c.farmerCounty,
        cropName: c.cropName,
        varietyName: c.varietyName || null,
        cropAgeDays: c.cropAgeDays,
        status: c.status,
        priority: c.priority,
        triggerType: c.triggerType,
        triggerReason: c.triggerReason,
        assignedExpertId: c.assignedExpertId || null,
        assignedExpertName: c.assignedExpertName || null,
        assignedAt: c.assignedAt || null,
        suggestedExpertId: c.suggestedExpertId || null,
        suggestedExpertName: c.suggestedExpertName || null,
        escalationLevel: c.escalationLevel,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        waitingForInfoMessage: c.waitingForInfoMessage || null,
      })
      .run();
    return c;
  }

  public updateExpertCase(id: string, updates: Partial<ExpertReviewCase>): ExpertReviewCase | undefined {
    const current = this.getExpertCaseById(id);
    if (!current) return undefined;
    const next = { ...current, ...updates, updatedAt: new Date().toISOString() };
    dbConnection
      .update(schema.expertReviewCases)
      .set({
        status: next.status,
        priority: next.priority,
        triggerType: next.triggerType,
        triggerReason: next.triggerReason,
        assignedExpertId: next.assignedExpertId || null,
        assignedExpertName: next.assignedExpertName || null,
        assignedAt: next.assignedAt || null,
        suggestedExpertId: next.suggestedExpertId || null,
        suggestedExpertName: next.suggestedExpertName || null,
        escalationLevel: next.escalationLevel,
        updatedAt: next.updatedAt,
        waitingForInfoMessage: next.waitingForInfoMessage || null,
      })
      .where(eq(schema.expertReviewCases.id, id))
      .run();
    return next;
  }

  private mapAssessmentRow(r: any): ExpertAssessment {
    return {
      id: r.id,
      caseId: r.caseId,
      observationId: r.observationId,
      expertId: r.expertId,
      expertName: r.expertName,
      expertOrganization: r.expertOrganization,
      expertRole: r.expertRole,
      version: r.version,
      isCurrent: r.isCurrent === 1,
      cropConfirmed: r.cropConfirmed === 1,
      correctedCropName: r.correctedCropName || undefined,
      verifiedCondition: r.verifiedCondition,
      decision: r.decision as any,
      severity: r.severity as any,
      expertConfidence: r.expertConfidence as any,
      actionRecommendations: r.actionRecommendations,
      farmerExplanation: r.farmerExplanation,
      internalNotes: r.internalNotes || undefined,
      additionalInfoRequested: r.additionalInfoRequested || undefined,
      resolvesEscalation: r.resolvesEscalation === 1,
      escalationResolutionNotes: r.escalationResolutionNotes || undefined,
      reviewedAt: r.reviewedAt,
    };
  }

  public getAssessments(caseId?: string): ExpertAssessment[] {
    let query = dbConnection.select().from(schema.expertAssessments);
    let rows = caseId ? query.where(eq(schema.expertAssessments.caseId, caseId)).all() : query.all();
    return rows.map((r) => this.mapAssessmentRow(r)).sort((a, b) => b.version - a.version);
  }

  public addAssessment(assessment: ExpertAssessment): ExpertAssessment {
    dbConnection
      .update(schema.expertAssessments)
      .set({
        isCurrent: 0,
      })
      .where(eq(schema.expertAssessments.caseId, assessment.caseId))
      .run();

    dbConnection
      .insert(schema.expertAssessments)
      .values({
        id: assessment.id,
        caseId: assessment.caseId,
        observationId: assessment.observationId,
        expertId: assessment.expertId,
        expertName: assessment.expertName,
        expertOrganization: assessment.expertOrganization,
        expertRole: assessment.expertRole,
        version: assessment.version,
        isCurrent: assessment.isCurrent ? 1 : 0,
        cropConfirmed: assessment.cropConfirmed ? 1 : 0,
        correctedCropName: assessment.correctedCropName || null,
        verifiedCondition: assessment.verifiedCondition,
        decision: assessment.decision,
        severity: assessment.severity,
        expertConfidence: assessment.expertConfidence,
        actionRecommendations: assessment.actionRecommendations,
        farmerExplanation: assessment.farmerExplanation,
        internalNotes: assessment.internalNotes || null,
        additionalInfoRequested: assessment.additionalInfoRequested || null,
        resolvesEscalation: assessment.resolvesEscalation ? 1 : 0,
        escalationResolutionNotes: assessment.escalationResolutionNotes || null,
        reviewedAt: assessment.reviewedAt,
      })
      .run();

    return assessment;
  }

  public getKnowledge(cropId?: string): AgriculturalKnowledgeItem[] {
    const thresholds = this.getThresholds();
    const daysInterval = thresholds.knowledgePeriodicReviewDays || 365;

    let query = dbConnection.select().from(schema.agriculturalKnowledge);
    let rows = cropId ? query.where(eq(schema.agriculturalKnowledge.cropId, cropId)).all() : query.all();
    
    return rows.map((r) => {
      let status = r.governanceStatus as any;
      if (status === 'published' && r.publishedAt) {
        const pubDate = new Date(r.publishedAt);
        const diffTime = Math.abs(Date.now() - pubDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > daysInterval) {
          status = 'periodic_review';
        }
      }
      return {
        id: r.id,
        cropId: r.cropId,
        cropName: r.cropName,
        topic: r.topic,
        category: r.category as any,
        symptomsDescription: r.symptomsDescription,
        preventativeMeasures: r.preventativeMeasures,
        approvedOrganicTreatments: r.approvedOrganicTreatments,
        approvedChemicalGuidance: r.approvedChemicalGuidance,
        governanceStatus: status,
        evidenceLevel: r.evidenceLevel as any,
        sourceName: r.sourceName,
        sourceUrl: r.sourceUrl || undefined,
        authorName: r.authorName,
        authorId: r.authorId || undefined,
        reviewedByExpertName: r.reviewedByExpertName || undefined,
        reviewedByExpertId: r.reviewedByExpertId || undefined,
        publishedAt: r.publishedAt || undefined,
        reviewDueDate: r.reviewDueDate || undefined,
        updatedAt: r.updatedAt,
      };
    });
  }

  public addKnowledge(item: AgriculturalKnowledgeItem): AgriculturalKnowledgeItem {
    dbConnection
      .insert(schema.agriculturalKnowledge)
      .values({
        id: item.id,
        cropId: item.cropId,
        cropName: item.cropName,
        topic: item.topic,
        category: item.category,
        symptomsDescription: item.symptomsDescription,
        preventativeMeasures: item.preventativeMeasures,
        approvedOrganicTreatments: item.approvedOrganicTreatments,
        approvedChemicalGuidance: item.approvedChemicalGuidance,
        governanceStatus: item.governanceStatus,
        evidenceLevel: item.evidenceLevel,
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl || null,
        authorName: item.authorName,
        authorId: item.authorId || null,
        reviewedByExpertName: item.reviewedByExpertName || null,
        reviewedByExpertId: item.reviewedByExpertId || null,
        publishedAt: item.publishedAt || null,
        reviewDueDate: item.reviewDueDate || null,
        updatedAt: item.updatedAt,
      })
      .run();
    return item;
  }

  public updateKnowledge(id: string, updates: Partial<AgriculturalKnowledgeItem>): AgriculturalKnowledgeItem | undefined {
    const rows = dbConnection
      .select()
      .from(schema.agriculturalKnowledge)
      .where(eq(schema.agriculturalKnowledge.id, id))
      .all();
    if (rows.length === 0) return undefined;
    const current = rows[0];
    const next = { ...current, ...updates, updatedAt: new Date().toISOString() };
    dbConnection
      .update(schema.agriculturalKnowledge)
      .set({
        cropId: next.cropId,
        cropName: next.cropName,
        topic: next.topic,
        category: next.category,
        symptomsDescription: next.symptomsDescription,
        preventativeMeasures: next.preventativeMeasures,
        approvedOrganicTreatments: next.approvedOrganicTreatments,
        approvedChemicalGuidance: next.approvedChemicalGuidance,
        governanceStatus: next.governanceStatus,
        evidenceLevel: next.evidenceLevel,
        sourceName: next.sourceName,
        sourceUrl: next.sourceUrl || null,
        authorName: next.authorName,
        authorId: next.authorId || null,
        reviewedByExpertName: next.reviewedByExpertName || null,
        reviewedByExpertId: next.reviewedByExpertId || null,
        publishedAt: next.publishedAt || null,
        reviewDueDate: next.reviewDueDate || null,
        updatedAt: next.updatedAt,
      })
      .where(eq(schema.agriculturalKnowledge.id, id))
      .run();
    return next as any;
  }

  public addFeedback(fb: FarmerFeedbackItem): FarmerFeedbackItem {
    dbConnection
      .insert(schema.farmerFeedback)
      .values({
        id: fb.id,
        observationId: fb.observationId,
        farmerId: fb.farmerId,
        farmerName: fb.farmerName,
        category: fb.category,
        notes: fb.notes,
        resolved: fb.resolved ? 1 : 0,
        createdAt: fb.createdAt,
      })
      .run();
    return fb;
  }

  public getFeedback(): FarmerFeedbackItem[] {
    const rows = dbConnection.select().from(schema.farmerFeedback).all();
    return rows
      .map((r) => ({
        id: r.id,
        observationId: r.observationId,
        farmerId: r.farmerId,
        farmerName: r.farmerName,
        category: r.category as any,
        notes: r.notes,
        resolved: r.resolved === 1,
        createdAt: r.createdAt,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addAuditLog(log: SystemAuditLog): SystemAuditLog {
    dbConnection
      .insert(schema.auditLogs)
      .values({
        id: log.id,
        actorId: log.actorId,
        actorName: log.actorName,
        actorRole: log.actorRole,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        timestamp: log.timestamp,
      })
      .run();
    return log;
  }

  public getAuditLogs(): SystemAuditLog[] {
    const rows = dbConnection.select().from(schema.auditLogs).all();
    return rows
      .map((r) => ({
        id: r.id,
        actorId: r.actorId,
        actorName: r.actorName,
        actorRole: r.actorRole as any,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        details: r.details,
        timestamp: r.timestamp,
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getThresholds(): RoutingThresholdsConfig {
    const r = dbConnection
      .select()
      .from(schema.routingThresholds)
      .where(eq(schema.routingThresholds.id, 'config_default'))
      .get();
    if (!r) return INITIAL_THRESHOLDS;
    return {
      aiHighConfidenceCutoff: r.aiHighConfidenceCutoff,
      aiMediumConfidenceCutoff: r.aiMediumConfidenceCutoff,
      rapidDeclineThresholdScore: r.rapidDeclineThresholdScore,
      highRiskDiseases: JSON.parse(r.highRiskDiseases),
      mandatoryChemicalReview: r.mandatoryChemicalReview === 1,
      autoEscalateDisagreement: r.autoEscalateDisagreement === 1,
      knowledgePeriodicReviewDays: r.knowledgePeriodicReviewDays,
    };
  }

  public updateThresholds(t: Partial<RoutingThresholdsConfig>): RoutingThresholdsConfig {
    const current = this.getThresholds();
    const next = { ...current, ...t };

    const exists = dbConnection
      .select()
      .from(schema.routingThresholds)
      .where(eq(schema.routingThresholds.id, 'config_default'))
      .get();
    if (exists) {
      dbConnection
        .update(schema.routingThresholds)
        .set({
          aiHighConfidenceCutoff: next.aiHighConfidenceCutoff,
          aiMediumConfidenceCutoff: next.aiMediumConfidenceCutoff,
          rapidDeclineThresholdScore: next.rapidDeclineThresholdScore,
          highRiskDiseases: JSON.stringify(next.highRiskDiseases),
          mandatoryChemicalReview: next.mandatoryChemicalReview ? 1 : 0,
          autoEscalateDisagreement: next.autoEscalateDisagreement ? 1 : 0,
          knowledgePeriodicReviewDays: next.knowledgePeriodicReviewDays || 365,
        })
        .where(eq(schema.routingThresholds.id, 'config_default'))
        .run();
    } else {
      dbConnection
        .insert(schema.routingThresholds)
        .values({
          id: 'config_default',
          aiHighConfidenceCutoff: next.aiHighConfidenceCutoff,
          aiMediumConfidenceCutoff: next.aiMediumConfidenceCutoff,
          rapidDeclineThresholdScore: next.rapidDeclineThresholdScore,
          highRiskDiseases: JSON.stringify(next.highRiskDiseases),
          mandatoryChemicalReview: next.mandatoryChemicalReview ? 1 : 0,
          autoEscalateDisagreement: next.autoEscalateDisagreement ? 1 : 0,
          knowledgePeriodicReviewDays: next.knowledgePeriodicReviewDays || 365,
        })
        .run();
    }
    return next;
  }
}

export const db = new CropWatchDatabase();
export { INITIAL_USERS, INITIAL_FARMS, INITIAL_FIELDS, INITIAL_PLANTINGS, INITIAL_OBSERVATIONS };
