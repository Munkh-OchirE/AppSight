-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationName" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "applicationUrl" TEXT,
    "vendorWebsite" TEXT,
    "trustCentreUrl" TEXT,
    "description" TEXT NOT NULL,
    "businessOwner" TEXT,
    "procurementStage" TEXT,
    "vendorStatus" TEXT,
    "criticality" TEXT,
    "assessmentLevel" TEXT,
    "riskScore" INTEGER,
    "riskRating" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "decisionStatus" TEXT,
    "decisionBy" TEXT,
    "decisionAt" DATETIME,
    "decisionJustification" TEXT,
    "rejectionReason" TEXT,
    "remediationActions" TEXT,
    "rejectionDueDate" DATETIME,
    "rejectionOwner" TEXT,
    "approvedWithExceptions" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "confidence" TEXT,
    "source" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Answer_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvidenceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "confidence" TEXT,
    "sourceUrl" TEXT,
    "sourceTextSnippet" TEXT,
    "uploadedFileName" TEXT,
    "issuer" TEXT,
    "issueDate" TEXT,
    "expiryDate" TEXT,
    "scope" TEXT,
    "notes" TEXT,
    "recommendedAction" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "requirementLevel" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EvidenceItem_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskFinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "scoreImpact" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "recommendation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiskFinding_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LlmOutput" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputJson" TEXT NOT NULL,
    "outputJson" TEXT NOT NULL,
    "checkpointsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LlmOutput_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "detailsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Answer_assessmentId_idx" ON "Answer"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_assessmentId_section_field_key" ON "Answer"("assessmentId", "section", "field");

-- CreateIndex
CREATE INDEX "EvidenceItem_assessmentId_idx" ON "EvidenceItem"("assessmentId");

-- CreateIndex
CREATE INDEX "EvidenceItem_assessmentId_type_idx" ON "EvidenceItem"("assessmentId", "type");

-- CreateIndex
CREATE INDEX "RiskFinding_assessmentId_idx" ON "RiskFinding"("assessmentId");

-- CreateIndex
CREATE INDEX "LlmOutput_assessmentId_idx" ON "LlmOutput"("assessmentId");

-- CreateIndex
CREATE INDEX "Report_assessmentId_idx" ON "Report"("assessmentId");

-- CreateIndex
CREATE INDEX "AuditLog_assessmentId_idx" ON "AuditLog"("assessmentId");
