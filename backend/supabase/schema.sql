-- ═══════════════════════════════════════════════════════════════
-- Dairy Management — PostgreSQL Schema (Clean, No OTP)
-- ═══════════════════════════════════════════════════════════════

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
    "verificationCode"   VARCHAR(10),

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

    -- Subscription (flat fields + JSONB for compatibility)
    subscription         JSONB         DEFAULT '{}'::jsonb,
    "subscriptionStatus" VARCHAR(20)   DEFAULT 'trial',
    "subscriptionPlan"   VARCHAR(20)   DEFAULT 'gold',
    "trialEndsAt"        TIMESTAMP WITH TIME ZONE,
    "expiresAt"          TIMESTAMP WITH TIME ZONE,

    -- Features JSON (important for backend compatibility)
    features             JSONB         DEFAULT '{}'::jsonb,
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
    "milkType"     VARCHAR(20)  DEFAULT 'cow',
    "base_requirement" JSONB DEFAULT '{"morning":0,"evening":0}'::jsonb,
    "default_price" DECIMAL(10,2),
    "custom_price" DECIMAL(10,2),
    notes          TEXT,
    "assignedStaffId" UUID REFERENCES "User"(id) ON DELETE SET NULL,
    "customerCode" VARCHAR(50),
    "showCodeToStaff" BOOLEAN DEFAULT false,
    language       VARCHAR(10) DEFAULT 'en',
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
    address     TEXT,
    "milkType"  VARCHAR(20)  DEFAULT 'cow',
    "default_price" DECIMAL(10,2),
    "custom_price" DECIMAL(10,2),
    notes       TEXT,
    "assignedStaffId" UUID REFERENCES "User"(id) ON DELETE SET NULL,
    "customerCode" VARCHAR(50),
    "showCodeToStaff" BOOLEAN DEFAULT false,
    language    VARCHAR(10) DEFAULT 'en',
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
    "ownerId"      UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "customerId"   UUID NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
    "staffId"      UUID REFERENCES "User"(id) ON DELETE SET NULL,
    date           DATE NOT NULL,
    slot           VARCHAR(20) NOT NULL,
    "base_qty"     DECIMAL(10,2) DEFAULT 0.00,
    "extra_qty"    DECIMAL(10,2) DEFAULT 0.00,
    "delivered_qty" DECIMAL(10,2) NOT NULL,
    "price_per_liter" DECIMAL(10,2) NOT NULL,
    "amount_calculated" DECIMAL(10,2) NOT NULL,
    notes          TEXT,
    "whatsappSent" BOOLEAN DEFAULT false,
    "whatsappError" TEXT,
    "isEdited"     BOOLEAN DEFAULT false,
    "editedBy"     VARCHAR(100),
    "createdAt"    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt"    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- DAILY COLLECTION  (owner milk intake / staff quotas)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "DailyCollection" (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId"      UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    date           DATE NOT NULL,
    "totalLiters"  DECIMAL(10,2) NOT NULL,
    source         VARCHAR(100),
    "procurementRate" DECIMAL(10,2),
    "staffQuotas"  JSONB DEFAULT '[]'::jsonb,
    "unallocatedLiters" DECIMAL(10,2),
    notes          TEXT,
    "createdAt"    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt"    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- FARMER COLLECTION  (farmer milk intake logs)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "FarmerCollection" (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId"      UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "dairyOwnerId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "collectionNumber" VARCHAR(50) NOT NULL,
    "farmerId"     UUID NOT NULL REFERENCES "Farmer"(id) ON DELETE CASCADE,
    "supplierId"   UUID NOT NULL REFERENCES "Farmer"(id) ON DELETE CASCADE,
    date           DATE NOT NULL,
    "collectionDate" DATE NOT NULL,
    time           VARCHAR(20) NOT NULL,
    "collectionTime" VARCHAR(20) NOT NULL,
    shift          VARCHAR(20) NOT NULL,
    "milkType"     VARCHAR(20) NOT NULL,
    quantity       DECIMAL(10,2) NOT NULL,
    fat            DECIMAL(5,2),
    snf            DECIMAL(5,2),
    clr            DECIMAL(5,2),
    "ratePerLiter" DECIMAL(10,2) NOT NULL,
    "baseRate"     DECIMAL(10,2) DEFAULT 0,
    "fatValue"     DECIMAL(10,2) DEFAULT 0,
    "snfValue"     DECIMAL(10,2) DEFAULT 0,
    "grossAmount"  DECIMAL(10,2) NOT NULL,
    "bonusAmount"  DECIMAL(10,2) DEFAULT 0,
    "deductionAmount" DECIMAL(10,2) DEFAULT 0,
    "netAmount"    DECIMAL(10,2) NOT NULL,
    notes          TEXT,
    "collectedBy"  UUID REFERENCES "User"(id) ON DELETE SET NULL,
    "isEdited"     BOOLEAN DEFAULT false,
    "editedBy"     VARCHAR(100),
    "createdAt"    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt"    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- BILLS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "Bill" (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId"         UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "customerId"      UUID NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
    month             INT NOT NULL,
    year              INT NOT NULL,
    "totalLiters"     DECIMAL(10,2) DEFAULT 0.00,
    "totalAmount"     DECIMAL(10,2) DEFAULT 0.00,
    "previousBalance" DECIMAL(10,2) DEFAULT 0.00,
    "grandTotal"      DECIMAL(10,2) DEFAULT 0.00,
    balance           DECIMAL(10,2) DEFAULT 0.00,
    status            VARCHAR(20) DEFAULT 'pending',
    "logSnapshot"     JSONB,
    "amountPaid"      DECIMAL(10,2) DEFAULT 0.00,
    payments          JSONB DEFAULT '[]'::jsonb,
    "createdAt"       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt"       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- DEFAULT RATE  (customer-side rate by milk type)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "DefaultRate" (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId"      UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    rate           DECIMAL(10,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    note           TEXT,
    "changedBy"    UUID REFERENCES "User"(id) ON DELETE SET NULL,
    "createdAt"    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt"    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- DAIRY DEFAULT RATE  (farmer fat/snf rate chart)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "DairyDefaultRate" (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "dairyOwnerId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "milkType"  VARCHAR(20) NOT NULL,
    "baseRate"  DECIMAL(10,2) NOT NULL,
    "fatMultiplier" DECIMAL(10,2) NOT NULL,
    "snfMultiplier" DECIMAL(10,2) NOT NULL,
    "standardFat" DECIMAL(10,2) DEFAULT 4.0,
    "standardSNF" DECIMAL(10,2) DEFAULT 8.5,
    "bonusPerLiter" DECIMAL(10,2) DEFAULT 0,
    "deductionPerLiter" DECIMAL(10,2) DEFAULT 0,
    "standardCLR" DECIMAL(10,2) DEFAULT 28,
    "clrDeductionPerUnit" DECIMAL(10,2) DEFAULT 0,
    "effectiveFrom" TIMESTAMP WITH TIME ZONE,
    "isActive"  BOOLEAN DEFAULT true,
    "createdBy" UUID REFERENCES "User"(id) ON DELETE SET NULL,
    "updatedBy" UUID REFERENCES "User"(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TERM RATE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "TermRate" (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId"   UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    month       INT NOT NULL,
    year        INT NOT NULL,
    "term1Rate" DECIMAL(10,2),
    "term2Rate" DECIMAL(10,2),
    "term3Rate" DECIMAL(10,2),
    "changedBy" UUID REFERENCES "User"(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
-- SYSTEM CONFIG
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "SystemConfig" (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           VARCHAR(100) UNIQUE NOT NULL,
    value          JSONB,
    "createdAt"    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt"    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    "isDefault" BOOLEAN DEFAULT false,
    "isActive"  BOOLEAN DEFAULT true,
    language  VARCHAR(10) DEFAULT 'en',
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
    event       VARCHAR(50),
    role        VARCHAR(50),
    "userName"  VARCHAR(100),
    "userPhone" VARCHAR(50),
    detail      TEXT,
    "ipAddress" VARCHAR(50),
    action      VARCHAR(50),
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
    "modelType"   VARCHAR(50) NOT NULL,
    "originalId"  UUID,
    data          JSONB,
    "cascadedFrom" JSONB,
    "deletedBy"   UUID REFERENCES "User"(id) ON DELETE SET NULL,
    "expiresAt"   TIMESTAMP WITH TIME ZONE,
    "deletedAt"   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- WHATSAPP CONNECTION
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "WhatsappConnection" (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ownerId"   UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    status      VARCHAR(50) DEFAULT 'disconnected',
    "qrCode"    TEXT,
    "lastConnected" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
CREATE INDEX idx_bill_owner          ON "Bill"("ownerId");
CREATE INDEX idx_authlog_user        ON "AuthLog"("userId");
