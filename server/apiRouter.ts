import express, { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { analyzeCropObservation } from './aiService.js';
import { getCountyWeather } from './weatherService.js';
import { uploadImage } from './s3Service.js';
import {
  hashPassword,
  comparePassword,
  createSessionToken,
  verifySessionToken,
  extractTokenFromRequest,
  setSessionCookie,
  clearSessionCookie,
  isDemoModeEnabled,
} from './auth.js';
import {
  verifySupabaseToken,
  checkSupabaseStatus,
  trySyncRecordToSupabase,
} from './supabase.js';
import {
  User,
  Farm,
  Field,
  CropPlanting,
  PlantObservation,
  ExpertReviewCase,
  ExpertAssessment,
  FarmerFeedbackItem,
  SystemAuditLog,
  AgriculturalKnowledgeItem,
  UserRole,
} from '../src/types.js';

export const apiRouter = express.Router();

// --- AUTHENTICATION RESOLUTION MIDDLEWARE ---
apiRouter.use(async (req: Request, res: Response, next: NextFunction) => {
  const token = extractTokenFromRequest(req);
  if (token) {
    // 1. First attempt verifying as local signed session JWT
    const payload = verifySessionToken(token);
    if (payload && payload.userId) {
      const user = db.getUserById(payload.userId);
      if (user) {
        (req as any).user = user;
        return next();
      }
    }

    // 2. If not local or local failed, verify as Supabase Auth Bearer/Access token
    try {
      const sbUser = await verifySupabaseToken(token);
      if (sbUser) {
        let appUser = db.getUsers().find(
          (u) => u.supabaseId === sbUser.id || (u.email && sbUser.email && u.email.toLowerCase() === sbUser.email.toLowerCase())
        );

        if (!appUser) {
          const meta = sbUser.user_metadata || {};
          appUser = {
            id: `usr_sb_${sbUser.id.substring(0, 8)}`,
            email: sbUser.email || '',
            fullName: meta.full_name || meta.fullName || sbUser.email?.split('@')[0] || 'Farmer',
            role: (meta.role as UserRole) || 'farmer',
            county: meta.county || 'Bong',
            organization: meta.organization,
            createdAt: sbUser.created_at || new Date().toISOString(),
            supabaseId: sbUser.id,
          };
          db.addUser(appUser);
          if (appUser.role === 'expert' || appUser.role === 'senior_expert') {
            db.addExpertProfile({
              userId: appUser.id,
              fullName: appUser.fullName,
              organization: appUser.organization || 'Agricultural Extension Specialist',
              qualification: 'Certified Specialist',
              yearsExperience: 3,
              verificationStatus: 'verified',
              specialties: ['Crop Protection', 'Agronomy'],
              casesReviewedCount: 0,
              avgResponseHours: 1,
            });
          }
        } else if (!appUser.supabaseId) {
          appUser.supabaseId = sbUser.id;
        }

        (req as any).user = appUser;
        (req as any).supabaseUser = sbUser;
        return next();
      }
    } catch (sbErr) {
      // ignore, continue to demo mode fallback
    }
  }

  // Development convenience: only when DEMO_MODE is explicitly enabled and not in production
  if (!(req as any).user && isDemoModeEnabled()) {
    const devUserId = req.headers['x-user-id'] as string;
    if (devUserId) {
      const user = db.getUserById(devUserId);
      if (user) {
        (req as any).user = user;
      }
    }
  }

  next();
});

// Guard: Require authenticated user (returns 401)
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in with your credentials.',
    });
  }
  next();
}

// Guard: Require specific roles (returns 403)
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User | undefined;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.',
      });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of: ${allowedRoles.join(', ')}.`,
      });
    }
    next();
  };
}

// --- AUTHENTICATION ENDPOINTS ---

apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  const { fullName, email, password, role, county, organization, qualification, yearsExperience } = req.body;
  if (!fullName || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Full name, email, and password are required to create an account.',
    });
  }

  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters long.',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.getUserByEmail(normalizedEmail);
  if (existing) {
    return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
  }

  const passwordHash = await hashPassword(password);
  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    email: normalizedEmail,
    fullName: fullName.trim(),
    role: role || 'farmer',
    county: county || 'Bong',
    organization,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  db.addUser(newUser);

  if (newUser.role === 'expert' || newUser.role === 'senior_expert') {
    db.addExpertProfile({
      userId: newUser.id,
      fullName: newUser.fullName,
      organization: organization || 'Independent Consultant',
      qualification: qualification || 'BSc Agronomy',
      yearsExperience: Number(yearsExperience) || 2,
      verificationStatus: 'pending', // must be reviewed by admin
      specialties: ['General Agronomy', 'Crop Protection'],
      casesReviewedCount: 0,
      avgResponseHours: 0,
    });
  }

  const token = createSessionToken(newUser);
  setSessionCookie(res, token);

  const expertProfile = newUser.role !== 'farmer' ? db.getExpertProfileByUserId(newUser.id) : undefined;
  res.json({
    success: true,
    token,
    user: db.getSafeUser(newUser),
    expertProfile,
  });
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.getUserByEmail(normalizedEmail);
  if (!user || !user.passwordHash) {
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }

  const token = createSessionToken(user);
  setSessionCookie(res, token);

  const expertProfile = user.role !== 'farmer' ? db.getExpertProfileByUserId(user.id) : undefined;

  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'USER_LOGGED_IN',
    entityType: 'user',
    entityId: user.id,
    details: `User ${user.fullName} logged in successfully`,
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    token,
    user: db.getSafeUser(user),
    expertProfile,
  });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ success: true, message: 'Logged out successfully.' });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = (req as any).user as User | undefined;
  const demoEnabled = isDemoModeEnabled();

  if (!user) {
    return res.json({
      success: true,
      authenticated: false,
      user: null,
      isDemoMode: demoEnabled,
      allDemoUsers: demoEnabled ? db.getSafeUsers() : undefined,
    });
  }

  const expertProfile = user.role !== 'farmer' ? db.getExpertProfileByUserId(user.id) : undefined;
  res.json({
    success: true,
    authenticated: true,
    user: db.getSafeUser(user),
    expertProfile,
    isDemoMode: demoEnabled,
    allDemoUsers: demoEnabled ? db.getSafeUsers() : undefined,
  });
});

apiRouter.post('/auth/switch-demo-user', (req: Request, res: Response) => {
  if (!isDemoModeEnabled()) {
    return res.status(403).json({
      success: false,
      error: 'Demo user switcher is disabled outside of local development DEMO_MODE.',
    });
  }

  const { userId } = req.body;
  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const token = createSessionToken(user);
  setSessionCookie(res, token);
  const expertProfile = user.role !== 'farmer' ? db.getExpertProfileByUserId(user.id) : undefined;

  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'USER_SWITCHED_SESSION',
    entityType: 'user',
    entityId: user.id,
    details: `[DEMO_MODE] Session switched to ${user.fullName} (${user.role})`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, token, user: db.getSafeUser(user), expertProfile });
});

// --- SUPABASE AUTHENTICATION & STATUS INTEGRATION ---

apiRouter.post('/auth/supabase-session', async (req: Request, res: Response) => {
  const { accessToken, user: clientUser } = req.body;
  if (!accessToken) {
    return res.status(400).json({ success: false, error: 'Supabase accessToken is required.' });
  }

  const sbUser = await verifySupabaseToken(accessToken);
  if (!sbUser) {
    return res.status(401).json({ success: false, error: 'Invalid or expired Supabase token.' });
  }

  // Find or create application user
  let user = db.getUsers().find(
    (u) => u.supabaseId === sbUser.id || (u.email && sbUser.email && u.email.toLowerCase() === sbUser.email.toLowerCase())
  );
  const meta = sbUser.user_metadata || clientUser?.user_metadata || {};

  if (!user) {
    user = {
      id: `usr_sb_${sbUser.id.substring(0, 8)}`,
      email: sbUser.email || '',
      fullName: meta.full_name || meta.fullName || sbUser.email?.split('@')[0] || 'Farmer',
      role: (meta.role as UserRole) || 'farmer',
      county: meta.county || 'Bong',
      organization: meta.organization,
      createdAt: sbUser.created_at || new Date().toISOString(),
      supabaseId: sbUser.id,
    };
    db.addUser(user);
    if (user.role === 'expert' || user.role === 'senior_expert') {
      db.addExpertProfile({
        userId: user.id,
        fullName: user.fullName,
        organization: user.organization || 'Agricultural Extension Specialist',
        qualification: 'Certified Specialist',
        yearsExperience: 3,
        verificationStatus: 'verified',
        specialties: ['Crop Protection', 'Agronomy'],
        casesReviewedCount: 0,
        avgResponseHours: 1,
      });
    }
  } else {
    user.supabaseId = sbUser.id;
    if (meta.full_name && !user.fullName) user.fullName = meta.full_name;
    if (meta.role && user.role !== meta.role) user.role = meta.role;
    if (meta.county && user.county !== meta.county) user.county = meta.county;
  }

  // Sync profile to Supabase database if profiles table exists
  trySyncRecordToSupabase('profiles', {
    id: sbUser.id,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
    county: user.county,
    organization: user.organization || null,
  }).catch(() => {});

  const token = createSessionToken(user);
  setSessionCookie(res, token);

  const expertProfile = user.role !== 'farmer' ? db.getExpertProfileByUserId(user.id) : undefined;

  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'SUPABASE_USER_AUTHENTICATED',
    entityType: 'user',
    entityId: user.id,
    details: `Authenticated via Supabase Auth (${sbUser.id})`,
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    user: db.getSafeUser(user),
    expertProfile,
    token,
    supabaseId: sbUser.id,
  });
});

apiRouter.get('/supabase/status', async (req: Request, res: Response) => {
  const status = await checkSupabaseStatus();
  res.json({
    success: true,
    status,
  });
});

// --- CROPS & VARIETIES (Reference Data) ---
apiRouter.get('/crops', (req: Request, res: Response) => {
  const crops = db.getCrops();
  res.json({ success: true, crops });
});

apiRouter.get('/varieties', (req: Request, res: Response) => {
  const cropId = req.query.cropId as string;
  const varieties = db.getVarieties(cropId);
  res.json({ success: true, varieties });
});

// --- FARMS & FIELDS (Authorization Protected) ---
apiRouter.get('/farms', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role === 'farmer') {
    const farms = db.getFarms(user.id);
    return res.json({ success: true, farms });
  }
  const targetUserId = req.query.userId as string | undefined;
  const farms = targetUserId ? db.getFarms(targetUserId) : db.getFarms();
  res.json({ success: true, farms });
});

apiRouter.get('/farms/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const farm = db.getFarmById(req.params.id);
  if (!farm) {
    return res.status(404).json({ success: false, error: 'Farm not found' });
  }
  if (user.role === 'farmer' && farm.userId !== user.id) {
    return res.status(403).json({ success: false, error: 'Access denied. You do not own this farm.' });
  }
  res.json({ success: true, farm });
});

apiRouter.post('/farms', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { name, county, district, sizeHectares, soilType, irrigationSource, userId } = req.body;
  if (!name || !county) {
    return res.status(400).json({ success: false, error: 'Farm name and county are required.' });
  }

  let farmOwnerId = user.id;
  if (user.role === 'admin' && userId) {
    farmOwnerId = userId;
  } else if (user.role === 'farmer' && userId && userId !== user.id) {
    return res.status(403).json({ success: false, error: 'Farmers cannot create farms for other users.' });
  }

  const newFarm: Farm = {
    id: `farm_${Date.now()}`,
    userId: farmOwnerId,
    name,
    county,
    district: district || 'Central District',
    sizeHectares: Number(sizeHectares) || 1.0,
    soilType: soilType || 'Red laterite / loam',
    irrigationSource: irrigationSource || 'Rainfed & local stream',
    createdAt: new Date().toISOString(),
  };

  db.addFarm(newFarm);
  res.json({ success: true, farm: newFarm });
});

apiRouter.get('/fields', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const farmId = req.query.farmId as string | undefined;

  if (farmId) {
    const farm = db.getFarmById(farmId);
    if (!farm) {
      return res.status(404).json({ success: false, error: 'Farm not found' });
    }
    if (user.role === 'farmer' && farm.userId !== user.id) {
      return res.status(403).json({ success: false, error: 'Access denied. You do not own this farm.' });
    }
    const fields = db.getFields(farmId);
    return res.json({ success: true, fields });
  }

  if (user.role === 'farmer') {
    const userFarms = db.getFarms(user.id).map((f) => f.id);
    const fields = db.getFields().filter((fld) => userFarms.includes(fld.farmId));
    return res.json({ success: true, fields });
  }

  const fields = db.getFields();
  res.json({ success: true, fields });
});

apiRouter.post('/fields', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { farmId, name, areaHectares, topography } = req.body;
  if (!farmId || !name) {
    return res.status(400).json({ success: false, error: 'farmId and field name are required.' });
  }

  const farm = db.getFarmById(farmId);
  if (!farm) {
    return res.status(404).json({ success: false, error: 'Farm not found.' });
  }
  if (user.role === 'farmer' && farm.userId !== user.id) {
    return res.status(403).json({ success: false, error: 'Access denied. You do not own this farm.' });
  }

  const newField: Field = {
    id: `fld_${Date.now()}`,
    farmId,
    name,
    areaHectares: Number(areaHectares) || 0.5,
    topography: topography || 'Gentle slope',
    createdAt: new Date().toISOString(),
  };

  db.addField(newField);
  res.json({ success: true, field: newField });
});

// --- PLANTINGS (Authorization Protected) ---
apiRouter.get('/plantings', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const plantings = user.role === 'farmer' ? db.getPlantings(user.id) : db.getPlantings(req.query.userId as string);
  res.json({ success: true, plantings });
});

apiRouter.get('/plantings/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const planting = db.getPlantingById(req.params.id);
  if (!planting) {
    return res.status(404).json({ success: false, error: 'Planting record not found' });
  }

  const farm = db.getFarmById(planting.farmId);
  if (user.role === 'farmer' && farm?.userId !== user.id) {
    return res.status(403).json({ success: false, error: 'Access denied. You do not own this planting.' });
  }

  res.json({ success: true, planting });
});

apiRouter.post('/plantings', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { fieldId, farmId, cropId, cropName, varietyId, varietyName, plantingDate, currentGrowthStage } = req.body;
  if (!farmId || !cropId || !plantingDate) {
    return res.status(400).json({ success: false, error: 'farmId, cropId and plantingDate are required.' });
  }

  const farm = db.getFarmById(farmId);
  if (!farm) {
    return res.status(404).json({ success: false, error: 'Farm not found' });
  }
  if (user.role === 'farmer' && farm.userId !== user.id) {
    return res.status(403).json({ success: false, error: 'Access denied. You do not own this farm.' });
  }

  const crop = db.getCrops().find((c) => c.id === cropId);
  const durationMin = crop?.growthDurationDaysMin || 90;
  const durationMax = crop?.growthDurationDaysMax || 180;

  const pDate = new Date(plantingDate);
  const harvestStart = new Date(pDate.getTime() + durationMin * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const harvestEnd = new Date(pDate.getTime() + durationMax * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const newPlanting: CropPlanting = {
    id: `plt_${Date.now()}`,
    fieldId: fieldId || 'fld_default',
    farmId,
    cropId,
    cropName: cropName || crop?.name || 'Crop',
    varietyId,
    varietyName,
    plantingDate,
    expectedHarvestStart: harvestStart,
    expectedHarvestEnd: harvestEnd,
    status: 'active',
    currentGrowthStage: currentGrowthStage || 'Vegetative Stage',
    observationCount: 0,
    createdAt: new Date().toISOString(),
  };

  db.addPlanting(newPlanting);
  res.json({ success: true, planting: newPlanting });
});

// --- OBSERVATIONS & AI INGESTION (Authorization Protected) ---
apiRouter.get('/observations', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const plantingId = req.query.plantingId as string | undefined;

  if (plantingId) {
    const planting = db.getPlantingById(plantingId);
    if (!planting) {
      return res.status(404).json({ success: false, error: 'Planting not found' });
    }
    const farm = db.getFarmById(planting.farmId);
    if (user.role === 'farmer' && farm?.userId !== user.id) {
      return res.status(403).json({ success: false, error: 'Access denied. You do not own this planting.' });
    }
    const observations = db.getObservations(plantingId);
    return res.json({ success: true, observations });
  }

  if (user.role === 'farmer') {
    const observations = db.getObservations().filter((o) => o.farmerId === user.id);
    return res.json({ success: true, observations });
  }

  const observations = db.getObservations();
  res.json({ success: true, observations });
});

apiRouter.get('/observations/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const obs = db.getObservationById(req.params.id);
  if (!obs) {
    return res.status(404).json({ success: false, error: 'Observation not found' });
  }

  if (user.role === 'farmer' && obs.farmerId !== user.id) {
    return res.status(403).json({ success: false, error: 'Access denied. You do not own this observation.' });
  }

  const expertCase = db.getExpertCases().find((c) => c.observationId === obs.id);
  if (user.role === 'expert') {
    if (expertCase && expertCase.assignedExpertId && expertCase.assignedExpertId !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Case associated with observation is assigned to another specialist.',
      });
    }
  }

  const assessments = expertCase ? db.getAssessments(expertCase.id) : [];

  res.json({
    success: true,
    observation: obs,
    expertCase,
    assessments,
  });
});

apiRouter.post('/observations', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { plantingId, notes, farmerReportedSymptoms, imageBase64OrUrl } = req.body;

  if (!plantingId) {
    return res.status(400).json({ success: false, error: 'plantingId is required' });
  }

  const planting = db.getPlantingById(plantingId);
  if (!planting) {
    return res.status(404).json({ success: false, error: 'Planting record not found' });
  }

  const farm = db.getFarmById(planting.farmId);
  if (user.role === 'farmer' && farm?.userId !== user.id) {
    return res.status(403).json({ success: false, error: 'Access denied. You do not own this planting.' });
  }

  // Daily AI analysis rate limiter check
  const dailyLimit = parseInt(process.env.DAILY_AI_ANALYSES_LIMIT || '5', 10);
  const last24hObs = db.getObservations().filter((obs) => {
    if (obs.farmerId !== user.id) return false;
    const obsTime = new Date(obs.observedAt).getTime();
    return (Date.now() - obsTime) < 24 * 60 * 60 * 1000;
  });

  if (last24hObs.length >= dailyLimit) {
    console.warn(`⚠️ Daily rate limit hit for farmer ${user.id} (${user.email}): ${last24hObs.length} analyses in 24h. Limit: ${dailyLimit}`);
    return res.status(429).json({
      success: false,
      error: 'Daily limit reached. You have reached your daily limit of AI crop analyses. Please try again tomorrow, or contact an agricultural extension office for immediate assistance.',
    });
  }

  const county = farm?.county || user.county || 'Bong';
  const weather = await getCountyWeather(county);
  const prevObs = db.getObservations(planting.id);

  // Compress -> Upload -> Analyze -> Save sequence:
  let storedImageUrl = 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22d57?auto=format&fit=crop&w=800&q=80';
  let imageSize = 0;
  let imageMimeType = 'image/jpeg';

  if (imageBase64OrUrl) {
    try {
      const uploadResult = await uploadImage(imageBase64OrUrl, `obs_${plantingId}`);
      storedImageUrl = uploadResult.url;
      imageSize = uploadResult.size;
      imageMimeType = uploadResult.mimeType;
      console.log(`📸 Image processed and stored at: ${storedImageUrl} (${imageSize} bytes)`);
    } catch (uploadError) {
      console.error('❌ Failed to upload image to object storage:', uploadError);
      storedImageUrl = imageBase64OrUrl;
    }
  }

  const aiResult = await analyzeCropObservation({
    imageBase64OrUrl: storedImageUrl,
    planting,
    farmerNotes: notes,
    farmerReportedSymptoms,
    previousObservations: prevObs,
    weatherCounty: county,
  });

  const obsId = `obs_${Date.now()}`;
  aiResult.observationId = obsId;

  const newObservation: PlantObservation = {
    id: obsId,
    plantingId: planting.id,
    farmerId: user.id,
    observedAt: new Date().toISOString(),
    notes,
    farmerReportedSymptoms,
    images: [
      {
        id: `img_${Date.now()}`,
        observationId: obsId,
        imageUrl: storedImageUrl,
        capturedAt: new Date().toISOString(),
        qualityScore: 0.92,
        isPrimary: true,
        size: imageSize,
        mimeType: imageMimeType,
      } as any,
    ],
    aiAnalysis: aiResult,
    weatherSnapshot: {
      tempC: weather.temperatureC,
      humidity: weather.relativeHumidity,
      rain24hMm: weather.rainfall24hMm,
      description: weather.forecastSummary,
    },
    healthScore: aiResult.isAvailable === false ? null : aiResult.health.score,
    healthStatus: aiResult.isAvailable === false ? 'unknown' : aiResult.health.status,
  };

  if (aiResult.isAvailable !== false && aiResult.health.score !== null && aiResult.health.status !== 'unknown') {
    db.updatePlanting(planting.id, {
      latestHealthScore: aiResult.health.score,
      latestStatus: aiResult.health.status,
      observationCount: planting.observationCount + 1,
      currentGrowthStage: aiResult.growthStage.stage || planting.currentGrowthStage,
    });
  } else {
    db.updatePlanting(planting.id, {
      observationCount: planting.observationCount + 1,
    });
  }

  let createdCase: ExpertReviewCase | undefined;
  if (aiResult.routing.requiresExpertReview) {
    const suggested = db.findSuggestedExpert(planting.cropName, county);
    createdCase = {
      id: `case_${Date.now()}`,
      observationId: obsId,
      plantingId: planting.id,
      farmId: planting.farmId,
      farmerId: user.id,
      farmerName: user.fullName,
      farmerCounty: county,
      cropName: planting.cropName,
      varietyName: planting.varietyName,
      cropAgeDays: Math.floor((Date.now() - new Date(planting.plantingDate).getTime()) / (1000 * 60 * 60 * 24)),
      status: 'queued',
      priority: aiResult.routing.priority,
      triggerType: aiResult.routing.reasons.some((r) => r.toLowerCase().includes('rapid'))
        ? 'rapid_decline'
        : 'high_risk_disease',
      triggerReason: aiResult.routing.reasons.join('; '),
      suggestedExpertId: suggested?.id,
      suggestedExpertName: suggested?.fullName,
      escalationLevel: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.addExpertCase(createdCase);
    newObservation.expertReviewCase = createdCase;

    db.addAuditLog({
      id: `log_${Date.now()}`,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'EXPERT_CASE_ROUTED_AUTOMATICALLY',
      entityType: 'expert_case',
      entityId: createdCase.id,
      details: `Routing triggered: ${createdCase.triggerReason} for ${planting.cropName} in ${county}`,
      timestamp: new Date().toISOString(),
    });
  } else if (aiResult.isAvailable === false) {
    db.addAuditLog({
      id: `log_${Date.now()}`,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'OBSERVATION_SAVED_AI_UNAVAILABLE',
      entityType: 'observation',
      entityId: newObservation.id,
      details: `Observation and photo preserved for ${planting.cropName}. AI analysis unavailable; farmer offered expert review.`,
      timestamp: new Date().toISOString(),
    });
  }

  db.addObservation(newObservation);

  // Background sync to Supabase database if tables exist
  trySyncRecordToSupabase('observations', {
    id: newObservation.id,
    farmer_id: user.supabaseId || null,
    farmer_name: user.fullName,
    planting_id: newObservation.plantingId,
    crop_name: planting.cropName,
    county,
    date_recorded: newObservation.observedAt,
    image_url: newObservation.images[0]?.imageUrl || null,
    farmer_notes: newObservation.notes || null,
    severity: newObservation.healthStatus,
    status: createdCase ? 'pending_review' : 'resolved',
    requires_expert: Boolean(createdCase),
  }).catch(() => {});

  if (createdCase) {
    trySyncRecordToSupabase('expert_cases', {
      id: createdCase.id,
      observation_id: createdCase.observationId,
      farmer_id: user.supabaseId || null,
      farmer_name: createdCase.farmerName,
      county: createdCase.farmerCounty,
      crop_name: createdCase.cropName,
      status: createdCase.status,
      priority: createdCase.priority,
      flag_reason: createdCase.triggerReason,
    }).catch(() => {});
  }

  res.json({
    success: true,
    observation: newObservation,
    expertCase: createdCase,
    analysisAvailable: aiResult.isAvailable !== false,
    message:
      aiResult.isAvailable === false
        ? 'Observation and image preserved. AI analysis could not be completed. You can request certified expert review.'
        : undefined,
  });
});

apiRouter.post(['/observations/:id/request-expert', '/expert/request-review'], requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const observationId = req.params.id || req.body.observationId;
  if (!observationId) {
    return res.status(400).json({ success: false, error: 'observationId is required' });
  }
  const obs = db.getObservationById(observationId);
  if (!obs) {
    return res.status(404).json({ success: false, error: 'Observation not found' });
  }

  if (user.role === 'farmer' && obs.farmerId !== user.id) {
    return res.status(403).json({ success: false, error: 'Access denied. You do not own this observation.' });
  }

  const existingCase = db.getExpertCases().find((c) => c.observationId === obs.id);
  if (existingCase) {
    return res.json({ success: true, expertCase: existingCase, case: existingCase, message: 'Case already queued for review.' });
  }

  const planting = db.getPlantingById(obs.plantingId);
  const farm = planting ? db.getFarmById(planting.farmId) : undefined;
  const county = farm?.county || user.county || 'Bong';
  const cropName = planting?.cropName || 'Crop';
  const suggested = db.findSuggestedExpert(cropName, county);

  const newCase: ExpertReviewCase = {
    id: `case_${Date.now()}`,
    observationId: obs.id,
    plantingId: obs.plantingId,
    farmId: planting?.farmId || 'farm_default',
    farmerId: user.id,
    farmerName: user.fullName,
    farmerCounty: county,
    cropName: cropName,
    varietyName: planting?.varietyName,
    cropAgeDays: planting
      ? Math.floor((Date.now() - new Date(planting.plantingDate).getTime()) / (1000 * 60 * 60 * 24))
      : 60,
    status: 'requested',
    priority: 'medium',
    triggerType: 'farmer_request',
    triggerReason: req.body.reason || 'Farmer explicitly requested human agronomic specialist review.',
    suggestedExpertId: suggested?.id,
    suggestedExpertName: suggested?.fullName,
    escalationLevel: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addExpertCase(newCase);
  obs.expertReviewCase = newCase;
  db.updateObservation(obs.id, { expertReviewCase: newCase });

  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'FARMER_REQUESTED_EXPERT_REVIEW',
    entityType: 'expert_case',
    entityId: newCase.id,
    details: `Farmer ${user.fullName} requested review for observation ${obs.id}`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, expertCase: newCase, case: newCase });
});

// --- EXPERT REVIEW SYSTEM (Authorization Protected) ---
apiRouter.get('/expert/cases', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const status = req.query.status as string | undefined;
  let allCases = db.getExpertCases(status);

  if (user.role === 'farmer') {
    // Farmer only sees their own cases
    allCases = allCases.filter((c) => c.farmerId === user.id);
  } else if (user.role === 'expert') {
    // Expert may only view cases that are unassigned or assigned to them
    allCases = allCases.filter((c) => !c.assignedExpertId || c.assignedExpertId === user.id);
  }
  // senior_expert and admin can view all cases

  res.json({ success: true, cases: allCases });
});

apiRouter.get('/expert/cases/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const c = db.getExpertCaseById(req.params.id);
  if (!c) {
    return res.status(404).json({ success: false, error: 'Case not found' });
  }

  if (user.role === 'farmer' && c.farmerId !== user.id) {
    return res.status(403).json({ success: false, error: 'Access denied. You do not own this review case.' });
  }

  if (user.role === 'expert') {
    if (c.assignedExpertId && c.assignedExpertId !== user.id) {
      return res.status(403).json({ success: false, error: 'Access denied. Case is assigned to another specialist.' });
    }
  }

  const observation = db.getObservationById(c.observationId);
  const planting = observation ? db.getPlantingById(observation.plantingId) : undefined;
  const farm = planting ? db.getFarmById(planting.farmId) : undefined;
  const farmer = db.getUserById(c.farmerId);
  const assessments = db.getAssessments(c.id);
  const history = planting ? db.getObservations(planting.id) : [];

  res.json({
    success: true,
    case: c,
    observation,
    planting,
    farm,
    farmer: farmer ? db.getSafeUser(farmer) : undefined,
    assessments,
    history,
  });
});

apiRouter.post('/expert/cases/:id/claim', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const c = db.getExpertCaseById(req.params.id);
  if (!c) {
    return res.status(404).json({ success: false, error: 'Case not found' });
  }

  // Role check: Only verified expert or senior_expert
  if (user.role === 'farmer' || user.role === 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Only verified agricultural experts or senior experts can claim review cases.',
    });
  }

  if (user.role === 'expert') {
    const profile = db.getExpertProfileByUserId(user.id);
    if (profile?.verificationStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        error: 'Your expert account is pending admin verification. Only verified agricultural experts can claim review cases.',
      });
    }
  }

  // Case check: Case must be unassigned or already assigned to this user
  if (c.assignedExpertId && c.assignedExpertId !== user.id) {
    return res.status(403).json({
      success: false,
      error: 'Case is already claimed by another specialist.',
    });
  }

  const updated = db.updateExpertCase(c.id, {
    status: 'in_review',
    assignedExpertId: user.id,
    assignedExpertName: user.fullName,
    assignedAt: new Date().toISOString(),
  });

  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'EXPERT_CLAIMED_CASE',
    entityType: 'expert_case',
    entityId: c.id,
    details: `Expert ${user.fullName} claimed case ${c.id} for review.`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, case: updated });
});

apiRouter.post(['/expert/cases/:id/assessment', '/expert/cases/:id/assess'], requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const c = db.getExpertCaseById(req.params.id);
  if (!c) {
    return res.status(404).json({ success: false, error: 'Case not found' });
  }

  // Role check: Only verified expert or senior_expert
  if (user.role === 'farmer' || user.role === 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Only verified agricultural experts or senior experts can submit assessments.',
    });
  }

  const profile = db.getExpertProfileByUserId(user.id);
  if (user.role === 'expert') {
    if (profile?.verificationStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        error: 'Your expert account is pending admin verification. Only verified agricultural experts can sign official assessments.',
      });
    }

    if (c.assignedExpertId && c.assignedExpertId !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You are not the assigned specialist for this case.',
      });
    }
  }

  const {
    cropConfirmed,
    correctedCropName,
    verifiedCondition,
    decision,
    severity,
    expertConfidence,
    actionRecommendations,
    farmerExplanation,
    internalNotes,
  } = req.body;

  if (!verifiedCondition || !actionRecommendations || !farmerExplanation) {
    return res.status(400).json({
      success: false,
      error: 'Verified condition, recommended actions, and farmer explanation are required.',
    });
  }

  const previousAssessments = db.getAssessments(c.id);
  const nextVersion = previousAssessments.length + 1;

  const assessment: ExpertAssessment = {
    id: `asmt_${Date.now()}`,
    caseId: c.id,
    observationId: c.observationId,
    expertId: user.id,
    expertName: user.fullName,
    expertOrganization: profile?.organization || user.organization || 'Agricultural Extension Service',
    expertRole: user.role === 'senior_expert' ? 'Senior Agricultural Specialist' : 'Agricultural Specialist',
    version: nextVersion,
    isCurrent: true,
    cropConfirmed: cropConfirmed ?? true,
    correctedCropName,
    verifiedCondition,
    decision: decision || 'confirmed',
    severity: severity || 'moderate',
    expertConfidence: expertConfidence || 'high',
    actionRecommendations: Array.isArray(actionRecommendations)
      ? actionRecommendations.join('\n')
      : actionRecommendations,
    farmerExplanation,
    internalNotes,
    reviewedAt: new Date().toISOString(),
  };

  db.addAssessment(assessment);

  db.updateExpertCase(c.id, {
    status: 'expert_reviewed',
    assignedExpertId: c.assignedExpertId || user.id,
    assignedExpertName: c.assignedExpertName || user.fullName,
    updatedAt: new Date().toISOString(),
  });

  db.updateObservation(c.observationId, {
    latestExpertAssessment: assessment,
  });

  if (profile) {
    db.updateExpertProfile(user.id, {
      casesReviewedCount: profile.casesReviewedCount + 1,
    });
  }

  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'EXPERT_ASSESSMENT_SUBMITTED',
    entityType: 'expert_assessment',
    entityId: assessment.id,
    details: `Expert ${user.fullName} signed assessment v${nextVersion} (Decision: ${assessment.decision}) for case ${c.id}`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, assessment });
});

apiRouter.post('/expert/cases/:id/request-info', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const c = db.getExpertCaseById(req.params.id);
  if (!c) {
    return res.status(404).json({ success: false, error: 'Case not found' });
  }

  if (user.role === 'farmer') {
    return res.status(403).json({ success: false, error: 'Farmers cannot request diagnostic info from review cases.' });
  }

  if (user.role === 'expert') {
    const profile = db.getExpertProfileByUserId(user.id);
    if (profile?.verificationStatus !== 'verified') {
      return res.status(403).json({ success: false, error: 'Only verified experts can manage review cases.' });
    }
    if (c.assignedExpertId && c.assignedExpertId !== user.id) {
      return res.status(403).json({ success: false, error: 'You are not assigned to this case.' });
    }
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, error: 'Message for farmer is required.' });
  }

  const updated = db.updateExpertCase(c.id, {
    status: 'waiting_for_farmer',
    waitingForInfoMessage: message,
    updatedAt: new Date().toISOString(),
  });

  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'EXPERT_REQUESTED_MORE_INFO',
    entityType: 'expert_case',
    entityId: c.id,
    details: `Expert ${user.fullName} requested info: "${message}"`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, case: updated });
});

apiRouter.post('/expert/cases/:id/escalate', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const c = db.getExpertCaseById(req.params.id);
  if (!c) {
    return res.status(404).json({ success: false, error: 'Case not found' });
  }

  if (user.role === 'farmer') {
    return res.status(403).json({ success: false, error: 'Farmers cannot escalate cases.' });
  }

  if (user.role === 'expert') {
    const profile = db.getExpertProfileByUserId(user.id);
    if (profile?.verificationStatus !== 'verified') {
      return res.status(403).json({ success: false, error: 'Only verified experts can manage review cases.' });
    }
    if (c.assignedExpertId && c.assignedExpertId !== user.id) {
      return res.status(403).json({ success: false, error: 'You are not assigned to this case.' });
    }
  }

  const { reason } = req.body;
  const updated = db.updateExpertCase(c.id, {
    status: 'escalated',
    escalationLevel: 2,
    priority: 'urgent',
    assignedExpertId: null,
    assignedExpertName: null,
    assignedAt: null,
    updatedAt: new Date().toISOString(),
  });

  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'CASE_ESCALATED_TO_SENIOR_SPECIALIST',
    entityType: 'expert_case',
    entityId: c.id,
    details: `Case escalated by ${user.fullName}. Reason: ${reason || 'Suspected severe quarantine pest or expert disagreement.'}`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, case: updated });
});

apiRouter.post('/expert/cases/:id/resolve-escalation', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const c = db.getExpertCaseById(req.params.id);
  if (!c) {
    return res.status(404).json({ success: false, error: 'Case not found' });
  }

  if (user.role !== 'senior_expert' && user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Only senior experts or admins can resolve escalated cases.',
    });
  }

  const {
    cropConfirmed,
    correctedCropName,
    verifiedCondition,
    decision,
    severity,
    expertConfidence,
    actionRecommendations,
    farmerExplanation,
    internalNotes,
    escalationResolutionNotes,
  } = req.body;

  if (!verifiedCondition || !actionRecommendations || !farmerExplanation || !escalationResolutionNotes) {
    return res.status(400).json({
      success: false,
      error: 'Verified condition, recommended actions, farmer explanation, and escalation resolution notes are required to resolve an escalation.',
    });
  }

  const profile = db.getExpertProfileByUserId(user.id);
  const previousAssessments = db.getAssessments(c.id);
  const nextVersion = previousAssessments.length + 1;

  const assessment: ExpertAssessment = {
    id: `asmt_${Date.now()}`,
    caseId: c.id,
    observationId: c.observationId,
    expertId: user.id,
    expertName: user.fullName,
    expertOrganization: profile?.organization || user.organization || 'CARI Agronomic Research Lead',
    expertRole: 'Senior Agronomic Specialist',
    version: nextVersion,
    isCurrent: true,
    cropConfirmed: cropConfirmed ?? true,
    correctedCropName,
    verifiedCondition,
    decision: decision || 'confirmed',
    severity: severity || 'critical',
    expertConfidence: expertConfidence || 'high',
    actionRecommendations,
    farmerExplanation,
    internalNotes,
    resolvesEscalation: true,
    escalationResolutionNotes,
    reviewedAt: new Date().toISOString(),
  };

  db.addAssessment(assessment);

  const updatedCase = db.updateExpertCase(c.id, {
    status: 'expert_reviewed',
    assignedExpertId: user.id,
    assignedExpertName: user.fullName,
    assignedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  db.updateObservation(c.observationId, {
    latestExpertAssessment: assessment,
  });

  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'SENIOR_EXPERT_RESOLVED_ESCALATION',
    entityType: 'expert_assessment',
    entityId: assessment.id,
    details: `Senior Expert ${user.fullName} resolved escalation with assessment v${nextVersion}. Decision supersedes original. Notes: ${escalationResolutionNotes}`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, case: updatedCase, assessment });
});

// --- EXPERT PROFILES & ADMIN VERIFICATION (Admin Only) ---
apiRouter.get(['/admin/experts', '/admin/expert-profiles'], requireAuth, requireRoles('admin'), (req: Request, res: Response) => {
  const profiles = db.getExpertProfiles();
  res.json({ success: true, profiles, expertProfiles: profiles });
});

apiRouter.post(['/admin/experts/:userId/verify', '/admin/expert-profiles/:userId/verify'], requireAuth, requireRoles('admin'), (req: Request, res: Response) => {
  const adminUser = (req as any).user as User;
  const { status, verificationNotes, notes } = req.body; // 'verified' | 'rejected' | 'suspended'
  const profile = db.getExpertProfileByUserId(req.params.userId);
  if (!profile) {
    return res.status(404).json({ success: false, error: 'Expert profile not found.' });
  }

  const updated = db.updateExpertProfile(req.params.userId, {
    verificationStatus: status || 'verified',
    verifiedAt: new Date().toISOString(),
    verifiedByAdminName: adminUser.fullName,
  });

  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: adminUser.id,
    actorName: adminUser.fullName,
    actorRole: 'admin',
    action: `EXPERT_VERIFICATION_${(status || 'verified').toUpperCase()}`,
    entityType: 'expert_profile',
    entityId: req.params.userId,
    details: `Admin ${adminUser.fullName} set expert status to ${status}. Notes: ${verificationNotes || notes || 'Credentials checked with CARI/MOA registrar.'}`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, profile: updated });
});

// --- KNOWLEDGE BASE ---
apiRouter.get('/knowledge', (req: Request, res: Response) => {
  const cropId = req.query.cropId as string;
  const items = db.getKnowledge(cropId);
  res.json({ success: true, knowledge: items });
});

apiRouter.post('/knowledge', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role === 'farmer') {
    return res.status(403).json({ success: false, error: 'Farmers cannot author official knowledge base articles.' });
  }

  const {
    cropId,
    cropName,
    topic,
    category,
    symptomsDescription,
    preventativeMeasures,
    approvedOrganicTreatments,
    approvedChemicalGuidance,
    evidenceLevel,
    sourceName,
  } = req.body;

  const newItem: AgriculturalKnowledgeItem = {
    id: `kno_${Date.now()}`,
    cropId: cropId || 'crop_cassava',
    cropName: cropName || 'Cassava',
    topic,
    category: category || 'disease',
    symptomsDescription,
    preventativeMeasures,
    approvedOrganicTreatments,
    approvedChemicalGuidance,
    governanceStatus: 'draft',
    evidenceLevel: evidenceLevel || 'university_extension',
    sourceName: sourceName || 'National Agricultural Research Archives',
    authorName: user.fullName,
    authorId: user.id,
    updatedAt: new Date().toISOString(),
  };

  db.addKnowledge(newItem);

  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'KNOWLEDGE_ARTICLE_CREATED',
    entityType: 'agricultural_knowledge',
    entityId: newItem.id,
    details: `Topic "${newItem.topic}" authored as draft`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, knowledgeItem: newItem });
});

apiRouter.post('/knowledge/:id/submit-for-review', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role === 'farmer') {
    return res.status(403).json({ success: false, error: 'Farmers cannot manage knowledge base articles.' });
  }

  const items = db.getKnowledge();
  const item = items.find((k) => k.id === req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: 'Knowledge article not found.' });
  }

  const updated = db.updateKnowledge(item.id, {
    governanceStatus: 'review',
  });

  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'KNOWLEDGE_SUBMITTED_FOR_REVIEW',
    entityType: 'agricultural_knowledge',
    entityId: item.id,
    details: `Article "${item.topic}" submitted for expert review by ${user.fullName}`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, knowledgeItem: updated });
});

apiRouter.post('/knowledge/:id/validate', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role === 'farmer') {
    return res.status(403).json({ success: false, error: 'Farmers cannot validate knowledge base articles.' });
  }

  const items = db.getKnowledge();
  const item = items.find((k) => k.id === req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: 'Knowledge article not found.' });
  }

  // Author check
  if (item.authorId === user.id) {
    return res.status(403).json({
      success: false,
      error: 'Governance restriction: You cannot review or validate your own authored knowledge articles.',
    });
  }

  const updated = db.updateKnowledge(item.id, {
    governanceStatus: 'validated',
    reviewedByExpertId: user.id,
    reviewedByExpertName: user.fullName,
  });

  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'KNOWLEDGE_ARTICLE_VALIDATED',
    entityType: 'agricultural_knowledge',
    entityId: item.id,
    details: `Article "${item.topic}" validated by expert reviewer ${user.fullName}`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, knowledgeItem: updated });
});

apiRouter.post('/knowledge/:id/publish', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user.role !== 'senior_expert' && user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Only senior experts or administrators can publish validated knowledge base articles.',
    });
  }

  const items = db.getKnowledge();
  const item = items.find((k) => k.id === req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: 'Knowledge article not found.' });
  }

  // Author check
  if (item.authorId === user.id) {
    return res.status(403).json({
      success: false,
      error: 'Governance restriction: You cannot publish your own authored knowledge articles.',
    });
  }

  const thresholds = db.getThresholds();
  const days = thresholds.knowledgePeriodicReviewDays || 365;
  const reviewDueDate = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();

  const updated = db.updateKnowledge(item.id, {
    governanceStatus: 'published',
    publishedAt: new Date().toISOString(),
    reviewDueDate: reviewDueDate,
  });

  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'KNOWLEDGE_ARTICLE_PUBLISHED',
    entityType: 'agricultural_knowledge',
    entityId: item.id,
    details: `Article "${item.topic}" published by ${user.fullName}. Next review due in ${days} days (${reviewDueDate.split('T')[0]})`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, knowledgeItem: updated });
});

// --- FARMER FEEDBACK (Farmer or Admin, Authorization Protected) ---
apiRouter.post(['/feedback', '/observations/:id/feedback'], requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const observationId = req.params.id || req.body.observationId;
  const { category, notes } = req.body;

  if (!observationId || !category) {
    return res.status(400).json({ success: false, error: 'observationId and category are required' });
  }

  const obs = db.getObservationById(observationId);
  if (!obs) {
    return res.status(404).json({ success: false, error: 'Observation not found.' });
  }
  if (user.role === 'farmer' && obs.farmerId !== user.id) {
    return res.status(403).json({ success: false, error: 'Access denied. You do not own this observation.' });
  }

  const fb: FarmerFeedbackItem = {
    id: `fb_${Date.now()}`,
    observationId,
    farmerId: user.id,
    farmerName: user.fullName,
    category,
    notes: notes || '',
    resolved: false,
    createdAt: new Date().toISOString(),
  };

  db.addFeedback(fb);

  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'FARMER_FEEDBACK_SUBMITTED',
    entityType: 'farmer_feedback',
    entityId: fb.id,
    details: `Farmer disputed AI diagnosis: category ${category}. Notes: ${notes}`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, feedback: fb });
});

// --- ADMIN SYSTEM & AUDIT LOGS (Admin / Senior Expert Only) ---
apiRouter.get('/admin/thresholds', requireAuth, requireRoles('admin'), (req: Request, res: Response) => {
  res.json({ success: true, thresholds: db.getThresholds() });
});

apiRouter.put('/admin/thresholds', requireAuth, requireRoles('admin'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const updated = db.updateThresholds(req.body);
  db.addAuditLog({
    id: `log_${Date.now()}`,
    actorId: user.id,
    actorName: user.fullName,
    actorRole: 'admin',
    action: 'THRESHOLDS_CONFIG_MODIFIED',
    entityType: 'routing_config',
    entityId: 'global',
    details: `Confidence threshold: ${updated.aiMediumConfidenceCutoff}, Rapid decline: ${updated.rapidDeclineThresholdScore}`,
    timestamp: new Date().toISOString(),
  });
  res.json({ success: true, thresholds: updated });
});

apiRouter.get('/admin/audit-logs', requireAuth, requireRoles('admin', 'senior_expert'), (req: Request, res: Response) => {
  res.json({ success: true, logs: db.getAuditLogs() });
});

apiRouter.get('/admin/evaluation', requireAuth, requireRoles('admin', 'senior_expert'), (req: Request, res: Response) => {
  const observations = db.getObservations();
  const cases = db.getExpertCases();
  const assessments = db.getAssessments();
  const crops = db.getCrops();

  // Calculate model vs expert concordance from real stored assessments
  let reviewedCount = 0;
  let agreedCount = 0;
  let modifiedCount = 0;
  let rejectedCount = 0;

  // Track per-crop metrics from real stored expert assessments
  const cropStats: Record<
    string,
    { sampleSize: number; agreedCount: number; modifiedCount: number; rejectedCount: number }
  > = {};

  // Seed with all known monitored crops
  crops.forEach((c) => {
    cropStats[c.name] = { sampleSize: 0, agreedCount: 0, modifiedCount: 0, rejectedCount: 0 };
  });

  assessments.forEach((a) => {
    reviewedCount++;
    const isAgreed = a.decision === 'confirmed';
    const isModified = a.decision === 'modified';
    const isRejected = a.decision === 'rejected';

    if (isAgreed) agreedCount++;
    else if (isModified) modifiedCount++;
    else if (isRejected) rejectedCount++;

    // Find crop for this assessment
    const expertCase = cases.find((c) => c.id === a.caseId);
    const obs = observations.find((o) => o.id === a.observationId);
    const planting = obs ? db.getPlantingById(obs.plantingId) : undefined;
    const rawCropName = expertCase?.cropName || planting?.cropName || 'Other';

    // Map to normalized crop name if matching known crop
    const matchedCrop = crops.find(
      (c) =>
        c.name.toLowerCase() === rawCropName.toLowerCase() ||
        rawCropName.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(rawCropName.toLowerCase())
    );
    const cropKey = matchedCrop ? matchedCrop.name : rawCropName;

    if (!cropStats[cropKey]) {
      cropStats[cropKey] = { sampleSize: 0, agreedCount: 0, modifiedCount: 0, rejectedCount: 0 };
    }

    cropStats[cropKey].sampleSize++;
    if (isAgreed) cropStats[cropKey].agreedCount++;
    else if (isModified) cropStats[cropKey].modifiedCount++;
    else if (isRejected) cropStats[cropKey].rejectedCount++;
  });

  const accuracyRate =
    reviewedCount >= 5
      ? Math.round((agreedCount / reviewedCount) * 100)
      : null;

  // Build accuracyByCrop array computed ONLY from actual stored expert assessments
  const accuracyByCrop = Object.entries(cropStats).map(([crop, stats]) => {
    const hasSufficientData = stats.sampleSize >= 5;
    const concordancePct =
      hasSufficientData && stats.sampleSize > 0
        ? Math.round((stats.agreedCount / stats.sampleSize) * 100)
        : null;

    return {
      crop,
      sampleSize: stats.sampleSize,
      agreedCount: stats.agreedCount,
      modifiedCount: stats.modifiedCount,
      rejectedCount: stats.rejectedCount,
      concordancePct,
      concordanceStatus: hasSufficientData ? `${concordancePct}%` : 'Insufficient data',
      status: hasSufficientData ? 'sufficient' : 'insufficient_data',
    };
  });

  res.json({
    success: true,
    metrics: {
      totalObservations: observations.length,
      totalExpertCases: cases.length,
      totalCompletedReviews: reviewedCount,
      aiExpertConcordanceRate: accuracyRate,
      concordanceStatus:
        reviewedCount >= 5
          ? `${accuracyRate}%`
          : reviewedCount > 0
          ? `${accuracyRate}% (<5 reviews)`
          : 'Insufficient data',
      confirmedCount: agreedCount,
      modifiedCount,
      rejectedCount,
      accuracyByCrop,
    },
  });
});

// --- WEATHER ENDPOINT (Public) ---
apiRouter.get(['/weather', '/weather/:county'], async (req: Request, res: Response) => {
  const county = req.params.county || (req.query.county as string) || 'Bong';
  const weather = await getCountyWeather(county);
  res.json({ success: true, weather });
});

// --- IMAGE PROXY ENDPOINT (Public with valid URL) ---
apiRouter.get('/proxy-image', async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
    return res.status(400).json({ success: false, error: 'Invalid or missing image URL' });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: `Failed to fetch image: ${response.statusText}` });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Image proxy failure' });
  }
});
