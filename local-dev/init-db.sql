-- ============================================================
-- FreightClaims v5.0 - Database Initialization
-- ============================================================
-- Runs automatically when the PostgreSQL container starts for
-- the first time. Creates extensions needed by the app.
-- Prisma handles actual schema creation via migrations.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Performance: allow trigram-based fuzzy search on claim/PRO numbers
ALTER DATABASE freightclaims_v5 SET pg_trgm.similarity_threshold = 0.3;
