export type HammerRole = "ADMIN" | "EXECUTIVE" | "PRODUCER" | "DEVELOPMENT" | "WRITER" | "ARTIST" | "CONTRACTOR" | "VIEWER";
export type HammerProjectStatus = "IDEA" | "SUBMISSION" | "TREATMENT" | "SCRIPT" | "REWRITE" | "VISUAL_DEVELOPMENT" | "LOOKBOOK" | "PACKAGING" | "GREENLIGHT_REVIEW" | "ON_HOLD" | "PASSED" | "ARCHIVED";
export type HammerProjectStage = "DEVELOPMENT" | "SCRIPT" | "TREATMENT" | "VISDEV" | "LOOKBOOK" | "PACKAGING" | "GREENLIGHT";
export type DocumentType = "SCRIPT" | "TREATMENT" | "OUTLINE" | "NOTES" | "COVERAGE" | "BUSINESS_DOCUMENT";
export type ScriptStatus = "RECEIVED" | "LOGGED" | "READING" | "COVERAGE_REQUESTED" | "COVERAGE_COMPLETE" | "CONSIDER" | "PASS" | "DEVELOPMENT" | "PROJECT_LINKED" | "DRAFT" | "OUTLINE" | "IN_PROGRESS" | "INTERNAL_REVIEW" | "NOTES_SENT" | "REVISION_REQUESTED" | "APPROVED" | "LOCKED" | "ARCHIVED";
export type EntityType = "CHARACTER" | "LOCATION" | "PROP" | "VEHICLE" | "ACTION" | "VFX" | "NOTE";
export type AssetType = "CHARACTER_REFERENCE" | "ENVIRONMENT_REFERENCE" | "PROP_REFERENCE" | "MOOD_IMAGE" | "KEYFRAME" | "LOOKBOOK_PAGE" | "STORYBOARD" | "ANIMATIC" | "OTHER";
export type AssetStatus = "UPLOADED" | "IN_REVIEW" | "REVISION_REQUESTED" | "APPROVED" | "ARCHIVED";
export type ApprovalStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "CANCELLED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "ON_HOLD" | "BLOCKED" | "REVIEW" | "DONE" | "ARCHIVED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ContactType = "WRITER" | "PRODUCER" | "ARTIST" | "EXECUTIVE" | "AGENCY" | "MANAGEMENT" | "LEGAL" | "VENDOR" | "OTHER";
export type ContactStatus = "NEW" | "ACTIVE" | "FOLLOW_UP" | "WAITING" | "DO_NOT_CONTACT" | "ARCHIVED";

export const HAMMER_ACTIVE_PROJECT_STORAGE_KEY = "hammer-os-active-project-id";
export const HAMMER_ACTIVE_PROJECT_EVENT = "hammer-os-active-project-changed";
export const HAMMER_DEMO_USER_STORAGE_KEY = "hammer-os-demo-user-email";
export const HAMMER_DEMO_USER_EVENT = "hammer-os-demo-user-changed";
export const HAMMER_LOCAL_DOCUMENTS_STORAGE_KEY = "hammer-os-local-documents";
export const HAMMER_LOCAL_DOCUMENTS_EVENT = "hammer-os-local-documents-changed";
export const HAMMER_LOCAL_VERSIONS_STORAGE_KEY = "hammer-os-local-document-versions";
export const HAMMER_LOCAL_PROJECTS_STORAGE_KEY = "hammer-os-local-projects";
export const HAMMER_LOCAL_PROJECTS_EVENT = "hammer-os-local-projects-changed";
export const HAMMER_LOCAL_CONTACTS_STORAGE_KEY = "hammer-os-local-contacts";
export const HAMMER_LOCAL_VERSION_STATUS_STORAGE_KEY = "hammer-os-local-version-statuses";
export const HAMMER_DOCUMENT_PROJECT_OVERRIDES_STORAGE_KEY = "hammer:document-project-overrides";
export const HAMMER_LOCAL_USER_STATES_STORAGE_KEY = "hammer-os-local-user-states";
export const HAMMER_LOCAL_USER_STATES_EVENT = "hammer-os-local-user-states-changed";
export const HAMMER_LOCAL_TASKS_STORAGE_KEY = "hammer-os-local-tasks";
export const HAMMER_LOCAL_TASKS_EVENT = "hammer-os-local-tasks-changed";
export const HAMMER_LOCAL_TASK_UPDATES_STORAGE_KEY = "hammer-os-local-task-updates";

export interface HammerUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  googleId: string;
  role: HammerRole;
}

export interface HammerProject {
  id: string;
  title: string;
  logline: string;
  type: string;
  genre: string;
  status: HammerProjectStatus;
  stage: HammerProjectStage;
  ownerId: string;
  updatedAt: string;
}

export const hammerProjectStatuses: HammerProjectStatus[] = [
  "IDEA",
  "SUBMISSION",
  "TREATMENT",
  "SCRIPT",
  "REWRITE",
  "VISUAL_DEVELOPMENT",
  "LOOKBOOK",
  "PACKAGING",
  "GREENLIGHT_REVIEW",
  "ON_HOLD",
  "PASSED",
  "ARCHIVED"
];

export const hammerScriptStatuses: ScriptStatus[] = [
  "RECEIVED",
  "LOGGED",
  "READING",
  "COVERAGE_REQUESTED",
  "COVERAGE_COMPLETE",
  "CONSIDER",
  "PASS",
  "DEVELOPMENT",
  "PROJECT_LINKED",
  "DRAFT",
  "OUTLINE",
  "IN_PROGRESS",
  "INTERNAL_REVIEW",
  "NOTES_SENT",
  "REVISION_REQUESTED",
  "APPROVED",
  "LOCKED",
  "ARCHIVED"
];

export interface HammerProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: HammerRole;
}

export interface HammerDocument {
  id: string;
  projectId?: string;
  title: string;
  type: DocumentType;
  currentVersionId: string;
  createdById: string;
  updatedAt: string;
  source?: string;
  contactId?: string;
  writerName?: string;
  submittedAt?: string;
}

export interface HammerDocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  status: ScriptStatus;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  uploadedById: string;
  createdAt: string;
  notes: string;
  extractedText: string;
}

export interface HammerScene {
  id: string;
  projectId: string;
  documentVersionId: string;
  sceneNumber: string;
  heading: string;
  location: string;
  timeOfDay: string;
  synopsis: string;
  orderIndex: number;
}

export interface HammerEntity {
  id: string;
  projectId: string;
  type: EntityType;
  name: string;
  description: string;
}

export interface HammerAsset {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assetType: AssetType;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  thumbnailPath?: string;
  imageUrl?: string;
  status: AssetStatus;
  uploadedById: string;
}

export interface HammerAssetLink {
  id: string;
  assetId: string;
  projectId: string;
  sceneId?: string;
  entityId?: string;
  documentVersionId?: string;
  linkType: "REFERENCE" | "DESIGN_TARGET" | "BREAKDOWN_ITEM" | "APPROVED_LOOK" | "REVIEW_CONTEXT";
}

export interface HammerComment {
  id: string;
  targetType: string;
  targetId: string;
  body: string;
  visibility: "INTERNAL" | "PROJECT_TEAM" | "EXECUTIVE_ONLY";
  status: "OPEN" | "RESOLVED" | "ARCHIVED";
  createdById: string;
  createdAt: string;
}

export interface HammerApproval {
  id: string;
  projectId: string;
  targetType: string;
  targetId: string;
  requestedById: string;
  reviewerId: string;
  status: ApprovalStatus;
  decisionNotes?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface HammerTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignedToId: string;
  createdById: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  targetType: string;
  targetId: string;
}

export interface HammerAuditEvent {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  metadata: string;
}

export interface HammerContact {
  id: string;
  name: string;
  company: string;
  type: ContactType;
  title: string;
  email: string;
  phone: string;
  location: string;
  website?: string;
  status?: ContactStatus;
  ownerId?: string;
  tags?: string[];
  lastContacted?: string;
  nextFollowUp?: string;
  projectIds: string[];
  notes: string;
}

export const hammerUsers: HammerUser[] = [
  { id: "user-admin", email: "admin@hammer.local", name: "Maya Chen", googleId: "google-admin", role: "ADMIN" },
  { id: "user-exec", email: "exec@hammer.studio", name: "Ari Vale", googleId: "google-exec", role: "EXECUTIVE" },
  { id: "user-producer", email: "producer@hammer.studio", name: "Sam Rivera", googleId: "google-producer", role: "PRODUCER" },
  { id: "user-dev", email: "development@hammer.studio", name: "Noor Patel", googleId: "google-dev", role: "DEVELOPMENT" },
  { id: "user-writer", email: "writer@hammer.studio", name: "June Okafor", googleId: "google-writer", role: "WRITER" },
  { id: "user-artist", email: "artist@hammer.studio", name: "Leo Matsuda", googleId: "google-artist", role: "ARTIST" }
];

export const hammerContacts: HammerContact[] = [
  { id: "contact-maya", name: "Maya Chen", company: "Hammer Studio", type: "PRODUCER", title: "Admin / Studio Operations", email: "admin@hammer.local", phone: "(310) 555-0101", location: "Los Angeles", status: "ACTIVE", ownerId: "user-admin", tags: ["internal", "operations"], lastContacted: "2026-06-28", projectIds: ["project-hammer", "project-orchid", "project-northstar"], notes: "Internal admin and systems owner." },
  { id: "contact-sam", name: "Sam Rivera", company: "Hammer Studio", type: "PRODUCER", title: "Producer", email: "producer@hammer.studio", phone: "(310) 555-0134", location: "Los Angeles", status: "ACTIVE", ownerId: "user-producer", tags: ["internal", "producer"], lastContacted: "2026-06-26", projectIds: ["project-hammer", "project-northstar"], notes: "Primary producer for HAMMER and NORTHSTAR KIDS." },
  { id: "contact-june", name: "June Okafor", company: "Independent", type: "WRITER", title: "Screenwriter", email: "writer@hammer.studio", phone: "(323) 555-0188", location: "Los Angeles", status: "FOLLOW_UP", ownerId: "user-dev", tags: ["writer", "drafts"], lastContacted: "2026-06-18", nextFollowUp: "2026-07-09", projectIds: ["project-hammer", "project-orchid"], notes: "Attached writer for current script and treatment drafts." },
  { id: "contact-leo", name: "Leo Matsuda", company: "Matsuda Visual", type: "ARTIST", title: "Concept Artist", email: "artist@hammer.studio", phone: "(213) 555-0149", location: "Pasadena", status: "ACTIVE", ownerId: "user-producer", tags: ["artist", "lookbook"], lastContacted: "2026-06-22", projectIds: ["project-hammer", "project-northstar"], notes: "Keyframe, lookbook, and visual development references." },
  { id: "contact-vale", name: "Ari Vale", company: "Northstar Pictures", type: "EXECUTIVE", title: "Executive", email: "exec@hammer.studio", phone: "(424) 555-0172", location: "Santa Monica", status: "WAITING", ownerId: "user-producer", tags: ["executive", "greenlight"], lastContacted: "2026-06-19", nextFollowUp: "2026-07-08", projectIds: ["project-hammer"], notes: "Reviews greenlight materials and executive approvals." },
  { id: "contact-catalyst", name: "Catalyst Literary", company: "Catalyst Literary", type: "AGENCY", title: "Literary Agency", email: "submissions@catalyst.example", phone: "(212) 555-0199", location: "New York", status: "FOLLOW_UP", ownerId: "user-dev", tags: ["agency", "submissions"], lastContacted: "2026-06-20", nextFollowUp: "2026-07-10", projectIds: ["project-orchid"], notes: "Represents writers and IP submissions." },
  { id: "contact-arc", name: "Arc Management", company: "Arc Management", type: "MANAGEMENT", title: "Talent Management", email: "desk@arc-management.example", phone: "(310) 555-0160", location: "Beverly Hills", status: "ACTIVE", ownerId: "user-producer", tags: ["management", "talent"], lastContacted: "2026-06-21", projectIds: ["project-hammer"], notes: "Management contact for attached action talent." },
  { id: "contact-clearance", name: "Clear Frame Legal", company: "Clear Frame Legal", type: "LEGAL", title: "Clearance Counsel", email: "clearance@clearframe.example", phone: "(818) 555-0120", location: "Burbank", status: "WAITING", ownerId: "user-admin", tags: ["legal", "clearance"], nextFollowUp: "2026-07-11", projectIds: ["project-hammer", "project-orchid"], notes: "Business docs, rights checks, and clearance review." },
  { id: "contact-warehouse", name: "Warehouse VFX", company: "Warehouse VFX", type: "VENDOR", title: "VFX Vendor", email: "bids@warehousevfx.example", phone: "(604) 555-0112", location: "Vancouver", status: "NEW", ownerId: "user-producer", tags: ["vendor", "vfx"], nextFollowUp: "2026-07-12", projectIds: ["project-hammer"], notes: "Early VFX bid and plate methodology." }
];

export const hammerProjectMembers: HammerProjectMember[] = [
  { id: "member-admin-hammer", projectId: "project-hammer", userId: "user-admin", role: "ADMIN" },
  { id: "member-admin-orchid", projectId: "project-orchid", userId: "user-admin", role: "ADMIN" },
  { id: "member-admin-northstar", projectId: "project-northstar", userId: "user-admin", role: "ADMIN" },
  { id: "member-exec-hammer", projectId: "project-hammer", userId: "user-exec", role: "EXECUTIVE" },
  { id: "member-producer-hammer", projectId: "project-hammer", userId: "user-producer", role: "PRODUCER" },
  { id: "member-producer-northstar", projectId: "project-northstar", userId: "user-producer", role: "PRODUCER" },
  { id: "member-dev-hammer", projectId: "project-hammer", userId: "user-dev", role: "DEVELOPMENT" },
  { id: "member-dev-orchid", projectId: "project-orchid", userId: "user-dev", role: "DEVELOPMENT" },
  { id: "member-writer-hammer", projectId: "project-hammer", userId: "user-writer", role: "WRITER" },
  { id: "member-writer-orchid", projectId: "project-orchid", userId: "user-writer", role: "WRITER" },
  { id: "member-artist-hammer", projectId: "project-hammer", userId: "user-artist", role: "ARTIST" },
  { id: "member-artist-northstar", projectId: "project-northstar", userId: "user-artist", role: "ARTIST" }
];

export const hammerProjects: HammerProject[] = [
  {
    id: "project-hammer",
    title: "HAMMER",
    logline: "A former rescue engineer steals a prototype magnetic rig before a private security unit can turn it into a city-scale weapon.",
    type: "Feature",
    genre: "Action Thriller",
    status: "GREENLIGHT_REVIEW",
    stage: "GREENLIGHT",
    ownerId: "user-producer",
    updatedAt: "2026-06-18"
  },
  {
    id: "project-orchid",
    title: "ORCHID STATION",
    logline: "A closed research habitat wakes after a decade offline with one crew member too many.",
    type: "Limited Series",
    genre: "Contained Sci-Fi",
    status: "SCRIPT",
    stage: "SCRIPT",
    ownerId: "user-dev",
    updatedAt: "2026-06-14"
  },
  {
    id: "project-northstar",
    title: "NORTHSTAR KIDS",
    logline: "Three siblings rebuild a family observatory and discover their missing parent left a map in the sky.",
    type: "Animated Feature",
    genre: "Adventure",
    status: "VISUAL_DEVELOPMENT",
    stage: "VISDEV",
    ownerId: "user-producer",
    updatedAt: "2026-06-11"
  }
];

export const hammerDocuments: HammerDocument[] = [
  { id: "doc-hammer-script", projectId: "project-hammer", title: "HAMMER Screenplay", type: "SCRIPT", currentVersionId: "ver-hammer-3", createdById: "user-writer", updatedAt: "2026-06-18", writerName: "June Okafor" },
  { id: "doc-hammer-treatment", projectId: "project-hammer", title: "HAMMER Treatment", type: "TREATMENT", currentVersionId: "ver-treatment-2", createdById: "user-dev", updatedAt: "2026-06-10", writerName: "Noor Patel" },
  { id: "doc-orchid-script", projectId: "project-orchid", title: "Orchid Station Pilot", type: "SCRIPT", currentVersionId: "ver-orchid-1", createdById: "user-writer", updatedAt: "2026-06-14", writerName: "June Okafor" },
  { id: "doc-hammer-business", projectId: "project-hammer", title: "Greenlight Deck Notes", type: "BUSINESS_DOCUMENT", currentVersionId: "ver-business-1", createdById: "user-producer", updatedAt: "2026-06-12" },
  { id: "doc-inbox-echo", title: "Echo Valley Spec", type: "SCRIPT", currentVersionId: "ver-inbox-echo-1", createdById: "user-producer", updatedAt: "2026-06-20", source: "Catalyst Literary", contactId: "contact-catalyst", writerName: "Unassigned Writer", submittedAt: "2026-06-20" },
  { id: "doc-inbox-kite", title: "Paper Kite Treatment", type: "TREATMENT", currentVersionId: "ver-inbox-kite-1", createdById: "user-producer", updatedAt: "2026-06-21", source: "Arc Management", contactId: "contact-arc", writerName: "Unassigned Writer", submittedAt: "2026-06-21" }
];

export const hammerVersions: HammerDocumentVersion[] = [
  {
    id: "ver-hammer-2",
    documentId: "doc-hammer-script",
    versionNumber: 2,
    status: "NOTES_SENT",
    fileName: "hammer-blue-draft.pdf",
    fileType: "application/pdf",
    fileSize: 1820048,
    storagePath: "projects/project-hammer/documents/doc-hammer-script/versions/ver-hammer-2/hammer-blue-draft.pdf",
    uploadedById: "user-writer",
    createdAt: "2026-06-09",
    notes: "Blue draft with subway sequence rewrite.",
    extractedText: "EXT. QUARRY ROAD - NIGHT\nMARA watches the convoy.\n\nINT. SUBWAY PLATFORM - NIGHT\nThe prototype case slides toward the third rail."
  },
  {
    id: "ver-hammer-3",
    documentId: "doc-hammer-script",
    versionNumber: 3,
    status: "INTERNAL_REVIEW",
    fileName: "hammer-green-draft.pdf",
    fileType: "application/pdf",
    fileSize: 1944096,
    storagePath: "projects/project-hammer/documents/doc-hammer-script/versions/ver-hammer-3/hammer-green-draft.pdf",
    uploadedById: "user-writer",
    createdAt: "2026-06-18",
    notes: "Green draft expands foundry climax and adds drone exchange.",
    extractedText: "EXT. QUARRY ROAD - NIGHT\nMARA watches the convoy while HOLT checks the prototype case.\n\nINT. SUBWAY PLATFORM - NIGHT\nThe prototype case slides toward the third rail as train doors open.\n\nEXT. ROOFTOP - NIGHT\nA drone drops the data key toward a zipline rig."
  },
  {
    id: "ver-treatment-2",
    documentId: "doc-hammer-treatment",
    versionNumber: 2,
    status: "APPROVED",
    fileName: "hammer-treatment-v2.docx",
    fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileSize: 420128,
    storagePath: "projects/project-hammer/documents/doc-hammer-treatment/versions/ver-treatment-2/hammer-treatment-v2.docx",
    uploadedById: "user-dev",
    createdAt: "2026-06-10",
    notes: "Approved treatment alignment pass.",
    extractedText: "Mara steals the prototype to expose a private security conspiracy."
  },
  {
    id: "ver-orchid-1",
    documentId: "doc-orchid-script",
    versionNumber: 1,
    status: "DRAFT",
    fileName: "orchid-pilot-white.pdf",
    fileType: "application/pdf",
    fileSize: 1600210,
    storagePath: "projects/project-orchid/documents/doc-orchid-script/versions/ver-orchid-1/orchid-pilot-white.pdf",
    uploadedById: "user-writer",
    createdAt: "2026-06-14",
    notes: "White draft pilot.",
    extractedText: "INT. ORCHID STATION - NIGHT\nThe habitat powers on."
  },
  {
    id: "ver-inbox-echo-1",
    documentId: "doc-inbox-echo",
    versionNumber: 1,
    status: "RECEIVED",
    fileName: "echo-valley-spec.pdf",
    fileType: "application/pdf",
    fileSize: 1450200,
    storagePath: "inbox/doc-inbox-echo/versions/ver-inbox-echo-1/echo-valley-spec.pdf",
    uploadedById: "user-producer",
    createdAt: "2026-06-20",
    notes: "Incoming spec submitted by Catalyst Literary.",
    extractedText: "EXT. DESERT ROAD - DUSK\nA courier follows a radio signal into a valley where every echo answers back.\n\nMILA\nThat is not my voice."
  },
  {
    id: "ver-inbox-kite-1",
    documentId: "doc-inbox-kite",
    versionNumber: 1,
    status: "READING",
    fileName: "paper-kite-treatment.docx",
    fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileSize: 388120,
    storagePath: "inbox/doc-inbox-kite/versions/ver-inbox-kite-1/paper-kite-treatment.docx",
    uploadedById: "user-producer",
    createdAt: "2026-06-21",
    notes: "Treatment under first read.",
    extractedText: "A former stunt coordinator builds impossible paper kites to deliver messages across a divided city."
  }
];

export const hammerScenes: HammerScene[] = [
  { id: "scene-1", projectId: "project-hammer", documentVersionId: "ver-hammer-3", sceneNumber: "1", heading: "EXT. QUARRY ROAD - NIGHT", location: "QUARRY ROAD", timeOfDay: "NIGHT", synopsis: "Mara watches the convoy while Holt checks the prototype case.", orderIndex: 1 },
  { id: "scene-2", projectId: "project-hammer", documentVersionId: "ver-hammer-3", sceneNumber: "2", heading: "INT. SUBWAY PLATFORM - NIGHT", location: "SUBWAY PLATFORM", timeOfDay: "NIGHT", synopsis: "The prototype case slides toward the third rail as train doors open.", orderIndex: 2 },
  { id: "scene-3", projectId: "project-hammer", documentVersionId: "ver-hammer-3", sceneNumber: "3", heading: "EXT. ROOFTOP - NIGHT", location: "ROOFTOP", timeOfDay: "NIGHT", synopsis: "A drone drops the data key toward a zipline rig.", orderIndex: 3 }
];

export const hammerEntities: HammerEntity[] = [
  { id: "entity-mara", projectId: "project-hammer", type: "CHARACTER", name: "MARA", description: "Former rescue engineer driving the theft." },
  { id: "entity-holt", projectId: "project-hammer", type: "CHARACTER", name: "HOLT", description: "Security contractor with divided loyalties." },
  { id: "entity-case", projectId: "project-hammer", type: "PROP", name: "Prototype Case", description: "Hard case containing the magnetic rig controller." },
  { id: "entity-rooftop", projectId: "project-hammer", type: "LOCATION", name: "Rooftop", description: "Neon billboard catwalk and zipline setup." },
  { id: "entity-drone", projectId: "project-hammer", type: "VFX", name: "Data Key Drone", description: "Small delivery drone used in the rooftop exchange." }
];

export const hammerAssets: HammerAsset[] = [
  { id: "asset-case", projectId: "project-hammer", title: "Prototype Case Reference", description: "Industrial hard case with magnetic latch details.", assetType: "PROP_REFERENCE", fileName: "prototype-case.png", fileType: "image/png", fileSize: 844120, storagePath: "projects/project-hammer/assets/asset-case/original/prototype-case.png", thumbnailPath: "projects/project-hammer/assets/asset-case/thumbnails/prototype-case.png", status: "APPROVED", uploadedById: "user-artist" },
  { id: "asset-rooftop", projectId: "project-hammer", title: "Rooftop Mood Frame", description: "Rainy billboard catwalk mood reference.", assetType: "MOOD_IMAGE", fileName: "rooftop-mood.jpg", fileType: "image/jpeg", fileSize: 1200021, storagePath: "projects/project-hammer/assets/asset-rooftop/original/rooftop-mood.jpg", thumbnailPath: "projects/project-hammer/assets/asset-rooftop/thumbnails/rooftop-mood.jpg", status: "IN_REVIEW", uploadedById: "user-artist" },
  { id: "asset-orchid", projectId: "project-orchid", title: "Habitat Corridor", description: "Lighting reference for Orchid Station.", assetType: "ENVIRONMENT_REFERENCE", fileName: "orchid-corridor.jpg", fileType: "image/jpeg", fileSize: 932221, storagePath: "projects/project-orchid/assets/asset-orchid/original/orchid-corridor.jpg", status: "UPLOADED", uploadedById: "user-artist" }
];

export const hammerAssetLinks: HammerAssetLink[] = [
  { id: "link-case-scene", assetId: "asset-case", projectId: "project-hammer", sceneId: "scene-2", entityId: "entity-case", documentVersionId: "ver-hammer-3", linkType: "APPROVED_LOOK" },
  { id: "link-rooftop", assetId: "asset-rooftop", projectId: "project-hammer", sceneId: "scene-3", entityId: "entity-rooftop", documentVersionId: "ver-hammer-3", linkType: "REFERENCE" }
];

export const hammerComments: HammerComment[] = [
  { id: "comment-1", targetType: "DOCUMENT_VERSION", targetId: "ver-hammer-3", body: "Green draft solves the geography note, but the rooftop handoff needs a cleaner motivation beat.", visibility: "PROJECT_TEAM", status: "OPEN", createdById: "user-dev", createdAt: "2026-06-18" },
  { id: "comment-2", targetType: "ASSET", targetId: "asset-rooftop", body: "Push this reference toward less cyberpunk and more wet municipal infrastructure.", visibility: "INTERNAL", status: "OPEN", createdById: "user-producer", createdAt: "2026-06-19" }
];

export const hammerApprovals: HammerApproval[] = [
  { id: "approval-script", projectId: "project-hammer", targetType: "DOCUMENT_VERSION", targetId: "ver-hammer-3", requestedById: "user-producer", reviewerId: "user-exec", status: "REQUESTED", createdAt: "2026-06-19" },
  { id: "approval-case", projectId: "project-hammer", targetType: "ASSET", targetId: "asset-case", requestedById: "user-artist", reviewerId: "user-producer", status: "APPROVED", decisionNotes: "Approved for lookbook.", createdAt: "2026-06-13", decidedAt: "2026-06-14" }
];

export const hammerTasks: HammerTask[] = [
  { id: "task-admin", projectId: "project-hammer", title: "Review role assignments", description: "Confirm producer and executive access before the greenlight review.", assignedToId: "user-admin", createdById: "user-producer", dueDate: "2026-06-24", priority: "MEDIUM", status: "TODO", targetType: "PROJECT", targetId: "project-hammer" },
  { id: "task-breakdown", projectId: "project-hammer", title: "Approve green draft breakdown", description: "Review parsed scenes and entity links before greenlight packet.", assignedToId: "user-dev", createdById: "user-producer", dueDate: "2026-06-25", priority: "HIGH", status: "REVIEW", targetType: "DOCUMENT_VERSION", targetId: "ver-hammer-3" },
  { id: "task-rooftop", projectId: "project-hammer", title: "Revise rooftop mood frames", description: "Address producer note and relink approved candidate.", assignedToId: "user-artist", createdById: "user-producer", dueDate: "2026-06-27", priority: "MEDIUM", status: "IN_PROGRESS", targetType: "ASSET", targetId: "asset-rooftop" },
  { id: "task-orchid", projectId: "project-orchid", title: "Pilot cold open notes", description: "Send first-pass coverage notes to writer.", assignedToId: "user-dev", createdById: "user-producer", dueDate: "2026-06-24", priority: "URGENT", status: "TODO", targetType: "DOCUMENT", targetId: "doc-orchid-script" }
];

export const hammerAuditEvents: HammerAuditEvent[] = [
  { id: "audit-1", actorUserId: "user-writer", action: "version_uploaded", targetType: "DOCUMENT_VERSION", targetId: "ver-hammer-3", createdAt: "2026-06-18", metadata: "Uploaded hammer-green-draft.pdf" },
  { id: "audit-2", actorUserId: "user-dev", action: "breakdown_run", targetType: "DOCUMENT_VERSION", targetId: "ver-hammer-3", createdAt: "2026-06-18", metadata: "3 scenes, 5 entities detected" },
  { id: "audit-3", actorUserId: "user-artist", action: "asset_linked", targetType: "ASSET", targetId: "asset-case", createdAt: "2026-06-14", metadata: "Linked Prototype Case Reference to Scene 2" },
  { id: "audit-4", actorUserId: "user-producer", action: "approval_requested", targetType: "DOCUMENT_VERSION", targetId: "ver-hammer-3", createdAt: "2026-06-19", metadata: "Executive review requested" }
];

export function userName(userId: string) {
  return hammerUsers.find((user) => user.id === userId)?.name ?? "Unassigned";
}

export function hammerUserByEmail(email?: string | null) {
  if (!email) return hammerUsers[0];
  return hammerUsers.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? hammerUsers[0];
}

export function assignedProjectsForUser(userId: string) {
  const projectIds = new Set(hammerProjectMembers.filter((member) => member.userId === userId).map((member) => member.projectId));
  return hammerProjects.filter((project) => projectIds.has(project.id));
}

export function projectTitle(projectId: string) {
  return hammerProjects.find((project) => project.id === projectId)?.title ?? "Unknown Project";
}

export function currentVersion(documentId: string) {
  const doc = hammerDocuments.find((item) => item.id === documentId);
  return hammerVersions.find((version) => version.id === doc?.currentVersionId);
}

export function statusLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}
