import { drizzle } from 'drizzle-orm/node-sqlite';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'cropwatch.db');
const sqliteDb = new DatabaseSync(dbPath);
export const dbConnection = drizzle({ client: sqliteDb });

/**
 * Programmatically initialize SQLite tables if they do not exist
 * This ensures the database schema is kept strictly synchronized on startup.
 */
export function initializeSqliteSchema() {
  console.log('⚙️ Initializing database tables and indexes...');

  // 1. Users
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      phone_number TEXT,
      role TEXT NOT NULL,
      county TEXT NOT NULL,
      organization TEXT,
      created_at TEXT NOT NULL,
      password_hash TEXT,
      supabase_id TEXT
    );
  `);

  // 2. Expert Profiles
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS expert_profiles (
      user_id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      organization TEXT NOT NULL,
      qualification TEXT NOT NULL,
      years_experience INTEGER NOT NULL,
      verification_status TEXT NOT NULL,
      specialties TEXT NOT NULL,
      verified_at TEXT,
      verified_by_admin_name TEXT,
      cases_reviewed_count INTEGER NOT NULL DEFAULT 0,
      avg_response_hours REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  // 3. Farms
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS farms (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      county TEXT NOT NULL,
      district TEXT NOT NULL,
      size_hectares REAL NOT NULL,
      soil_type TEXT NOT NULL,
      irrigation_source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  // 4. Fields
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS fields (
      id TEXT PRIMARY KEY,
      farm_id TEXT NOT NULL,
      name TEXT NOT NULL,
      area_hectares REAL NOT NULL,
      topography TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE
    );
  `);

  // 5. Crop Catalog
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS crop_catalog (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      scientific_name TEXT NOT NULL,
      growth_duration_days_min INTEGER NOT NULL,
      growth_duration_days_max INTEGER NOT NULL,
      icon TEXT NOT NULL,
      category TEXT NOT NULL
    );
  `);

  // 6. Crop Varieties
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS crop_varieties (
      id TEXT PRIMARY KEY,
      crop_id TEXT NOT NULL,
      variety_name TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      yield_potential TEXT NOT NULL,
      characteristics TEXT NOT NULL,
      FOREIGN KEY (crop_id) REFERENCES crop_catalog (id) ON DELETE CASCADE
    );
  `);

  // 7. Crop Plantings
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS crop_plantings (
      id TEXT PRIMARY KEY,
      field_id TEXT NOT NULL,
      farm_id TEXT NOT NULL,
      crop_id TEXT NOT NULL,
      crop_name TEXT NOT NULL,
      variety_id TEXT,
      variety_name TEXT,
      planting_date TEXT NOT NULL,
      expected_harvest_start TEXT NOT NULL,
      expected_harvest_end TEXT NOT NULL,
      status TEXT NOT NULL,
      current_growth_stage TEXT NOT NULL,
      latest_health_score INTEGER,
      latest_status TEXT,
      observation_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (field_id) REFERENCES fields (id) ON DELETE CASCADE,
      FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE
    );
  `);

  // 8. Plant Observations
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS plant_observations (
      id TEXT PRIMARY KEY,
      planting_id TEXT NOT NULL,
      farmer_id TEXT NOT NULL,
      observed_at TEXT NOT NULL,
      notes TEXT,
      farmer_reported_symptoms TEXT,
      ai_analysis TEXT,
      weather_snapshot TEXT,
      health_score INTEGER,
      health_status TEXT NOT NULL,
      FOREIGN KEY (planting_id) REFERENCES crop_plantings (id) ON DELETE CASCADE,
      FOREIGN KEY (farmer_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  // 9. Observation Images
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS observation_images (
      id TEXT PRIMARY KEY,
      observation_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      quality_score REAL NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 1,
      size INTEGER,
      mime_type TEXT,
      FOREIGN KEY (observation_id) REFERENCES plant_observations (id) ON DELETE CASCADE
    );
  `);

  // 10. Expert Review Cases
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS expert_review_cases (
      id TEXT PRIMARY KEY,
      observation_id TEXT NOT NULL,
      planting_id TEXT NOT NULL,
      farm_id TEXT NOT NULL,
      farmer_id TEXT NOT NULL,
      farmer_name TEXT NOT NULL,
      farmer_county TEXT NOT NULL,
      crop_name TEXT NOT NULL,
      variety_name TEXT,
      crop_age_days INTEGER NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      trigger_reason TEXT NOT NULL,
      assigned_expert_id TEXT,
      assigned_expert_name TEXT,
      assigned_at TEXT,
      suggested_expert_id TEXT,
      suggested_expert_name TEXT,
      escalation_level INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      waiting_for_info_message TEXT,
      FOREIGN KEY (observation_id) REFERENCES plant_observations (id) ON DELETE CASCADE,
      FOREIGN KEY (planting_id) REFERENCES crop_plantings (id) ON DELETE CASCADE,
      FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE,
      FOREIGN KEY (farmer_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_expert_id) REFERENCES users (id) ON DELETE SET NULL
    );
  `);

  // 11. Expert Assessments
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS expert_assessments (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      observation_id TEXT NOT NULL,
      expert_id TEXT NOT NULL,
      expert_name TEXT NOT NULL,
      expert_organization TEXT NOT NULL,
      expert_role TEXT NOT NULL,
      version INTEGER NOT NULL,
      is_current INTEGER NOT NULL DEFAULT 1,
      crop_confirmed INTEGER NOT NULL DEFAULT 1,
      corrected_crop_name TEXT,
      verified_condition TEXT NOT NULL,
      decision TEXT NOT NULL,
      severity TEXT NOT NULL,
      expert_confidence TEXT NOT NULL,
      action_recommendations TEXT NOT NULL,
      farmer_explanation TEXT NOT NULL,
      internal_notes TEXT,
      additional_info_requested TEXT,
      resolves_escalation INTEGER NOT NULL DEFAULT 0,
      escalation_resolution_notes TEXT,
      reviewed_at TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES expert_review_cases (id) ON DELETE CASCADE,
      FOREIGN KEY (observation_id) REFERENCES plant_observations (id) ON DELETE CASCADE,
      FOREIGN KEY (expert_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  // 12. Agricultural Knowledge
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS agricultural_knowledge (
      id TEXT PRIMARY KEY,
      crop_id TEXT NOT NULL,
      crop_name TEXT NOT NULL,
      topic TEXT NOT NULL,
      category TEXT NOT NULL,
      symptoms_description TEXT NOT NULL,
      preventative_measures TEXT NOT NULL,
      approved_organic_treatments TEXT NOT NULL,
      approved_chemical_guidance TEXT NOT NULL,
      governance_status TEXT NOT NULL,
      evidence_level TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_url TEXT,
      author_name TEXT NOT NULL,
      author_id TEXT,
      reviewed_by_expert_name TEXT,
      reviewed_by_expert_id TEXT,
      published_at TEXT,
      review_due_date TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (crop_id) REFERENCES crop_catalog (id) ON DELETE CASCADE
    );
  `);

  // 13. Farmer Feedback
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS farmer_feedback (
      id TEXT PRIMARY KEY,
      observation_id TEXT NOT NULL,
      farmer_id TEXT NOT NULL,
      farmer_name TEXT NOT NULL,
      category TEXT NOT NULL,
      notes TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (observation_id) REFERENCES plant_observations (id) ON DELETE CASCADE,
      FOREIGN KEY (farmer_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  // 14. Audit Logs
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  // 15. Routing Thresholds
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS routing_thresholds (
      id TEXT PRIMARY KEY,
      ai_high_confidence_cutoff REAL NOT NULL,
      ai_medium_confidence_cutoff REAL NOT NULL,
      rapid_decline_threshold_score INTEGER NOT NULL,
      high_risk_diseases TEXT NOT NULL,
      mandatory_chemical_review INTEGER NOT NULL DEFAULT 1,
      auto_escalate_disagreement INTEGER NOT NULL DEFAULT 1,
      knowledge_periodic_review_days INTEGER NOT NULL DEFAULT 365
    );
  `);

  // 16. INDEXES for high-frequency filters (userId, farmId, plantingId, status, caseId)
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_users_supabase ON users(supabase_id);`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_farms_user ON farms(user_id);`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_fields_farm ON fields(farm_id);`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_plantings_farm ON crop_plantings(farm_id);`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_plantings_field ON crop_plantings(field_id);`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_observations_planting ON plant_observations(planting_id);`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_observations_farmer ON plant_observations(farmer_id);`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_cases_observation ON expert_review_cases(observation_id);`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_cases_planting ON expert_review_cases(planting_id);`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_cases_farm ON expert_review_cases(farm_id);`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_cases_farmer ON expert_review_cases(farmer_id);`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_cases_status ON expert_review_cases(status);`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_assessments_case ON expert_assessments(case_id);`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_images_observation ON observation_images(observation_id);`);
  
  // 17. Safe migration check to programmatically add columns if table already existed prior to schema expansion
  const ensureColumnExists = (table: string, column: string, typeAndConstraints: string) => {
    try {
      const columns = sqliteDb.prepare(`PRAGMA table_info(${table})`).all() as any[];
      const exists = columns.some((col: any) => col.name === column);
      if (!exists) {
        console.log(`⚙️ [Migration] Adding missing column "${column}" to table "${table}"`);
        sqliteDb.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeAndConstraints};`);
      }
    } catch (err) {
      console.error(`❌ Failed to alter table ${table} for column ${column}:`, err);
    }
  };

  ensureColumnExists('expert_review_cases', 'suggested_expert_id', 'TEXT');
  ensureColumnExists('expert_review_cases', 'suggested_expert_name', 'TEXT');
  ensureColumnExists('routing_thresholds', 'knowledge_periodic_review_days', 'INTEGER NOT NULL DEFAULT 365');
  ensureColumnExists('expert_assessments', 'resolves_escalation', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumnExists('expert_assessments', 'escalation_resolution_notes', 'TEXT');
  ensureColumnExists('agricultural_knowledge', 'author_id', 'TEXT');
  ensureColumnExists('agricultural_knowledge', 'reviewed_by_expert_id', 'TEXT');
  ensureColumnExists('agricultural_knowledge', 'review_due_date', 'TEXT');

  console.log('✅ Database schema and indexes verified.');
}
