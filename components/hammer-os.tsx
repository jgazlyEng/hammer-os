"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, ArrowLeft, ArrowUpDown, CalendarClock, CheckCircle2, ChevronDown, ContactRound, Download, FileDiff, FileText, Gauge, GripVertical, ImagePlus, Loader2, MessageSquare, PackageCheck, Pencil, Plus, Search, Share2, ShieldCheck, Trash2, UploadCloud, UsersRound, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, Panel, SectionHeader } from "@/components/ui";
import {
  currentVersion,
  assignedProjectsForUser,
  HAMMER_DOCUMENT_PROJECT_OVERRIDES_STORAGE_KEY,
  HAMMER_ACTIVE_PROJECT_EVENT,
  HAMMER_ACTIVE_PROJECT_STORAGE_KEY,
  HAMMER_DEMO_USER_EVENT,
  HAMMER_DEMO_USER_STORAGE_KEY,
  HAMMER_LOCAL_CONTACTS_STORAGE_KEY,
  HAMMER_LOCAL_DOCUMENTS_EVENT,
  HAMMER_LOCAL_DOCUMENTS_STORAGE_KEY,
  HAMMER_LOCAL_PROJECTS_EVENT,
  HAMMER_LOCAL_PROJECTS_STORAGE_KEY,
  HAMMER_LOCAL_TASKS_EVENT,
  HAMMER_LOCAL_TASKS_STORAGE_KEY,
  HAMMER_LOCAL_TASK_UPDATES_STORAGE_KEY,
  HAMMER_LOCAL_CONTACT_RELATIONSHIPS_STORAGE_KEY,
  HAMMER_LOCAL_SCRIPT_COLLECTIONS_STORAGE_KEY,
  HAMMER_LOCAL_SCRIPT_COLLECTION_ITEMS_STORAGE_KEY,
  HAMMER_LOCAL_SLATE_COLLECTIONS_STORAGE_KEY,
  HAMMER_LOCAL_SLATE_COLLECTION_ITEMS_STORAGE_KEY,
  HAMMER_LOCAL_USER_STATES_EVENT,
  HAMMER_LOCAL_USER_STATES_STORAGE_KEY,
  HAMMER_LOCAL_VERSION_STATUS_STORAGE_KEY,
  HAMMER_LOCAL_VERSIONS_STORAGE_KEY,
  hammerApprovals,
  hammerAssetLinks,
  hammerAssets,
  hammerComments,
  hammerContactRelationships,
  hammerContacts,
  hammerDocuments,
  hammerEntities,
  hammerProjectStatuses,
  hammerProjects,
  hammerScenes,
  hammerScriptCollectionItems,
  hammerScriptCollections,
  hammerSlateCollectionItems,
  hammerSlateCollections,
  hammerScriptStatuses,
  hammerTasks,
  hammerUsers,
  hammerVersions,
  hammerUserByEmail,
  projectTitle,
  statusLabel,
  userName,
  type HammerTask,
  type HammerTaskSubtask,
  type TaskPriority,
  type TaskStatus,
  type HammerApproval,
  type HammerProjectStatus,
  type HammerProject,
  type HammerProjectLead,
  type HammerUser,
  type HammerAsset,
  type HammerDocument,
  type HammerDocumentTag,
  type HammerDocumentVersion,
  type HammerComment,
  type HammerCommentMetadata,
  type HammerNoteTag,
  type HammerNoteType,
  type HammerScriptCollection,
  type HammerScriptCollectionItem,
  type HammerSlateCollection,
  type HammerSlateCollectionItem,
  type SlateCollectionItemType,
  type AssetType,
  type AssetStatus,
  type DocumentType,
  type ScriptStatus,
  type ContactType,
  type ContactStatus,
  type HammerContact,
  type HammerContactRelationship,
  type ContactRelationshipType,
  type HammerOutreachEngagement,
  type OutreachEngagementType
} from "@/lib/hammer-data";
import { buildTextDiff } from "@/lib/hammer-diff";
import { extractPdfText } from "@/lib/pdf-parser";
import { parseScriptText } from "@/lib/script-parser";
import { cn } from "@/lib/utils";

const HAMMER_DISMISSED_BREAKDOWN_ENTITIES_STORAGE_KEY = "hammer:dismissed-breakdown-entities";
const HAMMER_SUPPORTING_DOCUMENTS_STORAGE_KEY = "hammer:supporting-documents";
const HAMMER_REFERENCE_IMAGES_STORAGE_KEY = "hammer:reference-images";
const HAMMER_PROSPECT_ASSETS_STORAGE_KEY = "hammer:prospect-assets";

type DownloadResourceType = "documentVersion" | "supportingDocument" | "prospectAsset" | "asset";
const HAMMER_LOCAL_VERSION_NOTES_STORAGE_KEY = "hammer:version-notes";
const HAMMER_LOCAL_VERSION_MARKDOWN_STORAGE_KEY = "hammer:version-markdown-notes";
const HAMMER_LOCAL_COMMENTS_STORAGE_KEY = "hammer:comments";
const HAMMER_LOCAL_OUTREACH_ENGAGEMENTS_STORAGE_KEY = "hammer:outreach-engagements";

type HammerView = "dashboard" | "projects" | "prospects" | "collections" | "notes" | "project-new" | "project-detail" | "project-documents" | "project-assets" | "scripts" | "script-detail" | "script-versions" | "script-diff" | "script-breakdown" | "assets" | "asset-detail" | "tasks" | "contacts" | "reviews" | "studio-status" | "reports" | "executive" | "admin-users" | "account";
type ScriptLibrarySection = "inbox" | "projects" | "all";
type AppRole = "admin" | "executive" | "producer" | "department_lead";

interface DocumentUploadResponse {
  document?: HammerDocument;
  version?: HammerDocumentVersion;
  uploadJob?: UploadJobSnapshot;
  warning?: string;
  extractionQueued?: boolean;
}

interface DocumentUploadErrorResponse {
  error?: string;
  detail?: string;
  stage?: string;
  hint?: string;
  requestId?: string;
}

const emptyProject: HammerProject = {
  id: "no-project",
  title: "No Development Slate Items Yet",
  logline: "",
  type: "Feature",
  genre: "",
  status: "IDEA",
  stage: "DEVELOPMENT",
  ownerId: "",
  updatedAt: ""
};

const emptyDocument: HammerDocument = {
  id: "no-document",
  title: "No Script Selected",
  type: "SCRIPT",
  currentVersionId: "",
  createdById: "",
  updatedAt: ""
};

const emptyAsset: HammerAsset = {
  id: "no-asset",
  projectId: "",
  title: "No Asset Selected",
  description: "",
  assetType: "OTHER",
  fileName: "",
  fileType: "",
  fileSize: 0,
  storagePath: "",
  status: "UPLOADED",
  uploadedById: ""
};

interface SessionUser {
  email: string;
  name: string;
  appRole?: string;
}

interface HammerWorkspacePayload {
  mode?: "database" | "demo";
  projects?: HammerProject[];
  documents?: HammerDocument[];
  versions?: HammerDocumentVersion[];
  comments?: HammerComment[];
  contactRelationships?: HammerContactRelationship[];
  outreachEngagements?: HammerOutreachEngagement[];
  scriptCollections?: HammerScriptCollection[];
  scriptCollectionItems?: HammerScriptCollectionItem[];
  slateCollections?: HammerSlateCollection[];
  slateCollectionItems?: HammerSlateCollectionItem[];
  prospectAssets?: ProspectAsset[];
  supportingDocuments?: SupportingDocument[];
  assets?: HammerAsset[];
  tasks?: HammerTask[];
  contacts?: HammerContact[];
  projectLeads?: HammerProjectLead[];
  users?: HammerUser[];
  approvals?: HammerApproval[];
}

interface HammerWorkspaceCacheEntry {
  userEmail: string;
  data: HammerWorkspacePayload;
  loadedAt: number;
}

const HAMMER_WORKSPACE_CACHE_TTL_MS = 60 * 1000;
let hammerWorkspaceCache: HammerWorkspaceCacheEntry | null = null;
let hammerWorkspaceRequest: Promise<HammerWorkspacePayload> | null = null;

function getCachedWorkspace(userEmail?: string | null) {
  if (!hammerWorkspaceCache || !userEmail) return null;
  if (hammerWorkspaceCache.userEmail.toLowerCase() !== userEmail.toLowerCase()) return null;
  return hammerWorkspaceCache;
}

function getFreshCachedWorkspace(userEmail?: string | null) {
  const cached = getCachedWorkspace(userEmail);
  if (!cached) return null;
  return Date.now() - cached.loadedAt < HAMMER_WORKSPACE_CACHE_TTL_MS ? cached : null;
}

async function fetchDatabaseWorkspace(userEmail?: string | null, options: { force?: boolean } = {}) {
  const cached = options.force ? null : getFreshCachedWorkspace(userEmail);
  if (cached) return cached.data;
  if (hammerWorkspaceRequest) return hammerWorkspaceRequest;

  hammerWorkspaceRequest = fetch("/api/hammer/workspace", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Workspace load failed.");
      const data = await response.json() as HammerWorkspacePayload;
      if (data.mode === "database" && userEmail) {
        hammerWorkspaceCache = { userEmail, data, loadedAt: Date.now() };
      }
      return data;
    })
    .finally(() => {
      hammerWorkspaceRequest = null;
    });

  return hammerWorkspaceRequest;
}

async function fetchDocumentVersionsWithText(documentId: string) {
  const response = await fetch(`/api/hammer/document-versions?documentId=${encodeURIComponent(documentId)}`, { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? "Could not load script text.");
  }
  const data = await response.json() as { versions?: HammerDocumentVersion[] };
  return data.versions ?? [];
}

function mergeHydratedVersions(baseVersions: HammerDocumentVersion[], hydratedVersions: HammerDocumentVersion[]) {
  if (!hydratedVersions.length) return baseVersions;
  const hydratedById = new Map(hydratedVersions.map((version) => [version.id, version]));
  return baseVersions.map((version) => {
    const hydrated = hydratedById.get(version.id);
    return hydrated ? { ...version, ...hydrated } : version;
  });
}

function useDocumentVersionsWithText(documentId: string, versions: HammerDocumentVersion[]) {
  const [hydratedVersions, setHydratedVersions] = useState<HammerDocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const versionTextKey = versions
    .filter((version) => version.documentId === documentId)
    .map((version) => `${version.id}:${Boolean(version.extractedText)}`)
    .join("|");

  useEffect(() => {
    if (!documentId || documentId === "no-document") {
      setHydratedVersions([]);
      setLoading(false);
      setMessage("");
      return;
    }

    const documentVersions = versions.filter((version) => version.documentId === documentId);
    const needsText = documentVersions.some((version) => !version.extractedText);
    if (!documentVersions.length || !needsText) {
      setHydratedVersions([]);
      setLoading(false);
      setMessage("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setMessage("");
    fetchDocumentVersionsWithText(documentId)
      .then((nextVersions) => {
        if (!cancelled) setHydratedVersions(nextVersions);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Could not load script text.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [documentId, versionTextKey, versions]);

  return {
    versionsWithText: mergeHydratedVersions(versions, hydratedVersions),
    loading,
    message
  };
}

interface ProjectDraft {
  title: string;
  logline: string;
  type: string;
  genre: string;
  status: HammerProjectStatus;
  stage: HammerProject["stage"];
  ownerId: string;
}

type SupportingDocumentType = "CONTEXT" | "COVERAGE" | "NOTES" | "EMAIL" | "WRITER_MATERIAL" | "OTHER";

interface SupportingDocument {
  id: string;
  scriptDocumentId: string;
  title: string;
  type: SupportingDocumentType;
  source?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  dataUrl?: string;
  uploadedAt: string;
  uploadedById: string;
  notes?: string;
  extractedText?: string;
}

interface ProjectReferenceImage {
  id: string;
  projectId: string;
  title: string;
  description: string;
  source?: string;
  category: AssetType;
  status: AssetStatus;
  fileName: string;
  imageUrl?: string;
  demoTone?: "steel" | "neon" | "forest" | "gold" | "ice";
  uploadedAt: string;
}

interface ProspectAsset {
  id: string;
  prospectId: string;
  title: string;
  description: string;
  source?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  dataUrl?: string;
  uploadedById: string;
  uploadedAt: string;
}

type TaskPatch = Partial<Pick<HammerTask, "projectId" | "title" | "description" | "assignedToId" | "dueDate" | "priority" | "status" | "targetType" | "targetId">>;
type TaskSubtaskPatch = Partial<Pick<HammerTaskSubtask, "title" | "completed">>;

function toSessionUser(user: HammerUser): SessionUser {
  return {
    email: user.email,
    name: user.name,
    appRole: user.role
  };
}

function sessionUserToHammerUser(user: SessionUser | null, mode: "demo" | "database"): HammerUser {
  if (!user) return mode === "demo" ? hammerUserByEmail(undefined) : productionFallbackUser();
  if (mode === "demo") return hammerUserByEmail(user.email);
  return {
    id: user.email,
    email: user.email,
    name: user.name || user.email,
    googleId: "",
    role: hammerRoleForSessionRole(user.appRole)
  };
}

function productionFallbackUser(): HammerUser {
  return {
    id: "loading-user",
    email: "",
    name: "Loading",
    googleId: "",
    role: "VIEWER"
  };
}

function hammerRoleForSessionRole(role?: string): HammerUser["role"] {
  const normalized = (role ?? "").toLowerCase();
  if (normalized === "admin" || normalized === "administrator") return "ADMIN";
  if (normalized === "executive" || normalized === "exec") return "EXECUTIVE";
  if (normalized === "producer") return "PRODUCER";
  if (normalized === "department_lead" || normalized === "development") return "DEVELOPMENT";
  if (normalized === "artist") return "ARTIST";
  if (normalized === "writer") return "WRITER";
  if (normalized === "contractor") return "CONTRACTOR";
  return "VIEWER";
}

export function HammerOS({ view, id, selectedTaskId, scriptSection }: { view: HammerView; id?: string; selectedTaskId?: string; scriptSection?: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState<HammerProject[]>([]);
  const [localProjects, setLocalProjects] = useState<HammerProject[]>([]);
  const [workspaceMode, setWorkspaceMode] = useState<"demo" | "database">("demo");
  const [workspaceUsers, setWorkspaceUsers] = useState<HammerUser[]>([]);
  const [workspaceAssets, setWorkspaceAssets] = useState<HammerAsset[]>([]);
  const [workspaceContacts, setWorkspaceContacts] = useState<HammerContact[]>([]);
  const [workspaceContactRelationships, setWorkspaceContactRelationships] = useState<HammerContactRelationship[]>([]);
  const [workspaceOutreachEngagements, setWorkspaceOutreachEngagements] = useState<HammerOutreachEngagement[]>([]);
  const [workspaceApprovals, setWorkspaceApprovals] = useState<HammerApproval[]>([]);
  const [workspaceComments, setWorkspaceComments] = useState<HammerComment[]>([]);
  const [workspaceScriptCollections, setWorkspaceScriptCollections] = useState<HammerScriptCollection[]>([]);
  const [workspaceScriptCollectionItems, setWorkspaceScriptCollectionItems] = useState<HammerScriptCollectionItem[]>([]);
  const [workspaceSlateCollections, setWorkspaceSlateCollections] = useState<HammerSlateCollection[]>([]);
  const [workspaceSlateCollectionItems, setWorkspaceSlateCollectionItems] = useState<HammerSlateCollectionItem[]>([]);
  const [workspaceProspectAssets, setWorkspaceProspectAssets] = useState<ProspectAsset[]>([]);
  const [projectLeads, setProjectLeads] = useState<HammerProjectLead[]>([]);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [, setWorkspaceSyncing] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [localDocuments, setLocalDocuments] = useState<HammerDocument[]>([]);
  const [localVersions, setLocalVersions] = useState<HammerDocumentVersion[]>([]);
  const [versionStatuses, setVersionStatuses] = useState<Record<string, ScriptStatus>>({});
  const [versionNotes, setVersionNotes] = useState<Record<string, string>>({});
  const [versionMarkdownNotes, setVersionMarkdownNotes] = useState<Record<string, string>>({});
  const [documentProjectOverrides, setDocumentProjectOverrides] = useState<Record<string, string | null>>({});
  const [supportingDocuments, setSupportingDocuments] = useState<SupportingDocument[]>([]);
  const [localReferenceImages, setLocalReferenceImages] = useState<ProjectReferenceImage[]>([]);
  const [localComments, setLocalComments] = useState<HammerComment[]>([]);
  const [localContactRelationships, setLocalContactRelationships] = useState<HammerContactRelationship[]>([]);
  const [localOutreachEngagements, setLocalOutreachEngagements] = useState<HammerOutreachEngagement[]>([]);
  const [localScriptCollections, setLocalScriptCollections] = useState<HammerScriptCollection[]>([]);
  const [localScriptCollectionItems, setLocalScriptCollectionItems] = useState<HammerScriptCollectionItem[]>([]);
  const [localSlateCollections, setLocalSlateCollections] = useState<HammerSlateCollection[]>([]);
  const [localSlateCollectionItems, setLocalSlateCollectionItems] = useState<HammerSlateCollectionItem[]>([]);
  const [localProspectAssets, setLocalProspectAssets] = useState<ProspectAsset[]>([]);
  const [localTasks, setLocalTasks] = useState<HammerTask[]>([]);
  const [taskUpdates, setTaskUpdates] = useState<Record<string, Partial<HammerTask>>>({});
  const documents = useMemo(() => (workspaceMode === "database" ? localDocuments : [...hammerDocuments, ...localDocuments]).filter(isValidDocument).map((document) => (
    Object.prototype.hasOwnProperty.call(documentProjectOverrides, document.id)
      ? { ...document, projectId: documentProjectOverrides[document.id] ?? undefined }
      : document
  )), [documentProjectOverrides, localDocuments, workspaceMode]);
  const versions = useMemo(() => (workspaceMode === "database" ? localVersions : [...hammerVersions, ...localVersions]).filter(isValidVersion).map((version) => ({ ...version, ...(versionStatuses[version.id] ? { status: versionStatuses[version.id] } : {}), ...(Object.prototype.hasOwnProperty.call(versionNotes, version.id) ? { notes: versionNotes[version.id] } : {}), ...(Object.prototype.hasOwnProperty.call(versionMarkdownNotes, version.id) ? { markdownNotes: versionMarkdownNotes[version.id] } : {}) })), [localVersions, versionMarkdownNotes, versionNotes, versionStatuses, workspaceMode]);
  const tasks = useMemo(() => (workspaceMode === "database" ? localTasks : [...localTasks, ...hammerTasks]).filter(isValidTask).map((task) => ({ ...task, ...taskUpdates[task.id] })), [localTasks, taskUpdates, workspaceMode]);
  const users = useMemo(() => (workspaceMode === "database" ? workspaceUsers : hammerUsers).filter(isValidUser), [workspaceMode, workspaceUsers]);
  const assets = useMemo(() => (workspaceMode === "database" ? workspaceAssets : hammerAssets).filter(isValidAsset), [workspaceAssets, workspaceMode]);
  const contacts = useMemo(() => workspaceMode === "database" ? workspaceContacts : hammerContacts, [workspaceContacts, workspaceMode]);
  const contactRelationships = useMemo(() => workspaceMode === "database" ? workspaceContactRelationships : [...hammerContactRelationships, ...localContactRelationships], [localContactRelationships, workspaceContactRelationships, workspaceMode]);
  const outreachEngagements = useMemo(() => workspaceMode === "database" ? workspaceOutreachEngagements : localOutreachEngagements, [localOutreachEngagements, workspaceMode, workspaceOutreachEngagements]);
  const approvals = useMemo(() => workspaceMode === "database" ? workspaceApprovals : hammerApprovals, [workspaceApprovals, workspaceMode]);
  const comments = useMemo(() => workspaceMode === "database" ? workspaceComments : [...hammerComments, ...localComments], [localComments, workspaceComments, workspaceMode]);
  const scriptCollections = useMemo(() => workspaceMode === "database" ? workspaceScriptCollections : [...hammerScriptCollections, ...localScriptCollections], [localScriptCollections, workspaceMode, workspaceScriptCollections]);
  const scriptCollectionItems = useMemo(() => workspaceMode === "database" ? workspaceScriptCollectionItems : [...hammerScriptCollectionItems, ...localScriptCollectionItems], [localScriptCollectionItems, workspaceMode, workspaceScriptCollectionItems]);
  const slateCollections = useMemo(() => workspaceMode === "database" ? workspaceSlateCollections : [...hammerSlateCollections, ...localSlateCollections], [localSlateCollections, workspaceMode, workspaceSlateCollections]);
  const slateCollectionItems = useMemo(() => workspaceMode === "database" ? workspaceSlateCollectionItems : [...hammerSlateCollectionItems, ...localSlateCollectionItems], [localSlateCollectionItems, workspaceMode, workspaceSlateCollectionItems]);
  const prospectAssets = useMemo(() => workspaceMode === "database" ? workspaceProspectAssets : localProspectAssets, [localProspectAssets, workspaceMode, workspaceProspectAssets]);
  const sessionUserEmail = sessionUser?.email?.toLowerCase();
  const project = useMemo(() => projects.find((item) => item.id === id) ?? projects[0] ?? emptyProject, [id, projects]);
  const document = useMemo(() => documents.find((item) => item.id === id) ?? documents[0] ?? emptyDocument, [documents, id]);
  const asset = useMemo(() => assets.find((item) => item.id === id) ?? assets[0] ?? emptyAsset, [assets, id]);
  const activeProject = useMemo(() => projects.find((item) => item.id === activeProjectId) ?? projects[0] ?? emptyProject, [activeProjectId, projects]);
  const currentUser = useMemo(() => users.find((user) => user.email.toLowerCase() === sessionUserEmail) ?? sessionUserToHammerUser(sessionUser, workspaceMode), [sessionUser, sessionUserEmail, users, workspaceMode]);

  function applyDatabaseWorkspace(data: HammerWorkspacePayload) {
    if (data.mode !== "database") return;
    setWorkspaceMode("database");
    setProjects((data.projects ?? []).filter(isValidProject));
    setLocalProjects([]);
    setLocalDocuments(data.documents ?? []);
    setLocalVersions(data.versions ?? []);
    setSupportingDocuments(data.supportingDocuments ?? []);
    setWorkspaceAssets(data.assets ?? []);
    setLocalReferenceImages([]);
    setLocalTasks(data.tasks ?? []);
    setWorkspaceContacts(data.contacts ?? []);
    setWorkspaceContactRelationships(data.contactRelationships ?? []);
    setWorkspaceOutreachEngagements(data.outreachEngagements ?? []);
    setProjectLeads(data.projectLeads ?? []);
    setWorkspaceUsers(data.users ?? []);
    setWorkspaceApprovals(data.approvals ?? []);
    setWorkspaceComments(data.comments ?? []);
    setWorkspaceScriptCollections(data.scriptCollections ?? []);
    setWorkspaceScriptCollectionItems(data.scriptCollectionItems ?? []);
    setWorkspaceSlateCollections(data.slateCollections ?? []);
    setWorkspaceSlateCollectionItems(data.slateCollectionItems ?? []);
    setWorkspaceProspectAssets(data.prospectAssets ?? []);
    setVersionStatuses({});
    setVersionMarkdownNotes({});
    setDocumentProjectOverrides({});
    setTaskUpdates({});
  }

  function applyDemoWorkspace() {
    setWorkspaceMode("demo");
    setProjects(hammerProjects);
    setWorkspaceUsers([]);
    setWorkspaceAssets([]);
    setWorkspaceContacts([]);
    setWorkspaceContactRelationships([]);
    setWorkspaceOutreachEngagements([]);
    setWorkspaceApprovals([]);
    setWorkspaceComments([]);
    setWorkspaceScriptCollections([]);
    setWorkspaceScriptCollectionItems([]);
    setWorkspaceSlateCollections([]);
    setWorkspaceSlateCollectionItems([]);
    setWorkspaceProspectAssets([]);
    setActiveProjectId((current) => current || hammerProjects[0]?.id || "");
  }

  async function loadDatabaseWorkspace(options: { force?: boolean; userEmail?: string | null } = {}) {
    setWorkspaceSyncing(true);
    try {
      const data = await fetchDatabaseWorkspace(options.userEmail ?? sessionUser?.email, { force: options.force });
      applyDatabaseWorkspace(data);
    } finally {
      setWorkspaceSyncing(false);
    }
  }

  async function runWorkspaceAction(action: string, payload: Record<string, unknown>) {
    if (workspaceMode !== "database") return null;
    const response = await fetch("/api/hammer/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string; detail?: string } | null;
      throw new Error(data?.detail ? `${data.error ?? "Database update failed."}: ${data.detail}` : data?.error ?? "Database update failed.");
    }
    const data = await response.json();
    await loadDatabaseWorkspace({ force: true });
    return data;
  }

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await response.json();
        const mode = data.mode === "database" ? "database" : "demo";
        if (mode === "database") {
          setWorkspaceMode("database");
        } else {
          applyDemoWorkspace();
        }
        const storedDemoEmail = data.mode === "database" ? null : window.localStorage.getItem(HAMMER_DEMO_USER_STORAGE_KEY);
        const storedDemoUser = hammerUsers.find((item) => item.email === storedDemoEmail);
        const nextSessionUser = storedDemoUser ? toSessionUser(storedDemoUser) : data.user ?? data.demoUser ?? null;
        setSessionUser(nextSessionUser);
        if (mode === "database") {
          const cachedWorkspace = getCachedWorkspace(nextSessionUser?.email);
          if (cachedWorkspace) {
            applyDatabaseWorkspace(cachedWorkspace.data);
            setWorkspaceLoaded(true);
            setWorkspaceSyncing(true);
            void fetchDatabaseWorkspace(nextSessionUser?.email, { force: true }).then(applyDatabaseWorkspace).catch(() => null).finally(() => setWorkspaceSyncing(false));
          } else {
            setWorkspaceSyncing(true);
            try {
              applyDatabaseWorkspace(await fetchDatabaseWorkspace(nextSessionUser?.email));
            } finally {
              setWorkspaceSyncing(false);
            }
          }
        }
        setWorkspaceLoaded(true);
      } catch {
        applyDemoWorkspace();
        setSessionUser(toSessionUser(hammerUsers[0]));
        setWorkspaceLoaded(true);
      } finally {
        setSessionLoaded(true);
      }
    }

    loadSession();
  }, []);

  useEffect(() => {
    if (workspaceMode === "database" || projectLeads.length) return;
    let cancelled = false;
    async function loadDemoProjectLeads() {
      try {
        const response = await fetch("/data/projects-everything.csv", { cache: "force-cache" });
        if (!response.ok) return;
        const text = await response.text();
        if (!cancelled) setProjectLeads(parseProjectLeadCsv(text));
      } catch {
        if (!cancelled) setProjectLeads([]);
      }
    }
    loadDemoProjectLeads();
    return () => {
      cancelled = true;
    };
  }, [projectLeads.length, workspaceMode]);

  useEffect(() => {
    if (!sessionLoaded || workspaceMode === "database") return;
    try {
      const storedProjects = window.localStorage.getItem(HAMMER_LOCAL_PROJECTS_STORAGE_KEY);
      if (!storedProjects) return;
      const parsedProjects = JSON.parse(storedProjects) as HammerProject[];
      setLocalProjects(parsedProjects);
      setProjects([...parsedProjects, ...hammerProjects.filter((project) => !parsedProjects.some((item) => item.id === project.id))]);
    } catch {
      setLocalProjects([]);
    }
  }, [sessionLoaded, workspaceMode]);

  useEffect(() => {
    if (!sessionLoaded || workspaceMode === "database") return;
    try {
      const storedDocuments = window.localStorage.getItem(HAMMER_LOCAL_DOCUMENTS_STORAGE_KEY);
      const storedVersions = window.localStorage.getItem(HAMMER_LOCAL_VERSIONS_STORAGE_KEY);
      const storedStatuses = window.localStorage.getItem(HAMMER_LOCAL_VERSION_STATUS_STORAGE_KEY);
      const storedVersionNotes = window.localStorage.getItem(HAMMER_LOCAL_VERSION_NOTES_STORAGE_KEY);
      const storedVersionMarkdownNotes = window.localStorage.getItem(HAMMER_LOCAL_VERSION_MARKDOWN_STORAGE_KEY);
      const storedProjectOverrides = window.localStorage.getItem(HAMMER_DOCUMENT_PROJECT_OVERRIDES_STORAGE_KEY);
      const storedSupportingDocuments = window.localStorage.getItem(HAMMER_SUPPORTING_DOCUMENTS_STORAGE_KEY);
      const storedReferenceImages = window.localStorage.getItem(HAMMER_REFERENCE_IMAGES_STORAGE_KEY);
      const storedComments = window.localStorage.getItem(HAMMER_LOCAL_COMMENTS_STORAGE_KEY);
      const storedContactRelationships = window.localStorage.getItem(HAMMER_LOCAL_CONTACT_RELATIONSHIPS_STORAGE_KEY);
      const storedOutreachEngagements = window.localStorage.getItem(HAMMER_LOCAL_OUTREACH_ENGAGEMENTS_STORAGE_KEY);
      const storedScriptCollections = window.localStorage.getItem(HAMMER_LOCAL_SCRIPT_COLLECTIONS_STORAGE_KEY);
      const storedScriptCollectionItems = window.localStorage.getItem(HAMMER_LOCAL_SCRIPT_COLLECTION_ITEMS_STORAGE_KEY);
      const storedSlateCollections = window.localStorage.getItem(HAMMER_LOCAL_SLATE_COLLECTIONS_STORAGE_KEY);
      const storedSlateCollectionItems = window.localStorage.getItem(HAMMER_LOCAL_SLATE_COLLECTION_ITEMS_STORAGE_KEY);
      const storedProspectAssets = window.localStorage.getItem(HAMMER_PROSPECT_ASSETS_STORAGE_KEY);
      const storedTasks = window.localStorage.getItem(HAMMER_LOCAL_TASKS_STORAGE_KEY);
      const storedTaskUpdates = window.localStorage.getItem(HAMMER_LOCAL_TASK_UPDATES_STORAGE_KEY);
      if (storedDocuments) setLocalDocuments(JSON.parse(storedDocuments) as HammerDocument[]);
      if (storedVersions) setLocalVersions(JSON.parse(storedVersions) as HammerDocumentVersion[]);
      if (storedStatuses) setVersionStatuses(JSON.parse(storedStatuses) as Record<string, ScriptStatus>);
      if (storedVersionNotes) setVersionNotes(JSON.parse(storedVersionNotes) as Record<string, string>);
      if (storedVersionMarkdownNotes) setVersionMarkdownNotes(JSON.parse(storedVersionMarkdownNotes) as Record<string, string>);
      if (storedProjectOverrides) setDocumentProjectOverrides(JSON.parse(storedProjectOverrides) as Record<string, string | null>);
      if (storedSupportingDocuments) setSupportingDocuments(JSON.parse(storedSupportingDocuments) as SupportingDocument[]);
      if (storedReferenceImages) setLocalReferenceImages(JSON.parse(storedReferenceImages) as ProjectReferenceImage[]);
      if (storedComments) setLocalComments(JSON.parse(storedComments) as HammerComment[]);
      if (storedContactRelationships) setLocalContactRelationships(JSON.parse(storedContactRelationships) as HammerContactRelationship[]);
      if (storedOutreachEngagements) setLocalOutreachEngagements(JSON.parse(storedOutreachEngagements) as HammerOutreachEngagement[]);
      if (storedScriptCollections) setLocalScriptCollections(JSON.parse(storedScriptCollections) as HammerScriptCollection[]);
      if (storedScriptCollectionItems) setLocalScriptCollectionItems(JSON.parse(storedScriptCollectionItems) as HammerScriptCollectionItem[]);
      if (storedSlateCollections) setLocalSlateCollections(JSON.parse(storedSlateCollections) as HammerSlateCollection[]);
      if (storedSlateCollectionItems) setLocalSlateCollectionItems(JSON.parse(storedSlateCollectionItems) as HammerSlateCollectionItem[]);
      if (storedProspectAssets) setLocalProspectAssets(JSON.parse(storedProspectAssets) as ProspectAsset[]);
      if (storedTasks) setLocalTasks(JSON.parse(storedTasks) as HammerTask[]);
      if (storedTaskUpdates) setTaskUpdates(JSON.parse(storedTaskUpdates) as Record<string, Partial<HammerTask>>);
    } catch {
      setLocalDocuments([]);
      setLocalVersions([]);
      setVersionNotes({});
      setVersionMarkdownNotes({});
      setDocumentProjectOverrides({});
      setSupportingDocuments([]);
      setLocalReferenceImages([]);
      setLocalComments([]);
      setLocalContactRelationships([]);
      setLocalOutreachEngagements([]);
      setLocalScriptCollections([]);
      setLocalScriptCollectionItems([]);
      setLocalSlateCollections([]);
      setLocalSlateCollectionItems([]);
      setLocalProspectAssets([]);
      setLocalTasks([]);
      setTaskUpdates({});
    }
  }, [sessionLoaded, workspaceMode]);

  useEffect(() => {
    function handleDemoUserChange(event: Event) {
      const email = (event as CustomEvent<{ email?: string }>).detail?.email;
      const demoUser = hammerUsers.find((item) => item.email === email);
      if (demoUser) {
        setSessionUser(toSessionUser(demoUser));
        setSessionLoaded(true);
      }
    }

    window.addEventListener(HAMMER_DEMO_USER_EVENT, handleDemoUserChange);
    return () => window.removeEventListener(HAMMER_DEMO_USER_EVENT, handleDemoUserChange);
  }, []);

  useEffect(() => {
    function applyStoredProject(projectId?: string | null) {
      if (projectId && projects.some((project) => project.id === projectId)) {
        setActiveProjectId(projectId);
      }
    }

    applyStoredProject(window.localStorage.getItem(HAMMER_ACTIVE_PROJECT_STORAGE_KEY));

    function handleActiveProjectChange(event: Event) {
      const projectId = (event as CustomEvent<{ projectId?: string }>).detail?.projectId;
      applyStoredProject(projectId);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === HAMMER_ACTIVE_PROJECT_STORAGE_KEY) {
        applyStoredProject(event.newValue);
      }
    }

    window.addEventListener(HAMMER_ACTIVE_PROJECT_EVENT, handleActiveProjectChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(HAMMER_ACTIVE_PROJECT_EVENT, handleActiveProjectChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [projects]);

  async function addProject(draft?: Partial<ProjectDraft>) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("createProject", draft as Record<string, unknown> ?? {});
      return;
    }
    const next: HammerProject = {
      id: `project-${Date.now()}`,
      title: draft?.title?.trim() || "Untitled Studio Project",
      logline: draft?.logline?.trim() || "New internal development project.",
      type: draft?.type?.trim() || "Feature",
      genre: draft?.genre?.trim() || "Drama",
      status: draft?.status ?? "IDEA",
      stage: draft?.stage ?? "DEVELOPMENT",
      ownerId: draft?.ownerId || currentUser.id,
      updatedAt: new Date().toISOString().slice(0, 10)
    };
    const nextLocalProjects = [next, ...localProjects];
    setLocalProjects(nextLocalProjects);
    setProjects([next, ...projects]);
    window.localStorage.setItem(HAMMER_LOCAL_PROJECTS_STORAGE_KEY, JSON.stringify(nextLocalProjects));
    window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_PROJECTS_EVENT));
  }

  async function updateProject(projectId: string, patch: Partial<HammerProject>) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateProject", { projectId, ...patch });
      return;
    }
    setProjects((current) => current.map((project) => project.id === projectId ? { ...project, ...patch, updatedAt: new Date().toISOString().slice(0, 10) } : project));
    setLocalProjects((current) => {
      const existingLocal = current.some((project) => project.id === projectId);
      const sourceProject = projects.find((project) => project.id === projectId);
      const next = existingLocal
        ? current.map((project) => project.id === projectId ? { ...project, ...patch, updatedAt: new Date().toISOString().slice(0, 10) } : project)
        : sourceProject ? [{ ...sourceProject, ...patch, updatedAt: new Date().toISOString().slice(0, 10) }, ...current] : current;
      window.localStorage.setItem(HAMMER_LOCAL_PROJECTS_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_PROJECTS_EVENT));
      return next;
    });
  }

  async function updateProjectLead(leadId: string, patch: Partial<HammerProjectLead>) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateProjectLead", { leadId, ...patch });
      return;
    }
    setProjectLeads((current) => current.map((lead) => lead.id === leadId ? { ...lead, ...patch } : lead));
  }

  async function createProjectLead(input: Partial<HammerProjectLead>) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("createProjectLead", input as Record<string, unknown>);
      return;
    }
    const nextLead: HammerProjectLead = {
      id: `lead-local-${Date.now()}`,
      title: input.title || "Untitled Slate Item",
      ...input
    };
    setProjectLeads((current) => [nextLead, ...current]);
  }

  async function importProjectLeads(leads: HammerProjectLead[]) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("importProjectLeads", { leads });
      return;
    }
    setProjectLeads((current) => {
      const existing = new Set(current.map((lead) => lead.id));
      const fresh = leads.filter((lead) => !existing.has(lead.id));
      return [...fresh, ...current];
    });
  }

  async function promoteProjectLead(leadId: string) {
    const lead = projectLeads.find((item) => item.id === leadId);
    if (!lead) return;
    if (workspaceMode === "database") {
      await runWorkspaceAction("promoteProjectLead", { leadId });
      return;
    }
    const promotedProject: HammerProject = {
      id: `project-promoted-${Date.now()}`,
      title: lead.title,
      logline: lead.logline || "Promoted from development slate.",
      type: lead.format || lead.adaptationFormat || "Feature",
      genre: lead.genre || "Unassigned",
      status: "IDEA",
      stage: "DEVELOPMENT",
      ownerId: currentUser.id,
      updatedAt: new Date().toISOString().slice(0, 10)
    };
    const nextLocalProjects = [promotedProject, ...localProjects];
    setLocalProjects(nextLocalProjects);
    setProjects([promotedProject, ...projects]);
      setProjectLeads((current) => current.map((item) => item.id === leadId ? { ...item, promotedProjectId: promotedProject.id, nextActionStatus: "Promoted to Development Slate" } : item));
    window.localStorage.setItem(HAMMER_LOCAL_PROJECTS_STORAGE_KEY, JSON.stringify(nextLocalProjects));
    window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_PROJECTS_EVENT));
  }

  async function uploadDocumentVersion(input: {
    projectId?: string;
    documentId?: string;
    title: string;
    type: DocumentType;
    writerName: string;
    source: string;
    file: File;
    notes: string;
  }) {
    if (!isAllowedScriptUploadFile(input.file)) {
      throw new Error("DOCX script parsing is disabled for now. Upload PDF, FDX, TXT, or MD instead.");
    }
    if (workspaceMode === "database") {
      const formData = new FormData();
      if (input.projectId) formData.append("projectId", input.projectId);
      if (input.documentId) formData.append("documentId", input.documentId);
      formData.append("title", input.title);
      formData.append("type", input.type);
      formData.append("writerName", input.writerName);
      formData.append("source", input.source);
      formData.append("notes", input.notes);
      formData.append("file", input.file);
      const response = await fetch("/api/hammer/document-upload", {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        if (response.status === 413) {
          throw new Error("Upload is larger than the production server allows. Increase the Nginx client_max_body_size setting to 250M, then try again.");
        }
        const data = await readUploadErrorResponse(response);
        throw new Error(formatUploadError(data, response.status));
      }
      const data = await response.json().catch(() => null) as DocumentUploadResponse | null;
      if (data?.document) {
        setLocalDocuments((current) => [data.document!, ...current.filter((document) => document.id !== data.document!.id)]);
      }
      if (data?.version) {
        setLocalVersions((current) => [data.version!, ...current.filter((version) => version.id !== data.version!.id)]);
      }
      hammerWorkspaceCache = null;
      try {
        await loadDatabaseWorkspace({ force: true });
      } catch (error) {
        const refreshWarning = `Upload saved, but the workspace list could not refresh automatically. Reload the page if the new document is not visible. Details: ${error instanceof Error ? error.message : "Unknown refresh error."}`;
        return { document: data?.document, version: data?.version, uploadJob: data?.uploadJob, warning: data?.warning ? `${data.warning} ${refreshWarning}` : refreshWarning, extractionQueued: data?.extractionQueued };
      }
      return { document: data?.document, version: data?.version, uploadJob: data?.uploadJob, warning: data?.warning, extractionQueued: data?.extractionQueued };
    }
    let extractedText = "";
    let extractionWarning: string | undefined;
    try {
      extractedText = await extractTextFromUpload(input.file);
    } catch (error) {
      extractionWarning = `Uploaded successfully, but no readable script text could be extracted. This file may be image-only or scanned; OCR may be needed before breakdown or diff can run. Details: ${error instanceof Error ? error.message : "Unknown extraction error."}`;
    }
    const dataUrl = await fileToDataUrl(input.file);
    const existingDocument = input.documentId ? documents.find((item) => item.id === input.documentId) : undefined;
    const documentId = existingDocument?.id ?? `doc-local-${Date.now()}`;
    const existingVersions = versions.filter((version) => version.documentId === documentId);
    const nextVersionNumber = existingVersions.length ? Math.max(...existingVersions.map((version) => version.versionNumber)) + 1 : 1;
    const versionId = `ver-local-${Date.now()}`;
    const now = new Date().toISOString().slice(0, 10);
    const nextVersion: HammerDocumentVersion = {
      id: versionId,
      documentId,
      versionNumber: nextVersionNumber,
      status: "DRAFT",
      fileName: input.file.name,
      fileType: input.file.type || inferFileType(input.file.name),
      fileSize: input.file.size,
      storagePath: `local://${input.projectId ?? "inbox"}/documents/${documentId}/versions/${versionId}/${input.file.name}`,
      dataUrl,
      uploadedById: currentUser.id,
      createdAt: now,
      notes: combineVersionNotes(input.notes || `Uploaded ${input.file.name}.`, extractionWarning),
      extractedText
    };
    const nextDocuments = existingDocument
      ? localDocuments.map((doc) => doc.id === existingDocument.id ? { ...doc, title: input.title, type: input.type, writerName: input.writerName, source: input.source || doc.source, currentVersionId: versionId, updatedAt: now } : doc)
      : [
          ...localDocuments,
          {
            id: documentId,
            projectId: input.projectId,
            title: input.title,
            type: input.type,
            currentVersionId: versionId,
            createdById: currentUser.id,
            writerName: input.writerName,
            source: input.source || undefined,
            updatedAt: now
          }
        ];
    const nextVersions = [...localVersions, nextVersion];

    setLocalDocuments(nextDocuments);
    setLocalVersions(nextVersions);
    window.localStorage.setItem(HAMMER_LOCAL_DOCUMENTS_STORAGE_KEY, JSON.stringify(nextDocuments));
    window.localStorage.setItem(HAMMER_LOCAL_VERSIONS_STORAGE_KEY, JSON.stringify(nextVersions));
    window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_DOCUMENTS_EVENT));
    return { warning: extractionWarning };
  }

  async function updateDocumentStatus(versionId: string, status: ScriptStatus) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateDocumentStatus", { versionId, status });
      return;
    }
    setVersionStatuses((current) => {
      const next = { ...current, [versionId]: status };
      window.localStorage.setItem(HAMMER_LOCAL_VERSION_STATUS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function updateDocumentVersionNotes(versionId: string, notes: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateDocumentVersionNotes", { versionId, notes });
      return;
    }
    setVersionNotes((current) => {
      const next = { ...current, [versionId]: notes };
      window.localStorage.setItem(HAMMER_LOCAL_VERSION_NOTES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function updateDocumentVersionMarkdown(versionId: string, markdownNotes: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateDocumentVersionMarkdown", { versionId, markdownNotes });
      return;
    }
    setVersionMarkdownNotes((current) => {
      const next = { ...current, [versionId]: markdownNotes };
      window.localStorage.setItem(HAMMER_LOCAL_VERSION_MARKDOWN_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function createComment(input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("createComment", input);
      return;
    }
    const nextComment: HammerComment = {
      id: `comment-local-${Date.now()}`,
      targetType: input.targetType,
      targetId: input.targetId,
      body: input.body,
      metadataJson: input.metadataJson,
      visibility: input.visibility ?? "PROJECT_TEAM",
      status: "OPEN",
      createdById: currentUser.id,
      createdAt: new Date().toISOString()
    };
    setLocalComments((current) => {
      const next = [nextComment, ...current];
      window.localStorage.setItem(HAMMER_LOCAL_COMMENTS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function updateComment(commentId: string, input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateComment", { commentId, ...input });
      return;
    }
    setLocalComments((current) => {
      const next = current.map((comment) => comment.id === commentId ? {
        ...comment,
        targetType: input.targetType,
        targetId: input.targetId,
        body: input.body,
        metadataJson: input.metadataJson,
        visibility: input.visibility ?? comment.visibility
      } : comment);
      window.localStorage.setItem(HAMMER_LOCAL_COMMENTS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function deleteComment(commentId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("deleteComment", { commentId });
      return;
    }
    setLocalComments((current) => {
      const next = current.filter((comment) => comment.id !== commentId);
      window.localStorage.setItem(HAMMER_LOCAL_COMMENTS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function createScriptCollection(input: { name: string; description?: string; visibility?: HammerScriptCollection["visibility"] }) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("createScriptCollection", input);
      return;
    }
    const now = new Date().toISOString().slice(0, 10);
    const nextCollection: HammerScriptCollection = {
      id: `collection-local-${Date.now()}`,
      name: input.name.trim() || "Untitled Collection",
      description: input.description?.trim() || undefined,
      ownerId: currentUser.id,
      status: "ACTIVE",
      visibility: input.visibility ?? "PROJECT_TEAM",
      createdAt: now,
      updatedAt: now
    };
    setLocalScriptCollections((current) => {
      const next = [nextCollection, ...current];
      window.localStorage.setItem(HAMMER_LOCAL_SCRIPT_COLLECTIONS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function addDocumentToCollection(collectionId: string, documentId: string, notes?: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("addDocumentToCollection", { collectionId, documentId, notes });
      return;
    }
    if (scriptCollectionItems.some((item) => item.collectionId === collectionId && item.documentId === documentId)) return;
    const nextItem: HammerScriptCollectionItem = {
      id: `collection-item-local-${Date.now()}`,
      collectionId,
      documentId,
      sortOrder: scriptCollectionItems.filter((item) => item.collectionId === collectionId).length + 1,
      notes: notes?.trim() || undefined,
      addedAt: new Date().toISOString().slice(0, 10)
    };
    setLocalScriptCollectionItems((current) => {
      const next = [nextItem, ...current];
      window.localStorage.setItem(HAMMER_LOCAL_SCRIPT_COLLECTION_ITEMS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function removeDocumentFromCollection(collectionItemId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("removeDocumentFromCollection", { collectionItemId });
      return;
    }
    setLocalScriptCollectionItems((current) => {
      const next = current.filter((item) => item.id !== collectionItemId);
      window.localStorage.setItem(HAMMER_LOCAL_SCRIPT_COLLECTION_ITEMS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function reorderScriptCollectionItems(collectionId: string, collectionItemIds: string[]) {
    if (!collectionItemIds.length) return;
    if (workspaceMode === "database") {
      await runWorkspaceAction("reorderScriptCollectionItems", { collectionItemIds });
      return;
    }
    setLocalScriptCollectionItems((current) => {
      const orderById = new Map(collectionItemIds.map((itemId, index) => [itemId, index + 1]));
      const next = current.map((item) => item.collectionId === collectionId && orderById.has(item.id) ? { ...item, sortOrder: orderById.get(item.id)! } : item);
      window.localStorage.setItem(HAMMER_LOCAL_SCRIPT_COLLECTION_ITEMS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function archiveScriptCollection(collectionId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("archiveScriptCollection", { collectionId });
      return;
    }
    setLocalScriptCollections((current) => {
      const next = current.map((collection) => collection.id === collectionId ? { ...collection, status: "ARCHIVED", updatedAt: new Date().toISOString().slice(0, 10) } : collection);
      window.localStorage.setItem(HAMMER_LOCAL_SCRIPT_COLLECTIONS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function deleteScriptCollection(collectionId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("deleteScriptCollection", { collectionId });
      return;
    }
    setLocalScriptCollections((current) => {
      const next = current.filter((collection) => collection.id !== collectionId);
      window.localStorage.setItem(HAMMER_LOCAL_SCRIPT_COLLECTIONS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setLocalScriptCollectionItems((current) => {
      const next = current.filter((item) => item.collectionId !== collectionId);
      window.localStorage.setItem(HAMMER_LOCAL_SCRIPT_COLLECTION_ITEMS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function createSlateCollection(input: { name: string; description?: string; visibility?: HammerSlateCollection["visibility"] }) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("createSlateCollection", input);
      return;
    }
    const now = new Date().toISOString().slice(0, 10);
    const nextCollection: HammerSlateCollection = {
      id: `slate-collection-local-${Date.now()}`,
      name: input.name.trim() || "Untitled Collection",
      description: input.description?.trim() || undefined,
      ownerId: currentUser.id,
      status: "ACTIVE",
      visibility: input.visibility ?? "PROJECT_TEAM",
      createdAt: now,
      updatedAt: now
    };
    setLocalSlateCollections((current) => {
      const next = [nextCollection, ...current];
      window.localStorage.setItem(HAMMER_LOCAL_SLATE_COLLECTIONS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function addSlateItemToCollection(collectionId: string, itemType: SlateCollectionItemType, itemId: string, notes?: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("addSlateItemToCollection", { collectionId, itemType, itemId, notes });
      return;
    }
    setLocalSlateCollectionItems((current) => {
      const mergedItems = [...hammerSlateCollectionItems, ...current];
      const exists = mergedItems.some((item) => item.collectionId === collectionId && item.itemType === itemType && (itemType === "PROJECT" ? item.projectId === itemId : item.prospectId === itemId));
      if (exists) return current;
      const nextItem: HammerSlateCollectionItem = {
        id: `slate-collection-item-local-${Date.now()}-${itemId}`,
        collectionId,
        itemType,
        projectId: itemType === "PROJECT" ? itemId : undefined,
        prospectId: itemType === "PROSPECT" ? itemId : undefined,
        sortOrder: mergedItems.filter((item) => item.collectionId === collectionId).length + 1,
        notes: notes?.trim() || undefined,
        addedAt: new Date().toISOString().slice(0, 10)
      };
      const next = [nextItem, ...current];
      window.localStorage.setItem(HAMMER_LOCAL_SLATE_COLLECTION_ITEMS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function removeSlateItemFromCollection(collectionItemId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("removeSlateItemFromCollection", { collectionItemId });
      return;
    }
    setLocalSlateCollectionItems((current) => {
      const next = current.filter((item) => item.id !== collectionItemId);
      window.localStorage.setItem(HAMMER_LOCAL_SLATE_COLLECTION_ITEMS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function reorderSlateCollectionItems(collectionId: string, collectionItemIds: string[]) {
    if (!collectionItemIds.length) return;
    if (workspaceMode === "database") {
      await runWorkspaceAction("reorderSlateCollectionItems", { collectionItemIds });
      return;
    }
    setLocalSlateCollectionItems((current) => {
      const orderById = new Map(collectionItemIds.map((itemId, index) => [itemId, index + 1]));
      const next = current.map((item) => item.collectionId === collectionId && orderById.has(item.id) ? { ...item, sortOrder: orderById.get(item.id)! } : item);
      window.localStorage.setItem(HAMMER_LOCAL_SLATE_COLLECTION_ITEMS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function archiveSlateCollection(collectionId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("archiveSlateCollection", { collectionId });
      return;
    }
    setLocalSlateCollections((current) => {
      const next = current.map((collection) => collection.id === collectionId ? { ...collection, status: "ARCHIVED", updatedAt: new Date().toISOString().slice(0, 10) } : collection);
      window.localStorage.setItem(HAMMER_LOCAL_SLATE_COLLECTIONS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function deleteSlateCollection(collectionId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("deleteSlateCollection", { collectionId });
      return;
    }
    setLocalSlateCollections((current) => {
      const next = current.filter((collection) => collection.id !== collectionId);
      window.localStorage.setItem(HAMMER_LOCAL_SLATE_COLLECTIONS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setLocalSlateCollectionItems((current) => {
      const next = current.filter((item) => item.collectionId !== collectionId);
      window.localStorage.setItem(HAMMER_LOCAL_SLATE_COLLECTION_ITEMS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function uploadSupportingDocument(input: {
    scriptDocumentId: string;
    title: string;
    type: SupportingDocumentType;
    source: string;
    notes: string;
    file: File;
  }) {
    const extractedText = await extractTextFromUpload(input.file);
    const dataUrl = await fileToDataUrl(input.file);
    const scriptDocument = documents.find((document) => document.id === input.scriptDocumentId);
    if (workspaceMode === "database") {
      await runWorkspaceAction("uploadSupportingDocument", {
        scriptDocumentId: input.scriptDocumentId,
        projectId: scriptDocument?.projectId,
        title: input.title,
        type: input.type,
        source: input.source,
        notes: input.notes,
        fileName: input.file.name,
        fileType: input.file.type || inferFileType(input.file.name),
        fileSize: input.file.size,
        storagePath: `local://supporting/${input.scriptDocumentId}/${Date.now()}/${input.file.name}`,
        dataUrl,
        extractedText
      });
      return;
    }
    const now = new Date().toISOString().slice(0, 10);
    const id = `supporting-local-${Date.now()}`;
    const nextDocument: SupportingDocument = {
      id,
      scriptDocumentId: input.scriptDocumentId,
      title: input.title.trim() || input.file.name.replace(/\.[^.]+$/, ""),
      type: input.type,
      source: input.source.trim() || undefined,
      fileName: input.file.name,
      fileType: input.file.type || inferFileType(input.file.name),
      fileSize: input.file.size,
      storagePath: `local://supporting/${input.scriptDocumentId}/${id}/${input.file.name}`,
      dataUrl,
      uploadedAt: now,
      uploadedById: currentUser.id,
      notes: input.notes.trim() || undefined,
      extractedText
    };
    const nextSupportingDocuments = [nextDocument, ...supportingDocuments];
    setSupportingDocuments(nextSupportingDocuments);
    window.localStorage.setItem(HAMMER_SUPPORTING_DOCUMENTS_STORAGE_KEY, JSON.stringify(nextSupportingDocuments));
  }

  async function deleteSupportingDocument(documentId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("deleteSupportingDocument", { documentId });
      return;
    }
    const nextSupportingDocuments = supportingDocuments.filter((document) => document.id !== documentId);
    setSupportingDocuments(nextSupportingDocuments);
    window.localStorage.setItem(HAMMER_SUPPORTING_DOCUMENTS_STORAGE_KEY, JSON.stringify(nextSupportingDocuments));
  }

  async function uploadReferenceImage(input: {
    projectId: string;
    title: string;
    description: string;
    source: string;
    category: AssetType;
    file: File;
  }) {
    if (!input.file.type.startsWith("image/")) throw new Error("Upload an image file for project reference.");
    const imageUrl = await fileToDataUrl(input.file);
    if (workspaceMode === "database") {
      await runWorkspaceAction("uploadReferenceImage", {
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        source: input.source,
        category: input.category,
        fileName: input.file.name,
        fileType: input.file.type || inferFileType(input.file.name),
        fileSize: input.file.size,
        storagePath: `local://references/${input.projectId}/${Date.now()}/${input.file.name}`,
        dataUrl: imageUrl
      });
      return;
    }
    const now = new Date().toISOString().slice(0, 10);
    const nextImage: ProjectReferenceImage = {
      id: `reference-local-${Date.now()}`,
      projectId: input.projectId,
      title: input.title.trim() || input.file.name.replace(/\.[^.]+$/, ""),
      description: input.description.trim() || "Uploaded project reference.",
      source: input.source.trim() || undefined,
      category: input.category,
      status: "UPLOADED",
      fileName: input.file.name,
      imageUrl,
      uploadedAt: now
    };
    const nextImages = [nextImage, ...localReferenceImages];
    setLocalReferenceImages(nextImages);
    window.localStorage.setItem(HAMMER_REFERENCE_IMAGES_STORAGE_KEY, JSON.stringify(nextImages));
  }

  async function uploadProspectAsset(input: {
    prospectId: string;
    title: string;
    description: string;
    source: string;
    file: File;
  }) {
    if (!isAllowedProspectAssetFile(input.file)) throw new Error("Upload a PDF, DOC, DOCX, TXT, MD, or image file.");
    const dataUrl = await fileToDataUrl(input.file);
    if (workspaceMode === "database") {
      await runWorkspaceAction("uploadProspectAsset", {
        prospectId: input.prospectId,
        title: input.title,
        description: input.description,
        source: input.source,
        fileName: input.file.name,
        fileType: input.file.type || inferProspectAssetFileType(input.file.name),
        fileSize: input.file.size,
        storagePath: `local://prospects/${input.prospectId}/assets/${Date.now()}/${input.file.name}`,
        dataUrl
      });
      return;
    }
    const now = new Date().toISOString().slice(0, 10);
    const nextAsset: ProspectAsset = {
      id: `prospect-asset-local-${Date.now()}`,
      prospectId: input.prospectId,
      title: input.title.trim() || input.file.name.replace(/\.[^.]+$/, ""),
      description: input.description.trim(),
      source: input.source.trim() || undefined,
      fileName: input.file.name,
      fileType: input.file.type || inferProspectAssetFileType(input.file.name),
      fileSize: input.file.size,
      storagePath: `local://prospects/${input.prospectId}/assets/${Date.now()}/${input.file.name}`,
      dataUrl,
      uploadedById: currentUser.id,
      uploadedAt: now
    };
    const nextAssets = [nextAsset, ...localProspectAssets];
    setLocalProspectAssets(nextAssets);
    window.localStorage.setItem(HAMMER_PROSPECT_ASSETS_STORAGE_KEY, JSON.stringify(nextAssets));
  }

  async function deleteProspectAsset(assetId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("deleteProspectAsset", { assetId });
      return;
    }
    const nextAssets = localProspectAssets.filter((asset) => asset.id !== assetId);
    setLocalProspectAssets(nextAssets);
    window.localStorage.setItem(HAMMER_PROSPECT_ASSETS_STORAGE_KEY, JSON.stringify(nextAssets));
  }

  async function createTask(input: {
    projectId?: string;
    title: string;
    description: string;
    assignedToId: string;
    dueDate: string;
    priority: TaskPriority;
    status?: TaskStatus;
    targetType: string;
    targetId: string;
  }) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("createTask", input as unknown as Record<string, unknown>);
      return;
    }
    const nextTask: HammerTask = {
      id: `task-local-${Date.now()}`,
      projectId: input.projectId,
      title: input.title.trim() || "Untitled assignment",
      description: input.description.trim() || "Project assignment.",
      assignedToId: input.assignedToId,
      createdById: currentUser.id,
      dueDate: input.dueDate || new Date().toISOString().slice(0, 10),
      priority: input.priority,
      status: input.status ?? "TODO",
      sortOrder: Math.max(0, ...tasks.map((task) => task.sortOrder ?? 0)) + 1,
      targetType: input.targetType,
      targetId: input.targetId || input.projectId || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const nextTasks = [nextTask, ...localTasks];
    setLocalTasks(nextTasks);
    window.localStorage.setItem(HAMMER_LOCAL_TASKS_STORAGE_KEY, JSON.stringify(nextTasks));
    window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_TASKS_EVENT));
  }

  async function reorderTasks(taskIds: string[]) {
    if (!taskIds.length) return;
    if (workspaceMode === "database") {
      await runWorkspaceAction("reorderTasks", { taskIds });
      return;
    }
    setTaskUpdates((current) => {
      const next = { ...current };
      taskIds.forEach((taskId, index) => {
        next[taskId] = { ...next[taskId], sortOrder: index + 1, updatedAt: new Date().toISOString() };
      });
      window.localStorage.setItem(HAMMER_LOCAL_TASK_UPDATES_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_TASKS_EVENT));
      return next;
    });
  }

  async function updateTask(taskId: string, patch: TaskPatch) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateTask", { taskId, ...patch });
      return;
    }
    setTaskUpdates((current) => {
      const next = { ...current, [taskId]: { ...current[taskId], ...patch } };
      window.localStorage.setItem(HAMMER_LOCAL_TASK_UPDATES_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_TASKS_EVENT));
      return next;
    });
  }

  async function deleteTask(taskId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("deleteTask", { taskId });
      return;
    }
    const nextTasks = localTasks.filter((task) => task.id !== taskId);
    setLocalTasks(nextTasks);
    window.localStorage.setItem(HAMMER_LOCAL_TASKS_STORAGE_KEY, JSON.stringify(nextTasks));
    window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_TASKS_EVENT));
  }

  async function createTaskSubtask(taskId: string, title: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("createTaskSubtask", { taskId, title });
      return;
    }
    updateLocalTaskSubtasks(taskId, (subtasks) => [
      ...subtasks,
      {
        id: `subtask-local-${Date.now()}`,
        taskId,
        title: title.trim() || "Untitled subtask",
        completed: false,
        createdById: currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
  }

  async function updateTaskSubtask(subtaskId: string, patch: TaskSubtaskPatch) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateTaskSubtask", { subtaskId, ...patch });
      return;
    }
    const task = tasks.find((item) => item.subtasks?.some((subtask) => subtask.id === subtaskId));
    if (!task) return;
    updateLocalTaskSubtasks(task.id, (subtasks) => subtasks.map((subtask) => subtask.id === subtaskId ? { ...subtask, ...patch, updatedAt: new Date().toISOString() } : subtask));
  }

  async function deleteTaskSubtask(subtaskId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("deleteTaskSubtask", { subtaskId });
      return;
    }
    const task = tasks.find((item) => item.subtasks?.some((subtask) => subtask.id === subtaskId));
    if (!task) return;
    updateLocalTaskSubtasks(task.id, (subtasks) => subtasks.filter((subtask) => subtask.id !== subtaskId));
  }

  function updateLocalTaskSubtasks(taskId: string, updater: (subtasks: HammerTaskSubtask[]) => HammerTaskSubtask[]) {
    const sourceTask = tasks.find((task) => task.id === taskId);
    if (!sourceTask) return;
    setTaskUpdates((current) => {
      const baseSubtasks = current[taskId]?.subtasks ?? sourceTask.subtasks ?? [];
      const next = {
        ...current,
        [taskId]: {
          ...current[taskId],
          subtasks: updater(baseSubtasks)
        }
      };
      window.localStorage.setItem(HAMMER_LOCAL_TASK_UPDATES_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_TASKS_EVENT));
      return next;
    });
  }

  async function updateContact(contactId: string, patch: Partial<Omit<HammerContact, "id">>) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateContact", { contactId, ...patch });
    }
  }

  async function createContact(input: Omit<HammerContact, "id">) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("createContact", input as unknown as Record<string, unknown>);
      return;
    }
    const nextContact: HammerContact = {
      id: `contact-local-${Date.now()}`,
      ...input
    };
    const nextContacts = [nextContact, ...workspaceContacts];
    setWorkspaceContacts(nextContacts);
    window.localStorage.setItem(HAMMER_LOCAL_CONTACTS_STORAGE_KEY, JSON.stringify(nextContacts));
  }

  async function deleteContact(contactId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("deleteContact", { contactId });
      return;
    }
    const nextContacts = workspaceContacts.filter((contact) => contact.id !== contactId);
    setWorkspaceContacts(nextContacts);
  }

  async function createContactRelationship(input: { fromContactId: string; toContactId: string; relationshipType: ContactRelationshipType; notes?: string }) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("createContactRelationship", input);
      return;
    }
    if (input.fromContactId === input.toContactId) return;
    const nextRelationship: HammerContactRelationship = {
      id: `contact-rel-local-${Date.now()}`,
      fromContactId: input.fromContactId,
      toContactId: input.toContactId,
      relationshipType: input.relationshipType,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    setLocalContactRelationships((current) => {
      const filtered = current.filter((relationship) => !(relationship.fromContactId === input.fromContactId && relationship.toContactId === input.toContactId && relationship.relationshipType === input.relationshipType));
      const next = [nextRelationship, ...filtered];
      window.localStorage.setItem(HAMMER_LOCAL_CONTACT_RELATIONSHIPS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function deleteContactRelationship(relationshipId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("deleteContactRelationship", { relationshipId });
      return;
    }
    setLocalContactRelationships((current) => {
      const next = current.filter((relationship) => relationship.id !== relationshipId);
      window.localStorage.setItem(HAMMER_LOCAL_CONTACT_RELATIONSHIPS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function createOutreachEngagement(input: {
    contactId: string;
    type: OutreachEngagementType;
    engagementDate: string;
    status: ContactStatus;
    summary: string;
    nextStep?: string;
    followUpDate?: string;
  }) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("createOutreachEngagement", input as unknown as Record<string, unknown>);
      return;
    }
    const now = new Date().toISOString();
    const nextEngagement: HammerOutreachEngagement = {
      id: `outreach-engagement-local-${Date.now()}`,
      contactId: input.contactId,
      type: input.type,
      engagementDate: input.engagementDate || now.slice(0, 10),
      status: input.status,
      summary: input.summary,
      nextStep: input.nextStep?.trim() || undefined,
      followUpDate: input.followUpDate || undefined,
      createdById: currentUser.id,
      createdAt: now,
      updatedAt: now
    };
    setLocalOutreachEngagements((current) => {
      const next = [nextEngagement, ...current];
      window.localStorage.setItem(HAMMER_LOCAL_OUTREACH_ENGAGEMENTS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    const contact = hammerContacts.find((item) => item.id === input.contactId);
    if (contact) {
      const updatedContact = {
        ...contact,
        status: input.status,
        lastContacted: nextEngagement.engagementDate,
        nextFollowUp: nextEngagement.followUpDate,
        talentMetWith: nextEngagement.engagementDate
      };
      const nextContacts = [updatedContact, ...workspaceContacts.filter((item) => item.id !== input.contactId)];
      setWorkspaceContacts(nextContacts);
      window.localStorage.setItem(HAMMER_LOCAL_CONTACTS_STORAGE_KEY, JSON.stringify(nextContacts));
    }
  }

  async function updateOutreachEngagement(engagementId: string, patch: Partial<Omit<HammerOutreachEngagement, "id" | "contactId" | "createdById" | "createdAt" | "updatedAt">>) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateOutreachEngagement", { engagementId, ...patch });
      return;
    }
    setLocalOutreachEngagements((current) => {
      const next = current.map((engagement) => engagement.id === engagementId ? { ...engagement, ...patch, updatedAt: new Date().toISOString() } : engagement);
      window.localStorage.setItem(HAMMER_LOCAL_OUTREACH_ENGAGEMENTS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function deleteOutreachEngagement(engagementId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("deleteOutreachEngagement", { engagementId });
      return;
    }
    setLocalOutreachEngagements((current) => {
      const next = current.filter((engagement) => engagement.id !== engagementId);
      window.localStorage.setItem(HAMMER_LOCAL_OUTREACH_ENGAGEMENTS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function updateAccount(input: { name: string; email: string; currentPassword: string; newPassword: string }) {
    if (workspaceMode === "database") {
      const data = await runWorkspaceAction("updateAccount", input) as { user?: SessionUser } | null;
      setSessionUser((current) => data?.user ? { ...current, ...data.user } : current);
      return;
    }
    setSessionUser((current) => current ? { ...current, name: input.name, email: input.email } : current);
  }

  async function deleteProject(projectId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("deleteProject", { projectId });
      return;
    }
    const nextProjects = localProjects.filter((project) => project.id !== projectId);
    setLocalProjects(nextProjects);
    setProjects((currentProjects) => currentProjects.filter((project) => project.id !== projectId));
    window.localStorage.setItem(HAMMER_LOCAL_PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
    window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_PROJECTS_EVENT));
  }

  async function createUser(input: { name: string; email: string; password: string; appRole: AppRole }) {
    if (workspaceMode !== "database") return;
    await runWorkspaceAction("createUser", input);
  }

  async function updateUserRole(userId: string, appRole: AppRole) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateUserRole", { userId, appRole });
      return;
    }
    const role = hammerRoleForAppRole(appRole);
    setWorkspaceUsers((current) => current.map((user) => user.id === userId ? { ...user, role } : user));
  }

  async function deleteUser(userId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("deleteUser", { userId });
      return;
    }
  }

  async function assignDocumentToProject(documentId: string, projectId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("assignDocumentToProject", { documentId, projectId });
      return;
    }
    setDocumentProjectOverrides((current) => {
      const next = { ...current, [documentId]: projectId };
      window.localStorage.setItem(HAMMER_DOCUMENT_PROJECT_OVERRIDES_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_DOCUMENTS_EVENT));
      return next;
    });
  }

  async function updateDocumentMetadata(documentId: string, patch: Partial<Pick<HammerDocument, "title" | "type" | "writerName" | "source">>) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateDocumentMetadata", { documentId, ...patch });
      return;
    }
    const now = new Date().toISOString().slice(0, 10);
    const existing = documents.find((document) => document.id === documentId);
    if (!existing) return;
    const updatedDocument = { ...existing, ...patch, updatedAt: now };
    const nextDocuments = [
      ...localDocuments.filter((document) => document.id !== documentId),
      updatedDocument
    ];
    setLocalDocuments(nextDocuments);
    window.localStorage.setItem(HAMMER_LOCAL_DOCUMENTS_STORAGE_KEY, JSON.stringify(nextDocuments));
    window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_DOCUMENTS_EVENT));
  }

  async function updateDocumentTags(documentId: string, tags: Array<Pick<HammerDocumentTag, "key" | "value">>) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateDocumentTags", { documentId, tags });
      return;
    }
    const now = new Date().toISOString().slice(0, 10);
    const existing = documents.find((document) => document.id === documentId);
    if (!existing) return;
    const updatedDocument = {
      ...existing,
      tags: tags.map((tag, index) => ({
        id: `tag-local-${documentId}-${index}`,
        documentId,
        key: tag.key,
        value: tag.value,
        createdById: currentUser.id,
        createdAt: now
      })),
      updatedAt: now
    };
    const nextDocuments = [
      ...localDocuments.filter((document) => document.id !== documentId),
      updatedDocument
    ];
    setLocalDocuments(nextDocuments);
    window.localStorage.setItem(HAMMER_LOCAL_DOCUMENTS_STORAGE_KEY, JSON.stringify(nextDocuments));
    window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_DOCUMENTS_EVENT));
  }

  async function deleteUploadedDocument(documentId: string) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("deleteDocument", { documentId });
      if (documentId === id) router.push("/scripts");
      return;
    }
    if (!localDocuments.some((document) => document.id === documentId)) return;
    const nextDocuments = localDocuments.filter((document) => document.id !== documentId);
    const nextVersions = localVersions.filter((version) => version.documentId !== documentId);
    const deletedVersionIds = new Set(localVersions.filter((version) => version.documentId === documentId).map((version) => version.id));
    const nextStatuses = Object.fromEntries(Object.entries(versionStatuses).filter(([versionId]) => !deletedVersionIds.has(versionId)));
    const nextProjectOverrides = Object.fromEntries(Object.entries(documentProjectOverrides).filter(([overrideDocumentId]) => overrideDocumentId !== documentId));
    setLocalDocuments(nextDocuments);
    setLocalVersions(nextVersions);
    setVersionStatuses(nextStatuses);
    setDocumentProjectOverrides(nextProjectOverrides);
    window.localStorage.setItem(HAMMER_LOCAL_DOCUMENTS_STORAGE_KEY, JSON.stringify(nextDocuments));
    window.localStorage.setItem(HAMMER_LOCAL_VERSIONS_STORAGE_KEY, JSON.stringify(nextVersions));
    window.localStorage.setItem(HAMMER_LOCAL_VERSION_STATUS_STORAGE_KEY, JSON.stringify(nextStatuses));
    window.localStorage.setItem(HAMMER_DOCUMENT_PROJECT_OVERRIDES_STORAGE_KEY, JSON.stringify(nextProjectOverrides));
    window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_DOCUMENTS_EVENT));
    if (documentId === id) router.push("/scripts");
  }

  const scriptDetailViews: HammerView[] = ["script-detail", "script-versions", "script-diff", "script-breakdown"];
  const isScriptDetailView = scriptDetailViews.includes(view);
  const scriptAccessLoading = isScriptDetailView && !sessionLoaded;
  const scriptAccessDenied = isScriptDetailView && sessionLoaded && !canAccessScriptDocument(currentUser, document);
  const showInitialWorkspaceLoading = !sessionLoaded || !workspaceLoaded;

  const content = (() => {
    if (showInitialWorkspaceLoading) {
      return <WorkspaceRouteSkeleton view={view} />;
    }
    if (scriptAccessLoading) {
      return <Panel><EmptyState label="Checking script access..." /></Panel>;
    }
    if (scriptAccessDenied) {
      return <AccessDenied title="Script access required" detail="You can only open scripts attached to Development Slate items you can access. Producers, executives, and admins can review broader prospect materials from the slate." />;
    }
    if (view === "dashboard") return <Dashboard currentUser={currentUser} projects={projects} documents={documents} versions={versions} tasks={tasks} contacts={contacts} approvals={approvals} scriptCollections={scriptCollections} scriptCollectionItems={scriptCollectionItems} slateCollections={slateCollections} slateCollectionItems={slateCollectionItems} />;
    if (view === "projects") return <Projects mode="development" projects={projects} projectLeads={projectLeads} prospectAssets={prospectAssets} comments={comments} users={users} tasks={tasks} currentUser={currentUser} canCreateProject={canManageScriptLibrary(currentUser.role)} onCreateProject={addProject} onUpdateLead={updateProjectLead} onCreateLead={createProjectLead} onImportLeads={importProjectLeads} onPromoteLead={promoteProjectLead} onCreateTask={createTask} onUploadProspectAsset={uploadProspectAsset} onDeleteProspectAsset={deleteProspectAsset} onCreateComment={createComment} onUpdateComment={updateComment} onDeleteComment={deleteComment} />;
    if (view === "prospects") return <Projects mode="prospects" projects={projects} projectLeads={projectLeads} prospectAssets={prospectAssets} comments={comments} users={users} tasks={tasks} currentUser={currentUser} canCreateProject={canManageScriptLibrary(currentUser.role)} onCreateProject={addProject} onUpdateLead={updateProjectLead} onCreateLead={createProjectLead} onImportLeads={importProjectLeads} onPromoteLead={promoteProjectLead} onCreateTask={createTask} onUploadProspectAsset={uploadProspectAsset} onDeleteProspectAsset={deleteProspectAsset} onCreateComment={createComment} onUpdateComment={updateComment} onDeleteComment={deleteComment} />;
    if (view === "notes") return <NotesCenter comments={comments} users={users} projects={projects} prospects={projectLeads} documents={documents} versions={versions} tasks={tasks} assets={assets} approvals={approvals} currentUser={currentUser} onUpdateComment={updateComment} onDeleteComment={deleteComment} />;
    if (view === "collections") return (
      <Collections
        slateCollections={slateCollections}
        slateItems={slateCollectionItems}
        scriptCollections={scriptCollections}
        scriptItems={scriptCollectionItems}
        projects={projects}
        prospects={projectLeads}
        users={users}
        documents={documents}
        versions={versions}
        canManage={canManageScriptLibrary(currentUser.role)}
        onCreateSlateCollection={createSlateCollection}
        onAddSlateItem={addSlateItemToCollection}
        onRemoveSlateItem={removeSlateItemFromCollection}
        onReorderSlateItems={reorderSlateCollectionItems}
        onArchiveSlateCollection={archiveSlateCollection}
        onDeleteSlateCollection={deleteSlateCollection}
        onCreateScriptCollection={createScriptCollection}
        onAddDocument={addDocumentToCollection}
        onRemoveDocument={removeDocumentFromCollection}
        onReorderScriptItems={reorderScriptCollectionItems}
        onArchiveScriptCollection={archiveScriptCollection}
        onDeleteScriptCollection={deleteScriptCollection}
      />
    );
    if (view === "project-new") {
      if (!canManageScriptLibrary(currentUser.role)) return <AccessDenied title="Project creation access required" detail="Only admins, producers, and executives can create new projects." />;
      return <ProjectEditor users={users} currentUser={currentUser} onCreate={addProject} />;
    }
    if (["project-detail", "project-documents", "project-assets"].includes(view) && !projects.length) return <EmptyWorkspaceState />;
    if (view === "project-detail") return <ProjectWorkspace project={project} activeTab="overview" currentUser={currentUser} users={users} projects={projects} tasks={tasks} documents={documents} versions={versions} supportingDocuments={supportingDocuments} referenceImages={localReferenceImages} assets={assets} approvals={approvals} onUpdateProject={canManageScriptLibrary(currentUser.role) ? updateProject : undefined} onUpload={uploadDocumentVersion} onDelete={canManageScriptLibrary(currentUser.role) ? deleteUploadedDocument : undefined} onAssignToProject={assignDocumentToProject} onReferenceUpload={uploadReferenceImage} onCreateTask={createTask} />;
    if (view === "project-documents") return <ProjectWorkspace project={project} activeTab="documents" currentUser={currentUser} users={users} projects={projects} tasks={tasks} documents={documents} versions={versions} supportingDocuments={supportingDocuments} referenceImages={localReferenceImages} assets={assets} approvals={approvals} onUpdateProject={canManageScriptLibrary(currentUser.role) ? updateProject : undefined} onUpload={uploadDocumentVersion} onDelete={canManageScriptLibrary(currentUser.role) ? deleteUploadedDocument : undefined} onAssignToProject={assignDocumentToProject} onReferenceUpload={uploadReferenceImage} onCreateTask={createTask} />;
    if (view === "project-assets") return <ProjectWorkspace project={project} activeTab="assets" currentUser={currentUser} users={users} projects={projects} tasks={tasks} documents={documents} versions={versions} supportingDocuments={supportingDocuments} referenceImages={localReferenceImages} assets={assets} approvals={approvals} onUpdateProject={canManageScriptLibrary(currentUser.role) ? updateProject : undefined} onReferenceUpload={uploadReferenceImage} onCreateTask={createTask} />;
    if (view === "scripts") return <LegacyRedirect title="Scripts now live inside the slate" detail="Script tracking is most useful in context. Open a Development Slate item for active project scripts and supporting documents, or use Prospects for materials the team may want to pursue." href="/projects" label="Open Development Slate" />;
    if (["script-detail", "script-versions", "script-diff", "script-breakdown"].includes(view) && !documents.some((item) => item.id === document.id)) return <EmptyScriptState />;
    if (view === "script-detail") return <ScriptDetail documentId={document.id} documents={documents} projects={projects} users={users} versions={versions} comments={comments} currentUser={currentUser} supportingDocuments={supportingDocuments} onUpload={uploadDocumentVersion} onSupportingUpload={uploadSupportingDocument} onSupportingDelete={deleteSupportingDocument} onStatusChange={updateDocumentStatus} onUpdateVersionNotes={canManageScriptLibrary(currentUser.role) ? updateDocumentVersionNotes : undefined} onUpdateVersionMarkdown={canAccessScriptDocument(currentUser, document) ? updateDocumentVersionMarkdown : undefined} onCreateComment={createComment} onUpdateComment={updateComment} onDeleteComment={deleteComment} onUpdateMetadata={canAccessScriptDocument(currentUser, document) ? updateDocumentMetadata : undefined} onUpdateTags={canAccessScriptDocument(currentUser, document) ? updateDocumentTags : undefined} onDelete={canManageScriptLibrary(currentUser.role) ? deleteUploadedDocument : undefined} />;
    if (view === "script-versions") return <ScriptVersions documentId={document.id} versions={versions} document={document} currentUser={currentUser} onUpload={uploadDocumentVersion} />;
    if (view === "script-diff") return <ScriptDiff documentId={document.id} versions={versions} />;
    if (view === "script-breakdown") return <ScriptBreakdown documentId={document.id} documents={documents} versions={versions} />;
    if (view === "assets") return <Assets projectId={projects.length ? activeProject.id : ""} assets={assets} currentUser={currentUser} />;
    if (view === "asset-detail") return <AssetDetail assetId={asset.id} assets={assets} currentUser={currentUser} />;
    if (view === "tasks") return <Tasks selectedTaskId={selectedTaskId} currentUser={currentUser} users={users} tasks={tasks} projects={projects} onCreateTask={createTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} onReorderTasks={reorderTasks} onCreateSubtask={createTaskSubtask} onUpdateSubtask={updateTaskSubtask} onDeleteSubtask={deleteTaskSubtask} />;
    if (view === "contacts") {
      if (!canViewContacts(currentUser.role)) return <AccessDenied title="Outreach access required" detail="Only admins, producers, and executives can view the studio outreach directory." />;
      return <Contacts initialContacts={contacts} contactRelationships={contactRelationships} outreachEngagements={outreachEngagements} currentUser={currentUser} users={users} projects={projects} documents={documents} tasks={tasks} databaseMode={workspaceMode === "database"} onDatabaseImport={(importedContacts) => runWorkspaceAction("importContacts", { contacts: importedContacts })} onCreateContact={createContact} onUpdateContact={updateContact} onDeleteContact={deleteContact} onCreateRelationship={createContactRelationship} onDeleteRelationship={deleteContactRelationship} onCreateEngagement={createOutreachEngagement} onUpdateEngagement={updateOutreachEngagement} onDeleteEngagement={deleteOutreachEngagement} onCreateTask={createTask} />;
    }
    if (view === "studio-status" || view === "reports" || view === "executive") {
      if (!canViewReports(currentUser.role)) return <AccessDenied title="Studio Status access required" detail="Only admins, producers, and executives can view studio status and generate update digests." />;
      return <StudioStatus projects={projects} prospects={projectLeads} documents={documents} versions={versions} supportingDocuments={supportingDocuments} tasks={tasks} assets={assets} approvals={approvals} comments={comments} users={users} currentUser={currentUser} />;
    }
    if (view === "account") return <AccountSettings user={sessionUser} onUpdateAccount={updateAccount} />;
    if (view === "reviews") return <LegacyRedirect title="Reviews are folded into the slate" detail="Review work now starts from the relevant Development Slate item or Prospect, so the queue is easier to follow in context." href="/projects" label="Open Development Slate" />;
    if (currentUser.role !== "ADMIN") return <AccessDenied title="Admin access required" detail="Only admins can manage projects, users, roles, and project access." />;
    return <AdminUsers projects={projects} users={users} currentUser={currentUser} databaseMode={workspaceMode === "database"} onCreateProject={addProject} onDeleteProject={deleteProject} onCreateUser={createUser} onUpdateUserRole={updateUserRole} onDeleteUser={deleteUser} onStatusChange={updateProjectStatus} />;
  })();

  async function updateProjectStatus(projectId: string, status: HammerProjectStatus) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateProjectStatus", { projectId, status });
      return;
    }
    setProjects((currentProjects) => currentProjects.map((project) => project.id === projectId ? { ...project, status, updatedAt: new Date().toISOString().slice(0, 10) } : project));
    setLocalProjects((currentProjects) => {
      const nextProjects = currentProjects.map((project) => project.id === projectId ? { ...project, status, updatedAt: new Date().toISOString().slice(0, 10) } : project);
      window.localStorage.setItem(HAMMER_LOCAL_PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
      window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_PROJECTS_EVENT));
      return nextProjects;
    });
  }

  return (
    <AppShell>
      <div className="hammer-page flex h-full min-h-0 flex-col">
        <div className="hammer-page-header shrink-0 pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <PageBreadcrumbs view={view} project={project} document={document} asset={asset} projects={projects} accessDenied={scriptAccessDenied} />
              <h1 className="mt-1 text-xl font-semibold text-studio-100 md:text-2xl">{scriptAccessDenied ? "Script Access Required" : titleForView(view, { project, document, asset })}</h1>
              {scopedProjectTitle(view, activeProject) ? <p className="mt-1 text-xs text-studio-400">Showing {scopedProjectTitle(view, activeProject)} only</p> : null}
            </div>
          </div>
        </div>
        <div className={cn("hammer-page-body min-h-0 flex-1 pr-0.5", view === "tasks" || view === "notes" ? "overflow-hidden pb-0" : "overflow-y-auto pb-5")}>
          {content}
        </div>
      </div>
    </AppShell>
  );
}

function WorkspaceRouteSkeleton({ view }: { view: HammerView }) {
  const rows = view === "dashboard" ? 3 : 7;
  return (
    <div className="space-y-3">
      {view === "dashboard" ? (
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Panel key={index} className="min-h-[112px]">
              <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
              <div className="mt-5 h-7 w-16 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-2 w-32 animate-pulse rounded bg-white/5" />
            </Panel>
          ))}
        </div>
      ) : null}
      <Panel>
        <div className="mb-4 flex items-center justify-between">
          <div className="h-4 w-36 animate-pulse rounded bg-white/10" />
          <div className="h-8 w-28 animate-pulse rounded-md bg-white/5" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="grid grid-cols-[1.4fr_0.8fr_0.7fr] gap-3 rounded-md border border-white/5 bg-white/[0.018] px-3 py-3">
              <div className="h-3 animate-pulse rounded bg-white/10" />
              <div className="h-3 animate-pulse rounded bg-white/5" />
              <div className="h-3 animate-pulse rounded bg-white/5" />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-studio-500">Loading latest data...</p>
      </Panel>
    </div>
  );
}

function Dashboard({
  currentUser,
  projects,
  documents,
  versions,
  tasks = hammerTasks,
  contacts = hammerContacts,
  approvals = hammerApprovals,
  scriptCollections = hammerScriptCollections,
  scriptCollectionItems = hammerScriptCollectionItems,
  slateCollections = hammerSlateCollections,
  slateCollectionItems = hammerSlateCollectionItems
}: {
  currentUser: ReturnType<typeof hammerUserByEmail>;
  projects: HammerProject[];
  documents: HammerDocument[];
  versions: HammerDocumentVersion[];
  tasks?: HammerTask[];
  contacts?: HammerContact[];
  approvals?: HammerApproval[];
  scriptCollections?: HammerScriptCollection[];
  scriptCollectionItems?: HammerScriptCollectionItem[];
  slateCollections?: HammerSlateCollection[];
  slateCollectionItems?: HammerSlateCollectionItem[];
}) {
  const canSeeLibrary = canManageScriptLibrary(currentUser.role);
  const assignedProjectIds = new Set(assignedProjectsForUser(currentUser.id).map((project) => project.id));
  const visibleDocuments = documents.filter((document) => canSeeLibrary || !document.projectId || assignedProjectIds.has(document.projectId));
  const reviewApprovals = approvals.filter((approval) => approval.targetType === "DOCUMENT_VERSION" && approval.status === "REQUESTED");
  const reviewItems = reviewApprovals
    .map((approval) => {
      const version = versions.find((item) => item.id === approval.targetId);
      const document = version ? visibleDocuments.find((item) => item.id === version.documentId) : undefined;
      return document && version ? { approval, document, version } : null;
    })
    .filter(Boolean) as Array<{ approval: HammerApproval; document: HammerDocument; version: HammerDocumentVersion }>;
  const incomingScripts = visibleDocuments
    .filter((document) => !document.projectId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const recentScripts = visibleDocuments
    .filter((document) => ["SCRIPT", "TREATMENT", "OUTLINE", "COVERAGE"].includes(document.type))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  const focusReview = reviewItems[0];
  const focusDocument = focusReview?.document ?? incomingScripts[0] ?? recentScripts[0];
  const focusVersion = focusReview?.version ?? (focusDocument ? currentVersionFor(focusDocument.id, documents, versions) : undefined);
  const visibleDocumentIds = new Set(visibleDocuments.map((document) => document.id));
  const visibleProjectIds = new Set(projects.map((project) => project.id));
  const openAssignedTasks = tasks.filter((task) => task.assignedToId === currentUser.id && task.status !== "DONE" && task.status !== "ARCHIVED");
  const dueWindowEnd = new Date();
  dueWindowEnd.setHours(23, 59, 59, 999);
  dueWindowEnd.setDate(dueWindowEnd.getDate() + 7);
  const immediateTasks = openAssignedTasks
    .filter((task) => isTaskDueBy(task, dueWindowEnd))
    .sort(compareTasksByDueThenPriority)
    .slice(0, 6);
  const immediateTaskIds = new Set(immediateTasks.map((task) => task.id));
  const keyTasks = openAssignedTasks
    .filter((task) => !immediateTaskIds.has(task.id) && (task.priority === "URGENT" || task.priority === "HIGH" || task.status === "BLOCKED" || task.status === "ON_HOLD" || task.status === "REVIEW"))
    .sort(compareTasksByPriorityThenDue)
    .slice(0, 6);
  const priorityTasks = [...immediateTasks, ...keyTasks]
    .sort(compareTasksByDueThenPriority)
    .slice(0, 8);
  const talentFollowUps = contacts
    .filter((contact) => isTalentContact(contact) && contact.nextFollowUp && (contact.status ?? "ACTIVE") !== "ARCHIVED")
    .filter((contact) => canSeeLibrary || contact.ownerId === currentUser.id)
    .sort((a, b) => (a.nextFollowUp ?? "").localeCompare(b.nextFollowUp ?? ""))
    .slice(0, 6);
  const reviewPackets = [
    ...scriptCollections
      .map((collection) => {
        const items = scriptCollectionItems.filter((item) => item.collectionId === collection.id && visibleDocumentIds.has(item.documentId));
        return { id: collection.id, kind: "Scripts", name: collection.name, description: collection.description, status: collection.status, updatedAt: collection.updatedAt, itemCount: items.length };
      })
      .filter((collection) => canSeeLibrary || collection.itemCount > 0),
    ...slateCollections
      .map((collection) => {
        const items = slateCollectionItems.filter((item) => item.collectionId === collection.id && ((item.projectId && visibleProjectIds.has(item.projectId)) || item.prospectId));
        return { id: collection.id, kind: "Slate", name: collection.name, description: collection.description, status: collection.status, updatedAt: collection.updatedAt, itemCount: items.length };
      })
      .filter((collection) => canSeeLibrary || collection.itemCount > 0)
  ]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {canViewReports(currentUser.role) ? (
        <Panel className="border-amberline/20 bg-amberline/[0.045]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-[10px] uppercase tracking-[0.16em] text-amberline">Studio Status</p>
              <h2 className="mt-1 text-base font-semibold text-studio-100">Check the slate and send a quick update</h2>
              <p className="mt-1 text-[13px] leading-5 text-studio-300">Review decisions, risks, weekly tasks, and generate an email-ready digest from one place.</p>
            </div>
            <TableLink href="/studio-status">Open Studio Status</TableLink>
          </div>
        </Panel>
      ) : null}

      <Panel>
        <SectionHeader eyebrow="Review Focus" title={focusDocument ? focusDocument.title : "No script needs attention"} action={focusDocument ? <TableLink href={`/scripts/${focusDocument.id}`}>Open Review</TableLink> : <TableLink href="/projects">Open Development Slate</TableLink>} />
        {focusDocument ? (
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-[13px] leading-6 text-studio-300">
                {focusReview ? "Next script waiting on review." : focusDocument.projectId ? "Most recent script in your accessible project library." : "Newest incoming script ready for intake."}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-studio-400">
                <span>{focusDocument.writerName ?? "Unassigned writer"}</span>
                <span>/</span>
                <span>{focusDocument.projectId ? projectTitleFromList(focusDocument.projectId, projects) : "Incoming"}</span>
                <span>/</span>
                <span>v{focusVersion?.versionNumber ?? 1}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge value={focusVersion?.status ?? "RECEIVED"} />
              <TableLink href={focusDocument.projectId ? `/projects/${focusDocument.projectId}/documents` : "/prospects"}>{focusDocument.projectId ? "Open Slate Item" : "Open Prospects"}</TableLink>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-studio-300">The review queue is clear. New scripts will appear here as they arrive.</p>
        )}
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Immediate Work" title="My Priorities" action={<TableLink href="/tasks">Open Tasks</TableLink>} />
        <DashboardTaskList tasks={priorityTasks} emptyLabel="No urgent, blocked, review, or upcoming assigned tasks." />
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Outreach" title="Upcoming Follow-Ups" action={<TableLink href="/outreach">Open Outreach</TableLink>} />
        <DashboardTalentFollowUps contacts={talentFollowUps} currentUser={currentUser} />
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Collections" title="Review Packets" action={<TableLink href="/collections">Open Collections</TableLink>} />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {reviewPackets.length ? reviewPackets.map((packet) => (
            <Link key={`${packet.kind}-${packet.id}`} href="/collections" className="block rounded-md border border-white/10 bg-white/[0.03] p-3 transition hover:border-amberline/35">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-studio-100">{packet.name}</p>
                    <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-studio-400">{packet.kind}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-studio-400">{packet.description || `${packet.itemCount} item${packet.itemCount === 1 ? "" : "s"} grouped for review.`}</p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge value={packet.status || "ACTIVE"} />
                  <p className="mt-1 text-[11px] text-studio-500">{packet.itemCount} item{packet.itemCount === 1 ? "" : "s"}</p>
                </div>
              </div>
            </Link>
          )) : <EmptyState label="No review packets yet. Create collections to group scripts, prospects, or slate items for quick review." />}
        </div>
      </Panel>
    </div>
  );
}

function DashboardTaskList({ tasks, emptyLabel }: { tasks: HammerTask[]; emptyLabel: string }) {
  if (!tasks.length) return <EmptyState label={emptyLabel} />;
  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <Link key={task.id} href={`/tasks?task=${encodeURIComponent(task.id)}`} className="block rounded-md border border-white/10 bg-white/[0.03] p-3 transition hover:border-amberline/35 hover:bg-white/[0.055]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-studio-100">{task.title}</p>
              <p className="mt-1 truncate text-xs text-studio-400">{taskContextLabel(task)} / {dashboardDueLabel(task)}</p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
              <Badge value={task.priority} />
              <Badge value={task.status} subtle />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function DashboardTalentFollowUps({ contacts, currentUser }: { contacts: HammerContact[]; currentUser: HammerUser }) {
  if (!contacts.length) return <EmptyState label="No outreach follow-ups scheduled." />;
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {contacts.map((contact) => (
        <Link key={contact.id} href={`/outreach?contact=${encodeURIComponent(contact.id)}`} className="block rounded-md border border-white/10 bg-white/[0.03] p-3 transition hover:border-amberline/35 hover:bg-white/[0.055]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-studio-100">{contact.name}</p>
              <p className="mt-1 truncate text-xs text-studio-400">{talentRole(contact)} / {talentAgency(contact)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[12px] font-semibold text-studio-200">{contact.nextFollowUp}</p>
              <p className="mt-1 text-[11px] text-studio-500">{userName(contact.ownerId ?? currentUser.id)}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function dashboardDueLabel(task: HammerTask) {
  if (!task.dueDate) return "No due date";
  const due = parseTaskDueDate(task.dueDate);
  if (!due) return `Due ${task.dueDate}`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const days = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function parseTaskDueDate(dueDate?: string) {
  if (!dueDate) return undefined;
  const parsed = new Date(`${dueDate}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function isTaskDueBy(task: HammerTask, endDate: Date) {
  const due = parseTaskDueDate(task.dueDate);
  if (!due) return false;
  return due <= endDate;
}

function compareTasksByDueThenPriority(a: HammerTask, b: HammerTask) {
  const aDue = parseTaskDueDate(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bDue = parseTaskDueDate(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (aDue !== bDue) return aDue - bDue;
  const priorityComparison = priorityRank(b.priority) - priorityRank(a.priority);
  return priorityComparison || a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
}

function compareTasksByPriorityThenDue(a: HammerTask, b: HammerTask) {
  const priorityComparison = priorityRank(b.priority) - priorityRank(a.priority);
  if (priorityComparison !== 0) return priorityComparison;
  const aDue = parseTaskDueDate(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bDue = parseTaskDueDate(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (aDue !== bDue) return aDue - bDue;
  return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
}

function Projects({
  mode = "development",
  projects,
  projectLeads,
  prospectAssets = [],
  comments = [],
  currentUser,
  users = hammerUsers,
  tasks = hammerTasks,
  canCreateProject = false,
  onCreateProject,
  onUpdateLead,
  onCreateLead,
  onImportLeads,
  onPromoteLead,
  onCreateTask,
  onUploadProspectAsset,
  onDeleteProspectAsset,
  onCreateComment,
  onUpdateComment,
  onDeleteComment
}: {
  mode?: "development" | "prospects";
  projects: HammerProject[];
  projectLeads: HammerProjectLead[];
  prospectAssets?: ProspectAsset[];
  comments?: HammerComment[];
  currentUser: HammerUser;
  users?: HammerUser[];
  tasks?: HammerTask[];
  canCreateProject?: boolean;
  onCreateProject?: (draft: Partial<ProjectDraft>) => Promise<void>;
  onUpdateLead?: (leadId: string, patch: Partial<HammerProjectLead>) => Promise<void>;
  onCreateLead?: (lead: Partial<HammerProjectLead>) => Promise<void>;
  onImportLeads?: (leads: HammerProjectLead[]) => Promise<void>;
  onPromoteLead?: (leadId: string) => Promise<void>;
  onCreateTask?: (input: { projectId?: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => void;
  onUploadProspectAsset?: (input: { prospectId: string; title: string; description: string; source: string; file: File }) => Promise<void>;
  onDeleteProspectAsset?: (assetId: string) => Promise<void>;
  onCreateComment?: (input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) => Promise<void>;
  onUpdateComment?: (commentId: string, input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = mode === "prospects" ? "slate" : "active";
  const [slateSearch, setSlateSearch] = useState("");
  const [filters, setFilters] = useState({ lane: "ALL", genre: "ALL", urgency: "ALL", rights: "ALL", nextAction: "ALL", owner: "ALL", scriptStatus: "ALL", format: "ALL" });
  const [showSlateFilters, setShowSlateFilters] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedLeadTitle, setSelectedLeadTitle] = useState("");
  const [dismissedProspectId, setDismissedProspectId] = useState("");
  const [leadDraft, setLeadDraft] = useState<Partial<HammerProjectLead>>({});
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [addSlateOpen, setAddSlateOpen] = useState(false);
  const [slatePage, setSlatePage] = useState(1);
  const [slatePageSize, setSlatePageSize] = useState(12);
  const [slateImportMessage, setSlateImportMessage] = useState("");
  const [prospectSort, setProspectSort] = useState<{ key: ProspectSortKey; direction: "asc" | "desc" }>({ key: "title", direction: "asc" });
  const displayProjectLeads = useMemo(() => dedupeProjectLeads(projectLeads), [projectLeads]);
  const activeSlateFilterCount = useMemo(() => Object.values(filters).filter((value) => value !== "ALL").length, [filters]);
  const normalizedSlateSearch = slateSearch.toLowerCase().trim();
  const filteredLeads = useMemo(() => displayProjectLeads.filter((lead) => {
    const matchesSearch = !normalizedSlateSearch || `${lead.title} ${lead.logline ?? ""} ${lead.creator ?? ""} ${lead.genre ?? ""} ${lead.lane ?? ""} ${lead.notes ?? ""} ${lead.searchKeywords ?? ""} ${lead.contactRep ?? ""}`.toLowerCase().includes(normalizedSlateSearch);
    return matchesSearch
      && matchesFilter(filters.lane, lead.lane)
      && matchesFilter(filters.genre, lead.genre)
      && matchesFilter(filters.urgency, lead.urgencyLabel)
      && matchesFilter(filters.rights, lead.rightsStatus)
      && matchesFilter(filters.nextAction, lead.nextActionStatus)
      && matchesOwnerFilter(filters.owner, lead)
      && matchesFilter(filters.scriptStatus, lead.scriptStatus)
      && matchesFilter(filters.format, lead.format);
  }), [displayProjectLeads, filters, normalizedSlateSearch]);
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      const aValue = prospectSortValue(a, prospectSort.key, users);
      const bValue = prospectSortValue(b, prospectSort.key, users);
      const comparison = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: "base" });
      return prospectSort.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredLeads, prospectSort.direction, prospectSort.key, users]);
  const slateTotalPages = Math.max(1, Math.ceil(sortedLeads.length / slatePageSize));
  const normalizedSlatePage = Math.min(slatePage, slateTotalPages);
  const pagedLeads = sortedLeads.slice((normalizedSlatePage - 1) * slatePageSize, normalizedSlatePage * slatePageSize);
  const selectedLead = selectedLeadId
    ? pagedLeads.find((lead) => lead.id === selectedLeadId && lead.title === selectedLeadTitle)
      ?? filteredLeads.find((lead) => lead.id === selectedLeadId && lead.title === selectedLeadTitle)
      ?? displayProjectLeads.find((lead) => lead.id === selectedLeadId && lead.title === selectedLeadTitle)
      ?? displayProjectLeads.find((lead) => lead.id === selectedLeadId)
    : undefined;
  const selectedLeadAssets = useMemo(() => selectedLead ? prospectAssets.filter((asset) => asset.prospectId === selectedLead.id) : [], [prospectAssets, selectedLead]);

  useEffect(() => {
    if (mode !== "prospects") return;
    const prospectId = searchParams.get("prospect");
    if (!prospectId) {
      if (dismissedProspectId) setDismissedProspectId("");
      return;
    }
    if (prospectId === dismissedProspectId || selectedLeadId === prospectId) return;
    const linkedLead = displayProjectLeads.find((lead) => lead.id === prospectId);
    if (!linkedLead) return;
    setSelectedLeadId(linkedLead.id);
    setSelectedLeadTitle(linkedLead.title);
  }, [dismissedProspectId, displayProjectLeads, mode, searchParams, selectedLeadId]);

  useEffect(() => {
    if (!selectedLead) return;
    setLeadDraft(selectedLead);
  }, [selectedLead]);

  useEffect(() => {
    setSlatePage(1);
  }, [filters.format, filters.genre, filters.lane, filters.nextAction, filters.owner, filters.rights, filters.scriptStatus, filters.urgency, slatePageSize, slateSearch]);

  useEffect(() => {
    function updateSlatePageSize() {
      const filterPanelOpen = showSlateFilters || activeSlateFilterCount > 0;
      const reservedHeight = filterPanelOpen ? 470 : 385;
      const availableTableHeight = Math.max(300, window.innerHeight - reservedHeight);
      setSlatePageSize(Math.max(6, Math.min(18, Math.floor(availableTableHeight / 49))));
    }

    updateSlatePageSize();
    window.addEventListener("resize", updateSlatePageSize);
    return () => window.removeEventListener("resize", updateSlatePageSize);
  }, [activeSlateFilterCount, showSlateFilters]);

  async function saveLead() {
    if (!selectedLead || !onUpdateLead) return;
    const normalizedPatch = normalizeLeadPatch(leadDraft);
    await onUpdateLead(selectedLead.id, canManageScriptLibrary(currentUser.role) ? normalizedPatch : projectLeadCoreEditablePatch(normalizedPatch));
  }

  async function importSlateCsv(file?: File | null) {
    if (!file || !onImportLeads) return;
    try {
      const text = await file.text();
      const parsed = parseProjectLeadCsv(text).map((lead) => ({
        ...lead,
        ownerIds: lead.ownerIds?.length ? lead.ownerIds : resolveCsvOwnerIds(lead.owner, users)
      }));
      await onImportLeads(parsed);
      setSlateImportMessage(`Processed ${parsed.length} prospect row${parsed.length === 1 ? "" : "s"}. Existing prospects were updated, restored, or skipped.`);
    } catch (error) {
      setSlateImportMessage(error instanceof Error ? error.message : "Could not import slate CSV.");
    }
  }

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleProspectSort(key: ProspectSortKey) {
    setProspectSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  }

  function openProspect(lead: HammerProjectLead) {
    setDismissedProspectId("");
    setSelectedLeadId(lead.id);
    setSelectedLeadTitle(lead.title);
    if (mode === "prospects") router.replace(`/prospects?prospect=${encodeURIComponent(lead.id)}`, { scroll: false });
  }

  function closeProspect() {
    const prospectId = selectedLeadId || searchParams.get("prospect") || "";
    setDismissedProspectId(prospectId);
    setSelectedLeadId("");
    setSelectedLeadTitle("");
    if (mode === "prospects") router.replace("/prospects", { scroll: false });
  }

  return (
    <div className={cn(section === "active" ? "space-y-4" : "flex h-full min-h-0 flex-col gap-3")}>
      <Panel className="shrink-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader eyebrow={section === "active" ? "Development Slate" : "Prospects"} title={section === "active" ? "Development Slate" : "Prospects"} action={section === "active" ? (canCreateProject ? <PrimaryButton icon={Plus} label="Create Slate Item" onClick={() => setCreateProjectOpen(true)} /> : undefined) : <div className="flex flex-wrap gap-1.5"><PrimaryButton icon={Plus} label="Add Prospect" onClick={() => setAddSlateOpen(true)} /><label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs font-semibold text-studio-200 transition hover:border-amberline/40 hover:text-amberline"><UploadCloud className="h-3.5 w-3.5" />Import CSV<input className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => importSlateCsv(event.target.files?.[0])} /></label></div>} />
        </div>
      </Panel>

      {section === "active" ? (
        <Panel>
          <ProjectTable projects={projects} />
        </Panel>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col">
            <Panel className="flex min-h-0 flex-1 flex-col">
              <div className="mb-3 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-studio-400" />
                  <input className="field pl-8" value={slateSearch} onChange={(event) => setSlateSearch(event.target.value)} placeholder="Search title, creator, logline, vendor, contact, notes" />
                </div>
                <button type="button" onClick={() => setShowSlateFilters((open) => !open)} className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition", activeSlateFilterCount ? "border-amberline/35 bg-amberline/10 text-amberline" : "border-white/10 bg-white/[0.025] text-studio-300 hover:border-amberline/35 hover:text-amberline")} aria-expanded={showSlateFilters}>
                  Filters
                  {activeSlateFilterCount ? <span className="rounded-full bg-amberline px-1.5 py-0.5 text-[10px] text-studio-950">{activeSlateFilterCount}</span> : null}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition", showSlateFilters && "rotate-180")} />
                </button>
              </div>
              {(showSlateFilters || activeSlateFilterCount > 0) ? (
                <div className="mb-3 grid gap-2 rounded-md border border-white/10 bg-white/[0.025] p-2 md:grid-cols-4">
                  <SlateFilter label="Lane" value={filters.lane} options={uniqueLeadOptions(displayProjectLeads, "lane")} onChange={(value) => setFilter("lane", value)} />
                  <SlateFilter label="Genre" value={filters.genre} options={uniqueLeadOptions(displayProjectLeads, "genre")} onChange={(value) => setFilter("genre", value)} />
                  <SlateFilter label="Rights" value={filters.rights} options={uniqueLeadOptions(displayProjectLeads, "rightsStatus")} onChange={(value) => setFilter("rights", value)} />
                  <ProspectOwnerFilter label="Owner" value={filters.owner} users={users} leads={displayProjectLeads} onChange={(value) => setFilter("owner", value)} />
                  <SlateFilter label="Urgency" value={filters.urgency} options={uniqueLeadOptions(displayProjectLeads, "urgencyLabel")} onChange={(value) => setFilter("urgency", value)} />
                  <SlateFilter label="Action Status" value={filters.nextAction} options={uniqueLeadOptions(displayProjectLeads, "nextActionStatus")} onChange={(value) => setFilter("nextAction", value)} />
                  <SlateFilter label="Script Status" value={filters.scriptStatus} options={uniqueLeadOptions(displayProjectLeads, "scriptStatus")} onChange={(value) => setFilter("scriptStatus", value)} />
                  <SlateFilter label="Format" value={filters.format} options={uniqueLeadOptions(displayProjectLeads, "format")} onChange={(value) => setFilter("format", value)} />
                </div>
              ) : null}
              <div className="mb-2 flex items-center justify-between text-xs text-studio-400">
                <span>{filteredLeads.length} of {displayProjectLeads.length} prospects</span>
                <button type="button" className="font-semibold text-amberline" onClick={() => { setSlateSearch(""); setFilters({ lane: "ALL", genre: "ALL", urgency: "ALL", rights: "ALL", nextAction: "ALL", owner: "ALL", scriptStatus: "ALL", format: "ALL" }); }}>Clear filters</button>
              </div>
              {slateImportMessage ? <p className="mb-2 text-xs text-studio-300">{slateImportMessage}</p> : null}
              <div className="data-scroll data-scroll-slate prospects-table-scroll">
                <table className="data-table min-w-[1540px] table-fixed">
                  <colgroup>
                    <col className="w-[260px]" />
                    <col className="w-[320px]" />
                    <col className="w-[190px]" />
                    <col className="w-[180px]" />
                    <col className="w-[120px]" />
                    <col className="w-[210px]" />
                    <col className="w-[110px]" />
                    <col className="w-[220px]" />
                    <col className="w-[90px]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <SortableHeader label="Title" sortKey="title" activeSort={prospectSort} onSort={toggleProspectSort} />
                      <SortableHeader label="Logline" sortKey="logline" activeSort={prospectSort} onSort={toggleProspectSort} />
                      <SortableHeader label="Lane" sortKey="lane" activeSort={prospectSort} onSort={toggleProspectSort} />
                      <SortableHeader label="Genre" sortKey="genre" activeSort={prospectSort} onSort={toggleProspectSort} />
                      <SortableHeader label="Urgency" sortKey="urgency" activeSort={prospectSort} onSort={toggleProspectSort} />
                      <SortableHeader label="Rights" sortKey="rights" activeSort={prospectSort} onSort={toggleProspectSort} />
                      <SortableHeader label="Owner" sortKey="owner" activeSort={prospectSort} onSort={toggleProspectSort} />
                      <SortableHeader label="Action Status" sortKey="actionStatus" activeSort={prospectSort} onSort={toggleProspectSort} />
                      <SortableHeader label="Score" sortKey="score" activeSort={prospectSort} onSort={toggleProspectSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {pagedLeads.map((lead) => (
                      <tr key={`${lead.id}-${lead.title}`} onClick={() => openProspect(lead)} className={cn("cursor-pointer text-studio-200 hover:bg-white/[0.035]", selectedLeadId === lead.id && selectedLeadTitle === lead.title && "bg-emerald-400/10")}>
                        <td><p className="truncate font-semibold text-studio-100">{lead.title}</p><p className="mt-0.5 truncate text-xs text-studio-400">{lead.creator || lead.sourceLink || "No source listed"}</p></td>
                        <td><span className="line-clamp-2 text-[13px] leading-5 text-studio-300">{lead.logline || "-"}</span></td>
                        <td><span className="block truncate">{lead.lane || "-"}</span></td>
                        <td><span className="block truncate">{lead.genre || "-"}</span></td>
                        <td>{lead.urgencyLabel ? <Badge value={lead.urgencyLabel} subtle /> : <span className="text-studio-500">-</span>}</td>
                        <td><span className="block truncate">{lead.rightsStatus || "-"}</span></td>
                        <td><span className="block truncate">{prospectOwnerLabel(lead, users)}</span></td>
                        <td><span className="block truncate">{lead.nextActionStatus || "-"}</span></td>
                        <td className="font-semibold text-studio-100">{lead.priorityScore ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredLeads.length > slatePageSize ? (
                <div className="shrink-0 pt-3 flex flex-col gap-2 text-xs text-studio-400 md:flex-row md:items-center md:justify-between">
                  <span>
                    Showing {(normalizedSlatePage - 1) * slatePageSize + 1}-{Math.min(normalizedSlatePage * slatePageSize, filteredLeads.length)} of {filteredLeads.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={normalizedSlatePage <= 1}
                      onClick={() => setSlatePage((page) => Math.max(1, page - 1))}
                      className="rounded border border-white/10 px-2 py-1 font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="min-w-24 text-center">Page {normalizedSlatePage} of {slateTotalPages}</span>
                    <button
                      type="button"
                      disabled={normalizedSlatePage >= slateTotalPages}
                      onClick={() => setSlatePage((page) => Math.min(slateTotalPages, page + 1))}
                      className="rounded border border-white/10 px-2 py-1 font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </Panel>
          </div>
          {selectedLead ? (
            <div className="modal-overlay" onPointerDown={(event) => { event.preventDefault(); closeProspect(); }}>
              <div className="w-full max-w-[980px]" onPointerDown={(event) => event.stopPropagation()}>
                <SlateLeadPanel
                  lead={selectedLead}
                  draft={leadDraft}
                  projects={projects}
                  users={users}
                  currentUser={currentUser}
                  tasks={tasks}
                  comments={comments}
                  onDraftChange={setLeadDraft}
                  onSave={saveLead}
                  onPromote={onPromoteLead}
                  onCreateTask={onCreateTask}
                  onCreateComment={onCreateComment}
                  onUpdateComment={onUpdateComment}
                  onDeleteComment={onDeleteComment}
                  assets={selectedLeadAssets}
                  canManageAssets={canManageScriptLibrary(currentUser.role)}
                  onUploadAsset={onUploadProspectAsset}
                  onDeleteAsset={onDeleteProspectAsset}
                  onClose={closeProspect}
                />
              </div>
            </div>
          ) : null}
          {addSlateOpen ? (
            <SlateCreateModal
              users={users}
              onClose={() => setAddSlateOpen(false)}
              onCreate={async (lead) => {
                if (!onCreateLead) return;
                await onCreateLead(lead);
                setAddSlateOpen(false);
              }}
            />
          ) : null}
        </>
      )}
      {createProjectOpen && onCreateProject ? (
        <ProjectCreateModal
          users={users}
          currentUser={currentUser}
          onClose={() => setCreateProjectOpen(false)}
          onCreate={async (draft) => {
            await onCreateProject(draft);
            setCreateProjectOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function SlateFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">{label}</span>
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="ALL">All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ProspectOwnerFilter({ label, value, users, leads, onChange }: { label: string; value: string; users: HammerUser[]; leads: HammerProjectLead[]; onChange: (value: string) => void }) {
  const assignedOwnerIds = new Set(leads.flatMap((lead) => lead.ownerIds ?? []));
  const ownerOptions = users.filter((user) => assignedOwnerIds.has(user.id));
  return (
    <label className="grid gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">{label}</span>
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="ALL">All</option>
        {ownerOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
      </select>
    </label>
  );
}

function SlateCreateModal({ users, onClose, onCreate }: { users: HammerUser[]; onClose: () => void; onCreate: (lead: Partial<HammerProjectLead>) => Promise<void> }) {
  const [draft, setDraft] = useState<Partial<HammerProjectLead>>({
    title: "",
    lane: "",
    genre: "",
    urgencyLabel: "",
    rightsStatus: "",
    ownerIds: [],
    nextActionStatus: "",
    priorityScore: undefined
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title?.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onCreate({
        ...draft,
        title: draft.title.trim(),
        priorityScore: draft.priorityScore === undefined ? undefined : Number(draft.priorityScore)
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not add prospect.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-studio-950/75 px-4 py-8 backdrop-blur-sm">
      <form onSubmit={submit} className="modal-card w-full max-w-4xl rounded-lg border border-white/10 bg-studio-950 p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <SectionHeader eyebrow="Prospects" title="Add Prospect" />
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close add slate">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SlateEditField label="Title" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
          <SlateEditField label="Creator / Author / Director" value={draft.creator} onChange={(value) => setDraft((current) => ({ ...current, creator: value }))} />
          <SlateEditField label="Lane" value={draft.lane} onChange={(value) => setDraft((current) => ({ ...current, lane: value }))} />
          <SlateEditField label="Genre" value={draft.genre} onChange={(value) => setDraft((current) => ({ ...current, genre: value }))} />
          <SlateEditField label="Urgency" value={draft.urgencyLabel} onChange={(value) => setDraft((current) => ({ ...current, urgencyLabel: value }))} />
          <SlateEditField label="Rights" value={draft.rightsStatus} onChange={(value) => setDraft((current) => ({ ...current, rightsStatus: value }))} />
          <ProspectOwnerPicker users={users} value={draft.ownerIds ?? []} onChange={(ownerIds) => setDraft((current) => ({ ...current, ownerIds }))} />
          <SlateEditField label="Action Status" value={draft.nextActionStatus} onChange={(value) => setDraft((current) => ({ ...current, nextActionStatus: value }))} />
          <SlateEditField label="Script Status" value={draft.scriptStatus} onChange={(value) => setDraft((current) => ({ ...current, scriptStatus: value }))} />
          <SlateEditField label="Format" value={draft.format} onChange={(value) => setDraft((current) => ({ ...current, format: value }))} />
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Score</span>
            <input className="field" type="number" value={draft.priorityScore ?? ""} onChange={(event) => setDraft((current) => ({ ...current, priorityScore: event.target.value ? Number(event.target.value) : undefined }))} />
          </label>
          <SlateEditField label="Contact / Rep" value={draft.contactRep} onChange={(value) => setDraft((current) => ({ ...current, contactRep: value }))} />
        </div>
        <label className="mt-3 grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Logline</span>
          <textarea className="field min-h-20" value={draft.logline ?? ""} onChange={(event) => setDraft((current) => ({ ...current, logline: event.target.value }))} />
        </label>
        <p className="mt-3 rounded-md border border-white/10 bg-white/[0.025] px-3 py-2 text-xs leading-5 text-studio-300">
          After creating the prospect, open it to add dated notes, attachments, and follow-up history.
        </p>
        {error ? <p className="mt-3 rounded border border-rose-400/25 bg-rose-500/5 px-2.5 py-2 text-xs text-rose-200">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:text-amberline">Cancel</button>
          <button type="submit" disabled={busy} className="rounded bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">Add Prospect</button>
        </div>
      </form>
    </div>
  );
}

function SlateLeadPanel({
  lead,
  draft,
  projects,
  users,
  currentUser,
  tasks,
  comments = [],
  assets = [],
  canManageAssets = false,
  onDraftChange,
  onSave,
  onPromote,
  onCreateTask,
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
  onUploadAsset,
  onDeleteAsset,
  onClose
}: {
  lead?: HammerProjectLead;
  draft: Partial<HammerProjectLead>;
  projects: HammerProject[];
  users: HammerUser[];
  currentUser: HammerUser;
  tasks: HammerTask[];
  comments?: HammerComment[];
  assets?: ProspectAsset[];
  canManageAssets?: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<Partial<HammerProjectLead>>>;
  onSave: () => Promise<void>;
  onPromote?: (leadId: string) => Promise<void>;
  onCreateTask?: (input: { projectId?: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => void;
  onCreateComment?: (input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) => Promise<void>;
  onUpdateComment?: (commentId: string, input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onUploadAsset?: (input: { prospectId: string; title: string; description: string; source: string; file: File }) => Promise<void>;
  onDeleteAsset?: (assetId: string) => Promise<void>;
  onClose?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  async function savePanel() {
    setSaving(true);
    setSaveMessage("");
    try {
      await onSave();
      setSaveMessage("Saved.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (!lead) return <Panel><EmptyState label="Select a prospect to review details." /></Panel>;
  const promotedProject = lead.promotedProjectId ? projects.find((project) => project.id === lead.promotedProjectId) : undefined;
  const slateTasks = tasks.filter((task) => task.targetType === "PROJECT_LEAD" && task.targetId === lead.id);
  return (
    <div className="modal-panel max-h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-1.5">
            {lead.lane ? <Badge value={lead.lane} subtle /> : null}
            {lead.urgencyLabel ? <Badge value={lead.urgencyLabel} subtle /> : null}
          </div>
          <h3 className="mt-2 text-xl font-semibold text-studio-100">{draft.title || lead.title}</h3>
          <p className="mt-1 text-[13px] text-studio-300">{draft.creator || lead.creator || "Writer not listed"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {saveMessage ? <span className="hidden text-xs text-studio-400 md:inline">{saveMessage}</span> : null}
          <ShareButton title={lead.title} type="Prospect" status={lead.urgencyLabel || lead.nextActionStatus} summary={lead.logline} href={`/prospects?prospect=${encodeURIComponent(lead.id)}`} />
          <PrimaryButton icon={CheckCircle2} label={saving ? "Saving" : "Save"} onClick={savePanel} />
          {promotedProject ? <TableLink href={`/projects/${promotedProject.id}`}>Open Development Slate</TableLink> : <button type="button" onClick={() => onPromote?.(lead.id)} className="rounded-md bg-amberline px-2.5 py-1.5 text-xs font-semibold text-studio-950">Promote</button>}
          {onClose ? (
            <button type="button" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close slate details">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
      <label className="mt-3 grid gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Logline</span>
        <textarea className="field min-h-28 resize-y text-[14px] leading-6" value={draft.logline ?? ""} onChange={(event) => onDraftChange((current) => ({ ...current, logline: event.target.value }))} placeholder="Add a short creative summary for this prospect." />
      </label>
      <ProspectAssetsPanel
        prospect={lead}
        assets={assets}
        currentUser={currentUser}
        canManage={canManageAssets}
        onUpload={onUploadAsset}
        onDelete={onDeleteAsset}
      />
      <div className="mt-3 rounded-md border border-white/10 bg-white/[0.025] p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Source Materials</p>
            <p className="mt-1 text-[13px] leading-5 text-studio-300">Quick links for scripts, PDFs, and source references attached to this prospect.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lead.scriptPdf ? <TableLink href={lead.scriptPdf}>Script PDF</TableLink> : null}
            {lead.sourceLink ? <TableLink href={lead.sourceLink}>Source Link</TableLink> : null}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <SlateEditField label="Title" value={draft.title} onChange={(value) => onDraftChange((current) => ({ ...current, title: value }))} />
        <SlateEditField label="Writer" value={draft.creator} onChange={(value) => onDraftChange((current) => ({ ...current, creator: value }))} />
        <SlateEditField label="Genre" value={draft.genre} onChange={(value) => onDraftChange((current) => ({ ...current, genre: value }))} />
        <SlateEditField label="Urgency" value={draft.urgencyLabel} onChange={(value) => onDraftChange((current) => ({ ...current, urgencyLabel: value }))} />
        <label className="grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Score</span>
          <input className="field" type="number" value={draft.priorityScore ?? ""} onChange={(event) => onDraftChange((current) => ({ ...current, priorityScore: event.target.value ? Number(event.target.value) : undefined }))} />
        </label>
        <ProspectOwnerPicker users={users} value={draft.ownerIds ?? []} legacyOwner={draft.owner ?? lead.owner} onChange={(ownerIds) => onDraftChange((current) => ({ ...current, ownerIds }))} />
        <SlateEditField label="Action Status" value={draft.nextActionStatus} onChange={(value) => onDraftChange((current) => ({ ...current, nextActionStatus: value }))} />
        <SlateEditField label="Rights Status" value={draft.rightsStatus} onChange={(value) => onDraftChange((current) => ({ ...current, rightsStatus: value }))} />
        <SlateEditField label="Contact / Rep" value={draft.contactRep} onChange={(value) => onDraftChange((current) => ({ ...current, contactRep: value }))} />
        <SlateEditField label="Script Status" value={draft.scriptStatus} onChange={(value) => onDraftChange((current) => ({ ...current, scriptStatus: value }))} />
        <SlateEditField label="Format" value={draft.format} onChange={(value) => onDraftChange((current) => ({ ...current, format: value }))} />
      </div>
      <label className="mt-3 grid gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Step Details</span>
        <textarea className="field min-h-20" value={draft.nextStep ?? ""} onChange={(event) => onDraftChange((current) => ({ ...current, nextStep: event.target.value }))} />
      </label>
      <SlateNextStepTaskCreator lead={lead} nextStep={draft.nextStep ?? ""} projects={projects} users={users} onCreateTask={onCreateTask} />
      {slateTasks.length ? (
        <div className="mt-3 rounded-md border border-white/10 bg-white/[0.025] p-2.5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Prospect Tasks</p>
          <div className="grid gap-1.5">
            {slateTasks.slice(0, 4).map((task) => (
              <Link key={task.id} href={`/tasks?task=${task.id}`} className="rounded border border-white/10 bg-white/[0.03] px-2.5 py-2 transition hover:border-amberline/35">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-semibold text-studio-100">{task.title}</p>
                    <p className="mt-0.5 text-xs text-studio-400">{userName(task.assignedToId)} / due {task.dueDate || "unscheduled"}</p>
                  </div>
                  <Badge value={task.status} subtle />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <ProspectNotesPanel
        prospect={lead}
        legacyNotes={lead.notes}
        comments={comments}
        users={users}
        currentUser={currentUser}
        onCreateComment={onCreateComment}
        onUpdateComment={onUpdateComment}
        onDeleteComment={onDeleteComment}
      />
    </div>
  );
}

function ProspectNotesPanel({
  prospect,
  legacyNotes,
  comments,
  users,
  currentUser,
  onCreateComment,
  onUpdateComment,
  onDeleteComment
}: {
  prospect: HammerProjectLead;
  legacyNotes?: string;
  comments: HammerComment[];
  users: HammerUser[];
  currentUser: HammerUser;
  onCreateComment?: (input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) => Promise<void>;
  onUpdateComment?: (commentId: string, input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [noteType, setNoteType] = useState<HammerNoteType>("GENERAL");
  const [visibility, setVisibility] = useState<HammerComment["visibility"]>("PROJECT_TEAM");
  const [selectedCommentId, setSelectedCommentId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const prospectComments = comments
    .filter((comment) => comment.targetType === "PROSPECT" && comment.targetId === prospect.id && comment.status !== "ARCHIVED")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const selectedComment = prospectComments.find((comment) => comment.id === selectedCommentId);

  async function saveNote() {
    if (!onCreateComment || !body.trim()) {
      setMessage(body.trim() ? "Notes cannot be saved from this view yet." : "Write a note before saving.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await onCreateComment({
        targetType: "PROSPECT",
        targetId: prospect.id,
        body: body.trim(),
        visibility,
        metadataJson: { noteType, tags: [] }
      });
      setBody("");
      setNoteType("GENERAL");
      setVisibility("PROJECT_TEAM");
      setMessage("Note saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Notes</p>
          <p className="mt-1 text-[13px] leading-5 text-studio-300">Add dated prospect notes for coverage, rights, meetings, and follow-ups.</p>
        </div>
        <Badge value={`${prospectComments.length} note${prospectComments.length === 1 ? "" : "s"}`} subtle />
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-[170px_170px_1fr] md:items-end">
        <label className="grid gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Type</span>
          <select className="field" value={noteType} onChange={(event) => setNoteType(event.target.value as HammerNoteType)}>
            {hammerNoteTypes.map((type) => <option key={type} value={type}>{noteTypeLabel(type)}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Visibility</span>
          <select className="field" value={visibility} onChange={(event) => setVisibility(event.target.value as HammerComment["visibility"])}>
            <option value="PROJECT_TEAM">Project Team</option>
            <option value="INTERNAL">Internal</option>
            <option value="EXECUTIVE_ONLY">Executive Only</option>
          </select>
        </label>
      </div>
      <textarea className="field mt-2 min-h-28 whitespace-pre-wrap leading-6" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add a prospect note..." />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {message ? <p className="text-xs text-studio-300">{message}</p> : <span />}
        <button type="button" disabled={busy || !body.trim()} onClick={() => void saveNote()} className="inline-flex items-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">
          <CheckCircle2 className="h-4 w-4" />
          {busy ? "Saving..." : "Save Note"}
        </button>
      </div>
      {legacyNotes?.trim() ? (
        <div className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/5 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">Imported Prospect Note</p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-studio-300">{legacyNotes}</p>
        </div>
      ) : null}
      <div className="mt-3 grid gap-2">
        {prospectComments.length ? prospectComments.map((comment) => {
          const metadata = noteMetadata(comment);
          const isLong = comment.body.length > 240 || comment.body.includes("\n");
          return (
            <button key={comment.id} type="button" onClick={() => setSelectedCommentId(comment.id)} className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-amberline/35 hover:bg-white/[0.055]">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge value={noteTypeLabel(metadata.noteType)} subtle />
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-semibold text-studio-400">{statusLabel(comment.visibility)}</span>
                </div>
                <p className="shrink-0 text-xs text-studio-500">{userNameFromList(comment.createdById, users)} / {formatNoteTimestamp(comment.createdAt)}</p>
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[13px] leading-5 text-studio-300">{comment.body}</p>
              {metadata.tags.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {metadata.tags.map((tag, index) => <span key={`${tag.key}-${tag.value}-${index}`} className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-100"><span className="text-emerald-300">{tag.key}</span>: {tag.value}</span>)}
                </div>
              ) : null}
              {isLong ? <p className="mt-2 text-xs font-semibold text-amberline">Read more</p> : null}
            </button>
          );
        }) : legacyNotes?.trim() ? null : <EmptyState label="No notes yet." />}
      </div>
      {selectedComment ? (
        <ProspectNoteDialog
          prospect={prospect}
          comment={selectedComment}
          users={users}
          currentUser={currentUser}
          onClose={() => setSelectedCommentId("")}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
        />
      ) : null}
    </div>
  );
}

function ProspectNoteDialog({
  prospect,
  comment,
  users,
  onClose,
  onUpdateComment,
  onDeleteComment
}: {
  prospect: HammerProjectLead;
  comment: HammerComment;
  users: HammerUser[];
  currentUser: HammerUser;
  onClose: () => void;
  onUpdateComment?: (commentId: string, input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}) {
  const metadata = noteMetadata(comment);
  const [body, setBody] = useState(comment.body);
  const [noteType, setNoteType] = useState<HammerNoteType>(metadata.noteType);
  const [visibility, setVisibility] = useState<HammerComment["visibility"]>(comment.visibility);
  const [tagDrafts, setTagDrafts] = useState<HammerNoteTag[]>(metadata.tags);
  const [tagKeyDraft, setTagKeyDraft] = useState("");
  const [tagValueDraft, setTagValueDraft] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"save" | "delete" | "">("");

  function addTag() {
    const key = normalizeTagKey(tagKeyDraft);
    const value = tagValueDraft.trim().replace(/\s+/g, " ");
    if (!key || !value) {
      setMessage("Add both a tag key and value, or leave tags blank.");
      return;
    }
    if (tagDrafts.some((tag) => tag.key.toLowerCase() === key.toLowerCase() && tag.value.toLowerCase() === value.toLowerCase())) {
      setMessage("That tag is already attached to this note.");
      return;
    }
    setTagDrafts((current) => [...current, { key, value }]);
    setTagKeyDraft("");
    setTagValueDraft("");
    setMessage("");
  }

  function importNoteText(text: string) {
    setBody((current) => current.trim() ? `${current}\n\n${text}` : text);
  }

  async function save() {
    if (!onUpdateComment || !body.trim()) {
      setMessage(body.trim() ? "This note cannot be edited from this view yet." : "Write a note before saving.");
      return;
    }
    setBusy("save");
    setMessage("");
    try {
      await onUpdateComment(comment.id, {
        targetType: "PROSPECT",
        targetId: prospect.id,
        body,
        visibility,
        metadataJson: { noteType, tags: normalizedDocumentTags(tagDrafts) }
      });
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update note.");
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!onDeleteComment) {
      setMessage("This note cannot be deleted from this view yet.");
      return;
    }
    setBusy("delete");
    setMessage("");
    try {
      await onDeleteComment(comment.id);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete note.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-studio-950/80 px-4 py-8 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="modal-card w-full max-w-5xl rounded-lg border border-white/10 bg-studio-950 p-4 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Prospect Note</p>
            <h3 className="mt-1 truncate text-xl font-semibold text-studio-100">{prospect.title}</h3>
            <p className="mt-1 text-xs text-studio-400">{userNameFromList(comment.createdById, users)} / {formatNoteTimestamp(comment.createdAt)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close note">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Note Type</span>
            <select className="field" value={noteType} onChange={(event) => setNoteType(event.target.value as HammerNoteType)}>
              {hammerNoteTypes.map((type) => <option key={type} value={type}>{noteTypeLabel(type)}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Visibility</span>
            <select className="field" value={visibility} onChange={(event) => setVisibility(event.target.value as HammerComment["visibility"])}>
              <option value="PROJECT_TEAM">Project Team</option>
              <option value="INTERNAL">Internal</option>
              <option value="EXECUTIVE_ONLY">Executive Only</option>
            </select>
          </label>
        </div>
        <label className="mt-3 grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Note</span>
          <textarea className="field min-h-[300px] whitespace-pre-wrap font-sans leading-6" value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
        <div className="mt-3">
          <NoteFileImportControl onImport={importNoteText} disabled={Boolean(busy)} />
        </div>
        <div className="mt-3 grid gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Tags</span>
          {tagDrafts.length ? (
            <div className="flex flex-wrap gap-1.5">
              {tagDrafts.map((tag, index) => (
                <span key={`${tag.key}-${tag.value}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                  <span className="truncate"><span className="text-emerald-300">{tag.key}</span>: {tag.value}</span>
                  <button type="button" onClick={() => setTagDrafts((current) => current.filter((_, currentIndex) => currentIndex !== index))} className="rounded-full text-emerald-100/70 transition hover:text-white" aria-label={`Remove ${tag.key} tag`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="grid gap-2 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] md:items-end">
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Key</span>
              <input className="field" value={tagKeyDraft} onChange={(event) => setTagKeyDraft(event.target.value)} placeholder="priority" />
            </label>
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Value</span>
              <input className="field" value={tagValueDraft} onChange={(event) => setTagValueDraft(event.target.value)} placeholder="follow-up" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} />
            </label>
            <button type="button" onClick={addTag} className="min-h-10 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-studio-200 transition hover:border-amberline/40 hover:text-amberline">Add</button>
          </div>
        </div>
        {message ? <p className="mt-3 rounded border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-studio-300">{message}</p> : null}
        <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-white/10 pt-3">
          <DangerButton label={busy === "delete" ? "Deleting..." : "Delete Note"} onClick={() => void remove()} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onClose} className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:text-amberline">Cancel</button>
            <button type="button" disabled={busy === "save" || !body.trim()} onClick={() => void save()} className="inline-flex items-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" />
              {busy === "save" ? "Saving..." : "Save Note"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProspectAssetsPanel({
  prospect,
  assets,
  currentUser,
  canManage,
  onUpload,
  onDelete
}: {
  prospect: HammerProjectLead;
  assets: ProspectAsset[];
  currentUser: HammerUser;
  canManage: boolean;
  onUpload?: (input: { prospectId: string; title: string; description: string; source: string; file: File }) => Promise<void>;
  onDelete?: (assetId: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onUpload || !file) {
      setMessage("Choose a file to upload.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await onUpload({
        prospectId: prospect.id,
        title: title.trim() || fileNameWithoutExtension(file.name),
        description: description.trim(),
        source: source.trim(),
        file
      });
      setTitle("");
      setDescription("");
      setSource("");
      setFile(null);
      event.currentTarget.reset();
      setMessage("File uploaded and associated to this prospect.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload asset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-md border border-white/10 bg-white/[0.025] p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Scripts & Materials</p>
          <p className="mt-1 text-[13px] leading-5 text-studio-300">Upload scripts, treatments, decks, notes, and reference images directly to this prospect.</p>
        </div>
        <Badge value={`${assets.length} file${assets.length === 1 ? "" : "s"}`} subtle />
      </div>
      {canManage && onUpload ? (
        <form onSubmit={submit} className="mt-3 grid gap-2">
          <div className="grid gap-2 md:grid-cols-[1fr_1fr]">
            <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Script or material title" />
            <input className="field" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short description" />
          </div>
          <input className="field" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Source: agency, contest, list, manager, referral" />
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <FileUploadPicker
              file={file}
              onFileChange={setFile}
              accept=".pdf,.doc,.docx,.txt,.md,image/*"
              label="Choose Script or File"
              helper="PDF, DOC, DOCX, TXT, MD, or image files"
            />
            <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-xs font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">
              <UploadCloud className="h-3.5 w-3.5" />
              Upload Script / File
            </button>
          </div>
          {message ? <p className="text-xs text-studio-300">{message}</p> : null}
        </form>
      ) : null}
      <div className="mt-3 grid gap-2">
        {assets.length ? assets.map((asset) => (
          <div key={asset.id} className="flex items-start justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] p-2.5">
            <div className="flex min-w-0 gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-studio-300">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-studio-100">{asset.title || asset.fileName}</p>
                <p className="mt-0.5 truncate text-xs text-studio-400">{asset.fileName} / {asset.fileType || "file"} / {formatBytes(asset.fileSize)}</p>
                {asset.source ? <p className="mt-1 text-xs text-studio-400">Source: {asset.source}</p> : null}
                {asset.description ? <p className="mt-1 text-xs leading-5 text-studio-300">{asset.description}</p> : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {asset.dataUrl ? <a href={asset.dataUrl} target="_blank" rel="noreferrer" className="rounded border border-white/10 px-1.5 py-1 text-[11px] font-semibold text-studio-300 hover:text-amberline">Open</a> : null}
              {canManage ? <DownloadFileLink fileName={asset.fileName} dataUrl={asset.dataUrl} resourceType="prospectAsset" resourceId={asset.id} currentUser={currentUser} compact /> : null}
              {canManage && onDelete ? (
                <button type="button" onClick={() => onDelete(asset.id)} className="rounded-md border border-white/10 p-2 text-studio-400 transition hover:border-rose-400/40 hover:text-rose-200" aria-label={`Delete ${asset.title || asset.fileName}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        )) : <EmptyState label="No scripts or materials uploaded for this prospect yet." />}
      </div>
    </div>
  );
}

function ProspectOwnerPicker({
  users,
  value,
  legacyOwner,
  onChange
}: {
  users: HammerUser[];
  value: string[];
  legacyOwner?: string;
  onChange: (ownerIds: string[]) => void;
}) {
  function toggle(userId: string) {
    onChange(value.includes(userId) ? value.filter((id) => id !== userId) : [...value, userId]);
  }

  return (
    <div className="grid gap-1 md:col-span-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Owners</span>
      <div className="grid max-h-36 gap-1 overflow-y-auto rounded-md border border-white/10 bg-white/[0.025] p-2 md:grid-cols-2">
        {users.map((user) => (
          <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-studio-300 transition hover:bg-white/[0.04] hover:text-studio-100">
            <input type="checkbox" checked={value.includes(user.id)} onChange={() => toggle(user.id)} />
            <span className="min-w-0 truncate">{user.name}</span>
            <span className="ml-auto text-[10px] uppercase tracking-[0.08em] text-studio-500">{statusLabel(user.role)}</span>
          </label>
        ))}
      </div>
      {legacyOwner && !value.length ? <p className="text-xs text-studio-500">Imported owner: {legacyOwner}</p> : null}
    </div>
  );
}

function SlateEditField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">{label}</span>
      <input className="field" value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function normalizeLeadPatch(draft: Partial<HammerProjectLead>) {
  return {
    ...draft,
    owner: draft.ownerIds?.length ? "" : draft.owner,
    title: draft.title?.trim() || undefined,
    creator: draft.creator?.trim() || undefined,
    genre: draft.genre?.trim() || undefined,
    urgencyLabel: draft.urgencyLabel?.trim() || undefined,
    priorityScore: draft.priorityScore === undefined || draft.priorityScore === null ? undefined : Number(draft.priorityScore)
  };
}

function projectLeadCoreEditablePatch(draft: Partial<HammerProjectLead>) {
  return {
    title: draft.title,
    logline: draft.logline,
    creator: draft.creator,
    urgencyLabel: draft.urgencyLabel,
    genre: draft.genre,
    priorityScore: draft.priorityScore,
    ownerIds: draft.ownerIds
  };
}

function SlateNextStepTaskCreator({
  lead,
  nextStep,
  projects,
  users,
  onCreateTask
}: {
  lead: HammerProjectLead;
  nextStep: string;
  projects: HammerProject[];
  users: HammerUser[];
  onCreateTask?: (input: { projectId?: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => void;
}) {
  const [assignedToId, setAssignedToId] = useState(users[0]?.id ?? "");
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [message, setMessage] = useState("");
  const fallbackProjectId = lead.promotedProjectId || projects[0]?.id || "";
  const taskTitle = `Slate follow-up: ${lead.title}`;

  function createSlateTask() {
    if (!onCreateTask || !fallbackProjectId || !assignedToId || !nextStep.trim()) {
      setMessage("Add step details, assignee, and project context first.");
      return;
    }
    onCreateTask({
      projectId: fallbackProjectId,
      title: taskTitle,
      description: nextStep.trim(),
      assignedToId,
      dueDate,
      priority,
      status: "TODO",
      targetType: "PROJECT_LEAD",
      targetId: lead.id
    });
    setMessage("Added to tasks.");
  }

  return (
    <div className="mt-3 rounded-md border border-white/10 bg-white/[0.025] p-2.5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Create Task From Step Details</p>
      <div className="grid gap-2">
        <select className="field" value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)}>
          {users.map((user) => <option key={user.id} value={user.id}>{user.name} / {statusLabel(user.role)}</option>)}
        </select>
        <div className="grid gap-2 md:grid-cols-[1fr_130px]">
          <input className="field" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <select className="field" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
            {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
          </select>
        </div>
        <button type="button" onClick={createSlateTask} disabled={!onCreateTask || !nextStep.trim()} className="rounded-md bg-amberline px-2.5 py-1.5 text-xs font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-45">
          Add to Tasks
        </button>
        {message ? <p className="text-xs text-studio-300">{message}</p> : null}
      </div>
    </div>
  );
}

function matchesFilter(filter: string, value?: string) {
  return filter === "ALL" || (value || "") === filter;
}

function matchesOwnerFilter(filter: string, lead: HammerProjectLead) {
  if (filter === "ALL") return true;
  return Boolean(lead.ownerIds?.includes(filter));
}

function prospectOwnerLabel(lead: HammerProjectLead, users: HammerUser[]) {
  const names = (lead.ownerIds ?? [])
    .map((ownerId) => users.find((user) => user.id === ownerId)?.name)
    .filter((name): name is string => Boolean(name));
  if (names.length) return names.join(", ");
  return lead.owner || "-";
}

function uniqueLeadOptions(leads: HammerProjectLead[], key: keyof HammerProjectLead) {
  return Array.from(new Set(leads.map((lead) => lead[key]).filter((value): value is string => typeof value === "string" && Boolean(value.trim())))).sort((a, b) => a.localeCompare(b)).slice(0, 160);
}

function ProjectCreateModal({ users, currentUser, onClose, onCreate }: { users: HammerUser[]; currentUser: HammerUser; onClose: () => void; onCreate: (draft: Partial<ProjectDraft>) => Promise<void> }) {
  const [draft, setDraft] = useState<ProjectDraft>({
    title: "",
    logline: "",
    type: "Feature",
    genre: "",
    status: "IDEA",
    stage: "DEVELOPMENT",
    ownerId: currentUser.id
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) {
      setMessage("Project title is required.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await onCreate(draft);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="modal-card my-6 w-full max-w-3xl rounded-lg border border-white/10 bg-studio-950 p-4 shadow-glow">
        <div className="flex items-start justify-between gap-3">
          <SectionHeader eyebrow="Development Slate" title="Create Slate Item" />
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close create project">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3">
          <input className="field" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Project title" />
          <textarea className="field min-h-24" value={draft.logline} onChange={(event) => setDraft({ ...draft, logline: event.target.value })} placeholder="Logline" />
          <div className="grid gap-3 md:grid-cols-2">
            <input className="field" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} placeholder="Feature, Series, Short..." />
            <input className="field" value={draft.genre} onChange={(event) => setDraft({ ...draft, genre: event.target.value })} placeholder="Genre" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <select className="field" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as HammerProjectStatus })}>
              {hammerProjectStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
            <select className="field" value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value as HammerProject["stage"] })}>
              {(["DEVELOPMENT", "SCRIPT", "TREATMENT", "VISDEV", "LOOKBOOK", "PACKAGING", "GREENLIGHT"] as HammerProject["stage"][]).map((stage) => <option key={stage} value={stage}>{statusLabel(stage)}</option>)}
            </select>
            <select className="field" value={draft.ownerId} onChange={(event) => setDraft({ ...draft, ownerId: event.target.value })}>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </div>
        </div>
        {message ? <p className="mt-3 rounded border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-studio-300">{message}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:text-amberline">Cancel</button>
          <button type="submit" disabled={busy} className="rounded bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">Create Slate Item</button>
        </div>
      </form>
    </div>
  );
}

function ProjectEditor({ users, currentUser, onCreate }: { users: HammerUser[]; currentUser: HammerUser; onCreate: (draft: Partial<ProjectDraft>) => Promise<void> }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProjectDraft>({
    title: "",
    logline: "",
    type: "Feature",
    genre: "",
    status: "IDEA",
    stage: "DEVELOPMENT",
    ownerId: currentUser.id
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) {
      setMessage("Project title is required.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await onCreate(draft);
      router.push("/projects");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel>
        <SectionHeader eyebrow="Development Slate" title="Create Slate Item" />
        <form onSubmit={submit} className="space-y-3">
          <input className="field" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Title" />
          <textarea className="field min-h-24" value={draft.logline} onChange={(event) => setDraft({ ...draft, logline: event.target.value })} placeholder="Logline" />
          <div className="grid gap-3 md:grid-cols-2">
            <input className="field" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} placeholder="Type" />
            <input className="field" value={draft.genre} onChange={(event) => setDraft({ ...draft, genre: event.target.value })} placeholder="Genre" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <select className="field" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as HammerProjectStatus })}>
              {hammerProjectStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
            <select className="field" value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value as HammerProject["stage"] })}>
              {(["DEVELOPMENT", "SCRIPT", "TREATMENT", "VISDEV", "LOOKBOOK", "PACKAGING", "GREENLIGHT"] as HammerProject["stage"][]).map((stage) => <option key={stage} value={stage}>{statusLabel(stage)}</option>)}
            </select>
            <select className="field" value={draft.ownerId} onChange={(event) => setDraft({ ...draft, ownerId: event.target.value })}>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </div>
          {message ? <p className="rounded border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-studio-300">{message}</p> : null}
          <button type="submit" disabled={busy} className="w-full rounded-md bg-amberline px-3 py-2 text-[13px] font-semibold text-studio-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">Create Slate Item</button>
        </form>
      </Panel>
      <Panel>
        <SectionHeader eyebrow="Access" title="Who Can Create Slate Items" />
        <p className="text-[13px] leading-5 text-studio-300">Admins, producers, and executives can create Development Slate items. New slate items are saved to the production database, assigned an owner, and appear in Development Slate for users with appropriate access.</p>
      </Panel>
    </div>
  );
}

function ProjectCreationMoved() {
  return (
    <Panel>
      <SectionHeader eyebrow="Admin" title="Project Creation Moved" />
      <p className="text-[13px] leading-5 text-studio-300">New projects are created from Admin so project setup can include status, owner, and access decisions in one place.</p>
      <Link href="/admin/users" className="mt-4 inline-flex rounded-md bg-amberline px-3 py-2 text-[13px] font-semibold text-studio-950">
        Open Admin
      </Link>
    </Panel>
  );
}

function EmptyWorkspaceState() {
  return (
    <Panel>
      <SectionHeader eyebrow="Setup" title="Create Your First Project" />
      <p className="max-w-2xl text-[13px] leading-5 text-studio-300">
        GreenLight is connected, but this database does not have any projects yet. Create a project from Admin, then scripts, documents, reference images, and assignments can attach to it.
      </p>
      <Link href="/admin/users" className="mt-4 inline-flex rounded-md bg-amberline px-3 py-2 text-[13px] font-semibold text-studio-950 hover:bg-emerald-300">
        Open Admin
      </Link>
    </Panel>
  );
}

function EmptyScriptState() {
  return (
    <Panel>
      <SectionHeader eyebrow="Scripts" title="Script Not Found" />
      <p className="max-w-2xl text-[13px] leading-5 text-studio-300">
        This script is not available in the current workspace. Open Development Slate or Prospects to upload or select another script in context.
      </p>
      <Link href="/projects" className="mt-4 inline-flex rounded-md bg-amberline px-3 py-2 text-[13px] font-semibold text-studio-950 hover:bg-emerald-300">
        Open Development Slate
      </Link>
    </Panel>
  );
}

function AccessDenied({ title, detail }: { title: string; detail: string }) {
  return (
    <Panel>
      <SectionHeader eyebrow="Restricted" title={title} />
      <p className="text-[13px] leading-5 text-studio-300">{detail}</p>
      <Link href="/dashboard" className="mt-4 inline-flex rounded-md border border-white/10 px-3 py-2 text-[13px] font-semibold text-studio-200 hover:text-amberline">
        Back to Dashboard
      </Link>
    </Panel>
  );
}

function LegacyRedirect({ title, detail, href, label }: { title: string; detail: string; href: string; label: string }) {
  return (
    <Panel>
      <SectionHeader eyebrow="Moved" title={title} />
      <p className="max-w-2xl text-[13px] leading-5 text-studio-300">{detail}</p>
      <Link href={href} className="mt-4 inline-flex rounded-md bg-amberline px-3 py-2 text-[13px] font-semibold text-studio-950 hover:bg-emerald-300">
        {label}
      </Link>
    </Panel>
  );
}

type ProjectWorkspaceTab = "overview" | "documents" | "assets";

type DocumentUploadInput = {
  projectId?: string;
  documentId?: string;
  title: string;
  type: DocumentType;
  writerName: string;
  source: string;
  file: File;
  notes: string;
};

type DocumentUploadResult = {
  document?: HammerDocument;
  version?: HammerDocumentVersion;
  uploadJob?: UploadJobSnapshot;
  warning?: string;
  extractionQueued?: boolean;
};

type UploadJobSnapshot = {
  id: string;
  requestId: string;
  status: "RECEIVED" | "STORED" | "PARSING" | "COMPLETE" | "WARNING" | "FAILED";
  stage: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath?: string;
  projectId?: string;
  documentId?: string;
  documentVersionId?: string;
  warning?: string;
  error?: string;
  characterCount?: number;
  versionNotes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

type UploadProgressStepId = "selected" | "uploading" | "stored" | "parsing" | "complete";
type UploadProgressState = "pending" | "active" | "done" | "warning" | "error";
type UploadProgressStep = { id: UploadProgressStepId; label: string; detail: string; state: UploadProgressState };

function ProjectWorkspace({
  project,
  activeTab,
  currentUser,
  users = hammerUsers,
  projects = hammerProjects,
  tasks = hammerTasks,
  documents = hammerDocuments,
  versions = hammerVersions,
  supportingDocuments = [],
  referenceImages = [],
  assets = hammerAssets,
  approvals = hammerApprovals,
  onUpload,
  onDelete,
  onAssignToProject,
  onReferenceUpload,
  onUpdateProject,
  onCreateTask
}: {
  project: HammerProject;
  activeTab: ProjectWorkspaceTab;
  currentUser: ReturnType<typeof hammerUserByEmail>;
  users?: HammerUser[];
  projects?: HammerProject[];
  tasks?: HammerTask[];
  documents?: HammerDocument[];
  versions?: HammerDocumentVersion[];
  supportingDocuments?: SupportingDocument[];
  referenceImages?: ProjectReferenceImage[];
  assets?: HammerAsset[];
  approvals?: HammerApproval[];
  onUpload?: (input: DocumentUploadInput) => Promise<DocumentUploadResult | void>;
  onDelete?: (documentId: string) => Promise<void> | void;
  onAssignToProject?: (documentId: string, projectId: string) => void;
  onReferenceUpload?: (input: { projectId: string; title: string; description: string; source: string; category: AssetType; file: File }) => Promise<void>;
  onUpdateProject?: (projectId: string, patch: Partial<HammerProject>) => Promise<void>;
  onCreateTask?: (input: { projectId?: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => void;
}) {
  const docs = documents.filter((doc) => doc.projectId === project.id);
  const scriptDocs = docs.filter((doc) => ["SCRIPT", "TREATMENT", "OUTLINE"].includes(doc.type));
  const projectSupportingDocs = supportingDocuments.filter((supportingDocument) => docs.some((doc) => doc.id === supportingDocument.scriptDocumentId));
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const projectAssets = assets.filter((asset) => asset.projectId === project.id);
  const projectReferenceImages = [
    ...referenceImages.filter((image) => image.projectId === project.id),
    ...demoReferenceImages.filter((image) => image.projectId === project.id)
  ];
  const projectApprovals = approvals.filter((approval) => approval.projectId === project.id);
  const firstScript = docs.find((doc) => doc.type === "SCRIPT") ?? docs[0];
  const latestVersion = firstScript ? currentVersionFor(firstScript.id, documents, versions) : undefined;
  const openTasks = projectTasks.filter((task) => task.status !== "DONE" && task.status !== "ARCHIVED");
  const canViewAllProjectAssignments = canViewAllProjectTasks(currentUser.role);
  const canDownload = canDownloadFiles(currentUser.role);
  const visibleOpenTasks = canViewAllProjectAssignments ? openTasks : openTasks.filter((task) => task.assignedToId === currentUser.id);
  const pendingReviews = projectApprovals.filter((approval) => approval.status === "REQUESTED" || approval.status === "CHANGES_REQUESTED");
  const tabs = [
    { id: "overview", label: "Overview", href: `/projects/${project.id}` },
    { id: "documents", label: "Scripts & Docs", href: `/projects/${project.id}/documents` },
    { id: "breakdown", label: "Breakdown", href: firstScript ? `/scripts/${firstScript.id}/breakdown` : `/projects/${project.id}/documents` },
    { id: "assets", label: "Reference", href: `/projects/${project.id}/assets` },
    { id: "tasks", label: "Tasks", href: "/tasks" },
  ];

  return (
    <div className="space-y-4">
      <section className="project-hero rounded-lg border border-white/10 bg-studio-850/60 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge value={project.status} />
              <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-studio-300">Updated {project.updatedAt}</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-studio-100">{project.title}</h2>
            <ProjectLoglineEditor project={project} onUpdateProject={onUpdateProject} />
          </div>
          <div className="grid min-w-[260px] grid-cols-2 gap-x-5 gap-y-2 text-[13px]">
            <div className="col-span-2 flex justify-end"><ShareButton title={project.title} type="Development Slate" status={project.status} summary={project.logline} href={`/projects/${project.id}`} /></div>
            <ProjectMeta label="Type" value={project.type} />
            <ProjectMeta label="Genre" value={project.genre} />
            <ProjectMeta label="Owner" value={userName(project.ownerId)} />
            <ProjectMeta label="Status" value={statusLabel(project.status)} />
          </div>
        </div>
        <nav className="mt-4 flex gap-1 overflow-x-auto border-t border-white/10 pt-3" aria-label="Project sections">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1.5 text-[13px] font-semibold text-studio-300 transition hover:bg-white/[0.04] hover:text-studio-100",
                activeTab === tab.id && "bg-white/[0.07] text-amberline"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </section>

      {activeTab === "overview" ? (
        <div className="space-y-4">
            <Panel>
              <SectionHeader eyebrow="Artist Start Here" title="Assignments and Working Brief" action={<div className="flex flex-wrap gap-1.5">{onCreateTask ? <NewAssignmentButton project={project} firstScript={firstScript} users={users} onCreateTask={onCreateTask} /> : null}<TableLink href="/tasks">Open tasks</TableLink></div>} />
              <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-md border border-white/10 bg-white/[0.03] p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-studio-100">Creative source</p>
                    {latestVersion ? <Badge value={latestVersion.status} /> : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-studio-300">{firstScript ? `${firstScript.title} / v${latestVersion?.versionNumber ?? 1}` : "No script has been attached yet."}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-studio-400">{project.logline}</p>
                  {firstScript ? <div className="mt-2 flex flex-wrap gap-1.5"><TableLink href={`/scripts/${firstScript.id}`}>Open script</TableLink><TableLink href={`/scripts/${firstScript.id}/breakdown`}>Breakdown</TableLink></div> : null}
                </div>
                <div>
                  {visibleOpenTasks.length ? <CompactTaskRows tasks={visibleOpenTasks.slice(0, 4)} /> : <EmptyState label={canViewAllProjectAssignments ? `No open tasks for ${project.title}.` : `No tasks assigned to you for ${project.title}.`} />}
                </div>
              </div>
            </Panel>
            <Panel>
              <SectionHeader eyebrow="Creative Packet" title="Scripts and Supporting Docs" action={<TableLink href={`/projects/${project.id}/documents`}>Manage files</TableLink>} />
              <div className="grid gap-3 xl:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-studio-100">Associated Scripts</h3>
                  <ProjectScriptFileList docs={scriptDocs.slice(0, 4)} versions={versions} canDownload={canDownload} currentUser={currentUser} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-studio-100">Supporting Documentation</h3>
                  <ProjectSupportingDocs docs={docs} versions={versions} supportingDocuments={projectSupportingDocs} canDownload={canDownload} currentUser={currentUser} />
                </div>
              </div>
            </Panel>
            <Panel>
              <SectionHeader eyebrow="Visual Reference" title="Reference Images" action={<TableLink href={`/projects/${project.id}/assets`}>Open reference</TableLink>} />
              <ReferenceImageGrid images={projectReferenceImages.slice(0, 6)} assets={projectAssets.slice(0, 6)} canDownload={canDownload} currentUser={currentUser} />
            </Panel>
        </div>
      ) : null}

      {activeTab === "documents" ? <Scripts projectId={project.id} documents={documents} versions={versions} projects={projects} currentUser={currentUser} onUpload={onUpload} onDelete={onDelete} onAssignToProject={canManageScriptLibrary(currentUser.role) ? onAssignToProject : undefined} /> : null}
      {activeTab === "assets" ? <ProjectReferenceWorkspace project={project} assets={projectAssets} referenceImages={projectReferenceImages} canDownload={canDownload} currentUser={currentUser} onReferenceUpload={onReferenceUpload} /> : null}
    </div>
  );
}

function ProjectLoglineEditor({ project, onUpdateProject }: { project: HammerProject; onUpdateProject?: (projectId: string, patch: Partial<HammerProject>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [logline, setLogline] = useState(project.logline);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!editing) setLogline(project.logline);
  }, [editing, project.logline]);

  async function save() {
    if (!onUpdateProject) return;
    setBusy(true);
    setMessage("");
    try {
      await onUpdateProject(project.id, { logline: logline.trim() });
      setEditing(false);
      setMessage("Logline saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save logline.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-2 w-full max-w-4xl">
        <p className="text-[13px] leading-5 text-studio-300">{project.logline || "No logline provided."}</p>
        <div className="mt-2 flex items-center gap-2">
          {onUpdateProject ? (
            <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline">
              <Pencil className="h-3 w-3" />
              Edit Logline
            </button>
          ) : null}
          {message ? <span className="text-xs text-studio-400">{message}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 w-full max-w-none rounded-lg border border-amberline/25 bg-white/[0.035] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <label className="grid gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Logline</span>
        <textarea
          className="field min-h-24 resize-y text-[14px] leading-6"
          value={logline}
          onChange={(event) => setLogline(event.target.value)}
          placeholder="Write the concise creative premise for this Development Slate item."
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-studio-400">{logline.trim().length} characters</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setEditing(false); setLogline(project.logline); }} className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:text-amberline">Cancel</button>
          <button type="button" disabled={busy} onClick={save} className="rounded bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">Save Logline</button>
        </div>
      </div>
      {message ? <p className="mt-2 text-xs text-studio-300">{message}</p> : null}
    </div>
  );
}

function ProjectSupportingDocs({ docs, versions, supportingDocuments, canDownload, currentUser }: { docs: HammerDocument[]; versions: HammerDocumentVersion[]; supportingDocuments: SupportingDocument[]; canDownload: boolean; currentUser: HammerUser }) {
  const directDocs = docs.filter((doc) => ["NOTES", "COVERAGE", "BUSINESS_DOCUMENT"].includes(doc.type));
  const items = [
    ...directDocs.map((doc) => {
      const version = currentVersionFor(doc.id, docs, versions);
      return {
        id: doc.id,
        title: doc.title,
        detail: version?.fileName ?? statusLabel(doc.type),
        href: `/scripts/${doc.id}`,
        fileName: version?.fileName ?? `${doc.title}.txt`,
        dataUrl: version?.dataUrl,
        fallbackText: version?.extractedText,
        resourceType: version ? "documentVersion" as const : undefined,
        resourceId: version?.id
      };
    }),
    ...supportingDocuments.map((doc) => ({
      id: doc.id,
      title: doc.title,
      detail: doc.source ? `${doc.fileName} / ${doc.source}` : doc.fileName,
      href: undefined,
      fileName: doc.fileName,
      dataUrl: doc.dataUrl,
      fallbackText: doc.extractedText,
      source: doc.source,
      resourceType: "supportingDocument" as const,
      resourceId: doc.id
    }))
  ];
  if (!items.length) return <EmptyState label="No context docs yet. Add coverage, notes, deck pages, or correspondence from a script's Files tab." />;
  return (
    <div className="grid gap-2">
      {items.slice(0, 5).map((item) => {
        const text = (
          <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-studio-100">{item.title}</p>
              <p className="mt-0.5 truncate text-xs text-studio-400">{item.detail}</p>
          </div>
        );
        return (
          <div key={item.id} className="flex items-start justify-between gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 transition hover:border-amberline/30 hover:bg-white/[0.05]">
            {item.href ? <Link href={item.href} className="min-w-0">{text}</Link> : text}
            {canDownload ? <DownloadFileLink fileName={item.fileName} dataUrl={item.dataUrl} fallbackText={item.fallbackText} resourceType={item.resourceType} resourceId={item.resourceId} currentUser={currentUser} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function ProjectScriptFileList({ docs, versions, canDownload, currentUser }: { docs: HammerDocument[]; versions: HammerDocumentVersion[]; canDownload: boolean; currentUser: HammerUser }) {
  if (!docs.length) return <EmptyState label="No scripts, treatments, or outlines attached yet." />;
  return (
    <div className="grid gap-2">
      {docs.map((doc) => {
        const version = currentVersionFor(doc.id, docs, versions);
        return (
          <div key={doc.id} className="flex items-start justify-between gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 transition hover:border-amberline/30 hover:bg-white/[0.05]">
            <Link href={`/scripts/${doc.id}`} className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-studio-100">{doc.title}</p>
              <p className="mt-0.5 truncate text-xs text-studio-400">{version?.fileName ?? statusLabel(doc.type)}</p>
            </Link>
            {canDownload && version ? <DownloadFileLink fileName={version.fileName} dataUrl={version.dataUrl} fallbackText={version.extractedText} resourceType="documentVersion" resourceId={version.id} currentUser={currentUser} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function NewAssignmentButton({
  project,
  firstScript,
  users = hammerUsers,
  onCreateTask
}: {
  project: HammerProject;
  firstScript?: HammerDocument;
  users?: HammerUser[];
  onCreateTask: (input: { projectId?: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => void;
}) {
  const defaultArtistId = users.find((user) => user.role === "ARTIST")?.id ?? users[0]?.id ?? "";
  const defaultDevelopmentId = users.find((user) => user.role === "DEVELOPMENT")?.id ?? users[0]?.id ?? "";
  const presets = [
    { label: "Environment Previz", title: "Create environment previz pass", assignee: defaultArtistId, priority: "HIGH" as TaskPriority, description: "Use the current script, project references, and breakdown notes to create an environment previz pass." },
    { label: "Character Reference", title: "Create character reference sheet", assignee: defaultArtistId, priority: "MEDIUM" as TaskPriority, description: "Build visual reference for the assigned character or role based on the current creative packet." },
    { label: "Coverage Read", title: "Read and summarize project materials", assignee: defaultDevelopmentId, priority: "MEDIUM" as TaskPriority, description: "Review the script and supporting documents, then add notes for the team." },
    { label: "Review Breakdown", title: "Review script breakdown", assignee: defaultDevelopmentId, priority: "HIGH" as TaskPriority, description: "Check scenes, characters, locations, props, and action moments for accuracy." }
  ];
  const [open, setOpen] = useState(false);
  const [presetIndex, setPresetIndex] = useState(0);
  const selectedPreset = presets[presetIndex];
  const [title, setTitle] = useState(selectedPreset.title);
  const [assignedToId, setAssignedToId] = useState(selectedPreset.assignee);
  const [priority, setPriority] = useState<TaskPriority>(selectedPreset.priority);
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [description, setDescription] = useState(selectedPreset.description);
  const [message, setMessage] = useState("");

  function applyPreset(index: number) {
    const preset = presets[index];
    setPresetIndex(index);
    setTitle(preset.title);
    setAssignedToId(preset.assignee);
    setPriority(preset.priority);
    setDescription(preset.description);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreateTask({
      projectId: project.id,
      title,
      description,
      assignedToId,
      dueDate,
      priority,
      status: "TODO",
      targetType: firstScript ? "DOCUMENT" : "PROJECT",
      targetId: firstScript?.id ?? project.id
    });
    setMessage("Assignment created.");
    setOpen(false);
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} className="inline-flex items-center gap-1.5 rounded-md bg-amberline px-2.5 py-1.5 text-xs font-semibold text-studio-950 transition hover:bg-emerald-300">
        <Plus className="h-3.5 w-3.5" />
        New Assignment
      </button>
      {message ? <span className="ml-2 text-[11px] text-studio-400">{message}</span> : null}
      {open ? (
        <form onSubmit={submit} className="absolute right-0 top-9 z-20 w-[min(420px,calc(100vw-96px))] space-y-2 rounded-lg border border-white/10 bg-studio-950 p-3 shadow-glow">
          <div className="grid gap-2 md:grid-cols-2">
            <select className="field" value={presetIndex} onChange={(event) => applyPreset(Number(event.target.value))}>
              {presets.map((preset, index) => <option key={preset.label} value={index}>{preset.label}</option>)}
            </select>
            <select className="field" value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)}>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name} / {statusLabel(user.role)}</option>)}
            </select>
          </div>
          <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task title" />
          <div className="grid gap-2 md:grid-cols-2">
            <input className="field" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            <select className="field" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
            </select>
          </div>
          <textarea className="field min-h-20" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Assignment details" />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-studio-400">Linked to {firstScript?.title ?? project.title}</p>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setOpen(false)} className="rounded border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-studio-300 hover:text-amberline">Cancel</button>
              <button type="submit" className="rounded bg-amberline px-2.5 py-1.5 text-xs font-semibold text-studio-950 hover:bg-emerald-300">Create</button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function ProjectReferenceWorkspace({
  project,
  assets,
  referenceImages,
  canDownload,
  currentUser,
  onReferenceUpload
}: {
  project: HammerProject;
  assets: HammerAsset[];
  referenceImages: ProjectReferenceImage[];
  canDownload: boolean;
  currentUser: HammerUser;
  onReferenceUpload?: (input: { projectId: string; title: string; description: string; source: string; category: AssetType; file: File }) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <Panel>
        <SectionHeader eyebrow={project.title} title="Reference Images" action={onReferenceUpload ? undefined : <PrimaryButton icon={UploadCloud} label="Upload Reference" />} />
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          {onReferenceUpload ? <ReferenceUpload projectId={project.id} onUpload={onReferenceUpload} /> : null}
          <ReferenceImageGrid images={referenceImages} assets={assets} canDownload={canDownload} currentUser={currentUser} />
        </div>
      </Panel>
    </div>
  );
}

function ReferenceUpload({
  projectId,
  onUpload
}: {
  projectId: string;
  onUpload: (input: { projectId: string; title: string; description: string; source: string; category: AssetType; file: File }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState<AssetType>("MOOD_IMAGE");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setStatus("Choose an image file first.");
      return;
    }
    setStatus("Adding reference...");
    try {
      await onUpload({ projectId, title, description, source, category, file });
      setTitle("");
      setDescription("");
      setSource("");
      setCategory("MOOD_IMAGE");
      setFile(null);
      setStatus("Added.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border border-amberline/20 bg-amberline/5 p-3">
      <div className="flex items-center gap-2">
        <ImagePlus className="h-4 w-4 text-amberline" />
        <div>
          <p className="text-[13px] font-semibold text-studio-100">Upload Reference</p>
          <p className="text-xs text-studio-400">Mood, environment, character, prop, storyboard, or keyframe.</p>
        </div>
      </div>
      <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Reference title" />
      <input className="field" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Source: agency, contest, list, vendor, internal" />
      <select className="field" value={category} onChange={(event) => setCategory(event.target.value as AssetType)}>
        {(["MOOD_IMAGE", "ENVIRONMENT_REFERENCE", "CHARACTER_REFERENCE", "PROP_REFERENCE", "KEYFRAME", "STORYBOARD", "LOOKBOOK_PAGE", "OTHER"] as AssetType[]).map((type) => (
          <option key={type} value={type}>{statusLabel(type)}</option>
        ))}
      </select>
      <textarea className="field min-h-16" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Why this reference matters" />
      <FileUploadPicker
        resetKey={status === "Added." ? "cleared" : "ready"}
        file={file}
        onFileChange={setFile}
        accept="image/png,image/jpeg,image/webp,image/gif"
        label="Choose Reference Image"
        helper="PNG, JPEG, WEBP, or GIF"
      />
      {status ? <p className="text-xs text-studio-300">{status}</p> : null}
      <PrimaryButton icon={UploadCloud} label="Add Reference" />
    </form>
  );
}

function ReferenceImageGrid({ images, assets = [], canDownload = false, currentUser }: { images: ProjectReferenceImage[]; assets?: HammerAsset[]; canDownload?: boolean; currentUser: HammerUser }) {
  const assetImages: ProjectReferenceImage[] = assets.map((asset) => ({
    id: asset.id,
    projectId: asset.projectId,
    title: asset.title,
    description: asset.description,
    source: asset.source,
    category: asset.assetType,
    status: asset.status,
    fileName: asset.fileName,
    imageUrl: asset.imageUrl,
    demoTone: asset.assetType === "PROP_REFERENCE" ? "steel" : "neon",
    uploadedAt: "GCS metadata"
  }));
  const allImages = [...images, ...assetImages];
  if (!allImages.length) return <EmptyState label="No reference images yet. Upload environment, character, prop, mood, keyframe, or storyboard references." />;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {allImages.map((image) => (
        <div key={image.id} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
          <ReferenceImagePreview image={image} />
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold text-studio-100">{image.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-studio-300">{image.description}</p>
                {image.source ? <p className="mt-1 text-xs text-studio-400">Source: {image.source}</p> : null}
              </div>
              <Badge value={image.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge value={image.category} subtle />
              <span className="rounded border border-white/10 bg-white/[0.025] px-1.5 py-1 text-[11px] text-studio-400">{image.fileName}</span>
              {image.source ? <span className="rounded border border-white/10 bg-white/[0.025] px-1.5 py-1 text-[11px] text-studio-400">Source: {image.source}</span> : null}
              {canDownload ? <DownloadFileLink fileName={image.fileName} dataUrl={image.imageUrl} resourceType={image.id.startsWith("asset-") ? "asset" : undefined} resourceId={image.id.startsWith("asset-") ? image.id : undefined} currentUser={currentUser} compact /> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReferenceImagePreview({ image }: { image: ProjectReferenceImage }) {
  if (image.imageUrl) {
    return <img src={image.imageUrl} alt="" className="aspect-video w-full object-cover" />;
  }
  return (
    <div className={cn("relative flex aspect-video items-end overflow-hidden p-3", referenceToneClass(image.demoTone))}>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_40%),radial-gradient(circle_at_72%_20%,rgba(255,255,255,0.24),transparent_20%)]" />
      <div className="relative">
        <p className="font-display text-[10px] uppercase tracking-[0.16em] text-white/75">{statusLabel(image.category)}</p>
        <p className="mt-1 text-sm font-semibold text-white">{image.title}</p>
      </div>
    </div>
  );
}

function Scripts({
  projectId,
  activeProjectId,
  currentUser,
  projects = hammerProjects,
  compact = false,
  documents = hammerDocuments,
  versions = hammerVersions,
  onUpload,
  onDelete,
  onAssignToProject,
  selectedSection,
  repositoryMode = false
}: {
  projectId?: string;
  activeProjectId?: string;
  currentUser?: ReturnType<typeof hammerUserByEmail>;
  projects?: HammerProject[];
  compact?: boolean;
  documents?: HammerDocument[];
  versions?: HammerDocumentVersion[];
  onUpload?: (input: DocumentUploadInput) => Promise<DocumentUploadResult | void>;
  onDelete?: (documentId: string) => Promise<void> | void;
  onAssignToProject?: (documentId: string, projectId: string) => void;
  selectedSection?: ScriptLibrarySection;
  repositoryMode?: boolean;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<"INBOX" | "ACTIVE">("INBOX");
  const [librarySearch, setLibrarySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ScriptStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "ALL">("ALL");
  const scopedProjectId = projectId ?? activeProjectId;
  const projectNameForId = (lookupProjectId?: string) => lookupProjectId ? projectTitleFromList(lookupProjectId, projects) : "Inbox";
  const canManageLibrary = canManageScriptLibrary(currentUser?.role);
  const canDownload = canDownloadFiles(currentUser?.role);
  const assignedProjectIds = new Set(currentUser ? assignedProjectsForUser(currentUser.id).map((assignedProject) => assignedProject.id) : []);
  const requestedSection = selectedSection ?? (canManageLibrary ? "inbox" : "projects");
  const effectiveSection = !canManageLibrary && requestedSection !== "projects" ? "projects" : requestedSection;
  const scriptDocuments = documents.filter((doc) => ["SCRIPT", "TREATMENT", "OUTLINE", "NOTES", "COVERAGE", "BUSINESS_DOCUMENT"].includes(doc.type));
  const visibleScriptDocuments = scriptDocuments.filter((doc) => canManageLibrary || Boolean(doc.projectId && assignedProjectIds.has(doc.projectId)));
  const filteredDocuments = scriptDocuments.filter((doc) => {
    if (!visibleScriptDocuments.some((visibleDocument) => visibleDocument.id === doc.id)) return false;
    if (!["SCRIPT", "TREATMENT", "OUTLINE", "NOTES", "COVERAGE", "BUSINESS_DOCUMENT"].includes(doc.type)) return false;
    const version = currentVersionFor(doc.id, documents, versions);
    if (statusFilter !== "ALL" && version?.status !== statusFilter) return false;
    if (typeFilter !== "ALL" && doc.type !== typeFilter) return false;
    const haystack = `${doc.title} ${doc.writerName ?? ""} ${doc.source ?? ""} ${documentTagSearchText(doc)} ${doc.projectId ? projectNameForId(doc.projectId) : "Inbox"} ${version?.status ?? ""}`.toLowerCase();
    return !librarySearch.trim() || haystack.includes(librarySearch.toLowerCase());
  });
  const docs = filteredDocuments.filter((doc) => !scopedProjectId || doc.projectId === scopedProjectId);
  const incomingDocs = filteredDocuments.filter((doc) => !doc.projectId);
  const projectDocs = filteredDocuments.filter((doc) => doc.projectId);
  const allDocs = filteredDocuments;
  const groupingProjects = projectsForDocumentGroups(projects, projectDocs);
  const groupedProjectDocs = groupingProjects
    .filter((project) => canManageLibrary || assignedProjectIds.has(project.id))
    .map((project) => ({
      project,
      docs: projectDocs.filter((doc) => doc.projectId === project.id)
    }))
    .filter((group) => group.docs.length);
  const activeProjectDocs = projectDocs.filter((doc) => doc.projectId === scopedProjectId);
  const projectName = scopedProjectId ? projectNameForId(scopedProjectId) : undefined;

  useEffect(() => {
    if (!canManageLibrary && uploadTarget === "INBOX") {
      setUploadTarget("ACTIVE");
    }
  }, [canManageLibrary, uploadTarget]);

  if (!repositoryMode) {
    return (
      <Panel>
        <SectionHeader
          eyebrow={projectName ? `Showing ${projectName}` : "Repository"}
          title={compact ? "Documents" : "Scripts and Treatments"}
          action={onUpload ? <PrimaryButton icon={Plus} label="Add Document" onClick={() => setUploadOpen(true)} /> : undefined}
        />
        {uploadOpen && onUpload ? <DocumentUploadPanel projectId={scopedProjectId} documents={docs} onUpload={onUpload} onDone={() => setUploadOpen(false)} onCancel={() => setUploadOpen(false)} /> : null}
        <DocumentRows docs={docs} versions={versions} projects={projects} currentUser={currentUser} canDownload={canDownload} omitProject={Boolean(projectId)} onDelete={onDelete} assignableProjects={projects} defaultProjectId={scopedProjectId} emptyLabel={projectName ? `No documents for ${projectName} yet. Upload a script, treatment, outline, or coverage document.` : "No documents match this view."} />
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel>
        <SectionHeader
          eyebrow="Central Hub"
          title="Scripts"
          action={onUpload ? (
            <div className="flex flex-wrap gap-1.5">
              {canManageLibrary ? <button type="button" onClick={() => { setUploadTarget("INBOX"); setUploadOpen(true); }} className="ui-button inline-flex items-center gap-1.5 rounded-md bg-amberline px-2.5 py-1.5 text-xs font-semibold text-studio-950 transition hover:bg-emerald-300"><Plus className="h-3.5 w-3.5" />Add Incoming Document</button> : null}
              <button type="button" onClick={() => { setUploadTarget("ACTIVE"); setUploadOpen(true); }} className={cn("ui-button inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition", canManageLibrary ? "border border-white/10 bg-white/[0.025] text-studio-200 hover:border-amberline/40 hover:text-amberline" : "bg-amberline text-studio-950 hover:bg-emerald-300")}><Plus className="h-3.5 w-3.5" />Add Project Document</button>
            </div>
          ) : undefined}
        />
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <ScriptSectionLink href="/scripts?section=inbox" label="Inbox" active={effectiveSection === "inbox"} count={incomingDocs.length} disabled={!canManageLibrary} />
          <ScriptSectionLink href="/scripts?section=projects" label="Development Slate" active={effectiveSection === "projects"} count={projectDocs.length} />
          {canManageLibrary ? <ScriptSectionLink href="/scripts?section=all" label="Library" active={effectiveSection === "all"} count={allDocs.length} subtle /> : null}
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_180px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-studio-400" />
            <input className="field pl-8" value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="Search title, writer, project, source" />
          </div>
          <select className="field" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as DocumentType | "ALL")}>
            <option value="ALL">All types</option>
            {(["SCRIPT", "TREATMENT", "OUTLINE", "NOTES", "COVERAGE", "BUSINESS_DOCUMENT"] as DocumentType[]).map((documentType) => (
              <option key={documentType} value={documentType}>{statusLabel(documentType)}</option>
            ))}
          </select>
          <select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ScriptStatus | "ALL")}>
            <option value="ALL">All statuses</option>
            {hammerScriptStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </select>
        </div>
        {uploadOpen && onUpload ? (
          <DocumentUploadPanel
              projectId={uploadTarget === "INBOX" ? undefined : scopedProjectId}
              documents={uploadTarget === "INBOX" ? incomingDocs : activeProjectDocs}
              onUpload={onUpload}
              onDone={() => setUploadOpen(false)}
              onCancel={() => setUploadOpen(false)}
            />
        ) : null}
      </Panel>

      {effectiveSection === "inbox" && canManageLibrary ? (
        <ScriptLibraryPanel title="Incoming Scripts" eyebrow="Triage" count={incomingDocs.length} description="Unassigned submissions and specs that have not been attached to a project yet.">
          <DocumentRows docs={incomingDocs} versions={versions} projects={projects} currentUser={currentUser} canDownload={canDownload} showInboxMeta onDelete={onDelete} onAssignToProject={onAssignToProject} assignableProjects={projects} defaultProjectId={scopedProjectId} emptyLabel="No incoming scripts match these filters." />
        </ScriptLibraryPanel>
      ) : null}

      {effectiveSection === "inbox" && !canManageLibrary ? (
        <ScriptLibraryPanel title="Active Project Scripts" eyebrow="Assigned Access" count={projectDocs.length} description="Incoming submissions are limited to producers, executives, and admins. Your scripts are grouped by the projects you can access.">
          <GroupedProjectDocuments groups={groupedProjectDocs} versions={versions} projects={projects} currentUser={currentUser} canDownload={canDownload} canManageLibrary={canManageLibrary} onDelete={onDelete} />
        </ScriptLibraryPanel>
      ) : null}

      {effectiveSection === "projects" ? (
        <ScriptLibraryPanel title="Active Project Scripts" eyebrow="By Project" count={projectDocs.length} description="Scripts, treatments, outlines, notes, decks, and coverage grouped by project so the library is not dependent on the top project switcher.">
          <GroupedProjectDocuments groups={groupedProjectDocs} versions={versions} projects={projects} currentUser={currentUser} canDownload={canDownload} canManageLibrary={canManageLibrary} onDelete={onDelete} />
        </ScriptLibraryPanel>
      ) : null}

      {effectiveSection === "all" ? (
        <ScriptLibraryPanel title="Library" eyebrow="Manager View" count={allDocs.length} description={canManageLibrary ? "A complete manager view across incoming submissions and active project documents." : "Everything you can access across your assigned projects."}>
          <DocumentRows docs={allDocs} versions={versions} projects={projects} currentUser={currentUser} canDownload={canDownload} showInboxMeta={canManageLibrary} onDelete={onDelete} onAssignToProject={canManageLibrary ? onAssignToProject : undefined} assignableProjects={projects} defaultProjectId={scopedProjectId} emptyLabel="No scripts match these filters." />
        </ScriptLibraryPanel>
      ) : null}

    </div>
  );
}

function ScriptSectionLink({ href, label, active, count, disabled = false, subtle = false }: { href: string; label: string; active: boolean; count: number; disabled?: boolean; subtle?: boolean }) {
  if (disabled) {
    return <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs font-semibold text-studio-500">{label}</span>;
  }
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition",
        active ? "border-amberline/45 bg-amberline/10 text-amberline" : subtle ? "border-white/10 bg-transparent text-studio-400 hover:border-white/20 hover:text-studio-200" : "border-white/10 bg-white/[0.025] text-studio-300 hover:border-amberline/35 hover:text-amberline"
      )}
    >
      {label}
      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-amberline text-studio-950" : "bg-white/[0.06] text-studio-300")}>{count}</span>
    </Link>
  );
}

function GroupedProjectDocuments({
  groups,
  versions,
  projects,
  currentUser,
  canDownload,
  canManageLibrary,
  onDelete
}: {
  groups: Array<{ project: HammerProject; docs: HammerDocument[] }>;
  versions: HammerDocumentVersion[];
  projects: HammerProject[];
  currentUser?: HammerUser;
  canDownload?: boolean;
  canManageLibrary: boolean;
  onDelete?: (documentId: string) => void;
}) {
  if (!groups.length) return <EmptyState label="No project scripts match these filters." />;
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.project.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-studio-100">{group.project.title}</h3>
              <p className="text-xs text-studio-400">{statusLabel(group.project.status)}</p>
            </div>
            <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-studio-300">{group.docs.length}</span>
          </div>
          <DocumentRows docs={group.docs} versions={versions} projects={projects} currentUser={currentUser} canDownload={canDownload} omitProject showInboxMeta={canManageLibrary} onDelete={onDelete} assignableProjects={projects} defaultProjectId={group.project.id} emptyLabel={`No scripts for ${group.project.title} match these filters.`} />
        </div>
      ))}
    </div>
  );
}

function ScriptLibraryPanel({ eyebrow, title, count, description, children }: { eyebrow: string; title: string; count?: number; description: string; children: React.ReactNode }) {
  return (
    <Panel>
      <div className="mb-3">
        <p className="font-display text-[10px] uppercase tracking-[0.16em] text-amberline">{eyebrow}</p>
        <div className="mt-1 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-studio-100">{title}{typeof count === "number" ? <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-studio-300">{count}</span> : null}</h2>
          <p className="max-w-2xl text-xs leading-5 text-studio-400">{description}</p>
        </div>
      </div>
      {children}
    </Panel>
  );
}

function DocumentUploadPanel({
  projectId,
  documents,
  onUpload,
  onDone,
  onCancel
}: {
  projectId?: string;
  documents: HammerDocument[];
  onUpload: (input: DocumentUploadInput) => Promise<DocumentUploadResult | void>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [documentId, setDocumentId] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [autoTitle, setAutoTitle] = useState("");
  const [writerName, setWriterName] = useState("");
  const [source, setSource] = useState("");
  const [type, setType] = useState<DocumentType>("SCRIPT");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState<"idle" | "working" | "success" | "warning" | "error">("idle");
  const [progressSteps, setProgressSteps] = useState<UploadProgressStep[]>(uploadProgressSteps());
  const [recentUploadJobs, setRecentUploadJobs] = useState<UploadJobSnapshot[]>([]);
  const [busy, setBusy] = useState(false);
  const selectedDocument = documents.find((document) => document.id === documentId);

  useEffect(() => {
    if (selectedDocument) {
      setTitle(selectedDocument.title);
      setTitleTouched(false);
      setAutoTitle("");
      setType(selectedDocument.type);
      setWriterName(selectedDocument.writerName ?? "");
      setSource(selectedDocument.source ?? "");
    }
  }, [selectedDocument]);

  function updateProgress(stepId: UploadProgressStepId, state: UploadProgressState, detail?: string) {
    setProgressSteps((current) => current.map((step) => step.id === stepId ? { ...step, state, detail: detail ?? step.detail } : step));
  }

  const refreshRecentUploads = useCallback(async (nextDocumentId = documentId) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams({ recent: "1" });
    if (projectId) params.set("projectId", projectId);
    if (nextDocumentId) params.set("documentId", nextDocumentId);
    const response = await fetch(`/api/hammer/document-upload?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json().catch(() => null) as { uploadJobs?: UploadJobSnapshot[] } | null;
    setRecentUploadJobs(data?.uploadJobs ?? []);
  }, [documentId, projectId]);

  useEffect(() => {
    void refreshRecentUploads();
  }, [refreshRecentUploads]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!file) {
      setStatus("Choose a PDF, FDX, TXT, or MD file first.");
      setStatusTone("error");
      setProgressSteps(uploadProgressSteps("error", "No file selected."));
      return;
    }
    if (!isAllowedScriptUploadFile(file)) {
      setStatus("DOCX script parsing is disabled for now. Upload PDF, FDX, TXT, or MD instead.");
      setStatusTone("error");
      setProgressSteps(uploadProgressSteps("error", "Unsupported file type."));
      return;
    }
    setBusy(true);
    setStatusTone("working");
    setStatus(`Uploading ${file.name} (${formatBytes(file.size)}). Keep this window open until GreenLight confirms the file is saved.`);
    setProgressSteps(uploadProgressSteps("uploading", `Sending ${file.name} to GreenLight...`));
    try {
      const result = await onUpload({
        projectId,
        documentId: documentId || undefined,
        title: title.trim() || fileNameWithoutExtension(file.name),
        type,
        writerName: writerName.trim() || "Unassigned Writer",
        source: source.trim(),
        file,
        notes
      });
      updateProgress("uploading", "done", "Upload request completed.");
      updateProgress("stored", "done", "Original file saved and document record created.");

      if (result?.extractionQueued && result.uploadJob?.id) {
        updateProgress("parsing", "active", "Parsing readable text in the background...");
        setStatus("File saved. GreenLight is parsing text now; scanned PDFs may finish with an OCR warning.");
        const uploadJob = await waitForUploadJob(result.uploadJob.id);
        if (uploadJob.status === "COMPLETE") {
          updateProgress("parsing", "done", `Parsed ${(uploadJob.characterCount ?? 0).toLocaleString()} characters.`);
          updateProgress("complete", "done", "Document is ready for breakdown and diff tools.");
          setStatus("Upload complete. Text parsed and workspace refreshed.");
          setStatusTone("success");
        } else if (uploadJob.status === "WARNING") {
          const message = uploadJob.warning || uploadJob.versionNotes || "Document is saved, but parsing finished with a warning.";
          updateProgress("parsing", "warning", message);
          updateProgress("complete", "warning", "Document is saved, but parsing needs attention.");
          setStatus(`Uploaded with warning: ${message}`);
          setStatusTone("warning");
        } else {
          const message = uploadJob.error || "Upload failed while GreenLight was processing the file.";
          updateProgress("parsing", "error", message);
          updateProgress("complete", "error", "Upload did not complete.");
          setStatus(message);
          setStatusTone("error");
          return;
        }
        void refreshRecentUploads();
        setFile(null);
        window.setTimeout(onDone, 900);
        return;
      }

      if (result?.extractionQueued && result.version?.documentId && result.version.id) {
        updateProgress("parsing", "active", "Parsing readable text in the background...");
        setStatus("File saved. GreenLight is parsing text now; scanned PDFs may finish with an OCR warning.");
        const extraction = await waitForDocumentExtraction(result.version.documentId, result.version.id);
        if (extraction.state === "done") {
          updateProgress("parsing", "done", `Parsed ${extraction.characterCount.toLocaleString()} characters.`);
          updateProgress("complete", "done", "Document is ready for breakdown and diff tools.");
          setStatus("Upload complete. Text parsed and workspace refreshed.");
          setStatusTone("success");
        } else {
          updateProgress("parsing", "warning", extraction.message);
          updateProgress("complete", "warning", "Document is saved, but parsing needs attention.");
          setStatus(`Uploaded with warning: ${extraction.message}`);
          setStatusTone("warning");
        }
        setFile(null);
        void refreshRecentUploads();
        window.setTimeout(onDone, 900);
        return;
      }

      if (result?.warning) {
        updateProgress("parsing", "warning", result.warning);
        updateProgress("complete", "warning", "Document is saved, but parsing needs attention.");
        setStatus(`Uploaded with warning: ${result.warning}`);
        setStatusTone("warning");
        return;
      }
      updateProgress("parsing", "done", "Readable text extracted.");
      updateProgress("complete", "done", "Document is ready.");
      setStatus("Uploaded. Refreshing the script list...");
      setStatusTone("success");
      setFile(null);
      void refreshRecentUploads();
      window.setTimeout(onDone, 700);
    } catch (error) {
      updateProgress("uploading", "error", uploadFailureMessage(error));
      updateProgress("complete", "error", "Upload did not complete.");
      setStatus(uploadFailureMessage(error));
      setStatusTone("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="mt-8 grid max-h-[90vh] w-full max-w-3xl gap-3 overflow-y-auto rounded-xl border border-amberline/25 bg-studio-950 p-4 shadow-2xl md:grid-cols-[1fr_170px]">
        <div className="md:col-span-2 flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-studio-100">{selectedDocument ? "Upload New Version" : "Add Document"}</p>
            <p className="mt-1 text-xs leading-5 text-studio-300">
              {selectedDocument ? `Attach a new file version to ${selectedDocument.title}.` : "Choose a file first, then add the document details before uploading."}
            </p>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Close upload window">
            <X className="h-4 w-4" />
          </button>
        </div>
      <div className="md:col-span-2">
        <FileUploadPicker
          file={file}
          onFileChange={(nextFile) => {
            setFile(nextFile);
            if (nextFile) {
              const inferredTitle = fileNameWithoutExtension(nextFile.name);
              if (!documentId && (!titleTouched || !title.trim() || title === autoTitle)) {
                setTitle(inferredTitle);
                setAutoTitle(inferredTitle);
                setTitleTouched(false);
              }
              setStatus(`Ready to upload ${nextFile.name} (${formatBytes(nextFile.size)}).`);
              setStatusTone("idle");
              setProgressSteps(uploadProgressSteps("selected", `${nextFile.name} selected (${formatBytes(nextFile.size)}).`));
            } else {
              setProgressSteps(uploadProgressSteps());
            }
          }}
          disabled={busy}
          accept=".pdf,.fdx,.txt,.md,text/plain,text/markdown,application/pdf"
          label="Document File"
          helper="Choose a PDF, FDX, TXT, or MD first"
        />
      </div>
      <div className="space-y-2">
        <select className="field" value={documentId} disabled={busy} onChange={(event) => { setDocumentId(event.target.value); setTitleTouched(false); setAutoTitle(""); }}>
          <option value="">Create new document</option>
          {documents.map((document) => (
            <option key={document.id} value={document.id}>New version of {document.title}</option>
          ))}
        </select>
        <input className="field" value={title} disabled={busy} onChange={(event) => { setTitle(event.target.value); setTitleTouched(true); }} placeholder="Document title" />
        <input className="field" list="writer-contact-options" value={writerName} disabled={busy} onChange={(event) => setWriterName(event.target.value)} placeholder="Writer" />
        <input className="field" value={source} disabled={busy} onChange={(event) => setSource(event.target.value)} placeholder="Source: agency, contest, list, manager, referral" />
        <datalist id="writer-contact-options">
          {hammerContacts.filter((contact) => contact.type === "WRITER").map((contact) => <option key={contact.id} value={contact.name} />)}
        </datalist>
        <textarea className="field min-h-16" value={notes} disabled={busy} onChange={(event) => setNotes(event.target.value)} placeholder="Version notes" />
      </div>
      <div className="space-y-2">
        <select className="field" value={type} disabled={busy} onChange={(event) => setType(event.target.value as DocumentType)}>
          {(["SCRIPT", "TREATMENT", "OUTLINE", "NOTES", "COVERAGE", "BUSINESS_DOCUMENT"] as DocumentType[]).map((documentType) => (
            <option key={documentType} value={documentType}>{statusLabel(documentType)}</option>
          ))}
        </select>
        <PrimaryButton icon={busy ? Loader2 : UploadCloud} label={busy ? "Uploading..." : documentId ? "Upload Version" : "Upload Document"} disabled={busy} />
      </div>
      <UploadProgressPanel steps={progressSteps} />
      <RecentUploadJobsPanel jobs={recentUploadJobs} />
      {status ? (
        <div className={cn(
          "md:col-span-2 flex items-start gap-2 rounded-md border px-3 py-2 text-xs leading-5",
          statusTone === "working" && "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
          statusTone === "success" && "border-emerald-300/30 bg-emerald-400/12 text-emerald-100",
          statusTone === "warning" && "border-yellow-300/30 bg-yellow-300/10 text-yellow-100",
          statusTone === "error" && "border-rose-300/30 bg-rose-500/10 text-rose-100",
          statusTone === "idle" && "border-white/10 bg-white/[0.03] text-studio-300"
        )}>
          {statusTone === "working" ? <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" /> : null}
          <span>{status}</span>
        </div>
      ) : null}
        <div className="md:col-span-2 flex justify-end gap-2 border-t border-white/10 pt-3">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 transition hover:border-white/20 hover:text-studio-100 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function UploadProgressPanel({ steps }: { steps: UploadProgressStep[] }) {
  const hasStarted = steps.some((step) => step.state !== "pending");
  if (!hasStarted) return null;
  return (
    <div className="md:col-span-2 rounded-lg border border-white/10 bg-studio-950/45 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-studio-300">Upload Progress</p>
        <span className="text-[11px] text-studio-400">Keep this window open</span>
      </div>
      <div className="grid gap-2 md:grid-cols-5">
        {steps.map((step) => (
          <div key={step.id} className={cn(
            "rounded-md border p-2 transition",
            step.state === "pending" && "border-white/10 bg-white/[0.02] text-studio-500",
            step.state === "active" && "border-emerald-300/35 bg-emerald-400/10 text-emerald-100",
            step.state === "done" && "border-emerald-300/25 bg-emerald-400/8 text-studio-100",
            step.state === "warning" && "border-yellow-300/35 bg-yellow-300/10 text-yellow-100",
            step.state === "error" && "border-rose-300/35 bg-rose-500/10 text-rose-100"
          )}>
            <div className="flex items-center gap-1.5">
              {step.state === "active" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {step.state === "done" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : null}
              {step.state === "warning" || step.state === "error" ? <X className="h-3.5 w-3.5" /> : null}
              {step.state === "pending" ? <span className="h-3.5 w-3.5 rounded-full border border-current opacity-50" /> : null}
              <p className="text-xs font-semibold">{step.label}</p>
            </div>
            <p className="mt-1 line-clamp-3 text-[11px] leading-4 opacity-80">{step.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentUploadJobsPanel({ jobs }: { jobs: UploadJobSnapshot[] }) {
  if (!jobs.length) return null;
  return (
    <div className="md:col-span-2 rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-studio-300">Recent Uploads</p>
        <span className="text-[11px] text-studio-500">Saved in database</span>
      </div>
      <div className="grid gap-1.5">
        {jobs.slice(0, 4).map((job) => (
          <div key={job.id} className="grid gap-2 rounded-md border border-white/10 bg-studio-950/35 px-2.5 py-2 text-[12px] md:grid-cols-[minmax(0,1fr)_92px_120px] md:items-center">
            <div className="min-w-0">
              <p className="truncate font-semibold text-studio-100">{job.fileName}</p>
              <p className="mt-0.5 truncate text-[11px] text-studio-500">{job.stage}{job.characterCount ? ` / ${job.characterCount.toLocaleString()} chars` : ""}</p>
            </div>
            <span className={cn("rounded border px-2 py-1 text-center font-display text-[10px] uppercase", uploadJobTone(job.status))}>{statusLabel(job.status)}</span>
            <p className="truncate text-right text-[11px] text-studio-500">{formatShortDateTime(job.createdAt)}</p>
            {job.error || job.warning ? <p className="md:col-span-3 line-clamp-2 text-[11px] leading-4 text-studio-400">{job.error || job.warning}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function uploadJobTone(status: UploadJobSnapshot["status"]) {
  if (status === "COMPLETE") return "border-emerald-300/25 bg-emerald-400/10 text-emerald-200";
  if (status === "WARNING") return "border-yellow-300/35 bg-yellow-300/10 text-yellow-100";
  if (status === "FAILED") return "border-rose-300/35 bg-rose-500/10 text-rose-100";
  return "border-sky-300/25 bg-sky-400/10 text-sky-200";
}

function uploadProgressSteps(activeStep?: UploadProgressStepId | "error", detail?: string): UploadProgressStep[] {
  const steps: UploadProgressStep[] = [
    { id: "selected", label: "Selected", detail: "Choose a PDF, FDX, TXT, or MD file.", state: "pending" },
    { id: "uploading", label: "Uploading", detail: "Sending the file to GreenLight.", state: "pending" },
    { id: "stored", label: "Stored", detail: "Saving original file and metadata.", state: "pending" },
    { id: "parsing", label: "Parsing", detail: "Extracting readable script text.", state: "pending" },
    { id: "complete", label: "Complete", detail: "Ready for review, diff, and breakdown.", state: "pending" }
  ];
  if (!activeStep) return steps;
  if (activeStep === "error") return steps.map((step, index) => index === 0 ? { ...step, state: "error", detail: detail ?? "Upload could not start." } : step);
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  return steps.map((step, index) => {
    if (index < activeIndex) return { ...step, state: "done" };
    if (index === activeIndex) return { ...step, state: activeStep === "selected" ? "done" : "active", detail: detail ?? step.detail };
    return step;
  });
}

async function waitForDocumentExtraction(documentId: string, versionId: string): Promise<{ state: "done" | "warning"; message: string; characterCount: number }> {
  const queuedNeedle = "Text extraction is queued";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await delay(attempt < 4 ? 1500 : 3000);
    const response = await fetch(`/api/hammer/document-versions?documentId=${encodeURIComponent(documentId)}`, { cache: "no-store" });
    if (!response.ok) continue;
    const data = await response.json().catch(() => null) as { versions?: HammerDocumentVersion[] } | null;
    const version = data?.versions?.find((entry) => entry.id === versionId);
    if (!version) continue;
    const textLength = version.extractedText?.trim().length ?? 0;
    const note = version.notes ?? "";
    if (textLength > 0) return { state: "done", message: "Text parsed successfully.", characterCount: textLength };
    if (note && !note.includes(queuedNeedle)) return { state: "warning", message: note.replace(/^Upload warning:\s*/i, ""), characterCount: 0 };
  }
  return {
    state: "warning",
    message: "The original file was saved, but parsing is still running or did not finish before the progress window timed out. Refresh this document in a moment, or check app logs if it remains unparsed.",
    characterCount: 0
  };
}

async function waitForUploadJob(jobId: string): Promise<UploadJobSnapshot> {
  let latest: UploadJobSnapshot | null = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await delay(attempt < 5 ? 1000 : 2000);
    const response = await fetch(`/api/hammer/document-upload?jobId=${encodeURIComponent(jobId)}`, { cache: "no-store" });
    if (!response.ok) {
      const data = await readUploadErrorResponse(response);
      throw new Error(formatUploadError(data, response.status));
    }
    const data = await response.json().catch(() => null) as { uploadJob?: UploadJobSnapshot } | null;
    if (data?.uploadJob) {
      latest = data.uploadJob;
      if (["COMPLETE", "WARNING", "FAILED"].includes(data.uploadJob.status)) {
        return data.uploadJob;
      }
    }
  }
  return latest ?? {
    id: jobId,
    requestId: "",
    status: "WARNING",
    stage: "parsing",
    fileName: "",
    fileType: "",
    fileSize: 0,
    warning: "Parsing is still running. The original file is saved; refresh this document in a moment to see the latest result.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function SupportingDocumentUpload({
  documentId,
  onUpload
}: {
  documentId: string;
  onUpload: (input: { scriptDocumentId: string; title: string; type: SupportingDocumentType; source: string; notes: string; file: File }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [autoTitle, setAutoTitle] = useState("");
  const [type, setType] = useState<SupportingDocumentType>("CONTEXT");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function closeModal() {
    if (busy) return;
    setOpen(false);
    setStatus("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!file) {
      setStatus("Choose a PDF, DOCX, FDX, or TXT file first.");
      return;
    }
    setBusy(true);
    setStatus(`Uploading ${file.name}...`);
    try {
      await onUpload({
        scriptDocumentId: documentId,
        title: title.trim() || fileNameWithoutExtension(file.name),
        type,
        source: source.trim(),
        notes,
        file
      });
      setTitle("");
      setTitleTouched(false);
      setAutoTitle("");
      setSource("");
      setNotes("");
      setFile(null);
      setStatus("Context file attached.");
      window.setTimeout(() => {
        setOpen(false);
        setStatus("");
      }, 600);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="ui-button inline-flex items-center gap-1.5 rounded-md bg-amberline px-2.5 py-1.5 text-xs font-semibold text-studio-950 transition hover:bg-emerald-300">
        <Plus className="h-3.5 w-3.5" />
        Attach Context
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="mt-8 grid max-h-[90vh] w-full max-w-2xl gap-3 overflow-y-auto rounded-xl border border-amberline/25 bg-studio-950 p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-studio-100">Attach Context</p>
                <p className="mt-1 text-xs leading-5 text-studio-300">Add coverage, context notes, correspondence, research, or writer materials to this script packet.</p>
              </div>
              <button type="button" onClick={closeModal} disabled={busy} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Close context upload window">
                <X className="h-4 w-4" />
              </button>
            </div>
            <FileUploadPicker
              resetKey={status === "Context file attached." ? "cleared" : "ready"}
              file={file}
              onFileChange={(nextFile) => {
                setFile(nextFile);
                if (nextFile) {
                  const inferredTitle = fileNameWithoutExtension(nextFile.name);
                  if (!titleTouched || !title.trim() || title === autoTitle) {
                    setTitle(inferredTitle);
                    setAutoTitle(inferredTitle);
                    setTitleTouched(false);
                  }
                  setStatus(`Ready to attach ${nextFile.name} (${formatBytes(nextFile.size)}).`);
                }
              }}
              disabled={busy}
              accept=".pdf,.docx,.fdx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              label="Context File"
              helper="Choose a PDF, DOCX, FDX, or TXT first"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Title</span>
                <input className="field" value={title} disabled={busy} onChange={(event) => { setTitle(event.target.value); setTitleTouched(true); }} placeholder="Document title" />
              </label>
              <label className="grid gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Type</span>
                <select className="field" value={type} disabled={busy} onChange={(event) => setType(event.target.value as SupportingDocumentType)}>
                  {(["CONTEXT", "COVERAGE", "NOTES", "EMAIL", "WRITER_MATERIAL", "OTHER"] as SupportingDocumentType[]).map((documentType) => (
                    <option key={documentType} value={documentType}>{statusLabel(documentType)}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Source</span>
                <input className="field" value={source} disabled={busy} onChange={(event) => setSource(event.target.value)} placeholder="Agency, contest, list, manager, referral" />
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Notes</span>
                <textarea className="field min-h-20" value={notes} disabled={busy} onChange={(event) => setNotes(event.target.value)} placeholder="Notes for the team" />
              </label>
            </div>
            {status ? <p className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-studio-300">{status}</p> : null}
            <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
              <button type="button" onClick={closeModal} disabled={busy} className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 transition hover:border-white/20 hover:text-studio-100 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
              <PrimaryButton icon={busy ? Loader2 : Plus} label={busy ? "Attaching..." : "Attach Context"} disabled={busy} />
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function FileUploadPicker({
  file,
  onFileChange,
  accept,
  label = "Choose File",
  helper,
  disabled = false,
  resetKey
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept: string;
  label?: string;
  helper?: string;
  disabled?: boolean;
  resetKey?: string | number;
}) {
  return (
    <label className={cn(
      "group block cursor-pointer rounded-lg border border-white/10 bg-white/[0.035] p-3 transition hover:border-amberline/40 hover:bg-white/[0.055]",
      disabled && "cursor-not-allowed opacity-55"
    )}>
      <input
        key={resetKey}
        className="sr-only"
        type="file"
        disabled={disabled}
        accept={accept}
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">{label}</span>
          <span className={cn("mt-1 block break-words text-[13px] font-semibold leading-5", file ? "text-studio-100" : "text-studio-500")}>
            {file ? file.name : "No file selected"}
          </span>
          <span className="mt-1 block text-xs text-studio-400">
            {file ? `${file.type || "file"} / ${formatBytes(file.size)}` : helper}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-xs font-semibold text-studio-950 transition group-hover:bg-emerald-300">
          <FileText className="h-3.5 w-3.5" />
          Browse
        </span>
      </span>
    </label>
  );
}

function DocumentRows({
  docs,
  versions = hammerVersions,
  projects = hammerProjects,
  currentUser,
  canDownload = false,
  omitProject = false,
  showInboxMeta = false,
  onDelete,
  onAssignToProject,
  assignableProjects = projects,
  defaultProjectId,
  emptyLabel = "No documents match this view."
}: {
  docs: HammerDocument[];
  versions?: HammerDocumentVersion[];
  projects?: HammerProject[];
  currentUser?: HammerUser;
  canDownload?: boolean;
  omitProject?: boolean;
  showInboxMeta?: boolean;
  onDelete?: (documentId: string) => Promise<void> | void;
  onAssignToProject?: (documentId: string, projectId: string) => void;
  assignableProjects?: HammerProject[];
  defaultProjectId?: string;
  emptyLabel?: string;
}) {
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});
  const [deletingDocumentId, setDeletingDocumentId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = useResponsiveTablePageSize({ max: 16, reservedHeight: 360 });
  const totalPages = Math.max(1, Math.ceil(docs.length / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const pagedDocs = docs.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [docs.length, pageSize]);

  async function deleteDocumentFromSlate(document: HammerDocument) {
    if (!onDelete || deletingDocumentId) return;
    const locationLabel = document.projectId ? projectTitleFromList(document.projectId, projects) : "Inbox";
    if (!window.confirm(`Delete "${document.title}" from ${locationLabel}? This archives the document record and hides its versions from GreenLight.`)) return;
    setDeletingDocumentId(document.id);
    try {
      await onDelete(document.id);
    } finally {
      setDeletingDocumentId("");
    }
  }
  if (!docs.length) return <EmptyState label={emptyLabel} />;
  return (
    <div className="table-workspace">
      <div className="data-scroll table-workspace-scroll">
        <table className={cn("data-table", omitProject ? "min-w-[760px]" : "min-w-[860px]")}>
          <thead className="text-[11px] uppercase tracking-[0.12em] text-studio-400">
            <tr>
              <th className="py-2">Title</th>
              {!omitProject ? <th>Project</th> : null}
              {showInboxMeta ? <th>Source</th> : null}
              <th>Version</th>
              <th>Status</th>
              <th>Writer</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {pagedDocs.map((doc) => {
            const version = currentVersionFor(doc.id, docs, versions);
            const selectedProjectId = assignmentDrafts[doc.id] ?? "";
            const canAssignIncomingDocument = Boolean(onAssignToProject && assignableProjects.length && !doc.projectId);
            return (
              <tr key={doc.id} className="text-studio-200">
                <td className="py-2.5 font-semibold"><Link href={`/scripts/${doc.id}`}>{doc.title}</Link></td>
                {!omitProject ? <td>{doc.projectId ? projectTitleFromList(doc.projectId, projects) : <span className="text-studio-300">Inbox</span>}</td> : null}
                {showInboxMeta ? <td className="text-studio-300">{doc.source ?? "Internal"}{doc.submittedAt ? <p className="text-[11px] text-studio-500">{doc.submittedAt}</p> : null}</td> : null}
                <td>v{version?.versionNumber ?? 1}</td>
                <td><Badge value={version?.status ?? "DRAFT"} /></td>
                <td>{doc.writerName ?? userName(doc.createdById)}</td>
                <td>{doc.updatedAt}</td>
                <td className="space-x-1.5">
                  {canDownload && currentUser && version ? (
                    <DownloadFileLink fileName={version.fileName} dataUrl={version.dataUrl} fallbackText={version.extractedText} resourceType="documentVersion" resourceId={version.id} currentUser={currentUser} compact />
                  ) : canDownload ? (
                    <span className="inline-flex rounded border border-white/10 bg-white/[0.025] px-1.5 py-1 text-[11px] font-semibold text-studio-500" title="No uploaded file version is attached to this document yet.">
                      No file
                    </span>
                  ) : null}
                  {canAssignIncomingDocument ? (
                    <span className="inline-flex items-center gap-1 align-middle">
                      <select
                        aria-label={`Project for ${doc.title}`}
                        className="rounded border border-white/10 bg-studio-950/70 px-1.5 py-1 text-[11px] text-studio-200 outline-none focus:border-amberline/60"
                        value={selectedProjectId}
                        onChange={(event) => setAssignmentDrafts((current) => ({ ...current, [doc.id]: event.target.value }))}
                      >
                        <option value="">Select project</option>
                        {assignableProjects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                      </select>
                      <button type="button" disabled={!selectedProjectId} onClick={() => selectedProjectId && onAssignToProject?.(doc.id, selectedProjectId)} className="rounded border border-emerald-400/25 bg-emerald-400/5 px-1.5 py-1 text-[11px] font-semibold text-emerald-300 hover:border-emerald-300/50 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40">Assign</button>
                    </span>
                  ) : null}
                  {onDelete ? (
                    <button
                      type="button"
                      disabled={deletingDocumentId === doc.id}
                      onClick={() => deleteDocumentFromSlate(doc)}
                      className="inline-flex items-center gap-1 rounded border border-rose-400/25 bg-rose-500/5 px-1.5 py-1 text-[11px] font-semibold text-rose-300 transition hover:border-rose-300/50 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-45"
                      title="Delete this document from the Development Slate"
                    >
                      <Trash2 className="h-3 w-3" />
                      {deletingDocumentId === doc.id ? "Deleting" : "Delete"}
                    </button>
                  ) : null}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
      <PaginationFooter page={normalizedPage} pageSize={pageSize} total={docs.length} onPageChange={setPage} />
    </div>
  );
}

function Collections({
  slateCollections,
  slateItems,
  scriptCollections,
  scriptItems,
  projects,
  prospects,
  users,
  documents,
  versions,
  canManage,
  onCreateSlateCollection,
  onAddSlateItem,
  onRemoveSlateItem,
  onReorderSlateItems,
  onArchiveSlateCollection,
  onDeleteSlateCollection,
  onCreateScriptCollection,
  onAddDocument,
  onRemoveDocument,
  onReorderScriptItems,
  onArchiveScriptCollection,
  onDeleteScriptCollection
}: {
  slateCollections: HammerSlateCollection[];
  slateItems: HammerSlateCollectionItem[];
  scriptCollections: HammerScriptCollection[];
  scriptItems: HammerScriptCollectionItem[];
  projects: HammerProject[];
  prospects: HammerProjectLead[];
  users: HammerUser[];
  documents: HammerDocument[];
  versions: HammerDocumentVersion[];
  canManage: boolean;
  onCreateSlateCollection: (input: { name: string; description?: string; visibility?: HammerSlateCollection["visibility"] }) => Promise<void>;
  onAddSlateItem: (collectionId: string, itemType: SlateCollectionItemType, itemId: string, notes?: string) => Promise<void>;
  onRemoveSlateItem: (collectionItemId: string) => Promise<void>;
  onReorderSlateItems: (collectionId: string, collectionItemIds: string[]) => Promise<void>;
  onArchiveSlateCollection: (collectionId: string) => Promise<void>;
  onDeleteSlateCollection: (collectionId: string) => Promise<void>;
  onCreateScriptCollection: (input: { name: string; description?: string; visibility?: HammerScriptCollection["visibility"] }) => Promise<void>;
  onAddDocument: (collectionId: string, documentId: string, notes?: string) => Promise<void>;
  onRemoveDocument: (collectionItemId: string) => Promise<void>;
  onReorderScriptItems: (collectionId: string, collectionItemIds: string[]) => Promise<void>;
  onArchiveScriptCollection: (collectionId: string) => Promise<void>;
  onDeleteScriptCollection: (collectionId: string) => Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"slate" | "scripts">("slate");
  const [showArchived, setShowArchived] = useState(false);
  const visibleSlateCollections = showArchived ? slateCollections : slateCollections.filter((collection) => collection.status !== "ARCHIVED");
  const visibleScriptCollections = showArchived ? scriptCollections : scriptCollections.filter((collection) => collection.status !== "ARCHIVED");
  const slateItemCount = slateItems.filter((item) => visibleSlateCollections.some((collection) => collection.id === item.collectionId)).length;
  const scriptItemCount = scriptItems.filter((item) => visibleScriptCollections.some((collection) => collection.id === item.collectionId)).length;

  useEffect(() => {
    const collectionId = searchParams.get("collection");
    if (!collectionId) return;
    const scriptCollection = scriptCollections.find((collection) => collection.id === collectionId);
    const slateCollection = slateCollections.find((collection) => collection.id === collectionId);
    if (scriptCollection) {
      setMode("scripts");
      if (scriptCollection.status === "ARCHIVED") setShowArchived(true);
    } else if (slateCollection) {
      setMode("slate");
      if (slateCollection.status === "ARCHIVED") setShowArchived(true);
    }
  }, [scriptCollections, searchParams, slateCollections]);

  return (
    <div className="collections-page flex min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.018] p-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.16em] text-amberline/80">Collections</p>
          <h2 className="mt-0.5 text-[15px] font-semibold text-studio-100">Review Packets</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-white/10 bg-white/[0.025] p-1">
            <CollectionModeButton
              label="Slate Packets"
              count={visibleSlateCollections.length}
              detail={`${slateItemCount} item${slateItemCount === 1 ? "" : "s"}`}
              active={mode === "slate"}
              onClick={() => { setMode("slate"); router.replace("/collections?type=slate", { scroll: false }); }}
            />
            <CollectionModeButton
              label="Document Packets"
              count={visibleScriptCollections.length}
              detail={`${scriptItemCount} item${scriptItemCount === 1 ? "" : "s"}`}
              active={mode === "scripts"}
              onClick={() => { setMode("scripts"); router.replace("/collections?type=scripts", { scroll: false }); }}
            />
          </div>
          <label className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-2 text-xs font-semibold text-studio-300">
            <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
            Show archived
          </label>
        </div>
      </div>

      <div className="collections-body min-h-0 flex-1">
        {mode === "slate" ? (
          <SlateCollections collections={visibleSlateCollections} items={slateItems} projects={projects} prospects={prospects} users={users} canManage={canManage} onCreateCollection={onCreateSlateCollection} onAddItem={onAddSlateItem} onRemoveItem={onRemoveSlateItem} onReorderItems={onReorderSlateItems} onArchiveCollection={onArchiveSlateCollection} onDeleteCollection={onDeleteSlateCollection} />
        ) : (
          <ScriptCollections collections={visibleScriptCollections} items={scriptItems} documents={documents} versions={versions} projects={projects} canManage={canManage} onCreateCollection={onCreateScriptCollection} onAddDocument={onAddDocument} onRemoveDocument={onRemoveDocument} onReorderItems={onReorderScriptItems} onArchiveCollection={onArchiveScriptCollection} onDeleteCollection={onDeleteScriptCollection} />
        )}
      </div>
    </div>
  );
}


type CollectionSearchField = "title" | "writer" | "logline" | "genre";
const collectionSearchFields: Array<{ value: CollectionSearchField; label: string }> = [
  { value: "title", label: "Title" },
  { value: "writer", label: "Writer" },
  { value: "logline", label: "Logline" },
  { value: "genre", label: "Genre" }
];

function CollectionSearchControls({
  field,
  term,
  selectedOptions,
  options,
  onFieldChange,
  onTermChange,
  onSelectOption,
  onRemoveOption,
  placeholder
}: {
  field: CollectionSearchField;
  term: string;
  selectedOptions: string[];
  options: string[];
  onFieldChange: (field: CollectionSearchField) => void;
  onTermChange: (term: string) => void;
  onSelectOption: (option: string) => void;
  onRemoveOption: (option: string) => void;
  placeholder: string;
}) {
  const normalizedTerm = term.trim().toLowerCase();
  const suggestions = field === "logline" ? [] : options
    .filter((option) => !selectedOptions.includes(option))
    .filter((option) => !normalizedTerm || option.toLowerCase().includes(normalizedTerm))
    .slice(0, 8);
  return (
    <div className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)]">
        <select className="field" value={field} onChange={(event) => onFieldChange(event.target.value as CollectionSearchField)} aria-label="Search field">
          {collectionSearchFields.map((searchField) => <option key={searchField.value} value={searchField.value}>{searchField.label}</option>)}
        </select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-studio-400" />
          <input className="field pl-8" value={term} onChange={(event) => onTermChange(event.target.value)} placeholder={placeholder} />
        </div>
      </div>
      {selectedOptions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <button key={option} type="button" onClick={() => onRemoveOption(option)} className="inline-flex items-center gap-1 rounded-full border border-amberline/25 bg-amberline/10 px-2 py-1 text-[11px] font-semibold text-amberline" title="Remove filter">
              {option}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      ) : null}
      {suggestions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((option) => (
            <button key={option} type="button" onClick={() => onSelectOption(option)} className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline">
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function collectionOptionValues<T>(items: T[], getter: (item: T) => string | undefined) {
  return Array.from(new Set(items.map((item) => getter(item)?.trim()).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}

function matchesTargetedCollectionSearch(value: string | undefined, term: string, selectedOptions: string[]) {
  const normalizedValue = (value ?? "").toLowerCase();
  const normalizedTerm = term.trim().toLowerCase();
  const matchesTerm = !normalizedTerm || normalizedValue.includes(normalizedTerm);
  const matchesSelections = !selectedOptions.length || selectedOptions.some((option) => normalizedValue.includes(option.toLowerCase()));
  return matchesTerm && matchesSelections;
}

function slateCollectionSearchValue(item: HammerProject | HammerProjectLead, itemType: SlateCollectionItemType, field: CollectionSearchField, users: HammerUser[]) {
  if (field === "title") return item.title;
  if (field === "genre") return item.genre ?? "";
  if (field === "logline") return item.logline ?? "";
  if (itemType === "PROJECT") return userName((item as HammerProject).ownerId);
  return prospectOwnerLabel(item as HammerProjectLead, users) || (item as HammerProjectLead).creator || "";
}

function documentCollectionSearchValue(document: HammerDocument, field: CollectionSearchField, projects: HammerProject[]) {
  const project = document.projectId ? projects.find((item) => item.id === document.projectId) : undefined;
  if (field === "title") return document.title;
  if (field === "writer") return document.writerName ?? userName(document.createdById);
  if (field === "genre") return project?.genre ?? "";
  return project?.logline ?? "";
}

function ShareButton({ title, type, status, summary, href }: { title: string; type: string; status?: string; summary?: string; href: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const absoluteUrl = typeof window === "undefined" ? href : new URL(href, window.location.origin).toString();
  const shareText = [
    `GreenLight ${type}: ${title}`,
    status ? `Status: ${statusLabel(status)}` : undefined,
    summary ? `Summary: ${summary}` : undefined,
    `Secure link: ${absoluteUrl}`,
    "Access requires an approved GreenLight login."
  ].filter(Boolean).join("\n");

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1800);
  }

  return (
    <div className="relative inline-flex">
      <button type="button" onClick={() => setOpen((current) => !current)} className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.025] px-2 py-1 text-[11px] font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline" aria-expanded={open}>
        <Share2 className="h-3 w-3" />
        Share
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-lg border border-white/10 bg-studio-950 p-3 text-left shadow-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amberline">Secure Share</p>
          <p className="mt-1 line-clamp-2 text-xs text-studio-300">{title}</p>
          <p className="mt-2 rounded-md border border-amberline/20 bg-amberline/8 px-2 py-1.5 text-[11px] leading-4 text-studio-300">Anyone opening this link must sign in with an approved Google or GreenLight account. Existing role and project permissions still apply.</p>
          <div className="mt-3 grid gap-1.5">
            <button type="button" onClick={() => copy(absoluteUrl, "link")} className="rounded border border-white/10 px-2 py-1.5 text-left text-xs font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline">Copy link</button>
            <button type="button" onClick={() => copy(shareText, "summary")} className="rounded border border-white/10 px-2 py-1.5 text-left text-xs font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline">Copy summary</button>
            <a href={`mailto:?subject=${encodeURIComponent(`GreenLight ${type}: ${title}`)}&body=${encodeURIComponent(shareText)}`} className="rounded border border-white/10 px-2 py-1.5 text-xs font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline">Open email draft</a>
          </div>
          {copied ? <p className="mt-2 text-[11px] text-amberline">Copied {copied === "link" ? "link" : "summary"}.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function CollectionModeButton({ label, count, detail, active, onClick }: { label: string; count: number; detail: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded px-3 py-1.5 text-left text-xs font-semibold transition", active ? "bg-amberline text-studio-950" : "text-studio-300 hover:text-studio-100")}
    >
      <span className="flex items-center gap-2">
        <span>{label}</span>
        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-studio-950/15 text-studio-950" : "bg-white/[0.06] text-studio-300")}>{count}</span>
      </span>
      <span className={cn("mt-0.5 block text-[10px] font-medium", active ? "text-studio-800" : "text-studio-500")}>{detail}</span>
    </button>
  );
}

function SlateCollections({
  collections,
  items,
  projects,
  prospects,
  users,
  canManage,
  onCreateCollection,
  onAddItem,
  onRemoveItem,
  onReorderItems,
  onArchiveCollection,
  onDeleteCollection
}: {
  collections: HammerSlateCollection[];
  items: HammerSlateCollectionItem[];
  projects: HammerProject[];
  prospects: HammerProjectLead[];
  users: HammerUser[];
  canManage: boolean;
  onCreateCollection: (input: { name: string; description?: string; visibility?: HammerSlateCollection["visibility"] }) => Promise<void>;
  onAddItem: (collectionId: string, itemType: SlateCollectionItemType, itemId: string, notes?: string) => Promise<void>;
  onRemoveItem: (collectionItemId: string) => Promise<void>;
  onReorderItems: (collectionId: string, collectionItemIds: string[]) => Promise<void>;
  onArchiveCollection: (collectionId: string) => Promise<void>;
  onDeleteCollection: (collectionId: string) => Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedCollectionId, setSelectedCollectionId] = useState(collections[0]?.id ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [itemType, setItemType] = useState<SlateCollectionItemType>("PROJECT");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemSearchField, setItemSearchField] = useState<CollectionSearchField>("title");
  const [itemSearch, setItemSearch] = useState("");
  const [itemSearchSelections, setItemSearchSelections] = useState<string[]>([]);
  const [itemNotes, setItemNotes] = useState("");
  const [message, setMessage] = useState("");
  const [draggedItemId, setDraggedItemId] = useState("");
  const [dragOverItemId, setDragOverItemId] = useState("");
  const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId) ?? collections[0];
  const collectionItems = selectedCollection ? items.filter((item) => item.collectionId === selectedCollection.id).sort((a, b) => a.sortOrder - b.sortOrder || a.addedAt.localeCompare(b.addedAt)) : [];
  const collectionProjectIds = new Set(collectionItems.map((item) => item.projectId).filter(Boolean));
  const collectionProspectIds = new Set(collectionItems.map((item) => item.prospectId).filter(Boolean));
  const availableProjects = projects.filter((project) => !collectionProjectIds.has(project.id));
  const availableProspects = prospects.filter((prospect) => !collectionProspectIds.has(prospect.id));
  const availableItems: Array<HammerProject | HammerProjectLead> = itemType === "PROJECT" ? availableProjects : availableProspects;
  const selectedItems = availableItems.filter((item) => selectedItemIds.includes(item.id));
  const itemSearchOptions = collectionOptionValues(availableItems, (item) => slateCollectionSearchValue(item, itemType, itemSearchField, users));
  const visibleAvailableItems = availableItems
    .filter((item) => matchesTargetedCollectionSearch(slateCollectionSearchValue(item, itemType, itemSearchField, users), itemSearch, itemSearchSelections))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }));

  useEffect(() => {
    const linkedCollectionId = searchParams.get("collection");
    if (linkedCollectionId && collections.some((collection) => collection.id === linkedCollectionId)) {
      if (selectedCollectionId !== linkedCollectionId) setSelectedCollectionId(linkedCollectionId);
      return;
    }
    if (!selectedCollectionId && collections[0]) setSelectedCollectionId(collections[0].id);
    if (selectedCollectionId && !collections.some((collection) => collection.id === selectedCollectionId)) setSelectedCollectionId(collections[0]?.id ?? "");
  }, [collections, searchParams, selectedCollectionId]);

  useEffect(() => {
    const availableItemIds = new Set(availableItems.map((item) => item.id));
    setSelectedItemIds((current) => {
      const next = current.filter((itemId) => availableItemIds.has(itemId));
      return next.length === current.length ? current : next;
    });
  }, [availableItems]);

  async function createCollection(input: { name: string; description?: string; visibility: HammerSlateCollection["visibility"] }) {
    await onCreateCollection(input);
    setCreateOpen(false);
    setMessage("Collection created.");
  }

  async function submitItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCollection || !selectedItemIds.length) {
      setMessage("Choose a collection and at least one item first.");
      return;
    }
    const itemIds = [...selectedItemIds];
    for (const itemId of itemIds) {
      await onAddItem(selectedCollection.id, itemType, itemId, itemNotes);
    }
    setSelectedItemIds([]);
    setItemSearch("");
    setItemSearchSelections([]);
    setItemNotes("");
    setAddItemOpen(false);
    setMessage(`${itemIds.length} ${itemType === "PROJECT" ? "Development Slate item" : "Prospect"}${itemIds.length === 1 ? "" : "s"} added to collection.`);
  }

  function toggleSelectedItem(itemId: string) {
    setSelectedItemIds((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]);
  }

  function selectVisibleItems() {
    const visibleIds = visibleAvailableItems.map((item) => item.id);
    setSelectedItemIds((current) => Array.from(new Set([...current, ...visibleIds])));
  }

  async function dropReviewItem(targetItemId: string) {
    if (!selectedCollection || !draggedItemId || draggedItemId === targetItemId) {
      setDraggedItemId("");
      setDragOverItemId("");
      return;
    }
    const orderedIds = collectionItems.map((item) => item.id);
    await onReorderItems(selectedCollection.id, moveId(orderedIds, draggedItemId, targetItemId));
    setDraggedItemId("");
    setDragOverItemId("");
  }

  async function archiveSelectedCollection() {
    if (!selectedCollection) return;
    if (window.confirm(`Archive "${selectedCollection.name}"? This hides the collection from active review packets but does not delete any projects or prospects.`)) {
      await onArchiveCollection(selectedCollection.id);
      setMessage("Collection archived. Projects and prospects were not deleted.");
    }
  }

  async function deleteSelectedCollection() {
    if (!selectedCollection) return;
    if (window.confirm(`Delete "${selectedCollection.name}"? This removes only the collection grouping and its membership list. Projects and prospects stay in GreenLight.`)) {
      await onDeleteCollection(selectedCollection.id);
      setMessage("Collection deleted. Projects and prospects were not deleted.");
    }
  }

  return (
    <div className="collections-grid grid h-full min-h-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="collections-column flex min-h-0 flex-col gap-4">
        <Panel className="flex min-h-0 flex-1 flex-col">
          <SectionHeader eyebrow="Packets" title="Slate Packets" action={canManage ? <PrimaryButton icon={Plus} label="Create Packet" onClick={() => setCreateOpen(true)} /> : undefined} />
          <div className="collections-list mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-0.5">
            {collections.length ? collections.map((collection) => {
              const count = items.filter((item) => item.collectionId === collection.id).length;
              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => { setSelectedCollectionId(collection.id); router.replace(`/collections?type=slate&collection=${encodeURIComponent(collection.id)}`, { scroll: false }); }}
                  className={cn("rounded-md border p-3 text-left transition", selectedCollection?.id === collection.id ? "border-amberline/45 bg-amberline/10" : "border-white/10 bg-white/[0.03] hover:border-white/25")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-studio-100">{collection.name}</p>
                    <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-studio-300">{count}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-studio-400">{collection.description || "No description yet."}</p>
                </button>
              );
            }) : <EmptyState label="No slate packets yet." />}
          </div>
        </Panel>

        {message ? <p className="px-1 text-xs text-studio-300">{message}</p> : null}

      </div>

      <div className="collections-detail-column flex min-h-0 flex-col">
        <Panel className="flex min-h-0 flex-1 flex-col">
          <SectionHeader
            eyebrow="Review List"
            title={selectedCollection?.name ?? "Select a Collection"}
            action={selectedCollection ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <ShareButton title={selectedCollection.name} type="Collection" status={selectedCollection.status} summary={selectedCollection.description} href={`/collections?type=slate&collection=${encodeURIComponent(selectedCollection.id)}`} />
                {canManage ? (
                  <button type="button" onClick={() => setAddItemOpen(true)} className="inline-flex items-center gap-1 rounded border border-amberline/35 bg-amberline/10 px-2 py-1 text-[11px] font-semibold text-amberline transition hover:bg-amberline hover:text-studio-950">
                    <Plus className="h-3 w-3" />
                    Add Items
                  </button>
                ) : null}
                <CollectionActions collection={selectedCollection} canManage={canManage} onArchive={archiveSelectedCollection} onDelete={deleteSelectedCollection} />
              </div>
            ) : undefined}
          />
          {selectedCollection?.description ? <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-studio-300">{selectedCollection.description}</p> : null}
          {collectionItems.length ? (
            <div className="data-scroll collection-review-scroll min-h-0 flex-1">
              <table className="data-table min-w-[760px]">
                <thead><tr>{canManage ? <th className="w-10">Order</th> : null}<th>Title</th><th>Type</th><th>Status / Lane</th><th>Genre</th><th>Owner / Creator</th><th>Collection Note</th>{canManage ? <th>Action</th> : null}</tr></thead>
                <tbody>
                  {collectionItems.map((item) => {
                    const project = item.projectId ? projects.find((entry) => entry.id === item.projectId) : undefined;
                    const prospect = item.prospectId ? prospects.find((entry) => entry.id === item.prospectId) : undefined;
                    return (
                      <tr
                        key={item.id}
                        onDragOver={(event) => {
                          if (!canManage || !draggedItemId) return;
                          event.preventDefault();
                          setDragOverItemId(item.id);
                        }}
                        onDragLeave={() => setDragOverItemId((current) => current === item.id ? "" : current)}
                        onDrop={(event) => {
                          event.preventDefault();
                          dropReviewItem(item.id);
                        }}
                        className={cn(dragOverItemId === item.id && "outline outline-1 outline-amberline/45")}
                      >
                        {canManage ? (
                          <td>
                            <button
                              type="button"
                              draggable
                              onDragStart={(event) => {
                                setDraggedItemId(item.id);
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", item.id);
                              }}
                              onDragEnd={() => {
                                setDraggedItemId("");
                                setDragOverItemId("");
                              }}
                              className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded border border-white/10 text-studio-400 transition hover:border-amberline/40 hover:text-amberline active:cursor-grabbing"
                              aria-label={`Reorder ${project?.title ?? prospect?.title ?? "collection item"}`}
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                          </td>
                        ) : null}
                        <td className="py-2.5">
                          {project ? <Link className="font-semibold text-studio-100 hover:text-amberline" href={`/projects/${project.id}`}>{project.title}</Link> : null}
                          {prospect ? <span className="font-semibold text-studio-100">{prospect.title}</span> : null}
                          {!project && !prospect ? <span className="text-studio-400">Missing item</span> : null}
                        </td>
                        <td><Badge value={item.itemType === "PROJECT" ? "DEVELOPMENT" : "SUBMISSION"} /></td>
                        <td>{project ? <Badge value={project.status} /> : <span className="text-studio-300">{prospect?.lane || prospect?.nextActionStatus || "-"}</span>}</td>
                        <td>{project?.genre || prospect?.genre || "-"}</td>
                        <td>{project ? userName(project.ownerId) : prospect ? prospectOwnerLabel(prospect, users) : "-"}</td>
                        <td className="max-w-[260px] text-studio-300">{item.notes || "-"}</td>
                        {canManage ? <td className="sticky right-0 z-10 bg-studio-950/95 text-right shadow-[-8px_0_12px_rgba(0,0,0,0.18)]"><CollectionRemoveButton label="Remove" itemName={project?.title ?? prospect?.title ?? "this item"} itemKind="item" onRemove={() => onRemoveItem(item.id)} /></td> : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyState label="No projects or prospects in this collection yet." />}
        </Panel>
      </div>
      {createOpen ? <CollectionCreateModal title="Create Slate Collection" onClose={() => setCreateOpen(false)} onCreate={createCollection} /> : null}
      {addItemOpen && selectedCollection ? (
        <CollectionSlateItemAddModal
          collectionName={selectedCollection.name}
          itemType={itemType}
          selectedItemIds={selectedItemIds}
          itemSearchField={itemSearchField}
          itemSearch={itemSearch}
          itemSearchSelections={itemSearchSelections}
          itemNotes={itemNotes}
          selectedItems={selectedItems}
          visibleItems={visibleAvailableItems}
          itemSearchOptions={itemSearchOptions}
          onClose={() => setAddItemOpen(false)}
          onSubmit={submitItem}
          onItemTypeChange={(nextType) => { setItemType(nextType); setSelectedItemIds([]); setItemSearch(""); setItemSearchSelections([]); }}
          onToggleItem={toggleSelectedItem}
          onSelectVisibleItems={selectVisibleItems}
          onClearSelectedItems={() => setSelectedItemIds([])}
          onSearchFieldChange={(nextField) => { setItemSearchField(nextField); setItemSearch(""); setItemSearchSelections([]); }}
          onSearchChange={setItemSearch}
          onSelectSearchOption={(option) => { setItemSearchSelections((current) => current.includes(option) ? current : [...current, option]); setItemSearch(""); }}
          onRemoveSearchOption={(option) => setItemSearchSelections((current) => current.filter((item) => item !== option))}
          onNotesChange={setItemNotes}
        />
      ) : null}
    </div>
  );
}





function CollectionSlateItemAddModal({
  collectionName,
  itemType,
  selectedItemIds,
  itemSearchField,
  itemSearch,
  itemSearchSelections,
  itemNotes,
  selectedItems,
  visibleItems,
  itemSearchOptions,
  onClose,
  onSubmit,
  onItemTypeChange,
  onToggleItem,
  onSelectVisibleItems,
  onClearSelectedItems,
  onSearchFieldChange,
  onSearchChange,
  onSelectSearchOption,
  onRemoveSearchOption,
  onNotesChange
}: {
  collectionName: string;
  itemType: SlateCollectionItemType;
  selectedItemIds: string[];
  itemSearchField: CollectionSearchField;
  itemSearch: string;
  itemSearchSelections: string[];
  itemNotes: string;
  selectedItems: Array<HammerProject | HammerProjectLead>;
  visibleItems: Array<HammerProject | HammerProjectLead>;
  itemSearchOptions: string[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onItemTypeChange: (itemType: SlateCollectionItemType) => void;
  onToggleItem: (itemId: string) => void;
  onSelectVisibleItems: () => void;
  onClearSelectedItems: () => void;
  onSearchFieldChange: (field: CollectionSearchField) => void;
  onSearchChange: (term: string) => void;
  onSelectSearchOption: (option: string) => void;
  onRemoveSearchOption: (option: string) => void;
  onNotesChange: (notes: string) => void;
}) {
  const selectedIdSet = new Set(selectedItemIds);
  const visibleSelectedCount = visibleItems.filter((item) => selectedIdSet.has(item.id)).length;
  const allVisibleSelected = Boolean(visibleItems.length) && visibleSelectedCount === visibleItems.length;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="modal-card mt-10 flex max-h-[88vh] w-full max-w-3xl flex-col rounded-xl border border-white/10 bg-studio-950 p-4 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <SectionHeader eyebrow="Review List" title="Add Items" />
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close add items">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs leading-5 text-studio-400">Select one or more Development Slate items or Prospects to add to {collectionName}.</p>
        <div className="grid min-h-0 gap-3">
          <select className="field" value={itemType} onChange={(event) => onItemTypeChange(event.target.value as SlateCollectionItemType)}>
            <option value="PROJECT">Development Slate</option>
            <option value="PROSPECT">Prospect</option>
          </select>
          <CollectionSearchControls
            field={itemSearchField}
            term={itemSearch}
            selectedOptions={itemSearchSelections}
            options={itemSearchOptions}
            onFieldChange={onSearchFieldChange}
            onTermChange={onSearchChange}
            onSelectOption={onSelectSearchOption}
            onRemoveOption={onRemoveSearchOption}
            placeholder={`Search ${itemType === "PROJECT" ? "development slate" : "prospects"} ${statusLabel(itemSearchField).toLowerCase()}`}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-2">
            <p className="text-xs text-studio-300">{selectedItemIds.length} selected / {visibleItems.length} shown</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" disabled={!visibleItems.length || allVisibleSelected} onClick={onSelectVisibleItems} className="rounded border border-white/10 px-2 py-1 text-[11px] font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline disabled:cursor-not-allowed disabled:opacity-40">Select shown</button>
              <button type="button" disabled={!selectedItemIds.length} onClick={onClearSelectedItems} className="rounded border border-white/10 px-2 py-1 text-[11px] font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline disabled:cursor-not-allowed disabled:opacity-40">Clear</button>
            </div>
          </div>
          {selectedItems.length ? (
            <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-amberline/20 bg-amberline/10 p-2">
              {selectedItems.map((item) => (
                <button key={item.id} type="button" onClick={() => onToggleItem(item.id)} className="inline-flex items-center gap-1 rounded-full border border-amberline/25 bg-studio-950/40 px-2 py-1 text-[11px] font-semibold text-amberline" title="Remove from selection">
                  {item.title}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          ) : null}
          <input className="field" value={itemNotes} onChange={(event) => onNotesChange(event.target.value)} placeholder="Optional collection note applied to selected items" />
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-white/10 bg-white/[0.02] p-1.5">
            {visibleItems.length ? visibleItems.map((item) => {
              const selected = selectedIdSet.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggleItem(item.id)}
                  className={cn("flex w-full items-start gap-3 rounded px-2.5 py-2 text-left text-xs transition hover:bg-white/[0.04]", selected && "bg-amberline/10")}
                  aria-pressed={selected}
                >
                  <span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border", selected ? "border-amberline bg-amberline text-studio-950" : "border-white/20 text-transparent")}>
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate font-semibold", selected ? "text-amberline" : "text-studio-100")}>{item.title}</span>
                    <span className="mt-0.5 block truncate text-studio-400">
                      {itemType === "PROJECT"
                        ? `${(item as HammerProject).genre || "No genre"} / ${(item as HammerProject).status || "No status"}`
                        : `${(item as HammerProjectLead).creator || "No writer"} / ${(item as HammerProjectLead).genre || "No genre"}`}
                    </span>
                  </span>
                </button>
              );
            }) : <p className="px-2.5 py-3 text-xs text-studio-400">No available {itemType === "PROJECT" ? "development slate items" : "prospects"} match that search, or every matching item is already in this collection.</p>}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 transition hover:border-white/20 hover:text-studio-100">Cancel</button>
          <button type="submit" disabled={!selectedItemIds.length} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">
            <Plus className="h-4 w-4" />
            Add {selectedItemIds.length || ""} Item{selectedItemIds.length === 1 ? "" : "s"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CollectionCreateModal({
  title,
  onClose,
  onCreate
}: {
  title: string;
  onClose: () => void;
  onCreate: (input: { name: string; description?: string; visibility: "PROJECT_TEAM" | "INTERNAL" | "EXECUTIVE_ONLY" }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PROJECT_TEAM" | "INTERNAL" | "EXECUTIVE_ONLY">("PROJECT_TEAM");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Collection name is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onCreate({ name: name.trim(), description: description.trim() || undefined, visibility });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create collection.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="modal-card mt-16 w-full max-w-lg rounded-xl border border-white/10 bg-studio-950 p-4 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <SectionHeader eyebrow="Collections" title={title} />
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close create collection">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Name</span>
            <input className="field" value={name} disabled={busy} onChange={(event) => setName(event.target.value)} placeholder="Collection name" autoFocus />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Description</span>
            <textarea className="field min-h-28" value={description} disabled={busy} onChange={(event) => setDescription(event.target.value)} placeholder="Purpose, review context, meeting, or deadline" />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Visibility</span>
            <select className="field" value={visibility} disabled={busy} onChange={(event) => setVisibility(event.target.value as "PROJECT_TEAM" | "INTERNAL" | "EXECUTIVE_ONLY")}>
              <option value="PROJECT_TEAM">Project Team</option>
              <option value="INTERNAL">Internal</option>
              <option value="EXECUTIVE_ONLY">Executive Only</option>
            </select>
          </label>
        </div>
        {error ? <p className="mt-3 rounded-md border border-rose-300/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 transition hover:border-white/20 hover:text-studio-100 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Collection
          </button>
        </div>
      </form>
    </div>
  );
}

function CollectionRemoveButton({ label, itemName, itemKind, onRemove }: { label: string; itemName: string; itemKind: "script" | "item"; onRemove: () => void }) {
  function confirmRemove() {
    const retained = itemKind === "script" ? "The script/document will stay in GreenLight." : "The project or prospect will stay in GreenLight.";
    if (window.confirm(`Remove "${itemName}" from this collection? ${retained}`)) onRemove();
  }

  return (
    <button type="button" onClick={confirmRemove} className="inline-flex items-center gap-1 rounded border border-rose-400/25 bg-rose-500/5 px-1.5 py-1 text-[11px] font-semibold text-rose-300 hover:border-rose-300/50 hover:text-rose-200" title="Remove from this collection only">
      <X className="h-3 w-3" />
      {label}
    </button>
  );
}

function CollectionActions({
  collection,
  canManage,
  onArchive,
  onDelete
}: {
  collection: HammerScriptCollection | HammerSlateCollection;
  canManage: boolean;
  onArchive: () => void;
  onDelete: () => void;
}) {
  if (!canManage) return <Badge value={collection.status} />;
  const archived = collection.status === "ARCHIVED";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge value={collection.status} />
      {!archived ? (
        <button type="button" onClick={onArchive} className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.025] px-2 py-1 text-[11px] font-semibold text-studio-300 transition hover:border-amberline/40 hover:text-amberline" title="Archive this grouping only. Projects, prospects, scripts, and documents are not deleted.">
          <Archive className="h-3 w-3" />
          Archive
        </button>
      ) : null}
      <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded border border-rose-400/25 bg-rose-500/5 px-2 py-1 text-[11px] font-semibold text-rose-300 transition hover:border-rose-300/50 hover:text-rose-200" title="Delete this grouping only. Projects, prospects, scripts, and documents are not deleted.">
        <Trash2 className="h-3 w-3" />
        Delete
      </button>
    </div>
  );
}

function ScriptCollections({
  collections,
  items,
  documents,
  versions,
  projects,
  canManage,
  onCreateCollection,
  onAddDocument,
  onRemoveDocument,
  onReorderItems,
  onArchiveCollection,
  onDeleteCollection
}: {
  collections: HammerScriptCollection[];
  items: HammerScriptCollectionItem[];
  documents: HammerDocument[];
  versions: HammerDocumentVersion[];
  projects: HammerProject[];
  canManage: boolean;
  onCreateCollection: (input: { name: string; description?: string; visibility?: HammerScriptCollection["visibility"] }) => Promise<void>;
  onAddDocument: (collectionId: string, documentId: string, notes?: string) => Promise<void>;
  onRemoveDocument: (collectionItemId: string) => Promise<void>;
  onReorderItems: (collectionId: string, collectionItemIds: string[]) => Promise<void>;
  onArchiveCollection: (collectionId: string) => Promise<void>;
  onDeleteCollection: (collectionId: string) => Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedCollectionId, setSelectedCollectionId] = useState(collections[0]?.id ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [documentId, setDocumentId] = useState("");
  const [documentSearchField, setDocumentSearchField] = useState<CollectionSearchField>("title");
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentSearchSelections, setDocumentSearchSelections] = useState<string[]>([]);
  const [itemNotes, setItemNotes] = useState("");
  const [message, setMessage] = useState("");
  const [draggedItemId, setDraggedItemId] = useState("");
  const [dragOverItemId, setDragOverItemId] = useState("");
  const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId) ?? collections[0];
  const collectionItems = selectedCollection ? items.filter((item) => item.collectionId === selectedCollection.id).sort((a, b) => a.sortOrder - b.sortOrder || a.addedAt.localeCompare(b.addedAt)) : [];
  const collectionDocumentIds = new Set(collectionItems.map((item) => item.documentId));
  const scriptDocuments = documents.filter((document) => ["SCRIPT", "TREATMENT", "OUTLINE", "NOTES", "COVERAGE", "BUSINESS_DOCUMENT"].includes(document.type));
  const availableDocuments = scriptDocuments.filter((document) => !collectionDocumentIds.has(document.id));
  const selectedDocument = availableDocuments.find((document) => document.id === documentId);
  const documentSearchOptions = collectionOptionValues(availableDocuments, (document) => documentCollectionSearchValue(document, documentSearchField, projects));
  const visibleAvailableDocuments = availableDocuments
    .filter((document) => matchesTargetedCollectionSearch(documentCollectionSearchValue(document, documentSearchField, projects), documentSearch, documentSearchSelections))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }))
    .slice(0, 50);

  useEffect(() => {
    const linkedCollectionId = searchParams.get("collection");
    if (linkedCollectionId && collections.some((collection) => collection.id === linkedCollectionId)) {
      if (selectedCollectionId !== linkedCollectionId) setSelectedCollectionId(linkedCollectionId);
      return;
    }
    if (!selectedCollectionId && collections[0]) setSelectedCollectionId(collections[0].id);
    if (selectedCollectionId && !collections.some((collection) => collection.id === selectedCollectionId)) setSelectedCollectionId(collections[0]?.id ?? "");
  }, [collections, searchParams, selectedCollectionId]);

  async function createCollection(input: { name: string; description?: string; visibility: HammerScriptCollection["visibility"] }) {
    await onCreateCollection(input);
    setCreateOpen(false);
    setMessage("Collection created.");
  }

  async function submitDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCollection || !documentId) {
      setMessage("Choose a collection and document first.");
      return;
    }
    await onAddDocument(selectedCollection.id, documentId, itemNotes);
    setDocumentId("");
    setDocumentSearch("");
    setDocumentSearchSelections([]);
    setItemNotes("");
    setAddDocumentOpen(false);
    setMessage("Document added to collection.");
  }

  async function dropReviewItem(targetItemId: string) {
    if (!selectedCollection || !draggedItemId || draggedItemId === targetItemId) {
      setDraggedItemId("");
      setDragOverItemId("");
      return;
    }
    const orderedIds = collectionItems.map((item) => item.id);
    await onReorderItems(selectedCollection.id, moveId(orderedIds, draggedItemId, targetItemId));
    setDraggedItemId("");
    setDragOverItemId("");
  }

  async function archiveSelectedCollection() {
    if (!selectedCollection) return;
    if (window.confirm(`Archive "${selectedCollection.name}"? This hides the script group from active review packets but does not delete any scripts or documents.`)) {
      await onArchiveCollection(selectedCollection.id);
      setMessage("Collection archived. Scripts and documents were not deleted.");
    }
  }

  async function deleteSelectedCollection() {
    if (!selectedCollection) return;
    if (window.confirm(`Delete "${selectedCollection.name}"? This removes only the collection grouping and its membership list. Scripts and documents stay in GreenLight.`)) {
      await onDeleteCollection(selectedCollection.id);
      setMessage("Collection deleted. Scripts and documents were not deleted.");
    }
  }

  return (
    <div className="collections-grid grid h-full min-h-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="collections-column flex min-h-0 flex-col gap-4">
        <Panel className="flex min-h-0 flex-1 flex-col">
          <SectionHeader eyebrow="Packets" title="Document Packets" action={canManage ? <PrimaryButton icon={Plus} label="Create Packet" onClick={() => setCreateOpen(true)} /> : undefined} />
          <div className="collections-list mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-0.5">
            {collections.length ? collections.map((collection) => {
              const count = items.filter((item) => item.collectionId === collection.id).length;
              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => { setSelectedCollectionId(collection.id); router.replace(`/collections?type=scripts&collection=${encodeURIComponent(collection.id)}`, { scroll: false }); }}
                  className={cn("rounded-md border p-3 text-left transition", selectedCollection?.id === collection.id ? "border-amberline/45 bg-amberline/10" : "border-white/10 bg-white/[0.03] hover:border-white/25")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-studio-100">{collection.name}</p>
                    <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-studio-300">{count}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-studio-400">{collection.description || "No description yet."}</p>
                </button>
              );
            }) : <EmptyState label="No document packets yet." />}
          </div>
        </Panel>

        {message ? <p className="px-1 text-xs text-studio-300">{message}</p> : null}

      </div>

      <div className="collections-detail-column flex min-h-0 flex-col">
        <Panel className="flex min-h-0 flex-1 flex-col">
          <SectionHeader
            eyebrow="Review List"
            title={selectedCollection?.name ?? "Select a Collection"}
            action={selectedCollection ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <ShareButton title={selectedCollection.name} type="Collection" status={selectedCollection.status} summary={selectedCollection.description} href={`/collections?type=scripts&collection=${encodeURIComponent(selectedCollection.id)}`} />
                {canManage ? (
                  <button type="button" onClick={() => setAddDocumentOpen(true)} className="inline-flex items-center gap-1 rounded border border-amberline/35 bg-amberline/10 px-2 py-1 text-[11px] font-semibold text-amberline transition hover:bg-amberline hover:text-studio-950">
                    <Plus className="h-3 w-3" />
                    Add Documents
                  </button>
                ) : null}
                <CollectionActions collection={selectedCollection} canManage={canManage} onArchive={archiveSelectedCollection} onDelete={deleteSelectedCollection} />
              </div>
            ) : undefined}
          />
          {selectedCollection?.description ? <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-studio-300">{selectedCollection.description}</p> : null}
          {collectionItems.length ? (
            <div className="data-scroll collection-review-scroll min-h-0 flex-1">
              <table className="data-table min-w-[760px]">
                <thead><tr>{canManage ? <th className="w-10">Order</th> : null}<th>Title</th><th>Project</th><th>Status</th><th>Writer</th><th>Collection Note</th>{canManage ? <th className="sticky right-0 z-10 bg-studio-950/95 text-right shadow-[-8px_0_12px_rgba(0,0,0,0.18)]">Action</th> : null}</tr></thead>
                <tbody>
                  {collectionItems.map((item) => {
                    const document = documents.find((entry) => entry.id === item.documentId);
                    const version = document ? currentVersionFor(document.id, documents, versions) : undefined;
                    return (
                      <tr
                        key={item.id}
                        onDragOver={(event) => {
                          if (!canManage || !draggedItemId) return;
                          event.preventDefault();
                          setDragOverItemId(item.id);
                        }}
                        onDragLeave={() => setDragOverItemId((current) => current === item.id ? "" : current)}
                        onDrop={(event) => {
                          event.preventDefault();
                          dropReviewItem(item.id);
                        }}
                        className={cn(dragOverItemId === item.id && "outline outline-1 outline-amberline/45")}
                      >
                        {canManage ? (
                          <td>
                            <button
                              type="button"
                              draggable
                              onDragStart={(event) => {
                                setDraggedItemId(item.id);
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", item.id);
                              }}
                              onDragEnd={() => {
                                setDraggedItemId("");
                                setDragOverItemId("");
                              }}
                              className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded border border-white/10 text-studio-400 transition hover:border-amberline/40 hover:text-amberline active:cursor-grabbing"
                              aria-label={`Reorder ${document?.title ?? "script"}`}
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                          </td>
                        ) : null}
                        <td className="py-2.5">{document ? <Link className="font-semibold text-studio-100 hover:text-amberline" href={`/scripts/${document.id}`}>{document.title}</Link> : <span className="text-studio-400">Missing document</span>}</td>
                        <td>{document?.projectId ? projectTitleFromList(document.projectId, projects) : "Inbox"}</td>
                        <td><Badge value={version?.status ?? "DRAFT"} /></td>
                        <td>{document?.writerName ?? (document?.createdById ? userName(document.createdById) : "Unassigned")}</td>
                        <td className="max-w-[260px] text-studio-300">{item.notes || "-"}</td>
                        {canManage ? <td className="sticky right-0 z-10 bg-studio-950/95 text-right shadow-[-8px_0_12px_rgba(0,0,0,0.18)]"><CollectionRemoveButton label="Remove" itemName={document?.title ?? "this script"} itemKind="script" onRemove={() => onRemoveDocument(item.id)} /></td> : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyState label="No scripts in this collection yet." />}
        </Panel>
      </div>
      {createOpen ? <CollectionCreateModal title="Create Collection" onClose={() => setCreateOpen(false)} onCreate={createCollection} /> : null}
      {addDocumentOpen && selectedCollection ? (
        <CollectionDocumentAddModal
          collectionName={selectedCollection.name}
          documentId={documentId}
          documentSearchField={documentSearchField}
          documentSearch={documentSearch}
          documentSearchSelections={documentSearchSelections}
          itemNotes={itemNotes}
          selectedDocument={selectedDocument}
          visibleDocuments={visibleAvailableDocuments}
          documentSearchOptions={documentSearchOptions}
          documents={documents}
          versions={versions}
          projects={projects}
          onClose={() => setAddDocumentOpen(false)}
          onSubmit={submitDocument}
          onDocumentIdChange={setDocumentId}
          onSearchFieldChange={(nextField) => { setDocumentSearchField(nextField); setDocumentId(""); setDocumentSearch(""); setDocumentSearchSelections([]); }}
          onSearchChange={(term) => { setDocumentSearch(term); setDocumentId(""); }}
          onSelectSearchOption={(option) => { setDocumentSearchSelections((current) => current.includes(option) ? current : [...current, option]); setDocumentSearch(""); setDocumentId(""); }}
          onRemoveSearchOption={(option) => { setDocumentSearchSelections((current) => current.filter((item) => item !== option)); setDocumentId(""); }}
          onNotesChange={setItemNotes}
        />
      ) : null}
    </div>
  );
}


function CollectionDocumentAddModal({
  collectionName,
  documentId,
  documentSearchField,
  documentSearch,
  documentSearchSelections,
  itemNotes,
  selectedDocument,
  visibleDocuments,
  documentSearchOptions,
  documents,
  versions,
  projects,
  onClose,
  onSubmit,
  onDocumentIdChange,
  onSearchFieldChange,
  onSearchChange,
  onSelectSearchOption,
  onRemoveSearchOption,
  onNotesChange
}: {
  collectionName: string;
  documentId: string;
  documentSearchField: CollectionSearchField;
  documentSearch: string;
  documentSearchSelections: string[];
  itemNotes: string;
  selectedDocument?: HammerDocument;
  visibleDocuments: HammerDocument[];
  documentSearchOptions: string[];
  documents: HammerDocument[];
  versions: HammerDocumentVersion[];
  projects: HammerProject[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onDocumentIdChange: (documentId: string) => void;
  onSearchFieldChange: (field: CollectionSearchField) => void;
  onSearchChange: (term: string) => void;
  onSelectSearchOption: (option: string) => void;
  onRemoveSearchOption: (option: string) => void;
  onNotesChange: (notes: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="modal-card mt-10 flex max-h-[88vh] w-full max-w-3xl flex-col rounded-xl border border-white/10 bg-studio-950 p-4 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <SectionHeader eyebrow="Review List" title="Add Documents" />
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close add documents">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs leading-5 text-studio-400">Add scripts, treatments, coverage, notes, or business documents to {collectionName}.</p>
        <div className="grid min-h-0 gap-3">
          <CollectionSearchControls
            field={documentSearchField}
            term={documentSearch}
            selectedOptions={documentSearchSelections}
            options={documentSearchOptions}
            onFieldChange={onSearchFieldChange}
            onTermChange={onSearchChange}
            onSelectOption={onSelectSearchOption}
            onRemoveOption={onRemoveSearchOption}
            placeholder={`Search documents by ${statusLabel(documentSearchField).toLowerCase()}`}
          />
          {selectedDocument ? <p className="text-xs text-amberline">Selected: {selectedDocument.title}</p> : null}
          <input className="field" value={itemNotes} onChange={(event) => onNotesChange(event.target.value)} placeholder="Optional collection note" />
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-white/10 bg-white/[0.02] p-1.5">
            {visibleDocuments.length ? visibleDocuments.map((document) => {
              const version = currentVersionFor(document.id, documents, versions);
              return (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => onDocumentIdChange(document.id)}
                  className={cn("flex w-full items-start justify-between gap-3 rounded px-2.5 py-2 text-left text-xs transition hover:bg-white/[0.04]", documentId === document.id && "bg-amberline/10 text-amberline")}
                >
                  <span>
                    <span className="block font-semibold text-studio-100">{document.title}</span>
                    <span className="mt-0.5 block text-studio-400">{statusLabel(document.type)} / {document.writerName || "No writer"} / {document.projectId ? projectTitleFromList(document.projectId, projects) : "Inbox"} / {statusLabel(version?.status ?? "DRAFT")}</span>
                  </span>
                  {documentId === document.id ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amberline" /> : null}
                </button>
              );
            }) : <p className="px-2.5 py-3 text-xs text-studio-400">No available documents match that search.</p>}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 transition hover:border-white/20 hover:text-studio-100">Cancel</button>
          <button type="submit" disabled={!documentId} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">
            <Plus className="h-4 w-4" />
            Add Document
          </button>
        </div>
      </form>
    </div>
  );
}

function ScriptDetail({
  documentId,
  documents = hammerDocuments,
  projects = hammerProjects,
  users = hammerUsers,
  versions = hammerVersions,
  comments = hammerComments,
  currentUser,
  supportingDocuments = [],
  onUpload,
  onSupportingUpload,
  onSupportingDelete,
  onStatusChange,
  onUpdateVersionNotes,
  onUpdateVersionMarkdown,
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
  onUpdateMetadata,
  onUpdateTags,
  onDelete
}: {
  documentId: string;
  documents?: HammerDocument[];
  projects?: HammerProject[];
  users?: HammerUser[];
  versions?: HammerDocumentVersion[];
  comments?: HammerComment[];
  currentUser?: HammerUser;
  supportingDocuments?: SupportingDocument[];
  onUpload?: (input: DocumentUploadInput) => Promise<DocumentUploadResult | void>;
  onSupportingUpload?: (input: { scriptDocumentId: string; title: string; type: SupportingDocumentType; source: string; notes: string; file: File }) => Promise<void>;
  onSupportingDelete?: (documentId: string) => void;
  onStatusChange?: (versionId: string, status: ScriptStatus) => void;
  onUpdateVersionNotes?: (versionId: string, notes: string) => Promise<void>;
  onUpdateVersionMarkdown?: (versionId: string, markdownNotes: string) => Promise<void>;
  onCreateComment?: (input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) => Promise<void>;
  onUpdateComment?: (commentId: string, input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onUpdateMetadata?: (documentId: string, patch: Partial<Pick<HammerDocument, "title" | "type" | "writerName" | "source">>) => Promise<void>;
  onUpdateTags?: (documentId: string, tags: Array<Pick<HammerDocumentTag, "key" | "value">>) => Promise<void>;
  onDelete?: (documentId: string) => void;
}) {
  const doc = documents.find((item) => item.id === documentId) ?? documents[0] ?? emptyDocument;
  const textState = useDocumentVersionsWithText(doc.id, versions);
  const versionsWithText = textState.versionsWithText;
  const version = currentVersionFor(doc.id, documents, versionsWithText);
  const [tab, setTab] = useState<"overview" | "notes" | "files" | "compare" | "breakdown">("overview");
  const [metadataDraft, setMetadataDraft] = useState({
    title: doc.title,
    type: doc.type,
    writerName: doc.writerName ?? "",
    source: doc.source ?? ""
  });
  const [tagDrafts, setTagDrafts] = useState<Array<Pick<HammerDocumentTag, "key" | "value">>>(normalizedDocumentTags(doc.tags));
  const [tagKeyDraft, setTagKeyDraft] = useState("");
  const [tagValueDraft, setTagValueDraft] = useState("");
  const [tagMessage, setTagMessage] = useState("");
  const [tagBusy, setTagBusy] = useState(false);
  const [quickNoteDraft, setQuickNoteDraft] = useState("");
  const [quickNoteTarget, setQuickNoteTarget] = useState<"VERSION" | "SCRIPT">("VERSION");
  const [quickNoteVisibility, setQuickNoteVisibility] = useState<HammerComment["visibility"]>("PROJECT_TEAM");
  const [metadataMessage, setMetadataMessage] = useState("");
  const [quickNoteMessage, setQuickNoteMessage] = useState("");
  const [quickNoteBusy, setQuickNoteBusy] = useState(false);
  const [markdownDraft, setMarkdownDraft] = useState(version?.markdownNotes ?? "");
  const [markdownMessage, setMarkdownMessage] = useState("");
  const [markdownBusy, setMarkdownBusy] = useState(false);
  const documentVersions = useMemo(() => versionsWithText.filter((item) => item.documentId === doc.id).sort((a, b) => b.versionNumber - a.versionNumber), [doc.id, versionsWithText]);
  const compareVersions = useMemo(() => [...documentVersions].sort((a, b) => a.versionNumber - b.versionNumber), [documentVersions]);
  const [compareFromVersionId, setCompareFromVersionId] = useState(compareVersions[0]?.id ?? "");
  const [compareToVersionId, setCompareToVersionId] = useState(compareVersions[1]?.id ?? compareVersions[0]?.id ?? "");
  const compareFromVersion = compareVersions.find((item) => item.id === compareFromVersionId) ?? compareVersions[0];
  const compareToVersion = compareVersions.find((item) => item.id === compareToVersionId) ?? compareVersions[1] ?? compareFromVersion;
  const compareDiff = buildTextDiff(compareFromVersion?.extractedText ?? "", compareToVersion?.extractedText ?? "");
  const attachedSupportingDocuments = supportingDocuments.filter((item) => item.scriptDocumentId === doc.id);
  const scriptComments = comments.filter((comment) => comment.targetId === doc.id);
  const versionComments = version ? comments.filter((comment) => comment.targetId === version.id) : [];
  const versionUploadNote = version?.notes?.trim() ?? "";
  const versionMarkdownNote = version?.markdownNotes?.trim() ?? "";
  const visibleNotesCount = scriptComments.length + versionComments.length + (versionUploadNote ? 1 : 0) + (versionMarkdownNote ? 1 : 0);
  const canDownload = canDownloadFiles(currentUser?.role);
  const hasSelectedVersion = Boolean(version);
  const selectedVersionMarkdown = version?.markdownNotes ?? "";

  useEffect(() => {
    setMetadataDraft({
      title: doc.title,
      type: doc.type,
      writerName: doc.writerName ?? "",
      source: doc.source ?? ""
    });
    setTagDrafts(normalizedDocumentTags(doc.tags));
    setMetadataMessage("");
    setTagMessage("");
    setTagKeyDraft("");
    setTagValueDraft("");
  }, [doc.id, doc.source, doc.tags, doc.title, doc.type, doc.writerName]);

  useEffect(() => {
    setQuickNoteDraft("");
    setQuickNoteMessage("");
    setQuickNoteTarget(hasSelectedVersion ? "VERSION" : "SCRIPT");
    setMarkdownDraft(selectedVersionMarkdown);
    setMarkdownMessage("");
  }, [doc.id, hasSelectedVersion, selectedVersionMarkdown, version?.id]);

  useEffect(() => {
    if (!compareVersions.length) return;
    if (!compareFromVersionId || !compareVersions.some((item) => item.id === compareFromVersionId)) {
      setCompareFromVersionId(compareVersions[0].id);
    }
    if (!compareToVersionId || !compareVersions.some((item) => item.id === compareToVersionId)) {
      setCompareToVersionId(compareVersions[1]?.id ?? compareVersions[0].id);
    }
  }, [compareFromVersionId, compareToVersionId, compareVersions]);

  async function saveMetadata() {
    if (!onUpdateMetadata) return;
    if (!metadataDraft.title.trim()) {
      setMetadataMessage("Title is required.");
      return;
    }
    try {
      await onUpdateMetadata(doc.id, {
        title: metadataDraft.title.trim(),
        type: metadataDraft.type,
        writerName: metadataDraft.writerName.trim(),
        source: metadataDraft.source.trim()
      });
      setMetadataMessage("Script info updated.");
    } catch (error) {
      setMetadataMessage(error instanceof Error ? error.message : "Could not update script info.");
    }
  }

  async function persistTagDrafts(nextTags: Array<Pick<HammerDocumentTag, "key" | "value">>, successMessage: string) {
    const normalizedTags = normalizedDocumentTags(nextTags);
    setTagDrafts(normalizedTags);
    setTagBusy(true);
    setTagMessage("Saving tags...");
    try {
      if (onUpdateTags) await onUpdateTags(doc.id, normalizedTags);
      setTagMessage(successMessage);
    } catch (error) {
      setTagDrafts(normalizedDocumentTags(doc.tags));
      setTagMessage(error instanceof Error ? error.message : "Could not update tags.");
    } finally {
      setTagBusy(false);
    }
  }

  async function addTagDraft() {
    if (tagBusy) return;
    const key = normalizeTagKey(tagKeyDraft);
    const value = tagValueDraft.trim().replace(/\s+/g, " ");
    if (!key || !value) {
      setTagMessage("Add both a tag key and value.");
      return;
    }
    const exists = tagDrafts.some((tag) => tag.key.toLowerCase() === key.toLowerCase() && tag.value.toLowerCase() === value.toLowerCase());
    if (exists) {
      setTagMessage("That tag is already attached.");
      return;
    }
    const nextTags = [...tagDrafts, { key, value }];
    setTagKeyDraft("");
    setTagValueDraft("");
    await persistTagDrafts(nextTags, "Tag added.");
  }

  async function removeTagDraft(index: number) {
    if (tagBusy) return;
    await persistTagDrafts(tagDrafts.filter((_, currentIndex) => currentIndex !== index), "Tag removed.");
  }

  async function saveQuickNote() {
    if (!onCreateComment || !quickNoteDraft.trim()) {
      setQuickNoteMessage(quickNoteDraft.trim() ? "Notes cannot be saved from this view yet." : "Write a note before saving.");
      return;
    }
    setQuickNoteBusy(true);
    setQuickNoteMessage("");
    try {
      await onCreateComment({
        targetType: quickNoteTarget === "VERSION" && version ? "DOCUMENT_VERSION" : "DOCUMENT",
        targetId: quickNoteTarget === "VERSION" && version ? version.id : doc.id,
        projectId: doc.projectId,
        body: quickNoteDraft.trim(),
        visibility: quickNoteVisibility
      });
      setQuickNoteDraft("");
      setQuickNoteMessage("Note saved.");
    } catch (error) {
      setQuickNoteMessage(error instanceof Error ? error.message : "Could not save note.");
    } finally {
      setQuickNoteBusy(false);
    }
  }

  async function saveMarkdownNotes() {
    if (!version || !onUpdateVersionMarkdown) {
      setMarkdownMessage("Version markdown cannot be saved from this view yet.");
      return;
    }
    setMarkdownBusy(true);
    setMarkdownMessage("");
    try {
      await onUpdateVersionMarkdown(version.id, markdownDraft);
      setMarkdownMessage("Version markdown saved.");
    } catch (error) {
      setMarkdownMessage(error instanceof Error ? error.message : "Could not save version markdown.");
    } finally {
      setMarkdownBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Panel>
        <SectionHeader
          eyebrow={doc.type}
          title={doc.title}
          action={
            <div className="flex flex-wrap gap-1.5">
              <ShareButton title={doc.title} type={statusLabel(doc.type)} status={version?.status} summary={doc.writerName ? `Writer: ${doc.writerName}` : undefined} href={`/scripts/${doc.id}`} />
              {onDelete && doc.id.startsWith("doc-local-") ? <DangerButton label="Delete" onClick={() => onDelete(doc.id)} /> : null}
            </div>
          }
        />
        <div className="grid gap-3 md:grid-cols-4">
          <SmallStat label="Status" value={statusLabel(version?.status ?? "DRAFT")} />
          <SmallStat label="Writer" value={doc.writerName ?? userName(doc.createdById)} />
          <SmallStat label="Project" value={doc.projectId ? projectTitleFromList(doc.projectId, projects) : "Inbox / Unassigned"} />
          <SmallStat label="Current Version" value={`v${version?.versionNumber ?? 1}`} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
          {[
            ["overview", "Overview"],
            ["notes", `Notes${visibleNotesCount ? ` (${visibleNotesCount})` : ""}`],
            ["files", "Files"],
            ["compare", "Compare"],
            ["breakdown", "Breakdown"]
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id as typeof tab)}
              className={cn("rounded-md border px-2.5 py-1.5 text-xs font-semibold transition", tab === id ? "border-amberline/45 bg-amberline/10 text-amberline" : "border-white/10 bg-white/[0.025] text-studio-300 hover:border-white/25")}
            >
              {label}
            </button>
          ))}
        </div>
      </Panel>

      {tab === "overview" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel>
              <SectionHeader eyebrow="Review" title="Current Decision" />
              <div className="space-y-3">
                <Badge value={version?.status ?? "DRAFT"} />
                {version && onStatusChange ? (
                  <select className="field" value={version.status} onChange={(event) => onStatusChange(version.id, event.target.value as ScriptStatus)}>
                    {hammerScriptStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                  </select>
                ) : null}
                {doc.source ? <SmallStat label="Source" value={doc.source} /> : null}
                {versionUploadNote ? (
                  <div className="rounded border border-white/10 bg-white/[0.03] p-2.5 text-[13px] text-studio-300">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Version Upload Note</p>
                    <p>{versionUploadNote}</p>
                  </div>
                ) : null}
                {onCreateComment ? (
                  <label className="grid gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Quick Note</span>
                    <textarea className="field min-h-24" value={quickNoteDraft} onChange={(event) => setQuickNoteDraft(event.target.value)} placeholder={quickNoteTarget === "VERSION" ? "Add a note to this script version" : "Add a note to the overall script"} />
                  </label>
                ) : (
                  <p className="text-[13px] text-studio-300">Open the Notes tab to review notes.</p>
                )}
                {onCreateComment ? (
                  <div className="grid gap-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Attach Note To</span>
                        <select className="field" value={quickNoteTarget} onChange={(event) => setQuickNoteTarget(event.target.value as "VERSION" | "SCRIPT")}>
                          {version ? <option value="VERSION">Current Version v{version.versionNumber}</option> : null}
                          <option value="SCRIPT">Overall Script</option>
                        </select>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Visibility</span>
                        <select className="field" value={quickNoteVisibility} onChange={(event) => setQuickNoteVisibility(event.target.value as HammerComment["visibility"])}>
                          <option value="PROJECT_TEAM">Project Team</option>
                          <option value="INTERNAL">Internal</option>
                          <option value="EXECUTIVE_ONLY">Executive Only</option>
                        </select>
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" disabled={quickNoteBusy || !quickNoteDraft.trim()} onClick={saveQuickNote} className="inline-flex items-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">
                        <CheckCircle2 className="h-4 w-4" />
                        {quickNoteTarget === "VERSION" ? "Save Version Note" : "Save Script Note"}
                      </button>
                      {quickNoteMessage ? <p className="text-xs text-studio-300">{quickNoteMessage}</p> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </Panel>
            <Panel>
              <SectionHeader eyebrow="Script Info" title="Core Fields" />
              {onUpdateMetadata ? (
                <div className="space-y-3">
                  <label className="grid gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Title</span>
                    <input className="field" value={metadataDraft.title} onChange={(event) => setMetadataDraft((current) => ({ ...current, title: event.target.value }))} />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Document Type</span>
                    <select className="field" value={metadataDraft.type} onChange={(event) => setMetadataDraft((current) => ({ ...current, type: event.target.value as DocumentType }))}>
                      {(["SCRIPT", "TREATMENT", "OUTLINE", "NOTES", "COVERAGE", "BUSINESS_DOCUMENT"] as DocumentType[]).map((documentType) => (
                        <option key={documentType} value={documentType}>{statusLabel(documentType)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Writer</span>
                    <input className="field" value={metadataDraft.writerName} onChange={(event) => setMetadataDraft((current) => ({ ...current, writerName: event.target.value }))} placeholder="Writer name" />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Source</span>
                    <input className="field" value={metadataDraft.source} onChange={(event) => setMetadataDraft((current) => ({ ...current, source: event.target.value }))} placeholder="Source, agency, manager, internal" />
                  </label>
                  <PrimaryButton icon={CheckCircle2} label="Save Info" onClick={saveMetadata} />
                  {metadataMessage ? <p className="text-xs text-studio-300">{metadataMessage}</p> : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <SmallStat label="Title" value={doc.title} />
                  <SmallStat label="Type" value={statusLabel(doc.type)} />
                  <SmallStat label="Writer" value={doc.writerName ?? userName(doc.createdById)} />
                  <SmallStat label="Source" value={doc.source ?? "Internal"} />
                </div>
              )}
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Tags</p>
                    <p className="mt-1 text-xs text-studio-500">Use key/value tags like agency, manager, contest, tone, or buyer.</p>
                  </div>
                </div>
                {tagDrafts.length ? (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {tagDrafts.map((tag, index) => (
                      <span key={`${tag.key}-${tag.value}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                        <span className="truncate"><span className="text-emerald-300">{tag.key}</span>: {tag.value}</span>
                        {onUpdateTags ? (
                          <button type="button" onClick={() => removeTagDraft(index)} disabled={tagBusy} className="rounded-full text-emerald-100/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Remove ${tag.key} tag`}>
                            <X className="h-3 w-3" />
                          </button>
                        ) : null}
                      </span>
                    ))}
                  </div>
                ) : <p className="mb-3 text-xs text-studio-500">No tags yet.</p>}
                {onUpdateTags ? (
                  <div className="space-y-2">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] sm:items-end">
                      <label className="grid gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Key</span>
                        <input className="field" list="document-tag-key-options" value={tagKeyDraft} onChange={(event) => setTagKeyDraft(event.target.value)} placeholder="agency" disabled={tagBusy} />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Value</span>
                        <input className="field" value={tagValueDraft} onChange={(event) => setTagValueDraft(event.target.value)} placeholder="CAA" disabled={tagBusy} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addTagDraft(); } }} />
                      </label>
                      <button type="button" onClick={() => void addTagDraft()} disabled={tagBusy} className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-studio-200 transition hover:border-amberline/40 hover:text-amberline disabled:cursor-not-allowed disabled:opacity-50">{tagBusy ? "Saving..." : "Add"}</button>
                    </div>
                    <datalist id="document-tag-key-options">
                      {["source", "agency", "manager", "contest", "list", "genre", "tone", "buyer", "coverage", "priority"].map((key) => <option key={key} value={key} />)}
                    </datalist>
                    {tagMessage ? <p className="text-xs text-studio-300">{tagMessage}</p> : null}
                  </div>
                ) : null}
              </div>
            </Panel>
        </div>
      ) : null}

      {tab === "notes" ? (
        <ScriptNotesWorkspace
          document={doc}
          version={version}
          versionUploadNote={versionUploadNote}
          versionMarkdownNote={versionMarkdownNote}
          comments={[...scriptComments, ...versionComments]}
          currentUser={currentUser}
          users={users}
          onCreateComment={onCreateComment}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
        />
      ) : null}

      {tab === "files" ? (
        <Panel>
          <SectionHeader eyebrow="Files" title="Script Packet" action={<div className="flex flex-wrap gap-1.5">{onSupportingUpload ? <SupportingDocumentUpload documentId={doc.id} onUpload={onSupportingUpload} /> : null}{onUpload ? <PrimaryButton icon={Plus} label="Compare Versions" onClick={() => setTab("compare")} /> : null}</div>} />
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-studio-100">Context Files</h3>
                <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-studio-300">{attachedSupportingDocuments.length + (version ? 1 : 0)}</span>
              </div>
              <div className="grid gap-2">
                <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold text-studio-100">{doc.title}</p>
                        <Badge value="Primary Script" subtle />
                        {version ? <Badge value={`v${version.versionNumber}`} /> : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-studio-400">{version?.fileName ?? doc.title} / {version?.fileType ?? doc.type} / {version ? formatBytes(version.fileSize) : "Unknown size"}</p>
                      {version?.storagePath ? <p className="mt-2 break-all text-xs text-studio-400">{version.storagePath}</p> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {version ? <span className="text-[11px] text-studio-500">{version.createdAt}</span> : null}
                      {canDownload && version ? <DownloadFileLink fileName={version.fileName} dataUrl={version.dataUrl} fallbackText={version.extractedText} resourceType="documentVersion" resourceId={version.id} currentUser={currentUser} compact /> : null}
                    </div>
                  </div>
                </div>
                {attachedSupportingDocuments.length ? attachedSupportingDocuments.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 transition hover:border-amberline/30 hover:bg-white/[0.05]">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-semibold text-studio-100">{item.title}</p>
                          <Badge value={item.type} />
                        </div>
                        <p className="mt-1 truncate text-xs text-studio-400">{item.fileName} / {item.fileType} / {formatBytes(item.fileSize)}</p>
                        {item.source ? <p className="mt-1 text-xs text-studio-400">Source: {item.source}</p> : null}
                        {item.notes ? <p className="mt-2 text-[13px] leading-5 text-studio-300">{item.notes}</p> : null}
                        {item.extractedText ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-studio-400">{item.extractedText}</p> : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-[11px] text-studio-500">{item.uploadedAt}</span>
                        {canDownload ? <DownloadFileLink fileName={item.fileName} dataUrl={item.dataUrl} fallbackText={item.extractedText} resourceType="supportingDocument" resourceId={item.id} currentUser={currentUser} compact /> : null}
                        {onSupportingDelete ? <DangerButton label="Delete" onClick={() => onSupportingDelete(item.id)} /> : null}
                      </div>
                    </div>
                  </div>
                )) : (
                  <EmptyState label="Add context documents, coverage, emails, writer notes, or other reference material connected to this script." />
                )}
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      {tab === "compare" ? (
        <Panel>
          <SectionHeader eyebrow="Compare" title="Version Comparison" action={onUpload ? <TableLink href={`/scripts/${doc.id}/versions`}>Manage versions</TableLink> : undefined} />
          {textState.loading ? <p className="mb-3 rounded border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-studio-300">Loading version text for comparison...</p> : null}
          {textState.message ? <p className="mb-3 rounded border border-ember/30 bg-ember/10 px-2.5 py-2 text-xs text-ember">{textState.message}</p> : null}
          {compareVersions.length > 1 ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Version A</span>
                  <select className="field" value={compareFromVersion?.id ?? ""} onChange={(event) => setCompareFromVersionId(event.target.value)}>
                    {compareVersions.map((item) => <option key={item.id} value={item.id}>v{item.versionNumber} / {item.fileName}</option>)}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Version B</span>
                  <select className="field" value={compareToVersion?.id ?? ""} onChange={(event) => setCompareToVersionId(event.target.value)}>
                    {compareVersions.map((item) => <option key={item.id} value={item.id}>v{item.versionNumber} / {item.fileName}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <SmallStat label="Version A" value={compareFromVersion ? `v${compareFromVersion.versionNumber}` : "None"} />
                <SmallStat label="Version B" value={compareToVersion ? `v${compareToVersion.versionNumber}` : "None"} />
                <SmallStat label="Summary" value={`${compareDiff.added} added / ${compareDiff.removed} removed`} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <DiffColumn title={compareFromVersion ? `v${compareFromVersion.versionNumber} removed` : "Version A"} lines={compareDiff.lines.filter((line) => line.kind !== "added")} />
                <DiffColumn title={compareToVersion ? `v${compareToVersion.versionNumber} added` : "Version B"} lines={compareDiff.lines.filter((line) => line.kind !== "removed")} />
              </div>
              <details className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <summary className="cursor-pointer text-sm font-semibold text-studio-100">Version History</summary>
                <div className="mt-3 grid gap-2">
                  {documentVersions.map((item) => <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><div className="flex items-center justify-between gap-3"><p className="text-[13px] font-semibold text-studio-100">Version {item.versionNumber}: {item.fileName}</p><div className="flex shrink-0 items-center gap-1.5">{canDownload ? <DownloadFileLink fileName={item.fileName} dataUrl={item.dataUrl} fallbackText={item.extractedText} resourceType="documentVersion" resourceId={item.id} currentUser={currentUser} compact /> : null}<Badge value={item.status} /></div></div><p className="mt-1.5 text-xs text-studio-300">{item.notes}</p>{item.markdownNotes ? <p className="mt-1 text-xs font-semibold text-amberline">Markdown notes attached</p> : null}<p className="mt-1 text-[11px] text-studio-500">{item.fileType} / {formatBytes(item.fileSize)} / {item.createdAt}</p></div>)}
                </div>
              </details>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-studio-100">Add another version to compare changes.</p>
              <p className="mt-1 text-xs leading-5 text-studio-400">This script currently has {documentVersions.length} version{documentVersions.length === 1 ? "" : "s"}. Use Manage versions to upload a new draft.</p>
            </div>
          )}
        </Panel>
      ) : null}

      {tab === "breakdown" ? (
        <Panel>
          <SectionHeader eyebrow="Optional" title="Script Breakdown" action={<TableLink href={`/scripts/${doc.id}/breakdown`}>Open Breakdown</TableLink>} />
          <p className="text-[13px] leading-6 text-studio-300">Breakdown is available when the team is ready to pull scenes, characters, locations, props, and action moments from the script. It stays out of the primary review flow until needed.</p>
        </Panel>
      ) : null}
    </div>
  );
}

function ScriptVersions({
  documentId,
  document,
  versions = hammerVersions,
  currentUser,
  onUpload
}: {
  documentId: string;
  document: HammerDocument;
  versions?: HammerDocumentVersion[];
  currentUser?: HammerUser;
  onUpload?: (input: DocumentUploadInput) => Promise<DocumentUploadResult | void>;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const textState = useDocumentVersionsWithText(documentId, versions);
  const versionsWithText = textState.versionsWithText;
  const documentVersions = versionsWithText.filter((version) => version.documentId === documentId).sort((a, b) => b.versionNumber - a.versionNumber);
  const compareVersions = [...documentVersions].sort((a, b) => a.versionNumber - b.versionNumber);
  const [fromVersionId, setFromVersionId] = useState(compareVersions[0]?.id ?? "");
  const [toVersionId, setToVersionId] = useState(compareVersions[1]?.id ?? compareVersions[0]?.id ?? "");
  const fromVersion = compareVersions.find((version) => version.id === fromVersionId) ?? compareVersions[0];
  const toVersion = compareVersions.find((version) => version.id === toVersionId) ?? compareVersions[1] ?? fromVersion;
  const diff = buildTextDiff(fromVersion?.extractedText ?? "", toVersion?.extractedText ?? "");
  const canDownload = canDownloadFiles(currentUser?.role);

  useEffect(() => {
    if (!compareVersions.length) return;
    if (!fromVersionId || !compareVersions.some((version) => version.id === fromVersionId)) {
      setFromVersionId(compareVersions[0].id);
    }
    if (!toVersionId || !compareVersions.some((version) => version.id === toVersionId)) {
      setToVersionId(compareVersions[1]?.id ?? compareVersions[0].id);
    }
  }, [compareVersions, fromVersionId, toVersionId]);

  return (
    <div className="space-y-4">
      <Panel>
        <SectionHeader eyebrow="History" title="Document Versions" action={onUpload ? <PrimaryButton icon={UploadCloud} label="Upload New Version" onClick={() => setUploadOpen(true)} /> : undefined} />
        {uploadOpen && onUpload ? <DocumentUploadPanel projectId={document.projectId} documents={[document]} onUpload={onUpload} onDone={() => setUploadOpen(false)} onCancel={() => setUploadOpen(false)} /> : null}
        <div className="grid gap-3">
          {documentVersions.map((version) => <div key={version.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><div className="flex items-center justify-between gap-3"><p className="text-[13px] font-semibold text-studio-100">Version {version.versionNumber}: {version.fileName}</p><div className="flex shrink-0 items-center gap-1.5">{canDownload ? <DownloadFileLink fileName={version.fileName} dataUrl={version.dataUrl} fallbackText={version.extractedText} resourceType="documentVersion" resourceId={version.id} currentUser={currentUser} compact /> : null}<Badge value={version.status} /></div></div><p className="mt-1.5 text-xs text-studio-300">{version.notes}</p>{version.markdownNotes ? <p className="mt-1 text-xs font-semibold text-amberline">Markdown notes attached</p> : null}<p className="mt-1 text-[11px] text-studio-500">{version.fileType} / {formatBytes(version.fileSize)} / {version.createdAt}</p></div>)}
        </div>
      </Panel>
      <Panel>
        <SectionHeader eyebrow="Compare" title="Version Comparison" />
        {textState.loading ? <p className="mb-3 rounded border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-studio-300">Loading version text for comparison...</p> : null}
        {textState.message ? <p className="mb-3 rounded border border-ember/30 bg-ember/10 px-2.5 py-2 text-xs text-ember">{textState.message}</p> : null}
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <select className="field" value={fromVersion?.id ?? ""} onChange={(event) => setFromVersionId(event.target.value)}>
            {compareVersions.map((version) => <option key={version.id} value={version.id}>Version A: v{version.versionNumber} / {version.fileName}</option>)}
          </select>
          <select className="field" value={toVersion?.id ?? ""} onChange={(event) => setToVersionId(event.target.value)}>
            {compareVersions.map((version) => <option key={version.id} value={version.id}>Version B: v{version.versionNumber} / {version.fileName}</option>)}
          </select>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <SmallStat label="Version A" value={fromVersion ? `v${fromVersion.versionNumber}` : "None"} />
          <SmallStat label="Version B" value={toVersion ? `v${toVersion.versionNumber}` : "None"} />
          <SmallStat label="Summary" value={`${diff.added} added / ${diff.removed} removed`} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <DiffColumn title={fromVersion ? `v${fromVersion.versionNumber} removed` : "Version A"} lines={diff.lines.filter((line) => line.kind !== "added")} />
          <DiffColumn title={toVersion ? `v${toVersion.versionNumber} added` : "Version B"} lines={diff.lines.filter((line) => line.kind !== "removed")} />
        </div>
      </Panel>
    </div>
  );
}

function NotesCenter({
  comments,
  users,
  projects,
  prospects = [],
  documents,
  versions,
  tasks,
  assets,
  approvals,
  currentUser,
  onUpdateComment,
  onDeleteComment
}: {
  comments: HammerComment[];
  users: HammerUser[];
  projects: HammerProject[];
  prospects?: HammerProjectLead[];
  documents: HammerDocument[];
  versions: HammerDocumentVersion[];
  tasks: HammerTask[];
  assets: HammerAsset[];
  approvals: HammerApproval[];
  currentUser: HammerUser;
  onUpdateComment?: (commentId: string, input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [targetFilter, setTargetFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [authorFilter, setAuthorFilter] = useState("ALL");
  const [selectedCommentId, setSelectedCommentId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = useResponsiveTablePageSize({ max: 12, reservedHeight: 360, rowHeight: 112 });
  const visibleNotes = comments.filter((comment) => comment.status !== "ARCHIVED");
  const authorIds = Array.from(new Set(visibleNotes.map((comment) => comment.createdById).filter(Boolean))).sort((left, right) => userNameFromList(left, users).localeCompare(userNameFromList(right, users)));
  const targetTypes = Array.from(new Set(visibleNotes.map((comment) => comment.targetType))).sort();
  const filteredNotes = visibleNotes
    .filter((comment) => {
      const metadata = noteMetadata(comment);
      const context = noteTargetContext(comment, { projects, prospects, documents, versions, tasks, assets, approvals });
      const haystack = `${comment.body} ${metadata.noteType} ${metadata.tags.map((tag) => `${tag.key} ${tag.value}`).join(" ")} ${context.label} ${context.parentLabel} ${userNameFromList(comment.createdById, users)}`.toLowerCase();
      if (targetFilter !== "ALL" && comment.targetType !== targetFilter) return false;
      if (typeFilter !== "ALL" && metadata.noteType !== typeFilter) return false;
      if (authorFilter !== "ALL" && comment.createdById !== authorFilter) return false;
      return !search.trim() || haystack.includes(search.trim().toLowerCase());
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const pagedNotes = filteredNotes.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize);
  const selectedComment = visibleNotes.find((comment) => comment.id === selectedCommentId);

  useEffect(() => {
    setPage(1);
  }, [authorFilter, pageSize, search, targetFilter, typeFilter, visibleNotes.length]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Panel className="shrink-0">
        <SectionHeader eyebrow="Notes" title="Studio Notes" />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px_190px]">
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Search Notes</span>
            <input className="field" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search note text, title, tag, author" />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Area</span>
            <select className="field" value={targetFilter} onChange={(event) => setTargetFilter(event.target.value)}>
              <option value="ALL">All Areas</option>
              {targetTypes.map((targetType) => <option key={targetType} value={targetType}>{statusLabel(targetType)}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Note Type</span>
            <select className="field" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="ALL">All Types</option>
              {hammerNoteTypes.map((noteType) => <option key={noteType} value={noteType}>{noteTypeLabel(noteType)}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Author</span>
            <select className="field" value={authorFilter} onChange={(event) => setAuthorFilter(event.target.value)}>
              <option value="ALL">All Authors</option>
              {authorIds.map((authorId) => <option key={authorId} value={authorId}>{userNameFromList(authorId, users)}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-studio-400">
          <span>{filteredNotes.length} of {visibleNotes.length} notes</span>
          <button type="button" className="font-semibold text-amberline" onClick={() => { setSearch(""); setTargetFilter("ALL"); setTypeFilter("ALL"); setAuthorFilter("ALL"); }}>Clear filters</button>
        </div>
      </Panel>
      <Panel className="flex min-h-0 flex-1 flex-col">
        <div className="data-scroll table-workspace-scroll">
          <div className="grid gap-2 pr-2">
            {filteredNotes.length ? pagedNotes.map((comment) => (
              <GlobalNoteCard
                key={comment.id}
                comment={comment}
                users={users}
                projects={projects}
                prospects={prospects}
                documents={documents}
                versions={versions}
                tasks={tasks}
                assets={assets}
                approvals={approvals}
                onOpen={() => setSelectedCommentId(comment.id)}
              />
            )) : <EmptyState label="No notes match the current filters." />}
          </div>
        </div>
        {filteredNotes.length ? <PaginationFooter page={normalizedPage} pageSize={pageSize} total={filteredNotes.length} onPageChange={setPage} /> : null}
      </Panel>
      {selectedComment ? (
        <GlobalNoteDialog
          comment={selectedComment}
          users={users}
          projects={projects}
          prospects={prospects}
          documents={documents}
          versions={versions}
          tasks={tasks}
          assets={assets}
          approvals={approvals}
          currentUser={currentUser}
          onClose={() => setSelectedCommentId("")}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
        />
      ) : null}
    </div>
  );
}

function GlobalNoteCard({
  comment,
  users,
  projects,
  prospects = [],
  documents,
  versions,
  tasks,
  assets,
  approvals,
  onOpen
}: {
  comment: HammerComment;
  users: HammerUser[];
  projects: HammerProject[];
  prospects?: HammerProjectLead[];
  documents: HammerDocument[];
  versions: HammerDocumentVersion[];
  tasks: HammerTask[];
  assets: HammerAsset[];
  approvals: HammerApproval[];
  onOpen: () => void;
}) {
  const metadata = noteMetadata(comment);
  const context = noteTargetContext(comment, { projects, prospects, documents, versions, tasks, assets, approvals });
  const isLong = comment.body.length > 300 || comment.body.includes("\n");
  return (
    <button type="button" onClick={onOpen} className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-amberline/35 hover:bg-white/[0.055]">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge value={noteTypeLabel(metadata.noteType)} subtle />
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-semibold text-studio-400">{statusLabel(comment.targetType)}</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-semibold text-studio-400">{statusLabel(comment.visibility)}</span>
          </div>
          <p className="truncate text-sm font-semibold text-studio-100">{context.label}</p>
          {context.parentLabel ? <p className="mt-0.5 truncate text-xs text-studio-400">{context.parentLabel}</p> : null}
        </div>
        <p className="shrink-0 text-xs text-studio-500">{userNameFromList(comment.createdById, users)} / {formatNoteTimestamp(comment.createdAt)}</p>
      </div>
      <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-[13px] leading-5 text-studio-300">{comment.body}</p>
      {metadata.tags.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {metadata.tags.map((tag, index) => <span key={`${tag.key}-${tag.value}-${index}`} className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-100"><span className="text-emerald-300">{tag.key}</span>: {tag.value}</span>)}
        </div>
      ) : null}
      {isLong ? <p className="mt-2 text-xs font-semibold text-amberline">Read more</p> : null}
    </button>
  );
}

function GlobalNoteDialog({
  comment,
  users,
  projects,
  prospects = [],
  documents,
  versions,
  tasks,
  assets,
  approvals,
  onClose,
  onUpdateComment,
  onDeleteComment
}: {
  comment: HammerComment;
  users: HammerUser[];
  projects: HammerProject[];
  prospects?: HammerProjectLead[];
  documents: HammerDocument[];
  versions: HammerDocumentVersion[];
  tasks: HammerTask[];
  assets: HammerAsset[];
  approvals: HammerApproval[];
  currentUser: HammerUser;
  onClose: () => void;
  onUpdateComment?: (commentId: string, input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}) {
  const context = noteTargetContext(comment, { projects, prospects, documents, versions, tasks, assets, approvals });
  const metadata = noteMetadata(comment);
  const [body, setBody] = useState(comment.body);
  const [noteType, setNoteType] = useState<HammerNoteType>(metadata.noteType);
  const [visibility, setVisibility] = useState<HammerComment["visibility"]>(comment.visibility);
  const [tagDrafts, setTagDrafts] = useState<HammerNoteTag[]>(metadata.tags);
  const [tagKeyDraft, setTagKeyDraft] = useState("");
  const [tagValueDraft, setTagValueDraft] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"save" | "delete" | "">("");

  useEffect(() => {
    const nextMetadata = noteMetadata(comment);
    setBody(comment.body);
    setNoteType(nextMetadata.noteType);
    setVisibility(comment.visibility);
    setTagDrafts(nextMetadata.tags);
    setTagKeyDraft("");
    setTagValueDraft("");
    setMessage("");
    setBusy("");
  }, [comment]);

  function addTag() {
    const key = normalizeTagKey(tagKeyDraft);
    const value = tagValueDraft.trim().replace(/\s+/g, " ");
    if (!key || !value) {
      setMessage("Add both a tag key and value, or leave tags blank.");
      return;
    }
    const exists = tagDrafts.some((tag) => tag.key.toLowerCase() === key.toLowerCase() && tag.value.toLowerCase() === value.toLowerCase());
    if (exists) {
      setMessage("That tag is already attached to this note.");
      return;
    }
    setTagDrafts((current) => [...current, { key, value }]);
    setTagKeyDraft("");
    setTagValueDraft("");
    setMessage("");
  }

  function importNoteText(text: string) {
    setBody((current) => current.trim() ? `${current}\n\n${text}` : text);
  }

  async function save() {
    if (!onUpdateComment || !body.trim()) {
      setMessage(body.trim() ? "This note cannot be edited from this view yet." : "Write a note before saving.");
      return;
    }
    setBusy("save");
    setMessage("");
    try {
      await onUpdateComment(comment.id, {
        targetType: comment.targetType,
        targetId: comment.targetId,
        projectId: context.projectId ?? undefined,
        body,
        visibility,
        metadataJson: { noteType, tags: normalizedDocumentTags(tagDrafts) }
      });
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update note.");
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!onDeleteComment) {
      setMessage("This note cannot be deleted from this view yet.");
      return;
    }
    setBusy("delete");
    setMessage("");
    try {
      await onDeleteComment(comment.id);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete note.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-studio-950/80 px-4 py-8 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="modal-card w-full max-w-5xl rounded-lg border border-white/10 bg-studio-950 p-4 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Note</p>
            <h3 className="mt-1 truncate text-xl font-semibold text-studio-100">{context.label}</h3>
            <p className="mt-1 text-xs text-studio-400">{userNameFromList(comment.createdById, users)} / {formatNoteTimestamp(comment.createdAt)}{context.parentLabel ? ` / ${context.parentLabel}` : ""}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {context.href ? <TableLink href={context.href}>Open Source</TableLink> : null}
            <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close note">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Note Type</span>
            <select className="field" value={noteType} onChange={(event) => setNoteType(event.target.value as HammerNoteType)}>
              {hammerNoteTypes.map((type) => <option key={type} value={type}>{noteTypeLabel(type)}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Visibility</span>
            <select className="field" value={visibility} onChange={(event) => setVisibility(event.target.value as HammerComment["visibility"])}>
              <option value="PROJECT_TEAM">Project Team</option>
              <option value="INTERNAL">Internal</option>
              <option value="EXECUTIVE_ONLY">Executive Only</option>
            </select>
          </label>
        </div>
        <label className="mt-3 grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Note</span>
          <textarea className="field min-h-[320px] whitespace-pre-wrap font-sans leading-6" value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
        <div className="mt-3">
          <NoteFileImportControl onImport={importNoteText} disabled={Boolean(busy)} />
        </div>
        <div className="mt-3 grid gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Tags</span>
          {tagDrafts.length ? (
            <div className="flex flex-wrap gap-1.5">
              {tagDrafts.map((tag, index) => (
                <span key={`${tag.key}-${tag.value}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                  <span className="truncate"><span className="text-emerald-300">{tag.key}</span>: {tag.value}</span>
                  <button type="button" onClick={() => setTagDrafts((current) => current.filter((_, currentIndex) => currentIndex !== index))} className="rounded-full text-emerald-100/70 transition hover:text-white" aria-label={`Remove ${tag.key} tag`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="grid gap-2 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] md:items-end">
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Key</span>
              <input className="field" value={tagKeyDraft} onChange={(event) => setTagKeyDraft(event.target.value)} placeholder="priority" />
            </label>
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Value</span>
              <input className="field" value={tagValueDraft} onChange={(event) => setTagValueDraft(event.target.value)} placeholder="follow-up" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} />
            </label>
            <button type="button" onClick={addTag} className="min-h-10 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-studio-200 transition hover:border-amberline/40 hover:text-amberline">Add</button>
          </div>
        </div>
        {message ? <p className="mt-3 rounded border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-studio-300">{message}</p> : null}
        <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-white/10 pt-3">
          <DangerButton label={busy === "delete" ? "Deleting..." : "Delete Note"} onClick={() => void remove()} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onClose} className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:text-amberline">Cancel</button>
            <button type="button" disabled={busy === "save" || !body.trim()} onClick={() => void save()} className="inline-flex items-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" />
              {busy === "save" ? "Saving..." : "Save Note"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScriptNotesWorkspace({
  document,
  version,
  versionUploadNote,
  versionMarkdownNote,
  comments,
  currentUser,
  users = hammerUsers,
  onCreateComment,
  onUpdateComment,
  onDeleteComment
}: {
  document: HammerDocument;
  version?: HammerDocumentVersion;
  versionUploadNote?: string;
  versionMarkdownNote?: string;
  comments: HammerComment[];
  currentUser?: HammerUser;
  users?: HammerUser[];
  onCreateComment?: (input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) => Promise<void>;
  onUpdateComment?: (commentId: string, input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [attachTo, setAttachTo] = useState<"VERSION" | "SCRIPT">(version ? "VERSION" : "SCRIPT");
  const [noteType, setNoteType] = useState<HammerNoteType>("GENERAL");
  const [visibility, setVisibility] = useState<HammerComment["visibility"]>("PROJECT_TEAM");
  const [tagDrafts, setTagDrafts] = useState<HammerNoteTag[]>([]);
  const [tagKeyDraft, setTagKeyDraft] = useState("");
  const [tagValueDraft, setTagValueDraft] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState("");
  const visibleComments = comments.filter((comment) => comment.status !== "ARCHIVED");
  const noteItems = [
    ...visibleComments.map((comment) => ({ kind: "comment" as const, id: comment.id, createdAt: comment.createdAt, comment })),
    ...(versionUploadNote?.trim() ? [{ kind: "legacy" as const, id: `upload-${version?.id ?? document.id}`, createdAt: version?.createdAt ?? document.updatedAt, title: "Version Upload Note", body: versionUploadNote, targetLabel: version ? `Version ${version.versionNumber}` : "Overall Script" }] : []),
    ...(versionMarkdownNote?.trim() ? [{ kind: "legacy" as const, id: `markdown-${version?.id ?? document.id}`, createdAt: version?.createdAt ?? document.updatedAt, title: "Version Markdown Note", body: versionMarkdownNote, targetLabel: version ? `Version ${version.versionNumber}` : "Overall Script" }] : [])
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const selectedComment = visibleComments.find((comment) => comment.id === selectedCommentId);
  const defaultAttachTarget = version ? "VERSION" : "SCRIPT";

  useEffect(() => {
    setAttachTo(defaultAttachTarget);
    setBody("");
    setMessage("");
    setTagDrafts([]);
    setSelectedCommentId("");
  }, [defaultAttachTarget, document.id, version?.id]);

  function addNoteTag() {
    const key = normalizeTagKey(tagKeyDraft);
    const value = tagValueDraft.trim().replace(/\s+/g, " ");
    if (!key || !value) {
      setMessage("Add both a tag key and value, or leave tags blank.");
      return;
    }
    const exists = tagDrafts.some((tag) => tag.key.toLowerCase() === key.toLowerCase() && tag.value.toLowerCase() === value.toLowerCase());
    if (exists) {
      setMessage("That tag is already attached to this note.");
      return;
    }
    setTagDrafts((current) => [...current, { key, value }]);
    setTagKeyDraft("");
    setTagValueDraft("");
    setMessage("");
  }

  function removeNoteTag(index: number) {
    setTagDrafts((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function importNoteText(text: string) {
    setBody((current) => current.trim() ? `${current}\n\n${text}` : text);
  }

  async function saveNote() {
    if (!onCreateComment || !body.trim()) {
      setMessage(body.trim() ? "Notes cannot be saved from this view yet." : "Write a note before saving.");
      return;
    }
    const targetType = attachTo === "VERSION" && version ? "DOCUMENT_VERSION" : "DOCUMENT";
    const targetId = attachTo === "VERSION" && version ? version.id : document.id;
    setBusy(true);
    setMessage("");
    try {
      await onCreateComment({
        targetType,
        targetId,
        projectId: document.projectId,
        body,
        visibility,
        metadataJson: { noteType, tags: normalizedDocumentTags(tagDrafts) }
      });
      setBody("");
      setTagDrafts([]);
      setTagKeyDraft("");
      setTagValueDraft("");
      setMessage("Note saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <SectionHeader eyebrow="Notes" title="Script Notes" />
      <div className="space-y-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Note</span>
              <textarea className="field min-h-44 whitespace-pre-wrap font-sans leading-6" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add coverage, context, follow-up, or creative notes" />
            </label>
            <NoteFileImportControl onImport={importNoteText} disabled={busy} />
            <div className="grid gap-2 md:grid-cols-3">
              <label className="grid gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Attach To</span>
                <select className="field" value={attachTo} onChange={(event) => setAttachTo(event.target.value as "VERSION" | "SCRIPT")}>
                  {version ? <option value="VERSION">Current Version v{version.versionNumber}</option> : null}
                  <option value="SCRIPT">Overall Script</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Note Type</span>
                <select className="field" value={noteType} onChange={(event) => setNoteType(event.target.value as HammerNoteType)}>
                  {hammerNoteTypes.map((type) => <option key={type} value={type}>{noteTypeLabel(type)}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Visibility</span>
                <select className="field" value={visibility} onChange={(event) => setVisibility(event.target.value as HammerComment["visibility"])}>
                  <option value="PROJECT_TEAM">Project Team</option>
                  <option value="INTERNAL">Internal</option>
                  <option value="EXECUTIVE_ONLY">Executive Only</option>
                </select>
              </label>
            </div>
            <div className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Tags</span>
              {tagDrafts.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {tagDrafts.map((tag, index) => (
                    <span key={`${tag.key}-${tag.value}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                      <span className="truncate"><span className="text-emerald-300">{tag.key}</span>: {tag.value}</span>
                      <button type="button" onClick={() => removeNoteTag(index)} className="rounded-full text-emerald-100/70 transition hover:text-white" aria-label={`Remove ${tag.key} tag`}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="grid gap-2 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] md:items-end">
                <label className="grid gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Key</span>
                  <input className="field" list="script-note-tag-key-options" value={tagKeyDraft} onChange={(event) => setTagKeyDraft(event.target.value)} placeholder="concern" />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Value</span>
                  <input className="field" value={tagValueDraft} onChange={(event) => setTagValueDraft(event.target.value)} placeholder="third act" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addNoteTag(); } }} />
                </label>
                <button type="button" onClick={addNoteTag} className="min-h-10 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-studio-200 transition hover:border-amberline/40 hover:text-amberline">Add</button>
              </div>
              <datalist id="script-note-tag-key-options">
                {["agency", "manager", "concern", "action", "priority", "tone", "rights", "coverage"].map((key) => <option key={key} value={key} />)}
              </datalist>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
              {message ? <p className="text-xs text-studio-300">{message}</p> : <span />}
              <button type="button" disabled={busy || !currentUser} onClick={saveNote} className="inline-flex items-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" />
                {busy ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        </div>
        <div className="min-h-0 space-y-2">
          {noteItems.length ? noteItems.map((item) => item.kind === "comment" ? (
            <ScriptNoteCard key={item.id} comment={item.comment} version={version} document={document} users={users} onOpen={() => setSelectedCommentId(item.comment.id)} />
          ) : (
            <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[13px] text-studio-300">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <Badge value="GENERAL" subtle />
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-semibold text-studio-400">{item.targetLabel}</span>
                <span className="text-[11px] text-studio-500">Legacy</span>
              </div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">{item.title}</p>
              <p className="whitespace-pre-wrap leading-5">{item.body}</p>
            </div>
          )) : <EmptyState label="No notes yet." />}
        </div>
      </div>
      {selectedComment ? (
        <ScriptNoteDialog
          comment={selectedComment}
          document={document}
          version={version}
          users={users}
          onClose={() => setSelectedCommentId("")}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
        />
      ) : null}
    </Panel>
  );
}

function ScriptNoteCard({ comment, version, users, onOpen }: { comment: HammerComment; version?: HammerDocumentVersion; document: HammerDocument; users: HammerUser[]; onOpen: () => void }) {
  const metadata = noteMetadata(comment);
  const attachedLabel = comment.targetType === "DOCUMENT_VERSION" ? (version && comment.targetId === version.id ? `Version ${version.versionNumber}` : "Script Version") : "Overall Script";
  const author = userNameFromList(comment.createdById, users);
  const isLong = comment.body.length > 260 || comment.body.includes("\n");
  return (
    <button type="button" onClick={onOpen} className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left text-[13px] text-studio-300 transition hover:border-amberline/35 hover:bg-white/[0.055]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge value={noteTypeLabel(metadata.noteType)} subtle />
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-semibold text-studio-400">{attachedLabel}</span>
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-semibold text-studio-400">{statusLabel(comment.visibility)}</span>
        </div>
        <span className="text-[11px] text-studio-500">{author} / {formatNoteTimestamp(comment.createdAt)}</span>
      </div>
      <p className="line-clamp-3 whitespace-pre-wrap leading-5">{comment.body}</p>
      {isLong ? <p className="mt-2 text-xs font-semibold text-amberline">Read more</p> : null}
      {metadata.tags.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {metadata.tags.map((tag, index) => <span key={`${tag.key}-${tag.value}-${index}`} className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-100"><span className="text-emerald-300">{tag.key}</span>: {tag.value}</span>)}
        </div>
      ) : null}
    </button>
  );
}

function ScriptNoteDialog({
  comment,
  document,
  version,
  users,
  onClose,
  onUpdateComment,
  onDeleteComment
}: {
  comment: HammerComment;
  document: HammerDocument;
  version?: HammerDocumentVersion;
  users: HammerUser[];
  onClose: () => void;
  onUpdateComment?: (commentId: string, input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string; metadataJson?: HammerCommentMetadata }) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}) {
  const metadata = noteMetadata(comment);
  const [body, setBody] = useState(comment.body);
  const [attachTo, setAttachTo] = useState<"VERSION" | "SCRIPT">(comment.targetType === "DOCUMENT_VERSION" && version ? "VERSION" : "SCRIPT");
  const [noteType, setNoteType] = useState<HammerNoteType>(metadata.noteType);
  const [visibility, setVisibility] = useState<HammerComment["visibility"]>(comment.visibility);
  const [tagDrafts, setTagDrafts] = useState<HammerNoteTag[]>(metadata.tags);
  const [tagKeyDraft, setTagKeyDraft] = useState("");
  const [tagValueDraft, setTagValueDraft] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"save" | "delete" | "">("");
  const author = userNameFromList(comment.createdById, users);

  useEffect(() => {
    const nextMetadata = noteMetadata(comment);
    setBody(comment.body);
    setAttachTo(comment.targetType === "DOCUMENT_VERSION" && version ? "VERSION" : "SCRIPT");
    setNoteType(nextMetadata.noteType);
    setVisibility(comment.visibility);
    setTagDrafts(nextMetadata.tags);
    setTagKeyDraft("");
    setTagValueDraft("");
    setMessage("");
    setBusy("");
  }, [comment, version]);

  function addTag() {
    const key = normalizeTagKey(tagKeyDraft);
    const value = tagValueDraft.trim().replace(/\s+/g, " ");
    if (!key || !value) {
      setMessage("Add both a tag key and value, or leave tags blank.");
      return;
    }
    const exists = tagDrafts.some((tag) => tag.key.toLowerCase() === key.toLowerCase() && tag.value.toLowerCase() === value.toLowerCase());
    if (exists) {
      setMessage("That tag is already attached to this note.");
      return;
    }
    setTagDrafts((current) => [...current, { key, value }]);
    setTagKeyDraft("");
    setTagValueDraft("");
    setMessage("");
  }

  function importNoteText(text: string) {
    setBody((current) => current.trim() ? `${current}\n\n${text}` : text);
  }

  async function save() {
    if (!onUpdateComment || !body.trim()) {
      setMessage(body.trim() ? "This note cannot be edited from this view yet." : "Write a note before saving.");
      return;
    }
    const targetType = attachTo === "VERSION" && version ? "DOCUMENT_VERSION" : "DOCUMENT";
    const targetId = attachTo === "VERSION" && version ? version.id : document.id;
    setBusy("save");
    setMessage("");
    try {
      await onUpdateComment(comment.id, {
        targetType,
        targetId,
        projectId: document.projectId,
        body,
        visibility,
        metadataJson: { noteType, tags: normalizedDocumentTags(tagDrafts) }
      });
      setMessage("Note updated.");
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update note.");
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!onDeleteComment) {
      setMessage("This note cannot be deleted from this view yet.");
      return;
    }
    setBusy("delete");
    setMessage("");
    try {
      await onDeleteComment(comment.id);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete note.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-studio-950/80 px-4 py-8 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="modal-card w-full max-w-5xl rounded-lg border border-white/10 bg-studio-950 p-4 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Script Note</p>
            <h3 className="mt-1 text-xl font-semibold text-studio-100">{author}</h3>
            <p className="mt-1 text-xs text-studio-400">Created {formatNoteTimestamp(comment.createdAt)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close note">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Attach To</span>
            <select className="field" value={attachTo} onChange={(event) => setAttachTo(event.target.value as "VERSION" | "SCRIPT")}>
              {version ? <option value="VERSION">Current Version v{version.versionNumber}</option> : null}
              <option value="SCRIPT">Overall Script</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Note Type</span>
            <select className="field" value={noteType} onChange={(event) => setNoteType(event.target.value as HammerNoteType)}>
              {hammerNoteTypes.map((type) => <option key={type} value={type}>{noteTypeLabel(type)}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Visibility</span>
            <select className="field" value={visibility} onChange={(event) => setVisibility(event.target.value as HammerComment["visibility"])}>
              <option value="PROJECT_TEAM">Project Team</option>
              <option value="INTERNAL">Internal</option>
              <option value="EXECUTIVE_ONLY">Executive Only</option>
            </select>
          </label>
        </div>
        <label className="mt-3 grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Note</span>
          <textarea className="field min-h-[320px] whitespace-pre-wrap font-sans leading-6" value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
        <div className="mt-3">
          <NoteFileImportControl onImport={importNoteText} disabled={Boolean(busy)} />
        </div>
        <div className="mt-3 grid gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Tags</span>
          {tagDrafts.length ? (
            <div className="flex flex-wrap gap-1.5">
              {tagDrafts.map((tag, index) => (
                <span key={`${tag.key}-${tag.value}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                  <span className="truncate"><span className="text-emerald-300">{tag.key}</span>: {tag.value}</span>
                  <button type="button" onClick={() => setTagDrafts((current) => current.filter((_, currentIndex) => currentIndex !== index))} className="rounded-full text-emerald-100/70 transition hover:text-white" aria-label={`Remove ${tag.key} tag`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="grid gap-2 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] md:items-end">
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Key</span>
              <input className="field" list="script-note-dialog-tag-key-options" value={tagKeyDraft} onChange={(event) => setTagKeyDraft(event.target.value)} placeholder="concern" />
            </label>
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Value</span>
              <input className="field" value={tagValueDraft} onChange={(event) => setTagValueDraft(event.target.value)} placeholder="third act" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} />
            </label>
            <button type="button" onClick={addTag} className="min-h-10 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-studio-200 transition hover:border-amberline/40 hover:text-amberline">Add</button>
          </div>
          <datalist id="script-note-dialog-tag-key-options">
            {["agency", "manager", "concern", "action", "priority", "tone", "rights", "coverage"].map((key) => <option key={key} value={key} />)}
          </datalist>
        </div>
        {message ? <p className="mt-3 rounded border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-studio-300">{message}</p> : null}
        <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-white/10 pt-3">
          <DangerButton label={busy === "delete" ? "Deleting..." : "Delete Note"} onClick={() => void remove()} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onClose} className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:text-amberline">Cancel</button>
            <button type="button" disabled={busy === "save" || !body.trim()} onClick={() => void save()} className="inline-flex items-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" />
              {busy === "save" ? "Saving..." : "Save Note"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoteFileImportControl({ onImport, disabled = false }: { onImport: (text: string) => void; disabled?: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  async function importFile(file?: File | null) {
    if (!file) return;
    setBusy(true);
    setMessage(`Reading ${file.name}...`);
    try {
      const text = await extractNoteTextFromFile(file);
      onImport(text);
      setMessage(`Imported ${file.name}. Review the text before saving.`);
      setResetKey((key) => key + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import text from that file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Import Note From File</p>
          <p className="mt-1 text-xs leading-5 text-studio-400">TXT, MD, FDX, or readable PDF. Imported text is added to the note editor.</p>
        </div>
        <label className={cn(
          "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-studio-200 transition hover:border-amberline/40 hover:text-amberline",
          (disabled || busy) && "cursor-not-allowed opacity-55"
        )}>
          <FileText className="h-3.5 w-3.5" />
          {busy ? "Reading..." : "Choose File"}
          <input
            key={resetKey}
            className="sr-only"
            type="file"
            accept=".txt,.text,.md,.fdx,.pdf,text/plain,text/markdown,application/pdf"
            disabled={disabled || busy}
            onChange={(event) => void importFile(event.target.files?.[0])}
          />
        </label>
      </div>
      {message ? <p className="mt-2 text-xs text-studio-300">{message}</p> : null}
    </div>
  );
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const lines = markdown.split(/\r?\n/);
  if (!markdown.trim()) return <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3 text-[13px] text-studio-500">Markdown preview will appear here.</div>;
  return (
    <div className="max-h-72 overflow-auto rounded-lg border border-white/10 bg-white/[0.025] p-3 text-[13px] leading-6 text-studio-300">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-3" />;
        if (trimmed.startsWith("### ")) return <h4 key={index} className="mt-2 text-sm font-semibold text-studio-100">{trimmed.slice(4)}</h4>;
        if (trimmed.startsWith("## ")) return <h3 key={index} className="mt-3 text-base font-semibold text-studio-100">{trimmed.slice(3)}</h3>;
        if (trimmed.startsWith("# ")) return <h2 key={index} className="mt-3 text-lg font-semibold text-studio-100">{trimmed.slice(2)}</h2>;
        if (/^[-*]\s+/.test(trimmed)) return <p key={index} className="pl-3 before:mr-2 before:content-['•']">{formatMarkdownInline(trimmed.replace(/^[-*]\s+/, ""))}</p>;
        if (/^\d+\.\s+/.test(trimmed)) return <p key={index} className="pl-3">{formatMarkdownInline(trimmed)}</p>;
        return <p key={index}>{formatMarkdownInline(trimmed)}</p>;
      })}
    </div>
  );
}

function formatMarkdownInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="font-semibold text-studio-100">{part.slice(2, -2)}</strong>;
    return <span key={index}>{part}</span>;
  });
}

function ScriptDiff({ documentId, versions = hammerVersions }: { documentId: string; versions?: HammerDocumentVersion[] }) {
  const textState = useDocumentVersionsWithText(documentId, versions);
  const versionsWithText = textState.versionsWithText;
  const documentVersions = versionsWithText.filter((version) => version.documentId === documentId).sort((a, b) => a.versionNumber - b.versionNumber);
  const [fromVersionId, setFromVersionId] = useState(documentVersions[0]?.id ?? "");
  const [toVersionId, setToVersionId] = useState(documentVersions[1]?.id ?? documentVersions[0]?.id ?? "");
  const fromVersion = documentVersions.find((version) => version.id === fromVersionId) ?? documentVersions[0];
  const toVersion = documentVersions.find((version) => version.id === toVersionId) ?? documentVersions[1] ?? fromVersion;
  const diff = buildTextDiff(fromVersion?.extractedText ?? "", toVersion?.extractedText ?? "");

  useEffect(() => {
    if (!documentVersions.length) return;
    if (!fromVersionId || !documentVersions.some((version) => version.id === fromVersionId)) {
      setFromVersionId(documentVersions[0].id);
    }
    if (!toVersionId || !documentVersions.some((version) => version.id === toVersionId)) {
      setToVersionId(documentVersions[1]?.id ?? documentVersions[0].id);
    }
  }, [documentVersions, fromVersionId, toVersionId]);

  return (
    <Panel>
      <SectionHeader eyebrow="Compare" title="Version Diff" action={<GhostButton icon={FileDiff} label="Save Diff" />} />
      {textState.loading ? <p className="mb-3 rounded border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-studio-300">Loading version text for comparison...</p> : null}
      {textState.message ? <p className="mb-3 rounded border border-ember/30 bg-ember/10 px-2.5 py-2 text-xs text-ember">{textState.message}</p> : null}
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <select className="field" value={fromVersion?.id ?? ""} onChange={(event) => setFromVersionId(event.target.value)}>
          {documentVersions.map((version) => <option key={version.id} value={version.id}>Version A: v{version.versionNumber} / {version.fileName}</option>)}
        </select>
        <select className="field" value={toVersion?.id ?? ""} onChange={(event) => setToVersionId(event.target.value)}>
          {documentVersions.map((version) => <option key={version.id} value={version.id}>Version B: v{version.versionNumber} / {version.fileName}</option>)}
        </select>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SmallStat label="Version A" value={fromVersion ? `v${fromVersion.versionNumber}` : "None"} />
        <SmallStat label="Version B" value={toVersion ? `v${toVersion.versionNumber}` : "None"} />
        <SmallStat label="Summary" value={`${diff.added} added / ${diff.removed} removed`} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <DiffColumn title={fromVersion ? `v${fromVersion.versionNumber} removed` : "Version A"} lines={diff.lines.filter((line) => line.kind !== "added")} />
        <DiffColumn title={toVersion ? `v${toVersion.versionNumber} added` : "Version B"} lines={diff.lines.filter((line) => line.kind !== "removed")} />
      </div>
    </Panel>
  );
}

function DiffColumn({ title, lines }: { title: string; lines: ReturnType<typeof buildTextDiff>["lines"] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-3">
      <h3 className="mb-2 text-[13px] font-semibold text-studio-100">{title}</h3>
      <div className="space-y-1">
        {lines.map((line, index) => <div key={`${line.kind}-${index}`} className={cn("rounded border px-2.5 py-1.5 text-[13px]", line.kind === "added" && "border-signal/30 bg-signal/10 text-signal", line.kind === "removed" && "border-ember/35 bg-ember/10 text-ember", line.kind === "same" && "border-white/10 bg-white/[0.03] text-studio-300")}>{line.kind === "added" ? "+ " : line.kind === "removed" ? "- " : "  "}{line.text}</div>)}
      </div>
    </div>
  );
}

type BreakdownScene = {
  id: string;
  sceneNumber: string;
  heading: string;
  location: string;
  timeOfDay: string;
  synopsis: string;
  projectId: string;
  documentVersionId: string;
  orderIndex: number;
};

function ScriptBreakdown({ documentId, documents = hammerDocuments, versions = hammerVersions }: { documentId: string; documents?: HammerDocument[]; versions?: HammerDocumentVersion[] }) {
  const doc = documents.find((item) => item.id === documentId) ?? documents[0] ?? emptyDocument;
  const textState = useDocumentVersionsWithText(doc.id, versions);
  const versionsWithText = textState.versionsWithText;
  const version = currentVersionFor(doc.id, documents, versionsWithText);
  const parserProjectId = doc.projectId ?? "inbox";
  const [parsed, setParsed] = useState<ReturnType<typeof parseScriptText> | null>(null);
  const [breakdownStatus, setBreakdownStatus] = useState("");
  const scenes = hammerScenes.filter((scene) => scene.documentVersionId === version?.id);
  const breakdownScenes: BreakdownScene[] = useMemo(() => (
    parsed
      ? parsed.scenes.map((scene) => ({
        id: scene.id,
        sceneNumber: String(scene.number),
        heading: scene.slugline,
        location: scene.location,
        timeOfDay: scene.timeOfDay,
        synopsis: scene.actionText,
        projectId: parserProjectId,
        documentVersionId: version?.id ?? "",
        orderIndex: scene.number
      }))
      : scenes.length
      ? scenes
      : []
  ), [parsed, parserProjectId, scenes, version?.id]);
  const [selectedSceneId, setSelectedSceneId] = useState("");
  const selectedScene = breakdownScenes.find((scene) => scene.id === selectedSceneId) ?? breakdownScenes[0];

  useEffect(() => {
    if (!breakdownScenes.length) return;
    if (!selectedSceneId || !breakdownScenes.some((scene) => scene.id === selectedSceneId)) {
      setSelectedSceneId(breakdownScenes[0].id);
    }
  }, [breakdownScenes, selectedSceneId]);

  useEffect(() => {
    setParsed(null);
    setSelectedSceneId("");
    setBreakdownStatus("");
  }, [version?.id]);

  function runBreakdown() {
    const sourceText = version?.extractedText?.trim() ?? "";
    if (textState.loading) {
      setBreakdownStatus("Script text is still loading. Try again in a moment.");
      return;
    }
    if (!sourceText) {
      setBreakdownStatus("No extracted script text is available. Upload a PDF, FDX, or TXT version with readable text first.");
      return;
    }
    const nextParsed = parseScriptText(sourceText, {
      projectId: parserProjectId,
      versionName: `v${version?.versionNumber ?? 1}`,
      fileName: version?.fileName ?? "script.txt"
    });
    setParsed(nextParsed);
    setSelectedSceneId(nextParsed.scenes[0]?.id ?? "");
    setBreakdownStatus(nextParsed.scenes.length ? `Breakdown complete. Detected ${nextParsed.scenes.length} scene${nextParsed.scenes.length === 1 ? "" : "s"}.` : "Breakdown ran, but no screenplay scene headings were detected.");
  }

  function approveBreakdown() {
    if (!parsed && !scenes.length) {
      setBreakdownStatus("Run breakdown before approving.");
      return;
    }
    setBreakdownStatus("Breakdown approved for review. Editable database persistence is planned for the next pass.");
  }

  return (
    <div className="space-y-4">
      <Panel>
        <SectionHeader eyebrow="Deterministic Parser" title="Script Breakdown" action={<div className="flex gap-2"><button type="button" onClick={runBreakdown} className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline"><Gauge className="h-3.5 w-3.5" />Run Breakdown</button><button type="button" onClick={approveBreakdown} className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline"><CheckCircle2 className="h-3.5 w-3.5" />Approve Breakdown</button></div>} />
        <div className="grid gap-3 md:grid-cols-4">
          <SmallStat label="Detected Scenes" value={`${breakdownScenes.length}`} />
          <SmallStat label="Characters" value={`${parsed?.characters.length ?? 0}`} />
          <SmallStat label="Locations" value={`${parsed?.environments.length ?? 0}`} />
          <SmallStat label="Props / Actions" value={`${(parsed?.props.length ?? 0) + (parsed?.stuntBeats.length ?? 0)}`} />
        </div>
        {textState.loading ? <p className="mt-3 rounded border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-studio-300">Loading script text for breakdown...</p> : null}
        {textState.message ? <p className="mt-3 rounded border border-ember/30 bg-ember/10 px-2.5 py-2 text-xs text-ember">{textState.message}</p> : null}
        {breakdownStatus ? <p className="mt-3 rounded border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-studio-300">{breakdownStatus}</p> : null}
      </Panel>
      <Panel>
        <SectionHeader eyebrow="Editable" title="Scenes" />
        {selectedScene ? (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {breakdownScenes.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => setSelectedSceneId(scene.id)}
                  className={cn(
                    "w-full rounded-md border p-2.5 text-left transition",
                    selectedScene.id === scene.id ? "border-amberline/45 bg-amberline/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-[10px] uppercase tracking-[0.12em] text-amberline">Scene {scene.sceneNumber}</span>
                    <span className="text-[11px] text-studio-400">{scene.timeOfDay}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] font-semibold text-studio-100">{scene.heading}</p>
                  <p className="mt-1 truncate text-xs text-studio-400">{scene.location}</p>
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="grid gap-3 md:grid-cols-[90px_1fr_180px_160px]">
                <LabeledField label="Scene #">
                  <input className="field" defaultValue={selectedScene.sceneNumber} />
                </LabeledField>
                <LabeledField label="Heading">
                  <input className="field" defaultValue={selectedScene.heading} />
                </LabeledField>
                <LabeledField label="Location">
                  <input className="field" defaultValue={selectedScene.location} />
                </LabeledField>
                <LabeledField label="Timing">
                  <input className="field" defaultValue={selectedScene.timeOfDay} />
                </LabeledField>
                <div className="md:col-span-4">
                  <LabeledField label="Synopsis / Action">
                    <textarea className="field min-h-52" defaultValue={selectedScene.synopsis} />
                  </LabeledField>
                </div>
              </div>
            </div>
          </div>
        ) : <EmptyState label="No scenes detected yet. Upload a screenplay-formatted PDF, FDX, or TXT and run breakdown." />}
      </Panel>
      {parsed ? <ParsedEntityPanel parsed={parsed} projectId={parserProjectId} /> : <Panel><SectionHeader eyebrow="Editable" title="Characters, Locations, Props, Actions" /><EmptyState label="Run breakdown to detect characters, locations, props, and action moments." /></Panel>}
    </div>
  );
}

type ParsedEntityRow = {
  key: string;
  type: string;
  name: string;
  description: string;
};

function ParsedEntityPanel({ parsed, projectId }: { parsed: ReturnType<typeof parseScriptText>; projectId: string }) {
  const [entityType, setEntityType] = useState("ALL");
  const [dismissedEntities, setDismissedEntities] = useState<Record<string, string[]>>({});
  const seededEntities = hammerEntities.filter((entity) => entity.projectId === projectId);
  const rows: ParsedEntityRow[] = [
    ...parsed.characters.map((name) => ({ key: `character-${name}`, type: "CHARACTER", name, description: describeCharacterDetection(name, parsed) })),
    ...parsed.environments.map((name) => ({ key: `location-${name}`, type: "LOCATION", name, description: "Detected from a scene heading or environment hint." })),
    ...parsed.props.map((name) => ({ key: `prop-${name}`, type: "PROP", name, description: "Detected from prop keyword matching." })),
    ...parsed.stuntBeats.map((name, index) => ({ key: `action-${index}`, type: "ACTION", name, description: "Detected action/stunt moment." })),
    ...parsed.vfxBeats.map((name, index) => ({ key: `vfx-${index}`, type: "VFX", name, description: "Detected VFX/technical moment." }))
  ];
  const dismissedForScript = dismissedEntities[parsed.id] ?? [];
  const visibleRows = (rows.length ? rows : seededEntities.map((entity) => ({ key: entity.id, type: entity.type, name: entity.name, description: entity.description })))
    .filter((entity) => !dismissedForScript.includes(entity.key));
  const filteredRows = entityType === "ALL" ? visibleRows : visibleRows.filter((entity) => entity.type === entityType);
  const entityTabs = ["ALL", "CHARACTER", "LOCATION", "PROP", "ACTION", "VFX"];

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HAMMER_DISMISSED_BREAKDOWN_ENTITIES_STORAGE_KEY);
      if (stored) setDismissedEntities(JSON.parse(stored) as Record<string, string[]>);
    } catch {
      setDismissedEntities({});
    }
  }, []);

  function dismissEntity(entityKey: string) {
    setDismissedEntities((current) => {
      const next = {
        ...current,
        [parsed.id]: Array.from(new Set([...(current[parsed.id] ?? []), entityKey]))
      };
      window.localStorage.setItem(HAMMER_DISMISSED_BREAKDOWN_ENTITIES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function restoreDismissedEntities() {
    setDismissedEntities((current) => {
      const next = { ...current };
      delete next[parsed.id];
      if (Object.keys(next).length) window.localStorage.setItem(HAMMER_DISMISSED_BREAKDOWN_ENTITIES_STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(HAMMER_DISMISSED_BREAKDOWN_ENTITIES_STORAGE_KEY);
      return next;
    });
  }

  return (
    <Panel>
      <SectionHeader
        eyebrow="Editable"
        title="Characters, Locations, Props, Actions"
        action={dismissedForScript.length ? (
          <button type="button" onClick={restoreDismissedEntities} className="rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs font-semibold text-studio-200 transition hover:border-amberline/40 hover:text-amberline">
            Show removed
          </button>
        ) : null}
      />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {entityTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setEntityType(tab)}
            className={cn("rounded border px-2 py-1 text-[11px] font-semibold uppercase transition", entityType === tab ? "border-amberline/45 bg-amberline/10 text-amberline" : "border-white/10 bg-white/[0.025] text-studio-300 hover:border-white/25")}
          >
            {statusLabel(tab)}
          </button>
        ))}
      </div>
      <div className="grid gap-2">
        {filteredRows.map((entity) => (
          <div key={entity.key} className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[140px_220px_1fr_auto]">
            <LabeledField label="Type">
              <input className="field" defaultValue={entity.type} />
            </LabeledField>
            <LabeledField label="Name">
              <input className="field" defaultValue={entity.name} />
            </LabeledField>
            <LabeledField label="Detection / Notes">
              <input className="field" defaultValue={entity.description} />
            </LabeledField>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => dismissEntity(entity.key)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-400/25 bg-rose-500/5 text-rose-300 transition hover:border-rose-300/50 hover:text-rose-200"
                title={`Remove ${entity.name} from this breakdown`}
                aria-label={`Remove ${entity.name} from this breakdown`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {!filteredRows.length ? <EmptyState label="No extracted elements match this view." /> : null}
      </div>
    </Panel>
  );
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-display text-[10px] uppercase tracking-[0.12em] text-studio-500">{label}</span>
      {children}
    </label>
  );
}

function describeCharacterDetection(name: string, parsed: ReturnType<typeof parseScriptText>) {
  const upperName = name.toUpperCase();
  const hasDialogueCue = parsed.scenes.some((scene) => scene.text.split("\n").some((line) => line.trim().replace(/\(.*?\)/g, "").trim() === upperName));
  return hasDialogueCue ? "Detected from dialogue cue." : "Detected from character description in action text.";
}

function Assets({ projectId, assets = hammerAssets, currentUser }: { projectId?: string; assets?: HammerAsset[]; currentUser?: HammerUser }) {
  const visibleAssets = assets.filter((asset) => !projectId || asset.projectId === projectId);
  const projectName = projectId ? projectTitle(projectId) : undefined;
  const canDownload = canDownloadFiles(currentUser?.role);
  return (
    <Panel>
      <SectionHeader eyebrow={projectName ? `Showing ${projectName}` : "GCS Backed"} title="Assets" action={<PrimaryButton icon={UploadCloud} label="Upload Asset" />} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleAssets.length ? visibleAssets.map((asset) => (
          <div key={asset.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 transition hover:border-amberline/40">
            <Link href={`/assets/${asset.id}`}>
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-studio-950 text-amberline">{asset.imageUrl ? <img src={asset.imageUrl} alt="" className="h-full w-full object-cover" /> : <PackageCheck className="h-8 w-8" />}</div>
              <div className="mt-2.5 flex items-start justify-between gap-3"><div><h3 className="text-[13px] font-semibold text-studio-100">{asset.title}</h3><p className="mt-1 text-xs text-studio-300">{asset.description}</p>{asset.source ? <p className="mt-1 text-xs text-studio-400">Source: {asset.source}</p> : null}</div><Badge value={asset.status} /></div>
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <p className="text-[11px] text-studio-400">{asset.fileName}</p>
              {canDownload ? <DownloadFileLink fileName={asset.fileName} dataUrl={asset.imageUrl} resourceType="asset" resourceId={asset.id} currentUser={currentUser} compact /> : null}
            </div>
          </div>
        )) : <div className="md:col-span-2 xl:col-span-3"><EmptyState label={projectName ? `No assets for ${projectName} yet. Upload reference, keyframe, storyboard, or mood art.` : "No assets match this view."} /></div>}
      </div>
    </Panel>
  );
}

function AssetDetail({ assetId, assets = hammerAssets, currentUser }: { assetId: string; assets?: HammerAsset[]; currentUser?: HammerUser }) {
  const asset = assets.find((item) => item.id === assetId) ?? hammerAssets[0];
  const links = hammerAssetLinks.filter((link) => link.assetId === asset.id);
  const canDownload = canDownloadFiles(currentUser?.role);
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Panel>
        <SectionHeader eyebrow={asset.assetType} title={asset.title} action={<GhostButton icon={ShieldCheck} label="Approve Asset" />} />
        <div className="flex aspect-video items-center justify-center rounded-lg border border-white/10 bg-black/25 text-amberline"><PackageCheck className="h-16 w-16" /></div>
        <p className="mt-4 text-studio-300">{asset.description}</p>
      </Panel>
      <div className="space-y-4">
        <Panel><SectionHeader eyebrow="Signed URL" title="File Metadata" action={canDownload ? <DownloadFileLink fileName={asset.fileName} dataUrl={asset.imageUrl} resourceType="asset" resourceId={asset.id} currentUser={currentUser} /> : undefined} /><SmallStat label="Source" value={asset.source ?? "Not listed"} /><SmallStat label="Storage Path" value={asset.storagePath} /><SmallStat label="Status" value={statusLabel(asset.status)} /></Panel>
        <Panel><SectionHeader eyebrow="Links" title="Scene and Entity Links" />{links.map((link) => <p key={link.id} className="rounded border border-white/10 bg-white/[0.03] p-2.5 text-[13px] text-studio-300">{link.linkType} / {link.sceneId ?? "No scene"} / {link.entityId ?? "No entity"}</p>)}</Panel>
        <CommentsPanel targetId={asset.id} />
      </div>
    </div>
  );
}

function Tasks({
  projectId,
  compact = false,
  selectedTaskId,
  currentUser,
  users = hammerUsers,
  tasks: allTasks = hammerTasks,
  projects = hammerProjects,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  onCreateSubtask,
  onUpdateSubtask,
  onDeleteSubtask
}: {
  projectId?: string;
  compact?: boolean;
  selectedTaskId?: string;
  currentUser?: ReturnType<typeof hammerUserByEmail>;
  users?: HammerUser[];
  tasks?: HammerTask[];
  projects?: HammerProject[];
  onCreateTask?: (input: { projectId?: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => void;
  onUpdateTask?: (taskId: string, patch: TaskPatch) => void;
  onDeleteTask?: (taskId: string) => void;
  onReorderTasks?: (taskIds: string[]) => void;
  onCreateSubtask?: (taskId: string, title: string) => void;
  onUpdateSubtask?: (subtaskId: string, patch: TaskSubtaskPatch) => void;
  onDeleteSubtask?: (subtaskId: string) => void;
}) {
  const canViewAllTasks = canViewAllProjectTasks(currentUser?.role);
  const canDeleteTasks = currentUser?.role === "ADMIN";
  const [nameFilter, setNameFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">("ALL");
  const projectName = projectId ? projectTitle(projectId) : undefined;
  const visibleTasks = allTasks.filter((task) => (!projectId || task.projectId === projectId) && (canViewAllTasks || task.assignedToId === currentUser?.id));
  const filteredTasks = visibleTasks.filter((task) => {
    const matchesName = !nameFilter.trim() || `${task.title} ${task.description}`.toLowerCase().includes(nameFilter.trim().toLowerCase());
    const matchesAssignee = assigneeFilter === "ALL" || task.assignedToId === assigneeFilter;
    const matchesStatus = statusFilter === "ALL" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "ALL" || task.priority === priorityFilter;
    return matchesName && matchesAssignee && matchesStatus && matchesPriority;
  });
  const activeFilterCount = [nameFilter.trim(), assigneeFilter !== "ALL", statusFilter !== "ALL", priorityFilter !== "ALL"].filter(Boolean).length;
  const assigneeOptions = users.filter((user) => visibleTasks.some((task) => task.assignedToId === user.id));
  const taskTitle = compact ? "Tasks" : canViewAllTasks ? "All Tasks" : "My Tasks";

  return (
    <Panel className="flex h-full min-h-0 flex-col">
      <SectionHeader eyebrow={projectName ? `Showing ${projectName}` : "Flexible Tracking"} title={taskTitle} action={onCreateTask ? <NewTaskDialog projects={projects} users={users} onCreateTask={onCreateTask} /> : undefined} />
      <div className="mb-3 grid shrink-0 gap-2 rounded-lg border border-white/10 bg-white/[0.025] p-3 md:grid-cols-[minmax(180px,1.4fr)_repeat(3,minmax(130px,1fr))_auto] md:items-end">
        <label className="grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Name</span>
          <input className="field" value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} placeholder="Filter by task name" />
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Assignee</span>
          <select className="field" value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
            <option value="ALL">All assignees</option>
            {assigneeOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Status</span>
          <select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TaskStatus | "ALL")}>
            <option value="ALL">All statuses</option>
            {(["TODO", "IN_PROGRESS", "REVIEW", "ON_HOLD", "BLOCKED", "DONE", "ARCHIVED"] as TaskStatus[]).map((status) => <option key={status} value={status}>{taskStatusLabel(status)}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Priority</span>
          <select className="field" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as TaskPriority | "ALL")}>
            <option value="ALL">All priorities</option>
            {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((priority) => <option key={priority} value={priority}>{statusLabel(priority)}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => { setNameFilter(""); setAssigneeFilter("ALL"); setStatusFilter("ALL"); setPriorityFilter("ALL"); }} disabled={!activeFilterCount} className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline disabled:cursor-not-allowed disabled:opacity-40">
          Clear
        </button>
      </div>
      <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 text-xs text-studio-400">
        <span>{filteredTasks.length} of {visibleTasks.length} task{visibleTasks.length === 1 ? "" : "s"} shown</span>
        {activeFilterCount ? <span>{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</span> : null}
      </div>
      {filteredTasks.length ? (
        <TaskRows tasks={filteredTasks} users={users} projects={projects} selectedTaskId={selectedTaskId} showAssignee showType onUpdateTask={onUpdateTask} onDeleteTask={canDeleteTasks ? onDeleteTask : undefined} onReorderTasks={onReorderTasks} onCreateSubtask={onCreateSubtask} onUpdateSubtask={onUpdateSubtask} onDeleteSubtask={onDeleteSubtask} />
      ) : (
        <EmptyState label={visibleTasks.length ? "No tasks match those filters." : canViewAllTasks ? "No tasks yet. Create a task for any follow-up, project, or prospect next step." : "No tasks assigned to you."} />
      )}
    </Panel>
  );
}

function NewTaskDialog({
  projects,
  users = hammerUsers,
  onCreateTask
}: {
  projects: HammerProject[];
  users?: HammerUser[];
  onCreateTask: (input: { projectId?: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"GENERAL" | "PROJECT">("GENERAL");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState(users[0]?.id ?? "");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("TODO");

  useEffect(() => {
    if (users.length && !users.some((user) => user.id === assignedToId)) {
      setAssignedToId(users[0].id);
    }
  }, [assignedToId, users]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !assignedToId || (scope === "PROJECT" && !projectId)) return;
    onCreateTask({
      projectId: scope === "PROJECT" ? projectId : undefined,
      title,
      description,
      assignedToId,
      dueDate: defaultDueDate(),
      priority,
      status,
      targetType: scope,
      targetId: scope === "PROJECT" ? projectId : ""
    });
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setStatus("TODO");
    setOpen(false);
  }

  return (
    <div className="relative">
      <PrimaryButton icon={Plus} label="New Task" onClick={() => setOpen((current) => !current)} />
      {open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
          <form onSubmit={submit} className="w-full max-w-xl rounded-lg border border-white/10 bg-studio-950 p-4 shadow-glow">
            <SectionHeader eyebrow="Task" title="New Task" />
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Task Area</span>
                <select className="field" value={scope} onChange={(event) => setScope(event.target.value as "GENERAL" | "PROJECT")}>
                  <option value="GENERAL">General Task</option>
                  <option value="PROJECT">Development Slate Task</option>
                </select>
              </label>
              {scope === "PROJECT" ? (
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Development Slate Item</span>
                  <select className="field" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                    {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                  </select>
                </label>
              ) : null}
              <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Name of task" />
              <textarea className="field min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description of task" />
              <div className="grid gap-3 md:grid-cols-3">
                <select className="field" value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)}>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.name} / {statusLabel(user.role)}</option>)}
                </select>
                <select className="field" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
                  {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                </select>
                <select className="field" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
                  {(["TODO", "IN_PROGRESS", "DONE", "ON_HOLD", "REVIEW"] as TaskStatus[]).map((item) => <option key={item} value={item}>{taskStatusLabel(item)}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:text-amberline">Cancel</button>
              <button type="submit" className="rounded bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 hover:bg-emerald-300">Create Task</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

const contactTypes: ContactType[] = ["WRITER", "PRODUCER", "ARTIST", "EXECUTIVE", "AGENCY", "MANAGEMENT", "LEGAL", "VENDOR", "OTHER"];
const contactStatuses: ContactStatus[] = ["NEW", "ACTIVE", "FOLLOW_UP", "WAITING", "DO_NOT_CONTACT", "ARCHIVED"];
const contactRelationshipTypes: ContactRelationshipType[] = ["AGENT", "MANAGER", "REPRESENTS", "WORKS_WITH", "ASSISTANT", "LEGAL_REP", "REFERRED_BY", "OTHER"];
const outreachEngagementTypes: OutreachEngagementType[] = ["CALL", "MEETING", "EMAIL", "INTRO", "MATERIALS_SENT", "FOLLOW_UP", "NOTE", "OTHER"];

type OutreachContactDraft = {
  name: string;
  agency: string;
  role: string;
  genre: string;
  location: string;
  metWith: string;
  email: string;
  phone: string;
  website: string;
  status: ContactStatus;
  ownerId: string;
  tags: string;
  lastContacted: string;
  nextFollowUp: string;
  projectIds: string[];
  credits: string;
  notes: string;
};

type OutreachEngagementDraft = {
  type: OutreachEngagementType;
  engagementDate: string;
  status: ContactStatus;
  summary: string;
  nextStep: string;
  followUpDate: string;
  assignedToId: string;
  priority: TaskPriority;
  createTask: boolean;
};

function isTalentContact(contact: HammerContact) {
  return Boolean(contact.isTalent || contact.talentRole || contact.talentGenre || contact.talentAgency || contact.tags?.some((tag) => tag.toLowerCase() === "talent"));
}

function talentRole(contact: HammerContact) {
  return contact.talentRole || contact.title || statusLabel(contact.type);
}

function talentAgency(contact: HammerContact) {
  return contact.talentAgency || contact.company || "Independent";
}

function talentGenre(contact: HammerContact) {
  const tagGenres = (contact.tags ?? []).filter((tag) => tag.toLowerCase() !== "talent").join(", ");
  return contact.talentGenre || tagGenres || "-";
}

function talentCredits(contact: HammerContact) {
  return contact.talentCredits || contact.notes || "";
}

function talentLocation(contact: HammerContact) {
  return contact.location || contact.talentBased || "";
}

function talentMetWith(contact: HammerContact) {
  return contact.talentMetWith || (contact.lastContacted ? "Yes" : "");
}

function hasMetWithTalent(contact: HammerContact) {
  const value = talentMetWith(contact).trim().toLowerCase();
  if (!value) return false;
  return !["no", "n", "false", "not yet", "none"].includes(value);
}

function talentContactType(value: string, fallback: ContactType = "OTHER"): ContactType {
  const normalized = value.toLowerCase();
  if (normalized.includes("writer")) return "WRITER";
  if (normalized.includes("producer")) return "PRODUCER";
  if (normalized.includes("artist") || normalized.includes("director") || normalized.includes("designer")) return "ARTIST";
  if (normalized.includes("executive")) return "EXECUTIVE";
  if (normalized.includes("agency") || normalized.includes("agent")) return "AGENCY";
  if (normalized.includes("manager") || normalized.includes("management")) return "MANAGEMENT";
  return fallback;
}

function splitTalentGenres(value: string) {
  return value.split(/[,;/]/).map((item) => item.trim()).filter(Boolean);
}

function talentTags(genre: string, tags?: string) {
  const genreTags = splitTalentGenres(genre);
  const extraTags = (tags ?? "").split(/[;,]/).map((tag) => tag.trim()).filter(Boolean);
  return Array.from(new Set(["talent", ...genreTags, ...extraTags]));
}

function contactDraftFromContact(contact: HammerContact): OutreachContactDraft {
  const genre = talentGenre(contact);
  return {
    name: contact.name,
    agency: talentAgency(contact),
    role: talentRole(contact),
    genre: genre === "-" ? "" : genre,
    location: talentLocation(contact),
    metWith: talentMetWith(contact),
    email: contact.email,
    phone: contact.phone,
    website: contact.website ?? "",
    status: contact.status ?? "ACTIVE",
    ownerId: contact.ownerId ?? "",
    tags: (contact.tags ?? []).filter((tag) => tag.toLowerCase() !== "talent" && !splitTalentGenres(genre).includes(tag)).join(", "),
    lastContacted: contact.lastContacted ?? "",
    nextFollowUp: contact.nextFollowUp ?? "",
    projectIds: contact.projectIds,
    credits: talentCredits(contact),
    notes: contact.notes === talentCredits(contact) ? "" : contact.notes
  };
}

function Contacts({
  initialContacts = hammerContacts,
  contactRelationships = hammerContactRelationships,
  outreachEngagements = [],
  currentUser,
  users = hammerUsers,
  projects = hammerProjects,
  documents = hammerDocuments,
  tasks = hammerTasks,
  databaseMode = false,
  onDatabaseImport,
  onCreateContact,
  onUpdateContact,
  onDeleteContact,
  onCreateRelationship,
  onDeleteRelationship,
  onCreateEngagement,
  onUpdateEngagement,
  onDeleteEngagement,
  onCreateTask
}: {
  initialContacts?: HammerContact[];
  contactRelationships?: HammerContactRelationship[];
  outreachEngagements?: HammerOutreachEngagement[];
  currentUser: HammerUser;
  users?: HammerUser[];
  projects?: HammerProject[];
  documents?: HammerDocument[];
  tasks?: HammerTask[];
  databaseMode?: boolean;
  onDatabaseImport?: (contacts: HammerContact[]) => Promise<unknown>;
  onCreateContact?: (contact: Omit<HammerContact, "id">) => Promise<void>;
  onUpdateContact?: (contactId: string, patch: Partial<Omit<HammerContact, "id">>) => Promise<void>;
  onDeleteContact?: (contactId: string) => Promise<void>;
  onCreateRelationship?: (input: { fromContactId: string; toContactId: string; relationshipType: ContactRelationshipType; notes?: string }) => Promise<void>;
  onDeleteRelationship?: (relationshipId: string) => Promise<void>;
  onCreateEngagement?: (input: { contactId: string; type: OutreachEngagementType; engagementDate: string; status: ContactStatus; summary: string; nextStep?: string; followUpDate?: string }) => Promise<void>;
  onUpdateEngagement?: (engagementId: string, patch: Partial<Omit<HammerOutreachEngagement, "id" | "contactId" | "createdById" | "createdAt" | "updatedAt">>) => Promise<void>;
  onDeleteEngagement?: (engagementId: string) => Promise<void>;
  onCreateTask?: (input: { projectId?: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => Promise<void>;
}) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [genreFilter, setGenreFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [metWithFilter, setMetWithFilter] = useState<"ALL" | "MET" | "NOT_MET">("ALL");
  const [outreachSort, setOutreachSort] = useState<{ key: OutreachSortKey; direction: "asc" | "desc" }>({ key: "name", direction: "asc" });
  const [showOutreachFilters, setShowOutreachFilters] = useState(false);
  const [showOutreachTools, setShowOutreachTools] = useState(false);
  const [outreachPage, setOutreachPage] = useState(1);
  const [localContacts, setLocalContacts] = useState<HammerContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [expandedNoteContactId, setExpandedNoteContactId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [contactEditOpen, setContactEditOpen] = useState(false);
  const [engagementOpen, setEngagementOpen] = useState(false);
  const [outreachTab, setOutreachTab] = useState<"contact" | "timeline">("contact");
  const [importMessage, setImportMessage] = useState("");
  const [draft, setDraft] = useState<OutreachContactDraft>({
    name: "",
    agency: "",
    role: "",
    genre: "",
    location: "",
    metWith: "",
    email: "",
    phone: "",
    website: "",
    status: "ACTIVE" as ContactStatus,
    ownerId: "",
    tags: "",
    lastContacted: "",
    nextFollowUp: "",
    projectIds: [] as string[],
    credits: "",
    notes: ""
  });
  const [relationshipDraft, setRelationshipDraft] = useState({ toContactId: "", relationshipType: "AGENT" as ContactRelationshipType, notes: "" });
  const [engagementDraft, setEngagementDraft] = useState<OutreachEngagementDraft>({
    type: "MEETING" as OutreachEngagementType,
    engagementDate: new Date().toISOString().slice(0, 10),
    status: "ACTIVE" as ContactStatus,
    summary: "",
    nextStep: "",
    followUpDate: "",
    assignedToId: currentUser.id,
    priority: "MEDIUM" as TaskPriority,
    createTask: true
  });
  const [editingEngagement, setEditingEngagement] = useState<HammerOutreachEngagement | null>(null);
  const [engagementBusy, setEngagementBusy] = useState(false);
  const contacts = useMemo(() => {
    if (databaseMode) return initialContacts;
    const localById = new Map(localContacts.map((contact) => [contact.id, contact]));
    return [
      ...initialContacts.map((contact) => localById.get(contact.id) ?? contact),
      ...localContacts.filter((contact) => !initialContacts.some((initialContact) => initialContact.id === contact.id))
    ];
  }, [databaseMode, initialContacts, localContacts]);
  const talentContacts = useMemo(() => {
    const talentOnly = contacts.filter(isTalentContact);
    return talentOnly.length ? talentOnly : contacts;
  }, [contacts]);
  const roleOptions = useMemo(() => Array.from(new Set(talentContacts.map(talentRole).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [talentContacts]);
  const genreOptions = useMemo(() => Array.from(new Set(talentContacts.flatMap((contact) => splitTalentGenres(talentGenre(contact)).filter((item) => item !== "-")))).sort((a, b) => a.localeCompare(b)), [talentContacts]);
  const locationOptions = useMemo(() => Array.from(new Set(talentContacts.map(talentLocation).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [talentContacts]);
  const filteredContacts = talentContacts.filter((contact) => {
    const role = talentRole(contact);
    const genre = talentGenre(contact);
    const location = talentLocation(contact);
    const matchesRole = roleFilter === "ALL" || role === roleFilter;
    const matchesGenre = genreFilter === "ALL" || splitTalentGenres(genre).includes(genreFilter);
    const matchesLocation = locationFilter === "ALL" || location === locationFilter;
    const matchesMetWith = metWithFilter === "ALL" || (metWithFilter === "MET" ? hasMetWithTalent(contact) : !hasMetWithTalent(contact));
    const haystack = `${contact.name} ${talentAgency(contact)} ${role} ${genre} ${location} ${contact.email} ${contact.phone} ${talentCredits(contact)} ${contact.notes} ${(contact.tags ?? []).join(" ")}`.toLowerCase();
    return matchesRole && matchesGenre && matchesLocation && matchesMetWith && haystack.includes(search.toLowerCase());
  });
  const activeOutreachFilterCount = [roleFilter !== "ALL", genreFilter !== "ALL", locationFilter !== "ALL", metWithFilter !== "ALL"].filter(Boolean).length;
  const selectedContact = contacts.find((contact) => contact.id === selectedContactId);
  const expandedNoteContact = contacts.find((contact) => contact.id === expandedNoteContactId);
  const relationshipProjects = selectedContact ? projects.filter((project) => draft.projectIds.includes(project.id)) : [];
  const relationshipScripts = selectedContact ? documents.filter((document) => document.contactId === selectedContact.id || document.source === talentAgency(selectedContact) || document.writerName === selectedContact.name) : [];
  const relationshipTasks = selectedContact ? tasks.filter((task) => task.targetType === "CONTACT" && task.targetId === selectedContact.id) : [];
  const linkedContacts = selectedContact ? contactRelationships.filter((relationship) => relationship.fromContactId === selectedContact.id || relationship.toContactId === selectedContact.id) : [];
  const selectedEngagements = selectedContact ? outreachEngagements
    .filter((engagement) => engagement.contactId === selectedContact.id)
    .sort((left, right) => new Date(right.engagementDate).getTime() - new Date(left.engagementDate).getTime() || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()) : [];
  const latestEngagementByContact = useMemo(() => {
    const latest = new Map<string, string>();
    outreachEngagements.forEach((engagement) => {
      const existing = latest.get(engagement.contactId);
      if (!existing || new Date(engagement.engagementDate).getTime() > new Date(existing).getTime()) latest.set(engagement.contactId, engagement.engagementDate);
    });
    return latest;
  }, [outreachEngagements]);
  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((left, right) => {
      const leftValue = outreachSortValue(left, outreachSort.key, latestEngagementByContact);
      const rightValue = outreachSortValue(right, outreachSort.key, latestEngagementByContact);
      const comparison = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: "base" });
      return outreachSort.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredContacts, latestEngagementByContact, outreachSort.direction, outreachSort.key]);
  const outreachPageSize = useResponsiveTablePageSize({ max: 18, reservedHeight: showOutreachFilters || activeOutreachFilterCount > 0 || showOutreachTools ? 465 : 360 });
  const outreachTotalPages = Math.max(1, Math.ceil(sortedContacts.length / outreachPageSize));
  const normalizedOutreachPage = Math.min(outreachPage, outreachTotalPages);
  const pagedContacts = sortedContacts.slice((normalizedOutreachPage - 1) * outreachPageSize, normalizedOutreachPage * outreachPageSize);

  useEffect(() => {
    setOutreachPage(1);
  }, [activeOutreachFilterCount, outreachPageSize, outreachSort.direction, outreachSort.key, search, showOutreachFilters, showOutreachTools]);

  useEffect(() => {
    try {
      const storedContacts = window.localStorage.getItem(HAMMER_LOCAL_CONTACTS_STORAGE_KEY);
      if (storedContacts) setLocalContacts(JSON.parse(storedContacts) as HammerContact[]);
    } catch {
      setLocalContacts([]);
    }
  }, []);

  useEffect(() => {
    const contactId = searchParams.get("contact");
    if (contactId && contacts.some((contact) => contact.id === contactId)) {
      setSelectedContactId(contactId);
    }
  }, [contacts, searchParams]);

  useEffect(() => {
    if (!selectedContact) return;
    setDraft(contactDraftFromContact(selectedContact));
  }, [selectedContact]);

  async function importContacts(file?: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      const importedContacts = parseContactsCsv(text);
      if (!importedContacts.length) {
        setImportMessage("No outreach contacts found in CSV.");
        return;
      }
      if (databaseMode && onDatabaseImport) {
        await onDatabaseImport(importedContacts);
        setImportMessage(`Imported ${importedContacts.length} outreach contact${importedContacts.length === 1 ? "" : "s"} to database.`);
        return;
      }
      const nextContacts = [...localContacts, ...importedContacts];
      setLocalContacts(nextContacts);
      window.localStorage.setItem(HAMMER_LOCAL_CONTACTS_STORAGE_KEY, JSON.stringify(nextContacts));
      setImportMessage(`Imported ${importedContacts.length} outreach contact${importedContacts.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Could not import CSV.");
    }
  }

  function exportContacts() {
    const csv = buildContactsCsv(filteredContacts);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `greenlight-outreach-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function saveContact() {
    if (!selectedContact) return;
    const role = draft.role.trim();
    const agency = draft.agency.trim();
    const location = draft.location.trim();
    const credits = draft.credits.trim();
    const genre = draft.genre.trim();
    const patch = {
      name: draft.name.trim() || "Unnamed Contact",
      company: agency,
      type: talentContactType(role, selectedContact.type),
      title: role,
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      location,
      website: draft.website.trim() || undefined,
      status: draft.status,
      ownerId: draft.ownerId || undefined,
      tags: talentTags(genre, draft.tags),
      lastContacted: draft.lastContacted || undefined,
      nextFollowUp: draft.nextFollowUp || undefined,
      projectIds: draft.projectIds,
      notes: draft.notes.trim() || credits,
      isTalent: true,
      talentAgency: agency,
      talentCredits: credits,
      talentGenre: genre,
      talentRole: role,
      talentMetWith: draft.metWith.trim(),
      talentBased: location
    };
    if (databaseMode) {
      await onUpdateContact?.(selectedContact.id, patch);
    } else {
      const updatedContact = { ...selectedContact, ...patch };
      const nextContacts = [...localContacts.filter((contact) => contact.id !== selectedContact.id), updatedContact];
      setLocalContacts(nextContacts);
      window.localStorage.setItem(HAMMER_LOCAL_CONTACTS_STORAGE_KEY, JSON.stringify(nextContacts));
    }
    setImportMessage("Outreach entry updated.");
    setContactEditOpen(false);
  }

  async function updateContactFollowUp(contact: HammerContact, nextFollowUp: string) {
    const patch = { nextFollowUp: nextFollowUp || undefined };
    if (databaseMode) {
      await onUpdateContact?.(contact.id, patch);
    } else {
      const updatedContact = { ...contact, ...patch };
      const nextContacts = [...localContacts.filter((item) => item.id !== contact.id), updatedContact];
      setLocalContacts(nextContacts);
      window.localStorage.setItem(HAMMER_LOCAL_CONTACTS_STORAGE_KEY, JSON.stringify(nextContacts));
    }
    if (selectedContactId === contact.id) {
      setDraft((current) => ({ ...current, nextFollowUp }));
    }
    setImportMessage(nextFollowUp ? `Follow-up updated for ${contact.name}.` : `Follow-up cleared for ${contact.name}.`);
  }

  async function addContactRelationship(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContact || !relationshipDraft.toContactId || !onCreateRelationship) return;
    await onCreateRelationship({
      fromContactId: selectedContact.id,
      toContactId: relationshipDraft.toContactId,
      relationshipType: relationshipDraft.relationshipType,
      notes: relationshipDraft.notes
    });
    setRelationshipDraft({ toContactId: "", relationshipType: "AGENT", notes: "" });
    setImportMessage("Outreach relationship added.");
  }

  async function createEngagement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContact || !onCreateEngagement || !engagementDraft.summary.trim()) {
      setImportMessage("Add meeting notes before saving an engagement.");
      return;
    }
    setEngagementBusy(true);
    setImportMessage("");
    try {
      await onCreateEngagement({
        contactId: selectedContact.id,
        type: engagementDraft.type,
        engagementDate: engagementDraft.engagementDate,
        status: engagementDraft.status,
        summary: engagementDraft.summary,
        nextStep: engagementDraft.nextStep,
        followUpDate: engagementDraft.followUpDate || undefined
      });
      if (engagementDraft.createTask && onCreateTask && engagementDraft.nextStep.trim()) {
        await onCreateTask({
          projectId: "",
          title: `Follow up with ${selectedContact.name}`,
          description: engagementDraft.nextStep,
          assignedToId: engagementDraft.assignedToId || currentUser.id,
          dueDate: engagementDraft.followUpDate,
          priority: engagementDraft.priority,
          status: "TODO",
          targetType: "CONTACT",
          targetId: selectedContact.id
        });
      }
      setEngagementDraft((current) => ({
        ...current,
        type: "MEETING",
        engagementDate: new Date().toISOString().slice(0, 10),
        status: "ACTIVE",
        summary: "",
        nextStep: "",
        followUpDate: "",
        createTask: true
      }));
      setImportMessage("Engagement logged.");
      setEngagementOpen(false);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Could not log engagement.");
    } finally {
      setEngagementBusy(false);
    }
  }

  async function saveEngagementEdit(input: HammerOutreachEngagement) {
    if (!onUpdateEngagement) return;
    setEngagementBusy(true);
    try {
      await onUpdateEngagement(input.id, {
        type: input.type,
        engagementDate: input.engagementDate,
        status: input.status,
        summary: input.summary,
        nextStep: input.nextStep,
        followUpDate: input.followUpDate
      });
      setEditingEngagement(null);
      setImportMessage("Engagement updated.");
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Could not update engagement.");
    } finally {
      setEngagementBusy(false);
    }
  }

  async function removeEngagement(engagementId: string) {
    if (!onDeleteEngagement) return;
    if (!window.confirm("Delete this outreach engagement?")) return;
    await onDeleteEngagement(engagementId);
    setImportMessage("Engagement deleted.");
  }

  async function createManualContact(input: Omit<HammerContact, "id">) {
    const talentInput = { ...input, isTalent: true, talentBased: input.location };
    if (databaseMode) {
      await onCreateContact?.(talentInput);
    } else {
      const nextContact: HammerContact = {
        id: `contact-local-${Date.now()}`,
        ...talentInput
      };
      const nextContacts = [nextContact, ...localContacts];
      setLocalContacts(nextContacts);
      setSelectedContactId(nextContact.id);
      window.localStorage.setItem(HAMMER_LOCAL_CONTACTS_STORAGE_KEY, JSON.stringify(nextContacts));
    }
    setCreateOpen(false);
    setImportMessage("Outreach entry added.");
  }

  async function deleteSelectedContact() {
    if (!selectedContact) return;
    if (!window.confirm(`delete outreach entry "${selectedContact.name}"?`)) return;
    if (databaseMode) {
      await onDeleteContact?.(selectedContact.id);
    } else {
      const nextContacts = localContacts.filter((contact) => contact.id !== selectedContact.id);
      setLocalContacts(nextContacts);
      window.localStorage.setItem(HAMMER_LOCAL_CONTACTS_STORAGE_KEY, JSON.stringify(nextContacts));
    }
    setSelectedContactId("");
    setImportMessage("Outreach entry deleted.");
  }

  function openContactDetails(contact: HammerContact) {
    setSelectedContactId(contact.id);
    setDraft(contactDraftFromContact(contact));
    setContactEditOpen(true);
  }

  function openEngagementTimeline(contact: HammerContact) {
    setSelectedContactId(contact.id);
    setEngagementOpen(true);
  }

  function toggleOutreachSort(key: OutreachSortKey) {
    setOutreachSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        <Panel className="flex min-h-0 flex-1 flex-col">
          <SectionHeader eyebrow="Outreach Directory" title="Outreach" action={<div className="flex flex-wrap gap-2"><PrimaryButton icon={Plus} label="Add Contact" onClick={() => setCreateOpen(true)} /><button type="button" onClick={() => setShowOutreachTools((open) => !open)} className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs font-semibold text-studio-200 transition hover:border-amberline/40 hover:text-amberline">Tools<ChevronDown className={cn("h-3.5 w-3.5 transition", showOutreachTools && "rotate-180")} /></button></div>} />
          {showOutreachTools ? (
            <div className="mb-3 flex flex-wrap gap-2 rounded-md border border-white/10 bg-white/[0.025] p-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs font-semibold text-studio-200 transition hover:border-amberline/40 hover:text-amberline">
                <UploadCloud className="h-3.5 w-3.5" />
                Import CSV
                <input className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => importContacts(event.target.files?.[0])} />
              </label>
              <button type="button" className="rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs font-semibold text-studio-200 hover:border-amberline/40 hover:text-amberline" onClick={exportContacts}>Export CSV</button>
            </div>
          ) : null}
          <div className="mb-3 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-studio-400" />
              <input className="field pl-8" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search names, agencies, credits, genres, roles" />
            </div>
            <button type="button" onClick={() => setShowOutreachFilters((open) => !open)} className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition", activeOutreachFilterCount ? "border-amberline/35 bg-amberline/10 text-amberline" : "border-white/10 bg-white/[0.025] text-studio-300 hover:border-amberline/35 hover:text-amberline")} aria-expanded={showOutreachFilters}>
              Filters
              {activeOutreachFilterCount ? <span className="rounded-full bg-amberline px-1.5 py-0.5 text-[10px] text-studio-950">{activeOutreachFilterCount}</span> : null}
              <ChevronDown className={cn("h-3.5 w-3.5 transition", showOutreachFilters && "rotate-180")} />
            </button>
          </div>
          {(showOutreachFilters || activeOutreachFilterCount > 0) ? (
            <div className="mb-3 grid gap-2 rounded-md border border-white/10 bg-white/[0.025] p-2 md:grid-cols-4">
              <select className="field" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="ALL">All roles</option>
                {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <select className="field" value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)}>
                <option value="ALL">All genres</option>
                {genreOptions.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
              </select>
              <select className="field" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
                <option value="ALL">All locations</option>
                {locationOptions.map((location) => <option key={location} value={location}>{location}</option>)}
              </select>
              <select className="field" value={metWithFilter} onChange={(event) => setMetWithFilter(event.target.value as "ALL" | "MET" | "NOT_MET")}>
                <option value="ALL">Any meeting</option>
                <option value="MET">Met with</option>
                <option value="NOT_MET">Not met yet</option>
              </select>
            </div>
          ) : null}
          {importMessage ? <p className="mb-3 text-xs text-studio-300">{importMessage}</p> : null}
          {filteredContacts.length ? (
            <div className="data-scroll contacts-list-scroll table-workspace-scroll">
              <table className="data-table table-fixed">
                <thead className="text-[11px] uppercase tracking-[0.12em] text-studio-400">
                  <tr>
                    <SortableHeader label="Name" sortKey="name" activeSort={outreachSort} onSort={toggleOutreachSort} className="w-[24%] py-2" />
                    <SortableHeader label="Role" sortKey="role" activeSort={outreachSort} onSort={toggleOutreachSort} className="w-[13%]" />
                    <SortableHeader label="Agency / Management" sortKey="agency" activeSort={outreachSort} onSort={toggleOutreachSort} className="w-[18%]" />
                    <SortableHeader label="Genre" sortKey="genre" activeSort={outreachSort} onSort={toggleOutreachSort} className="w-[15%]" />
                    <SortableHeader label="Last Contact" sortKey="lastContact" activeSort={outreachSort} onSort={toggleOutreachSort} className="w-[11%]" />
                    <SortableHeader label="Follow-Up" sortKey="followUp" activeSort={outreachSort} onSort={toggleOutreachSort} className="w-[11%]" />
                    <th className="w-[8%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {pagedContacts.map((contact) => {
                    const lastContact = contact.lastContacted || latestEngagementByContact.get(contact.id) || "";
                    return (
                      <tr key={contact.id} className={cn("text-studio-200 transition hover:bg-white/[0.035]", selectedContact?.id === contact.id && "bg-emerald-400/10")}>
                        <td className="py-2.5">
                          <p className="truncate font-semibold text-studio-100" title={contact.name}>{contact.name}</p>
                          <p className="mt-0.5 truncate text-xs text-studio-400" title={contact.email || contact.phone || "No contact info yet"}>{contact.email || contact.phone || "No contact info yet"}</p>
                        </td>
                        <td><Badge value={talentRole(contact)} subtle /></td>
                        <td className="truncate text-studio-300" title={talentAgency(contact)}>{talentAgency(contact)}</td>
                        <td className="truncate text-studio-300" title={talentGenre(contact)}>{talentGenre(contact)}</td>
                        <td className="truncate text-studio-300">{lastContact || "-"}</td>
                        <td>
                          <input
                            className="field min-h-8 px-2 py-1 text-xs"
                            type="date"
                            value={contact.nextFollowUp ?? ""}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => void updateContactFollowUp(contact, event.target.value)}
                            aria-label={`Follow-up date for ${contact.name}`}
                          />
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button type="button" onClick={() => openContactDetails(contact)} title="Contact details" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.025] text-studio-200 transition hover:border-emerald-300/40 hover:text-emerald-200">
                              <ContactRound className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => openEngagementTimeline(contact)} title="Engagement timeline" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.025] text-studio-200 transition hover:border-amberline/40 hover:text-amberline">
                              <CalendarClock className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyState label="No outreach contacts match this search." />}
          {filteredContacts.length ? <PaginationFooter page={normalizedOutreachPage} pageSize={outreachPageSize} total={sortedContacts.length} onPageChange={setOutreachPage} /> : null}
        </Panel>

      </div>

      {selectedContact ? (
        <div className="hidden fixed inset-0 z-[90] items-start justify-center overflow-y-auto bg-studio-950/75 px-4 py-8 backdrop-blur-sm" onMouseDown={() => setSelectedContactId("")}>
          <div className="w-full max-w-6xl" onMouseDown={(event) => event.stopPropagation()}>
            <Panel className="max-h-[calc(100vh-4rem)] overflow-hidden shadow-2xl">
              <div className="mb-3 flex flex-col gap-3 border-b border-white/10 pb-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Outreach Record</p>
                  <h2 className="mt-1 text-2xl font-semibold text-studio-100">{selectedContact.name}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setOutreachTab("contact")} className={cn("rounded-md border px-3 py-2 text-sm font-semibold transition", outreachTab === "contact" ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100" : "border-white/10 bg-white/[0.03] text-studio-300 hover:border-amberline/40 hover:text-studio-100")}>Contact</button>
                  <button type="button" onClick={() => setOutreachTab("timeline")} className={cn("rounded-md border px-3 py-2 text-sm font-semibold transition", outreachTab === "timeline" ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100" : "border-white/10 bg-white/[0.03] text-studio-300 hover:border-amberline/40 hover:text-studio-100")}>Engagement Timeline</button>
                  <button type="button" onClick={() => setSelectedContactId("")} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close outreach record">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
                <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge value={talentRole(selectedContact)} />
                      <Badge value={selectedContact.status ?? "ACTIVE"} subtle />
                    </div>
                    <h3 className="mt-2 text-xl font-semibold text-studio-100">{selectedContact.name}</h3>
                    <p className="mt-1 whitespace-pre-line text-[13px] text-studio-300">{talentAgency(selectedContact)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedContact.email ? <TableLink href={`mailto:${selectedContact.email}`}>Email</TableLink> : null}
                    {selectedContact.website ? <TableLink href={selectedContact.website}>Website</TableLink> : null}
                    <button type="button" onClick={() => setSelectedContactId("")} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs font-semibold text-studio-300 transition hover:border-amberline/40 hover:text-studio-100">Collapse</button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <MiniMeta label="Email" value={selectedContact.email || "-"} />
                  <MiniMeta label="Phone" value={selectedContact.phone || "-"} />
                  <MiniMeta label="Last Contact" value={selectedContact.lastContacted || latestEngagementByContact.get(selectedContact.id) || "-"} />
                  <MiniMeta label="Next Follow-Up" value={selectedContact.nextFollowUp || "-"} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <PrimaryButton icon={Pencil} label="Contact Details" onClick={() => setContactEditOpen(true)} />
                  <PrimaryButton icon={Plus} label="Engagement" onClick={() => setEngagementOpen(true)} />
                  <button type="button" onClick={deleteSelectedContact} className="inline-flex items-center gap-1.5 rounded border border-rose-400/25 bg-rose-500/5 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:border-rose-300/50 hover:text-rose-200"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                </div>
              </div>
              {outreachTab === "timeline" ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <SectionHeader eyebrow="Engagement Timeline" title="Calls, Meetings, Notes" action={<PrimaryButton icon={Plus} label="Engagement" onClick={() => setEngagementOpen(true)} />} />
                <div className="mt-3 grid max-h-[420px] gap-2 overflow-y-auto pr-1">
                  {selectedEngagements.length ? selectedEngagements.map((engagement) => (
                    <div key={engagement.id} className="rounded-md border border-white/10 bg-white/[0.025] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge value={engagement.type} />
                          <Badge value={engagement.status} subtle />
                          <span className="text-xs text-studio-400">{engagement.engagementDate}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => setEditingEngagement(engagement)} className="rounded border border-white/10 px-2 py-1 text-[11px] font-semibold text-studio-300 transition hover:border-amberline/40 hover:text-studio-100">Edit</button>
                          {onDeleteEngagement ? <button type="button" onClick={() => removeEngagement(engagement.id)} className="rounded border border-rose-400/25 px-2 py-1 text-[11px] font-semibold text-rose-300 transition hover:border-rose-300/50 hover:text-rose-200">Delete</button> : null}
                        </div>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-studio-200">{engagement.summary}</p>
                      {engagement.nextStep ? <p className="mt-2 rounded border border-emerald-300/15 bg-emerald-400/5 px-2.5 py-2 text-xs leading-5 text-emerald-100"><span className="font-semibold text-emerald-300">Next:</span> {engagement.nextStep}</p> : null}
                      <p className="mt-2 text-[11px] text-studio-500">Logged by {userNameFromList(engagement.createdById ?? "", users)}{engagement.followUpDate ? ` / Follow-up ${engagement.followUpDate}` : ""}</p>
                    </div>
                  )) : <EmptyState label="No engagement history yet. Log the first call, meeting, email, or internal note here." />}
                </div>
              </div>
              ) : null}
              {outreachTab === "contact" ? (
              <>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <SectionHeader eyebrow="Relationship Map" title="Linked Contacts / Reps" />
                <form onSubmit={addContactRelationship} className="mt-3 grid gap-2 lg:grid-cols-[1fr_150px_1fr_auto]">
                  <select className="field" value={relationshipDraft.toContactId} onChange={(event) => setRelationshipDraft((current) => ({ ...current, toContactId: event.target.value }))}>
                    <option value="">Choose contact</option>
                    {contacts.filter((contact) => contact.id !== selectedContact.id).map((contact) => (<option key={contact.id} value={contact.id}>{contact.name} / {talentAgency(contact)}</option>))}
                  </select>
                  <select className="field" value={relationshipDraft.relationshipType} onChange={(event) => setRelationshipDraft((current) => ({ ...current, relationshipType: event.target.value as ContactRelationshipType }))}>{contactRelationshipTypes.map((relationshipType) => <option key={relationshipType} value={relationshipType}>{statusLabel(relationshipType)}</option>)}</select>
                  <input className="field" value={relationshipDraft.notes} onChange={(event) => setRelationshipDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional relationship note" />
                  <PrimaryButton icon={Plus} label="Link" />
                </form>
                <div className="mt-3 grid gap-2">
                  {linkedContacts.length ? linkedContacts.map((relationship) => {
                    const isOutbound = relationship.fromContactId === selectedContact.id;
                    const otherContactId = isOutbound ? relationship.toContactId : relationship.fromContactId;
                    const otherContact = contacts.find((contact) => contact.id === otherContactId);
                    return (
                      <div key={relationship.id} className="flex flex-col gap-2 rounded border border-white/10 bg-white/[0.025] p-2.5 md:flex-row md:items-center md:justify-between">
                        <div><p className="text-[13px] font-semibold text-studio-100">{otherContact?.name ?? "Missing contact"}</p><p className="mt-0.5 text-xs text-studio-400">{isOutbound ? statusLabel(relationship.relationshipType) : `Linked as ${statusLabel(relationship.relationshipType)}`} / {otherContact ? talentAgency(otherContact) : "Unknown"}</p>{relationship.notes ? <p className="mt-1 text-xs text-studio-300">{relationship.notes}</p> : null}</div>
                        {onDeleteRelationship ? <DangerButton label="Remove" onClick={() => onDeleteRelationship(relationship.id)} /> : null}
                      </div>
                    );
                  }) : <EmptyState label="No linked relationships yet. Add agents, managers, assistants, collaborators, or referral links here." />}
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <RelationshipList title="Development Slate" empty="No linked slate items." items={relationshipProjects.map((project) => ({ id: project.id, title: project.title, detail: statusLabel(project.status), href: `/projects/${project.id}` }))} />
                <RelationshipList title="Scripts" empty="No linked scripts." items={relationshipScripts.map((document) => ({ id: document.id, title: document.title, detail: document.writerName ?? document.source ?? statusLabel(document.type), href: `/scripts/${document.id}` }))} />
                <RelationshipList title="Follow-Ups" empty="No contact tasks yet." items={relationshipTasks.map((task) => ({ id: task.id, title: task.title, detail: `${statusLabel(task.status)} / ${task.dueDate || "No due date"}`, href: `/tasks?task=${task.id}` }))} />
              </div>
              </>
              ) : null}
            </div>
              </div>
            </Panel>
          </div>
        </div>
        ) : null}
      {expandedNoteContact ? (<ContactNoteModal contact={expandedNoteContact} onClose={() => setExpandedNoteContactId("")} />) : null}
      {createOpen ? (<ContactCreateModal users={users} projects={projects} currentUser={currentUser} onClose={() => setCreateOpen(false)} onCreate={createManualContact} />) : null}
      {contactEditOpen && selectedContact ? (<OutreachContactEditModal contact={selectedContact} draft={draft} setDraft={setDraft} users={users} projects={projects} onClose={() => setContactEditOpen(false)} onSave={saveContact} />) : null}
      {engagementOpen && selectedContact ? (<OutreachEngagementCreateModal contact={selectedContact} users={users} engagements={selectedEngagements} draft={engagementDraft} setDraft={setEngagementDraft} busy={engagementBusy} onClose={() => setEngagementOpen(false)} onSubmit={createEngagement} onEdit={(engagement) => { setEngagementOpen(false); setEditingEngagement(engagement); }} onDelete={onDeleteEngagement ? removeEngagement : undefined} />) : null}
      {editingEngagement ? (<OutreachEngagementEditModal engagement={editingEngagement} busy={engagementBusy} onClose={() => setEditingEngagement(null)} onSave={saveEngagementEdit} />) : null}
    </div>
  );
}

function MiniMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.025] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">{label}</p>
      <p className="mt-1 truncate text-[13px] font-semibold text-studio-100">{value}</p>
    </div>
  );
}

function OutreachContactEditModal({
  contact,
  draft,
  setDraft,
  users,
  projects,
  onClose,
  onSave
}: {
  contact: HammerContact;
  draft: OutreachContactDraft;
  setDraft: (updater: (current: OutreachContactDraft) => OutreachContactDraft) => void;
  users: HammerUser[];
  projects: HammerProject[];
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-studio-950/75 px-4 py-8 backdrop-blur-sm" onMouseDown={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSave();
        }}
        className="modal-card w-full max-w-5xl rounded-lg border border-white/10 bg-studio-950 p-4 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <SectionHeader eyebrow="Outreach Contact" title={`Contact Details / ${contact.name}`} />
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close contact details">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Name</span><input className="field" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Contact name" /></label>
          <label className="grid gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Role</span><input className="field" value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))} placeholder="Writer, director, artist..." /></label>
          <label className="grid gap-1 md:col-span-2"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Agency / Management</span><textarea className="field min-h-20" value={draft.agency} onChange={(event) => setDraft((current) => ({ ...current, agency: event.target.value }))} placeholder="Agency, manager, rep" /></label>
          <label className="grid gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Genre</span><input className="field" value={draft.genre} onChange={(event) => setDraft((current) => ({ ...current, genre: event.target.value }))} placeholder="Horror, Action" /></label>
          <label className="grid gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Location</span><input className="field" value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="US, UK, Los Angeles" /></label>
          <label className="grid gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Status</span><select className="field" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ContactStatus }))}>{contactStatuses.map((contactStatus) => <option key={contactStatus} value={contactStatus}>{statusLabel(contactStatus)}</option>)}</select></label>
          <label className="grid gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Email</span><input className="field" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" /></label>
          <label className="grid gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Phone</span><input className="field" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone number" /></label>
          <label className="grid gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Website</span><input className="field" value={draft.website} onChange={(event) => setDraft((current) => ({ ...current, website: event.target.value }))} placeholder="https://..." /></label>
          <label className="grid gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Relationship Owner</span><select className="field" value={draft.ownerId} onChange={(event) => setDraft((current) => ({ ...current, ownerId: event.target.value }))}><option value="">Unassigned owner</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
          <label className="grid gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Last Contacted</span><input className="field" type="date" value={draft.lastContacted} onChange={(event) => setDraft((current) => ({ ...current, lastContacted: event.target.value }))} /></label>
          <label className="grid gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Next Follow-Up</span><input className="field" type="date" value={draft.nextFollowUp} onChange={(event) => setDraft((current) => ({ ...current, nextFollowUp: event.target.value }))} /></label>
        </div>
        <label className="mt-3 grid gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Credits</span><textarea className="field min-h-28" value={draft.credits} onChange={(event) => setDraft((current) => ({ ...current, credits: event.target.value }))} placeholder="Film, TV, theatre, awards, relevant credits" /></label>
        <label className="mt-3 grid gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Additional Tags</span><input className="field" value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="Tags, separated by commas" /></label>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between gap-2"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Assigned Development Slate</span><span className="text-[11px] text-studio-500">{draft.projectIds.length} selected</span></div>
          <div className="grid max-h-44 gap-1 overflow-auto rounded-md border border-white/10 bg-white/[0.025] p-2 md:grid-cols-2">
            {projects.map((project) => {
              const checked = draft.projectIds.includes(project.id);
              return (
                <label key={project.id} className={cn("flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] text-studio-300 transition hover:bg-white/[0.04] hover:text-studio-100", checked && "bg-emerald-400/10 text-studio-100")}>
                  <input type="checkbox" className="h-3.5 w-3.5 accent-emerald-400" checked={checked} onChange={(event) => setDraft((current) => ({ ...current, projectIds: event.target.checked ? [...current.projectIds, project.id] : current.projectIds.filter((projectId) => projectId !== project.id) }))} />
                  <span className="truncate">{project.title}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:text-amberline">Cancel</button>
          <button type="submit" className="rounded bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 hover:bg-emerald-300">Save Contact</button>
        </div>
      </form>
    </div>
  );
}

function OutreachEngagementCreateModal({
  contact,
  users,
  engagements = [],
  draft,
  setDraft,
  busy,
  onClose,
  onSubmit,
  onEdit,
  onDelete
}: {
  contact: HammerContact;
  users: HammerUser[];
  engagements?: HammerOutreachEngagement[];
  draft: OutreachEngagementDraft;
  setDraft: (updater: (current: OutreachEngagementDraft) => OutreachEngagementDraft) => void;
  busy: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onEdit?: (engagement: HammerOutreachEngagement) => void;
  onDelete?: (engagementId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-studio-950/75 px-4 py-8 backdrop-blur-sm" onMouseDown={onClose}>
      <form onSubmit={onSubmit} className="modal-card w-full max-w-5xl rounded-lg border border-white/10 bg-studio-950 p-4 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <SectionHeader eyebrow="Outreach Timeline" title={`Engagement / ${contact.name}`} />
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close engagement form">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">History</p>
              <p className="mt-0.5 text-sm font-semibold text-studio-100">Calls, meetings, emails, and internal notes</p>
            </div>
            <Badge value={`${engagements.length} logged`} subtle />
          </div>
          <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
            {engagements.length ? engagements.map((engagement) => (
              <div key={engagement.id} className="rounded-md border border-white/10 bg-studio-950/40 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge value={engagement.type} />
                    <Badge value={engagement.status} subtle />
                    <span className="text-xs text-studio-400">{engagement.engagementDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {onEdit ? <button type="button" onClick={() => onEdit(engagement)} className="rounded border border-white/10 px-2 py-1 text-[11px] font-semibold text-studio-300 transition hover:border-amberline/40 hover:text-studio-100">Edit</button> : null}
                    {onDelete ? <button type="button" onClick={() => onDelete(engagement.id)} className="rounded border border-rose-400/25 px-2 py-1 text-[11px] font-semibold text-rose-300 transition hover:border-rose-300/50 hover:text-rose-200">Delete</button> : null}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-studio-200">{engagement.summary}</p>
                {engagement.nextStep ? <p className="mt-2 rounded border border-emerald-300/15 bg-emerald-400/5 px-2.5 py-2 text-xs leading-5 text-emerald-100"><span className="font-semibold text-emerald-300">Next:</span> {engagement.nextStep}</p> : null}
                <p className="mt-2 text-[11px] text-studio-500">Logged by {userNameFromList(engagement.createdById ?? "", users)}{engagement.followUpDate ? ` / Follow-up ${engagement.followUpDate}` : ""}</p>
              </div>
            )) : <EmptyState label="No engagement history yet. Log the first call, meeting, email, or internal note below." />}
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Type</span>
            <select className="field" value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as OutreachEngagementType }))}>
              {outreachEngagementTypes.map((type) => <option key={type} value={type}>{statusLabel(type)}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Date</span>
            <input className="field" type="date" value={draft.engagementDate} onChange={(event) => setDraft((current) => ({ ...current, engagementDate: event.target.value }))} />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Status</span>
            <select className="field" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ContactStatus }))}>
              {contactStatuses.filter((status) => status !== "ARCHIVED").map((contactStatus) => <option key={contactStatus} value={contactStatus}>{statusLabel(contactStatus)}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Follow-Up Date</span>
            <input className="field" type="date" value={draft.followUpDate} onChange={(event) => setDraft((current) => ({ ...current, followUpDate: event.target.value }))} />
          </label>
        </div>
        <label className="mt-3 grid gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Meeting Notes</span>
          <textarea className="field min-h-36 whitespace-pre-wrap" value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} placeholder="What happened, who was on the call, what did they respond to?" />
        </label>
        <label className="mt-3 grid gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Next Step</span>
          <textarea className="field min-h-24 whitespace-pre-wrap" value={draft.nextStep} onChange={(event) => setDraft((current) => ({ ...current, nextStep: event.target.value }))} placeholder="What should happen next?" />
        </label>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_170px_150px] md:items-end">
          <label className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-semibold text-studio-200">
            <input type="checkbox" className="h-3.5 w-3.5 accent-emerald-400" checked={draft.createTask} onChange={(event) => setDraft((current) => ({ ...current, createTask: event.target.checked }))} />
            Create follow-up task from next step
          </label>
          <select className="field" value={draft.assignedToId} onChange={(event) => setDraft((current) => ({ ...current, assignedToId: event.target.value }))}>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <select className="field" value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as TaskPriority }))}>
            {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((priority) => <option key={priority} value={priority}>{statusLabel(priority)}</option>)}
          </select>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:text-amberline">Cancel</button>
          <button type="submit" disabled={busy || !draft.summary.trim()} className="inline-flex items-center gap-1.5 rounded bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Log Engagement
          </button>
        </div>
      </form>
    </div>
  );
}

function OutreachEngagementEditModal({
  engagement,
  busy,
  onClose,
  onSave
}: {
  engagement: HammerOutreachEngagement;
  busy: boolean;
  onClose: () => void;
  onSave: (engagement: HammerOutreachEngagement) => Promise<void>;
}) {
  const [draft, setDraft] = useState(engagement);

  useEffect(() => {
    setDraft(engagement);
  }, [engagement]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-studio-950/75 px-4 py-8 backdrop-blur-sm" onMouseDown={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSave(draft);
        }}
        className="modal-card w-full max-w-3xl rounded-lg border border-white/10 bg-studio-950 p-4 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <SectionHeader eyebrow="Outreach Timeline" title="Edit Engagement" />
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close engagement editor">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Type</span>
            <select className="field" value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as OutreachEngagementType }))}>
              {outreachEngagementTypes.map((type) => <option key={type} value={type}>{statusLabel(type)}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Date</span>
            <input className="field" type="date" value={draft.engagementDate} onChange={(event) => setDraft((current) => ({ ...current, engagementDate: event.target.value }))} />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Status</span>
            <select className="field" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ContactStatus }))}>
              {contactStatuses.filter((status) => status !== "ARCHIVED").map((contactStatus) => <option key={contactStatus} value={contactStatus}>{statusLabel(contactStatus)}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Follow-Up Date</span>
            <input className="field" type="date" value={draft.followUpDate ?? ""} onChange={(event) => setDraft((current) => ({ ...current, followUpDate: event.target.value || undefined }))} />
          </label>
        </div>
        <label className="mt-3 grid gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Meeting Notes</span>
          <textarea className="field min-h-48 whitespace-pre-wrap" value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} />
        </label>
        <label className="mt-3 grid gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-500">Next Step</span>
          <textarea className="field min-h-28 whitespace-pre-wrap" value={draft.nextStep ?? ""} onChange={(event) => setDraft((current) => ({ ...current, nextStep: event.target.value }))} />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:text-amberline">Cancel</button>
          <button type="submit" disabled={busy || !draft.summary.trim()} className="rounded bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">Save Engagement</button>
        </div>
      </form>
    </div>
  );
}

function ContactNotesPreview({ notes, onReadMore }: { notes?: string; onReadMore: () => void }) {
  const trimmedNotes = notes?.trim() ?? "";
  if (!trimmedNotes) return <span className="text-studio-500">-</span>;
  const isLong = trimmedNotes.length > 90 || trimmedNotes.includes("\n");
  return (
    <div className="max-w-[260px]">
      <p className="line-clamp-2 whitespace-pre-line text-xs leading-5 text-studio-300">{trimmedNotes}</p>
      {isLong ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onReadMore();
          }}
          className="mt-1 text-[11px] font-semibold text-amberline transition hover:text-emerald-300"
        >
          Read more
        </button>
      ) : null}
    </div>
  );
}

function ContactNoteModal({ contact, onClose }: { contact: HammerContact; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-studio-950/75 px-4 py-8 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="w-full max-w-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <Panel className="shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Outreach Notes</p>
              <h3 className="mt-1 text-lg font-semibold text-studio-100">{contact.name}</h3>
              <p className="mt-1 text-xs text-studio-400">{contact.title || "No role"} / {talentAgency(contact)}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close contact notes">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 max-h-[58vh] overflow-y-auto rounded-md border border-white/10 bg-white/[0.025] p-3">
            <p className="whitespace-pre-line text-sm leading-6 text-studio-200">{contact.notes}</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ContactCreateModal({
  users,
  projects,
  currentUser,
  onClose,
  onCreate
}: {
  users: HammerUser[];
  projects: HammerProject[];
  currentUser: HammerUser;
  onClose: () => void;
  onCreate: (contact: Omit<HammerContact, "id">) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Omit<HammerContact, "id">>({
    name: "",
    company: "",
    type: "WRITER",
    title: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    status: "NEW",
    ownerId: currentUser.id,
    tags: [],
    lastContacted: "",
    nextFollowUp: "",
    projectIds: [],
    notes: "",
    isTalent: true,
    talentAgency: "",
    talentCredits: "",
    talentGenre: "",
    talentRole: "",
    talentMetWith: "",
    talentBased: ""
  });
  const [tagsText, setTagsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const agency = draft.company.trim();
      const role = draft.title.trim();
      const location = draft.location.trim();
      const genre = draft.talentGenre?.trim() ?? "";
      const credits = draft.notes.trim();
      await onCreate({
        ...draft,
        name: draft.name.trim(),
        company: agency,
        type: talentContactType(role, draft.type),
        title: role,
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        location,
        website: draft.website?.trim(),
        tags: talentTags(genre, tagsText),
        lastContacted: draft.lastContacted || undefined,
        nextFollowUp: draft.nextFollowUp || undefined,
        ownerId: draft.ownerId || undefined,
        notes: credits,
        isTalent: true,
        talentAgency: agency,
        talentCredits: credits,
        talentGenre: genre,
        talentRole: role,
        talentMetWith: draft.talentMetWith?.trim() ?? "",
        talentBased: location
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not add contact.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-6 w-full max-w-3xl rounded-lg border border-white/10 bg-studio-950 p-4 shadow-glow">
        <div className="flex items-start justify-between gap-3">
          <SectionHeader eyebrow="Outreach Directory" title="Add Contact" />
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close add contact">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Name</span>
            <input className="field" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Contact name" />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Contact Type</span>
            <select className="field" value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as ContactType }))}>
              {contactTypes.map((contactType) => <option key={contactType} value={contactType}>{statusLabel(contactType)}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Agency / Management</span>
            <input className="field" value={draft.company} onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))} placeholder="Agency, manager, rep" />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Role</span>
            <input className="field" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Writer, director, artist..." />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Genre</span>
            <input className="field" value={draft.talentGenre ?? ""} onChange={(event) => setDraft((current) => ({ ...current, talentGenre: event.target.value }))} placeholder="Horror, Action" />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Met With?</span>
            <input className="field" value={draft.talentMetWith ?? ""} onChange={(event) => setDraft((current) => ({ ...current, talentMetWith: event.target.value }))} placeholder="Yes, no, date, notes" />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Email</span>
            <input className="field" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Phone</span>
            <input className="field" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone number" />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Location</span>
            <input className="field" value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="US, UK, Los Angeles" />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Website</span>
            <input className="field" value={draft.website ?? ""} onChange={(event) => setDraft((current) => ({ ...current, website: event.target.value }))} placeholder="https://..." />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Status</span>
            <select className="field" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ContactStatus }))}>
              {contactStatuses.map((contactStatus) => <option key={contactStatus} value={contactStatus}>{statusLabel(contactStatus)}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Relationship Owner</span>
            <select className="field" value={draft.ownerId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, ownerId: event.target.value }))}>
              <option value="">Unassigned owner</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Last Contacted</span>
            <input className="field" type="date" value={draft.lastContacted ?? ""} onChange={(event) => setDraft((current) => ({ ...current, lastContacted: event.target.value }))} />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Next Follow-Up</span>
            <input className="field" type="date" value={draft.nextFollowUp ?? ""} onChange={(event) => setDraft((current) => ({ ...current, nextFollowUp: event.target.value }))} />
          </label>
        </div>
        <label className="mt-3 grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Tags</span>
          <input className="field" value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="Tags, separated by commas" />
        </label>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Assigned Development Slate</span>
            <span className="text-[11px] text-studio-500">{draft.projectIds.length} selected</span>
          </div>
          <div className="grid max-h-40 gap-1 overflow-auto rounded-md border border-white/10 bg-white/[0.025] p-2 md:grid-cols-2">
            {projects.map((project) => {
              const checked = draft.projectIds.includes(project.id);
              return (
                <label key={project.id} className={cn("flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] text-studio-300 transition hover:bg-white/[0.04] hover:text-studio-100", checked && "bg-emerald-400/10 text-studio-100")}>
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-emerald-400"
                    checked={checked}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      projectIds: event.target.checked ? [...current.projectIds, project.id] : current.projectIds.filter((projectId) => projectId !== project.id)
                    }))}
                  />
                  <span className="truncate">{project.title}</span>
                </label>
              );
            })}
          </div>
        </div>
        <label className="mt-3 grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Credits / Notes</span>
          <textarea className="field min-h-24" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Credits, notes, next step" />
        </label>
        {error ? <p className="mt-3 rounded border border-rose-400/25 bg-rose-500/5 px-2.5 py-2 text-xs text-rose-200">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:text-amberline">Cancel</button>
          <button type="submit" disabled={busy} className="rounded bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">Add Contact</button>
        </div>
      </form>
    </div>
  );
}

function RelationshipList({ title, empty, items }: { title: string; empty: string; items: Array<{ id: string; title: string; detail: string; href: string }> }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <h3 className="text-sm font-semibold text-studio-100">{title}</h3>
      <div className="mt-2 space-y-2">
        {items.length ? items.slice(0, 5).map((item) => (
          <Link key={item.id} href={item.href} className="block rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 transition hover:border-amberline/35">
            <p className="truncate text-[13px] font-semibold text-studio-100">{item.title}</p>
            <p className="mt-0.5 truncate text-xs text-studio-400">{item.detail}</p>
          </Link>
        )) : <EmptyState label={empty} />}
      </div>
    </div>
  );
}

function AccountSettings({ user, onUpdateAccount }: { user: SessionUser | null; onUpdateAccount: (input: { name: string; email: string; currentPassword: string; newPassword: string }) => Promise<void> }) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
  }, [user?.email, user?.name]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await onUpdateAccount({ name, email, currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Account updated. Sign out and back in if you changed your email.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <SectionHeader eyebrow="Account" title="User Settings" />
      <form onSubmit={submit} className="grid max-w-2xl gap-3">
        <label className="grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Name</span>
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Email</span>
          <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-sm font-semibold text-studio-100">Change Password</p>
          <p className="mt-1 text-xs text-studio-400">Leave these fields blank to keep your current password.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Current Password</span>
              <input className="field" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">New Password</span>
              <input className="field" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </label>
          </div>
        </div>
        {message ? <p className="text-xs text-studio-300">{message}</p> : null}
        <div>
          <button type="submit" disabled={busy || !user} className="rounded bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">Save Account</button>
        </div>
      </form>
    </Panel>
  );
}

function Reviews({ projectId }: { projectId?: string }) {
  const approvals = hammerApprovals.filter((approval) => !projectId || approval.projectId === projectId);
  const projectName = projectId ? projectTitle(projectId) : undefined;
  return (
    <Panel>
      <SectionHeader eyebrow={projectName ? `Showing ${projectName}` : "Approvals"} title="Review Queue" />
      <div className="grid gap-3">
        {approvals.length ? approvals.map((approval) => <div key={approval.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-studio-100">{approval.targetType} / {approval.targetId}</p><Badge value={approval.status} /></div><p className="mt-1.5 text-xs text-studio-300">Reviewer: {userName(approval.reviewerId)} / Requested by {userName(approval.requestedById)}</p><div className="mt-2.5 flex gap-2"><PrimaryButton icon={CheckCircle2} label="Approve" /><GhostButton icon={MessageSquare} label="Changes" /></div></div>) : <EmptyState label={projectName ? `No review requests for ${projectName}.` : "No review requests match this view."} />}
      </div>
    </Panel>
  );
}

function StudioStatus({
  projects,
  prospects,
  documents,
  versions,
  supportingDocuments,
  tasks,
  assets,
  approvals,
  comments,
  users,
  currentUser
}: {
  projects: HammerProject[];
  prospects: HammerProjectLead[];
  documents: HammerDocument[];
  versions: HammerDocumentVersion[];
  supportingDocuments: SupportingDocument[];
  tasks: HammerTask[];
  assets: HammerAsset[];
  approvals: HammerApproval[];
  comments: HammerComment[];
  users: HammerUser[];
  currentUser: HammerUser;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.16em] text-amberline">Studio Status</p>
          <h2 className="mt-1 text-xl font-semibold text-studio-100">Status, decisions, and outgoing updates</h2>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-studio-400">Start with the live slate read, then generate a digest for the exact window or project you need to share.</p>
        </div>
      </div>
      <Executive projects={projects} documents={documents} versions={versions} tasks={tasks} assets={assets} approvals={approvals} />
      <Reports projects={projects} prospects={prospects} documents={documents} versions={versions} supportingDocuments={supportingDocuments} tasks={tasks} assets={assets} approvals={approvals} comments={comments} users={users} currentUser={currentUser} />
    </div>
  );
}

function Reports({
  projects,
  prospects,
  documents,
  versions,
  supportingDocuments,
  tasks,
  assets,
  approvals,
  comments,
  users,
  currentUser
}: {
  projects: HammerProject[];
  prospects: HammerProjectLead[];
  documents: HammerDocument[];
  versions: HammerDocumentVersion[];
  supportingDocuments: SupportingDocument[];
  tasks: HammerTask[];
  assets: HammerAsset[];
  approvals: HammerApproval[];
  comments: HammerComment[];
  users: HammerUser[];
  currentUser: HammerUser;
}) {
  const [fromDate, setFromDate] = useState(() => reportDateInput(daysAgo(1)));
  const [toDate, setToDate] = useState(() => reportDateInput(new Date()));
  const [scope, setScope] = useState("ALL");
  const [recipient, setRecipient] = useState("");
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMounted, setPreviewMounted] = useState(false);
  const windowStart = parseReportDateInput(fromDate);
  const windowEnd = parseReportDateInput(toDate);
  const selectedProject = projects.find((project) => project.id === scope);
  const scopeLabel = scope === "ALL" ? "All Development" : scope === "PROSPECTS" ? "Prospects" : selectedProject?.title ?? "Selected Scope";
  const scopedProjectIds = scope === "ALL" ? projects.map((project) => project.id) : selectedProject ? [selectedProject.id] : [];
  const scopedProjects = scope === "PROSPECTS" ? [] : projects.filter((project) => scope === "ALL" || project.id === scope);
  const scopedProspects = scope === "ALL" || scope === "PROSPECTS" ? prospects : [];
  const updatedProjects = scopedProjects.filter((project) => isWithinReportWindow(project.updatedAt, windowStart, windowEnd));
  const updatedProspects = scopedProspects.filter((prospect) => isWithinReportWindow(prospect.lastUpdated, windowStart, windowEnd));
  const relevantDocuments = documents.filter((document) => {
    if (scope === "PROSPECTS") return !document.projectId;
    if (scope === "ALL") return true;
    return document.projectId === scope;
  });
  const relevantDocumentIds = new Set(relevantDocuments.map((document) => document.id));
  const newVersions = versions.filter((version) => relevantDocumentIds.has(version.documentId) && isWithinReportWindow(version.createdAt, windowStart, windowEnd));
  const newSupportingDocs = supportingDocuments.filter((document) => {
    if (!relevantDocumentIds.has(document.scriptDocumentId)) return false;
    return isWithinReportWindow(document.uploadedAt, windowStart, windowEnd);
  });
  const scopedTasks = tasks.filter((task) => {
    if (scope === "ALL") return true;
    if (scope === "PROSPECTS") return task.targetType === "PROJECT_LEAD";
    return task.projectId === scope;
  });
  const dueTasks = scopedTasks
    .filter((task) => task.status !== "DONE" && task.status !== "ARCHIVED" && isWithinReportWindow(task.dueDate, windowStart, windowEnd))
    .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || a.dueDate.localeCompare(b.dueDate));
  const createdTasks = scopedTasks
    .filter((task) => isWithinReportWindow(task.createdAt, windowStart, windowEnd))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const urgentTasks = scopedTasks.filter((task) => task.status !== "DONE" && task.status !== "ARCHIVED" && (task.priority === "URGENT" || task.status === "BLOCKED" || task.status === "ON_HOLD"));
  const scopedApprovals = approvals.filter((approval) => {
    if (scope === "ALL") return true;
    if (scope === "PROSPECTS") return !approval.projectId;
    return approval.projectId === scope;
  });
  const approvalActivity = scopedApprovals.filter((approval) => isWithinReportWindow(approval.createdAt, windowStart, windowEnd) || isWithinReportWindow(approval.decidedAt, windowStart, windowEnd));
  const pendingApprovals = scopedApprovals.filter((approval) => approval.status === "REQUESTED" || approval.status === "CHANGES_REQUESTED");
  const relevantVersionIds = new Set(versions.filter((version) => relevantDocumentIds.has(version.documentId)).map((version) => version.id));
  const commentActivity = comments.filter((comment) => {
    if (!isWithinReportWindow(comment.createdAt, windowStart, windowEnd)) return false;
    if (scope === "ALL") return true;
    if (scope === "PROSPECTS") return comment.targetType === "DOCUMENT" && relevantDocumentIds.has(comment.targetId);
    return relevantDocumentIds.has(comment.targetId) || relevantVersionIds.has(comment.targetId);
  });
  const assetReviews = assets.filter((asset) => {
    if (scope !== "ALL" && scope !== asset.projectId) return false;
    return asset.status === "IN_REVIEW" || asset.status === "REVISION_REQUESTED";
  });
  const greenlightProjects = scopedProjects.filter((project) => project.status === "GREENLIGHT_REVIEW");
  const onHoldProjects = scopedProjects.filter((project) => project.status === "ON_HOLD");
  const changedItemCount = updatedProjects.length + updatedProspects.length + newVersions.length + newSupportingDocs.length;
  const reportSignals = [
    { label: "Changed items", value: changedItemCount, detail: "Projects, prospects, scripts, and support docs updated in the window." },
    { label: "Tasks created", value: createdTasks.length, detail: "Tasks opened during the selected report window." },
    { label: "Pending decisions", value: pendingApprovals.length, detail: "Approvals requested or waiting on changes." },
    { label: "Notes", value: commentActivity.length, detail: "Comments and notes added during the report window." }
  ];
  const subject = `GreenLight Studio Status Digest - ${scopeLabel} - ${formatReportWindow(windowStart, windowEnd)}`;
  const emailBody = buildExecutiveReportEmail({
    subject,
    scopeLabel,
    windowStart,
    windowEnd,
    currentUser,
    projects: scopedProjects,
    updatedProjects,
    updatedProspects,
    newVersions,
    newSupportingDocs,
    documents,
    dueTasks,
    createdTasks,
    urgentTasks,
    approvalActivity,
    pendingApprovals,
    comments: commentActivity,
    assetReviews,
    greenlightProjects,
    onHoldProjects,
    users
  });
  const mailtoHref = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;

  async function copyReport() {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${emailBody}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadReport() {
    triggerBrowserDownload(
      URL.createObjectURL(new Blob([`Subject: ${subject}\n\n${emailBody}`], { type: "text/plain;charset=utf-8" })),
      `greenlight-executive-report-${new Date().toISOString().slice(0, 10)}.txt`
    );
  }

  function applyPreset(preset: "TODAY" | "24H" | "WEEK") {
    const end = new Date();
    const start = new Date();
    if (preset === "TODAY") start.setHours(0, 0, 0, 0);
    if (preset === "24H") start.setDate(start.getDate() - 1);
    if (preset === "WEEK") start.setDate(start.getDate() - 7);
    setFromDate(reportDateInput(start));
    setToDate(reportDateInput(end));
  }

  useEffect(() => {
    setPreviewMounted(true);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.16em] text-amberline">Digest Builder</p>
          <h2 className="mt-1 text-xl font-semibold text-studio-100">Build an email-ready studio update</h2>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-studio-400">Pick a scope and time window. GreenLight pulls changed material, created tasks, decisions, notes, and urgent follow-ups into one concise draft.</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button type="button" onClick={() => applyPreset("TODAY")} className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-studio-300 hover:border-amberline/40 hover:text-amberline">Today</button>
          <button type="button" onClick={() => applyPreset("24H")} className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-studio-300 hover:border-amberline/40 hover:text-amberline">Last 24h</button>
          <button type="button" onClick={() => applyPreset("WEEK")} className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-studio-300 hover:border-amberline/40 hover:text-amberline">Last 7 days</button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(360px,460px)_minmax(0,1fr)]">
        <Panel>
          <SectionHeader eyebrow="Compose" title="Digest Setup" />
          <div className="space-y-3">
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-400">Scope</span>
              <select className="field" value={scope} onChange={(event) => setScope(event.target.value)}>
                <option value="ALL">All Development</option>
                <option value="PROSPECTS">Prospects Only</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
              </select>
            </label>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-400">From</span>
                <input className="field" type="datetime-local" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
              </label>
              <label className="grid gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-400">To</span>
                <input className="field" type="datetime-local" value={toDate} onChange={(event) => setToDate(event.target.value)} />
              </label>
            </div>
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-400">Recipient</span>
              <input className="field" type="email" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="executive@example.com" />
            </label>
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-400">Subject</span>
              <input className="field" value={subject} readOnly />
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={copyReport} className="rounded-md bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 hover:bg-emerald-300">{copied ? "Copied" : "Copy Digest"}</button>
              <a href={mailtoHref} className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:border-amberline/40 hover:text-amberline">Open Email Draft</a>
              <button type="button" onClick={downloadReport} className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:border-amberline/40 hover:text-amberline">Download Text</button>
              <button type="button" onClick={() => setPreviewOpen(true)} className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:border-amberline/40 hover:text-amberline">Preview</button>
            </div>
          </div>
        </Panel>

        <div>
          <Panel>
            <SectionHeader eyebrow="Digest Contents" title="What Will Be Sent" />
            <div className="grid gap-2 md:grid-cols-2">
              {reportSignals.map((signal) => (
                <div key={signal.label} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-2xl font-semibold text-studio-100">{signal.value}</p>
                  <p className="mt-1 text-[12px] font-semibold text-studio-300">{signal.label}</p>
                  <p className="mt-1 text-[11px] leading-4 text-studio-500">{signal.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2">
              {urgentTasks.slice(0, 3).map((task) => (
                <Link key={task.id} href={`/tasks?task=${encodeURIComponent(task.id)}`} className="rounded-md border border-ember/20 bg-ember/10 p-2.5 transition hover:border-ember/40">
                  <p className="text-[13px] font-semibold text-studio-100">{task.title}</p>
                  <p className="mt-0.5 text-xs text-studio-300">{nameForUserFromList(task.assignedToId, users)} / {statusLabel(task.status)} / {task.priority}</p>
                </Link>
              ))}
              {!urgentTasks.length && !changedItemCount && !dueTasks.length && !createdTasks.length ? <EmptyState label="No major report signals in this window." /> : null}
            </div>
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-[10px] uppercase tracking-[0.16em] text-amberline">Tasks</p>
                  <h3 className="text-sm font-semibold text-studio-100">Created In This Window</h3>
                </div>
                <TableLink href="/tasks">Open Tasks</TableLink>
              </div>
              <div className="mt-3 grid gap-2">
                {createdTasks.length ? createdTasks.slice(0, 6).map((task) => (
                  <Link key={task.id} href={`/tasks?task=${encodeURIComponent(task.id)}`} className="rounded-md border border-white/10 bg-white/[0.03] p-2.5 transition hover:border-amberline/35">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-studio-100">{task.title}</p>
                        <p className="mt-0.5 truncate text-xs text-studio-400">{taskContextLabel(task)} / {nameForUserFromList(task.assignedToId, users)} / created {formatShortDateTime(task.createdAt)}</p>
                      </div>
                      <div className="shrink-0 space-y-1 text-right">
                        <Badge value={task.priority} subtle />
                        <Badge value={task.status} subtle />
                      </div>
                    </div>
                  </Link>
                )) : <EmptyState label="No tasks were created in this report window." />}
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {previewOpen && previewMounted ? (
        <ReportPreviewModal
          subject={subject}
          emailBody={emailBody}
          mailtoHref={mailtoHref}
          copied={copied}
          onClose={() => setPreviewOpen(false)}
          onCopy={copyReport}
          onDownload={downloadReport}
        />
      ) : null}
    </div>
  );
}

function ReportPreviewModal({
  subject,
  emailBody,
  mailtoHref,
  copied,
  onClose,
  onCopy,
  onDownload
}: {
  subject: string;
  emailBody: string;
  mailtoHref: string;
  copied: boolean;
  onClose: () => void;
  onCopy: () => void;
  onDownload: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-studio-950/75 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/12 bg-studio-950 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-4">
          <div className="min-w-0">
            <p className="font-display text-[10px] uppercase tracking-[0.16em] text-amberline">Preview</p>
            <h3 className="mt-1 truncate text-lg font-semibold text-studio-100">Digest Draft</h3>
            <p className="mt-1 truncate text-[13px] text-studio-400">{subject}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 p-1.5 text-studio-400 transition hover:text-studio-100" aria-label="Close digest preview">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <textarea className="field min-h-[56vh] font-mono text-[12px] leading-5" value={emailBody} readOnly />
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-white/10 p-4">
          <button type="button" onClick={onCopy} className="rounded-md bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 hover:bg-emerald-300">{copied ? "Copied" : "Copy Digest"}</button>
          <a href={mailtoHref} className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:border-amberline/40 hover:text-amberline">Open Email Draft</a>
          <button type="button" onClick={onDownload} className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:border-amberline/40 hover:text-amberline">Download Text</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Executive({
  projects,
  documents,
  versions,
  tasks,
  assets = hammerAssets,
  approvals = hammerApprovals
}: {
  projects: HammerProject[];
  documents: HammerDocument[];
  versions: HammerDocumentVersion[];
  tasks: HammerTask[];
  assets?: HammerAsset[];
  approvals?: HammerApproval[];
}) {
  const briefs = projects.map((project) => buildExecutiveProjectBrief(project, documents, versions, tasks, assets, approvals));
  const decisionReady = briefs.filter((brief) => brief.health === "decision").length;
  const needsAttention = briefs.filter((brief) => brief.health === "attention").length;
  const atRisk = briefs.filter((brief) => brief.health === "risk").length;
  const activeCount = briefs.filter((brief) => !["ARCHIVED", "PASSED"].includes(brief.project.status)).length;
  const pendingApprovals = approvals.filter((approval) => approval.status === "REQUESTED" || approval.status === "CHANGES_REQUESTED");
  const urgentTasks = tasks.filter((task) => task.priority === "URGENT" || task.status === "BLOCKED" || task.status === "ON_HOLD");
  const weeklyTasks = tasks
    .filter((task) => task.status !== "DONE" && task.status !== "ARCHIVED" && isTaskDueThisWeek(task))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || priorityRank(b.priority) - priorityRank(a.priority))
    .slice(0, 8);
  const assetsAwaitingApproval = assets.filter((asset) => asset.status === "IN_REVIEW");
  const atRiskBriefs = briefs.filter((brief) => brief.health === "risk").slice(0, 4);
  const greenlightCandidates = briefs
    .filter((brief) => brief.project.status === "GREENLIGHT_REVIEW" || brief.health === "decision")
    .slice(0, 4);
  const decisionItems = [
    ...pendingApprovals.map((approval) => {
      const document = documentForApproval(approval, documents, versions);
      const asset = assets.find((item) => item.id === approval.targetId);
      return {
        id: approval.id,
        label: approval.targetType === "DOCUMENT_VERSION" ? "Script Review" : "Approval",
        title: document?.title ?? asset?.title ?? approval.targetId,
        detail: `${projectTitle(approval.projectId)} / requested by ${userName(approval.requestedById)}`,
        href: document ? `/scripts/${document.id}` : asset ? `/assets/${asset.id}` : `/projects/${approval.projectId}`,
        status: approval.status
      };
    }),
    ...urgentTasks.map((task) => ({
      id: task.id,
      label: "Blocked or Urgent Task",
      title: task.title,
      detail: `${taskContextLabel(task)} / ${userName(task.assignedToId)} / due ${task.dueDate}`,
      href: `/tasks?task=${encodeURIComponent(task.id)}`,
      status: task.priority
    })),
    ...assetsAwaitingApproval.map((asset) => ({
      id: asset.id,
      label: "Asset Review",
      title: asset.title,
      detail: `${projectTitle(asset.projectId)} / ${statusLabel(asset.assetType)}`,
      href: `/assets/${asset.id}`,
      status: asset.status
    }))
  ].slice(0, 6);

  return (
    <div className="space-y-4">
      <Panel className="border-amberline/20 bg-amberline/[0.055] shadow-none">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.16em] text-amberline">Studio Status Brief</p>
            <h2 className="mt-1 text-xl font-semibold text-studio-100">Overall status: {executiveSlateSummary(decisionReady, needsAttention, atRisk)}</h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-5 text-studio-300">A concise read on what needs a decision, what is blocked, and what the team needs to finish this week.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center md:grid-cols-4 xl:w-[520px]">
            <ExecutiveStat label="Active" value={activeCount} tone="blue" />
            <ExecutiveStat label="Decisions" value={decisionItems.length} tone="green" />
            <ExecutiveStat label="At Risk" value={atRisk} tone="red" />
            <ExecutiveStat label="Due This Week" value={weeklyTasks.length} tone="yellow" />
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.78fr]">
        <Panel>
          <SectionHeader eyebrow="Decisions" title="Needs Attention" />
          <div className="space-y-2">
            {decisionItems.length ? decisionItems.map((item) => (
              <Link key={item.id} href={item.href} className="block rounded-md border border-white/10 bg-white/[0.03] p-3 transition hover:border-amberline/35 hover:bg-white/[0.055]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-[10px] uppercase tracking-[0.12em] text-studio-400">{item.label}</p>
                    <p className="mt-1 text-[13px] font-semibold text-studio-100">{item.title}</p>
                    <p className="mt-1 text-xs text-studio-400">{item.detail}</p>
                  </div>
                  <Badge value={item.status} />
                </div>
              </Link>
            )) : <EmptyState label="No studio decisions are waiting right now." />}
          </div>
        </Panel>

        <Panel>
          <SectionHeader eyebrow="This Week" title="Task To-Do List" />
          <div className="space-y-2">
            {weeklyTasks.length ? weeklyTasks.map((task) => (
              <Link key={task.id} href={`/tasks?task=${encodeURIComponent(task.id)}`} className="block rounded-md border border-white/10 bg-white/[0.03] p-3 transition hover:border-amberline/35 hover:bg-white/[0.055]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-studio-100">{task.title}</p>
                    <p className="mt-1 text-xs text-studio-400">{taskContextLabel(task)} / {userName(task.assignedToId)} / due {task.dueDate}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    <Badge value={task.priority} />
                    <Badge value={task.status} subtle />
                  </div>
                </div>
              </Link>
            )) : <EmptyState label="No open tasks are due this week." />}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <SectionHeader eyebrow="Risk" title="Needs Follow-Up" />
          <div className="space-y-2">
            {atRiskBriefs.length ? atRiskBriefs.map((brief) => <ExecutiveBriefRow key={brief.project.id} brief={brief} />) : <EmptyState label="No projects are currently marked at risk." />}
          </div>
        </Panel>

        <Panel>
          <SectionHeader eyebrow="Greenlight" title="Candidates" />
          <div className="space-y-2">
            {greenlightCandidates.length ? greenlightCandidates.map((brief) => <ExecutiveBriefRow key={brief.project.id} brief={brief} />) : <EmptyState label="No greenlight candidates are ready yet." />}
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.16em] text-studio-400">Full Slate</p>
            <h3 className="mt-1 text-base font-semibold text-studio-100">Need the full project-by-project read?</h3>
            <p className="mt-1 text-[13px] text-studio-300">Open Development Slate for the complete list of owned projects, or Prospects for materials we might be interested in.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TableLink href="/projects">Open Development Slate</TableLink>
            <TableLink href="/tasks">Open Tasks</TableLink>
          </div>
        </div>
      </Panel>
    </div>
  );
}

type ExecutiveHealth = "decision" | "attention" | "risk" | "steady";

interface ExecutiveProjectBrief {
  project: HammerProject;
  health: ExecutiveHealth;
  healthLabel: string;
  summary: string;
  nextAction: string;
  currentDocument?: HammerDocument;
  currentVersion?: HammerDocumentVersion;
  documentCount: number;
  openTasks: HammerTask[];
  urgentTasks: HammerTask[];
  pendingApprovals: HammerApproval[];
  reviewAssets: HammerAsset[];
  approvedAssets: HammerAsset[];
}

function buildExecutiveProjectBrief(project: HammerProject, documents: HammerDocument[], versions: HammerDocumentVersion[], tasks: HammerTask[], assets: HammerAsset[] = hammerAssets, approvals: HammerApproval[] = hammerApprovals): ExecutiveProjectBrief {
  const projectDocuments = documents.filter((document) => document.projectId === project.id);
  const currentDocument = [...projectDocuments]
    .filter((document) => document.type === "SCRIPT" || document.type === "TREATMENT")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const currentVersion = currentDocument ? currentVersionFor(currentDocument.id, documents, versions) : undefined;
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const openTasks = projectTasks.filter((task) => task.status !== "DONE" && task.status !== "ARCHIVED");
  const urgentTasks = openTasks.filter((task) => task.priority === "URGENT" || task.status === "BLOCKED" || task.status === "ON_HOLD");
  const pendingApprovals = approvals.filter((approval) => approval.projectId === project.id && (approval.status === "REQUESTED" || approval.status === "CHANGES_REQUESTED"));
  const reviewAssets = assets.filter((asset) => asset.projectId === project.id && asset.status === "IN_REVIEW");
  const approvedAssets = assets.filter((asset) => asset.projectId === project.id && asset.status === "APPROVED");
  const reviewTasks = openTasks.filter((task) => task.status === "REVIEW");
  const health = executiveHealthForProject(project, { urgentTasks, pendingApprovals, reviewAssets, reviewTasks });
  const healthLabel = executiveHealthLabel(health);
  const summary = executiveProjectSummary(project, currentVersion, { pendingApprovals, reviewAssets, urgentTasks, openTasks });
  const nextAction = executiveNextAction(project, { currentDocument, pendingApprovals, reviewAssets, urgentTasks, reviewTasks });

  return {
    project,
    health,
    healthLabel,
    summary,
    nextAction,
    currentDocument,
    currentVersion,
    documentCount: projectDocuments.length,
    openTasks,
    urgentTasks,
    pendingApprovals,
    reviewAssets,
    approvedAssets
  };
}

function executiveHealthForProject(
  project: HammerProject,
  context: { urgentTasks: HammerTask[]; pendingApprovals: HammerApproval[]; reviewAssets: HammerAsset[]; reviewTasks: HammerTask[] }
): ExecutiveHealth {
  if (["ON_HOLD", "PASSED", "ARCHIVED"].includes(project.status) || context.urgentTasks.length) return "risk";
  if (project.status === "GREENLIGHT_REVIEW" || context.pendingApprovals.some((approval) => approval.targetType === "DOCUMENT_VERSION")) return "decision";
  if (context.pendingApprovals.length || context.reviewAssets.length || context.reviewTasks.length) return "attention";
  return "steady";
}

function executiveHealthLabel(health: ExecutiveHealth) {
  if (health === "decision") return "Decision Ready";
  if (health === "attention") return "Needs Attention";
  if (health === "risk") return "At Risk";
  return "On Track";
}

function executiveSlateSummary(decisionReady: number, needsAttention: number, atRisk: number) {
  if (atRisk) return `${atRisk} project${atRisk === 1 ? "" : "s"} at risk`;
  if (decisionReady) return `${decisionReady} project${decisionReady === 1 ? "" : "s"} ready for decision`;
  if (needsAttention) return `${needsAttention} project${needsAttention === 1 ? "" : "s"} need attention`;
  return "slate is on track";
}

function executiveProjectSummary(
  project: HammerProject,
  currentVersion: HammerDocumentVersion | undefined,
  context: { pendingApprovals: HammerApproval[]; reviewAssets: HammerAsset[]; urgentTasks: HammerTask[]; openTasks: HammerTask[] }
) {
  if (context.urgentTasks.length) return `${context.urgentTasks.length} urgent or blocked item${context.urgentTasks.length === 1 ? "" : "s"} need producer follow-up.`;
  if (project.status === "GREENLIGHT_REVIEW") return "Greenlight packet is assembled enough for executive review.";
  if (context.pendingApprovals.length) return `${context.pendingApprovals.length} approval request${context.pendingApprovals.length === 1 ? "" : "s"} waiting on decision.`;
  if (context.reviewAssets.length) return `${context.reviewAssets.length} visual reference item${context.reviewAssets.length === 1 ? "" : "s"} awaiting approval.`;
  if (currentVersion) return `Current material is ${statusLabel(currentVersion.status).toLowerCase()} with ${context.openTasks.length} open task${context.openTasks.length === 1 ? "" : "s"}.`;
  return "No current script or treatment has been attached yet.";
}

function executiveNextAction(
  project: HammerProject,
  context: { currentDocument?: HammerDocument; pendingApprovals: HammerApproval[]; reviewAssets: HammerAsset[]; urgentTasks: HammerTask[]; reviewTasks: HammerTask[] }
) {
  if (context.urgentTasks[0]) return `Resolve: ${context.urgentTasks[0].title}`;
  if (context.pendingApprovals[0]) return context.pendingApprovals[0].targetType === "DOCUMENT_VERSION" ? "Review latest script decision." : "Complete pending approval.";
  if (project.status === "GREENLIGHT_REVIEW") return "Review greenlight readiness.";
  if (context.reviewAssets[0]) return `Review visual reference: ${context.reviewAssets[0].title}`;
  if (context.reviewTasks[0]) return `Clear review task: ${context.reviewTasks[0].title}`;
  if (context.currentDocument) return "Monitor next draft milestone.";
  return "Assign source material.";
}

function isTaskDueThisWeek(task: HammerTask) {
  if (!task.dueDate) return false;
  const due = new Date(`${task.dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekFromToday = new Date(today);
  weekFromToday.setDate(today.getDate() + 7);
  return due >= today && due <= weekFromToday;
}

function priorityRank(priority: TaskPriority) {
  return { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 }[priority] ?? 0;
}

function documentForApproval(approval: HammerApproval, documents: HammerDocument[], versions: HammerDocumentVersion[]) {
  if (approval.targetType !== "DOCUMENT_VERSION") return undefined;
  const version = versions.find((item) => item.id === approval.targetId);
  return version ? documents.find((document) => document.id === version.documentId) : undefined;
}

function ExecutiveStat({ label, value, tone }: { label: string; value: number; tone: BadgeTone }) {
  const styles = badgeStyles[tone];
  return (
    <div className={cn("rounded-md border p-2.5", styles.subtle)}>
      <p className="font-display text-[10px] uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function ExecutiveProjectCard({ brief }: { brief: ExecutiveProjectBrief }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/projects/${brief.project.id}`} className="text-base font-semibold text-studio-100 hover:text-amberline">{brief.project.title}</Link>
            <ExecutiveHealthBadge health={brief.health} />
            <Badge value={brief.project.status} subtle />
          </div>
          <p className="mt-2 max-w-3xl text-[13px] leading-5 text-studio-300">{brief.summary}</p>
          <p className="mt-1 text-xs text-studio-400">{brief.project.logline}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 lg:justify-end">
          <TableLink href={`/projects/${brief.project.id}`}>Open Project</TableLink>
          {brief.currentDocument ? <TableLink href={`/scripts/${brief.currentDocument.id}`}>Open Script</TableLink> : null}
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-4">
        <ExecutiveBriefMetric label="Current Material" value={brief.currentDocument?.title ?? "Not attached"} detail={brief.currentVersion ? `v${brief.currentVersion.versionNumber} / ${statusLabel(brief.currentVersion.status)}` : "Needs source"} />
        <ExecutiveBriefMetric label="Open Tasks" value={`${brief.openTasks.length}`} detail={brief.urgentTasks.length ? `${brief.urgentTasks.length} urgent/blocked` : "No blockers flagged"} />
        <ExecutiveBriefMetric label="Approvals" value={`${brief.pendingApprovals.length}`} detail={brief.pendingApprovals.length ? "Waiting on decision" : "Clear"} />
        <ExecutiveBriefMetric label="Visual Reference" value={`${brief.approvedAssets.length} approved`} detail={brief.reviewAssets.length ? `${brief.reviewAssets.length} in review` : "No visual holds"} />
      </div>

      <div className="mt-3 rounded-md border border-white/10 bg-white/[0.025] px-3 py-2">
        <p className="font-display text-[10px] uppercase tracking-[0.12em] text-studio-400">Recommended Next Step</p>
        <p className="mt-1 text-[13px] font-semibold text-studio-100">{brief.nextAction}</p>
      </div>
    </div>
  );
}

function ExecutiveBriefRow({ brief }: { brief: ExecutiveProjectBrief }) {
  return (
    <Link href={`/projects/${brief.project.id}`} className="block rounded-md border border-white/10 bg-white/[0.03] p-3 transition hover:border-amberline/35 hover:bg-white/[0.055]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-studio-100">{brief.project.title}</p>
            <ExecutiveHealthBadge health={brief.health} />
          </div>
          <p className="mt-1 text-xs leading-5 text-studio-300">{brief.summary}</p>
          <p className="mt-1 truncate text-xs text-studio-400">{brief.nextAction}</p>
        </div>
        <Badge value={brief.project.status} subtle />
      </div>
    </Link>
  );
}

function ExecutiveHealthBadge({ health }: { health: ExecutiveHealth }) {
  const tone: BadgeTone = health === "decision" ? "green" : health === "attention" ? "yellow" : health === "risk" ? "red" : "blue";
  return <span className={cn("status-badge inline-flex rounded border px-2 py-1 font-display text-[11px] uppercase", badgeStyles[tone].solid)}>{executiveHealthLabel(health)}</span>;
}

function ExecutiveBriefMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.025] p-2.5">
      <p className="font-display text-[10px] uppercase tracking-[0.12em] text-studio-400">{label}</p>
      <p className="mt-1 truncate text-[13px] font-semibold text-studio-100">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-studio-400">{detail}</p>
    </div>
  );
}

function ExecutiveSlateTable({ briefs }: { briefs: ExecutiveProjectBrief[] }) {
  const [page, setPage] = useState(1);
  const pageSize = useResponsiveTablePageSize({ max: 18, reservedHeight: 360 });
  const totalPages = Math.max(1, Math.ceil(briefs.length / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const pagedBriefs = briefs.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [briefs.length, pageSize]);

  return (
    <div className="table-workspace">
      <div className="data-scroll table-workspace-scroll">
        <table className="data-table min-w-[860px]">
          <thead className="text-[11px] uppercase tracking-[0.12em] text-studio-400">
            <tr><th className="py-2">Project</th><th>Overall Status</th><th>Current Material</th><th>Open Items</th><th>Next Step</th></tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {pagedBriefs.map((brief) => (
              <tr key={brief.project.id} className="transition hover:bg-white/[0.035]">
                <td className="py-2.5"><Link href={`/projects/${brief.project.id}`} className="font-semibold text-studio-100 hover:text-amberline">{brief.project.title}</Link><p className="mt-0.5 text-xs text-studio-400">{brief.project.genre}</p></td>
                <td><ExecutiveHealthBadge health={brief.health} /></td>
                <td className="text-studio-300">{brief.currentDocument ? `${brief.currentDocument.title} / ${statusLabel(brief.currentVersion?.status ?? "RECEIVED")}` : "No current material"}</td>
                <td className="text-studio-300">{brief.openTasks.length} tasks / {brief.pendingApprovals.length} approvals / {brief.reviewAssets.length} assets</td>
                <td className="text-studio-300">{brief.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationFooter page={normalizedPage} pageSize={pageSize} total={briefs.length} onPageChange={setPage} />
    </div>
  );
}

function AdminUsers({
  projects,
  users,
  currentUser,
  databaseMode,
  onCreateProject,
  onDeleteProject,
  onCreateUser,
  onUpdateUserRole,
  onDeleteUser,
  onStatusChange
}: {
  projects: HammerProject[];
  users: HammerUser[];
  currentUser: ReturnType<typeof hammerUserByEmail>;
  databaseMode: boolean;
  onCreateProject: (draft: Partial<ProjectDraft>) => void;
  onDeleteProject: (projectId: string) => void;
  onCreateUser: (input: { name: string; email: string; password: string; appRole: AppRole }) => Promise<void>;
  onUpdateUserRole: (userId: string, appRole: AppRole) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onStatusChange: (projectId: string, status: HammerProjectStatus) => Promise<void>;
}) {
  const canCreateProject = currentUser.role === "ADMIN" || currentUser.role === "PRODUCER" || currentUser.role === "EXECUTIVE";
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<HammerUser | null>(null);
  const [createdUserReceipt, setCreatedUserReceipt] = useState<{ name: string; email: string; password: string } | null>(null);
  const [projectStatusMessage, setProjectStatusMessage] = useState("");
  const [localUserStates, setLocalUserStates] = useState<Record<string, { inactive?: boolean; deleted?: boolean }>>({});
  const [adminProjectPage, setAdminProjectPage] = useState(1);
  const [adminUserPage, setAdminUserPage] = useState(1);
  const adminProjectPageSize = useResponsiveTablePageSize({ max: 14, reservedHeight: 520 });
  const adminUserPageSize = useResponsiveTablePageSize({ max: 14, reservedHeight: 520 });
  const [projectDraft, setProjectDraft] = useState<ProjectDraft>({
    title: "",
    logline: "",
    type: "Feature",
    genre: "",
    status: "IDEA",
    stage: "DEVELOPMENT",
    ownerId: currentUser.id
  });

  useEffect(() => {
    setProjectDraft((draft) => ({ ...draft, ownerId: currentUser.id }));
  }, [currentUser.id]);

  useEffect(() => {
    try {
      const storedUserStates = window.localStorage.getItem(HAMMER_LOCAL_USER_STATES_STORAGE_KEY);
      setLocalUserStates(storedUserStates ? JSON.parse(storedUserStates) as Record<string, { inactive?: boolean; deleted?: boolean }> : {});
    } catch {
      setLocalUserStates({});
    }
  }, []);

  const visibleUsers = users.filter((user) => !localUserStates[user.id]?.deleted);
  const adminProjectTotalPages = Math.max(1, Math.ceil(projects.length / adminProjectPageSize));
  const normalizedAdminProjectPage = Math.min(adminProjectPage, adminProjectTotalPages);
  const pagedAdminProjects = projects.slice((normalizedAdminProjectPage - 1) * adminProjectPageSize, normalizedAdminProjectPage * adminProjectPageSize);
  const adminUserTotalPages = Math.max(1, Math.ceil(visibleUsers.length / adminUserPageSize));
  const normalizedAdminUserPage = Math.min(adminUserPage, adminUserTotalPages);
  const pagedAdminUsers = visibleUsers.slice((normalizedAdminUserPage - 1) * adminUserPageSize, normalizedAdminUserPage * adminUserPageSize);

  useEffect(() => {
    setAdminProjectPage(1);
  }, [adminProjectPageSize, projects.length]);

  useEffect(() => {
    setAdminUserPage(1);
  }, [adminUserPageSize, visibleUsers.length]);

  async function createAdminUser(input: { name: string; email: string; password: string; appRole: AppRole }) {
    await onCreateUser(input);
    setCreatedUserReceipt({ name: input.name, email: input.email, password: input.password });
    setCreateUserOpen(false);
  }

  async function assignUserRole(userId: string, appRole: AppRole) {
    await onUpdateUserRole(userId, appRole);
    setRoleUser(null);
  }

  function updateLocalUserState(userId: string, nextState: { inactive?: boolean; deleted?: boolean }) {
    setLocalUserStates((current) => {
      const next = { ...current, [userId]: { ...current[userId], ...nextState } };
      window.localStorage.setItem(HAMMER_LOCAL_USER_STATES_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_USER_STATES_EVENT));
      return next;
    });
  }

  function toggleUserActive(user: HammerUser) {
    if (user.id === currentUser.id) return;
    const inactive = Boolean(localUserStates[user.id]?.inactive);
    updateLocalUserState(user.id, { inactive: !inactive });
  }

  async function deleteUser(user: HammerUser) {
    if (user.id === currentUser.id) return;
    if (!window.confirm(`Delete ${user.name}? This removes their account and project memberships.`)) return;
    if (databaseMode) {
      await onDeleteUser(user.id);
      return;
    }
    updateLocalUserState(user.id, { deleted: true, inactive: true });
  }

  async function changeProjectStatus(project: HammerProject, status: HammerProjectStatus) {
    setProjectStatusMessage("");
    try {
      await onStatusChange(project.id, status);
      setProjectStatusMessage(`${project.title} status saved.`);
    } catch (error) {
      setProjectStatusMessage(error instanceof Error ? error.message : "Could not save project status.");
    }
  }

  function submitProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateProject) return;
    onCreateProject(projectDraft);
    setProjectDraft({
      title: "",
      logline: "",
      type: "Feature",
      genre: "",
      status: "IDEA",
      stage: "DEVELOPMENT",
      ownerId: currentUser.id
    });
  }

  return (
    <div className="space-y-4">
      <Panel>
        <SectionHeader eyebrow="Development Slate" title="Create Slate Item" />
        <form onSubmit={submitProject} className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <div className="space-y-3">
            <input className="field" disabled={!canCreateProject} value={projectDraft.title} onChange={(event) => setProjectDraft({ ...projectDraft, title: event.target.value })} placeholder="Project title" />
            <textarea className="field min-h-20" disabled={!canCreateProject} value={projectDraft.logline} onChange={(event) => setProjectDraft({ ...projectDraft, logline: event.target.value })} placeholder="Logline" />
            <div className="grid gap-3 md:grid-cols-2">
              <input className="field" disabled={!canCreateProject} value={projectDraft.type} onChange={(event) => setProjectDraft({ ...projectDraft, type: event.target.value })} placeholder="Feature, Series, Short..." />
              <input className="field" disabled={!canCreateProject} value={projectDraft.genre} onChange={(event) => setProjectDraft({ ...projectDraft, genre: event.target.value })} placeholder="Genre" />
            </div>
          </div>
          <div className="space-y-3">
            <select className="field" disabled={!canCreateProject} value={projectDraft.status} onChange={(event) => setProjectDraft({ ...projectDraft, status: event.target.value as HammerProjectStatus })}>
              {hammerProjectStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
            <select className="field" disabled={!canCreateProject} value={projectDraft.stage} onChange={(event) => setProjectDraft({ ...projectDraft, stage: event.target.value as HammerProject["stage"] })}>
              {(["DEVELOPMENT", "SCRIPT", "TREATMENT", "VISDEV", "LOOKBOOK", "PACKAGING", "GREENLIGHT"] as HammerProject["stage"][]).map((stage) => <option key={stage} value={stage}>{statusLabel(stage)}</option>)}
            </select>
            <select className="field" disabled={!canCreateProject} value={projectDraft.ownerId} onChange={(event) => setProjectDraft({ ...projectDraft, ownerId: event.target.value })}>
              {visibleUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <PrimaryButton icon={Plus} label="Create Slate Item" />
            {!canCreateProject ? <p className="text-xs text-studio-400">Project creation is available to Admins.</p> : null}
          </div>
        </form>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Development Slate" title="Slate Status" />
        {projectStatusMessage ? <p className="mb-3 text-xs text-studio-300">{projectStatusMessage}</p> : null}
        <div className="data-scroll table-workspace-scroll">
          <table className="data-table min-w-[720px]">
            <thead className="text-xs uppercase tracking-[0.16em] text-studio-400"><tr><th className="py-2">Project</th><th>Current Status</th><th>Status Control</th><th>Updated</th><th>Admin</th></tr></thead>
            <tbody className="divide-y divide-white/10">
              {pagedAdminProjects.map((project) => (
                <tr key={project.id}>
                  <td className="py-2.5 font-semibold text-studio-100">{project.title}</td>
                  <td><Badge value={project.status} /></td>
                  <td>
                    <select
                      className="rounded-md border border-white/10 bg-studio-950 px-2.5 py-1.5 text-[13px] text-studio-100 outline-none focus:border-amberline/60"
                      value={project.status}
                      onChange={(event) => void changeProjectStatus(project, event.target.value as HammerProjectStatus)}
                    >
                      {hammerProjectStatuses.map((status) => (
                        <option key={status} value={status}>{statusLabel(status)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="text-studio-300">{project.updatedAt}</td>
                  <td>
                    <button
                      type="button"
                      disabled={!canCreateProject}
                      onClick={() => {
                        if (window.confirm(`Delete project "${project.title}"? This hides it from the active workspace.`)) onDeleteProject(project.id);
                      }}
                      className="inline-flex items-center gap-1 rounded border border-rose-400/25 bg-rose-500/5 px-1.5 py-1 text-[11px] font-semibold text-rose-300 transition hover:border-rose-300/50 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationFooter page={normalizedAdminProjectPage} pageSize={adminProjectPageSize} total={projects.length} onPageChange={setAdminProjectPage} />
      </Panel>

      <Panel>
        <SectionHeader eyebrow="RBAC" title="Users and Roles" action={<PrimaryButton icon={UsersRound} label="Create User" onClick={() => setCreateUserOpen(true)} />} />
        {createdUserReceipt ? (
          <div className="mb-3 rounded-md border border-emerald-400/25 bg-emerald-400/8 p-3">
            <p className="text-[13px] font-semibold text-studio-100">Temporary login created for {createdUserReceipt.name}</p>
            <p className="mt-1 text-xs text-studio-300">{createdUserReceipt.email}</p>
            <div className="mt-2 rounded border border-white/10 bg-white/[0.035] px-2.5 py-2 font-mono text-sm text-emerald-200">{createdUserReceipt.password}</div>
          </div>
        ) : null}
        <div className="data-scroll table-workspace-scroll">
          <table className="data-table min-w-[900px]">
            <thead className="text-xs uppercase tracking-[0.16em] text-studio-400"><tr><th className="py-2">Name</th><th>Email</th><th>Global Role</th><th>Status</th><th>Project Access</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-white/10">
              {pagedAdminUsers.map((user) => {
                const inactive = Boolean(localUserStates[user.id]?.inactive);
                const isCurrentUser = user.id === currentUser.id;
                return (
                  <tr key={user.id} className={cn(inactive && "opacity-60")}>
                    <td className="py-2.5 font-semibold text-studio-100">{user.name}{isCurrentUser ? <span className="ml-2 text-[11px] font-normal text-studio-400">You</span> : null}</td>
                    <td className="text-studio-300">{user.email}</td>
                    <td><Badge value={user.role} /></td>
                    <td><Badge value={inactive ? "INACTIVE" : "ACTIVE"} subtle /></td>
                    <td className="text-studio-300">Membership role + resource visibility</td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRoleUser(user)}
                          className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.025] px-1.5 py-1 text-[11px] font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          Assign Role
                        </button>
                        <button
                          type="button"
                          disabled={isCurrentUser}
                          onClick={() => toggleUserActive(user)}
                          className="rounded border border-white/10 bg-white/[0.025] px-1.5 py-1 text-[11px] font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {inactive ? "Reactivate" : "Deactivate"}
                        </button>
                        <button
                          type="button"
                          disabled={isCurrentUser}
                          onClick={() => deleteUser(user)}
                          className="inline-flex items-center gap-1 rounded border border-rose-400/25 bg-rose-500/5 px-1.5 py-1 text-[11px] font-semibold text-rose-300 transition hover:border-rose-300/50 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationFooter page={normalizedAdminUserPage} pageSize={adminUserPageSize} total={visibleUsers.length} onPageChange={setAdminUserPage} />
      </Panel>
      {createUserOpen ? (
        <CreateUserModal
          disabled={!databaseMode}
          onClose={() => setCreateUserOpen(false)}
          onCreate={createAdminUser}
        />
      ) : null}
      {roleUser ? (
        <AssignRoleModal
          user={roleUser}
          onClose={() => setRoleUser(null)}
          onAssign={assignUserRole}
        />
      ) : null}
    </div>
  );
}

function CreateUserModal({
  disabled,
  onClose,
  onCreate
}: {
  disabled: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; email: string; password: string; appRole: AppRole }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [appRole, setAppRole] = useState<AppRole>("producer");
  const [password, setPassword] = useState(() => temporaryPassword());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) {
      setError("User creation requires database mode.");
      return;
    }
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("Name, email, and an 8+ character password are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onCreate({ name: name.trim(), email: email.trim().toLowerCase(), password, appRole });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create user.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-lg border border-white/10 bg-studio-950 p-4 shadow-glow">
        <SectionHeader eyebrow="Admin" title="Create User" />
        <div className="grid gap-3">
          <label className="grid gap-1.5">
            <span className="font-display text-[10px] uppercase tracking-[0.14em] text-studio-400">Name</span>
            <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Maya Chen" />
          </label>
          <label className="grid gap-1.5">
            <span className="font-display text-[10px] uppercase tracking-[0.14em] text-studio-400">Email</span>
            <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="maya@example.com" />
          </label>
          <label className="grid gap-1.5">
            <span className="font-display text-[10px] uppercase tracking-[0.14em] text-studio-400">Role</span>
            <select className="field" value={appRole} onChange={(event) => setAppRole(event.target.value as typeof appRole)}>
              {appRoleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="font-display text-[10px] uppercase tracking-[0.14em] text-studio-400">Temporary Password</span>
            <div className="flex gap-2">
              <input className="field font-mono" value={password} onChange={(event) => setPassword(event.target.value)} />
              <button type="button" onClick={() => setPassword(temporaryPassword())} className="shrink-0 rounded border border-white/10 px-3 text-xs font-semibold text-studio-200 hover:text-amberline">
                Regenerate
              </button>
            </div>
          </label>
        </div>
        {error ? <p className="mt-3 rounded border border-rose-400/25 bg-rose-500/5 px-2.5 py-2 text-xs text-rose-200">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:text-amberline">Cancel</button>
          <button type="submit" disabled={busy || disabled} className="rounded bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">Create User</button>
        </div>
      </form>
    </div>
  );
}

function AssignRoleModal({ user, onClose, onAssign }: { user: HammerUser; onClose: () => void; onAssign: (userId: string, appRole: AppRole) => Promise<void> }) {
  const [appRole, setAppRole] = useState<AppRole>(appRoleForHammerRole(user.role));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onAssign(user.id, appRole);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not update user role.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-white/10 bg-studio-950 p-4 shadow-glow">
        <SectionHeader eyebrow="Admin" title="Assign Role" />
        <p className="mb-3 text-sm text-studio-300">{user.name}<br /><span className="text-xs text-studio-500">{user.email}</span></p>
        <label className="grid gap-1.5">
          <span className="font-display text-[10px] uppercase tracking-[0.14em] text-studio-400">Global Role</span>
          <select className="field" value={appRole} onChange={(event) => setAppRole(event.target.value as AppRole)}>
            {appRoleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        {error ? <p className="mt-3 rounded border border-rose-400/25 bg-rose-500/5 px-2.5 py-2 text-xs text-rose-200">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:text-amberline">Cancel</button>
          <button type="submit" disabled={busy} className="rounded bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">Save Role</button>
        </div>
      </form>
    </div>
  );
}

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const chars = Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `${chars}!`;
}

type ProjectSortKey = "title" | "logline" | "status" | "owner" | "updatedAt";
type ProspectSortKey = "title" | "logline" | "lane" | "genre" | "urgency" | "rights" | "owner" | "actionStatus" | "score";
type OutreachSortKey = "name" | "role" | "agency" | "genre" | "lastContact" | "followUp";
type TaskSortKey = "manual" | "title" | "assignee" | "type" | "context" | "priority" | "status" | "createdAt" | "dueDate";

function useResponsiveTablePageSize({ min = 6, max = 18, reservedHeight = 385, rowHeight = 49 }: { min?: number; max?: number; reservedHeight?: number; rowHeight?: number } = {}) {
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    function updatePageSize() {
      const availableTableHeight = Math.max(280, window.innerHeight - reservedHeight);
      setPageSize(Math.max(min, Math.min(max, Math.floor(availableTableHeight / rowHeight))));
    }

    updatePageSize();
    window.addEventListener("resize", updatePageSize);
    return () => window.removeEventListener("resize", updatePageSize);
  }, [max, min, reservedHeight, rowHeight]);

  return pageSize;
}

function PaginationFooter({ page, pageSize, total, onPageChange }: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  if (total <= pageSize) {
    return <div className="shrink-0 pt-3 text-xs text-studio-400">Showing {total} item{total === 1 ? "" : "s"}</div>;
  }
  return (
    <div className="shrink-0 pt-3 flex flex-col gap-2 text-xs text-studio-400 md:flex-row md:items-center md:justify-between">
      <span>
        Showing {(normalizedPage - 1) * pageSize + 1}-{Math.min(normalizedPage * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={normalizedPage <= 1}
          onClick={() => onPageChange(Math.max(1, normalizedPage - 1))}
          className="rounded border border-white/10 px-2 py-1 font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="min-w-24 text-center">Page {normalizedPage} of {totalPages}</span>
        <button
          type="button"
          disabled={normalizedPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, normalizedPage + 1))}
          className="rounded border border-white/10 px-2 py-1 font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function ProjectTable({ projects }: { projects: HammerProject[] }) {
  const [sort, setSort] = useState<{ key: ProjectSortKey; direction: "asc" | "desc" }>({ key: "title", direction: "asc" });
  const [page, setPage] = useState(1);
  const pageSize = useResponsiveTablePageSize({ max: 20, reservedHeight: 330 });
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aValue = projectSortValue(a, sort.key);
      const bValue = projectSortValue(b, sort.key);
      const comparison = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: "base" });
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [projects, sort.direction, sort.key]);

  function toggleSort(key: ProjectSortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  }

  useEffect(() => {
    setPage(1);
  }, [pageSize, projects.length, sort.direction, sort.key]);

  const totalPages = Math.max(1, Math.ceil(sortedProjects.length / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const pagedProjects = sortedProjects.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize);

  if (!projects.length) return <EmptyState label="No projects match this view." />;
  return (
    <div className="table-workspace">
      <div className="data-scroll table-workspace-scroll">
        <table className="data-table min-w-[980px]">
          <thead><tr><SortableHeader label="Project" sortKey="title" activeSort={sort} onSort={toggleSort} /><SortableHeader label="Logline" sortKey="logline" activeSort={sort} onSort={toggleSort} /><SortableHeader label="Status" sortKey="status" activeSort={sort} onSort={toggleSort} /><SortableHeader label="Owner" sortKey="owner" activeSort={sort} onSort={toggleSort} /><SortableHeader label="Updated" sortKey="updatedAt" activeSort={sort} onSort={toggleSort} /></tr></thead>
          <tbody>{pagedProjects.map((project) => <tr key={project.id} className="transition hover:bg-white/[0.035]"><td><Link className="block font-semibold text-studio-100" href={`/projects/${project.id}`}>{project.title}<p className="mt-0.5 text-xs font-normal text-studio-400">{project.genre}</p></Link></td><td><Link className="line-clamp-2 max-w-[420px] text-[13px] leading-5 text-studio-300" href={`/projects/${project.id}`}>{project.logline || "-"}</Link></td><td><Link className="block" href={`/projects/${project.id}`}><Badge value={project.status} /></Link></td><td><Link className="block text-studio-300" href={`/projects/${project.id}`}>{userName(project.ownerId)}</Link></td><td><Link className="block text-studio-300" href={`/projects/${project.id}`}>{project.updatedAt}</Link></td></tr>)}</tbody>
        </table>
      </div>
      <PaginationFooter page={normalizedPage} pageSize={pageSize} total={sortedProjects.length} onPageChange={setPage} />
    </div>
  );
}

function SortableHeader<TSortKey extends string>({ label, sortKey, activeSort, onSort, className }: { label: string; sortKey: TSortKey; activeSort: { key: TSortKey; direction: "asc" | "desc" }; onSort: (key: TSortKey) => void; className?: string }) {
  const active = activeSort.key === sortKey;
  return (
    <th className={className}>
      <button type="button" onClick={() => onSort(sortKey)} className={cn("inline-flex items-center gap-1 text-left uppercase tracking-[0.12em] transition hover:text-amberline", active && "text-amberline")}>
        {label}
        <ArrowUpDown className="h-3 w-3" />
        {active ? <span className="text-[10px]">{activeSort.direction === "asc" ? "A-Z" : "Z-A"}</span> : null}
      </button>
    </th>
  );
}

function projectSortValue(project: HammerProject, key: ProjectSortKey) {
  if (key === "title") return project.title;
  if (key === "logline") return project.logline;
  if (key === "status") return statusLabel(project.status);
  if (key === "owner") return userName(project.ownerId);
  return project.updatedAt;
}

function prospectSortValue(lead: HammerProjectLead, key: ProspectSortKey, users: HammerUser[]) {
  if (key === "title") return lead.title;
  if (key === "logline") return lead.logline ?? "";
  if (key === "lane") return lead.lane ?? "";
  if (key === "genre") return lead.genre ?? "";
  if (key === "urgency") return lead.urgencyLabel ?? "";
  if (key === "rights") return lead.rightsStatus ?? "";
  if (key === "owner") return prospectOwnerLabel(lead, users);
  if (key === "actionStatus") return lead.nextActionStatus ?? "";
  return lead.priorityScore === undefined || lead.priorityScore === null ? "" : String(lead.priorityScore).padStart(6, "0");
}

function outreachSortValue(contact: HammerContact, key: OutreachSortKey, latestEngagementByContact: Map<string, string>) {
  if (key === "name") return contact.name;
  if (key === "role") return talentRole(contact);
  if (key === "agency") return talentAgency(contact);
  if (key === "genre") return talentGenre(contact);
  if (key === "lastContact") return contact.lastContacted || latestEngagementByContact.get(contact.id) || "";
  return contact.nextFollowUp || "";
}

function taskTypeLabel(task: HammerTask) {
  if (task.targetType === "PROJECT_LEAD") return "Prospect";
  if (task.targetType === "DOCUMENT" || task.targetType === "DOCUMENT_VERSION") return "Document";
  if (task.targetType === "ASSET") return "Asset";
  if (task.targetType === "CONTACT") return "Contact";
  if (task.projectId || task.targetType === "PROJECT") return "Development Slate";
  return "General";
}

function taskContextLabel(task: HammerTask) {
  if (task.targetType === "GENERAL" || !task.projectId) return "General";
  if (task.targetType === "PROJECT_LEAD") return "Prospect";
  return projectTitle(task.projectId);
}

function moveId(ids: string[], fromId: string, toId: string) {
  const next = ids.filter((id) => id !== fromId);
  const targetIndex = next.indexOf(toId);
  if (targetIndex === -1) return ids;
  next.splice(targetIndex, 0, fromId);
  return next;
}

function TaskRows({
  tasks,
  users = hammerUsers,
  projects = hammerProjects,
  selectedTaskId,
  showAssignee = false,
  showType = false,
  showContext = false,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  onCreateSubtask,
  onUpdateSubtask,
  onDeleteSubtask
}: {
  tasks: HammerTask[];
  users?: HammerUser[];
  projects?: HammerProject[];
  selectedTaskId?: string;
  showAssignee?: boolean;
  showType?: boolean;
  showContext?: boolean;
  onUpdateTask?: (taskId: string, patch: TaskPatch) => void;
  onDeleteTask?: (taskId: string) => void;
  onReorderTasks?: (taskIds: string[]) => void;
  onCreateSubtask?: (taskId: string, title: string) => void;
  onUpdateSubtask?: (subtaskId: string, patch: TaskSubtaskPatch) => void;
  onDeleteSubtask?: (subtaskId: string) => void;
}) {
  const [sort, setSort] = useState<{ key: TaskSortKey; direction: "asc" | "desc" }>({ key: "manual", direction: "asc" });
  const [draggedTaskId, setDraggedTaskId] = useState("");
  const [dragOverTaskId, setDragOverTaskId] = useState("");
  const [editingTaskId, setEditingTaskId] = useState("");
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = useResponsiveTablePageSize({ max: 14, reservedHeight: 380, rowHeight: 66 });
  const gridClass = showAssignee
    ? showType
      ? "md:grid-cols-[34px_minmax(220px,1fr)_130px_140px_120px_118px_110px_105px_100px]"
      : showContext ? "md:grid-cols-[34px_1fr_130px_120px_118px_120px_110px_100px]" : "md:grid-cols-[34px_1fr_130px_118px_120px_110px_100px]"
    : showType
      ? "md:grid-cols-[34px_minmax(220px,1fr)_140px_118px_120px_110px_105px_100px]"
      : showContext ? "md:grid-cols-[34px_1fr_120px_118px_120px_110px_100px]" : "md:grid-cols-[34px_1fr_118px_120px_110px_100px]";
  const userNameById = useMemo(() => new Map(users.map((user) => [user.id, user.name])), [users]);
  const nameForUser = (userId: string) => userNameById.get(userId) ?? userName(userId);
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => compareTasks(a, b, sort, users, projects));
  }, [projects, sort, tasks, users]);
  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const pagedTasks = sortedTasks.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [pageSize, sort.direction, sort.key, tasks.length]);

  function toggleSort(key: TaskSortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  }
  function dropTask(targetTaskId: string) {
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId("");
      setDragOverTaskId("");
      return;
    }
    const orderedIds = sortedTasks.map((task) => task.id);
    setSort({ key: "manual", direction: "asc" });
    onReorderTasks?.(moveId(orderedIds, draggedTaskId, targetTaskId));
    setDraggedTaskId("");
    setDragOverTaskId("");
  }

  function toggleTaskSubtasks(taskId: string) {
    setExpandedTaskIds((current) => current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]);
  }

  const editingTask = tasks.find((task) => task.id === editingTaskId);

  return (
    <div className="table-workspace">
      <div className="data-scroll-list table-workspace-scroll grid gap-1.5">
        <div className={cn("hidden px-2.5 text-[11px] uppercase tracking-[0.12em] text-studio-400 md:grid", gridClass)}>
          <TaskSortButton label="Order" sortKey="manual" activeSort={sort} onSort={toggleSort} compact />
          <TaskSortButton label="Name" sortKey="title" activeSort={sort} onSort={toggleSort} />
          {showAssignee ? <TaskSortButton label="Assignee" sortKey="assignee" activeSort={sort} onSort={toggleSort} /> : null}
          {showType ? <TaskSortButton label="Type" sortKey="type" activeSort={sort} onSort={toggleSort} /> : null}
          {showContext ? <TaskSortButton label="Area" sortKey="context" activeSort={sort} onSort={toggleSort} /> : null}
          <span className="font-semibold">Subtasks</span>
          <TaskSortButton label="Priority" sortKey="priority" activeSort={sort} onSort={toggleSort} />
          <TaskSortButton label="Status" sortKey="status" activeSort={sort} onSort={toggleSort} />
          <TaskSortButton label="Created" sortKey="createdAt" activeSort={sort} onSort={toggleSort} />
          <TaskSortButton label="Due" sortKey="dueDate" activeSort={sort} onSort={toggleSort} />
        </div>
        {pagedTasks.map((task) => {
          const subtasks = task.subtasks ?? [];
          const completedSubtasks = subtasks.filter((subtask) => subtask.completed).length;
          const expanded = expandedTaskIds.includes(task.id);
          return (
            <div key={task.id} className={cn("rounded-md border border-white/10 bg-white/[0.018] transition", expanded && "border-amberline/25 bg-amberline/5")}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setEditingTaskId(task.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setEditingTaskId(task.id);
                  }
                }}
                className={cn(
                  "grid cursor-pointer gap-2 rounded-md px-2.5 py-2 transition hover:bg-white/[0.045] focus:outline-none focus:ring-2 focus:ring-amberline/30",
                  gridClass,
                  selectedTaskId === task.id && "bg-amberline/10",
                  dragOverTaskId === task.id && "bg-amberline/10"
                )}
                onDragOver={(event) => {
                  if (!onReorderTasks || !draggedTaskId) return;
                  event.preventDefault();
                  setDragOverTaskId(task.id);
                }}
                onDragLeave={() => setDragOverTaskId((current) => current === task.id ? "" : current)}
                onDrop={(event) => {
                  event.preventDefault();
                  dropTask(task.id);
                }}
              >
                <div className="flex items-start">
                  <button
                    type="button"
                    draggable={Boolean(onReorderTasks)}
                    disabled={!onReorderTasks}
                    onClick={(event) => event.stopPropagation()}
                    onDragStart={(event) => {
                      event.stopPropagation();
                      setSort({ key: "manual", direction: "asc" });
                      setDraggedTaskId(task.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", task.id);
                    }}
                    onDragEnd={() => {
                      setDraggedTaskId("");
                      setDragOverTaskId("");
                    }}
                    className="inline-flex h-6 w-6 cursor-grab items-center justify-center rounded border border-white/10 text-studio-400 transition hover:border-amberline/40 hover:text-amberline active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`Reorder ${task.title}`}
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div>
                  <p className="text-[13px] font-semibold leading-5 text-studio-100">{task.title}</p>
                  <p className="line-clamp-1 text-xs leading-4 text-studio-300">{task.description}</p>
                </div>
                {showAssignee ? <p className="text-xs font-semibold text-studio-300">{nameForUser(task.assignedToId)}</p> : null}
                {showType ? <p className="text-xs font-semibold text-studio-300">{taskTypeLabel(task)}</p> : null}
                {showContext ? <p className="text-xs text-studio-300">{taskContextLabel(task)}</p> : null}
                <TaskSubtaskSummary completed={completedSubtasks} total={subtasks.length} expanded={expanded} onToggle={() => toggleTaskSubtasks(task.id)} />
                <TaskInlineSelect
                  label="Priority"
                  value={task.priority}
                  options={["LOW", "MEDIUM", "HIGH", "URGENT"]}
                  onChange={(value) => onUpdateTask?.(task.id, { priority: value as TaskPriority })}
                  disabled={!onUpdateTask}
                />
                <TaskInlineSelect
                  label="Status"
                  value={task.status}
                  options={["TODO", "IN_PROGRESS", "REVIEW", "ON_HOLD", "BLOCKED", "DONE", "ARCHIVED"]}
                  onChange={(value) => onUpdateTask?.(task.id, { status: value as TaskStatus })}
                  disabled={!onUpdateTask}
                />
                <p className="text-xs text-studio-300">{formatShortDateTime(task.createdAt)}</p>
                <p className="text-xs text-studio-300">{task.dueDate}</p>
              </div>
              {expanded ? (
                <div className="border-t border-white/10 px-2.5 py-2">
                  <TaskSubtasks task={task} compact onCreateSubtask={onCreateSubtask} onUpdateSubtask={onUpdateSubtask} onDeleteSubtask={onDeleteSubtask} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <PaginationFooter page={normalizedPage} pageSize={pageSize} total={sortedTasks.length} onPageChange={setPage} />
      {editingTask && onUpdateTask ? (
        <EditTaskDialog
          task={editingTask}
          users={users}
          projects={projects}
          onClose={() => setEditingTaskId("")}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
        />
      ) : null}
    </div>
  );
}

function TaskSubtaskSummary({ completed, total, expanded, onToggle }: { completed: number; total: number; expanded: boolean; onToggle: () => void }) {
  const percent = total ? Math.round((completed / total) * 100) : 0;
  if (!total) {
    return (
      <button type="button" onClick={(event) => { event.stopPropagation(); onToggle(); }} className={cn("inline-flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-left text-[11px] font-semibold text-studio-400 transition hover:border-amberline/35 hover:text-amberline", expanded && "border-amberline/35 text-amberline")}>
        <span>Add subtasks</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition", expanded && "rotate-180")} />
      </button>
    );
  }

  return (
    <button type="button" onClick={(event) => { event.stopPropagation(); onToggle(); }} className={cn("rounded-md border border-amberline/20 bg-amberline/8 px-2 py-1 text-left transition hover:border-amberline/45", expanded && "border-amberline/45 bg-amberline/12")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-studio-100">{completed}/{total}</span>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-studio-400">
          {percent}%
          <ChevronDown className={cn("h-3.5 w-3.5 transition", expanded && "rotate-180")} />
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-amberline transition-all" style={{ width: `${percent}%` }} />
      </div>
    </button>
  );
}

function TaskInlineSelect({
  label,
  value,
  options,
  onChange,
  disabled = false
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const tone = toneForStatus(value);
  return (
    <label className="grid gap-1" onClick={(event) => event.stopPropagation()}>
      <span className="sr-only">{label}</span>
      <select
        className={cn(
          "status-badge min-w-0 rounded border px-2 py-1 font-display text-[11px] uppercase outline-none transition focus:border-amberline/60 focus:ring-2 focus:ring-amberline/15 disabled:cursor-not-allowed disabled:opacity-55",
          badgeStyles[tone].solid
        )}
        value={value}
        disabled={disabled}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => <option key={option} value={option}>{badgeLabel(option)}</option>)}
      </select>
    </label>
  );
}

function TaskSubtasks({
  task,
  compact = false,
  onCreateSubtask,
  onUpdateSubtask,
  onDeleteSubtask
}: {
  task: HammerTask;
  compact?: boolean;
  onCreateSubtask?: (taskId: string, title: string) => void;
  onUpdateSubtask?: (subtaskId: string, patch: TaskSubtaskPatch) => void;
  onDeleteSubtask?: (subtaskId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const subtasks = task.subtasks ?? [];
  const completedCount = subtasks.filter((subtask) => subtask.completed).length;

  function addSubtask() {
    if (!title.trim() || !onCreateSubtask) return;
    onCreateSubtask(task.id, title.trim());
    setTitle("");
  }

  const percent = subtasks.length ? Math.round((completedCount / subtasks.length) * 100) : 0;

  return (
    <div className={cn("rounded-md border border-amberline/20 bg-amberline/8 p-2.5", compact && "bg-transparent")}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amberline">Subtasks</p>
          {!compact ? <p className="mt-1 text-xs text-studio-400">Break this task into smaller steps and check them off here.</p> : null}
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-[11px] font-semibold text-studio-200">{completedCount}/{subtasks.length} complete</span>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-amberline transition-all" style={{ width: `${percent}%` }} />
      </div>
      {subtasks.length ? (
        <div className="grid gap-1">
          {subtasks.map((subtask) => (
            <TaskSubtaskRow key={subtask.id} subtask={subtask} onUpdateSubtask={onUpdateSubtask} onDeleteSubtask={onDeleteSubtask} />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-white/15 bg-white/[0.025] px-2.5 py-2 text-xs text-studio-400">No subtasks yet. Add the first concrete step below.</p>
      )}
      {onCreateSubtask ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            className="field py-1.5 text-xs"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addSubtask();
              }
            }}
            placeholder="Add a subtask, e.g. Send revised pages to team"
          />
          <button type="button" onClick={addSubtask} disabled={!title.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-amberline px-3 py-1.5 text-xs font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TaskSubtaskRow({ subtask, onUpdateSubtask, onDeleteSubtask }: { subtask: HammerTaskSubtask; onUpdateSubtask?: (subtaskId: string, patch: TaskSubtaskPatch) => void; onDeleteSubtask?: (subtaskId: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(subtask.title);

  useEffect(() => {
    if (!editing) setDraft(subtask.title);
  }, [editing, subtask.title]);

  function save() {
    const nextTitle = draft.trim();
    if (!nextTitle) return;
    onUpdateSubtask?.(subtask.id, { title: nextTitle });
    setEditing(false);
  }

  return (
    <div className={cn("flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition", subtask.completed ? "border-emerald-300/20 bg-emerald-400/8" : "border-white/10 bg-white/[0.035]")}>
      <button
        type="button"
        onClick={() => onUpdateSubtask?.(subtask.id, { completed: !subtask.completed })}
        disabled={!onUpdateSubtask}
        className={cn("grid h-4.5 w-4.5 shrink-0 place-items-center rounded border transition", subtask.completed ? "border-emerald-300/45 bg-emerald-400/20 text-emerald-200" : "border-white/15 text-transparent hover:border-amberline/45", !onUpdateSubtask && "cursor-not-allowed opacity-50")}
        aria-label={subtask.completed ? "Mark subtask incomplete" : "Mark subtask complete"}
      >
        <CheckCircle2 className="h-3 w-3" />
      </button>
      {editing ? (
        <input className="field min-w-0 flex-1 py-1.5 text-xs" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(); if (event.key === "Escape") setEditing(false); }} autoFocus />
      ) : (
        <p className={cn("min-w-0 flex-1 text-xs text-studio-200", subtask.completed && "text-studio-500 line-through")}>{subtask.title}</p>
      )}
      {editing ? (
        <button type="button" onClick={save} className="rounded border border-white/10 px-2 py-1 text-[11px] font-semibold text-studio-300 hover:text-amberline">Save</button>
      ) : (
        <button type="button" onClick={() => setEditing(true)} disabled={!onUpdateSubtask} className="rounded border border-white/10 px-2 py-1 text-[11px] font-semibold text-studio-300 hover:text-amberline disabled:cursor-not-allowed disabled:opacity-40">Edit</button>
      )}
      {onDeleteSubtask ? (
        <button type="button" onClick={() => onDeleteSubtask(subtask.id)} className="rounded border border-rose-400/25 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:border-rose-300/50 hover:text-rose-200">Delete</button>
      ) : null}
    </div>
  );
}

function TaskSortButton({ label, sortKey, activeSort, onSort, compact = false }: { label: string; sortKey: TaskSortKey; activeSort: { key: TaskSortKey; direction: "asc" | "desc" }; onSort: (key: TaskSortKey) => void; compact?: boolean }) {
  const active = activeSort.key === sortKey;
  const directionLabel = sortKey === "manual" ? (activeSort.direction === "asc" ? "1-N" : "N-1") : activeSort.direction === "asc" ? "A-Z" : "Z-A";
  if (compact) {
    return (
      <button type="button" onClick={() => onSort(sortKey)} aria-label={`${label} sort`} title={label} className={cn("inline-flex h-5 w-5 items-center justify-center rounded text-left font-semibold uppercase tracking-[0.12em] transition hover:text-amberline", active && "text-amberline")}>
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    );
  }
  return (
    <button type="button" onClick={() => onSort(sortKey)} className={cn("inline-flex min-w-0 items-center gap-1 text-left font-semibold uppercase tracking-[0.12em] transition hover:text-amberline", active && "text-amberline")}>
      <span className="truncate">{label}</span>
      <ArrowUpDown className="h-3 w-3 shrink-0" />
      {active ? <span className="shrink-0 text-[10px]">{directionLabel}</span> : null}
    </button>
  );
}

function compareTasks(a: HammerTask, b: HammerTask, sort: { key: TaskSortKey; direction: "asc" | "desc" }, users: HammerUser[], projects: HammerProject[]) {
  const aValue = taskSortValue(a, sort.key, users, projects);
  const bValue = taskSortValue(b, sort.key, users, projects);
  const comparison = typeof aValue === "number" && typeof bValue === "number"
    ? aValue - bValue
    : String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: "base" });
  if (comparison !== 0) return sort.direction === "asc" ? comparison : -comparison;
  return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
}

function taskSortValue(task: HammerTask, key: TaskSortKey, users: HammerUser[], projects: HammerProject[]) {
  if (key === "manual") return task.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (key === "title") return `${task.title} ${task.description}`;
  if (key === "assignee") return users.find((user) => user.id === task.assignedToId)?.name ?? userName(task.assignedToId);
  if (key === "type") return taskTypeLabel(task);
  if (key === "context") return taskContextLabelFromList(task, projects);
  if (key === "priority") return taskPriorityRank[task.priority] ?? 0;
  if (key === "status") return taskStatusRank[task.status] ?? 0;
  if (key === "createdAt") return task.createdAt ? Date.parse(task.createdAt) || 0 : 0;
  return task.dueDate ? Date.parse(task.dueDate) || Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
}

function taskContextLabelFromList(task: HammerTask, projects: HammerProject[]) {
  if (task.targetType === "GENERAL" || !task.projectId) return "General";
  if (task.targetType === "PROJECT_LEAD") return "Prospect";
  return projects.find((project) => project.id === task.projectId)?.title ?? projectTitle(task.projectId);
}

const taskPriorityRank: Record<TaskPriority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4
};

const taskStatusRank: Record<TaskStatus, number> = {
  TODO: 1,
  IN_PROGRESS: 2,
  REVIEW: 3,
  ON_HOLD: 4,
  BLOCKED: 5,
  DONE: 6,
  ARCHIVED: 7
};

function EditTaskDialog({
  task,
  users,
  projects,
  onClose,
  onUpdateTask,
  onDeleteTask
}: {
  task: HammerTask;
  users: HammerUser[];
  projects: HammerProject[];
  onClose: () => void;
  onUpdateTask: (taskId: string, patch: TaskPatch) => void;
  onDeleteTask?: (taskId: string) => void;
}) {
  const [scope, setScope] = useState<"GENERAL" | "PROJECT">(task.projectId ? "PROJECT" : "GENERAL");
  const [projectId, setProjectId] = useState(task.projectId || projects[0]?.id || "");
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assignedToId, setAssignedToId] = useState(task.assignedToId || users[0]?.id || "");
  const [dueDate, setDueDate] = useState(task.dueDate || defaultDueDate());
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setScope(task.projectId ? "PROJECT" : "GENERAL");
    setProjectId(task.projectId || projects[0]?.id || "");
    setTitle(task.title);
    setDescription(task.description);
    setAssignedToId(task.assignedToId || users[0]?.id || "");
    setDueDate(task.dueDate || defaultDueDate());
    setPriority(task.priority);
    setStatus(task.status);
  }, [projects, task, users]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !assignedToId || (scope === "PROJECT" && !projectId)) return;
    const nextProjectId = scope === "PROJECT" ? projectId : "";
    onUpdateTask(task.id, {
      projectId: nextProjectId,
      title: title.trim(),
      description: description.trim(),
      assignedToId,
      dueDate,
      priority,
      status,
      targetType: scope,
      targetId: nextProjectId
    });
    onClose();
  }

  function deleteTask() {
    if (!onDeleteTask) return;
    if (window.confirm(`Delete task "${task.title}"?`)) {
      onDeleteTask(task.id);
      onClose();
    }
  }

  const dialog = (
    <div className="modal-overlay" onMouseDown={onClose}>
      <form onSubmit={submit} className="modal-panel flex max-h-[calc(100vh-4rem)] max-w-2xl flex-col overflow-hidden" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <SectionHeader eyebrow="Task" title="Edit Task" />
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close task editor">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="data-scroll-list grid min-h-0 flex-1 gap-3 pr-1">
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Task Area</span>
            <select className="field" value={scope} onChange={(event) => setScope(event.target.value as "GENERAL" | "PROJECT")}>
              <option value="GENERAL">General Task</option>
              <option value="PROJECT">Development Slate Task</option>
            </select>
          </label>
          {scope === "PROJECT" ? (
            <label className="grid gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Development Slate Item</span>
              <select className="field" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
              </select>
            </label>
          ) : null}
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Task Name</span>
            <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Description</span>
            <textarea className="field min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Assign To</span>
              <select className="field" value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)}>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name} / {statusLabel(user.role)}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Due Date</span>
              <input className="field" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Priority</span>
              <select className="field" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Progress</span>
              <select className="field" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
                {(["TODO", "IN_PROGRESS", "DONE", "ON_HOLD", "REVIEW"] as TaskStatus[]).map((item) => <option key={item} value={item}>{taskStatusLabel(item)}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-between gap-2">
          {onDeleteTask ? (
            <button type="button" onClick={deleteTask} className="inline-flex items-center gap-1.5 rounded border border-rose-400/25 bg-rose-500/5 px-3 py-2 text-sm font-semibold text-rose-300 hover:border-rose-300/50 hover:text-rose-200">
              <Trash2 className="h-4 w-4" />
              Delete Task
            </button>
          ) : <span />}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:text-amberline">Cancel</button>
            <button type="submit" className="rounded bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 hover:bg-emerald-300">Save Task</button>
          </div>
        </div>
      </form>
    </div>
  );

  if (!mounted) return null;
  return createPortal(dialog, document.body);
}

function CompactTaskRows({ tasks }: { tasks: HammerTask[] }) {
  return (
    <div className="grid gap-1.5">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={`/tasks?task=${encodeURIComponent(task.id)}`}
          className="grid gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 transition hover:border-amberline/35 hover:bg-white/[0.055] md:grid-cols-[1fr_96px_92px_82px]"
        >
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-studio-100">{task.title}</p>
            <p className="truncate text-[11px] text-studio-400">{userName(task.assignedToId)} / due {task.dueDate}</p>
          </div>
          <Badge value={task.priority} subtle />
          <Badge value={task.status} subtle />
          <span className="hidden self-center text-[11px] text-studio-400 md:block">{statusLabel(task.targetType)}</span>
        </Link>
      ))}
    </div>
  );
}

function EntityPanel({ projectId }: { projectId: string }) {
  const entities = hammerEntities.filter((entity) => entity.projectId === projectId);
  return <Panel><SectionHeader eyebrow="Editable" title="Characters, Locations, Props, Actions" />{entities.map((entity) => <div key={entity.id} className="mb-2 grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[160px_1fr]"><input className="field" defaultValue={entity.name} /><input className="field" defaultValue={`${entity.type}: ${entity.description}`} /></div>)}</Panel>;
}

function CommentsPanel({
  eyebrow = "Notes",
  title = "Notes",
  targetId,
  targetIds,
  targetType = "DOCUMENT_VERSION",
  projectId,
  versionNote,
  comments = hammerComments,
  currentUser,
  onCreateComment,
  emptyLabel = "No notes yet.",
  placeholder = "Add a note",
  saveLabel = "Save Note"
}: {
  eyebrow?: string;
  title?: string;
  targetId: string;
  targetIds?: string[];
  targetType?: string;
  projectId?: string;
  versionNote?: string;
  comments?: HammerComment[];
  currentUser?: HammerUser;
  onCreateComment?: (input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string }) => Promise<void>;
  emptyLabel?: string;
  placeholder?: string;
  saveLabel?: string;
}) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<HammerComment["visibility"]>("PROJECT_TEAM");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const visibleTargetIds = targetIds?.length ? targetIds : [targetId];
  const targetComments = comments
    .filter((comment) => visibleTargetIds.includes(comment.targetId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function saveNote() {
    if (!onCreateComment || !body.trim()) {
      setMessage(body.trim() ? "Notes cannot be saved from this view yet." : "Write a note before saving.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await onCreateComment({ targetType, targetId, projectId, body: body.trim(), visibility });
      setBody("");
      setMessage("Note saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <SectionHeader eyebrow={eyebrow} title={title} />
      <div className="space-y-2">
        {versionNote?.trim() ? (
          <div className="rounded border border-emerald-400/20 bg-emerald-400/5 p-2.5 text-[13px] text-studio-200">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300">Version Upload Note</p>
            <p>{versionNote}</p>
          </div>
        ) : null}
        {targetComments.length ? targetComments.map((comment) => (
          <div key={comment.id} className="rounded border border-white/10 bg-white/[0.03] p-2.5 text-[13px] text-studio-300">
            <p>{comment.body}</p>
            <p className="mt-1.5 text-[11px] text-studio-500">{userName(comment.createdById)} / {comment.visibility} / {comment.createdAt}</p>
          </div>
        )) : versionNote?.trim() ? null : <EmptyState label={emptyLabel} />}
      </div>
      <div className="mt-3 grid gap-2">
        <textarea className="field min-h-24" value={body} onChange={(event) => setBody(event.target.value)} placeholder={placeholder} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <select className="field sm:w-52" value={visibility} onChange={(event) => setVisibility(event.target.value as HammerComment["visibility"])}>
            <option value="PROJECT_TEAM">Project Team</option>
            <option value="INTERNAL">Internal</option>
            <option value="EXECUTIVE_ONLY">Executive Only</option>
          </select>
          <div className="flex items-center gap-2">
            {message ? <p className="text-xs text-studio-300">{message}</p> : null}
            <button type="button" disabled={busy || !currentUser} onClick={saveNote} className="inline-flex items-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" />
              {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return <div className="mb-2 rounded-md border border-white/10 bg-white/[0.03] p-2.5"><p className="font-display text-[10px] uppercase tracking-[0.12em] text-studio-400">{label}</p><p className="mt-0.5 break-words text-[13px] font-semibold text-studio-100">{value}</p></div>;
}

function ProjectMeta({ label, value }: { label: string; value: string }) {
  return <div><p className="font-display text-[10px] uppercase tracking-[0.12em] text-studio-500">{label}</p><p className="mt-0.5 text-[13px] font-semibold text-studio-100">{value}</p></div>;
}

function Badge({ value, subtle = false }: { value: string; subtle?: boolean }) {
  const tone = toneForStatus(value);
  const styles = badgeStyles[tone];
  return <span className={cn("status-badge inline-flex rounded border px-2 py-1 font-display text-[11px] uppercase", subtle ? styles.subtle : styles.solid)}>{badgeLabel(value)}</span>;
}

type BadgeTone = "green" | "yellow" | "red" | "darkred" | "blue" | "purple" | "neutral";

const badgeStyles: Record<BadgeTone, { solid: string; subtle: string }> = {
  green: {
    solid: "border-emerald-400/35 bg-emerald-400/10 text-emerald-200",
    subtle: "border-emerald-400/25 bg-emerald-400/5 text-emerald-300"
  },
  yellow: {
    solid: "border-amber-300/40 bg-amber-300/10 text-amber-200",
    subtle: "border-amber-300/25 bg-amber-300/5 text-amber-300"
  },
  red: {
    solid: "border-rose-400/40 bg-rose-500/10 text-rose-200",
    subtle: "border-rose-400/25 bg-rose-500/5 text-rose-300"
  },
  darkred: {
    solid: "border-red-700/50 bg-red-950/35 text-red-200",
    subtle: "border-red-700/35 bg-red-950/20 text-red-300"
  },
  blue: {
    solid: "border-sky-400/35 bg-sky-400/10 text-sky-200",
    subtle: "border-sky-400/25 bg-sky-400/5 text-sky-300"
  },
  purple: {
    solid: "border-violet-400/35 bg-violet-400/10 text-violet-200",
    subtle: "border-violet-400/25 bg-violet-400/5 text-violet-300"
  },
  neutral: {
    solid: "border-white/14 bg-white/[0.045] text-studio-300",
    subtle: "border-white/10 bg-white/[0.025] text-studio-400"
  }
};

function toneForStatus(value: string): BadgeTone {
  const key = value.toUpperCase();
  if (["URGENT"].includes(key)) return "darkred";
  if (["GREENLIGHT", "GREENLIGHT_REVIEW", "APPROVED", "DONE", "LOCKED", "CONSIDER", "PROJECT_LINKED", "IN_PROGRESS"].includes(key)) return "green";
  if (["REVIEW", "IN_REVIEW", "INTERNAL_REVIEW", "REQUESTED", "REVISION_REQUESTED", "CHANGES_REQUESTED", "MEDIUM", "READING", "COVERAGE_REQUESTED", "COVERAGE_COMPLETE"].includes(key)) return "yellow";
  if (["ON_HOLD", "ARCHIVED", "PASSED", "PASS", "BLOCKED", "REJECTED", "CANCELLED", "HIGH", "REVISION_REQUESTED"].includes(key)) return "red";
  if (["SCRIPT", "DEVELOPMENT", "DRAFT", "OUTLINE", "TODO", "LOW", "UPLOADED", "TREATMENT", "RECEIVED", "LOGGED"].includes(key)) return "blue";
  if (["VISDEV", "VISUAL_DEVELOPMENT", "LOOKBOOK", "PACKAGING", "KEYFRAME", "STORYBOARD", "ARTIST", "EXECUTIVE", "PRODUCER", "ADMIN"].includes(key)) return "purple";
  return "neutral";
}

function badgeLabel(value: string) {
  if (["TODO", "IN_PROGRESS", "DONE", "ON_HOLD", "REVIEW"].includes(value.toUpperCase())) return taskStatusLabel(value as TaskStatus);
  return statusLabel(value);
}

function taskStatusLabel(status: TaskStatus) {
  if (status === "TODO") return "To Do";
  if (status === "IN_PROGRESS") return "In Progress";
  if (status === "DONE") return "Complete";
  if (status === "ON_HOLD") return "On Hold";
  return statusLabel(status);
}

function TableLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="rounded border border-white/10 px-1.5 py-1 text-[11px] font-semibold text-studio-300 hover:text-amberline">{children}</Link>;
}

function DownloadFileLink({
  fileName,
  dataUrl,
  fallbackText,
  resourceType,
  resourceId,
  currentUser,
  compact = false
}: {
  fileName: string;
  dataUrl?: string;
  fallbackText?: string;
  resourceType?: DownloadResourceType;
  resourceId?: string;
  currentUser?: HammerUser;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [includeIp, setIncludeIp] = useState(true);
  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const href = dataUrl || textDownloadUrl(fallbackText);
  const hasDownloadSource = Boolean(href || (resourceType && resourceId));

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!hasDownloadSource) return null;

  async function downloadFile(watermark: boolean) {
    setMessage("");
    try {
      if (!watermark && href) {
        triggerBrowserDownload(href, dataUrl ? fileName : textFileName(fileName));
        setOpen(false);
        return;
      }
      if (watermark && href) {
        const result = await buildClientWatermarkedDownload({ fileName, dataUrl, fallbackText, includeIp, currentUser });
        triggerBrowserDownload(result.href, result.fileName);
        window.setTimeout(() => URL.revokeObjectURL(result.href), 1500);
        setOpen(false);
        return;
      }
      if (!resourceType || !resourceId) {
        setMessage("This file is not available for secure download yet.");
        return;
      }
      window.location.href = `/api/download?type=${encodeURIComponent(resourceType)}&id=${encodeURIComponent(resourceId)}&watermark=${watermark ? "1" : "0"}&ip=${includeIp ? "1" : "0"}`;
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not prepare download.");
    }
  }

  const dialog = open && mounted ? createPortal(
    <div className="fixed inset-0 z-[140] grid place-items-center bg-studio-950/75 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="modal-card w-full max-w-md rounded-xl border border-white/12 bg-studio-950 p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[11px] uppercase tracking-[0.16em] text-amberline">Secure Download</p>
            <h3 className="mt-1 text-lg font-semibold text-studio-100">{fileName}</h3>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-white/10 p-1.5 text-studio-400 hover:text-studio-100" aria-label="Close download options">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-[13px] leading-5 text-studio-300">
          Watermarked downloads stamp the file with the signed-in user, UTC date/time, and optionally the requester IP. Use original only when the reviewer will not accept a watermark.
        </p>
        <label className="mt-3 flex items-center gap-2 text-[13px] text-studio-300">
          <input type="checkbox" checked={includeIp} onChange={(event) => setIncludeIp(event.target.checked)} className="h-4 w-4 accent-amberline" />
          Include IP address when available
        </label>
        {message ? <p className="mt-3 rounded border border-rose-400/25 bg-rose-500/10 px-2.5 py-2 text-xs text-rose-200">{message}</p> : null}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => downloadFile(true)} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 transition hover:bg-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Download Watermarked
          </button>
          <button type="button" onClick={() => downloadFile(false)} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/12 bg-white/[0.025] px-3 py-2 text-sm font-semibold text-studio-200 transition hover:border-white/30">
            <Download className="h-4 w-4" />
            Download Original
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded border border-white/10 px-1.5 py-1 text-[11px] font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline",
          compact && "px-1.5"
        )}
      >
        <Download className="h-3 w-3" />
        {compact ? null : "Download"}
      </button>
      {dialog}
    </>
  );
}

async function buildClientWatermarkedDownload({ fileName, dataUrl, fallbackText, includeIp, currentUser }: { fileName: string; dataUrl?: string; fallbackText?: string; includeIp: boolean; currentUser?: HammerUser }) {
  const timestamp = new Date().toISOString();
  const userLabel = currentUser ? `${currentUser.name} <${currentUser.email}>` : "GreenLight user";
  const watermark = `${userLabel} | ${timestamp}${includeIp ? " | IP captured on server when available" : ""}`;
  if (dataUrl?.startsWith("data:image/")) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <image href="${escapeHtmlAttribute(dataUrl)}" width="1600" height="1000" preserveAspectRatio="xMidYMid meet"/>
  <g transform="translate(110 650) rotate(-28)" opacity="0.28">
    <text x="0" y="0" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="#0f7a34">${escapeHtmlText(watermark)}</text>
    <text x="0" y="84" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="#0f7a34">${escapeHtmlText(watermark)}</text>
  </g>
  <text x="32" y="966" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0b5f2a" opacity="0.75">${escapeHtmlText(watermark)}</text>
</svg>`;
    return { href: URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), fileName: watermarkedFileName(fileName, "svg") };
  }
  if (dataUrl?.startsWith("data:text/") || fallbackText?.trim()) {
    const text = fallbackText?.trim() || await dataUrlToText(dataUrl ?? "");
    return {
      href: URL.createObjectURL(new Blob([`WATERMARK: ${watermark}\n\n${text}`], { type: "text/plain;charset=utf-8" })),
      fileName: watermarkedFileName(fileName, "txt")
    };
  }
  if (dataUrl && fileName.toLowerCase().endsWith(".pdf")) {
    throw new Error("PDF watermarking for this file requires the production download route. Try the original download, or re-open from database-backed storage.");
  }
  throw new Error("This file type cannot be watermarked in the browser yet.");
}

function triggerBrowserDownload(href: string, fileName: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function dataUrlToText(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.text();
}

function watermarkedFileName(fileName: string, extension: string) {
  return `${fileName.replace(/\.[^.]+$/, "")}.watermarked.${extension}`;
}

function escapeHtmlText(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeHtmlAttribute(value: string) {
  return escapeHtmlText(value).replaceAll('"', "&quot;");
}

function PrimaryButton({ icon: Icon, label, onClick, disabled = false }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick?: () => void; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className="ui-button inline-flex items-center gap-1.5 rounded-md bg-amberline px-2.5 py-1.5 text-xs font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-65"><Icon className={cn("h-3.5 w-3.5", label.toLowerCase().includes("uploading") && "animate-spin")} />{label}</button>;
}

function GhostButton({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return <button className="ui-button inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs font-semibold text-studio-200 transition hover:border-amberline/40 hover:text-amberline"><Icon className="h-3.5 w-3.5" />{label}</button>;
}

function DangerButton({ label, onClick }: { label: string; onClick: () => void }) {
  function confirmDelete() {
    if (window.confirm("Delete this uploaded script and its local versions?")) onClick();
  }

  return (
    <button type="button" onClick={confirmDelete} className="inline-flex items-center gap-1 rounded border border-rose-400/25 bg-rose-500/5 px-1.5 py-1 text-[11px] font-semibold text-rose-300 hover:border-rose-300/50 hover:text-rose-200">
      <Trash2 className="h-3 w-3" />
      {label}
    </button>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return <div className="mb-2.5"><div className="mb-1 flex justify-between text-xs text-studio-300"><span>{label}</span><span>{value}</span></div><div className="h-1.5 rounded bg-white/10"><div className="h-1.5 rounded bg-amberline" style={{ width: `${(value / max) * 100}%` }} /></div></div>;
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function canViewAllProjectTasks(role?: string) {
  return isManagerRole(role);
}

function canManageScriptLibrary(role?: string) {
  return isManagerRole(role);
}

function canDownloadFiles(role?: string) {
  return isManagerRole(role);
}

const appRoleOptions: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "executive", label: "Executive" },
  { value: "producer", label: "Producer" },
  { value: "department_lead", label: "Department Lead" }
];

function hammerRoleForAppRole(role: AppRole): HammerUser["role"] {
  if (role === "admin") return "ADMIN";
  if (role === "executive") return "EXECUTIVE";
  if (role === "department_lead") return "DEVELOPMENT";
  return "PRODUCER";
}

function appRoleForHammerRole(role: HammerUser["role"]): AppRole {
  if (role === "ADMIN") return "admin";
  if (role === "EXECUTIVE") return "executive";
  if (role === "PRODUCER") return "producer";
  return "department_lead";
}

function canViewAllProjects(role?: string) {
  return isManagerRole(role);
}

function canAccessScriptDocument(user: ReturnType<typeof hammerUserByEmail>, document: HammerDocument) {
  if (canManageScriptLibrary(user.role)) return true;
  if (!document.projectId) return false;
  return assignedProjectsForUser(user.id).some((project) => project.id === document.projectId);
}

function canViewContacts(role?: string) {
  return isManagerRole(role);
}

function canViewReports(role?: string) {
  return isManagerRole(role);
}

function isManagerRole(role?: string) {
  const normalizedRole = role?.toUpperCase();
  return normalizedRole === "ADMIN" || normalizedRole === "PRODUCER" || normalizedRole === "EXECUTIVE" || normalizedRole === "EXEC";
}

function normalizeScriptSection(section?: string): ScriptLibrarySection | undefined {
  if (section === "inbox" || section === "projects" || section === "all") return section;
  return undefined;
}

function projectTitleFromList(projectId: string, projects: HammerProject[]) {
  const project = projects.find((item) => item.id === projectId);
  const fallbackTitle = projectTitle(projectId);
  if (project) return project.title;
  return fallbackTitle === "Unknown Project" ? "Linked Development Slate Item" : fallbackTitle;
}

function nameForUserFromList(userId: string | undefined, users: HammerUser[]) {
  if (!userId) return "Unassigned";
  return users.find((user) => user.id === userId)?.name ?? userName(userId);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function reportDateInput(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function parseReportDateInput(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseReportRecordDate(value?: string) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWithinReportWindow(value: string | undefined, start: Date, end: Date) {
  const parsed = parseReportRecordDate(value);
  if (!parsed) return false;
  return parsed >= start && parsed <= end;
}

function formatReportWindow(start: Date, end: Date) {
  return `${start.toLocaleString()} to ${end.toLocaleString()}`;
}

function formatShortDateTime(value?: string) {
  const parsed = parseReportRecordDate(value);
  return parsed ? parsed.toLocaleString() : "unknown";
}

function reportSection(title: string, lines: string[]) {
  return [`${title}:`, ...(lines.length ? lines.map((line) => `- ${line}`) : ["- None"]), ""].join("\n");
}

function buildExecutiveReportEmail(input: {
  subject: string;
  scopeLabel: string;
  windowStart: Date;
  windowEnd: Date;
  currentUser: HammerUser;
  projects: HammerProject[];
  updatedProjects: HammerProject[];
  updatedProspects: HammerProjectLead[];
  newVersions: HammerDocumentVersion[];
  newSupportingDocs: SupportingDocument[];
  documents: HammerDocument[];
  dueTasks: HammerTask[];
  createdTasks: HammerTask[];
  urgentTasks: HammerTask[];
  approvalActivity: HammerApproval[];
  pendingApprovals: HammerApproval[];
  comments: HammerComment[];
  assetReviews: HammerAsset[];
  greenlightProjects: HammerProject[];
  onHoldProjects: HammerProject[];
  users: HammerUser[];
}) {
  const documentById = new Map(input.documents.map((document) => [document.id, document]));
  const summaryLines = [
    `${input.updatedProjects.length + input.updatedProspects.length} slate/prospect update${input.updatedProjects.length + input.updatedProspects.length === 1 ? "" : "s"}`,
    `${input.newVersions.length + input.newSupportingDocs.length} material upload${input.newVersions.length + input.newSupportingDocs.length === 1 ? "" : "s"}`,
    `${input.createdTasks.length} task${input.createdTasks.length === 1 ? "" : "s"} created in the selected window`,
    `${input.pendingApprovals.length} pending approval${input.pendingApprovals.length === 1 ? "" : "s"}`
  ];
  const attentionLines = [
    ...input.urgentTasks.slice(0, 8).map((task) => `${task.title} (${task.priority}, ${statusLabel(task.status)}) - ${nameForUserFromList(task.assignedToId, input.users)}`),
    ...input.greenlightProjects.slice(0, 5).map((project) => `${project.title} is in Greenlight Review`),
    ...input.onHoldProjects.slice(0, 5).map((project) => `${project.title} is On Hold`),
    ...input.assetReviews.slice(0, 5).map((asset) => `${asset.title} needs visual/reference review`)
  ];
  const changeLines = [
    ...input.updatedProjects.map((project) => `${project.title}: ${statusLabel(project.status)} / ${project.updatedAt}`),
    ...input.updatedProspects.map((prospect) => `${prospect.title}: ${prospect.creator || "Writer TBD"} / ${prospect.lastUpdated || "updated"}`)
  ];
  const materialLines = [
    ...input.newVersions.map((version) => {
      const document = documentById.get(version.documentId);
      return `${document?.title ?? "Document"} v${version.versionNumber}: ${version.fileName} (${statusLabel(version.status)})${document?.source ? ` / Source: ${document.source}` : ""}`;
    }),
    ...input.newSupportingDocs.map((document) => `${document.title}: ${document.fileName} (${statusLabel(document.type)})${document.source ? ` / Source: ${document.source}` : ""}`)
  ];
  const taskLines = [
    ...input.createdTasks.map((task) => `${task.title} - created ${formatShortDateTime(task.createdAt)} - ${nameForUserFromList(task.assignedToId, input.users)} - ${statusLabel(task.status)} / ${task.priority}${task.dueDate ? ` - due ${task.dueDate}` : ""}`),
    ...input.dueTasks
      .filter((task) => !input.createdTasks.some((createdTask) => createdTask.id === task.id))
      .map((task) => `${task.title} - due ${task.dueDate} - ${nameForUserFromList(task.assignedToId, input.users)} - ${statusLabel(task.status)} / ${task.priority}`)
  ];
  const approvalLines = [
    ...input.pendingApprovals.map((approval) => `${approval.targetType} ${approval.targetId}: ${statusLabel(approval.status)} - reviewer ${nameForUserFromList(approval.reviewerId, input.users)}`),
    ...input.approvalActivity.map((approval) => `${approval.targetType} ${approval.targetId}: activity ${statusLabel(approval.status)}`)
  ];
  const noteLines = input.comments.slice(0, 10).map((comment) => `${statusLabel(comment.targetType)} ${comment.targetId}: ${comment.body}`);

  return [
    `Hi team,`,
    "",
    `Here is the GreenLight executive digest for ${input.scopeLabel}.`,
    `Window: ${formatReportWindow(input.windowStart, input.windowEnd)}`,
    `Prepared by: ${input.currentUser.name} (${input.currentUser.email})`,
    "",
    reportSection("Topline", summaryLines),
    reportSection("Needs Attention", attentionLines),
    reportSection("Slate / Prospect Changes", changeLines),
    reportSection("Script and Supporting Material Updates", materialLines),
    reportSection("Tasks", taskLines),
    reportSection("Approvals", approvalLines),
    reportSection("Recent Notes / Comments", noteLines),
    `Recommended next step: review pending approvals and urgent tasks first, then scan material updates for anything that needs executive context.`,
    "",
    `- GreenLight`
  ].join("\n");
}

function projectsForDocumentGroups(projects: HammerProject[], docs: HammerDocument[]) {
  const byId = new Map(projects.map((project) => [project.id, project]));
  const missingProjectIds = Array.from(new Set(docs.map((doc) => doc.projectId).filter((projectId): projectId is string => Boolean(projectId && !byId.has(projectId)))));
  return [
    ...projects,
    ...missingProjectIds.map((projectId) => ({
      ...emptyProject,
      id: projectId,
      title: projectTitle(projectId)
    }))
  ];
}

function isValidProject(project: unknown): project is HammerProject {
  return Boolean(project && typeof project === "object" && "id" in project && "title" in project);
}

function isValidDocument(document: unknown): document is HammerDocument {
  return Boolean(document && typeof document === "object" && "id" in document && "title" in document);
}

function isValidVersion(version: unknown): version is HammerDocumentVersion {
  return Boolean(version && typeof version === "object" && "id" in version && "documentId" in version);
}

function isValidTask(task: unknown): task is HammerTask {
  return Boolean(task && typeof task === "object" && "id" in task && "title" in task);
}

function isValidUser(user: unknown): user is HammerUser {
  return Boolean(user && typeof user === "object" && "id" in user && "email" in user);
}

function isValidAsset(asset: unknown): asset is HammerAsset {
  return Boolean(asset && typeof asset === "object" && "id" in asset && "title" in asset);
}

function parseProjectLeadCsv(csv: string): HammerProjectLead[] {
  const rows = parseCsvRows(csv).filter((row) => row.some((cell) => cell.trim()));
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => normalizeCsvHeader(header));
  return rows.slice(1).map((row, index) => {
    const record = Object.fromEntries(headers.map((header, cellIndex) => [header, row[cellIndex]?.trim() ?? ""]));
    const externalId = record.projectid || undefined;
    const title = record.title || "Untitled Slate Item";
    return {
      id: buildProspectImportId(title, externalId, index),
      title,
      externalId,
      logline: record.logline,
      genre: record.genre,
      lane: record.lane,
      creator: record.creatorauthordirector,
      priorityScore: optionalCsvNumber(record.priorityscore),
      subgenreTags: record.subgenretags,
      urgencyLabel: record.urgencylabel,
      discoveryStage: record.discoverystage,
      countryLanguage: record.countrylanguage,
      platformSource: record.platformsource,
      whyItMatters: record.whyitmatters,
      signalProof: record.signalproof,
      sourceLink: record.sourcelink,
      rightsStatus: record.rightsstatus,
      rightsHolder: record.rightsholder,
      contactRep: record.contactrep,
      adaptationFormat: record.adaptationformat,
      comps: record.comps,
      heatScore: optionalCsvNumber(record.heatscore),
      conceptScore: optionalCsvNumber(record.conceptscore),
      adaptabilityScore: optionalCsvNumber(record.adaptabilityscore),
      rightsOpportunityScore: optionalCsvNumber(record.rightsopportunityscore),
      studioFitScore: optionalCsvNumber(record.studiofitscore),
      nextActionStatus: record.nextactionstatus,
      owner: record.owner,
      ownerIds: resolveCsvOwnerIds(record.owner, hammerUsers),
      nextStep: record.nextstep,
      lastUpdated: record.lastupdated,
      notes: record.notes,
      projectCover: record.projectcover,
      searchKeywords: record.searchkeywords,
      originalReleaseDate: record.originalreleasepublicationdate,
      myPicks: record.mypicks,
      actionItems: record.actionitems,
      country: record.country,
      votes: optionalCsvNumber(record.votes),
      yearWritten: record.yearwritten,
      scriptStatus: record.scriptstatus,
      format: record.format,
      scriptPdf: record.scriptpdf
    };
  });
}

function dedupeProjectLeads(leads: HammerProjectLead[]) {
  const byKey = new Map<string, HammerProjectLead>();
  for (const lead of leads) {
    const key = prospectDisplayKey(lead);
    const existing = byKey.get(key);
    if (!existing || prospectDisplayScore(lead) > prospectDisplayScore(existing)) {
      byKey.set(key, lead);
    }
  }
  return Array.from(byKey.values());
}

function prospectDisplayKey(lead: HammerProjectLead) {
  const externalId = normalizeProspectDisplayKeyPart(lead.externalId);
  if (externalId) return `external:${externalId}`;
  return [
    "natural",
    normalizeProspectDisplayKeyPart(lead.title),
    normalizeProspectDisplayKeyPart(lead.creator),
    normalizeProspectDisplayKeyPart(lead.sourceLink),
    normalizeProspectDisplayKeyPart(lead.logline)
  ].join(":");
}

function prospectDisplayScore(lead: HammerProjectLead) {
  let score = 0;
  if (lead.promotedProjectId) score += 10_000;
  if (lead.scriptPdf) score += 1_000;
  if (lead.notes) score += 100;
  if (lead.lastUpdated) score += 10;
  return score;
}

function normalizeProspectDisplayKeyPart(value?: string) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 180);
}

function resolveCsvOwnerIds(owner: string | undefined, users: HammerUser[]) {
  if (!owner?.trim()) return [];
  const ownerTokens = owner.split(/[;,/]+/).map((token) => token.trim().toLowerCase()).filter(Boolean);
  return users
    .filter((user) => {
      const names = [user.id, user.name, user.email].map((value) => value.toLowerCase());
      return ownerTokens.some((token) => names.includes(token));
    })
    .map((user) => user.id);
}

function parseContactsCsv(csv: string): HammerContact[] {
  const rows = parseCsvRows(csv).filter((row) => row.some((cell) => csvCell(cell).trim()));
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => normalizeCsvHeader(header));
  return rows.slice(1).map((row, index) => {
    const record = Object.fromEntries(headers.map((header, cellIndex) => [header, csvCell(row[cellIndex]).trim()])) as Record<string, string>;
    const agency = record.agency || record.company || record.management || record.representation || "Independent";
    const role = record.role || record.title || record.type || "Contact";
    const genre = record.genre || record.genres || "";
    const location = record.based || record.location || record.city || "";
    const credits = record.credits || record.notes || "";
    const metWith = record.metwith || record.met || record.metwithdate || "";
    const hasTalentColumns = Boolean(record.agency || record.credits || record.genre || record.role || record.metwith || record.based);
    const type = hasTalentColumns ? talentContactType(role) : normalizeContactType(record.type);
    return {
      id: `contact-local-${Date.now()}-${index}`,
      name: record.name || "Unnamed Contact",
      company: agency,
      type,
      title: role || statusLabel(type),
      email: record.email || "",
      phone: record.phone || "",
      location,
      website: record.website || "",
      status: normalizeContactStatus(record.status || (metWith ? "ACTIVE" : "NEW")),
      ownerId: record.ownerid || record.owner || "",
      tags: hasTalentColumns ? talentTags(genre, record.tags) : parseTags(record.tags),
      lastContacted: record.lastcontacted || "",
      nextFollowUp: record.nextfollowup || record.followup || "",
      projectIds: parseContactProjects(record.projects || record.project || record.projectids),
      notes: credits,
      isTalent: hasTalentColumns || record.istalent === "true",
      talentAgency: agency,
      talentCredits: credits,
      talentGenre: genre,
      talentRole: role,
      talentMetWith: metWith,
      talentBased: location
    };
  }).filter((contact) => csvCell(contact.name).trim());
}

function optionalCsvNumber(value?: string) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildProspectImportId(title: string, externalId: string | undefined, index: number) {
  const slug = `${externalId || "prospect"}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `lead-${slug || "item"}-${index + 1}`;
}

function buildContactsCsv(contacts: HammerContact[]) {
  const headers = ["name", "agency", "credits", "genre", "role", "metWith", "location", "email", "phone", "website", "status", "ownerId", "tags", "nextFollowUp", "projects", "notes"];
  const rows = contacts.map((contact) => [
    contact.name,
    talentAgency(contact),
    talentCredits(contact),
    talentGenre(contact) === "-" ? "" : talentGenre(contact),
    talentRole(contact),
    talentMetWith(contact),
    talentLocation(contact),
    contact.email,
    contact.phone,
    contact.website ?? "",
    contact.status ?? "ACTIVE",
    contact.ownerId ?? "",
    (contact.tags ?? []).filter((tag) => tag.toLowerCase() !== "talent").join("; "),
    contact.nextFollowUp ?? "",
    contact.projectIds.map(projectTitle).join("; "),
    contact.notes === talentCredits(contact) ? "" : contact.notes
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function csvCell(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizeCsvHeader(value: unknown) {
  return csvCell(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeContactType(value?: string): ContactType {
  const normalized = value?.toUpperCase().replace(/[^A-Z]/g, "_") as ContactType | undefined;
  return normalized && contactTypes.includes(normalized) ? normalized : "OTHER";
}

function normalizeContactStatus(value?: string): ContactStatus {
  const normalized = value?.toUpperCase().replace(/[^A-Z]/g, "_") as ContactStatus | undefined;
  return normalized && contactStatuses.includes(normalized) ? normalized : "ACTIVE";
}

function parseTags(value?: string) {
  return value ? value.split(/[;,]/).map((tag) => tag.trim()).filter(Boolean) : [];
}

function parseContactProjects(value?: string) {
  const source = csvCell(value);
  if (!source.trim()) return [];
  return source
    .split(/[;|]/)
    .map((item) => item.trim())
    .map((item) => hammerProjects.find((project) => project.id === item || project.title.toLowerCase() === item.toLowerCase())?.id)
    .filter((projectId): projectId is string => Boolean(projectId));
}

function escapeCsvCell(value: unknown) {
  const string = csvCell(value);
  return /[",\n\r]/.test(string) ? `"${string.replaceAll("\"", "\"\"")}"` : string;
}

function currentVersionFor(documentId: string, documents: HammerDocument[], versions: HammerDocumentVersion[]) {
  const doc = documents.find((item) => item.id === documentId);
  return versions.find((version) => version.id === doc?.currentVersionId) ?? versions.filter((version) => version.documentId === documentId).sort((a, b) => b.versionNumber - a.versionNumber)[0];
}

function combineVersionNotes(notes: string, warning?: string) {
  if (!warning) return notes;
  const warningNote = `Upload warning: ${warning}`;
  return notes.trim() ? `${notes.trim()}\n\n${warningNote}` : warningNote;
}


const hammerNoteTypes: HammerNoteType[] = ["GENERAL", "COVERAGE", "CREATIVE", "LEGAL_RIGHTS", "PRODUCTION", "EXECUTIVE", "FOLLOW_UP"];

function noteTypeLabel(type: HammerNoteType | string | undefined) {
  const labels: Record<HammerNoteType, string> = {
    GENERAL: "General",
    COVERAGE: "Coverage",
    CREATIVE: "Creative",
    LEGAL_RIGHTS: "Legal / Rights",
    PRODUCTION: "Production",
    EXECUTIVE: "Executive",
    FOLLOW_UP: "Follow-up"
  };
  return labels[(type as HammerNoteType) ?? "GENERAL"] ?? "General";
}

function noteMetadata(comment: HammerComment): { noteType: HammerNoteType; tags: HammerNoteTag[] } {
  const metadata = comment.metadataJson;
  const noteType = metadata?.noteType && hammerNoteTypes.includes(metadata.noteType) ? metadata.noteType : "GENERAL";
  return {
    noteType,
    tags: normalizedDocumentTags(metadata?.tags)
  };
}

function noteTargetContext(
  comment: HammerComment,
  context: {
    projects: HammerProject[];
    prospects?: HammerProjectLead[];
    documents: HammerDocument[];
    versions: HammerDocumentVersion[];
    tasks: HammerTask[];
    assets: HammerAsset[];
    approvals: HammerApproval[];
  }
) {
  if (comment.targetType === "PROJECT") {
    const project = context.projects.find((item) => item.id === comment.targetId);
    return {
      label: project?.title ?? "Unknown Development Slate Item",
      parentLabel: "Development Slate",
      href: project ? `/projects/${project.id}` : undefined,
      projectId: project?.id
    };
  }
  if (comment.targetType === "PROSPECT") {
    const prospect = context.prospects?.find((item) => item.id === comment.targetId);
    return {
      label: prospect?.title ?? "Unknown Prospect",
      parentLabel: "Prospects",
      href: prospect ? `/prospects?prospect=${encodeURIComponent(prospect.id)}` : "/prospects",
      projectId: prospect?.promotedProjectId
    };
  }
  if (comment.targetType === "DOCUMENT") {
    const document = context.documents.find((item) => item.id === comment.targetId);
    return {
      label: document?.title ?? "Unknown Document",
      parentLabel: document?.projectId ? projectTitleFromList(document.projectId, context.projects) : "Prospects / Inbox",
      href: document ? `/scripts/${document.id}` : undefined,
      projectId: document?.projectId
    };
  }
  if (comment.targetType === "DOCUMENT_VERSION") {
    const version = context.versions.find((item) => item.id === comment.targetId);
    const document = version ? context.documents.find((item) => item.id === version.documentId) : undefined;
    return {
      label: document ? `${document.title} / v${version?.versionNumber ?? 1}` : "Unknown Script Version",
      parentLabel: document?.projectId ? projectTitleFromList(document.projectId, context.projects) : "Prospects / Inbox",
      href: document ? `/scripts/${document.id}` : undefined,
      projectId: document?.projectId
    };
  }
  if (comment.targetType === "TASK") {
    const task = context.tasks.find((item) => item.id === comment.targetId);
    return {
      label: task?.title ?? "Unknown Task",
      parentLabel: task?.projectId ? projectTitleFromList(task.projectId, context.projects) : "General Task",
      href: task ? `/tasks?task=${task.id}` : "/tasks",
      projectId: task?.projectId
    };
  }
  if (comment.targetType === "ASSET") {
    const asset = context.assets.find((item) => item.id === comment.targetId);
    return {
      label: asset?.title ?? "Unknown Asset",
      parentLabel: asset?.projectId ? projectTitleFromList(asset.projectId, context.projects) : "Asset",
      href: asset ? `/assets/${asset.id}` : undefined,
      projectId: asset?.projectId
    };
  }
  if (comment.targetType === "APPROVAL") {
    const approval = context.approvals.find((item) => item.id === comment.targetId);
    return {
      label: approval ? `Approval / ${statusLabel(approval.status)}` : "Unknown Approval",
      parentLabel: approval?.projectId ? projectTitleFromList(approval.projectId, context.projects) : "Approval",
      href: "/reviews",
      projectId: approval?.projectId
    };
  }
  return {
    label: statusLabel(comment.targetType),
    parentLabel: "GreenLight",
    href: undefined,
    projectId: undefined
  };
}

function userNameFromList(userId: string, users: HammerUser[]) {
  return users.find((user) => user.id === userId)?.name ?? userName(userId);
}

function formatNoteTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

async function extractNoteTextFromFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (file.type === "application/pdf" || extension === "pdf") {
    try {
      return await extractPdfText(file);
    } catch (error) {
      throw new Error(error instanceof Error ? `Could not import PDF text: ${error.message}` : "Could not import PDF text from that file.");
    }
  }
  if (extension === "txt" || extension === "text" || extension === "md" || extension === "fdx" || file.type === "text/plain" || file.type === "text/markdown") {
    const text = await file.text();
    if (!text.trim()) throw new Error("That file did not contain readable text.");
    return text;
  }
  if (extension === "doc" || extension === "docx") {
    throw new Error("DOC/DOCX note import is not available yet. Export the note as PDF, TXT, or MD, then import it here.");
  }
  throw new Error("Unsupported note import file. Use TXT, MD, FDX, or readable PDF.");
}

async function extractTextFromUpload(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (file.type === "application/pdf" || extension === "pdf") {
    return extractPdfText(file);
  }
  if (extension === "fdx" || extension === "txt" || extension === "md" || file.type === "text/plain" || file.type === "text/markdown") {
    const text = await file.text();
    if (!text.trim()) throw new Error("No text found in uploaded file.");
    return text;
  }
  if (extension === "docx" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return `DOCX uploaded: ${file.name}\n\nText extraction for DOCX is queued for the server-backed parser. Upload PDF, FDX, or TXT for immediate breakdown and diff text in this MVP.`;
  }
  throw new Error("Unsupported file type. Upload PDF, FDX, TXT, or MD.");
}

function isAllowedScriptUploadFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension === "pdf" || extension === "fdx" || extension === "txt" || extension === "md" || file.type === "application/pdf" || file.type === "text/plain" || file.type === "text/markdown";
}

function inferFileType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === "fdx") return "application/xml";
  if (extension === "md") return "text/markdown";
  return "text/plain";
}

function uploadFailureMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Upload failed, but GreenLight did not receive an error message. Check Nginx/app logs for /api/hammer/document-upload and retry with a smaller PDF or text-selectable export.";
}

async function readUploadErrorResponse(response: Response): Promise<DocumentUploadErrorResponse> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await response.json().catch(() => ({ error: "Document upload failed.", detail: `HTTP ${response.status}` }));
  }
  const body = await response.text().catch(() => "");
  const plainBody = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (response.status === 504) {
    return {
      error: "Upload timed out at Nginx before GreenLight returned a response.",
      detail: plainBody || "Nginx reported a 504 Gateway Timeout while waiting for the app upload route.",
      hint: "Confirm production is running the latest GreenLight build, then check proxy_read_timeout/proxy_send_timeout and app logs for /api/hammer/document-upload. The server may still be spending too long receiving the file, writing to GCS, or parsing an older synchronous route."
    };
  }
  if (response.status === 502 || response.status === 503) {
    return {
      error: "Upload service was unavailable.",
      detail: plainBody || `HTTP ${response.status} ${response.statusText}`,
      hint: "Check that the app container is healthy and that Nginx is proxying to the active Next.js process."
    };
  }
  return {
    error: "Document upload failed before GreenLight could return a structured error.",
    detail: plainBody || `HTTP ${response.status} ${response.statusText || "Unknown response"}`,
    hint: response.status === 413
      ? "The upload exceeded a proxy or server body-size limit. Check Nginx client_max_body_size and any load balancer limits."
      : "Check the production Nginx/app logs for this request."
  };
}

function formatUploadError(error: DocumentUploadErrorResponse, status: number) {
  const parts = [
    error.error || `Document upload failed with HTTP ${status}.`,
    error.stage ? `Stage: ${error.stage}.` : undefined,
    error.detail ? `Details: ${error.detail}` : undefined,
    error.hint ? `Next step: ${error.hint}` : undefined,
    error.requestId ? `Request ID: ${error.requestId}` : undefined
  ].filter(Boolean);
  return parts.join(" ");
}

function textDownloadUrl(text?: string) {
  return text?.trim() ? `data:text/plain;charset=utf-8,${encodeURIComponent(text)}` : undefined;
}

function textFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "") + ".txt";
}

function inferProspectAssetFileType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "doc") return "application/msword";
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === "md") return "text/markdown";
  if (extension === "txt") return "text/plain";
  if (["jpg", "jpeg"].includes(extension ?? "")) return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "gif") return "image/gif";
  if (extension === "webp") return "image/webp";
  return "application/octet-stream";
}

function isAllowedProspectAssetFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return Boolean(file.type.startsWith("image/") || ["pdf", "doc", "docx", "txt", "md"].includes(extension ?? ""));
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function fileNameWithoutExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim();
}

function normalizeTagKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 48);
}

function normalizedDocumentTags(tags: Array<Partial<Pick<HammerDocumentTag, "key" | "value">>> | undefined) {
  const seen = new Set<string>();
  const normalized: Array<Pick<HammerDocumentTag, "key" | "value">> = [];
  for (const tag of tags ?? []) {
    const key = normalizeTagKey(tag.key ?? "");
    const value = (tag.value ?? "").trim().replace(/\s+/g, " ").slice(0, 160);
    if (!key || !value) continue;
    const compound = `${key}:${value.toLowerCase()}`;
    if (seen.has(compound)) continue;
    seen.add(compound);
    normalized.push({ key, value });
  }
  return normalized;
}

function documentTagSearchText(document: HammerDocument) {
  return (document.tags ?? []).map((tag) => `${tag.key} ${tag.value}`).join(" ");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
}

function referenceToneClass(tone: ProjectReferenceImage["demoTone"] = "steel") {
  const tones: Record<NonNullable<ProjectReferenceImage["demoTone"]>, string> = {
    steel: "bg-[linear-gradient(135deg,#1f2937,#64748b_55%,#111827)]",
    neon: "bg-[linear-gradient(135deg,#0f172a,#155e75_48%,#7c2d12)]",
    forest: "bg-[linear-gradient(135deg,#10231b,#2f6f54_52%,#0f172a)]",
    gold: "bg-[linear-gradient(135deg,#3b2f1f,#b45309_54%,#111827)]",
    ice: "bg-[linear-gradient(135deg,#172554,#0891b2_52%,#e0f2fe)]"
  };
  return tones[tone];
}

const demoReferenceImages: ProjectReferenceImage[] = [
  {
    id: "demo-ref-hammer-quarry",
    projectId: "project-hammer",
    title: "Quarry Road Night",
    description: "Wet industrial road, convoy headlights, practical sodium vapor mood for the opening sequence.",
    category: "ENVIRONMENT_REFERENCE",
    status: "APPROVED",
    fileName: "demo-quarry-road.jpg",
    demoTone: "steel",
    uploadedAt: "Demo"
  },
  {
    id: "demo-ref-hammer-case",
    projectId: "project-hammer",
    title: "Prototype Case Language",
    description: "Hard-shell utility case with magnetic latch details and scuffed field texture.",
    category: "PROP_REFERENCE",
    status: "APPROVED",
    fileName: "demo-prototype-case.png",
    demoTone: "gold",
    uploadedAt: "Demo"
  },
  {
    id: "demo-ref-hammer-rooftop",
    projectId: "project-hammer",
    title: "Rooftop Handoff Mood",
    description: "Municipal rooftop, rain sheen, billboard spill, and zipline silhouette notes.",
    category: "MOOD_IMAGE",
    status: "IN_REVIEW",
    fileName: "demo-rooftop-mood.jpg",
    demoTone: "neon",
    uploadedAt: "Demo"
  },
  {
    id: "demo-ref-orchid-corridor",
    projectId: "project-orchid",
    title: "Habitat Corridor",
    description: "Biolab corridor with emergency amber strips and soft condensation on glass.",
    category: "ENVIRONMENT_REFERENCE",
    status: "UPLOADED",
    fileName: "demo-orchid-corridor.jpg",
    demoTone: "ice",
    uploadedAt: "Demo"
  },
  {
    id: "demo-ref-orchid-greenhouse",
    projectId: "project-orchid",
    title: "Overgrown Module",
    description: "Dormant station garden coming back online with plant silhouettes and broken grow lights.",
    category: "MOOD_IMAGE",
    status: "IN_REVIEW",
    fileName: "demo-orchid-greenhouse.jpg",
    demoTone: "forest",
    uploadedAt: "Demo"
  },
  {
    id: "demo-ref-northstar-observatory",
    projectId: "project-northstar",
    title: "Family Observatory",
    description: "Warm repaired telescope room with child-built star charts and handmade mechanisms.",
    category: "LOOKBOOK_PAGE",
    status: "UPLOADED",
    fileName: "demo-northstar-observatory.jpg",
    demoTone: "gold",
    uploadedAt: "Demo"
  }
];

function titleForView(view: HammerView, context: { project: HammerProject; document: typeof hammerDocuments[number]; asset: typeof hammerAssets[number] }) {
  const titles: Record<HammerView, string> = {
    dashboard: "My Dashboard",
    projects: "Development Slate",
    prospects: "Prospects",
    collections: "Collections",
    notes: "Notes",
    "project-new": "New Project",
    "project-detail": context.project.title,
    "project-documents": context.project.title,
    "project-assets": context.project.title,
    scripts: "Scripts in Context",
    "script-detail": context.document.title,
    "script-versions": "Compare Versions",
    "script-diff": "Version Diff",
    "script-breakdown": "Script Breakdown",
    assets: "Assets",
    "asset-detail": context.asset.title,
    tasks: "Tasks",
    contacts: "Outreach",
    reviews: "Reviews",
    "studio-status": "Studio Status",
    reports: "Studio Status",
    executive: "Studio Status",
    "admin-users": "Admin",
    account: "Account"
  };
  return titles[view];
}

type BreadcrumbItem = {
  label: string;
  href?: string;
};

function PageBreadcrumbs({ view, project, document, asset, projects = hammerProjects, accessDenied = false }: { view: HammerView; project: HammerProject; document: typeof hammerDocuments[number]; asset: typeof hammerAssets[number]; projects?: HammerProject[]; accessDenied?: boolean }) {
  const router = useRouter();
  const [hasPageHistory, setHasPageHistory] = useState(false);
  const breadcrumbs = accessDenied ? [{ label: "Development Slate", href: "/projects" }, { label: "Access Required" }] : breadcrumbsForView(view, { project, document, asset, projects });
  const backHref = backHrefForView(view, { project, document, asset });

  useEffect(() => {
    setHasPageHistory(typeof window !== "undefined" && window.history.length > 1);
  }, []);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    if (backHref) router.push(backHref);
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {hasPageHistory || backHref ? (
        <button
          type="button"
          onClick={goBack}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.025] text-studio-300 transition hover:border-amberline/40 hover:text-amberline"
          title="Back to previous page"
          aria-label="Back to previous page"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-studio-500">
          {breadcrumbs.map((item, index) => {
            const current = index === breadcrumbs.length - 1;
            return (
              <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                {index ? <span className="text-studio-600">/</span> : null}
                {item.href && !current ? (
                  <button type="button" onClick={() => router.push(item.href!)} className="truncate font-semibold text-studio-400 transition hover:text-amberline">{item.label}</button>
                ) : (
                  <span className={cn("truncate font-semibold", current ? "text-amberline" : "text-studio-400")}>{item.label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

function breadcrumbsForView(view: HammerView, context: { project: HammerProject; document: typeof hammerDocuments[number]; asset: typeof hammerAssets[number]; projects?: HammerProject[] }): BreadcrumbItem[] {
  const scriptTrail = context.document.projectId
    ? [{ label: "Development Slate", href: "/projects" }, { label: projectTitleFromList(context.document.projectId, context.projects ?? hammerProjects), href: `/projects/${context.document.projectId}/documents` }, { label: context.document.title, href: `/scripts/${context.document.id}` }]
    : [{ label: "Prospects", href: "/prospects" }, { label: context.document.title, href: `/scripts/${context.document.id}` }];
  const projectTrail = [{ label: "Development Slate", href: "/projects" }, { label: context.project.title, href: `/projects/${context.project.id}` }];

  if (view === "script-detail") return scriptTrail;
  if (view === "collections") return [{ label: "Collections" }];
  if (view === "script-versions") return [...scriptTrail, { label: "Compare" }];
  if (view === "script-diff") return [...scriptTrail, { label: "Diff" }];
  if (view === "script-breakdown") return [...scriptTrail, { label: "Breakdown" }];
  if (view === "project-detail") return projectTrail;
  if (view === "project-documents") return [...projectTrail, { label: "Documents" }];
  if (view === "project-assets") return [...projectTrail, { label: "Assets" }];
  if (view === "asset-detail") return [{ label: "Assets", href: "/assets" }, { label: context.asset.title }];
  if (view === "project-new") return [{ label: "Admin", href: "/admin/users" }, { label: "New Project" }];
  if (view === "admin-users") return [{ label: "Admin" }, { label: "Users" }];
  if (view === "account") return [{ label: "GreenLight" }, { label: "Account" }];
  return [{ label: "GreenLight" }, { label: titleForView(view, context) }];
}

function backHrefForView(view: HammerView, context: { project: HammerProject; document: typeof hammerDocuments[number]; asset: typeof hammerAssets[number] }) {
  if (["script-versions", "script-diff", "script-breakdown"].includes(view)) return `/scripts/${context.document.id}`;
  if (view === "script-detail") return "/scripts";
  if (view === "collections") return "/dashboard";
  if (["project-documents", "project-assets"].includes(view)) return `/projects/${context.project.id}`;
  if (view === "project-detail") return "/projects";
  if (view === "asset-detail") return "/assets";
  if (view === "project-new") return "/admin/users";
  return null;
}

function scopedProjectTitle(view: HammerView, activeProject: HammerProject) {
  if (["assets", "reviews"].includes(view)) return activeProject.title;
  return null;
}
