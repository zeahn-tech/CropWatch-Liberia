import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import cookieParser from 'cookie-parser';
import { apiRouter } from '../server/apiRouter.js';
import { db } from '../server/db.js';

describe('CropWatch Liberia — Core Business & Governance Rules Tests', () => {
  let server: any;
  let baseUrl: string;

  before(async () => {
    // Initialize test Express server
    const app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api', apiRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  });

  after(() => {
    if (server) server.close();
  });

  // Helper to log in and get JWT token
  async function login(email: string, password: string): Promise<string> {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200, `Login should succeed for ${email}`);
    assert.ok(data.token, 'Token must be returned');
    return data.token;
  }

  describe('1. Farmer Isolation Boundary Tests (Farmer A cannot read or modify Farmer B\'s resources)', () => {
    // Moses (usr_farmer_2) owns plt_nimba_rice on farm_nimba
    // Emmanuel (usr_farmer_1) owns plt_cass_2026 on farm_suakoko
    let mosesToken: string;

    before(async () => {
      mosesToken = await login('moses.kollie@nimba.farmers.lr', 'Password123!');
    });

    test('Farmer Moses cannot read Emmanuel\'s farm', async () => {
      const res = await fetch(`${baseUrl}/farms/farm_suakoko`, {
        headers: { Authorization: `Bearer ${mosesToken}` },
      });
      assert.strictEqual(res.status, 403, 'Expected 403 when reading another farmer\'s farm');
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('Farmer Moses cannot read Emmanuel\'s fields', async () => {
      const res = await fetch(`${baseUrl}/fields?farmId=farm_suakoko`, {
        headers: { Authorization: `Bearer ${mosesToken}` },
      });
      assert.strictEqual(res.status, 403, 'Expected 403 when reading another farmer\'s fields');
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('Farmer Moses cannot modify Emmanuel\'s farm (add fields to it)', async () => {
      const res = await fetch(`${baseUrl}/fields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mosesToken}`,
        },
        body: JSON.stringify({
          farmId: 'farm_suakoko',
          name: 'Unauthorized Field Addition',
          areaHectares: 2.0,
        }),
      });
      assert.strictEqual(res.status, 403, 'Expected 403 when adding field to another farmer\'s farm');
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('Farmer Moses cannot read Emmanuel\'s plantings', async () => {
      const res = await fetch(`${baseUrl}/plantings/plt_cass_2026`, {
        headers: { Authorization: `Bearer ${mosesToken}` },
      });
      assert.strictEqual(res.status, 403, 'Expected 403 when reading another farmer\'s planting');
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('Farmer Moses cannot modify Emmanuel\'s planting (create observation on it)', async () => {
      const res = await fetch(`${baseUrl}/observations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mosesToken}`,
        },
        body: JSON.stringify({
          plantingId: 'plt_cass_2026',
          notes: 'Intruder observation',
        }),
      });
      assert.strictEqual(res.status, 403, 'Expected 403 when creating observation on another farmer\'s planting');
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('Farmer Moses cannot read Emmanuel\'s observation', async () => {
      const res = await fetch(`${baseUrl}/observations/obs_cass_3`, {
        headers: { Authorization: `Bearer ${mosesToken}` },
      });
      assert.strictEqual(res.status, 403, 'Expected 403 when reading another farmer\'s observation');
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('Farmer Moses cannot read Emmanuel\'s review case', async () => {
      const res = await fetch(`${baseUrl}/expert/cases/case_cmd_001`, {
        headers: { Authorization: `Bearer ${mosesToken}` },
      });
      assert.strictEqual(res.status, 403, 'Expected 403 when reading another farmer\'s case');
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });
  });

  describe('2. Expert Verification Boundaries', () => {
    test('Unverified expert cannot submit expert assessment', async () => {
      // Arthur Doe is unverified candidate expert
      const arthurToken = await login('arthur.doe@extension.moa.gov.lr', 'Password123!');

      const res = await fetch(`${baseUrl}/expert/cases/case_cmd_001/assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${arthurToken}`,
        },
        body: JSON.stringify({
          cropConfirmed: true,
          verifiedCondition: 'Healthy',
          decision: 'confirmed',
          severity: 'none',
          expertConfidence: 'high',
          farmerExplanation: 'Fine',
          actionRecommendations: ['Keep watering.'],
        }),
      });

      assert.strictEqual(res.status, 403, 'Expected 403 for unverified expert submitting assessment');
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.error, /verified/i);
    });
  });

  describe('3. Non-Admin Security Restrictions', () => {
    test('Non-admin cannot change routing thresholds', async () => {
      const marieToken = await login('expert.marie@cari.gov.lr', 'Password123!');

      const res = await fetch(`${baseUrl}/admin/thresholds`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${marieToken}`,
        },
        body: JSON.stringify({
          aiHighConfidenceCutoff: 0.95,
        }),
      });

      assert.strictEqual(res.status, 403, 'Expected 403 for non-admin trying to update thresholds');
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('Non-admin cannot verify/suspend an expert', async () => {
      const mosesToken = await login('moses.kollie@nimba.farmers.lr', 'Password123!');

      const res = await fetch(`${baseUrl}/admin/expert-profiles/usr_expert_1/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mosesToken}`,
        },
        body: JSON.stringify({
          verificationStatus: 'suspended',
        }),
      });

      assert.strictEqual(res.status, 403, 'Expected 403 for non-admin trying to verify or suspend an expert');
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });
  });

  describe('4. AI Analysis Path Failure / Absent Key Resilience', () => {
    test('Observation is saved in explicit unavailable state without fabricated data', async () => {
      // Emmanuel Kollie posts an observation
      const emmanuelToken = await login('emmanuelzeahn45@gmail.com', 'Password123!');

      // Temporarily clear key to force failure
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        const res = await fetch(`${baseUrl}/observations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${emmanuelToken}`,
          },
          body: JSON.stringify({
            plantingId: 'plt_cass_2026',
            notes: 'Checking Cassava growth',
            farmerReportedSymptoms: 'Yellowing edges',
            imageBase64OrUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22d57',
          }),
        });

        assert.strictEqual(res.status, 200, 'Observation should be saved successfully even if AI is unavailable');
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.ok(data.observation);

        const obs = data.observation;
        assert.strictEqual(obs.healthScore, null, 'Health score must be null in unavailable state');
        assert.strictEqual(obs.healthStatus, 'unknown', 'Health status must be unknown in unavailable state');
        assert.strictEqual(obs.aiAnalysis.isAvailable, false, 'isAvailable must be false');
        assert.strictEqual(obs.aiAnalysis.status, 'unavailable', 'status must be unavailable');
        assert.deepStrictEqual(obs.aiAnalysis.hypotheses, [], 'No fabricated disease hypotheses should exist');
      } finally {
        // Restore key
        process.env.GEMINI_API_KEY = originalKey;
      }
    });
  });

  describe('5. Expert Assessment Versioning', () => {
    test('Submitting second assessment preserves first with isCurrent=false', async () => {
      const verifiedToken = await login('expert.marie@cari.gov.lr', 'Password123!');

      // Submit first assessment
      const res1 = await fetch(`${baseUrl}/expert/cases/case_cmd_001/assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${verifiedToken}`,
        },
        body: JSON.stringify({
          cropConfirmed: true,
          verifiedCondition: 'Cassava Mosaic Disease (CMD)',
          decision: 'confirmed',
          severity: 'severe',
          expertConfidence: 'high',
          farmerExplanation: 'Typical yellowing',
          actionRecommendations: ['Rogue infected plants.'],
        }),
      });
      assert.strictEqual(res1.status, 200);
      const data1 = await res1.json();
      const asmtId1 = data1.assessment.id;

      // Submit second assessment
      const res2 = await fetch(`${baseUrl}/expert/cases/case_cmd_001/assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${verifiedToken}`,
        },
        body: JSON.stringify({
          cropConfirmed: true,
          verifiedCondition: 'Cassava Mosaic Disease (CMD) - Severe',
          decision: 'confirmed',
          severity: 'severe',
          expertConfidence: 'high',
          farmerExplanation: 'Progressive yellowing',
          actionRecommendations: ['Burn rogue plants immediately.'],
        }),
      });
      assert.strictEqual(res2.status, 200);
      const data2 = await res2.json();
      const asmtId2 = data2.assessment.id;

      // Ensure the second is marked isCurrent=1 and first isCurrent=0
      const assessments = db.getAssessments('case_cmd_001');
      const firstStored = assessments.find((a) => a.id === asmtId1);
      const secondStored = assessments.find((a) => a.id === asmtId2);

      assert.ok(firstStored, 'First assessment must not be deleted');
      assert.ok(secondStored, 'Second assessment must exist');
      assert.strictEqual(firstStored.isCurrent, false, 'First assessment isCurrent must be false');
      assert.strictEqual(secondStored.isCurrent, true, 'Second assessment isCurrent must be true');
    });
  });

  describe('6. Knowledge Governance & Publishing Rules', () => {
    test('Author cannot publish or validate their own article', async () => {
      // Expert Marie authors a knowledge article
      const marieToken = await login('expert.marie@cari.gov.lr', 'Password123!');

      const resCreate = await fetch(`${baseUrl}/knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${marieToken}`,
        },
        body: JSON.stringify({
          cropId: 'crop_cassava',
          cropName: 'Cassava',
          topic: 'Whitefly Controls in Lowlands',
          category: 'pest_control',
          symptomsDescription: 'Tiny white winged pests underneath foliage.',
          preventativeMeasures: 'Sticky traps, intercropping.',
          approvedOrganicTreatments: 'Neem foliar spray.',
          approvedChemicalGuidance: 'Pyrethroid contact sprays.',
          evidenceLevel: 'peer_reviewed_journal',
          sourceName: 'West African Entomology 2026',
        }),
      });
      assert.strictEqual(resCreate.status, 200);
      const dataCreate = await resCreate.json();
      const articleId = dataCreate.knowledgeItem.id;

      // 1. Author Marie tries to validate her own article (she is "expert" so she passes role check, but fails author check)
      const resSelfValidate = await fetch(`${baseUrl}/knowledge/${articleId}/validate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${marieToken}` },
      });
      assert.strictEqual(resSelfValidate.status, 403, 'Author must not be able to validate own article');
      const dataSelfValidate = await resSelfValidate.json();
      assert.strictEqual(dataSelfValidate.success, false);
      assert.match(dataSelfValidate.error, /You cannot review or validate your own authored/i);

      // 2. Author Marie tries to publish her own article (she is regular "expert", so fails on role check)
      const resSelfPublishMarie = await fetch(`${baseUrl}/knowledge/${articleId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${marieToken}` },
      });
      assert.strictEqual(resSelfPublishMarie.status, 403);

      // 3. To test the author publishing governance restriction itself, we have Senior Expert Flomo author an article
      const flomoToken = await login('senior.flomo@cuttington.edu.lr', 'Password123!');
      const resCreateFlomo = await fetch(`${baseUrl}/knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${flomoToken}`,
        },
        body: JSON.stringify({
          cropId: 'crop_cassava',
          cropName: 'Cassava',
          topic: 'Whitefly Controls in Sanniquellie',
          category: 'pest_control',
          symptomsDescription: 'Whitefly outbreaks.',
          preventativeMeasures: 'Sticky traps.',
          approvedOrganicTreatments: 'Neem.',
          approvedChemicalGuidance: 'Pyrethroids.',
          evidenceLevel: 'peer_reviewed_journal',
          sourceName: 'Cuttington Extension Bulletin',
        }),
      });
      assert.strictEqual(resCreateFlomo.status, 200);
      const dataCreateFlomo = await resCreateFlomo.json();
      const flomoArticleId = dataCreateFlomo.knowledgeItem.id;

      // Author Flomo (senior_expert, so passes role check) tries to publish his own article
      const resSelfPublishFlomo = await fetch(`${baseUrl}/knowledge/${flomoArticleId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${flomoToken}` },
      });
      assert.strictEqual(resSelfPublishFlomo.status, 403, 'Author must not be able to publish own article');
      const dataSelfPublishFlomo = await resSelfPublishFlomo.json();
      assert.strictEqual(dataSelfPublishFlomo.success, false);
      assert.match(dataSelfPublishFlomo.error, /You cannot publish your own authored/i);

      // 4. Separate Senior Expert Flomo validates Marie's article
      const resValid = await fetch(`${baseUrl}/knowledge/${articleId}/validate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${flomoToken}` },
      });
      assert.strictEqual(resValid.status, 200, 'Reviewer should successfully validate article');

      // 5. Separate Senior Expert Flomo publishes Marie's article
      const resPub = await fetch(`${baseUrl}/knowledge/${articleId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${flomoToken}` },
      });
      assert.strictEqual(resPub.status, 200, 'Reviewer should successfully publish article');
    });
  });
});
