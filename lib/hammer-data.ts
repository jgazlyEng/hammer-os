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
export type ContactRelationshipType = "AGENT" | "MANAGER" | "REPRESENTS" | "WORKS_WITH" | "ASSISTANT" | "LEGAL_REP" | "REFERRED_BY" | "OTHER";

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
export const HAMMER_LOCAL_SCRIPT_COLLECTIONS_STORAGE_KEY = "hammer-os-local-script-collections";
export const HAMMER_LOCAL_SCRIPT_COLLECTION_ITEMS_STORAGE_KEY = "hammer-os-local-script-collection-items";
export const HAMMER_LOCAL_SLATE_COLLECTIONS_STORAGE_KEY = "hammer-os-local-slate-collections";
export const HAMMER_LOCAL_SLATE_COLLECTION_ITEMS_STORAGE_KEY = "hammer-os-local-slate-collection-items";
export const HAMMER_LOCAL_CONTACT_RELATIONSHIPS_STORAGE_KEY = "hammer-os-local-contact-relationships";

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

export interface HammerProjectLead {
  id: string;
  title: string;
  externalId?: string;
  logline?: string;
  genre?: string;
  lane?: string;
  creator?: string;
  priorityScore?: number;
  subgenreTags?: string;
  urgencyLabel?: string;
  discoveryStage?: string;
  countryLanguage?: string;
  platformSource?: string;
  whyItMatters?: string;
  signalProof?: string;
  sourceLink?: string;
  rightsStatus?: string;
  rightsHolder?: string;
  contactRep?: string;
  adaptationFormat?: string;
  comps?: string;
  heatScore?: number;
  conceptScore?: number;
  adaptabilityScore?: number;
  rightsOpportunityScore?: number;
  studioFitScore?: number;
  nextActionStatus?: string;
  owner?: string;
  ownerIds?: string[];
  nextStep?: string;
  lastUpdated?: string;
  notes?: string;
  projectCover?: string;
  searchKeywords?: string;
  originalReleaseDate?: string;
  myPicks?: string;
  actionItems?: string;
  country?: string;
  votes?: number;
  yearWritten?: string;
  scriptStatus?: string;
  format?: string;
  scriptPdf?: string;
  promotedProjectId?: string;
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

export interface HammerDocumentTag {
  id: string;
  documentId: string;
  key: string;
  value: string;
  createdById?: string;
  createdAt: string;
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
  tags?: HammerDocumentTag[];
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
  dataUrl?: string;
  uploadedById: string;
  createdAt: string;
  notes: string;
  markdownNotes?: string;
  extractedText: string;
}

export interface HammerScriptCollection {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  status: string;
  visibility: "INTERNAL" | "PROJECT_TEAM" | "EXECUTIVE_ONLY";
  createdAt: string;
  updatedAt: string;
}

export interface HammerScriptCollectionItem {
  id: string;
  collectionId: string;
  documentId: string;
  sortOrder: number;
  notes?: string;
  addedAt: string;
}

export type SlateCollectionItemType = "PROJECT" | "PROSPECT";

export interface HammerSlateCollection {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  status: string;
  visibility: "INTERNAL" | "PROJECT_TEAM" | "EXECUTIVE_ONLY";
  createdAt: string;
  updatedAt: string;
}

export interface HammerSlateCollectionItem {
  id: string;
  collectionId: string;
  itemType: SlateCollectionItemType;
  projectId?: string;
  prospectId?: string;
  sortOrder: number;
  notes?: string;
  addedAt: string;
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
  source?: string;
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

export type HammerNoteType = "GENERAL" | "COVERAGE" | "CREATIVE" | "LEGAL_RIGHTS" | "PRODUCTION" | "EXECUTIVE" | "FOLLOW_UP";

export interface HammerNoteTag {
  key: string;
  value: string;
}

export interface HammerCommentMetadata {
  noteType?: HammerNoteType;
  tags?: HammerNoteTag[];
}

export interface HammerComment {
  id: string;
  targetType: string;
  targetId: string;
  body: string;
  metadataJson?: HammerCommentMetadata;
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
  projectId?: string;
  title: string;
  description: string;
  assignedToId: string;
  createdById: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  sortOrder?: number;
  targetType: string;
  targetId: string;
  subtasks?: HammerTaskSubtask[];
  createdAt?: string;
  updatedAt?: string;
}

export interface HammerTaskSubtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
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
  isTalent?: boolean;
  talentAgency?: string;
  talentCredits?: string;
  talentGenre?: string;
  talentRole?: string;
  talentMetWith?: string;
  talentBased?: string;
}

export interface HammerContactRelationship {
  id: string;
  fromContactId: string;
  toContactId: string;
  relationshipType: ContactRelationshipType;
  notes?: string;
  createdAt: string;
}

export const hammerUsers: HammerUser[] = [
  { id: "user-admin", email: "admin@hammer.local", name: "Maya Chen", googleId: "google-admin", role: "ADMIN" },
  { id: "user-exec", email: "exec@hammer.studio", name: "Ari Vale", googleId: "google-exec", role: "EXECUTIVE" },
  { id: "user-producer", email: "producer@hammer.studio", name: "Sam Rivera", googleId: "google-producer", role: "PRODUCER" },
  { id: "user-dev", email: "development@hammer.studio", name: "Noor Patel", googleId: "google-dev", role: "DEVELOPMENT" },
  { id: "user-writer", email: "writer@hammer.studio", name: "June Okafor", googleId: "google-writer", role: "WRITER" },
  { id: "user-artist", email: "artist@hammer.studio", name: "Leo Matsuda", googleId: "google-artist", role: "ARTIST" }
];

const hammerBaseContacts: HammerContact[] = [
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

export const hammerTalentContacts: HammerContact[] = [
  {
    "id": "contact-talent-aaron-stockard-1",
    "name": "Aaron Stockard",
    "company": "Verve / Levine\n3 Arts / Obst",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE COLD LIGHT OF THE DAY, THE TOWN, GONE BABY GONE",
    "isTalent": true,
    "talentAgency": "Verve / Levine\n3 Arts / Obst",
    "talentCredits": "FILM: THE COLD LIGHT OF THE DAY, THE TOWN, GONE BABY GONE",
    "talentGenre": "Horror, Action",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-abby-ajayi-2",
    "name": "Abby Ajayi",
    "company": "CAA / Lee\n42 / King",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE BEDROOM WINDOW (in dev)\nTV: GOTHICTOWN, RICHES, INVENTING ANNA",
    "isTalent": true,
    "talentAgency": "CAA / Lee\n42 / King",
    "talentCredits": "FILM: THE BEDROOM WINDOW (in dev)\nTV: GOTHICTOWN, RICHES, INVENTING ANNA",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "UK"
  },
  {
    "id": "contact-talent-adam-egypt-mortimer-3",
    "name": "Adam Egypt Mortimer",
    "company": "3 Arts / Rowbotham",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: ARCHENEMY, DANIEL ISN'T REAL",
    "isTalent": true,
    "talentAgency": "3 Arts / Rowbotham",
    "talentCredits": "FILM: ARCHENEMY, DANIEL ISN'T REAL",
    "talentGenre": "Horror",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-adam-randall-4",
    "name": "Adam Randall",
    "company": "CAA / Cassir\nUntitled / Platt",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US/UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: NIGHT TEETH, I SEE YOU, LEVEL UP",
    "isTalent": true,
    "talentAgency": "CAA / Cassir\nUntitled / Platt",
    "talentCredits": "FILM: NIGHT TEETH, I SEE YOU, LEVEL UP",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US/UK"
  },
  {
    "id": "contact-talent-adam-robitel-5",
    "name": "Adam Robitel",
    "company": "CAA / Barile\nEnt 360 / Kopple",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: ESCAPE ROOM: TOURNAMENT OF CHAMPIONS, ESCAPE ROOM, INSIDIOUS: THE LAST KEY, PARANORMAL ACTIVITY: THE GHOST DIMENSION, THE TAKING OF DEBORAH LOGAN (W/D)",
    "isTalent": true,
    "talentAgency": "CAA / Barile\nEnt 360 / Kopple",
    "talentCredits": "FILM: ESCAPE ROOM: TOURNAMENT OF CHAMPIONS, ESCAPE ROOM, INSIDIOUS: THE LAST KEY, PARANORMAL ACTIVITY: THE GHOST DIMENSION, THE TAKING OF DEBORAH LOGAN (W/D)",
    "talentGenre": "Horror, Thriller",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-adam-wingard-6",
    "name": "Adam Wingard",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-aja-gabel-7",
    "name": "Aja Gabel",
    "company": "Untitled / Kanaan",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Thriller",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE DEVIL'S MOUTH (Lionsgate/Thunder Road Film in dev), APEX (w)",
    "isTalent": true,
    "talentAgency": "Untitled / Kanaan",
    "talentCredits": "FILM: THE DEVIL'S MOUTH (Lionsgate/Thunder Road Film in dev), APEX (w)",
    "talentGenre": "Thriller, Action",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-alberto-corredor-8",
    "name": "Alberto Corredor",
    "company": "Verve / Boxerbaum",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "Spain / UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: BAGHEAD",
    "isTalent": true,
    "talentAgency": "Verve / Boxerbaum",
    "talentCredits": "FILM: BAGHEAD",
    "talentGenre": "Horror",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "Spain / UK"
  },
  {
    "id": "contact-talent-alex-kavutskiy-and-ryan-perez-9",
    "name": "Alex Kavutskiy and Ryan Perez",
    "company": "CAA / Barile, Mann, Schiff\nArtists First / Jones",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: ON THE ROCKS, SQUIRREL, HIGH CONCEPT (FILM IN DEV), MR. BLACKBURN (IN DEV)",
    "isTalent": true,
    "talentAgency": "CAA / Barile, Mann, Schiff\nArtists First / Jones",
    "talentCredits": "FILM: ON THE ROCKS, SQUIRREL, HIGH CONCEPT (FILM IN DEV), MR. BLACKBURN (IN DEV)",
    "talentGenre": "Thriller",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-alex-litvak-and-michael-finch-10",
    "name": "Alex Litvak and Michael Finch",
    "company": "Fourth Wall / Huddle",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: MASTERS OF THE UNIVERSE (AMAZON, awaiting release), THE THREE MUSKETEERS, PREDATORS",
    "isTalent": true,
    "talentAgency": "Fourth Wall / Huddle",
    "talentCredits": "FILM: MASTERS OF THE UNIVERSE (AMAZON, awaiting release), THE THREE MUSKETEERS, PREDATORS",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-andr-vredal-11",
    "name": "André Øvredal",
    "company": "WME / West\nIndustry / Bottfeld",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: PASSENGER, THE LAST VOYAGE OF DEMETER, MORTAL, THE AUTOPSY OF JANE DOE, TROLLHUNGER",
    "isTalent": true,
    "talentAgency": "WME / West\nIndustry / Bottfeld",
    "talentCredits": "FILM: PASSENGER, THE LAST VOYAGE OF DEMETER, MORTAL, THE AUTOPSY OF JANE DOE, TROLLHUNGER",
    "talentGenre": "Horror",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-andrew-ferguson-12",
    "name": "Andrew Ferguson",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-andrew-marlowe-13",
    "name": "Andrew Marlowe",
    "company": "IAG / Loftus\nEnt 360 / Casady",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: ALIEN PRISON (COLUMBIA FILM IN DEV), POSEIDON, HOLLOW MAN, END OF DAYS, AIR FORCE ONE\nEP: THE EQUALIZER, CASTLE, VIPER",
    "isTalent": true,
    "talentAgency": "IAG / Loftus\nEnt 360 / Casady",
    "talentCredits": "FILM: ALIEN PRISON (COLUMBIA FILM IN DEV), POSEIDON, HOLLOW MAN, END OF DAYS, AIR FORCE ONE\nEP: THE EQUALIZER, CASTLE, VIPER",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-angela-lamanna-14",
    "name": "Angela LaManna",
    "company": "Gersh / Martin\nCurate / Rizzio",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "UK/US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: VERITY (UPCOMING THRILLER)\nTV: DUNE: PROPHECY, BEHIND HER EYES, THE HAUNTING, THE PUNISHER",
    "isTalent": true,
    "talentAgency": "Gersh / Martin\nCurate / Rizzio",
    "talentCredits": "FILM: VERITY (UPCOMING THRILLER)\nTV: DUNE: PROPHECY, BEHIND HER EYES, THE HAUNTING, THE PUNISHER",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "UK/US"
  },
  {
    "id": "contact-talent-annie-wilmer-15",
    "name": "Annie Wilmer",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-austin-everee-16",
    "name": "Austin Everee",
    "company": "WME / West\nWrit Large / Dartnell",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Sci-Fi"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: ALIENS ABDUCTED MY PARENTS AND NOW I FEEL KINDA LEFT OUT, THE TRAVELER (IN DEV), EARWORM (IN DEV)",
    "isTalent": true,
    "talentAgency": "WME / West\nWrit Large / Dartnell",
    "talentCredits": "FILM: ALIENS ABDUCTED MY PARENTS AND NOW I FEEL KINDA LEFT OUT, THE TRAVELER (IN DEV), EARWORM (IN DEV)",
    "talentGenre": "Sci-Fi",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-avishai-weinberg-17",
    "name": "Avishai Weinberg",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-ben-and-paul-china-18",
    "name": "Ben and Paul China",
    "company": "UTA / Lonner",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: STAKE OUT (W/D), SWEET VIRGINIA (W), NIGHT SHIFT (W/D)",
    "isTalent": true,
    "talentAgency": "UTA / Lonner",
    "talentCredits": "FILM: STAKE OUT (W/D), SWEET VIRGINIA (W), NIGHT SHIFT (W/D)",
    "talentGenre": "Horror, Thriller",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-ben-collins-19",
    "name": "Ben Collins",
    "company": "Redefine / Emerson",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: HELLRAISER, THE NIGHT HOUSE, STEPHANIE, SUPER DARK TIMES",
    "isTalent": true,
    "talentAgency": "Redefine / Emerson",
    "talentCredits": "FILM: HELLRAISER, THE NIGHT HOUSE, STEPHANIE, SUPER DARK TIMES",
    "talentGenre": "Horror, Action",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-ben-leonberg-20",
    "name": "Ben Leonberg",
    "company": "Verve / Davis, Mohebbi\nUntitled / Kanaan, Platt",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: GOOD BOY",
    "isTalent": true,
    "talentAgency": "Verve / Davis, Mohebbi\nUntitled / Kanaan, Platt",
    "talentCredits": "FILM: GOOD BOY",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-blair-butler-21",
    "name": "Blair Butler",
    "company": "CAA / Barile, Berg\nIndustry / Theriot",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: UNTIL DAWN (W), THE INVITATION (W), POLAROID (W)",
    "isTalent": true,
    "talentAgency": "CAA / Barile, Berg\nIndustry / Theriot",
    "talentCredits": "FILM: UNTIL DAWN (W), THE INVITATION (W), POLAROID (W)",
    "talentGenre": "Horror",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-carles-torrens-22",
    "name": "Carles Torrens",
    "company": "UTA / Ferraro",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: APOCALYPSE Z: EL PRINCIPIO DEL FIN (D), PET (D), APARTMENT 143 (D)",
    "isTalent": true,
    "talentAgency": "UTA / Ferraro",
    "talentCredits": "FILM: APOCALYPSE Z: EL PRINCIPIO DEL FIN (D), PET (D), APARTMENT 143 (D)",
    "talentGenre": "Horror",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-caye-casas-23",
    "name": "Caye Casas",
    "company": "Circle / Solomon",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "Spain",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: FAMILIAR (18hz, D), COFFEE TABLE (W/D)",
    "isTalent": true,
    "talentAgency": "Circle / Solomon",
    "talentCredits": "FILM: FAMILIAR (18hz, D), COFFEE TABLE (W/D)",
    "talentGenre": "Horror",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": "Spain"
  },
  {
    "id": "contact-talent-chelsea-lupkin-24",
    "name": "Chelsea Lupkin",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-chris-mccoy-25",
    "name": "Chris McCoy",
    "company": "",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-christian-contreras-26",
    "name": "Christian Contreras",
    "company": "CAA / Cassir",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: LA'BRYINTH, BAIT, SEVEN SISTERS",
    "isTalent": true,
    "talentAgency": "CAA / Cassir",
    "talentCredits": "FILM: LA'BRYINTH, BAIT, SEVEN SISTERS",
    "talentGenre": "Horror",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-christian-gudegast-27",
    "name": "Christian Gudegast",
    "company": "Ent 360 / Casady",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: DEN OF THIEVES 1&2 (W/D), PLANE, LONDON HAS FALLEN, SPEED RACER, THE RUNDOWN",
    "isTalent": true,
    "talentAgency": "Ent 360 / Casady",
    "talentCredits": "FILM: DEN OF THIEVES 1&2 (W/D), PLANE, LONDON HAS FALLEN, SPEED RACER, THE RUNDOWN",
    "talentGenre": "Action",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-christian-tafdrup-28",
    "name": "Christian Tafdrup",
    "company": "WME / D'Amecourt\nSubtitle Talent / Cash",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: SPEAK NO EVIL, A HORRIBLE WOMAN, PARENTS",
    "isTalent": true,
    "talentAgency": "WME / D'Amecourt\nSubtitle Talent / Cash",
    "talentCredits": "FILM: SPEAK NO EVIL, A HORRIBLE WOMAN, PARENTS",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-christian-zuebert-29",
    "name": "Christian Zuebert",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "Germany",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": "Germany"
  },
  {
    "id": "contact-talent-christina-hodson-30",
    "name": "Christina Hodson",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-christopher-jolley-31",
    "name": "Christopher Jolley",
    "company": "",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE PRICE WE PAY, THRILL RIDE (in prod), SPIDER ISLAND (w)",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "FILM: THE PRICE WE PAY, THRILL RIDE (in prod), SPIDER ISLAND (w)",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "UK"
  },
  {
    "id": "contact-talent-colin-and-cameron-cairnes-32",
    "name": "Colin and Cameron Cairnes",
    "company": "CAA / Astbury\nEnt 360 / Kopple",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "Australia",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: LATE NIGHT WITH THE DEVIL, SCARE CAMPAIGN, 100 BLOODY ACRES",
    "isTalent": true,
    "talentAgency": "CAA / Astbury\nEnt 360 / Kopple",
    "talentCredits": "FILM: LATE NIGHT WITH THE DEVIL, SCARE CAMPAIGN, 100 BLOODY ACRES",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "Australia"
  },
  {
    "id": "contact-talent-dan-ferry-33",
    "name": "Dan Ferry",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "ACTIVE",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "read these robert liked",
    "talentBased": ""
  },
  {
    "id": "contact-talent-dan-hall-34",
    "name": "Dan Hall",
    "company": "Ent 360 / Shaevitz",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: ZERO PROTOCOL, THE SILENT HOUR",
    "isTalent": true,
    "talentAgency": "Ent 360 / Shaevitz",
    "talentCredits": "FILM: ZERO PROTOCOL, THE SILENT HOUR",
    "talentGenre": "Horror, Action",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-daniel-and-matthew-wolfe-35",
    "name": "Daniel and Matthew Wolfe",
    "company": "UTA / Burns\n42 / Varney",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: SAPPHIRE (in dev), CATCH ME DADDY",
    "isTalent": true,
    "talentAgency": "UTA / Burns\n42 / Varney",
    "talentCredits": "FILM: SAPPHIRE (in dev), CATCH ME DADDY",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "UK"
  },
  {
    "id": "contact-talent-daniel-monzon-36",
    "name": "Daniel Monzon",
    "company": "WME / Newman",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "Spain",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: YUCATAN (W/D), CELL 211 (W/D), THE KOVAK BOX (W/D)",
    "isTalent": true,
    "talentAgency": "WME / Newman",
    "talentCredits": "FILM: YUCATAN (W/D), CELL 211 (W/D), THE KOVAK BOX (W/D)",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": "Spain"
  },
  {
    "id": "contact-talent-david-bruckner-37",
    "name": "David Bruckner",
    "company": "WME / Fight\nUntitled / Rosen",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: FALL INTO DARKNESS (W, IN DEV), MICE (D, A24 IN DEV), OUT THERE (EONE IN DEV), VHS SERIES, HELLRAISER (D), THE NIGHT HOUSE (EP/D)",
    "isTalent": true,
    "talentAgency": "WME / Fight\nUntitled / Rosen",
    "talentCredits": "FILM: FALL INTO DARKNESS (W, IN DEV), MICE (D, A24 IN DEV), OUT THERE (EONE IN DEV), VHS SERIES, HELLRAISER (D), THE NIGHT HOUSE (EP/D)",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-david-desola-and-pedro-rivero-38",
    "name": "David Desola and Pedro Rivero",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-david-kane-39",
    "name": "David Kane",
    "company": "The Agency / Kreitman",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE RIVER KING, BORN ROMANTIC (W/D), THIS YEAR'S LOVE (W/D)\nTV: SHETLAND (Creator, EP)",
    "isTalent": true,
    "talentAgency": "The Agency / Kreitman",
    "talentCredits": "FILM: THE RIVER KING, BORN ROMANTIC (W/D), THIS YEAR'S LOVE (W/D)\nTV: SHETLAND (Creator, EP)",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-david-leslie-johnson-40",
    "name": "David Leslie Johnson",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-david-mackenzie-41",
    "name": "David Mackenzie",
    "company": "UTA / Klubeck\nUnited AGents / Gascoine",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: OUTLAW KING (W/D), HELL OR HIGH WATER (D), STARRED UP (D), ASYLUM (D)\nTV: UNDER THE BANNER OF HEAVEN (D), DAMNATION (EP)",
    "isTalent": true,
    "talentAgency": "UTA / Klubeck\nUnited AGents / Gascoine",
    "talentCredits": "FILM: OUTLAW KING (W/D), HELL OR HIGH WATER (D), STARRED UP (D), ASYLUM (D)\nTV: UNDER THE BANNER OF HEAVEN (D), DAMNATION (EP)",
    "talentGenre": "",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-david-robert-mitchell-42",
    "name": "David Robert Mitchell",
    "company": "CAA / Dakhil\nGood Fear / Weiner",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: UNDER THE SILVER LAKE (W/D), IT FOLLOWS (W/D), FLOWERVALE STREET (WB FILM TO BE RELEASED)",
    "isTalent": true,
    "talentAgency": "CAA / Dakhil\nGood Fear / Weiner",
    "talentCredits": "FILM: UNDER THE SILVER LAKE (W/D), IT FOLLOWS (W/D), FLOWERVALE STREET (WB FILM TO BE RELEASED)",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-devon-graye-43",
    "name": "Devon Graye",
    "company": "UTA / Rincon\nAllegory / Welborn\nRange / Baker",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "ACTIVE",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: SWITCHBOARD (IN DEV), I SEE YOU",
    "isTalent": true,
    "talentAgency": "UTA / Rincon\nAllegory / Welborn\nRange / Baker",
    "talentCredits": "FILM: SWITCHBOARD (IN DEV), I SEE YOU",
    "talentGenre": "Horror",
    "talentRole": "writer",
    "talentMetWith": "FOUND ON SPOOKY LIST\nNEED TO WATCH",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-don-macpherson-44",
    "name": "Don MacPherson",
    "company": "Nelson Davis / Davis",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THIRTEEN LIVES, THE GUNMAN, POSSESSION, ENTRAPMENT, GODZILLA",
    "isTalent": true,
    "talentAgency": "Nelson Davis / Davis",
    "talentCredits": "FILM: THIRTEEN LIVES, THE GUNMAN, POSSESSION, ENTRAPMENT, GODZILLA",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-drew-kirsch-45",
    "name": "Drew Kirsch",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-dutch-southern-46",
    "name": "Dutch Southern",
    "company": "Gersh / Garfinkel",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: HARTINGTON'S GREATEST HITS (87NORTH FILM IN DEV, W), BAD TURN WORSE (W), ONLY THE GOOD SURVIVE (W/D)",
    "isTalent": true,
    "talentAgency": "Gersh / Garfinkel",
    "talentCredits": "FILM: HARTINGTON'S GREATEST HITS (87NORTH FILM IN DEV, W), BAD TURN WORSE (W), ONLY THE GOOD SURVIVE (W/D)",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-edward-zwick-and-marshall-herskovitz-47",
    "name": "Edward Zwick and Marshall Herskovitz",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-egor-abramenko-48",
    "name": "Egor Abramenko",
    "company": "UTA / Lonner",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: GOD'S COUNTRY, SOON YOU WILL BE GONE, ALTAR, SPUTNIK",
    "isTalent": true,
    "talentAgency": "UTA / Lonner",
    "talentCredits": "FILM: GOD'S COUNTRY, SOON YOU WILL BE GONE, ALTAR, SPUTNIK",
    "talentGenre": "",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-el-katz-49",
    "name": "EL Katz",
    "company": "CAA / Barile, Rabinow\nUntitled / Platt",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILIM: CHEAP THRILLS, THE POSSESSION, THE TROOP (D)",
    "isTalent": true,
    "talentAgency": "CAA / Barile, Rabinow\nUntitled / Platt",
    "talentCredits": "FILIM: CHEAP THRILLS, THE POSSESSION, THE TROOP (D)",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-emily-carmichael-50",
    "name": "Emily Carmichael",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-enrique-urbizu-51",
    "name": "Enrique Urbizu",
    "company": "Ginsburg / Ginsburg",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: NO REST FOR THE WICKED, THE NINTH GATE \nTV: WHEN NO ONE SEES US",
    "isTalent": true,
    "talentAgency": "Ginsburg / Ginsburg",
    "talentCredits": "FILM: NO REST FOR THE WICKED, THE NINTH GATE \nTV: WHEN NO ONE SEES US",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-ernest-riera-52",
    "name": "Ernest Riera",
    "company": "42 / Varney",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "Spain",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: PRIMATE (W, WRAPPED), NOWHERE, 47 METERS DOWN, THE OTHER SIDE OF THE DOOR",
    "isTalent": true,
    "talentAgency": "42 / Varney",
    "talentCredits": "FILM: PRIMATE (W, WRAPPED), NOWHERE, 47 METERS DOWN, THE OTHER SIDE OF THE DOOR",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "Spain"
  },
  {
    "id": "contact-talent-esteban-crespo-53",
    "name": "Esteban Crespo",
    "company": "Alter Ego",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "Spain",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: BLACK BEACH, AMAR\nTV: DETECTIVE TOURE, EL SILENCIO",
    "isTalent": true,
    "talentAgency": "Alter Ego",
    "talentCredits": "FILM: BLACK BEACH, AMAR\nTV: DETECTIVE TOURE, EL SILENCIO",
    "talentGenre": "",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": "Spain"
  },
  {
    "id": "contact-talent-ezra-nachman-54",
    "name": "Ezra Nachman",
    "company": "UTA / Lonner",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "ACTIVE",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: CASH BURN (21 LAPS/NETFLIX), THE CUTOUT\nTV: MANIFEST",
    "isTalent": true,
    "talentAgency": "UTA / Lonner",
    "talentCredits": "FILM: CASH BURN (21 LAPS/NETFLIX), THE CUTOUT\nTV: MANIFEST",
    "talentGenre": "Action, Thriller",
    "talentRole": "writer",
    "talentMetWith": "good for home defense",
    "talentBased": ""
  },
  {
    "id": "contact-talent-f-javier-gutierrez-55",
    "name": "F. Javier Gutierrez",
    "company": "UTA / IsHak, Sheresky",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "Spain",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: RINGS (W/D), DEMONIC (W/D), THE WAIT (W/D)",
    "isTalent": true,
    "talentAgency": "UTA / IsHak, Sheresky",
    "talentCredits": "FILM: RINGS (W/D), DEMONIC (W/D), THE WAIT (W/D)",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "Spain"
  },
  {
    "id": "contact-talent-filipe-vargas-56",
    "name": "Filipe Vargas",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-freddy-macdonald-57",
    "name": "Freddy Macdonald",
    "company": "UTA / DeSario",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "Switzerland",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: SEW TORN (upcoming)",
    "isTalent": true,
    "talentAgency": "UTA / DeSario",
    "talentCredits": "FILM: SEW TORN (upcoming)",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "Switzerland"
  },
  {
    "id": "contact-talent-galder-gaztelu-urrutia-58",
    "name": "Galder Gaztelu-Urrutia",
    "company": "CAA / Chou\nXYZ / Steemburg",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "Spain",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Sci-Fi"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE PLATFORM 1 &2, BANQUET",
    "isTalent": true,
    "talentAgency": "CAA / Chou\nXYZ / Steemburg",
    "talentCredits": "FILM: THE PLATFORM 1 &2, BANQUET",
    "talentGenre": "Horror, Sci-Fi",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "Spain"
  },
  {
    "id": "contact-talent-gerard-johnson-59",
    "name": "Gerard Johnson",
    "company": "Independent Talent Group / Young",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: HYENA, TONY, MUSCLE",
    "isTalent": true,
    "talentAgency": "Independent Talent Group / Young",
    "talentCredits": "FILM: HYENA, TONY, MUSCLE",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "UK"
  },
  {
    "id": "contact-talent-glenn-mcquaid-60",
    "name": "Glenn McQuaid",
    "company": "Artists and Directors / Norris",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE RESTORATION OF GRAYSON MANOR (W/D, WRAPPED), VHS (D), I SELL THE DEAD (W/D)",
    "isTalent": true,
    "talentAgency": "Artists and Directors / Norris",
    "talentCredits": "FILM: THE RESTORATION OF GRAYSON MANOR (W/D, WRAPPED), VHS (D), I SELL THE DEAD (W/D)",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-greg-jardin-61",
    "name": "Greg Jardin",
    "company": "CAA / Ross\n3 Arts / Coplen",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Sci-Fi"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: IT'S WHAT INSIDE",
    "isTalent": true,
    "talentAgency": "CAA / Ross\n3 Arts / Coplen",
    "talentCredits": "FILM: IT'S WHAT INSIDE",
    "talentGenre": "Horror, Sci-Fi",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-guillem-morales-62",
    "name": "Guillem Morales",
    "company": "Exile / Unger",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE WASP (D), LOS OJOS DE JULIA (W/D), EL HABITANTE INCIERTO (W/D)",
    "isTalent": true,
    "talentAgency": "Exile / Unger",
    "talentCredits": "FILM: THE WASP (D), LOS OJOS DE JULIA (W/D), EL HABITANTE INCIERTO (W/D)",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-guy-busick-63",
    "name": "Guy Busick",
    "company": "Verve / Philips\nThe Gotham Group / Bell",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: SCREAM 7, READY OR NOT 2, FD: BLOODLINES, ABIGAIL (revisions), SCREAM VI, SCREAM, READY OR NOT\nTV: CASTLE ROCK, STAN AGAINST EVIL",
    "isTalent": true,
    "talentAgency": "Verve / Philips\nThe Gotham Group / Bell",
    "talentCredits": "FILM: SCREAM 7, READY OR NOT 2, FD: BLOODLINES, ABIGAIL (revisions), SCREAM VI, SCREAM, READY OR NOT\nTV: CASTLE ROCK, STAN AGAINST EVIL",
    "talentGenre": "Horror, Thriller",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-halil-ozsan-64",
    "name": "Halil Ozsan",
    "company": "Aperture / Goldworm",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: ALPHA",
    "isTalent": true,
    "talentAgency": "Aperture / Goldworm",
    "talentCredits": "FILM: ALPHA",
    "talentGenre": "Horror",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "UK"
  },
  {
    "id": "contact-talent-henry-gayden-65",
    "name": "Henry Gayden",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-hope-dickson-leach-66",
    "name": "Hope Dickson Leach",
    "company": "Casarotto / Burns\nUTA / Khayatian",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE STRANGE CASE OF DR JEKYLL AND MR HYDE (D), THE LEVELLING (W/D), THE DAWN CHORUS (W/D)",
    "isTalent": true,
    "talentAgency": "Casarotto / Burns\nUTA / Khayatian",
    "talentCredits": "FILM: THE STRANGE CASE OF DR JEKYLL AND MR HYDE (D), THE LEVELLING (W/D), THE DAWN CHORUS (W/D)",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "UK"
  },
  {
    "id": "contact-talent-ian-shorr-67",
    "name": "Ian Shorr",
    "company": "WME / West\nBellevue / Zaozirny",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: INFINITE, OFFICE UPRISING",
    "isTalent": true,
    "talentAgency": "WME / West\nBellevue / Zaozirny",
    "talentCredits": "FILM: INFINITE, OFFICE UPRISING",
    "talentGenre": "Horror, Action",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-ian-tuason-68",
    "name": "Ian Tuason",
    "company": "WME / Simpson\n3 Arts / Maxwell",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: PARANORMAL ACTIVITY (in dev), THE UNDERTONE",
    "isTalent": true,
    "talentAgency": "WME / Simpson\n3 Arts / Maxwell",
    "talentCredits": "FILM: PARANORMAL ACTIVITY (in dev), THE UNDERTONE",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-isabel-pakzad-69",
    "name": "Isabel Pakzad",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: FIND YOUR FRIENDS",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "FILM: FIND YOUR FRIENDS",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-james-ashcroft-70",
    "name": "James Ashcroft",
    "company": "CAA / Henderson\nUntitled / Rowe, Platt",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "Australia",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE WHISPER MAN (Netflix, wrapped), THE RULE OF JENNY PEN (w/d), COMING HOME IN THE DARK (w/d),",
    "isTalent": true,
    "talentAgency": "CAA / Henderson\nUntitled / Rowe, Platt",
    "talentCredits": "FILM: THE WHISPER MAN (Netflix, wrapped), THE RULE OF JENNY PEN (w/d), COMING HOME IN THE DARK (w/d),",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "Australia"
  },
  {
    "id": "contact-talent-james-strong-71",
    "name": "James Strong",
    "company": "CAA / Pandian\nUnited Agents / Archer\nUntitled / Platt",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "US/UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: HARRINTGON'S GREATEST HITS (D), NIGHTFALL (D), WORDS OF WAR (D), UNITED (D0",
    "isTalent": true,
    "talentAgency": "CAA / Pandian\nUnited Agents / Archer\nUntitled / Platt",
    "talentCredits": "FILM: HARRINTGON'S GREATEST HITS (D), NIGHTFALL (D), WORDS OF WAR (D), UNITED (D0",
    "talentGenre": "",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": "US/UK"
  },
  {
    "id": "contact-talent-jamie-childs-72",
    "name": "Jamie Childs",
    "company": "CAA / MacLaren\nIndependent Talent Group / Miller",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: JACKDAW (W/D)\nTV: THE SANDMAN, WILLOW, HIS DARK MATERIALS",
    "isTalent": true,
    "talentAgency": "CAA / MacLaren\nIndependent Talent Group / Miller",
    "talentCredits": "FILM: JACKDAW (W/D)\nTV: THE SANDMAN, WILLOW, HIS DARK MATERIALS",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "UK"
  },
  {
    "id": "contact-talent-jeremy-rush-73",
    "name": "Jeremy Rush",
    "company": "CAA / Astbury\n3 Arts / Copen",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: VERSUS (Universal film in dev), WHEELMAN (w/d)\nTV: BALLISTIC (wrapped, director)",
    "isTalent": true,
    "talentAgency": "CAA / Astbury\n3 Arts / Copen",
    "talentCredits": "FILM: VERSUS (Universal film in dev), WHEELMAN (w/d)\nTV: BALLISTIC (wrapped, director)",
    "talentGenre": "",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-jillian-jacobs-and-chris-roach-74",
    "name": "Jillian Jacobs and Chris Roach",
    "company": "Verve / Boxerbaum\nLit / Kolbrenner",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: DROP, FANTASY ISLAND, BLUMHOUSE'S TRUTH OR DARE",
    "isTalent": true,
    "talentAgency": "Verve / Boxerbaum\nLit / Kolbrenner",
    "talentCredits": "FILM: DROP, FANTASY ISLAND, BLUMHOUSE'S TRUTH OR DARE",
    "talentGenre": "Thriller",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-johannes-robert-75",
    "name": "Johannes Robert",
    "company": "CAA / Picon\nWalter Hamada",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: PRIMATE (W/D, waiting release), THE FIRST OMEN, play dead,",
    "isTalent": true,
    "talentAgency": "CAA / Picon\nWalter Hamada",
    "talentCredits": "FILM: PRIMATE (W/D, waiting release), THE FIRST OMEN, play dead,",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-john-hillcoat-76",
    "name": "John Hillcoat",
    "company": "Curtis Brown / Marston\nCAA / Kenneally",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: TRIPLE 9, LAWLESS, THE ROAD, THE PROPOSITION, GHOSTS OF THE CIVIL DEAD",
    "isTalent": true,
    "talentAgency": "Curtis Brown / Marston\nCAA / Kenneally",
    "talentCredits": "FILM: TRIPLE 9, LAWLESS, THE ROAD, THE PROPOSITION, GHOSTS OF THE CIVIL DEAD",
    "talentGenre": "",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-jonathan-wakeham-77",
    "name": "Jonathan Wakeham",
    "company": "Independent Talent Group / Elles-Hill\nLit / Kolbrenner",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE SIX BILLION DOLLAR MAN (in dev), MIDAS MAN, TO CATCH A KILLER",
    "isTalent": true,
    "talentAgency": "Independent Talent Group / Elles-Hill\nLit / Kolbrenner",
    "talentCredits": "FILM: THE SIX BILLION DOLLAR MAN (in dev), MIDAS MAN, TO CATCH A KILLER",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "UK"
  },
  {
    "id": "contact-talent-jorge-guerrichaechevarria-78",
    "name": "Jorge Guerrichaechevarria",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-jorge-sanchez-cabezudo-79",
    "name": "Jorge Sanchez-Cabezudo",
    "company": "Reacting Talent / Ciordia",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "Spain",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: LA NOCHE DE LOS GIRASOLES (w/d) \nTV: SEE YOU IN ANOTHER LIFE (Creator/EP/d)",
    "isTalent": true,
    "talentAgency": "Reacting Talent / Ciordia",
    "talentCredits": "FILM: LA NOCHE DE LOS GIRASOLES (w/d) \nTV: SEE YOU IN ANOTHER LIFE (Creator/EP/d)",
    "talentGenre": "",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": "Spain"
  },
  {
    "id": "contact-talent-josh-and-spencer-marentette-80",
    "name": "Josh and Spencer Marentette",
    "company": "UTA / Lonner\nKP / Lerner, Neumann",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "ACTIVE",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action",
      "Sci-Fi"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "UTA / Lonner\nKP / Lerner, Neumann",
    "talentCredits": "",
    "talentGenre": "Action, Sci-Fi",
    "talentRole": "writer",
    "talentMetWith": "Wolfgang meh",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-jt-petty-81",
    "name": "JT Petty",
    "company": "CAA / Pandian\nCircle / Alpert",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "CAA / Pandian\nCircle / Alpert",
    "talentCredits": "",
    "talentGenre": "Horror",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-julian-oliver-meiojas-82",
    "name": "Julian Oliver Meiojas",
    "company": "CAA / Barile",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: DIE FAST, DNA\nTV: INGOBERNABLE (NETFLIX SERIES, SR)",
    "isTalent": true,
    "talentAgency": "CAA / Barile",
    "talentCredits": "FILM: DIE FAST, DNA\nTV: INGOBERNABLE (NETFLIX SERIES, SR)",
    "talentGenre": "Horror",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-julius-avery-83",
    "name": "Julius Avery",
    "company": "WME\nBrillstein",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "WME\nBrillstein",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-kat-wood-84",
    "name": "Kat Wood",
    "company": "Verve / Goldstein",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: ARTHUR & MERLIN (w), GENUS (w, in dev), DIPLOMATIC COURIER (W, IN DEV), RUBY (IN DEV), ENVOY (W)",
    "isTalent": true,
    "talentAgency": "Verve / Goldstein",
    "talentCredits": "FILM: ARTHUR & MERLIN (w), GENUS (w, in dev), DIPLOMATIC COURIER (W, IN DEV), RUBY (IN DEV), ENVOY (W)",
    "talentGenre": "Action",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "UK"
  },
  {
    "id": "contact-talent-kelsey-bollig-85",
    "name": "Kelsey Bollig",
    "company": "Untitled / Kopulsky",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "ACTIVE",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action",
      "Sci-Fi"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "SHORT: INKED, THE FOURTH WALL, INKED",
    "isTalent": true,
    "talentAgency": "Untitled / Kopulsky",
    "talentCredits": "SHORT: INKED, THE FOURTH WALL, INKED",
    "talentGenre": "Action, Sci-Fi",
    "talentRole": "writer, director",
    "talentMetWith": "Wolfgang meh",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-kyle-edward-ball-86",
    "name": "Kyle Edward Ball",
    "company": "Dissident / Vieljeux",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE LAND OF NOD (A24 film in dev), SKINAMARINK",
    "isTalent": true,
    "talentAgency": "Dissident / Vieljeux",
    "talentCredits": "FILM: THE LAND OF NOD (A24 film in dev), SKINAMARINK",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-liam-o-donnell-87",
    "name": "Liam O'Donnell",
    "company": "Zero Gravity / Williams",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Sci-Fi",
      "Action",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: ALPHAS (wrapped), SKYLINE: WARPATH (d, wrapped), SKYLINES, PORTALS, BEYOND SKYLINE (D/W), SKYLINE (W/P)",
    "isTalent": true,
    "talentAgency": "Zero Gravity / Williams",
    "talentCredits": "FILM: ALPHAS (wrapped), SKYLINE: WARPATH (d, wrapped), SKYLINES, PORTALS, BEYOND SKYLINE (D/W), SKYLINE (W/P)",
    "talentGenre": "Sci-Fi, Action, Thriller",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-lucy-campbell-88",
    "name": "Lucy Campbell",
    "company": "Writ Large / Dartnell",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: MONOLITH",
    "isTalent": true,
    "talentAgency": "Writ Large / Dartnell",
    "talentCredits": "FILM: MONOLITH",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-lucy-mckendrick-89",
    "name": "Lucy McKendrick",
    "company": "42 / Valles",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "Australia",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: FANGS (in dev) \nSHORTS: FUCK ME RICHARD",
    "isTalent": true,
    "talentAgency": "42 / Valles",
    "talentCredits": "FILM: FANGS (in dev) \nSHORTS: FUCK ME RICHARD",
    "talentGenre": "Thriller",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "Australia"
  },
  {
    "id": "contact-talent-luis-preito-90",
    "name": "Luis Preito",
    "company": "Gersh / Ashton",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: SHATTERED, KIDNAP, PUSHER",
    "isTalent": true,
    "talentAgency": "Gersh / Ashton",
    "talentCredits": "FILM: SHATTERED, KIDNAP, PUSHER",
    "talentGenre": "Action",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-luke-piotrowski-91",
    "name": "Luke Piotrowski",
    "company": "Redefine / Emerson",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: HELLRAISER, THE NIGHT HOUSE, STEPHANIE, SUPER DARK TIMES",
    "isTalent": true,
    "talentAgency": "Redefine / Emerson",
    "talentCredits": "FILM: HELLRAISER, THE NIGHT HOUSE, STEPHANIE, SUPER DARK TIMES",
    "talentGenre": "Horror, Action",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-mackenzie-dohr-92",
    "name": "Mackenzie Dohr",
    "company": "Untitled / Bajana",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Thriller",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: KEEPER OF THE LOST CITIES (WB film in dev)\nTV: WIDOW'S BAY, WANDAVISION",
    "isTalent": true,
    "talentAgency": "Untitled / Bajana",
    "talentCredits": "FILM: KEEPER OF THE LOST CITIES (WB film in dev)\nTV: WIDOW'S BAY, WANDAVISION",
    "talentGenre": "Thriller, Horror",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-marcella-ochoa-93",
    "name": "Marcella Ochoa",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-matt-cook-94",
    "name": "Matt Cook",
    "company": "WME / Hoagland\nRange / Cook",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: INLAND (EP), THE INFORMER (W), ANGEL HAS FALLEN (W), PATRIOTS DAY (W), THE DUEL (W)",
    "isTalent": true,
    "talentAgency": "WME / Hoagland\nRange / Cook",
    "talentCredits": "FILM: INLAND (EP), THE INFORMER (W), ANGEL HAS FALLEN (W), PATRIOTS DAY (W), THE DUEL (W)",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-mattson-tomlin-95",
    "name": "Mattson Tomlin",
    "company": "CAA / Stein\nBrillstein / Frognowski",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Action",
      "Sci-Fi",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: PROJECT POWER, THE BATMAN\nTV: TERMINATOR ZERO",
    "isTalent": true,
    "talentAgency": "CAA / Stein\nBrillstein / Frognowski",
    "talentCredits": "FILM: PROJECT POWER, THE BATMAN\nTV: TERMINATOR ZERO",
    "talentGenre": "Horror, Action, Sci-Fi, Thriller",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-max-taxe-96",
    "name": "Max Taxe",
    "company": "UTA / Akintade\nEnt 360 / Shaevitz",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Sci-Fi",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: MOONSHOT",
    "isTalent": true,
    "talentAgency": "UTA / Akintade\nEnt 360 / Shaevitz",
    "talentCredits": "FILM: MOONSHOT",
    "talentGenre": "Sci-Fi, Thriller",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-melanie-toast-97",
    "name": "Melanie Toast",
    "company": "UTA / Sivitz\n3 Arts / Rowbotham, Maxwell",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: CLIFFHANGER, SHUT IN",
    "isTalent": true,
    "talentAgency": "UTA / Sivitz\n3 Arts / Rowbotham, Maxwell",
    "talentCredits": "FILM: CLIFFHANGER, SHUT IN",
    "talentGenre": "Action",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-micah-fitzerman-blue-noah-harpster-98",
    "name": "Micah Fitzerman-Blue & Noah Harpster",
    "company": "UTA / Khayatian\nKP / Lerner",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action",
      "Horror",
      "Sci-Fi",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: BEAUTIFUL RUINS (in dev), MAGIC CAMP, A BEAUTIFUL DAY IN THE NEIGHBORHOOD",
    "isTalent": true,
    "talentAgency": "UTA / Khayatian\nKP / Lerner",
    "talentCredits": "FILM: BEAUTIFUL RUINS (in dev), MAGIC CAMP, A BEAUTIFUL DAY IN THE NEIGHBORHOOD",
    "talentGenre": "Action, Horror, Sci-Fi, Thriller",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-micah-fitzerman-blue-and-noah-harpster-99",
    "name": "Micah Fitzerman-Blue and Noah Harpster",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-michael-wallach-100",
    "name": "Michael Wallach",
    "company": "",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "ACTIVE",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE BAY",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "FILM: THE BAY",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "FOUND ON SPOOKY LIST\nNEED TO WATCH",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-michel-blanchart-101",
    "name": "Michel Blanchart",
    "company": "WME / Newman",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Action",
      "Sci-Fi",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "WME / Newman",
    "talentCredits": "",
    "talentGenre": "Horror, Action, Sci-Fi, Thriller",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-minnie-schedeen-102",
    "name": "Minnie Schedeen",
    "company": "UTA / Lonner\nUntitled / Kanaan",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Sci-Fi",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "UTA / Lonner\nUntitled / Kanaan",
    "talentCredits": "",
    "talentGenre": "Sci-Fi, Horror",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-nacho-vigalondo-103",
    "name": "Nacho Vigalondo",
    "company": "CAA / Stein",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "Spain",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Sci-Fi",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: COMEBACK (W/D, in dev at Columbia), THE WHISTLER (W, WRAPPED), DANIELA FOREVER (W/D), COLOSSAL (W/D), VHS VIRAL (D), TIMECRIMES (W/D)",
    "isTalent": true,
    "talentAgency": "CAA / Stein",
    "talentCredits": "FILM: COMEBACK (W/D, in dev at Columbia), THE WHISTLER (W, WRAPPED), DANIELA FOREVER (W/D), COLOSSAL (W/D), VHS VIRAL (D), TIMECRIMES (W/D)",
    "talentGenre": "Sci-Fi, Thriller",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "Spain"
  },
  {
    "id": "contact-talent-nathan-parker-104",
    "name": "Nathan Parker",
    "company": "CAA / Ross\nUntitled / Rowe",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: SLINGSHOT, OUR HOUSE, 2:22, EQUALS, BLITZ",
    "isTalent": true,
    "talentAgency": "CAA / Ross\nUntitled / Rowe",
    "talentCredits": "FILM: SLINGSHOT, OUR HOUSE, 2:22, EQUALS, BLITZ",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-neil-cross-105",
    "name": "Neil Cross",
    "company": "ITG / McCoy\nUTA / Thuan",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: ESCAPE FROM NEW YORK REMAKE, LUTHER: THE FALLEN SUN\nTV: THE MOSQUITO COAST, THE SISTER",
    "isTalent": true,
    "talentAgency": "ITG / McCoy\nUTA / Thuan",
    "talentCredits": "FILM: ESCAPE FROM NEW YORK REMAKE, LUTHER: THE FALLEN SUN\nTV: THE MOSQUITO COAST, THE SISTER",
    "talentGenre": "Action, Thriller",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-nick-pesce-106",
    "name": "Nick Pesce",
    "company": "Ent 360",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: VISITATION (in post), THE EYES OF MY MOTHER, PIERCING, THE GRUDGE",
    "isTalent": true,
    "talentAgency": "Ent 360",
    "talentCredits": "FILM: VISITATION (in post), THE EYES OF MY MOTHER, PIERCING, THE GRUDGE",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-nick-schenk-107",
    "name": "Nick Schenk",
    "company": "IAG / Loftus\nEnt 360 / Casady",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: GALAHAD (film in dev), CRY MACHO, THE MULE, THE JUDGE, ROBOCOP, GRAN TORINO",
    "isTalent": true,
    "talentAgency": "IAG / Loftus\nEnt 360 / Casady",
    "talentCredits": "FILM: GALAHAD (film in dev), CRY MACHO, THE MULE, THE JUDGE, ROBOCOP, GRAN TORINO",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-nico-van-den-brink-108",
    "name": "Nico Van Den Brink",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-nicolas-winding-refn-109",
    "name": "Nicolas Winding Refn",
    "company": "WME / Gorin\nIndependent Talent Group / Rodgers",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "UK/DENMARK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE NEON DEMON, ONLY GOD FORGIVES, VALHALLA RISING, PUSHER SERIES\nTV: COPENHAGEN COWBOY, TOO OLD TO DIE YOUNG",
    "isTalent": true,
    "talentAgency": "WME / Gorin\nIndependent Talent Group / Rodgers",
    "talentCredits": "FILM: THE NEON DEMON, ONLY GOD FORGIVES, VALHALLA RISING, PUSHER SERIES\nTV: COPENHAGEN COWBOY, TOO OLD TO DIE YOUNG",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "UK/DENMARK"
  },
  {
    "id": "contact-talent-noah-gardner-110",
    "name": "Noah Gardner",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-oliver-kienle-111",
    "name": "Oliver Kienle",
    "company": "",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "Germany",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: ISSI AND OSSI (w/d), FOUR HANDS (w/d), SIXTY MINUTES (w/d)",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "FILM: ISSI AND OSSI (w/d), FOUR HANDS (w/d), SIXTY MINUTES (w/d)",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "Germany"
  },
  {
    "id": "contact-talent-oriol-paulo-112",
    "name": "Oriol Paulo",
    "company": "United Agent / McCurry\nMosaic / Nelson",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: ZETA, LOS RENGLONES TORCIDOS DE DIOS (W), MIRAGE (W/D)",
    "isTalent": true,
    "talentAgency": "United Agent / McCurry\nMosaic / Nelson",
    "talentCredits": "FILM: ZETA, LOS RENGLONES TORCIDOS DE DIOS (W), MIRAGE (W/D)",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-parker-finn-113",
    "name": "Parker Finn",
    "company": "Untitled / Platt",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: SMILE 1&2",
    "isTalent": true,
    "talentAgency": "Untitled / Platt",
    "talentCredits": "FILM: SMILE 1&2",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-patrick-brice-114",
    "name": "Patrick Brice",
    "company": "CAA / Barile\nUntitled / Platt",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THERE'S SOMEONE INSIDE YOUR HOUSE, CORPORATE ANIMALS, CREEP\nTV: THE CREEP TAPES (Creator, EP)",
    "isTalent": true,
    "talentAgency": "CAA / Barile\nUntitled / Platt",
    "talentCredits": "FILM: THERE'S SOMEONE INSIDE YOUR HOUSE, CORPORATE ANIMALS, CREEP\nTV: THE CREEP TAPES (Creator, EP)",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-peter-eskelsen-115",
    "name": "Peter Eskelsen",
    "company": "Bellevue / Portnoy",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "Bellevue / Portnoy",
    "talentCredits": "",
    "talentGenre": "Action, Thriller",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-peter-gaffney-116",
    "name": "Peter Gaffney",
    "company": "Verve / Boxerbaum, Davis",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: DON'T GO IN THE WATER (spec, set up)",
    "isTalent": true,
    "talentAgency": "Verve / Boxerbaum, Davis",
    "talentCredits": "FILM: DON'T GO IN THE WATER (spec, set up)",
    "talentGenre": "Action",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-peter-stanley-ward-and-natalie-conway-117",
    "name": "Peter Stanley Ward and Natalie Conway",
    "company": "UTA / Lonner\nKP / Lerner",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: PLAY DEAD",
    "isTalent": true,
    "talentAgency": "UTA / Lonner\nKP / Lerner",
    "talentCredits": "FILM: PLAY DEAD",
    "talentGenre": "Horror, Thriller",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-pg-cuschieri-118",
    "name": "PG Cuschieri",
    "company": "",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE MOTHER, SACRAMENT, THE FATHER",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "FILM: THE MOTHER, SACRAMENT, THE FATHER",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "UK"
  },
  {
    "id": "contact-talent-prano-bailey-bond-119",
    "name": "Prano Bailey-Bond",
    "company": "Casarotto / Mestriner\nUTA / Morley",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "Ireland",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: CENSOR",
    "isTalent": true,
    "talentAgency": "Casarotto / Mestriner\nUTA / Morley",
    "talentCredits": "FILM: CENSOR",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "Ireland"
  },
  {
    "id": "contact-talent-rhys-thomas-120",
    "name": "Rhys Thomas",
    "company": "CAA / Barile\n3 Arts / Lassally",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: SLEEP TRAN (D), ANOMALY (W/D), ROBOTECH (D)",
    "isTalent": true,
    "talentAgency": "CAA / Barile\n3 Arts / Lassally",
    "talentCredits": "FILM: SLEEP TRAN (D), ANOMALY (W/D), ROBOTECH (D)",
    "talentGenre": "Horror",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-richard-and-ian-121",
    "name": "Richard and Ian",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-richard-d-ovidio-122",
    "name": "Richard D'Ovidio",
    "company": "Media Talent / Davey",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: PRESCHOOL, TRUE HAUNTING, HYPNOTIC, THE CALL, THE FORGER",
    "isTalent": true,
    "talentAgency": "Media Talent / Davey",
    "talentCredits": "FILM: PRESCHOOL, TRUE HAUNTING, HYPNOTIC, THE CALL, THE FORGER",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-richard-wenk-123",
    "name": "Richard Wenk",
    "company": "Gersh / Garfinkel\nThe Arlook Group / Arlook",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE EQUALIZER SERIES, FAST CHARLIE, THE PROTEGe, AMERICAN RENEGADES",
    "isTalent": true,
    "talentAgency": "Gersh / Garfinkel\nThe Arlook Group / Arlook",
    "talentCredits": "FILM: THE EQUALIZER SERIES, FAST CHARLIE, THE PROTEGe, AMERICAN RENEGADES",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-robert-archer-lynn-124",
    "name": "Robert Archer Lynn",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-rodrigo-cortes-125",
    "name": "Rodrigo Cortes",
    "company": "UTA / Khayatian",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: ESCAPE (W/D), DOWN A DARK HALL (D), RED LIGHTS (W/D), APARTMENT 143 (W)",
    "isTalent": true,
    "talentAgency": "UTA / Khayatian",
    "talentCredits": "FILM: ESCAPE (W/D), DOWN A DARK HALL (D), RED LIGHTS (W/D), APARTMENT 143 (W)",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-rodrigue-huart-126",
    "name": "Rodrigue Huart",
    "company": "WME / Buckley\nRange / Cohen",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE CONJURING: FIRST COMMUNION, SUFFER LITTLE CHILDREN",
    "isTalent": true,
    "talentAgency": "WME / Buckley\nRange / Cohen",
    "talentCredits": "FILM: THE CONJURING: FIRST COMMUNION, SUFFER LITTLE CHILDREN",
    "talentGenre": "Horror",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-rowan-joffe-127",
    "name": "Rowan Joffe",
    "company": "Curtis Brown / Marston",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: LOCKED IN, THE INFORMER, BEFORE I GO TO SLEEP, BRIGHTON ROCK, THE AMERICAN\nTV: TIN STAR",
    "isTalent": true,
    "talentAgency": "Curtis Brown / Marston",
    "talentCredits": "FILM: LOCKED IN, THE INFORMER, BEFORE I GO TO SLEEP, BRIGHTON ROCK, THE AMERICAN\nTV: TIN STAR",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-ryan-engle-128",
    "name": "Ryan Engle",
    "company": "CAA / Martin\nMosaic / Lasker",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: BEAST, BREAKING IN, RAMPAGE, THE COMMUTER, NON-STOP",
    "isTalent": true,
    "talentAgency": "CAA / Martin\nMosaic / Lasker",
    "talentCredits": "FILM: BEAST, BREAKING IN, RAMPAGE, THE COMMUTER, NON-STOP",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-sam-bodin-129",
    "name": "Sam Bodin",
    "company": "Gersh / Walker\nUntitled / Rowe, Platt",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: CABBAGE LADY (w/d, in dev), COBWEB (D)\nTV: DUSTER (D, EP), MARIANNE (WRITER, CREATOR, DIRECTOR, IN DEV AT NETFLIX)",
    "isTalent": true,
    "talentAgency": "Gersh / Walker\nUntitled / Rowe, Platt",
    "talentCredits": "FILM: CABBAGE LADY (w/d, in dev), COBWEB (D)\nTV: DUSTER (D, EP), MARIANNE (WRITER, CREATOR, DIRECTOR, IN DEV AT NETFLIX)",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-santiago-menghini-130",
    "name": "Santiago Menghini",
    "company": "UTA / Burns\nKP / Stoops",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE REVENGE OF LA LLORONA (D) , NO ONE GETS OUT ALIVE (D), INTRUDERS (D)",
    "isTalent": true,
    "talentAgency": "UTA / Burns\nKP / Stoops",
    "talentCredits": "FILM: THE REVENGE OF LA LLORONA (D) , NO ONE GETS OUT ALIVE (D), INTRUDERS (D)",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-scott-beck-and-bryan-woods-131",
    "name": "Scott Beck and Bryan Woods",
    "company": "CAA / Gering\nAC / Cunningham",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: HERETIC (W/D/P), A QUIET PLACE (W), 65 (W/D)",
    "isTalent": true,
    "talentAgency": "CAA / Gering\nAC / Cunningham",
    "talentCredits": "FILM: HERETIC (W/D/P), A QUIET PLACE (W), 65 (W/D)",
    "talentGenre": "Horror, Action",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-sean-tretta-132",
    "name": "Sean Tretta",
    "company": "CAA / Yan\nAdventure Media / Diperstein",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILIM: THE REVENGE OF LA LLORNA, YETI",
    "isTalent": true,
    "talentAgency": "CAA / Yan\nAdventure Media / Diperstein",
    "talentCredits": "FILIM: THE REVENGE OF LA LLORNA, YETI",
    "talentGenre": "Horror",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-sergio-g-sanchez-133",
    "name": "Sergio G Sanchez",
    "company": "UTA / Klubeck",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: MARROWBONE, PALM TREES IN THE SNOW, FIN, THE ORPHANAGE, PURGATORIO",
    "isTalent": true,
    "talentAgency": "UTA / Klubeck",
    "talentCredits": "FILM: MARROWBONE, PALM TREES IN THE SNOW, FIN, THE ORPHANAGE, PURGATORIO",
    "talentGenre": "",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-seth-reiss-134",
    "name": "Seth Reiss",
    "company": "UTA / Rincon",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "UTA / Rincon",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-shannon-triplett-135",
    "name": "Shannon Triplett",
    "company": "",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Sci-Fi"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Sci-Fi",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-skip-woods-136",
    "name": "Skip Woods",
    "company": "UTA / Burns\nEnt 360 / Casady",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: SABOTAGE, A GOOD DAY TO DIE HARD, THE A-TEAM, GI JOE: THE RISE OF COBRA, HITMAN, TORQUE",
    "isTalent": true,
    "talentAgency": "UTA / Burns\nEnt 360 / Casady",
    "talentCredits": "FILM: SABOTAGE, A GOOD DAY TO DIE HARD, THE A-TEAM, GI JOE: THE RISE OF COBRA, HITMAN, TORQUE",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-stephen-chin-137",
    "name": "Stephen Chin",
    "company": "Syndicate / Roberts",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "Canada",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: WAR DOGS, ANOTHER DAY IN PARADISE, KUNG FU (87NORTH, UNIVERSAL FILM IN DEV)\nTV: PRIVILEGE (HYPEROBJECT/HBO TV IN DEV)",
    "isTalent": true,
    "talentAgency": "Syndicate / Roberts",
    "talentCredits": "FILM: WAR DOGS, ANOTHER DAY IN PARADISE, KUNG FU (87NORTH, UNIVERSAL FILM IN DEV)\nTV: PRIVILEGE (HYPEROBJECT/HBO TV IN DEV)",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "Canada"
  },
  {
    "id": "contact-talent-stephen-shields-138",
    "name": "Stephen Shields",
    "company": "CAA / Barile\nNavigation / Rosen",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: BOX OF BONES (IN DEV), ABIGAIL, THE HOLE IN THE GROUND",
    "isTalent": true,
    "talentAgency": "CAA / Barile\nNavigation / Rosen",
    "talentCredits": "FILM: BOX OF BONES (IN DEV), ABIGAIL, THE HOLE IN THE GROUND",
    "talentGenre": "Horror",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-steve-lightfoot-139",
    "name": "Steve Lightfoot",
    "company": "Curtis Brown / Williams\nWME / Seidel",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: PARALLEL \nTV: BEHIND HER EYES, SPIDER-NOIR (IN DEV), SHANTARAM",
    "isTalent": true,
    "talentAgency": "Curtis Brown / Williams\nWME / Seidel",
    "talentCredits": "FILM: PARALLEL \nTV: BEHIND HER EYES, SPIDER-NOIR (IN DEV), SHANTARAM",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "UK"
  },
  {
    "id": "contact-talent-taylor-sardoni-140",
    "name": "Taylor Sardoni",
    "company": "Writ Large / Dartnell",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: LAST STRAW, THE ATOMIC DREAM",
    "isTalent": true,
    "talentAgency": "Writ Large / Dartnell",
    "talentCredits": "FILM: LAST STRAW, THE ATOMIC DREAM",
    "talentGenre": "Horror, Thriller",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-thomas-martin-141",
    "name": "Thomas Martin",
    "company": "",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE SURFER (upcoming Lionsgate film)\nTV: PRIME TARGET, TIN STAR, RIPPER STREET",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "FILM: THE SURFER (upcoming Lionsgate film)\nTV: PRIME TARGET, TIN STAR, RIPPER STREET",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "UK"
  },
  {
    "id": "contact-talent-tim-cairo-and-jake-gibson-142",
    "name": "Tim Cairo and Jake Gibson",
    "company": "XYZ Films / Steemburg",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: NIGHT PATROL (RLJ ENT releasing), HE BLED NEON (wrapped), SHADOW OF GOD (EP/w)",
    "isTalent": true,
    "talentAgency": "XYZ Films / Steemburg",
    "talentCredits": "FILM: NIGHT PATROL (RLJ ENT releasing), HE BLED NEON (wrapped), SHADOW OF GOD (EP/w)",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-tim-meloney-143",
    "name": "Tim Meloney",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-tod-kip-williams-144",
    "name": "Tod \"Kip\" Williams",
    "company": "CAA / Kaye\nUntitled / Weinberg",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: CELL, PARANORMAL ACTIVITY 2, MALIBU (SPOOKY PIC IN DEV)",
    "isTalent": true,
    "talentAgency": "CAA / Kaye\nUntitled / Weinberg",
    "talentCredits": "FILM: CELL, PARANORMAL ACTIVITY 2, MALIBU (SPOOKY PIC IN DEV)",
    "talentGenre": "Horror",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-todd-spence-and-zak-white-145",
    "name": "Todd Spence and Zak White",
    "company": "WME / Fight\nUntitled / Klein",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: MICE (in dev at A24), BLACK SKY (in dev at Lab Brew)\nTV: CREEPSHOW",
    "isTalent": true,
    "talentAgency": "WME / Fight\nUntitled / Klein",
    "talentCredits": "FILM: MICE (in dev at A24), BLACK SKY (in dev at Lab Brew)\nTV: CREEPSHOW",
    "talentGenre": "Horror",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-tw-burgess-146",
    "name": "TW Burgess",
    "company": "Ent 360",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "Ent 360",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-umair-aleem-147",
    "name": "Umair Aleem",
    "company": "Verve / Besser, Mohebbi",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: DANGER GIRL, MILE 22 SEQUEL, SANDMAN SLIM, NOBODY 2, KATE, EXTRACTION",
    "isTalent": true,
    "talentAgency": "Verve / Besser, Mohebbi",
    "talentCredits": "FILM: DANGER GIRL, MILE 22 SEQUEL, SANDMAN SLIM, NOBODY 2, KATE, EXTRACTION",
    "talentGenre": "Action",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-vanessa-taylor-148",
    "name": "Vanessa Taylor",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-will-gillies-149",
    "name": "Will Gillies",
    "company": "KP / Kaplan",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: HALLOW ROAD, WHO GOES THERE (IN DEV)\nTV: THE LORD'S DAY",
    "isTalent": true,
    "talentAgency": "KP / Kaplan",
    "talentCredits": "FILM: HALLOW ROAD, WHO GOES THERE (IN DEV)\nTV: THE LORD'S DAY",
    "talentGenre": "Horror",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": "UK"
  },
  {
    "id": "contact-talent-william-mcgregor-150",
    "name": "William McGregor",
    "company": "CAA / Cassir\nIndependent Talent Group / Irwin",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "UK",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: SMILE, GWEN \nTV: LOCKWOOD & CO (director), HIS DARK MATERIALS (d)",
    "isTalent": true,
    "talentAgency": "CAA / Cassir\nIndependent Talent Group / Irwin",
    "talentCredits": "FILM: SMILE, GWEN \nTV: LOCKWOOD & CO (director), HIS DARK MATERIALS (d)",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "UK"
  },
  {
    "id": "contact-talent-zach-donohue-151",
    "name": "Zach Donohue",
    "company": "Remington / Remington",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE DEN",
    "isTalent": true,
    "talentAgency": "Remington / Remington",
    "talentCredits": "FILM: THE DEN",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-zach-strauss-and-christopher-silber-152",
    "name": "Zach Strauss and Christopher Silber",
    "company": "Verve / Mohebbi\nEnt 360 / Shaevitz",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "ACTIVE",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: PALETTE, MINNOW\nTV: SMILF, THE CHI",
    "isTalent": true,
    "talentAgency": "Verve / Mohebbi\nEnt 360 / Shaevitz",
    "talentCredits": "FILM: PALETTE, MINNOW\nTV: SMILF, THE CHI",
    "talentGenre": "Action",
    "talentRole": "writer, director",
    "talentMetWith": "read this Robert liked",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-charlie-schwan-153",
    "name": "Charlie Schwan",
    "company": "WME / Buckley, Armstrong",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "US",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "SHORT: HARVESTER",
    "isTalent": true,
    "talentAgency": "WME / Buckley, Armstrong",
    "talentCredits": "SHORT: HARVESTER",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": "US"
  },
  {
    "id": "contact-talent-eli-craig-154",
    "name": "Eli Craig",
    "company": "AC / McKnight",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: CLOWN IN A CORNFIELD",
    "isTalent": true,
    "talentAgency": "AC / McKnight",
    "talentCredits": "FILM: CLOWN IN A CORNFIELD",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-theo-james-krekis-155",
    "name": "Theo James Krekis",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-liam-gavin-156",
    "name": "Liam Gavin",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "ACTIVE",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "WATCH A DARK SONG",
    "talentBased": ""
  },
  {
    "id": "contact-talent-eskil-vogt-157",
    "name": "Eskil Vogt",
    "company": "Casarotto / Burns",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Sci-Fi",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE INNOCENTS",
    "isTalent": true,
    "talentAgency": "Casarotto / Burns",
    "talentCredits": "FILM: THE INNOCENTS",
    "talentGenre": "Horror, Sci-Fi, Thriller",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-john-adams-158",
    "name": "John Adams",
    "company": "AC / McCabe",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: HELLBENDERS",
    "isTalent": true,
    "talentAgency": "AC / McCabe",
    "talentCredits": "FILM: HELLBENDERS",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-s-bastien-vani-ek-159",
    "name": "Sébastien Vaniček",
    "company": "WME / Martin, Green",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "ACTIVE",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: EVIL DEAD BURN, INFESTED",
    "isTalent": true,
    "talentAgency": "WME / Martin, Green",
    "talentCredits": "FILM: EVIL DEAD BURN, INFESTED",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "sebastienvanicek@gmail.com",
    "talentBased": ""
  },
  {
    "id": "contact-talent-xavier-gens-160",
    "name": "Xavier Gens",
    "company": "AC / McKnight",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Action",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: UNDER PARIS",
    "isTalent": true,
    "talentAgency": "AC / McKnight",
    "talentCredits": "FILM: UNDER PARIS",
    "talentGenre": "Horror, Action, Thriller",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-cameron-gallagher-161",
    "name": "Cameron Gallagher",
    "company": "AC / McCabe",
    "type": "WRITER",
    "title": "writer, director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "SHORT: IT VISITS ME",
    "isTalent": true,
    "talentAgency": "AC / McCabe",
    "talentCredits": "SHORT: IT VISITS ME",
    "talentGenre": "Horror",
    "talentRole": "writer, director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-ben-richardson-162",
    "name": "Ben Richardson",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-dawid-szatarski-163",
    "name": "Dawid Szatarski",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-james-madigan-164",
    "name": "James Madigan",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-jeff-wadlow-165",
    "name": "Jeff Wadlow",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-jeremy-rush-166",
    "name": "Jeremy Rush",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-joe-lynch-167",
    "name": "Joe Lynch",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-johannes-roberts-168",
    "name": "Johannes Roberts",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-john-swab-169",
    "name": "John Swab",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-luis-prieto-170",
    "name": "Luis Prieto",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-vicky-jewson-171",
    "name": "Vicky Jewson",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-mid-173",
    "name": "Mid:",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-adil-bilall-174",
    "name": "Adil & Bilall",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-angel-manuel-soto-175",
    "name": "Angel Manuel Soto",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-ben-wheatley-176",
    "name": "Ben Wheatley",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-brad-peyton-177",
    "name": "Brad Peyton",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-dan-trachtenberg-178",
    "name": "Dan Trachtenberg",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-ilya-naishuller-179",
    "name": "Ilya Naishuller",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-jalmari-helander-180",
    "name": "Jalmari Helander",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-james-hawes-181",
    "name": "James Hawes",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-janus-metz-182",
    "name": "Janus Metz",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-jean-fran-ois-richet-183",
    "name": "Jean-François Richet",
    "company": "",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: PLANE, MUTINY, QUASIMODO,  BLOOD FATHER, ASSAULT ON PRECINCT 12",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "FILM: PLANE, MUTINY, QUASIMODO,  BLOOD FATHER, ASSAULT ON PRECINCT 12",
    "talentGenre": "Action",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-len-wiseman-184",
    "name": "Len Wiseman",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-morgan-dalibert-185",
    "name": "Morgan Dalibert",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-nikhil-nagesh-bhat-186",
    "name": "Nikhil Nagesh Bhat",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-patricia-riggen-187",
    "name": "Patricia Riggen",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-ray-mendoza-188",
    "name": "Ray Mendoza",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-romain-gavras-189",
    "name": "Romain Gavras",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-roseanne-liang-190",
    "name": "Roseanne Liang",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-timo-tjahjanto-191",
    "name": "Timo Tjahjanto",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-tommy-wirkola-192",
    "name": "Tommy Wirkola",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-xavier-gens-193",
    "name": "Xavier Gens",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "Action",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-zach-donahue-194",
    "name": "Zach Donahue",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-simon-uttley-195",
    "name": "Simon Uttley",
    "company": "42mp",
    "type": "WRITER",
    "title": "writer",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Action",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: THE OCCUPANTS",
    "isTalent": true,
    "talentAgency": "42mp",
    "talentCredits": "FILM: THE OCCUPANTS",
    "talentGenre": "Action, Thriller",
    "talentRole": "writer",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-michael-and-peter-spierig-196",
    "name": "Michael and Peter Spierig",
    "company": "UTA / Carlson",
    "type": "OTHER",
    "title": "director",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent",
      "Horror",
      "Action",
      "Thriller"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "FILM: JIGSAW. WINCHESTER. THE DEMON DISORDER, PREDESTINATION",
    "isTalent": true,
    "talentAgency": "UTA / Carlson",
    "talentCredits": "FILM: JIGSAW. WINCHESTER. THE DEMON DISORDER, PREDESTINATION",
    "talentGenre": "Horror, Action, Thriller",
    "talentRole": "director",
    "talentMetWith": "",
    "talentBased": ""
  },
  {
    "id": "contact-talent-agnus-martens-197",
    "name": "agnus martens",
    "company": "",
    "type": "OTHER",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "status": "NEW",
    "ownerId": "user-producer",
    "tags": [
      "talent"
    ],
    "lastContacted": "",
    "nextFollowUp": "",
    "projectIds": [],
    "notes": "",
    "isTalent": true,
    "talentAgency": "",
    "talentCredits": "",
    "talentGenre": "",
    "talentRole": "",
    "talentMetWith": "",
    "talentBased": ""
  }
];

export const hammerContacts: HammerContact[] = [...hammerTalentContacts, ...hammerBaseContacts];

export const hammerContactRelationships: HammerContactRelationship[] = [
  { id: "contact-rel-june-catalyst", fromContactId: "contact-june", toContactId: "contact-catalyst", relationshipType: "AGENT", notes: "Catalyst handles incoming submissions for June.", createdAt: "2026-07-17" },
  { id: "contact-rel-june-arc", fromContactId: "contact-june", toContactId: "contact-arc", relationshipType: "MANAGER", notes: "Arc coordinates availability and packaging conversations.", createdAt: "2026-07-17" }
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

export const hammerScriptCollections: HammerScriptCollection[] = [
  { id: "collection-weekend-reads", name: "Weekend Reads", description: "Incoming scripts for producer review this week.", ownerId: "user-producer", status: "ACTIVE", visibility: "PROJECT_TEAM", createdAt: "2026-07-12", updatedAt: "2026-07-12" },
  { id: "collection-greenlight-candidates", name: "Greenlight Candidates", description: "Materials that may need executive attention soon.", ownerId: "user-exec", status: "ACTIVE", visibility: "EXECUTIVE_ONLY", createdAt: "2026-07-10", updatedAt: "2026-07-10" }
];

export const hammerScriptCollectionItems: HammerScriptCollectionItem[] = [
  { id: "collection-item-weekend-echo", collectionId: "collection-weekend-reads", documentId: "doc-inbox-echo", sortOrder: 1, notes: "Spec sample for first-pass read.", addedAt: "2026-07-12" },
  { id: "collection-item-weekend-kite", collectionId: "collection-weekend-reads", documentId: "doc-inbox-kite", sortOrder: 2, notes: "Treatment may pair with family slate.", addedAt: "2026-07-12" },
  { id: "collection-item-greenlight-hammer", collectionId: "collection-greenlight-candidates", documentId: "doc-hammer-script", sortOrder: 1, notes: "Needs final notes pass before exec read.", addedAt: "2026-07-10" }
];

export const hammerSlateCollections: HammerSlateCollection[] = [
  { id: "slate-collection-weekly-review", name: "Weekly Review Packet", description: "Projects and prospects for the next studio development meeting.", ownerId: "user-producer", status: "ACTIVE", visibility: "PROJECT_TEAM", createdAt: "2026-07-20", updatedAt: "2026-07-20" },
  { id: "slate-collection-exec-priority", name: "Executive Priority Reads", description: "Items that need executive attention before the next greenlight check-in.", ownerId: "user-exec", status: "ACTIVE", visibility: "EXECUTIVE_ONLY", createdAt: "2026-07-18", updatedAt: "2026-07-18" }
];

export const hammerSlateCollectionItems: HammerSlateCollectionItem[] = [
  { id: "slate-collection-item-weekly-hammer", collectionId: "slate-collection-weekly-review", itemType: "PROJECT", projectId: "project-hammer", sortOrder: 1, notes: "Review current script state and previz readiness.", addedAt: "2026-07-20" },
  { id: "slate-collection-item-weekly-prospect", collectionId: "slate-collection-weekly-review", itemType: "PROSPECT", prospectId: "lead-demo-1", sortOrder: 2, notes: "Discuss whether this should move into active development.", addedAt: "2026-07-20" },
  { id: "slate-collection-item-exec-orchid", collectionId: "slate-collection-exec-priority", itemType: "PROJECT", projectId: "project-orchid", sortOrder: 1, notes: "Needs decision on next draft path.", addedAt: "2026-07-18" }
];

export const hammerApprovals: HammerApproval[] = [
  { id: "approval-script", projectId: "project-hammer", targetType: "DOCUMENT_VERSION", targetId: "ver-hammer-3", requestedById: "user-producer", reviewerId: "user-exec", status: "REQUESTED", createdAt: "2026-06-19" },
  { id: "approval-case", projectId: "project-hammer", targetType: "ASSET", targetId: "asset-case", requestedById: "user-artist", reviewerId: "user-producer", status: "APPROVED", decisionNotes: "Approved for lookbook.", createdAt: "2026-06-13", decidedAt: "2026-06-14" }
];

export const hammerTasks: HammerTask[] = [
  { id: "task-admin", projectId: "project-hammer", title: "Review role assignments", description: "Confirm producer and executive access before the greenlight review.", assignedToId: "user-admin", createdById: "user-producer", dueDate: "2026-06-24", priority: "MEDIUM", status: "TODO", sortOrder: 1, targetType: "PROJECT", targetId: "project-hammer", subtasks: [
    { id: "subtask-admin-roles", taskId: "task-admin", title: "Confirm producer role can create projects", completed: true, createdById: "user-producer", createdAt: "2026-06-21", updatedAt: "2026-06-21" },
    { id: "subtask-admin-exec", taskId: "task-admin", title: "Verify executive can see all assigned review material", completed: false, createdById: "user-producer", createdAt: "2026-06-21", updatedAt: "2026-06-21" }
  ] },
  { id: "task-breakdown", projectId: "project-hammer", title: "Approve green draft breakdown", description: "Review parsed scenes and entity links before greenlight packet.", assignedToId: "user-dev", createdById: "user-producer", dueDate: "2026-06-25", priority: "HIGH", status: "REVIEW", sortOrder: 2, targetType: "DOCUMENT_VERSION", targetId: "ver-hammer-3" },
  { id: "task-rooftop", projectId: "project-hammer", title: "Revise rooftop mood frames", description: "Address producer note and relink approved candidate.", assignedToId: "user-artist", createdById: "user-producer", dueDate: "2026-06-27", priority: "MEDIUM", status: "IN_PROGRESS", sortOrder: 3, targetType: "ASSET", targetId: "asset-rooftop" },
  { id: "task-orchid", projectId: "project-orchid", title: "Pilot cold open notes", description: "Send first-pass coverage notes to writer.", assignedToId: "user-dev", createdById: "user-producer", dueDate: "2026-06-24", priority: "URGENT", status: "TODO", sortOrder: 4, targetType: "DOCUMENT", targetId: "doc-orchid-script" }
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
