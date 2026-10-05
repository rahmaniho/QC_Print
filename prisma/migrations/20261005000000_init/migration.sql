-- Initial PostgreSQL schema for QC Print Inspector.
-- Prisma Client generates cuid() IDs; timestamps/foreign keys remain database-enforced.
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'INSPECTOR', 'VIEWER');
CREATE TYPE "MaterialType" AS ENUM ('PAPER', 'FILM', 'INK', 'COATING', 'ADHESIVE');
CREATE TYPE "PrintType" AS ENUM ('OFFSET', 'FLEXO', 'GRAVURE', 'DIGITAL', 'SCREEN', 'HYBRID');
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "InspectionStage" AS ENUM ('PRE_PRESS', 'ON_PRESS', 'POST_PRESS');
CREATE TYPE "InspectionStatus" AS ENUM ('PASS', 'CONDITIONAL', 'FAIL');
CREATE TYPE "ColorChannel" AS ENUM ('C', 'M', 'Y', 'K');
CREATE TYPE "AdhesionMethod" AS ENUM ('ASTM_D3359');
CREATE TYPE "DefectSeverity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR');
CREATE TYPE "CapaMethod" AS ENUM ('FIVE_WHY', 'ISHIKAWA');
CREATE TYPE "CapaStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');
CREATE TYPE "LegalCompliance" AS ENUM ('VERIFIED', 'NON_COMPLIANT', 'NOT_APPLICABLE', 'PENDING');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'INSPECTOR',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "authVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contact" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Material" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "MaterialType" NOT NULL,
  "supplier" TEXT,
  "spec" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Job" (
  "id" TEXT NOT NULL,
  "jobNumber" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "printType" "PrintType" NOT NULL,
  "productName" TEXT NOT NULL,
  "dimensions" TEXT NOT NULL,
  "colorsCount" INTEGER NOT NULL,
  "substrate" TEXT NOT NULL,
  "ink" TEXT,
  "targetStandard" TEXT,
  "quantity" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3),
  "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
  "referenceFileUrl" TEXT,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Inspection" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "inspectorId" TEXT NOT NULL,
  "inspectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "stage" "InspectionStage" NOT NULL,
  "sampleSize" INTEGER NOT NULL,
  "aqlLevel" TEXT,
  "environmentalTemp" DOUBLE PRECISION,
  "environmentalHumidity" DOUBLE PRECISION,
  "legalCompliance" "LegalCompliance" NOT NULL DEFAULT 'PENDING',
  "status" "InspectionStatus" NOT NULL DEFAULT 'CONDITIONAL',
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ColorMeasurement" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "patchName" TEXT NOT NULL,
  "patchType" TEXT NOT NULL DEFAULT 'SOLID',
  "targetL" DOUBLE PRECISION NOT NULL,
  "targetA" DOUBLE PRECISION NOT NULL,
  "targetB" DOUBLE PRECISION NOT NULL,
  "measuredL" DOUBLE PRECISION NOT NULL,
  "measuredA" DOUBLE PRECISION NOT NULL,
  "measuredB" DOUBLE PRECISION NOT NULL,
  "deltaE00" DOUBLE PRECISION NOT NULL,
  "deltaE76" DOUBLE PRECISION NOT NULL,
  "tolerance" DOUBLE PRECISION NOT NULL,
  "isPass" BOOLEAN NOT NULL,
  CONSTRAINT "ColorMeasurement_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DensityMeasurement" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "colorChannel" "ColorChannel" NOT NULL,
  "targetDensity" DOUBLE PRECISION NOT NULL,
  "measuredDensity" DOUBLE PRECISION NOT NULL,
  "tvi" DOUBLE PRECISION,
  "isPass" BOOLEAN NOT NULL,
  CONSTRAINT "DensityMeasurement_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RegisterMeasurement" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "targetOffset" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "measuredOffset" DOUBLE PRECISION NOT NULL,
  "tolerance" DOUBLE PRECISION NOT NULL,
  "isPass" BOOLEAN NOT NULL,
  CONSTRAINT "RegisterMeasurement_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AdhesionTest" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "method" "AdhesionMethod" NOT NULL DEFAULT 'ASTM_D3359',
  "rating" TEXT NOT NULL,
  "isPass" BOOLEAN NOT NULL,
  CONSTRAINT "AdhesionTest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BarcodeTest" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "symbology" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "isPass" BOOLEAN NOT NULL,
  CONSTRAINT "BarcodeTest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Defect" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "type" "DefectSeverity" NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "location" TEXT,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Defect_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Capa" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "defectId" TEXT,
  "rootCause" TEXT NOT NULL,
  "method" "CapaMethod" NOT NULL,
  "correctiveAction" TEXT NOT NULL,
  "preventiveAction" TEXT NOT NULL,
  "responsibleUserId" TEXT,
  "dueDate" TIMESTAMP(3),
  "status" "CapaStatus" NOT NULL DEFAULT 'OPEN',
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Capa_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Standard" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "parameters" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Standard_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PasswordReset" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RateLimit" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_email_idx" ON "Customer"("email");
CREATE INDEX "Material_type_name_idx" ON "Material"("type", "name");
CREATE INDEX "Material_supplier_idx" ON "Material"("supplier");
CREATE UNIQUE INDEX "Job_jobNumber_key" ON "Job"("jobNumber");
CREATE INDEX "Job_customerId_createdAt_idx" ON "Job"("customerId", "createdAt");
CREATE INDEX "Job_printType_status_idx" ON "Job"("printType", "status");
CREATE INDEX "Job_dueDate_status_idx" ON "Job"("dueDate", "status");
CREATE INDEX "Job_createdById_idx" ON "Job"("createdById");
CREATE INDEX "Inspection_jobId_inspectionDate_idx" ON "Inspection"("jobId", "inspectionDate");
CREATE INDEX "Inspection_inspectorId_inspectionDate_idx" ON "Inspection"("inspectorId", "inspectionDate");
CREATE INDEX "Inspection_status_inspectionDate_idx" ON "Inspection"("status", "inspectionDate");
CREATE INDEX "Inspection_inspectionDate_idx" ON "Inspection"("inspectionDate");
CREATE INDEX "ColorMeasurement_inspectionId_patchName_idx" ON "ColorMeasurement"("inspectionId", "patchName");
CREATE INDEX "ColorMeasurement_isPass_idx" ON "ColorMeasurement"("isPass");
CREATE INDEX "DensityMeasurement_inspectionId_colorChannel_idx" ON "DensityMeasurement"("inspectionId", "colorChannel");
CREATE INDEX "DensityMeasurement_isPass_idx" ON "DensityMeasurement"("isPass");
CREATE UNIQUE INDEX "RegisterMeasurement_inspectionId_key" ON "RegisterMeasurement"("inspectionId");
CREATE INDEX "RegisterMeasurement_isPass_idx" ON "RegisterMeasurement"("isPass");
CREATE UNIQUE INDEX "AdhesionTest_inspectionId_key" ON "AdhesionTest"("inspectionId");
CREATE INDEX "AdhesionTest_isPass_idx" ON "AdhesionTest"("isPass");
CREATE UNIQUE INDEX "BarcodeTest_inspectionId_key" ON "BarcodeTest"("inspectionId");
CREATE INDEX "BarcodeTest_grade_isPass_idx" ON "BarcodeTest"("grade", "isPass");
CREATE INDEX "Defect_inspectionId_type_idx" ON "Defect"("inspectionId", "type");
CREATE INDEX "Defect_type_createdAt_idx" ON "Defect"("type", "createdAt");
CREATE INDEX "Defect_category_idx" ON "Defect"("category");
CREATE UNIQUE INDEX "Capa_defectId_key" ON "Capa"("defectId");
CREATE INDEX "Capa_status_dueDate_idx" ON "Capa"("status", "dueDate");
CREATE INDEX "Capa_inspectionId_idx" ON "Capa"("inspectionId");
CREATE INDEX "Capa_responsibleUserId_idx" ON "Capa"("responsibleUserId");
CREATE UNIQUE INDEX "Standard_code_key" ON "Standard"("code");
CREATE INDEX "Standard_name_idx" ON "Standard"("name");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");
CREATE INDEX "PasswordReset_userId_expiresAt_idx" ON "PasswordReset"("userId", "expiresAt");
CREATE INDEX "PasswordReset_expiresAt_idx" ON "PasswordReset"("expiresAt");
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");

ALTER TABLE "Job" ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ColorMeasurement" ADD CONSTRAINT "ColorMeasurement_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DensityMeasurement" ADD CONSTRAINT "DensityMeasurement_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegisterMeasurement" ADD CONSTRAINT "RegisterMeasurement_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdhesionTest" ADD CONSTRAINT "AdhesionTest_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BarcodeTest" ADD CONSTRAINT "BarcodeTest_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Capa" ADD CONSTRAINT "Capa_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Capa" ADD CONSTRAINT "Capa_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "Defect"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Capa" ADD CONSTRAINT "Capa_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
