-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EXECUTIVE', 'PRODUCER', 'DEVELOPMENT', 'WRITER', 'ARTIST', 'CONTRACTOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('IDEA', 'SUBMISSION', 'TREATMENT', 'SCRIPT', 'REWRITE', 'VISUAL_DEVELOPMENT', 'LOOKBOOK', 'PACKAGING', 'GREENLIGHT_REVIEW', 'ON_HOLD', 'PASSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('DEVELOPMENT', 'SCRIPT', 'TREATMENT', 'VISDEV', 'LOOKBOOK', 'PACKAGING', 'GREENLIGHT');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SCRIPT', 'TREATMENT', 'OUTLINE', 'NOTES', 'COVERAGE', 'BUSINESS_DOCUMENT');

-- CreateEnum
CREATE TYPE "DocumentVersionStatus" AS ENUM ('RECEIVED', 'LOGGED', 'READING', 'COVERAGE_REQUESTED', 'COVERAGE_COMPLETE', 'CONSIDER', 'PASS', 'DEVELOPMENT', 'PROJECT_LINKED', 'DRAFT', 'OUTLINE', 'IN_PROGRESS', 'INTERNAL_REVIEW', 'NOTES_SENT', 'REVISION_REQUESTED', 'APPROVED', 'LOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('CHARACTER', 'LOCATION', 'PROP', 'VEHICLE', 'ACTION', 'VFX', 'NOTE');

-- CreateEnum
CREATE TYPE "EntityImportance" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'HERO');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('CHARACTER_REFERENCE', 'ENVIRONMENT_REFERENCE', 'PROP_REFERENCE', 'MOOD_IMAGE', 'KEYFRAME', 'LOOKBOOK_PAGE', 'STORYBOARD', 'ANIMATIC', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('UPLOADED', 'IN_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('REFERENCE', 'DESIGN_TARGET', 'BREAKDOWN_ITEM', 'APPROVED_LOOK', 'REVIEW_CONTEXT');

-- CreateEnum
CREATE TYPE "CommentTargetType" AS ENUM ('PROJECT', 'DOCUMENT', 'DOCUMENT_VERSION', 'SCENE', 'ENTITY', 'ASSET', 'TASK', 'APPROVAL');

-- CreateEnum
CREATE TYPE "CommentVisibility" AS ENUM ('INTERNAL', 'PROJECT_TEAM', 'EXECUTIVE_ONLY');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('OPEN', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'ON_HOLD', 'BLOCKED', 'REVIEW', 'DONE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskTargetType" AS ENUM ('PROJECT', 'PROJECT_LEAD', 'DOCUMENT', 'DOCUMENT_VERSION', 'SCENE', 'ENTITY', 'ASSET', 'APPROVAL');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('WRITER', 'PRODUCER', 'ARTIST', 'EXECUTIVE', 'AGENCY', 'MANAGEMENT', 'LEGAL', 'VENDOR', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportingDocumentType" AS ENUM ('CONTEXT', 'COVERAGE', 'NOTES', 'EMAIL', 'WRITER_MATERIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('locked', 'stable', 'watch', 'at_risk', 'blocked', 'outdated');

-- CreateEnum
CREATE TYPE "ApprovalState" AS ENUM ('approved', 'pending', 'needs_review', 'blocked');

-- CreateEnum
CREATE TYPE "ChangePriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "ScriptFileKind" AS ENUM ('fdx', 'pdf', 'txt', 'docx', 'other');

-- CreateEnum
CREATE TYPE "SceneDiffStatus" AS ENUM ('added', 'removed', 'changed', 'stable');

-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('admin', 'executive', 'producer', 'department_lead');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('owner', 'executive', 'producer', 'department_lead', 'viewer');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('pending', 'extracted', 'ocr_required', 'failed');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "logline" TEXT,
    "type" TEXT,
    "genre" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'IDEA',
    "hammerStage" "ProjectStage" NOT NULL DEFAULT 'DEVELOPMENT',
    "ownerId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "codename" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'Development',
    "studioUnit" TEXT NOT NULL DEFAULT 'Unassigned Unit',
    "currentScriptVersion" TEXT NOT NULL DEFAULT 'S-01 White',
    "currentTreatmentVersion" TEXT NOT NULL DEFAULT 'T-01',
    "treatmentAlignment" INTEGER NOT NULL DEFAULT 0,
    "previzCompletion" INTEGER NOT NULL DEFAULT 0,
    "changeRiskLevel" "RiskLevel" NOT NULL DEFAULT 'medium',
    "pendingApprovals" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectLead" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "externalId" TEXT,
    "logline" TEXT,
    "genre" TEXT,
    "lane" TEXT,
    "creator" TEXT,
    "priorityScore" DOUBLE PRECISION,
    "subgenreTags" TEXT,
    "urgencyLabel" TEXT,
    "discoveryStage" TEXT,
    "countryLanguage" TEXT,
    "platformSource" TEXT,
    "whyItMatters" TEXT,
    "signalProof" TEXT,
    "sourceLink" TEXT,
    "rightsStatus" TEXT,
    "rightsHolder" TEXT,
    "contactRep" TEXT,
    "adaptationFormat" TEXT,
    "comps" TEXT,
    "heatScore" DOUBLE PRECISION,
    "conceptScore" DOUBLE PRECISION,
    "adaptabilityScore" DOUBLE PRECISION,
    "rightsOpportunityScore" DOUBLE PRECISION,
    "studioFitScore" DOUBLE PRECISION,
    "nextActionStatus" TEXT,
    "owner" TEXT,
    "nextStep" TEXT,
    "lastUpdated" TEXT,
    "notes" TEXT,
    "projectCover" TEXT,
    "searchKeywords" TEXT,
    "originalReleaseDate" TEXT,
    "myPicks" TEXT,
    "actionItems" TEXT,
    "country" TEXT,
    "votes" DOUBLE PRECISION,
    "yearWritten" TEXT,
    "scriptStatus" TEXT,
    "format" TEXT,
    "scriptPdf" TEXT,
    "promotedProjectId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "googleId" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PRODUCER',
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "appRole" "AppRole" NOT NULL DEFAULT 'producer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMembership" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "currentVersionId" TEXT,
    "createdById" TEXT,
    "writerName" TEXT,
    "source" TEXT,
    "contactId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "DocumentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "extractedText" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentDiff" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fromVersionId" TEXT NOT NULL,
    "toVersionId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "diffJson" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentDiff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportingDocument" (
    "id" TEXT NOT NULL,
    "scriptDocumentId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "type" "SupportingDocumentType" NOT NULL DEFAULT 'CONTEXT',
    "notes" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "extractedText" TEXT,
    "uploadedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "notes" TEXT,
    "alignmentPercent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "versionName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawParseJson" JSONB,
    "rawText" TEXT,

    CONSTRAINT "ScriptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptFile" (
    "id" TEXT NOT NULL,
    "scriptVersionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "kind" "ScriptFileKind" NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'extracted',
    "extractionError" TEXT,
    "ocrProvider" TEXT,
    "ocrRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScriptFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParsedScene" (
    "id" TEXT NOT NULL,
    "scriptVersionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sceneNumber" INTEGER NOT NULL,
    "slugline" TEXT NOT NULL,
    "interiorExterior" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "timeOfDay" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "actionText" TEXT NOT NULL,
    "pageEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'low',
    "rawSceneJson" JSONB,

    CONSTRAINT "ParsedScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Environment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prop" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneCharacter" (
    "parsedSceneId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,

    CONSTRAINT "SceneCharacter_pkey" PRIMARY KEY ("parsedSceneId","characterId")
);

-- CreateTable
CREATE TABLE "SceneEnvironment" (
    "parsedSceneId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,

    CONSTRAINT "SceneEnvironment_pkey" PRIMARY KEY ("parsedSceneId","environmentId")
);

-- CreateTable
CREATE TABLE "SceneProp" (
    "parsedSceneId" TEXT NOT NULL,
    "propId" TEXT NOT NULL,

    CONSTRAINT "SceneProp_pkey" PRIMARY KEY ("parsedSceneId","propId")
);

-- CreateTable
CREATE TABLE "ScriptDiff" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromScriptVersionId" TEXT NOT NULL,
    "toScriptVersionId" TEXT NOT NULL,
    "summaryJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScriptDiff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneDiff" (
    "id" TEXT NOT NULL,
    "scriptDiffId" TEXT NOT NULL,
    "sceneNumber" INTEGER NOT NULL,
    "status" "SceneDiffStatus" NOT NULL,
    "beforeSlugline" TEXT,
    "afterSlugline" TEXT,
    "locationChanged" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'low',
    "rawDiffJson" JSONB NOT NULL,

    CONSTRAINT "SceneDiff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "act" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "logline" TEXT NOT NULL,
    "treatmentStatus" "Status" NOT NULL DEFAULT 'watch',
    "scriptStatus" "Status" NOT NULL DEFAULT 'watch',
    "storyboardStatus" "Status" NOT NULL DEFAULT 'watch',
    "previzStatus" "Status" NOT NULL DEFAULT 'watch',
    "vfxStatus" "Status" NOT NULL DEFAULT 'watch',
    "stuntsStatus" "Status" NOT NULL DEFAULT 'watch',
    "stability" "RiskLevel" NOT NULL DEFAULT 'medium',
    "completion" INTEGER NOT NULL DEFAULT 0,
    "approvalState" "ApprovalState" NOT NULL DEFAULT 'pending',

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "documentVersionId" TEXT,
    "sceneNumber" TEXT,
    "heading" TEXT,
    "location" TEXT,
    "timeOfDay" TEXT,
    "synopsis" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "sequenceId" TEXT,
    "number" TEXT NOT NULL,
    "slugline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "scriptVersionName" TEXT,
    "status" "Status" NOT NULL DEFAULT 'watch',
    "changedFrom" TEXT,
    "creativeDriftNote" TEXT,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "EntityType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneEntity" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "importance" "EntityImportance" NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT,

    CONSTRAINT "SceneEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assetType" "AssetType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "dataUrl" TEXT,
    "thumbnailPath" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'UPLOADED',
    "uploadedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "type" "ContactType" NOT NULL DEFAULT 'OTHER',
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "projectIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetLink" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sceneId" TEXT,
    "entityId" TEXT,
    "documentVersionId" TEXT,
    "linkType" "LinkType" NOT NULL DEFAULT 'REFERENCE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "targetType" "CommentTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "body" TEXT NOT NULL,
    "visibility" "CommentVisibility" NOT NULL DEFAULT 'PROJECT_TEAM',
    "status" "CommentStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HammerApproval" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "targetType" "CommentTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "requestedById" TEXT,
    "reviewerId" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'REQUESTED',
    "decisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "HammerApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "dueDate" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "targetType" "TaskTargetType",
    "targetId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "storyboardPanel" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'watch',

    CONSTRAINT "Shot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrevizShot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "shotId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'watch',
    "outdatedReason" TEXT,
    "owner" TEXT,

    CONSTRAINT "PrevizShot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lead" TEXT,
    "status" "Status" NOT NULL DEFAULT 'stable',

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sequenceId" TEXT,
    "departmentId" TEXT,
    "state" "ApprovalState" NOT NULL DEFAULT 'pending',
    "owner" TEXT,
    "due" TIMESTAMP(3),
    "assignedRole" "ProjectRole",
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sequenceId" TEXT,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "level" "RiskLevel" NOT NULL DEFAULT 'medium',
    "owner" TEXT,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sequenceId" TEXT,
    "sceneId" TEXT,
    "submittedBy" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" "ChangePriority" NOT NULL DEFAULT 'medium',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'medium',
    "impactJson" JSONB,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "actorUserId" TEXT,
    "actor" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "detailJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_hammerStage_idx" ON "Project"("hammerStage");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectLead_externalId_key" ON "ProjectLead"("externalId");

-- CreateIndex
CREATE INDEX "ProjectLead_lane_idx" ON "ProjectLead"("lane");

-- CreateIndex
CREATE INDEX "ProjectLead_genre_idx" ON "ProjectLead"("genre");

-- CreateIndex
CREATE INDEX "ProjectLead_urgencyLabel_idx" ON "ProjectLead"("urgencyLabel");

-- CreateIndex
CREATE INDEX "ProjectLead_rightsStatus_idx" ON "ProjectLead"("rightsStatus");

-- CreateIndex
CREATE INDEX "ProjectLead_nextActionStatus_idx" ON "ProjectLead"("nextActionStatus");

-- CreateIndex
CREATE INDEX "ProjectLead_owner_idx" ON "ProjectLead"("owner");

-- CreateIndex
CREATE INDEX "ProjectLead_scriptStatus_idx" ON "ProjectLead"("scriptStatus");

-- CreateIndex
CREATE INDEX "ProjectLead_promotedProjectId_idx" ON "ProjectLead"("promotedProjectId");

-- CreateIndex
CREATE INDEX "ProjectLead_deletedAt_idx" ON "ProjectLead"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "ProjectMembership_userId_idx" ON "ProjectMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMembership_projectId_userId_key" ON "ProjectMembership"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_currentVersionId_key" ON "Document"("currentVersionId");

-- CreateIndex
CREATE INDEX "Document_projectId_idx" ON "Document"("projectId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Document_deletedAt_idx" ON "Document"("deletedAt");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_createdAt_idx" ON "DocumentVersion"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentVersion_status_idx" ON "DocumentVersion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_versionNumber_key" ON "DocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "DocumentDiff_documentId_idx" ON "DocumentDiff"("documentId");

-- CreateIndex
CREATE INDEX "DocumentDiff_fromVersionId_toVersionId_idx" ON "DocumentDiff"("fromVersionId", "toVersionId");

-- CreateIndex
CREATE INDEX "SupportingDocument_scriptDocumentId_idx" ON "SupportingDocument"("scriptDocumentId");

-- CreateIndex
CREATE INDEX "SupportingDocument_projectId_idx" ON "SupportingDocument"("projectId");

-- CreateIndex
CREATE INDEX "SupportingDocument_deletedAt_idx" ON "SupportingDocument"("deletedAt");

-- CreateIndex
CREATE INDEX "TreatmentVersion_projectId_idx" ON "TreatmentVersion"("projectId");

-- CreateIndex
CREATE INDEX "ScriptVersion_projectId_uploadedAt_idx" ON "ScriptVersion"("projectId", "uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScriptFile_scriptVersionId_key" ON "ScriptFile"("scriptVersionId");

-- CreateIndex
CREATE INDEX "ScriptFile_projectId_idx" ON "ScriptFile"("projectId");

-- CreateIndex
CREATE INDEX "ParsedScene_scriptVersionId_idx" ON "ParsedScene"("scriptVersionId");

-- CreateIndex
CREATE INDEX "ParsedScene_projectId_sceneNumber_idx" ON "ParsedScene"("projectId", "sceneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Character_projectId_name_key" ON "Character"("projectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Environment_projectId_name_key" ON "Environment"("projectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Prop_projectId_name_key" ON "Prop"("projectId", "name");

-- CreateIndex
CREATE INDEX "ScriptDiff_projectId_idx" ON "ScriptDiff"("projectId");

-- CreateIndex
CREATE INDEX "ScriptDiff_fromScriptVersionId_toScriptVersionId_idx" ON "ScriptDiff"("fromScriptVersionId", "toScriptVersionId");

-- CreateIndex
CREATE INDEX "SceneDiff_scriptDiffId_idx" ON "SceneDiff"("scriptDiffId");

-- CreateIndex
CREATE INDEX "Sequence_projectId_idx" ON "Sequence"("projectId");

-- CreateIndex
CREATE INDEX "Scene_projectId_idx" ON "Scene"("projectId");

-- CreateIndex
CREATE INDEX "Scene_documentVersionId_idx" ON "Scene"("documentVersionId");

-- CreateIndex
CREATE INDEX "Scene_sequenceId_idx" ON "Scene"("sequenceId");

-- CreateIndex
CREATE INDEX "Entity_projectId_type_idx" ON "Entity"("projectId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_projectId_type_name_key" ON "Entity"("projectId", "type", "name");

-- CreateIndex
CREATE INDEX "SceneEntity_entityId_idx" ON "SceneEntity"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "SceneEntity_sceneId_entityId_key" ON "SceneEntity"("sceneId", "entityId");

-- CreateIndex
CREATE INDEX "Asset_projectId_idx" ON "Asset"("projectId");

-- CreateIndex
CREATE INDEX "Asset_assetType_idx" ON "Asset"("assetType");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Contact_type_idx" ON "Contact"("type");

-- CreateIndex
CREATE INDEX "Contact_deletedAt_idx" ON "Contact"("deletedAt");

-- CreateIndex
CREATE INDEX "AssetLink_projectId_idx" ON "AssetLink"("projectId");

-- CreateIndex
CREATE INDEX "AssetLink_sceneId_idx" ON "AssetLink"("sceneId");

-- CreateIndex
CREATE INDEX "AssetLink_entityId_idx" ON "AssetLink"("entityId");

-- CreateIndex
CREATE INDEX "Comment_targetType_targetId_idx" ON "Comment"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Comment_createdById_idx" ON "Comment"("createdById");

-- CreateIndex
CREATE INDEX "HammerApproval_projectId_idx" ON "HammerApproval"("projectId");

-- CreateIndex
CREATE INDEX "HammerApproval_reviewerId_idx" ON "HammerApproval"("reviewerId");

-- CreateIndex
CREATE INDEX "HammerApproval_status_idx" ON "HammerApproval"("status");

-- CreateIndex
CREATE INDEX "HammerApproval_targetType_targetId_idx" ON "HammerApproval"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "AuditEvent_actorUserId_idx" ON "AuditEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditEvent_targetType_targetId_idx" ON "AuditEvent"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Shot_projectId_idx" ON "Shot"("projectId");

-- CreateIndex
CREATE INDEX "Shot_sceneId_idx" ON "Shot"("sceneId");

-- CreateIndex
CREATE INDEX "PrevizShot_projectId_idx" ON "PrevizShot"("projectId");

-- CreateIndex
CREATE INDEX "PrevizShot_shotId_idx" ON "PrevizShot"("shotId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_projectId_name_key" ON "Department"("projectId", "name");

-- CreateIndex
CREATE INDEX "Approval_projectId_idx" ON "Approval"("projectId");

-- CreateIndex
CREATE INDEX "Approval_decidedByUserId_idx" ON "Approval"("decidedByUserId");

-- CreateIndex
CREATE INDEX "Risk_projectId_idx" ON "Risk"("projectId");

-- CreateIndex
CREATE INDEX "ChangeRequest_projectId_idx" ON "ChangeRequest"("projectId");

-- CreateIndex
CREATE INDEX "AuditLog_projectId_idx" ON "AuditLog"("projectId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLead" ADD CONSTRAINT "ProjectLead_promotedProjectId_fkey" FOREIGN KEY ("promotedProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDiff" ADD CONSTRAINT "DocumentDiff_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDiff" ADD CONSTRAINT "DocumentDiff_fromVersionId_fkey" FOREIGN KEY ("fromVersionId") REFERENCES "DocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDiff" ADD CONSTRAINT "DocumentDiff_toVersionId_fkey" FOREIGN KEY ("toVersionId") REFERENCES "DocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDiff" ADD CONSTRAINT "DocumentDiff_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportingDocument" ADD CONSTRAINT "SupportingDocument_scriptDocumentId_fkey" FOREIGN KEY ("scriptDocumentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportingDocument" ADD CONSTRAINT "SupportingDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportingDocument" ADD CONSTRAINT "SupportingDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentVersion" ADD CONSTRAINT "TreatmentVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptVersion" ADD CONSTRAINT "ScriptVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptFile" ADD CONSTRAINT "ScriptFile_scriptVersionId_fkey" FOREIGN KEY ("scriptVersionId") REFERENCES "ScriptVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParsedScene" ADD CONSTRAINT "ParsedScene_scriptVersionId_fkey" FOREIGN KEY ("scriptVersionId") REFERENCES "ScriptVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneCharacter" ADD CONSTRAINT "SceneCharacter_parsedSceneId_fkey" FOREIGN KEY ("parsedSceneId") REFERENCES "ParsedScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneCharacter" ADD CONSTRAINT "SceneCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneEnvironment" ADD CONSTRAINT "SceneEnvironment_parsedSceneId_fkey" FOREIGN KEY ("parsedSceneId") REFERENCES "ParsedScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneEnvironment" ADD CONSTRAINT "SceneEnvironment_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneProp" ADD CONSTRAINT "SceneProp_parsedSceneId_fkey" FOREIGN KEY ("parsedSceneId") REFERENCES "ParsedScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneProp" ADD CONSTRAINT "SceneProp_propId_fkey" FOREIGN KEY ("propId") REFERENCES "Prop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptDiff" ADD CONSTRAINT "ScriptDiff_fromScriptVersionId_fkey" FOREIGN KEY ("fromScriptVersionId") REFERENCES "ScriptVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptDiff" ADD CONSTRAINT "ScriptDiff_toScriptVersionId_fkey" FOREIGN KEY ("toScriptVersionId") REFERENCES "ScriptVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneDiff" ADD CONSTRAINT "SceneDiff_scriptDiffId_fkey" FOREIGN KEY ("scriptDiffId") REFERENCES "ScriptDiff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneEntity" ADD CONSTRAINT "SceneEntity_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneEntity" ADD CONSTRAINT "SceneEntity_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetLink" ADD CONSTRAINT "AssetLink_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetLink" ADD CONSTRAINT "AssetLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetLink" ADD CONSTRAINT "AssetLink_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetLink" ADD CONSTRAINT "AssetLink_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetLink" ADD CONSTRAINT "AssetLink_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HammerApproval" ADD CONSTRAINT "HammerApproval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HammerApproval" ADD CONSTRAINT "HammerApproval_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HammerApproval" ADD CONSTRAINT "HammerApproval_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shot" ADD CONSTRAINT "Shot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shot" ADD CONSTRAINT "Shot_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrevizShot" ADD CONSTRAINT "PrevizShot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrevizShot" ADD CONSTRAINT "PrevizShot_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

