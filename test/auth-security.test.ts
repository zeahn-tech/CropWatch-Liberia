import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import cookieParser from 'cookie-parser';
import { apiRouter } from '../server/apiRouter.js';

describe('CropWatch Liberia — Authentication & Authorization Security Tests', () => {
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
    assert.strictEqual(res.status, 200, `Login should succeed for ${email}: ${JSON.stringify(data)}`);
    assert.ok(data.token, 'Token must be returned');
    return data.token;
  }

  test('1. Unauthenticated requests to protected endpoints return 401', async () => {
    const endpoints = [
      '/plantings/plt_cass_2026',
      '/observations/obs_cass_3',
      '/expert/cases/case_cmd_001',
      '/admin/thresholds',
      '/admin/audit-logs',
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep}`);
      assert.strictEqual(res.status, 401, `Expected 401 for unauthenticated request to ${ep}`);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    }
  });

  test("2. Farmer cannot fetch another farmer's planting by ID (returns 403)", async () => {
    // Moses (usr_farmer_2) owns plt_nimba_rice on farm_nimba.
    // Emmanuel (usr_farmer_1) owns plt_cass_2026 on farm_suakoko.
    const mosesToken = await login('moses.kollie@nimba.farmers.lr', 'Password123!');

    // Moses tries to fetch Emmanuel's planting
    const resForbidden = await fetch(`${baseUrl}/plantings/plt_cass_2026`, {
      headers: { Authorization: `Bearer ${mosesToken}` },
    });
    assert.strictEqual(resForbidden.status, 403, "Expected 403 when farmer accesses another farmer's planting");
    const forbiddenData = await resForbidden.json();
    assert.strictEqual(forbiddenData.success, false);
    assert.match(forbiddenData.error, /Access denied/i);

    // Moses fetches his own planting
    const resAllowed = await fetch(`${baseUrl}/plantings/plt_nimba_rice`, {
      headers: { Authorization: `Bearer ${mosesToken}` },
    });
    assert.strictEqual(resAllowed.status, 200, "Farmer should be able to access their own planting");
    const allowedData = await resAllowed.json();
    assert.strictEqual(allowedData.success, true);
    assert.strictEqual(allowedData.planting.id, 'plt_nimba_rice');
  });

  test("3. Farmer cannot fetch another farmer's observation by ID (returns 403)", async () => {
    const mosesToken = await login('moses.kollie@nimba.farmers.lr', 'Password123!');

    // Emmanuel's observation (obs_cass_3)
    const resForbidden = await fetch(`${baseUrl}/observations/obs_cass_3`, {
      headers: { Authorization: `Bearer ${mosesToken}` },
    });
    assert.strictEqual(resForbidden.status, 403, "Expected 403 when farmer accesses another farmer's observation");
    const forbiddenData = await resForbidden.json();
    assert.strictEqual(forbiddenData.success, false);
    assert.match(forbiddenData.error, /Access denied/i);
  });

  test("4. Farmer cannot fetch another farmer's expert case by ID (returns 403)", async () => {
    const mosesToken = await login('moses.kollie@nimba.farmers.lr', 'Password123!');

    // Emmanuel's case (case_cmd_001)
    const resForbidden = await fetch(`${baseUrl}/expert/cases/case_cmd_001`, {
      headers: { Authorization: `Bearer ${mosesToken}` },
    });
    assert.strictEqual(resForbidden.status, 403, "Expected 403 when farmer accesses another farmer's expert case");
    const forbiddenData = await resForbidden.json();
    assert.strictEqual(forbiddenData.success, false);
    assert.match(forbiddenData.error, /Access denied/i);
  });

  test('5. Unverified expert cannot submit an assessment (returns 403)', async () => {
    // Arthur Doe is an unverified candidate expert (status: pending)
    const unverifiedToken = await login('arthur.doe@extension.moa.gov.lr', 'Password123!');

    const resAssessment = await fetch(`${baseUrl}/expert/cases/case_cmd_001/assessment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${unverifiedToken}`,
      },
      body: JSON.stringify({
        cropConfirmed: true,
        verifiedCondition: 'Cassava Mosaic Disease (CMD)',
        decision: 'confirmed',
        severity: 'severe',
        expertConfidence: 'high',
        farmerExplanation: 'Severe viral infection requiring roguing.',
        actionRecommendations: ['Rogue infected plants immediately.'],
      }),
    });

    assert.strictEqual(resAssessment.status, 403, 'Unverified expert assessment submission must return 403');
    const data = await resAssessment.json();
    assert.strictEqual(data.success, false);
    assert.match(data.error, /verified/i);
  });

  test('6. Verified expert can submit an assessment', async () => {
    // Dr. Marie Kromah is a verified expert
    const verifiedToken = await login('expert.marie@cari.gov.lr', 'Password123!');

    const resAssessment = await fetch(`${baseUrl}/expert/cases/case_cmd_001/assessment`, {
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
        farmerExplanation: 'Confirmed typical yellow mosaic leaf curling on cassava.',
        actionRecommendations: [
          'Rogue infected plants and burn or bury away from cassava field.',
          'Replant next cycle only with CARI-certified CMD-resistant cuttings.',
        ],
      }),
    });

    assert.strictEqual(resAssessment.status, 200, 'Verified expert assessment submission should succeed');
    const data = await resAssessment.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.assessment);
    assert.strictEqual(data.assessment.expertId, 'usr_expert_1');
  });
});
