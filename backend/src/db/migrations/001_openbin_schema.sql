-- OpenBin 2.0 schema — authoritative design + capacity/media extensions

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop legacy bootstrap users table if present (SERIAL id prototype)
DROP TABLE IF EXISTS users CASCADE;

CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'EPR');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'BLOCKED', 'SUSPENDED');
CREATE TYPE rvm_status AS ENUM ('ACTIVE', 'MAINTENANCE', 'DISABLED');
CREATE TYPE entity_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE transaction_status AS ENUM ('PROCESSING', 'ACCEPTED', 'REJECTED', 'FAILED');
CREATE TYPE claim_status AS ENUM ('UNCLAIMED', 'CLAIMED', 'EXPIRED', 'NOT_APPLICABLE');
CREATE TYPE account_type AS ENUM ('USER', 'CHARITY');
CREATE TYPE account_status AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');
CREATE TYPE ledger_direction AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE account_source_type AS ENUM (
  'RVM_REWARD',
  'USER_DONATION',
  'WITHDRAWAL',
  'CHARITY_TRANSFER',
  'UNCLAIMED_REWARD',
  'ADJUSTMENT'
);
CREATE TYPE withdrawal_status AS ENUM (
  'REQUESTED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);
CREATE TYPE donation_status AS ENUM ('REQUESTED', 'COMPLETED', 'FAILED', 'REVERSED');
CREATE TYPE collection_status AS ENUM (
  'RECORDED',
  'IN_TRANSIT',
  'DELIVERED',
  'VERIFIED',
  'FLAGGED'
);
CREATE TYPE verification_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE reconciliation_status AS ENUM ('PENDING', 'RECONCILED', 'FLAGGED', 'REJECTED');
CREATE TYPE report_status AS ENUM ('DRAFT', 'FINAL', 'SUBMITTED', 'AMENDED');
CREATE TYPE media_type AS ENUM ('IMAGE', 'VIDEO');

CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR(128) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(30),
  role user_role NOT NULL DEFAULT 'USER',
  status user_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rvms (
  rvm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rvm_code VARCHAR(50) NOT NULL UNIQUE,
  serial_number VARCHAR(100) NOT NULL UNIQUE,
  location_name VARCHAR(200),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  status rvm_status NOT NULL DEFAULT 'ACTIVE',
  total_capacity NUMERIC(14,3) NOT NULL DEFAULT 100 CHECK (total_capacity > 0),
  current_capacity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (current_capacity >= 0),
  capacity_unit VARCHAR(20) NOT NULL DEFAULT 'KG',
  installed_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  is_simulated BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (current_capacity <= total_capacity)
);

CREATE TABLE companies (
  company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(200) NOT NULL,
  registration_number VARCHAR(100) UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(30),
  address TEXT,
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brands (
  brand_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  brand_name VARCHAR(200) NOT NULL,
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, brand_name)
);

CREATE TABLE materials (
  material_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_code VARCHAR(30) NOT NULL UNIQUE,
  material_name VARCHAR(100) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(brand_id),
  material_id UUID NOT NULL REFERENCES materials(material_id),
  product_name VARCHAR(200) NOT NULL,
  volume_ml INTEGER,
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE material_prices (
  price_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(material_id),
  price_per_kg NUMERIC(12,4) NOT NULL CHECK (price_per_kg >= 0),
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE TABLE transactions (
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_event_id VARCHAR(120) NOT NULL UNIQUE,
  rvm_id UUID NOT NULL REFERENCES rvms(rvm_id),
  product_id UUID REFERENCES products(product_id),
  material_id UUID NOT NULL REFERENCES materials(material_id),
  brand_id UUID REFERENCES brands(brand_id),
  object_type VARCHAR(100),
  estimated_weight_g NUMERIC(10,3) NOT NULL CHECK (estimated_weight_g >= 0),
  length_cm NUMERIC(10,3),
  width_cm NUMERIC(10,3),
  height_cm NUMERIC(10,3),
  ml_confidence NUMERIC(5,4),
  reward_value NUMERIC(12,2) NOT NULL CHECK (reward_value >= 0),
  reward_unit VARCHAR(20) NOT NULL DEFAULT 'POINTS',
  transaction_status transaction_status NOT NULL DEFAULT 'ACCEPTED',
  claim_status claim_status NOT NULL DEFAULT 'UNCLAIMED',
  user_id UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ
);

CREATE TABLE transaction_claims (
  claim_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(transaction_id),
  user_id UUID REFERENCES users(user_id),
  qr_token_hash VARCHAR(128) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type account_type NOT NULL,
  user_id UUID UNIQUE REFERENCES users(user_id),
  account_code VARCHAR(50) NOT NULL UNIQUE,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status account_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE account_transactions (
  account_transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(account_id),
  source_type account_source_type NOT NULL,
  source_id UUID,
  direction ledger_direction NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE withdrawals (
  withdrawal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(account_id),
  account_transaction_id UUID REFERENCES account_transactions(account_transaction_id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method VARCHAR(40) NOT NULL,
  destination_reference VARCHAR(255),
  status withdrawal_status NOT NULL DEFAULT 'REQUESTED',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE donations (
  donation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_account_id UUID NOT NULL REFERENCES accounts(account_id),
  charity_account_id UUID NOT NULL REFERENCES accounts(account_id),
  account_transaction_id UUID REFERENCES account_transactions(account_transaction_id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  status donation_status NOT NULL DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collection_batches (
  collection_batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code VARCHAR(60) NOT NULL UNIQUE,
  material_id UUID NOT NULL REFERENCES materials(material_id),
  recorded_weight_kg NUMERIC(14,3) NOT NULL CHECK (recorded_weight_kg >= 0),
  collector_reference VARCHAR(120),
  collected_at TIMESTAMPTZ NOT NULL,
  status collection_status NOT NULL DEFAULT 'RECORDED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collection_batch_rvms (
  collection_batch_id UUID NOT NULL REFERENCES collection_batches(collection_batch_id),
  rvm_id UUID NOT NULL REFERENCES rvms(rvm_id),
  recorded_quantity_kg NUMERIC(14,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_batch_id, rvm_id)
);

CREATE TABLE recyclers (
  recycler_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recycler_name VARCHAR(200) NOT NULL,
  registration_number VARCHAR(100) UNIQUE,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(30),
  address TEXT,
  status entity_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recycler_receipts (
  receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_batch_id UUID NOT NULL REFERENCES collection_batches(collection_batch_id),
  recycler_id UUID NOT NULL REFERENCES recyclers(recycler_id),
  received_weight_kg NUMERIC(14,3) NOT NULL CHECK (received_weight_kg >= 0),
  received_at TIMESTAMPTZ NOT NULL,
  document_reference VARCHAR(255),
  verification_status verification_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reconciliations (
  reconciliation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_batch_id UUID NOT NULL UNIQUE REFERENCES collection_batches(collection_batch_id),
  recorded_quantity_kg NUMERIC(14,3) NOT NULL CHECK (recorded_quantity_kg >= 0),
  collected_quantity_kg NUMERIC(14,3) NOT NULL CHECK (collected_quantity_kg >= 0),
  received_quantity_kg NUMERIC(14,3) NOT NULL CHECK (received_quantity_kg >= 0),
  variance_kg NUMERIC(14,3) NOT NULL,
  tolerance_kg NUMERIC(14,3) NOT NULL DEFAULT 0,
  status reconciliation_status NOT NULL DEFAULT 'PENDING',
  verified_by UUID REFERENCES users(user_id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE epr_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(company_id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_transactions BIGINT NOT NULL DEFAULT 0,
  total_recorded_weight_kg NUMERIC(16,3) NOT NULL DEFAULT 0,
  total_verified_weight_kg NUMERIC(16,3) NOT NULL DEFAULT 0,
  status report_status NOT NULL DEFAULT 'DRAFT',
  generated_by UUID NOT NULL REFERENCES users(user_id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

CREATE TABLE epr_report_batches (
  report_id UUID NOT NULL REFERENCES epr_reports(report_id),
  collection_batch_id UUID NOT NULL REFERENCES collection_batches(collection_batch_id),
  included_weight_kg NUMERIC(14,3) NOT NULL CHECK (included_weight_kg >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, collection_batch_id)
);

CREATE TABLE audit_logs (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(user_id),
  actor_type VARCHAR(30) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  request_id VARCHAR(100),
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RVM media (EPR-controlled content displayed on RVM)
CREATE TABLE rvm_media (
  media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rvm_id UUID NOT NULL REFERENCES rvms(rvm_id) ON DELETE CASCADE,
  media_type media_type NOT NULL,
  storage_path TEXT NOT NULL,
  download_url TEXT,
  title VARCHAR(200),
  is_active BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_rvm_created ON transactions(rvm_id, created_at DESC);
CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(transaction_status, claim_status);
CREATE INDEX idx_claims_user ON transaction_claims(user_id, claimed_at DESC);
CREATE INDEX idx_account_transactions_account ON account_transactions(account_id, created_at DESC);
CREATE INDEX idx_collection_batches_material_date ON collection_batches(material_id, collected_at DESC);
CREATE INDEX idx_epr_reports_company_period ON epr_reports(company_id, period_start, period_end);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_material_prices_material ON material_prices(material_id, effective_from DESC);
CREATE INDEX idx_rvm_media_rvm ON rvm_media(rvm_id, is_active);

-- System charity account (no user owner)
INSERT INTO accounts (account_type, user_id, account_code, balance, currency, status)
VALUES ('CHARITY', NULL, 'CHARITY-001', 0, 'INR', 'ACTIVE');

-- Seed materials
INSERT INTO materials (material_code, material_name, unit) VALUES
  ('PET', 'PET Plastic', 'kg'),
  ('AL', 'Aluminium', 'kg'),
  ('GLASS', 'Glass', 'kg'),
  ('HDPE', 'HDPE Plastic', 'kg');

-- Seed simulated RVM
INSERT INTO rvms (
  rvm_code, serial_number, location_name, latitude, longitude,
  status, total_capacity, current_capacity, capacity_unit,
  installed_at, last_seen_at, is_simulated
) VALUES (
  'RVM-001', 'SIM-RVM-001', 'SRM University AP',
  16.441900, 80.622000, 'ACTIVE',
  100, 0, 'KG', now(), now(), true
);

-- Default material prices (INR per kg) — historical rates; future changes create new rows
INSERT INTO material_prices (material_id, price_per_kg, effective_from, created_by)
SELECT material_id, price, now(), NULL FROM (
  VALUES
    ('PET', 25.00),
    ('AL', 120.00),
    ('GLASS', 8.00),
    ('HDPE', 18.00)
) AS seed(code, price)
JOIN materials m ON m.material_code = seed.code;
