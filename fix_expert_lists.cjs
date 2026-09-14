const fs = require('fs');
let code = fs.readFileSync('server/apiRouter.ts', 'utf8');

// For GET /farms
code = code.replace(
  "  const targetUserId = req.query.userId as string | undefined;\n  const farms = targetUserId ? db.getFarms(targetUserId) : db.getFarms();\n  res.json({ success: true, farms });",
  `  if (user.role === 'expert' || user.role === 'senior_expert') {
    const cases = db.getReviewCases();
    const myCases = cases.filter(c => c.assignedExpertId === user.id);
    const myObsIds = new Set(myCases.map(c => c.observationId));
    const obs = db.getObservations().filter(o => myObsIds.has(o.id));
    const myPlantingIds = new Set(obs.map(o => o.plantingId));
    const plantings = db.getPlantings().filter(p => myPlantingIds.has(p.id));
    const myFarmIds = new Set(plantings.map(p => p.farmId));
    const farms = db.getFarms().filter(f => myFarmIds.has(f.id));
    return res.json({ success: true, farms });
  }

  const targetUserId = req.query.userId as string | undefined;
  const farms = targetUserId ? db.getFarms(targetUserId) : db.getFarms();
  res.json({ success: true, farms });`
);

// For GET /plantings
code = code.replace(
  "  const plantings = user.role === 'farmer' ? db.getPlantings(user.id) : db.getPlantings(req.query.userId as string);\n  res.json({ success: true, plantings });",
  `  if (user.role === 'farmer') {
    return res.json({ success: true, plantings: db.getPlantings(user.id) });
  }

  if (user.role === 'expert' || user.role === 'senior_expert') {
    const cases = db.getReviewCases();
    const myCases = cases.filter(c => c.assignedExpertId === user.id);
    const myObsIds = new Set(myCases.map(c => c.observationId));
    const obs = db.getObservations().filter(o => myObsIds.has(o.id));
    const myPlantingIds = new Set(obs.map(o => o.plantingId));
    const plantings = db.getPlantings().filter(p => myPlantingIds.has(p.id));
    return res.json({ success: true, plantings });
  }

  const plantings = db.getPlantings(req.query.userId as string);
  res.json({ success: true, plantings });`
);

fs.writeFileSync('server/apiRouter.ts', code);
