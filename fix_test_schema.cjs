const fs = require('fs');
let code = fs.readFileSync('test/business-rules.test.ts', 'utf8');

code = code.replace(
  "preventativeMeasures: 'Draft.',",
  "preventativeMeasures: 'Draft.',\n          approvedOrganicTreatments: 'Draft.',\n          approvedChemicalGuidance: 'Draft.',"
);

fs.writeFileSync('test/business-rules.test.ts', code);
