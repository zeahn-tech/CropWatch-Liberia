const fs = require('fs');
let code = fs.readFileSync('server/apiRouter.ts', 'utf8');

// For GET /observations
code = code.replace(
  "  if (user.role === 'farmer') {\n    const observations = db.getObservations().filter((o) => o.farmerId === user.id);\n    return res.json({ success: true, observations });\n  }\n\n  const observations = db.getObservations();\n  res.json({ success: true, observations });",
  `  if (user.role === 'farmer') {
    const observations = db.getObservations().filter((o) => o.farmerId === user.id);
    return res.json({ success: true, observations });
  }
  
  if (user.role === 'expert' || user.role === 'senior_expert') {
    const cases = db.getReviewCases();
    const myCases = cases.filter(c => c.assignedExpertId === user.id);
    const myObsIds = new Set(myCases.map(c => c.observationId));
    const observations = db.getObservations().filter(o => myObsIds.has(o.id));
    return res.json({ success: true, observations });
  }

  const observations = db.getObservations();
  res.json({ success: true, observations });`
);
fs.writeFileSync('server/apiRouter.ts', code);
