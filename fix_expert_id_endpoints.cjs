const fs = require('fs');
let code = fs.readFileSync('server/apiRouter.ts', 'utf8');

// For GET /farms/:id
code = code.replace(
  "  if (user.role === 'farmer' && farm.userId !== user.id) {\n    return res.status(403).json({ success: false, error: 'Access denied. You do not own this farm.' });\n  }",
  `  if (user.role === 'farmer' && farm.userId !== user.id) {
    return res.status(403).json({ success: false, error: 'Access denied. You do not own this farm.' });
  }
  if (user.role === 'expert' || user.role === 'senior_expert') {
    const cases = db.getReviewCases();
    const myCases = cases.filter(c => c.assignedExpertId === user.id);
    const myObsIds = new Set(myCases.map(c => c.observationId));
    const obs = db.getObservations().filter(o => myObsIds.has(o.id));
    const myPlantingIds = new Set(obs.map(o => o.plantingId));
    const plantings = db.getPlantings().filter(p => myPlantingIds.has(p.id));
    const myFarmIds = new Set(plantings.map(p => p.farmId));
    if (!myFarmIds.has(farm.id)) {
      return res.status(403).json({ success: false, error: 'Access denied. Farm is not related to your assigned cases.' });
    }
  }`
);

// For GET /plantings/:id
code = code.replace(
  "  if (user.role === 'farmer' && farm?.userId !== user.id) {\n    return res.status(403).json({ success: false, error: 'Access denied. You do not own this planting.' });\n  }",
  `  if (user.role === 'farmer' && farm?.userId !== user.id) {
    return res.status(403).json({ success: false, error: 'Access denied. You do not own this planting.' });
  }
  if (user.role === 'expert' || user.role === 'senior_expert') {
    const cases = db.getReviewCases();
    const myCases = cases.filter(c => c.assignedExpertId === user.id);
    const myObsIds = new Set(myCases.map(c => c.observationId));
    const obs = db.getObservations().filter(o => myObsIds.has(o.id));
    const myPlantingIds = new Set(obs.map(o => o.plantingId));
    if (!myPlantingIds.has(planting.id)) {
      return res.status(403).json({ success: false, error: 'Access denied. Planting is not related to your assigned cases.' });
    }
  }`
);

// For GET /observations/:id
code = code.replace(
  "  if (user.role === 'farmer' && observation.farmerId !== user.id) {\n    return res.status(403).json({ success: false, error: 'Access denied.' });\n  }",
  `  if (user.role === 'farmer' && observation.farmerId !== user.id) {
    return res.status(403).json({ success: false, error: 'Access denied.' });
  }
  if (user.role === 'expert' || user.role === 'senior_expert') {
    const cases = db.getReviewCases();
    const myCases = cases.filter(c => c.assignedExpertId === user.id);
    const myObsIds = new Set(myCases.map(c => c.observationId));
    if (!myObsIds.has(observation.id)) {
      return res.status(403).json({ success: false, error: 'Access denied. Observation is not assigned to you.' });
    }
  }`
);

fs.writeFileSync('server/apiRouter.ts', code);
