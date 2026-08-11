-- ═══════════════════════════════════════════════════════════════
-- Dairy Management — PostgreSQL Schema (Clean, No OTP)
-- Login: phone + password only. No verification codes.
-- ═══════════════════════════════════════════════════════════════

-- Drop all tables in reverse-dependency order
DROP TABLE IF EXISTS "AuthLog"           CASCADE;
DROP TABLE IF EXISTS "Feedback"          CASCADE;
DROP TABLE IF EXISTS "RecycleBin"        CASCADE;
DROP TABLE IF EXISTS "SubscriptionRequest" CASCADE;
DROP TABLE IF EXISTS "FarmerCollection"  CASCADE;
DROP TABLE IF EXISTS "DailyCollection"   CASCADE;
DROP TABLE IF EXISTS "DailyLog"          CASCADE;
DROP TABLE IF EXISTS "Bill"              CASCADE;
DROP TABLE IF EXISTS "DefaultRate"       CASCADE;
DROP TABLE IF EXISTS "DairyDefaultRate"  CASCADE;
DROP TABLE IF EXISTS "TermRate"          CASCADE;
DROP TABLE IF EXISTS "MessageTemplate"   CASCADE;
DROP TABLE IF EXISTS "WhatsappConnection" CASCADE;
DROP TABLE IF EXISTS "SystemConfig"      CASCADE;
DROP TABLE IF EXISTS "PlanConfig"        CASCADE;
DROP TABLE IF EXISTS "Customer"          CASCADE;
DROP TABLE IF EXISTS "Farmer"            CASCADE;
DROP TABLE IF EXISTS "User"              CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
-- USERS  (superadmin / owner / staff)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "User" (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identity
    name                 VARCHAR(100)  NOT NULL,
    phone                VARCHAR(20)   NOT NULL UNIQUE,
    email                VARCHAR(100),
    username             VARCHAR(50)   UNIQUE,
    password             VARCHAR(255)  NOT NULL,

    -- Role
    role                 VARCHAR(20)   NOT NULL CHECK (role IN ('superadmin', 'owner', 'staff')),

    -- Owner / Staff relationship
    "ownerId"            UUID          REFERENCES "User"(id) ON DELETE SET NULL,
    "ownerRole"          VARCHAR(50)   DEFAULT 'milk_supplier',  -- dairy_owner | milk_supplier
    "roleName"           VARCHAR(100),                           -- staff custom label
    permissions          JSONB         DEFAULT '[]'::jsonb,      -- staff permissions

    -- Owner business info
    "businessName"       VARCHAR(150),
    "maxCustomers"       INT           DEFAULT 150,
    "maxStaff"           INT           DEFAULT 5,

    -- Subscription (stored flat for simple queries)
    "subscriptionStatus" VARCHAR(20)   DEFAULT 'trial'
                             CHECK ("subscriptionStatus" IN ('trial','active','expired','inactive')),
    "subscriptionPlan"   VARCHAR(20)   DEFAULT 'gold'
                             CHECK ("subscriptionPlan" IN ('silver','gold','platinum')),
    "trialEndsAt"        TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
    "expiresAt"          TIMESTAMP WITH TIME ZONE,

    -- Feature flags (per-owner overrides)
    "featuresWhatsapp"         BOOLEAN DEFAULT true,
    "featuresPdfBilling"       BOOLEAN DEFAULT true,
    "featuresAdvancedReports"  BOOLEAN DEFAULT false,

    -- WhatsApp
    "whatsappNumber"     VARCHAR(20),

    -- Superadmin lineage
    "parentAdminId"      UUID REFERENCES "User"(id) ON DELETE SET NULL,

    -- Status / Misc
    "isActive"           BOOLEAN       DEFAULT true,
    "onboardingDone"     BOOLEAN       DEFAULT false,
    source               VARCHAR(50)   DEFAULT 'organic',
    "lastLogin"          TIMESTAMP WITH TIME ZONE,
    "createdAt"          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt"          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- CUSTOMERS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "Customer" (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId"      UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    name           VARCHAR(100) NOT NULL,
    phone          VARCHAR(20),
    address        TEXT,
    "milkType"     VARCHAR(20)  DEFAULT 'cow' CHECK ("milkType" IN ('cow','buffalo','mix')),
    "ratePerLiter" DECIMAL(10,2),
    "isActive"     BOOLEAN      DEFAULT true,
    balance        DECIMAL(10,2) DEFAULT 0.00,
    "createdAt"    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt"    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- FARMERS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "Farmer" (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId"   UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    phone       VARCHAR(20),
    "milkType"  VARCHAR(20)  DEFAULT 'cow' CHECK ("milkType" IN ('cow','buffalo','mix')),
    "isActive"  BOOLEAN      DEFAULT true,
    balance     DECIMAL(10,2) DEFAULT 0.00,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- DAILY LOG  (customer milk delivery)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "DailyLog" (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId"      UUID NOT NULL REFERENCES "User"(id)     ON DELETE CASCADE,
    "customerId"   UUID NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
    date           DATE NOT NULL,
    shift          VARCHAR(20) NOT NULL CHECK (shift IN ('morning','evening')),
    quantity       DECIMAL(10,2) NOT NULL,
    "ratePerLiter" DECIMAL(10,2) NOT NULL,
    "totalAmount"  DECIMAL(10,2) NOT NULL,
    "createdAt"    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- DAILY COLLECTION  (farmer milk intake)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "DailyCollection" (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId"      UUID NOT NULL REFERENCES "User"(id)    ON DELETE CASCADE,
    "farmerId"     UUID NOT NULL REFERENCES "Farmer"(id) ON DELETE CASCADE,
    date           DATE NOT NULL,
    shift          VARCHAR(20)   NOT NULL CHECK (shift IN ('morning','evening')),
    "milkType"     VARCHAR(20)   NOT NULL CHECK ("milkType" IN ('cow','buffalo','mix')),
    quantity       DECIMAL(10,2) NOT NULL,
    fat            DECIMAL(5,2),
    snf            DECIMAL(5,2),
    "ratePerLiter" DECIMAL(10,2) NOT NULL,
    "netAmount"    DECIMAL(10,2) NOT NULL,
    "createdAt"    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- BILLS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "Bill" (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId"         UUID NOT NULL REFERENCES "User"(id)     ON DELETE CASCADE,
    "customerId"      UUID NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
    "startDate"       DATE NOT NULL,
    "endDate"         DATE NOT NULL,
    "totalQuantity"   DECIMAL(10,2) NOT NULL,
    "totalAmount"     DECIMAL(10,2) NOT NULL,
    "previousBalance" DECIMAL(10,2) DEFAULT 0.00,
    "netAmount"       DECIMAL(10,2) NOT NULL,
    "isPaid"          BOOLEAN       DEFAULT false,
    "paymentDate"     TIMESTAMP WITH TIME ZONE,
    "createdAt"       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- DEFAULT RATE  (customer-side rate by milk type)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "DefaultRate" (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId"      UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "milkType"     VARCHAR(20) NOT NULL,
    "ratePerLiter" DECIMAL(10,2) NOT NULL,
    "createdAt"    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("ownerId", "milkType")
);

-- ═══════════════════════════════════════════════════════════════
-- DAIRY DEFAULT RATE  (farmer fat/snf rate chart)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "DairyDefaultRate" (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId"   UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "milkType"  VARCHAR(20) NOT NULL,
    "fatStart"  DECIMAL(5,2),
    "fatEnd"    DECIMAL(5,2),
    "snfStart"  DECIMAL(5,2),
    "snfEnd"    DECIMAL(5,2),
    "baseRate"  DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- PLAN CONFIG  (silver / gold / platinum)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "PlanConfig" (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan                     VARCHAR(50) UNIQUE NOT NULL,
    "maxCustomers"           INT  NOT NULL,
    "maxStaff"               INT  NOT NULL,
    "featuresWhatsapp"       BOOLEAN DEFAULT false,
    "featuresPdfBilling"     BOOLEAN DEFAULT false,
    "featuresAdvancedReports" BOOLEAN DEFAULT false,
    "priceMonthly"           DECIMAL(10,2) NOT NULL,
    "priceYearly"            DECIMAL(10,2) NOT NULL,
    features                 JSONB DEFAULT '{}'::jsonb,
    "createdAt"              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- MESSAGE TEMPLATES  (WhatsApp / SMS)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "MessageTemplate" (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    name      VARCHAR(100) NOT NULL,
    body      TEXT NOT NULL,
    type      VARCHAR(50) DEFAULT 'whatsapp',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- SUBSCRIPTION REQUEST
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "SubscriptionRequest" (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId"   UUID REFERENCES "User"(id) ON DELETE SET NULL,
    name        VARCHAR(100),
    phone       VARCHAR(20),
    plan        VARCHAR(50),
    status      VARCHAR(50) DEFAULT 'pending',
    "amountPaid" DECIMAL(10,2),
    "paymentId" VARCHAR(100),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- FEEDBACK
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "Feedback" (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId"  UUID REFERENCES "User"(id) ON DELETE SET NULL,
    type      VARCHAR(50) NOT NULL,
    message   TEXT NOT NULL,
    status    VARCHAR(20) DEFAULT 'open',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- AUTH LOG  (login events — no OTP fields)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "AuthLog" (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId"    UUID REFERENCES "User"(id) ON DELETE CASCADE,
    action      VARCHAR(50) NOT NULL,
    ip          VARCHAR(50),
    "userAgent" TEXT,
    success     BOOLEAN,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- RECYCLE BIN  (soft-delete store)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "RecycleBin" (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId"     UUID REFERENCES "User"(id) ON DELETE CASCADE,
    "entityType"  VARCHAR(50) NOT NULL,
    "entityId"    UUID,
    data          JSONB,
    "deletedBy"   UUID REFERENCES "User"(id) ON DELETE SET NULL,
    "deletedAt"   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES  (performance)
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX idx_user_phone          ON "User"("phone");
CREATE INDEX idx_user_owner_id       ON "User"("ownerId");
CREATE INDEX idx_customer_owner_id   ON "Customer"("ownerId");
CREATE INDEX idx_farmer_owner_id     ON "Farmer"("ownerId");
CREATE INDEX idx_dailylog_owner_date ON "DailyLog"("ownerId", date);
CREATE INDEX idx_dailylog_customer   ON "DailyLog"("customerId");
CREATE INDEX idx_collection_owner    ON "DailyCollection"("ownerId", date);
CREATE INDEX idx_collection_farmer   ON "DailyCollection"("farmerId");
CREATE INDEX idx_bill_owner          ON "Bill"("ownerId");
CREATE INDEX idx_authlog_user        ON "AuthLog"("userId");
