"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpDown, CheckCircle2, Download, FileDiff, FileText, Gauge, ImagePlus, MessageSquare, PackageCheck, Pencil, Plus, Search, ShieldCheck, Trash2, UploadCloud, UsersRound, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, MetricCard, Panel, SectionHeader } from "@/components/ui";
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
  type TaskPriority,
  type TaskStatus,
  type HammerApproval,
  type HammerProjectStatus,
  type HammerProject,
  type HammerProjectLead,
  type HammerUser,
  type HammerAsset,
  type HammerDocument,
  type HammerDocumentVersion,
  type HammerComment,
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
  type ContactRelationshipType
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

type HammerView = "dashboard" | "projects" | "prospects" | "collections" | "project-new" | "project-detail" | "project-documents" | "project-assets" | "scripts" | "script-detail" | "script-versions" | "script-diff" | "script-breakdown" | "assets" | "asset-detail" | "tasks" | "contacts" | "reviews" | "reports" | "executive" | "admin-users" | "account";
type ScriptLibrarySection = "inbox" | "projects" | "all";
type AppRole = "admin" | "executive" | "producer" | "department_lead";

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

function toSessionUser(user: HammerUser): SessionUser {
  return {
    email: user.email,
    name: user.name,
    appRole: user.role
  };
}

export function HammerOS({ view, id, selectedTaskId, scriptSection }: { view: HammerView; id?: string; selectedTaskId?: string; scriptSection?: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState(hammerProjects);
  const [localProjects, setLocalProjects] = useState<HammerProject[]>([]);
  const [workspaceMode, setWorkspaceMode] = useState<"demo" | "database">("demo");
  const [workspaceUsers, setWorkspaceUsers] = useState<HammerUser[]>([]);
  const [workspaceAssets, setWorkspaceAssets] = useState<HammerAsset[]>([]);
  const [workspaceContacts, setWorkspaceContacts] = useState<HammerContact[]>([]);
  const [workspaceContactRelationships, setWorkspaceContactRelationships] = useState<HammerContactRelationship[]>([]);
  const [workspaceApprovals, setWorkspaceApprovals] = useState<HammerApproval[]>([]);
  const [workspaceComments, setWorkspaceComments] = useState<HammerComment[]>([]);
  const [workspaceScriptCollections, setWorkspaceScriptCollections] = useState<HammerScriptCollection[]>([]);
  const [workspaceScriptCollectionItems, setWorkspaceScriptCollectionItems] = useState<HammerScriptCollectionItem[]>([]);
  const [workspaceSlateCollections, setWorkspaceSlateCollections] = useState<HammerSlateCollection[]>([]);
  const [workspaceSlateCollectionItems, setWorkspaceSlateCollectionItems] = useState<HammerSlateCollectionItem[]>([]);
  const [workspaceProspectAssets, setWorkspaceProspectAssets] = useState<ProspectAsset[]>([]);
  const [projectLeads, setProjectLeads] = useState<HammerProjectLead[]>([]);
  const [query, setQuery] = useState("");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState(hammerProjects[0]?.id ?? "");
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
  const [localScriptCollections, setLocalScriptCollections] = useState<HammerScriptCollection[]>([]);
  const [localScriptCollectionItems, setLocalScriptCollectionItems] = useState<HammerScriptCollectionItem[]>([]);
  const [localSlateCollections, setLocalSlateCollections] = useState<HammerSlateCollection[]>([]);
  const [localSlateCollectionItems, setLocalSlateCollectionItems] = useState<HammerSlateCollectionItem[]>([]);
  const [localProspectAssets, setLocalProspectAssets] = useState<ProspectAsset[]>([]);
  const [localTasks, setLocalTasks] = useState<HammerTask[]>([]);
  const [taskUpdates, setTaskUpdates] = useState<Record<string, TaskPatch>>({});
  const documents = useMemo(() => (workspaceMode === "database" ? localDocuments : [...hammerDocuments, ...localDocuments]).filter(isValidDocument).map((document) => (
    Object.prototype.hasOwnProperty.call(documentProjectOverrides, document.id)
      ? { ...document, projectId: documentProjectOverrides[document.id] ?? undefined }
      : document
  )), [documentProjectOverrides, localDocuments, workspaceMode]);
  const versions = useMemo(() => (workspaceMode === "database" ? localVersions : [...hammerVersions, ...localVersions]).filter(isValidVersion).map((version) => ({ ...version, ...(versionStatuses[version.id] ? { status: versionStatuses[version.id] } : {}), ...(Object.prototype.hasOwnProperty.call(versionNotes, version.id) ? { notes: versionNotes[version.id] } : {}), ...(Object.prototype.hasOwnProperty.call(versionMarkdownNotes, version.id) ? { markdownNotes: versionMarkdownNotes[version.id] } : {}) })), [localVersions, versionMarkdownNotes, versionNotes, versionStatuses, workspaceMode]);
  const tasks = useMemo(() => (workspaceMode === "database" ? localTasks : [...localTasks, ...hammerTasks]).filter(isValidTask).map((task) => ({ ...task, ...taskUpdates[task.id] })), [localTasks, taskUpdates, workspaceMode]);
  const users = (workspaceMode === "database" && workspaceUsers.length ? workspaceUsers : hammerUsers).filter(isValidUser);
  const assets = (workspaceMode === "database" ? workspaceAssets : hammerAssets).filter(isValidAsset);
  const contacts = workspaceMode === "database" ? workspaceContacts : hammerContacts;
  const contactRelationships = workspaceMode === "database" ? workspaceContactRelationships : [...hammerContactRelationships, ...localContactRelationships];
  const approvals = workspaceMode === "database" ? workspaceApprovals : hammerApprovals;
  const comments = workspaceMode === "database" ? workspaceComments : [...hammerComments, ...localComments];
  const scriptCollections = workspaceMode === "database" ? workspaceScriptCollections : [...hammerScriptCollections, ...localScriptCollections];
  const scriptCollectionItems = workspaceMode === "database" ? workspaceScriptCollectionItems : [...hammerScriptCollectionItems, ...localScriptCollectionItems];
  const slateCollections = workspaceMode === "database" ? workspaceSlateCollections : [...hammerSlateCollections, ...localSlateCollections];
  const slateCollectionItems = workspaceMode === "database" ? workspaceSlateCollectionItems : [...hammerSlateCollectionItems, ...localSlateCollectionItems];
  const prospectAssets = workspaceMode === "database" ? workspaceProspectAssets : localProspectAssets;
  const project = projects.find((item) => item.id === id) ?? projects[0] ?? emptyProject;
  const document = documents.find((item) => item.id === id) ?? documents[0] ?? emptyDocument;
  const asset = assets.find((item) => item.id === id) ?? assets[0] ?? hammerAssets[0];
  const activeProject = projects.find((item) => item.id === activeProjectId) ?? projects[0] ?? emptyProject;
  const filteredProjects = projects.filter(isValidProject).filter((item) => `${item.title} ${item.logline} ${item.genre} ${item.status} ${item.type}`.toLowerCase().includes(query.toLowerCase()));
  const currentUser = users.find((user) => user.email.toLowerCase() === sessionUser?.email?.toLowerCase()) ?? hammerUserByEmail(sessionUser?.email);

  async function loadDatabaseWorkspace() {
    const response = await fetch("/api/hammer/workspace", { cache: "no-store" });
    if (!response.ok) throw new Error("Workspace load failed.");
    const data = await response.json() as HammerWorkspacePayload;
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
    await loadDatabaseWorkspace();
    return data;
  }

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await response.json();
        const mode = data.mode === "database" ? "database" : "demo";
        setWorkspaceMode(mode);
        const storedDemoEmail = data.mode === "database" ? null : window.localStorage.getItem(HAMMER_DEMO_USER_STORAGE_KEY);
        const storedDemoUser = hammerUsers.find((item) => item.email === storedDemoEmail);
        setSessionUser(storedDemoUser ? toSessionUser(storedDemoUser) : data.user ?? data.demoUser ?? null);
        if (mode === "database") await loadDatabaseWorkspace();
        setWorkspaceLoaded(true);
      } catch {
        setWorkspaceMode("demo");
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
      if (storedScriptCollections) setLocalScriptCollections(JSON.parse(storedScriptCollections) as HammerScriptCollection[]);
      if (storedScriptCollectionItems) setLocalScriptCollectionItems(JSON.parse(storedScriptCollectionItems) as HammerScriptCollectionItem[]);
      if (storedSlateCollections) setLocalSlateCollections(JSON.parse(storedSlateCollections) as HammerSlateCollection[]);
      if (storedSlateCollectionItems) setLocalSlateCollectionItems(JSON.parse(storedSlateCollectionItems) as HammerSlateCollectionItem[]);
      if (storedProspectAssets) setLocalProspectAssets(JSON.parse(storedProspectAssets) as ProspectAsset[]);
      if (storedTasks) setLocalTasks(JSON.parse(storedTasks) as HammerTask[]);
      if (storedTaskUpdates) setTaskUpdates(JSON.parse(storedTaskUpdates) as Record<string, Partial<Pick<HammerTask, "priority" | "status">>>);
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
    const extractedText = await extractTextFromUpload(input.file);
    const dataUrl = await fileToDataUrl(input.file);
    if (workspaceMode === "database") {
      await runWorkspaceAction("uploadDocumentVersion", {
        projectId: input.projectId,
        documentId: input.documentId,
        title: input.title,
        type: input.type,
        writerName: input.writerName,
        source: input.source,
        fileName: input.file.name,
        fileType: input.file.type || inferFileType(input.file.name),
        fileSize: input.file.size,
        storagePath: `local://${input.projectId ?? "inbox"}/documents/${input.documentId ?? "new"}/versions/${Date.now()}/${input.file.name}`,
        notes: input.notes,
        dataUrl,
        extractedText
      });
      return;
    }
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
      notes: input.notes || `Uploaded ${input.file.name}.`,
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

  async function createComment(input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string }) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("createComment", input);
      return;
    }
    const nextComment: HammerComment = {
      id: `comment-local-${Date.now()}`,
      targetType: input.targetType,
      targetId: input.targetId,
      body: input.body,
      visibility: input.visibility ?? "PROJECT_TEAM",
      status: "OPEN",
      createdById: currentUser.id,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    setLocalComments((current) => {
      const next = [nextComment, ...current];
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
    const exists = slateCollectionItems.some((item) => item.collectionId === collectionId && item.itemType === itemType && (itemType === "PROJECT" ? item.projectId === itemId : item.prospectId === itemId));
    if (exists) return;
    const nextItem: HammerSlateCollectionItem = {
      id: `slate-collection-item-local-${Date.now()}`,
      collectionId,
      itemType,
      projectId: itemType === "PROJECT" ? itemId : undefined,
      prospectId: itemType === "PROSPECT" ? itemId : undefined,
      sortOrder: slateCollectionItems.filter((item) => item.collectionId === collectionId).length + 1,
      notes: notes?.trim() || undefined,
      addedAt: new Date().toISOString().slice(0, 10)
    };
    setLocalSlateCollectionItems((current) => {
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
      targetType: input.targetType,
      targetId: input.targetId || input.projectId || ""
    };
    const nextTasks = [nextTask, ...localTasks];
    setLocalTasks(nextTasks);
    window.localStorage.setItem(HAMMER_LOCAL_TASKS_STORAGE_KEY, JSON.stringify(nextTasks));
    window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_TASKS_EVENT));
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
  const isWorkspaceInitializing = !sessionLoaded || !workspaceLoaded;

  if (isWorkspaceInitializing) {
    return (
      <AppShell>
        <div className="grid min-h-[50vh] place-items-center">
          <Panel className="w-full max-w-xl">
            <SectionHeader eyebrow="GreenLight" title="Loading workspace" />
            <p className="text-[13px] leading-6 text-studio-300">Connecting to the production database and preparing your workspace.</p>
          </Panel>
        </div>
      </AppShell>
    );
  }

  const content = (() => {
    if (scriptAccessLoading) {
      return <Panel><EmptyState label="Checking script access..." /></Panel>;
    }
    if (scriptAccessDenied) {
      return <AccessDenied title="Script access required" detail="You can only open scripts attached to Development Slate items you can access. Producers, executives, and admins can review broader prospect materials from the slate." />;
    }
    if (view === "dashboard") return <Dashboard currentUser={currentUser} projects={projects} documents={documents} versions={versions} approvals={approvals} />;
    if (view === "projects") return <Projects mode="development" projects={filteredProjects} projectLeads={projectLeads} prospectAssets={prospectAssets} users={users} tasks={tasks} currentUser={currentUser} canCreateProject={canManageScriptLibrary(currentUser.role)} onCreateProject={addProject} onUpdateLead={updateProjectLead} onCreateLead={createProjectLead} onImportLeads={importProjectLeads} onPromoteLead={promoteProjectLead} onCreateTask={createTask} onUploadProspectAsset={uploadProspectAsset} onDeleteProspectAsset={deleteProspectAsset} />;
    if (view === "prospects") return <Projects mode="prospects" projects={filteredProjects} projectLeads={projectLeads} prospectAssets={prospectAssets} users={users} tasks={tasks} currentUser={currentUser} canCreateProject={canManageScriptLibrary(currentUser.role)} onCreateProject={addProject} onUpdateLead={updateProjectLead} onCreateLead={createProjectLead} onImportLeads={importProjectLeads} onPromoteLead={promoteProjectLead} onCreateTask={createTask} onUploadProspectAsset={uploadProspectAsset} onDeleteProspectAsset={deleteProspectAsset} />;
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
        onCreateScriptCollection={createScriptCollection}
        onAddDocument={addDocumentToCollection}
        onRemoveDocument={removeDocumentFromCollection}
      />
    );
    if (view === "project-new") {
      if (!canManageScriptLibrary(currentUser.role)) return <AccessDenied title="Project creation access required" detail="Only admins, producers, and executives can create new projects." />;
      return <ProjectEditor users={users} currentUser={currentUser} onCreate={addProject} />;
    }
    if (["project-detail", "project-documents", "project-assets"].includes(view) && !projects.length) return <EmptyWorkspaceState />;
    if (view === "project-detail") return <ProjectWorkspace project={project} activeTab="overview" currentUser={currentUser} users={users} projects={projects} tasks={tasks} documents={documents} versions={versions} supportingDocuments={supportingDocuments} referenceImages={localReferenceImages} assets={assets} approvals={approvals} onUpdateProject={canManageScriptLibrary(currentUser.role) ? updateProject : undefined} onUpload={uploadDocumentVersion} onDelete={deleteUploadedDocument} onAssignToProject={assignDocumentToProject} onReferenceUpload={uploadReferenceImage} onCreateTask={createTask} />;
    if (view === "project-documents") return <ProjectWorkspace project={project} activeTab="documents" currentUser={currentUser} users={users} projects={projects} tasks={tasks} documents={documents} versions={versions} supportingDocuments={supportingDocuments} referenceImages={localReferenceImages} assets={assets} approvals={approvals} onUpdateProject={canManageScriptLibrary(currentUser.role) ? updateProject : undefined} onUpload={uploadDocumentVersion} onDelete={deleteUploadedDocument} onAssignToProject={assignDocumentToProject} onReferenceUpload={uploadReferenceImage} onCreateTask={createTask} />;
    if (view === "project-assets") return <ProjectWorkspace project={project} activeTab="assets" currentUser={currentUser} users={users} projects={projects} tasks={tasks} documents={documents} versions={versions} supportingDocuments={supportingDocuments} referenceImages={localReferenceImages} assets={assets} approvals={approvals} onUpdateProject={canManageScriptLibrary(currentUser.role) ? updateProject : undefined} onReferenceUpload={uploadReferenceImage} onCreateTask={createTask} />;
    if (view === "scripts") return <LegacyRedirect title="Scripts now live inside the slate" detail="Script tracking is most useful in context. Open a Development Slate item for active project scripts and supporting documents, or use Prospects for materials the team may want to pursue." href="/projects" label="Open Development Slate" />;
    if (["script-detail", "script-versions", "script-diff", "script-breakdown"].includes(view) && !documents.some((item) => item.id === document.id)) return <EmptyScriptState />;
    if (view === "script-detail") return <ScriptDetail documentId={document.id} documents={documents} versions={versions} comments={comments} currentUser={currentUser} supportingDocuments={supportingDocuments} onUpload={uploadDocumentVersion} onSupportingUpload={uploadSupportingDocument} onSupportingDelete={deleteSupportingDocument} onStatusChange={updateDocumentStatus} onUpdateVersionNotes={canManageScriptLibrary(currentUser.role) ? updateDocumentVersionNotes : undefined} onUpdateVersionMarkdown={canAccessScriptDocument(currentUser, document) ? updateDocumentVersionMarkdown : undefined} onCreateComment={createComment} onUpdateMetadata={canAccessScriptDocument(currentUser, document) ? updateDocumentMetadata : undefined} onDelete={deleteUploadedDocument} />;
    if (view === "script-versions") return <ScriptVersions documentId={document.id} versions={versions} document={document} currentUser={currentUser} onUpload={uploadDocumentVersion} />;
    if (view === "script-diff") return <ScriptDiff documentId={document.id} versions={versions} />;
    if (view === "script-breakdown") return <ScriptBreakdown documentId={document.id} documents={documents} versions={versions} />;
    if (view === "assets") return <Assets projectId={projects.length ? activeProject.id : ""} assets={assets} currentUser={currentUser} />;
    if (view === "asset-detail") return <AssetDetail assetId={asset.id} assets={assets} currentUser={currentUser} />;
    if (view === "tasks") return <Tasks selectedTaskId={selectedTaskId} currentUser={currentUser} users={users} tasks={tasks} projects={projects} onCreateTask={createTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} />;
    if (view === "contacts") {
      if (!canViewContacts(currentUser.role)) return <AccessDenied title="Contacts access required" detail="Only admins, producers, and executives can view the studio contact directory." />;
      return <Contacts initialContacts={contacts} contactRelationships={contactRelationships} currentUser={currentUser} users={users} projects={projects} documents={documents} tasks={tasks} databaseMode={workspaceMode === "database"} onDatabaseImport={(importedContacts) => runWorkspaceAction("importContacts", { contacts: importedContacts })} onCreateContact={createContact} onUpdateContact={updateContact} onDeleteContact={deleteContact} onCreateRelationship={createContactRelationship} onDeleteRelationship={deleteContactRelationship} />;
    }
    if (view === "reports") {
      if (!canViewReports(currentUser.role)) return <AccessDenied title="Reports access required" detail="Only admins, producers, and executives can generate executive email reports." />;
      return <Reports projects={projects} prospects={projectLeads} documents={documents} versions={versions} supportingDocuments={supportingDocuments} tasks={tasks} assets={assets} approvals={approvals} comments={comments} users={users} currentUser={currentUser} />;
    }
    if (view === "account") return <AccountSettings user={sessionUser} onUpdateAccount={updateAccount} />;
    if (view === "reviews") return <LegacyRedirect title="Reviews are folded into the slate" detail="Review work now starts from the relevant Development Slate item or Prospect, so the queue is easier to follow in context." href="/projects" label="Open Development Slate" />;
    if (view === "executive") {
      if (currentUser.role !== "EXECUTIVE" && currentUser.role !== "ADMIN") return <AccessDenied title="Executive access required" detail="The executive dashboard is limited to users with the Executive role." />;
      return <Executive projects={projects} documents={documents} versions={versions} tasks={tasks} assets={assets} approvals={approvals} />;
    }
    if (currentUser.role !== "ADMIN") return <AccessDenied title="Admin access required" detail="Only admins can manage projects, users, roles, and project access." />;
    return <AdminUsers projects={projects} users={users} currentUser={currentUser} databaseMode={workspaceMode === "database"} onCreateProject={addProject} onDeleteProject={deleteProject} onCreateUser={createUser} onUpdateUserRole={updateUserRole} onDeleteUser={deleteUser} onStatusChange={updateProjectStatus} />;
  })();

  function updateProjectStatus(projectId: string, status: HammerProjectStatus) {
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
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <PageBreadcrumbs view={view} project={project} document={document} asset={asset} accessDenied={scriptAccessDenied} />
          <h1 className="mt-1 text-xl font-semibold text-studio-100 md:text-2xl">{scriptAccessDenied ? "Script Access Required" : titleForView(view, { project, document, asset })}</h1>
          {scopedProjectTitle(view, activeProject) ? <p className="mt-1 text-xs text-studio-400">Showing {scopedProjectTitle(view, activeProject)} only</p> : null}
        </div>
        <div className="relative w-full lg:w-[320px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-studio-400" />
          <input className="field pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
        </div>
      </div>
      {content}
    </AppShell>
  );
}

function Dashboard({
  currentUser,
  projects,
  documents,
  versions,
  approvals = hammerApprovals
}: {
  currentUser: ReturnType<typeof hammerUserByEmail>;
  projects: HammerProject[];
  documents: HammerDocument[];
  versions: HammerDocumentVersion[];
  approvals?: HammerApproval[];
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

  return (
    <div className="space-y-4">
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

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionHeader eyebrow="Queue" title="Scripts Awaiting Review" />
          <div className="space-y-2">
            {reviewItems.length ? reviewItems.slice(0, 4).map((item) => (
              <Link key={item.approval.id} href={`/scripts/${item.document.id}`} className="block rounded-md border border-white/10 bg-white/[0.03] p-3 transition hover:border-amberline/35">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-studio-100">{item.document.title}</p>
                    <p className="mt-1 text-xs text-studio-400">{item.document.writerName ?? "Unassigned writer"} / v{item.version.versionNumber} / requested by {userName(item.approval.requestedById)}</p>
                  </div>
                  <Badge value={item.version.status} />
                </div>
              </Link>
            )) : <EmptyState label="No scripts are waiting on review." />}
          </div>
        </Panel>

        <Panel>
          <SectionHeader eyebrow="Intake" title="Recently Received" action={<TableLink href="/prospects">Open Prospects</TableLink>} />
          <div className="space-y-2">
            {recentScripts.length ? recentScripts.map((document) => {
              const version = currentVersionFor(document.id, documents, versions);
              return (
                <Link key={document.id} href={`/scripts/${document.id}`} className="block rounded-md border border-white/10 bg-white/[0.03] p-3 transition hover:border-amberline/35">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-semibold text-studio-100">{document.title}</p>
                      <p className="mt-1 text-xs text-studio-400">{document.projectId ? projectTitleFromList(document.projectId, projects) : "Incoming"} / {document.updatedAt}</p>
                    </div>
                    <Badge value={version?.status ?? "RECEIVED"} />
                  </div>
                </Link>
              );
            }) : <EmptyState label="No scripts available yet." />}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Projects({
  mode = "development",
  projects,
  projectLeads,
  prospectAssets = [],
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
  onDeleteProspectAsset
}: {
  mode?: "development" | "prospects";
  projects: HammerProject[];
  projectLeads: HammerProjectLead[];
  prospectAssets?: ProspectAsset[];
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
}) {
  const section = mode === "prospects" ? "slate" : "active";
  const [slateSearch, setSlateSearch] = useState("");
  const [filters, setFilters] = useState({ lane: "ALL", genre: "ALL", urgency: "ALL", rights: "ALL", nextAction: "ALL", owner: "ALL", scriptStatus: "ALL", format: "ALL" });
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedLeadTitle, setSelectedLeadTitle] = useState("");
  const [leadDraft, setLeadDraft] = useState<Partial<HammerProjectLead>>({});
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [addSlateOpen, setAddSlateOpen] = useState(false);
  const [slatePage, setSlatePage] = useState(1);
  const [slateImportMessage, setSlateImportMessage] = useState("");
  const [prospectSort, setProspectSort] = useState<{ key: ProspectSortKey; direction: "asc" | "desc" }>({ key: "title", direction: "asc" });
  const filteredLeads = projectLeads.filter((lead) => {
    const matchesSearch = `${lead.title} ${lead.logline ?? ""} ${lead.creator ?? ""} ${lead.genre ?? ""} ${lead.lane ?? ""} ${lead.notes ?? ""} ${lead.searchKeywords ?? ""} ${lead.contactRep ?? ""}`.toLowerCase().includes(slateSearch.toLowerCase());
    return matchesSearch
      && matchesFilter(filters.lane, lead.lane)
      && matchesFilter(filters.genre, lead.genre)
      && matchesFilter(filters.urgency, lead.urgencyLabel)
      && matchesFilter(filters.rights, lead.rightsStatus)
      && matchesFilter(filters.nextAction, lead.nextActionStatus)
      && matchesOwnerFilter(filters.owner, lead)
      && matchesFilter(filters.scriptStatus, lead.scriptStatus)
      && matchesFilter(filters.format, lead.format);
  });
  const slateStats = {
    total: projectLeads.length,
    urgent: projectLeads.filter((lead) => lead.urgencyLabel === "Urgent").length,
    picks: projectLeads.filter((lead) => lead.myPicks).length,
    promoted: projectLeads.filter((lead) => lead.promotedProjectId).length
  };
  const slatePageSize = 100;
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
      ?? projectLeads.find((lead) => lead.id === selectedLeadId && lead.title === selectedLeadTitle)
      ?? projectLeads.find((lead) => lead.id === selectedLeadId)
    : undefined;
  const selectedLeadAssets = selectedLead ? prospectAssets.filter((asset) => asset.prospectId === selectedLead.id) : [];

  useEffect(() => {
    if (!selectedLead) return;
    setLeadDraft(selectedLead);
  }, [selectedLead]);

  useEffect(() => {
    setSlatePage(1);
  }, [filters.format, filters.genre, filters.lane, filters.nextAction, filters.owner, filters.rights, filters.scriptStatus, filters.urgency, slateSearch]);

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
      setSlateImportMessage(`Processed ${parsed.length} prospect row${parsed.length === 1 ? "" : "s"}. Existing IDs were ignored.`);
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

  return (
    <div className="space-y-4">
      <Panel>
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
          <div className="space-y-4">
            <Panel className="min-h-0">
              <div className="grid gap-2 md:grid-cols-4">
                <MetricCard label="Prospects" value={`${slateStats.total}`} sub="Materials we might be interested in" />
                <MetricCard label="Urgent" value={`${slateStats.urgent}`} sub="Needs attention" />
                <MetricCard label="My Picks" value={`${slateStats.picks}`} sub="Producer marked" />
                <MetricCard label="Promoted" value={`${slateStats.promoted}`} sub="Now in development" />
              </div>
            </Panel>
            <Panel>
              <div className="mb-3 grid gap-2 lg:grid-cols-[1fr_repeat(4,150px)]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-studio-400" />
                  <input className="field pl-8" value={slateSearch} onChange={(event) => setSlateSearch(event.target.value)} placeholder="Search title, creator, logline, vendor, contact, notes" />
                </div>
                <SlateFilter label="Lane" value={filters.lane} options={uniqueLeadOptions(projectLeads, "lane")} onChange={(value) => setFilter("lane", value)} />
                <SlateFilter label="Genre" value={filters.genre} options={uniqueLeadOptions(projectLeads, "genre")} onChange={(value) => setFilter("genre", value)} />
                <SlateFilter label="Rights" value={filters.rights} options={uniqueLeadOptions(projectLeads, "rightsStatus")} onChange={(value) => setFilter("rights", value)} />
                <ProspectOwnerFilter label="Owner" value={filters.owner} users={users} leads={projectLeads} onChange={(value) => setFilter("owner", value)} />
              </div>
              <div className="mb-3 grid gap-2 md:grid-cols-4">
                <SlateFilter label="Urgency" value={filters.urgency} options={uniqueLeadOptions(projectLeads, "urgencyLabel")} onChange={(value) => setFilter("urgency", value)} />
                <SlateFilter label="Action Status" value={filters.nextAction} options={uniqueLeadOptions(projectLeads, "nextActionStatus")} onChange={(value) => setFilter("nextAction", value)} />
                <SlateFilter label="Script Status" value={filters.scriptStatus} options={uniqueLeadOptions(projectLeads, "scriptStatus")} onChange={(value) => setFilter("scriptStatus", value)} />
                <SlateFilter label="Format" value={filters.format} options={uniqueLeadOptions(projectLeads, "format")} onChange={(value) => setFilter("format", value)} />
              </div>
              <div className="mb-2 flex items-center justify-between text-xs text-studio-400">
                <span>{filteredLeads.length} of {projectLeads.length} prospects</span>
                <button type="button" className="font-semibold text-amberline" onClick={() => { setSlateSearch(""); setFilters({ lane: "ALL", genre: "ALL", urgency: "ALL", rights: "ALL", nextAction: "ALL", owner: "ALL", scriptStatus: "ALL", format: "ALL" }); }}>Clear filters</button>
              </div>
              {slateImportMessage ? <p className="mb-2 text-xs text-studio-300">{slateImportMessage}</p> : null}
              <div className="data-scroll data-scroll-slate">
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
                      <tr key={`${lead.id}-${lead.title}`} onClick={() => { setSelectedLeadId(lead.id); setSelectedLeadTitle(lead.title); }} className={cn("cursor-pointer text-studio-200 hover:bg-white/[0.035]", selectedLeadId === lead.id && selectedLeadTitle === lead.title && "bg-emerald-400/10")}>
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
                <div className="mt-3 flex flex-col gap-2 text-xs text-studio-400 md:flex-row md:items-center md:justify-between">
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
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-studio-950/75 px-4 py-8 backdrop-blur-sm" onMouseDown={() => { setSelectedLeadId(""); setSelectedLeadTitle(""); }}>
              <div className="w-full max-w-5xl" onMouseDown={(event) => event.stopPropagation()}>
                <SlateLeadPanel
                  lead={selectedLead}
                  draft={leadDraft}
                  projects={projects}
                  users={users}
                  currentUser={currentUser}
                  tasks={tasks}
                  onDraftChange={setLeadDraft}
                  onSave={saveLead}
                  onPromote={onPromoteLead}
                  onCreateTask={onCreateTask}
                  assets={selectedLeadAssets}
                  canManageAssets={canManageScriptLibrary(currentUser.role)}
                  onUploadAsset={onUploadProspectAsset}
                  onDeleteAsset={onDeleteProspectAsset}
                  onClose={() => { setSelectedLeadId(""); setSelectedLeadTitle(""); }}
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-studio-950/75 px-4 py-8 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-4xl rounded-lg border border-white/10 bg-studio-950 p-4 shadow-2xl">
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
        <label className="mt-3 grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Notes</span>
          <textarea className="field min-h-24" value={draft.notes ?? ""} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
        </label>
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
  assets = [],
  canManageAssets = false,
  onDraftChange,
  onSave,
  onPromote,
  onCreateTask,
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
  assets?: ProspectAsset[];
  canManageAssets?: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<Partial<HammerProjectLead>>>;
  onSave: () => Promise<void>;
  onPromote?: (leadId: string) => Promise<void>;
  onCreateTask?: (input: { projectId?: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => void;
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
    <Panel className="max-h-[calc(100vh-4rem)] overflow-y-auto shadow-2xl">
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
          <PrimaryButton icon={CheckCircle2} label={saving ? "Saving" : "Save"} onClick={savePanel} />
          {promotedProject ? <TableLink href={`/projects/${promotedProject.id}`}>Open Development Slate</TableLink> : <button type="button" onClick={() => onPromote?.(lead.id)} className="rounded-md bg-amberline px-2.5 py-1.5 text-xs font-semibold text-studio-950">Promote</button>}
          {onClose ? (
            <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close slate details">
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
            <p className="mt-1 text-[13px] leading-5 text-studio-300">Scripts, PDFs, source links, and status tracking for this prospect.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lead.scriptPdf ? <TableLink href={lead.scriptPdf}>Script PDF</TableLink> : null}
            {lead.sourceLink ? <TableLink href={lead.sourceLink}>Source Link</TableLink> : null}
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <SmallStat label="Script Status" value={lead.scriptStatus || "-"} />
          <SmallStat label="Format" value={lead.format || lead.adaptationFormat || "-"} />
          <SmallStat label="Rights" value={lead.rightsStatus || "-"} />
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
      <label className="mt-3 grid gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Notes</span>
        <textarea className="field min-h-24" value={draft.notes ?? ""} onChange={(event) => onDraftChange((current) => ({ ...current, notes: event.target.value }))} />
      </label>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <SmallStat label="Priority" value={`${lead.priorityScore ?? "-"}`} />
        <SmallStat label="Votes" value={`${lead.votes ?? "-"}`} />
        <SmallStat label="Year Written" value={lead.yearWritten || "-"} />
        <SmallStat label="Source" value={lead.sourceLink ? "Available" : "Missing"} />
      </div>
      <div className="mt-4 flex justify-end">
        <PrimaryButton icon={CheckCircle2} label={saving ? "Saving Slate Item" : "Save Slate Item"} onClick={savePanel} />
      </div>
    </Panel>
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
        title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
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
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input className="field file:mr-3 file:rounded file:border-0 file:bg-amberline file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-studio-950" type="file" accept=".pdf,.doc,.docx,.txt,.md,image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
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
      <form onSubmit={submit} className="my-6 w-full max-w-3xl rounded-lg border border-white/10 bg-studio-950 p-4 shadow-glow">
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
  onUpload?: (input: DocumentUploadInput) => Promise<void>;
  onDelete?: (documentId: string) => void;
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
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
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
          <div className="space-y-4">
            <CommentsPanel targetId={project.id} />
          </div>
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
      <input
        key={status === "Added." ? "cleared" : "ready"}
        className="block w-full text-xs text-studio-300 file:mr-3 file:rounded file:border-0 file:bg-studio-100 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-studio-950"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
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
  onUpload?: (input: DocumentUploadInput) => Promise<void>;
  onDelete?: (documentId: string) => void;
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
    const haystack = `${doc.title} ${doc.writerName ?? ""} ${doc.source ?? ""} ${doc.projectId ? projectNameForId(doc.projectId) : "Inbox"} ${version?.status ?? ""}`.toLowerCase();
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
          action={onUpload ? <PrimaryButton icon={UploadCloud} label="Upload PDF/DOCX" onClick={() => setUploadOpen((open) => !open)} /> : undefined}
        />
        {uploadOpen && onUpload ? <DocumentUploadPanel projectId={scopedProjectId} documents={docs} onUpload={onUpload} onDone={() => setUploadOpen(false)} /> : null}
        <DocumentRows docs={docs} versions={versions} projects={projects} omitProject={Boolean(projectId)} onDelete={onDelete} onAssignToProject={canManageLibrary ? onAssignToProject : undefined} assignableProjects={projects} defaultProjectId={scopedProjectId} emptyLabel={projectName ? `No documents for ${projectName} yet. Upload a script, treatment, outline, or coverage document.` : "No documents match this view."} />
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
              {canManageLibrary ? <button type="button" onClick={() => { setUploadTarget("INBOX"); setUploadOpen((open) => uploadTarget === "INBOX" ? !open : true); }} className="inline-flex items-center gap-1.5 rounded-md bg-amberline px-2.5 py-1.5 text-xs font-semibold text-studio-950 transition hover:bg-emerald-300"><UploadCloud className="h-3.5 w-3.5" />Incoming</button> : null}
              <button type="button" onClick={() => { setUploadTarget("ACTIVE"); setUploadOpen((open) => uploadTarget === "ACTIVE" ? !open : true); }} className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition", canManageLibrary ? "border border-white/10 bg-white/[0.025] text-studio-200 hover:border-amberline/40 hover:text-amberline" : "bg-amberline text-studio-950 hover:bg-emerald-300")}><UploadCloud className="h-3.5 w-3.5" />To Project</button>
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
          <div className="mt-3">
            <DocumentUploadPanel
              projectId={uploadTarget === "INBOX" ? undefined : scopedProjectId}
              documents={uploadTarget === "INBOX" ? incomingDocs : activeProjectDocs}
              onUpload={onUpload}
              onDone={() => setUploadOpen(false)}
            />
          </div>
        ) : null}
      </Panel>

      {effectiveSection === "inbox" && canManageLibrary ? (
        <ScriptLibraryPanel title="Incoming Scripts" eyebrow="Triage" count={incomingDocs.length} description="Unassigned submissions and specs that have not been attached to a project yet.">
          <DocumentRows docs={incomingDocs} versions={versions} projects={projects} showInboxMeta onDelete={onDelete} onAssignToProject={onAssignToProject} assignableProjects={projects} defaultProjectId={scopedProjectId} emptyLabel="No incoming scripts match these filters." />
        </ScriptLibraryPanel>
      ) : null}

      {effectiveSection === "inbox" && !canManageLibrary ? (
        <ScriptLibraryPanel title="Active Project Scripts" eyebrow="Assigned Access" count={projectDocs.length} description="Incoming submissions are limited to producers, executives, and admins. Your scripts are grouped by the projects you can access.">
          <GroupedProjectDocuments groups={groupedProjectDocs} versions={versions} projects={projects} canManageLibrary={canManageLibrary} onDelete={onDelete} />
        </ScriptLibraryPanel>
      ) : null}

      {effectiveSection === "projects" ? (
        <ScriptLibraryPanel title="Active Project Scripts" eyebrow="By Project" count={projectDocs.length} description="Scripts, treatments, outlines, notes, decks, and coverage grouped by project so the library is not dependent on the top project switcher.">
          <GroupedProjectDocuments groups={groupedProjectDocs} versions={versions} projects={projects} canManageLibrary={canManageLibrary} onDelete={onDelete} onAssignToProject={canManageLibrary ? onAssignToProject : undefined} />
        </ScriptLibraryPanel>
      ) : null}

      {effectiveSection === "all" ? (
        <ScriptLibraryPanel title="Library" eyebrow="Manager View" count={allDocs.length} description={canManageLibrary ? "A complete manager view across incoming submissions and active project documents." : "Everything you can access across your assigned projects."}>
          <DocumentRows docs={allDocs} versions={versions} projects={projects} showInboxMeta={canManageLibrary} onDelete={onDelete} onAssignToProject={canManageLibrary ? onAssignToProject : undefined} assignableProjects={projects} defaultProjectId={scopedProjectId} emptyLabel="No scripts match these filters." />
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
  canManageLibrary,
  onDelete,
  onAssignToProject
}: {
  groups: Array<{ project: HammerProject; docs: HammerDocument[] }>;
  versions: HammerDocumentVersion[];
  projects: HammerProject[];
  canManageLibrary: boolean;
  onDelete?: (documentId: string) => void;
  onAssignToProject?: (documentId: string, projectId: string) => void;
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
          <DocumentRows docs={group.docs} versions={versions} projects={projects} omitProject showInboxMeta={canManageLibrary} onDelete={onDelete} onAssignToProject={onAssignToProject} assignableProjects={projects} defaultProjectId={group.project.id} emptyLabel={`No scripts for ${group.project.title} match these filters.`} />
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
  onDone
}: {
  projectId?: string;
  documents: HammerDocument[];
  onUpload: (input: DocumentUploadInput) => Promise<void>;
  onDone: () => void;
}) {
  const [documentId, setDocumentId] = useState("");
  const [title, setTitle] = useState("");
  const [writerName, setWriterName] = useState("");
  const [source, setSource] = useState("");
  const [type, setType] = useState<DocumentType>("SCRIPT");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const selectedDocument = documents.find((document) => document.id === documentId);

  useEffect(() => {
    if (selectedDocument) {
      setTitle(selectedDocument.title);
      setType(selectedDocument.type);
      setWriterName(selectedDocument.writerName ?? "");
      setSource(selectedDocument.source ?? "");
    }
  }, [selectedDocument]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setStatus("Choose a PDF, DOCX, FDX, or TXT file first.");
      return;
    }
    setStatus("Extracting text and creating version...");
    try {
      await onUpload({
        projectId,
        documentId: documentId || undefined,
        title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
        type,
        writerName: writerName.trim() || "Unassigned Writer",
        source: source.trim(),
        file,
        notes
      });
      setStatus("Uploaded.");
      onDone();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  return (
    <form onSubmit={submit} className="mb-3 grid gap-3 rounded-lg border border-amberline/20 bg-amberline/5 p-3 md:grid-cols-[1fr_160px]">
      <div className="space-y-2">
        <select className="field" value={documentId} onChange={(event) => setDocumentId(event.target.value)}>
          <option value="">Create new document</option>
          {documents.map((document) => (
            <option key={document.id} value={document.id}>New version of {document.title}</option>
          ))}
        </select>
        <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Document title" />
        <input className="field" list="writer-contact-options" value={writerName} onChange={(event) => setWriterName(event.target.value)} placeholder="Writer" />
        <input className="field" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Source: agency, contest, list, manager, referral" />
        <datalist id="writer-contact-options">
          {hammerContacts.filter((contact) => contact.type === "WRITER").map((contact) => <option key={contact.id} value={contact.name} />)}
        </datalist>
        <textarea className="field min-h-16" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Version notes" />
        {status ? <p className="text-xs text-studio-300">{status}</p> : null}
      </div>
      <div className="space-y-2">
        <select className="field" value={type} onChange={(event) => setType(event.target.value as DocumentType)}>
          {(["SCRIPT", "TREATMENT", "OUTLINE", "NOTES", "COVERAGE", "BUSINESS_DOCUMENT"] as DocumentType[]).map((documentType) => (
            <option key={documentType} value={documentType}>{statusLabel(documentType)}</option>
          ))}
        </select>
        <input className="block w-full text-xs text-studio-300 file:mr-3 file:rounded file:border-0 file:bg-studio-100 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-studio-950" type="file" accept=".pdf,.docx,.fdx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <PrimaryButton icon={UploadCloud} label={documentId ? "Upload Version" : "Create Document"} />
      </div>
    </form>
  );
}

function SupportingDocumentUpload({
  documentId,
  onUpload
}: {
  documentId: string;
  onUpload: (input: { scriptDocumentId: string; title: string; type: SupportingDocumentType; source: string; notes: string; file: File }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<SupportingDocumentType>("CONTEXT");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setStatus("Choose a PDF, DOCX, FDX, or TXT file first.");
      return;
    }
    setStatus("Adding supporting document...");
    try {
      await onUpload({
        scriptDocumentId: documentId,
        title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
        type,
        source: source.trim(),
        notes,
        file
      });
      setTitle("");
      setSource("");
      setNotes("");
      setFile(null);
      setStatus("Added.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border border-amberline/20 bg-amberline/5 p-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-amberline">Attach Context</p>
        <p className="mt-1 text-xs leading-5 text-studio-300">Coverage, context notes, correspondence, research, and writer materials.</p>
      </div>
      <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Document title" />
      <input className="field" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Source: agency, contest, list, manager, referral" />
      <select className="field" value={type} onChange={(event) => setType(event.target.value as SupportingDocumentType)}>
        {(["CONTEXT", "COVERAGE", "NOTES", "EMAIL", "WRITER_MATERIAL", "OTHER"] as SupportingDocumentType[]).map((documentType) => (
          <option key={documentType} value={documentType}>{statusLabel(documentType)}</option>
        ))}
      </select>
      <textarea className="field min-h-16" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes for the team" />
      <input
        key={status === "Added." ? "cleared" : "ready"}
        className="block w-full text-xs text-studio-300 file:mr-3 file:rounded file:border-0 file:bg-studio-100 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-studio-950"
        type="file"
        accept=".pdf,.docx,.fdx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      {status ? <p className="text-xs text-studio-300">{status}</p> : null}
      <PrimaryButton icon={UploadCloud} label="Add Document" />
    </form>
  );
}

function DocumentRows({
  docs,
  versions = hammerVersions,
  projects = hammerProjects,
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
  omitProject?: boolean;
  showInboxMeta?: boolean;
  onDelete?: (documentId: string) => void;
  onAssignToProject?: (documentId: string, projectId: string) => void;
  assignableProjects?: HammerProject[];
  defaultProjectId?: string;
  emptyLabel?: string;
}) {
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});
  if (!docs.length) return <EmptyState label={emptyLabel} />;
  return (
    <div className="data-scroll">
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
          {docs.map((doc) => {
            const version = currentVersionFor(doc.id, docs, versions);
            const selectedProjectId = assignmentDrafts[doc.id] ?? "";
            const canMoveDocument = Boolean(onAssignToProject && assignableProjects.length);
            const moveLabel = doc.projectId ? "Move" : "Assign";
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
                  {canMoveDocument ? (
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
                      <button type="button" disabled={!selectedProjectId || selectedProjectId === doc.projectId} onClick={() => selectedProjectId && onAssignToProject?.(doc.id, selectedProjectId)} className="rounded border border-emerald-400/25 bg-emerald-400/5 px-1.5 py-1 text-[11px] font-semibold text-emerald-300 hover:border-emerald-300/50 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40">{moveLabel}</button>
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
  onCreateScriptCollection,
  onAddDocument,
  onRemoveDocument
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
  onCreateScriptCollection: (input: { name: string; description?: string; visibility?: HammerScriptCollection["visibility"] }) => Promise<void>;
  onAddDocument: (collectionId: string, documentId: string, notes?: string) => Promise<void>;
  onRemoveDocument: (collectionItemId: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"slate" | "scripts">("slate");
  const slateItemCount = slateItems.length;
  const scriptItemCount = scriptItems.length;
  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader eyebrow="Collections" title="Review Packets" />
          <div className="inline-flex w-fit rounded-md border border-white/10 bg-white/[0.025] p-1">
            <button
              type="button"
              onClick={() => setMode("slate")}
              className={cn("rounded px-3 py-1.5 text-xs font-semibold transition", mode === "slate" ? "bg-amberline text-studio-950" : "text-studio-300 hover:text-studio-100")}
            >
              Slate Packets
            </button>
            <button
              type="button"
              onClick={() => setMode("scripts")}
              className={cn("rounded px-3 py-1.5 text-xs font-semibold transition", mode === "scripts" ? "bg-amberline text-studio-950" : "text-studio-300 hover:text-studio-100")}
            >
              Script Groups
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <CompactStat label="Slate packets" value={`${slateCollections.length}`} sub={`${slateItemCount} project/prospect item${slateItemCount === 1 ? "" : "s"}`} active={mode === "slate"} onClick={() => setMode("slate")} />
          <CompactStat label="Script groups" value={`${scriptCollections.length}`} sub={`${scriptItemCount} script/doc item${scriptItemCount === 1 ? "" : "s"}`} active={mode === "scripts"} onClick={() => setMode("scripts")} />
        </div>
      </Panel>

      {mode === "slate" ? (
        <SlateCollections collections={slateCollections} items={slateItems} projects={projects} prospects={prospects} users={users} canManage={canManage} onCreateCollection={onCreateSlateCollection} onAddItem={onAddSlateItem} onRemoveItem={onRemoveSlateItem} />
      ) : (
        <ScriptCollections collections={scriptCollections} items={scriptItems} documents={documents} versions={versions} projects={projects} canManage={canManage} onCreateCollection={onCreateScriptCollection} onAddDocument={onAddDocument} onRemoveDocument={onRemoveDocument} />
      )}
    </div>
  );
}

function CompactStat({ label, value, sub, active, onClick }: { label: string; value: string; sub: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-md border p-3 text-left transition", active ? "border-amberline/45 bg-amberline/10" : "border-white/10 bg-white/[0.025] hover:border-white/25")}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">{label}</p>
        <p className="text-lg font-semibold text-studio-100">{value}</p>
      </div>
      <p className="mt-1 text-xs text-studio-400">{sub}</p>
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
  onRemoveItem
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
}) {
  const [selectedCollectionId, setSelectedCollectionId] = useState(collections[0]?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<HammerSlateCollection["visibility"]>("PROJECT_TEAM");
  const [itemType, setItemType] = useState<SlateCollectionItemType>("PROJECT");
  const [itemId, setItemId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [message, setMessage] = useState("");
  const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId) ?? collections[0];
  const collectionItems = selectedCollection ? items.filter((item) => item.collectionId === selectedCollection.id).sort((a, b) => a.sortOrder - b.sortOrder || a.addedAt.localeCompare(b.addedAt)) : [];
  const collectionProjectIds = new Set(collectionItems.map((item) => item.projectId).filter(Boolean));
  const collectionProspectIds = new Set(collectionItems.map((item) => item.prospectId).filter(Boolean));
  const availableProjects = projects.filter((project) => !collectionProjectIds.has(project.id));
  const availableProspects = prospects.filter((prospect) => !collectionProspectIds.has(prospect.id));
  const availableItems = itemType === "PROJECT" ? availableProjects : availableProspects;
  const selectedItem = availableItems.find((item) => item.id === itemId);
  const normalizedItemSearch = itemSearch.trim().toLowerCase();
  const visibleAvailableItems = availableItems
    .filter((item) => {
      if (itemType === "PROJECT") {
        const projectItem = item as HammerProject;
        return !normalizedItemSearch || `${projectItem.title} ${projectItem.genre} ${projectItem.status} ${projectItem.logline}`.toLowerCase().includes(normalizedItemSearch);
      }
      const prospectItem = item as HammerProjectLead;
      const searchableText = `${prospectItem.title} ${prospectItem.logline} ${prospectItem.creator} ${prospectItem.genre} ${prospectItem.lane} ${prospectItem.rightsStatus} ${prospectItem.nextActionStatus} ${prospectItem.sourceLink} ${prospectItem.platformSource} ${prospectItem.contactRep} ${prospectItem.searchKeywords}`;
      return !normalizedItemSearch || searchableText.toLowerCase().includes(normalizedItemSearch);
    })
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }));

  useEffect(() => {
    if (!selectedCollectionId && collections[0]) setSelectedCollectionId(collections[0].id);
    if (selectedCollectionId && !collections.some((collection) => collection.id === selectedCollectionId)) setSelectedCollectionId(collections[0]?.id ?? "");
  }, [collections, selectedCollectionId]);

  useEffect(() => {
    if (availableItems.length && !availableItems.some((item) => item.id === itemId)) setItemId("");
  }, [availableItems, itemId]);

  async function submitCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setMessage("Collection name is required.");
      return;
    }
    await onCreateCollection({ name, description, visibility });
    setName("");
    setDescription("");
    setVisibility("PROJECT_TEAM");
    setMessage("Collection created.");
  }

  async function submitItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCollection || !itemId) {
      setMessage("Choose a collection and item first.");
      return;
    }
    await onAddItem(selectedCollection.id, itemType, itemId, itemNotes);
    setItemId("");
    setItemSearch("");
    setItemNotes("");
    setMessage(`${itemType === "PROJECT" ? "Development Slate item" : "Prospect"} added to collection.`);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Panel>
          <SectionHeader eyebrow="Review Packets" title="Slate Collections" />
          <div className="data-scroll-list mt-3 grid gap-2">
            {collections.length ? collections.map((collection) => {
              const count = items.filter((item) => item.collectionId === collection.id).length;
              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => setSelectedCollectionId(collection.id)}
                  className={cn("rounded-md border p-3 text-left transition", selectedCollection?.id === collection.id ? "border-amberline/45 bg-amberline/10" : "border-white/10 bg-white/[0.03] hover:border-white/25")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-studio-100">{collection.name}</p>
                    <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-studio-300">{count}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-studio-400">{collection.description || "No description yet."}</p>
                </button>
              );
            }) : <EmptyState label="No slate collections yet." />}
          </div>
        </Panel>

        {canManage ? (
          <Panel>
            <SectionHeader eyebrow="New" title="Create Slate Collection" />
            <form onSubmit={submitCollection} className="mt-3 grid gap-2">
              <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Collection name" />
              <textarea className="field min-h-20" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Purpose, review context, meeting, or deadline" />
              <select className="field" value={visibility} onChange={(event) => setVisibility(event.target.value as HammerSlateCollection["visibility"])}>
                <option value="PROJECT_TEAM">Project Team</option>
                <option value="INTERNAL">Internal</option>
                <option value="EXECUTIVE_ONLY">Executive Only</option>
              </select>
              <PrimaryButton icon={Plus} label="Create Collection" />
            </form>
            {message ? <p className="mt-2 text-xs text-studio-300">{message}</p> : null}
          </Panel>
        ) : null}
      </div>

      <div className="space-y-4">
        <Panel>
          <SectionHeader
            eyebrow={selectedCollection?.visibility ? statusLabel(selectedCollection.visibility) : "Collection"}
            title={selectedCollection?.name ?? "Select a Collection"}
            action={selectedCollection ? <Badge value={selectedCollection.status} /> : undefined}
          />
          {selectedCollection ? (
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <SmallStat label="Items" value={`${collectionItems.length}`} />
              <SmallStat label="Projects" value={`${collectionItems.filter((item) => item.itemType === "PROJECT").length}`} />
              <SmallStat label="Prospects" value={`${collectionItems.filter((item) => item.itemType === "PROSPECT").length}`} />
              <SmallStat label="Updated" value={selectedCollection.updatedAt} />
            </div>
          ) : null}
          {selectedCollection?.description ? <p className="mt-3 text-[13px] leading-6 text-studio-300">{selectedCollection.description}</p> : null}
        </Panel>

        {selectedCollection && canManage ? (
          <Panel>
            <SectionHeader eyebrow="Add" title="Add Project or Prospect" />
            <form onSubmit={submitItem} className="mt-3 grid gap-3">
              <div className="grid gap-2 lg:grid-cols-[180px_1fr_auto]">
                <select className="field" value={itemType} onChange={(event) => { setItemType(event.target.value as SlateCollectionItemType); setItemId(""); setItemSearch(""); }}>
                <option value="PROJECT">Development Slate</option>
                <option value="PROSPECT">Prospect</option>
              </select>
                <div>
                  <input className="field" value={itemSearch} onChange={(event) => { setItemSearch(event.target.value); setItemId(""); }} placeholder={`Search ${itemType === "PROJECT" ? "development slate" : "prospects"} by title, writer, genre, status`} />
                  {selectedItem ? (
                    <p className="mt-1.5 text-xs text-amberline">Selected: {selectedItem.title}</p>
                  ) : null}
                </div>
                <button type="submit" disabled={!itemId} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-xs font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <input className="field" value={itemNotes} onChange={(event) => setItemNotes(event.target.value)} placeholder="Optional collection note" />
              <p className="text-xs text-studio-400">
                Showing {visibleAvailableItems.length} available {itemType === "PROJECT" ? "development slate item" : "prospect"}{visibleAvailableItems.length === 1 ? "" : "s"}.
              </p>
              <div className="max-h-52 overflow-y-auto rounded-md border border-white/10 bg-white/[0.02] p-1.5">
                {visibleAvailableItems.length ? visibleAvailableItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setItemId(item.id); setItemSearch(item.title); }}
                    className={cn("flex w-full items-start justify-between gap-3 rounded px-2.5 py-2 text-left text-xs transition hover:bg-white/[0.04]", itemId === item.id && "bg-amberline/10 text-amberline")}
                  >
                    <span>
                      <span className="block font-semibold text-studio-100">{item.title}</span>
                      <span className="mt-0.5 block text-studio-400">
                        {itemType === "PROJECT"
                          ? `${(item as HammerProject).genre || "No genre"} / ${(item as HammerProject).status || "No status"}`
                          : `${(item as HammerProjectLead).creator || "No writer"} / ${(item as HammerProjectLead).genre || "No genre"}`}
                      </span>
                    </span>
                    {itemId === item.id ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amberline" /> : null}
                  </button>
                )) : <p className="px-2.5 py-3 text-xs text-studio-400">No available {itemType === "PROJECT" ? "development slate items" : "prospects"} match that search, or every matching item is already in this collection.</p>}
              </div>
            </form>
          </Panel>
        ) : null}

        <Panel>
          <SectionHeader eyebrow="Review List" title="Projects and Prospects" />
          {collectionItems.length ? (
            <div className="data-scroll">
              <table className="data-table min-w-[900px]">
                <thead><tr><th>Title</th><th>Type</th><th>Status / Lane</th><th>Genre</th><th>Owner / Creator</th><th>Collection Note</th>{canManage ? <th>Action</th> : null}</tr></thead>
                <tbody>
                  {collectionItems.map((item) => {
                    const project = item.projectId ? projects.find((entry) => entry.id === item.projectId) : undefined;
                    const prospect = item.prospectId ? prospects.find((entry) => entry.id === item.prospectId) : undefined;
                    return (
                      <tr key={item.id}>
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
                        {canManage ? <td><DangerButton label="Remove" onClick={() => onRemoveItem(item.id)} /></td> : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyState label="No projects or prospects in this collection yet." />}
        </Panel>
      </div>
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
  onRemoveDocument
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
}) {
  const [selectedCollectionId, setSelectedCollectionId] = useState(collections[0]?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<HammerScriptCollection["visibility"]>("PROJECT_TEAM");
  const [documentId, setDocumentId] = useState("");
  const [documentSearch, setDocumentSearch] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [message, setMessage] = useState("");
  const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId) ?? collections[0];
  const collectionItems = selectedCollection ? items.filter((item) => item.collectionId === selectedCollection.id).sort((a, b) => a.sortOrder - b.sortOrder || a.addedAt.localeCompare(b.addedAt)) : [];
  const collectionDocumentIds = new Set(collectionItems.map((item) => item.documentId));
  const scriptDocuments = documents.filter((document) => ["SCRIPT", "TREATMENT", "OUTLINE", "NOTES", "COVERAGE", "BUSINESS_DOCUMENT"].includes(document.type));
  const availableDocuments = scriptDocuments.filter((document) => !collectionDocumentIds.has(document.id));
  const selectedDocument = availableDocuments.find((document) => document.id === documentId);
  const normalizedDocumentSearch = documentSearch.trim().toLowerCase();
  const visibleAvailableDocuments = availableDocuments
    .filter((document) => {
      const version = currentVersionFor(document.id, documents, versions);
      const searchableText = `${document.title} ${document.writerName} ${document.type} ${document.projectId ? projectTitleFromList(document.projectId, projects) : "Inbox"} ${version?.status ?? ""}`;
      return !normalizedDocumentSearch || searchableText.toLowerCase().includes(normalizedDocumentSearch);
    })
    .slice(0, 25);

  useEffect(() => {
    if (!selectedCollectionId && collections[0]) setSelectedCollectionId(collections[0].id);
    if (selectedCollectionId && !collections.some((collection) => collection.id === selectedCollectionId)) setSelectedCollectionId(collections[0]?.id ?? "");
  }, [collections, selectedCollectionId]);

  async function submitCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setMessage("Collection name is required.");
      return;
    }
    await onCreateCollection({ name, description, visibility });
    setName("");
    setDescription("");
    setVisibility("PROJECT_TEAM");
    setMessage("Collection created.");
  }

  async function submitDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCollection || !documentId) {
      setMessage("Choose a collection and script first.");
      return;
    }
    await onAddDocument(selectedCollection.id, documentId, itemNotes);
    setDocumentId("");
    setDocumentSearch("");
    setItemNotes("");
    setMessage("Script added to collection.");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Panel>
          <SectionHeader eyebrow="Review Groups" title="Collections" />
          <div className="data-scroll-list mt-3 grid gap-2">
            {collections.length ? collections.map((collection) => {
              const count = items.filter((item) => item.collectionId === collection.id).length;
              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => setSelectedCollectionId(collection.id)}
                  className={cn("rounded-md border p-3 text-left transition", selectedCollection?.id === collection.id ? "border-amberline/45 bg-amberline/10" : "border-white/10 bg-white/[0.03] hover:border-white/25")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-studio-100">{collection.name}</p>
                    <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-studio-300">{count}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-studio-400">{collection.description || "No description yet."}</p>
                </button>
              );
            }) : <EmptyState label="No collections yet." />}
          </div>
        </Panel>

        {canManage ? (
          <Panel>
            <SectionHeader eyebrow="New" title="Create Collection" />
            <form onSubmit={submitCollection} className="mt-3 grid gap-2">
              <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Collection name" />
              <textarea className="field min-h-20" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Purpose, review context, or deadline" />
              <select className="field" value={visibility} onChange={(event) => setVisibility(event.target.value as HammerScriptCollection["visibility"])}>
                <option value="PROJECT_TEAM">Project Team</option>
                <option value="INTERNAL">Internal</option>
                <option value="EXECUTIVE_ONLY">Executive Only</option>
              </select>
              <PrimaryButton icon={Plus} label="Create Collection" />
            </form>
            {message ? <p className="mt-2 text-xs text-studio-300">{message}</p> : null}
          </Panel>
        ) : null}
      </div>

      <div className="space-y-4">
        <Panel>
          <SectionHeader
            eyebrow={selectedCollection?.visibility ? statusLabel(selectedCollection.visibility) : "Collection"}
            title={selectedCollection?.name ?? "Select a Collection"}
            action={selectedCollection ? <Badge value={selectedCollection.status} /> : undefined}
          />
          {selectedCollection ? (
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <SmallStat label="Scripts" value={`${collectionItems.length}`} />
              <SmallStat label="Owner" value={selectedCollection.ownerId ? userName(selectedCollection.ownerId) : "Unassigned"} />
              <SmallStat label="Updated" value={selectedCollection.updatedAt} />
            </div>
          ) : null}
          {selectedCollection?.description ? <p className="mt-3 text-[13px] leading-6 text-studio-300">{selectedCollection.description}</p> : null}
        </Panel>

        {selectedCollection && canManage ? (
          <Panel>
            <SectionHeader eyebrow="Add" title="Add Script to Collection" />
            <form onSubmit={submitDocument} className="mt-3 grid gap-3">
              <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
                <div>
                  <input className="field" value={documentSearch} onChange={(event) => { setDocumentSearch(event.target.value); setDocumentId(""); }} placeholder="Search scripts by title, writer, project, status" />
                  {selectedDocument ? <p className="mt-1.5 text-xs text-amberline">Selected: {selectedDocument.title}</p> : null}
                </div>
                <button type="submit" disabled={!documentId} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-xs font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <input className="field" value={itemNotes} onChange={(event) => setItemNotes(event.target.value)} placeholder="Optional collection note" />
              <div className="max-h-52 overflow-y-auto rounded-md border border-white/10 bg-white/[0.02] p-1.5">
                {visibleAvailableDocuments.length ? visibleAvailableDocuments.map((document) => {
                  const version = currentVersionFor(document.id, documents, versions);
                  return (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => { setDocumentId(document.id); setDocumentSearch(document.title); }}
                      className={cn("flex w-full items-start justify-between gap-3 rounded px-2.5 py-2 text-left text-xs transition hover:bg-white/[0.04]", documentId === document.id && "bg-amberline/10 text-amberline")}
                    >
                      <span>
                        <span className="block font-semibold text-studio-100">{document.title}</span>
                        <span className="mt-0.5 block text-studio-400">{document.writerName || "No writer"} / {document.projectId ? projectTitleFromList(document.projectId, projects) : "Inbox"} / {statusLabel(version?.status ?? "DRAFT")}</span>
                      </span>
                      {documentId === document.id ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amberline" /> : null}
                    </button>
                  );
                }) : <p className="px-2.5 py-3 text-xs text-studio-400">No available scripts match that search.</p>}
              </div>
            </form>
          </Panel>
        ) : null}

        <Panel>
          <SectionHeader eyebrow="Review List" title="Scripts in Collection" />
          {collectionItems.length ? (
            <div className="data-scroll">
              <table className="data-table min-w-[900px]">
                <thead><tr><th>Title</th><th>Project</th><th>Status</th><th>Writer</th><th>Collection Note</th>{canManage ? <th>Action</th> : null}</tr></thead>
                <tbody>
                  {collectionItems.map((item) => {
                    const document = documents.find((entry) => entry.id === item.documentId);
                    const version = document ? currentVersionFor(document.id, documents, versions) : undefined;
                    return (
                      <tr key={item.id}>
                        <td className="py-2.5">{document ? <Link className="font-semibold text-studio-100 hover:text-amberline" href={`/scripts/${document.id}`}>{document.title}</Link> : <span className="text-studio-400">Missing document</span>}</td>
                        <td>{document?.projectId ? projectTitleFromList(document.projectId, projects) : "Inbox"}</td>
                        <td><Badge value={version?.status ?? "DRAFT"} /></td>
                        <td>{document?.writerName ?? (document?.createdById ? userName(document.createdById) : "Unassigned")}</td>
                        <td className="max-w-[260px] text-studio-300">{item.notes || "-"}</td>
                        {canManage ? <td><DangerButton label="Remove" onClick={() => onRemoveDocument(item.id)} /></td> : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <EmptyState label="No scripts in this collection yet." />}
        </Panel>
      </div>
    </div>
  );
}

function ScriptDetail({
  documentId,
  documents = hammerDocuments,
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
  onUpdateMetadata,
  onDelete
}: {
  documentId: string;
  documents?: HammerDocument[];
  versions?: HammerDocumentVersion[];
  comments?: HammerComment[];
  currentUser?: HammerUser;
  supportingDocuments?: SupportingDocument[];
  onUpload?: (input: DocumentUploadInput) => Promise<void>;
  onSupportingUpload?: (input: { scriptDocumentId: string; title: string; type: SupportingDocumentType; source: string; notes: string; file: File }) => Promise<void>;
  onSupportingDelete?: (documentId: string) => void;
  onStatusChange?: (versionId: string, status: ScriptStatus) => void;
  onUpdateVersionNotes?: (versionId: string, notes: string) => Promise<void>;
  onUpdateVersionMarkdown?: (versionId: string, markdownNotes: string) => Promise<void>;
  onCreateComment?: (input: { targetType: string; targetId: string; body: string; visibility?: HammerComment["visibility"]; projectId?: string }) => Promise<void>;
  onUpdateMetadata?: (documentId: string, patch: Partial<Pick<HammerDocument, "title" | "type" | "writerName" | "source">>) => Promise<void>;
  onDelete?: (documentId: string) => void;
}) {
  const doc = documents.find((item) => item.id === documentId) ?? documents[0];
  const version = currentVersionFor(doc.id, documents, versions);
  const [tab, setTab] = useState<"overview" | "notes" | "files" | "versions" | "breakdown">("overview");
  const [metadataDraft, setMetadataDraft] = useState({
    title: doc.title,
    type: doc.type,
    writerName: doc.writerName ?? "",
    source: doc.source ?? ""
  });
  const [quickNoteDraft, setQuickNoteDraft] = useState("");
  const [quickNoteTarget, setQuickNoteTarget] = useState<"VERSION" | "SCRIPT">("VERSION");
  const [quickNoteVisibility, setQuickNoteVisibility] = useState<HammerComment["visibility"]>("PROJECT_TEAM");
  const [metadataMessage, setMetadataMessage] = useState("");
  const [quickNoteMessage, setQuickNoteMessage] = useState("");
  const [quickNoteBusy, setQuickNoteBusy] = useState(false);
  const [markdownDraft, setMarkdownDraft] = useState(version?.markdownNotes ?? "");
  const [markdownMessage, setMarkdownMessage] = useState("");
  const [markdownBusy, setMarkdownBusy] = useState(false);
  const documentVersions = versions.filter((item) => item.documentId === doc.id).sort((a, b) => b.versionNumber - a.versionNumber);
  const attachedSupportingDocuments = supportingDocuments.filter((item) => item.scriptDocumentId === doc.id);
  const scriptComments = comments.filter((comment) => comment.targetId === doc.id);
  const versionComments = version ? comments.filter((comment) => comment.targetId === version.id) : [];
  const versionUploadNote = version?.notes?.trim() ?? "";
  const versionMarkdownNote = version?.markdownNotes?.trim() ?? "";
  const visibleNotesCount = scriptComments.length + versionComments.length + (versionUploadNote ? 1 : 0) + (versionMarkdownNote ? 1 : 0);
  const canDownload = canDownloadFiles(currentUser?.role);

  useEffect(() => {
    setMetadataDraft({
      title: doc.title,
      type: doc.type,
      writerName: doc.writerName ?? "",
      source: doc.source ?? ""
    });
    setMetadataMessage("");
  }, [doc.id, doc.source, doc.title, doc.type, doc.writerName]);

  useEffect(() => {
    setQuickNoteDraft("");
    setQuickNoteMessage("");
    setQuickNoteTarget(version ? "VERSION" : "SCRIPT");
    setMarkdownDraft(version?.markdownNotes ?? "");
    setMarkdownMessage("");
  }, [doc.id, version?.id, version?.markdownNotes]);

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
      setMetadataMessage("Script details updated.");
    } catch (error) {
      setMetadataMessage(error instanceof Error ? error.message : "Could not update script details.");
    }
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
          action={<div className="flex flex-wrap gap-1.5">{onDelete && doc.id.startsWith("doc-local-") ? <DangerButton label="Delete" onClick={() => onDelete(doc.id)} /> : null}</div>}
        />
        <div className="grid gap-3 md:grid-cols-4">
          <SmallStat label="Status" value={statusLabel(version?.status ?? "DRAFT")} />
          <SmallStat label="Writer" value={doc.writerName ?? userName(doc.createdById)} />
          <SmallStat label="Project" value={doc.projectId ? projectTitle(doc.projectId) : "Inbox / Unassigned"} />
          <SmallStat label="Current Version" value={`v${version?.versionNumber ?? 1}`} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
          {[
            ["overview", "Overview"],
            ["notes", `Notes${visibleNotesCount ? ` (${visibleNotesCount})` : ""}`],
            ["files", "Files"],
            ["versions", `Versions (${documentVersions.length})`],
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
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <Panel>
            <SectionHeader eyebrow="Document" title="Readable Text" />
            <pre className="max-h-[620px] overflow-auto rounded-lg border border-white/10 bg-black/25 p-3 text-[13px] leading-5 text-studio-200">{version?.extractedText}</pre>
          </Panel>
          <div className="space-y-4">
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
              <SectionHeader eyebrow="Metadata" title="Script Details" />
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
                  <PrimaryButton icon={CheckCircle2} label="Save Details" onClick={saveMetadata} />
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
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "notes" ? (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel className="xl:col-span-2">
            <SectionHeader eyebrow="Current Version" title={version ? `Version ${version.versionNumber} Markdown Notes` : "Version Markdown Notes"} />
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <textarea
                  className="field min-h-56 font-mono text-[13px]"
                  value={markdownDraft}
                  onChange={(event) => setMarkdownDraft(event.target.value)}
                  placeholder={"## Coverage Notes\n- What changed in this draft?\n- Open questions\n- Producer concerns"}
                  disabled={!version || !onUpdateVersionMarkdown}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={markdownBusy || !version || !onUpdateVersionMarkdown} onClick={saveMarkdownNotes} className="inline-flex items-center gap-1.5 rounded-md bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" />
                    Save Markdown Notes
                  </button>
                  {markdownMessage ? <p className="text-xs text-studio-300">{markdownMessage}</p> : null}
                </div>
              </div>
              <MarkdownPreview markdown={markdownDraft} />
            </div>
          </Panel>
          <CommentsPanel
            eyebrow="Current Version"
            title={version ? `Version ${version.versionNumber} Notes` : "Version Notes"}
            targetType={version ? "DOCUMENT_VERSION" : "DOCUMENT"}
            targetId={version?.id ?? doc.id}
            projectId={doc.projectId}
            versionNote={versionUploadNote}
            comments={versionComments}
            currentUser={currentUser}
            onCreateComment={onCreateComment}
            emptyLabel={version ? "No notes for this version yet." : "No version is selected."}
            placeholder={version ? `Add a note to version ${version.versionNumber}` : "Add a version note"}
            saveLabel="Save Version Note"
          />
          <CommentsPanel
            eyebrow="Overall Script"
            title="Script Notes"
            targetType="DOCUMENT"
            targetId={doc.id}
            projectId={doc.projectId}
            comments={scriptComments}
            currentUser={currentUser}
            onCreateComment={onCreateComment}
            emptyLabel="No overall script notes yet."
            placeholder="Add a note to the overall script"
            saveLabel="Save Script Note"
          />
        </div>
      ) : null}

      {tab === "files" ? (
        <Panel>
          <SectionHeader eyebrow="Files" title="Script Packet" action={onUpload ? <PrimaryButton icon={UploadCloud} label="Upload New Script Version" onClick={() => setTab("versions")} /> : undefined} />
          <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
            <div className="space-y-3">
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-studio-400">Primary Script</p>
                <p className="mt-1 text-[13px] font-semibold text-studio-100">{version?.fileName ?? doc.title}</p>
                <p className="mt-1 text-xs text-studio-400">{version?.fileType ?? doc.type} / {version ? formatBytes(version.fileSize) : "Unknown size"}</p>
                <p className="mt-2 break-all text-xs text-studio-300">{version?.storagePath}</p>
                {canDownload && version ? <div className="mt-2"><DownloadFileLink fileName={version.fileName} dataUrl={version.dataUrl} fallbackText={version.extractedText} resourceType="documentVersion" resourceId={version.id} currentUser={currentUser} /></div> : null}
              </div>
              {onSupportingUpload ? <SupportingDocumentUpload documentId={doc.id} onUpload={onSupportingUpload} /> : null}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-studio-100">Supporting Documents</h3>
                <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-studio-300">{attachedSupportingDocuments.length}</span>
              </div>
              {attachedSupportingDocuments.length ? (
                <div className="grid gap-2">
                  {attachedSupportingDocuments.map((item) => (
                    <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[13px] font-semibold text-studio-100">{item.title}</p>
                            <Badge value={item.type} />
                          </div>
                          <p className="mt-1 text-xs text-studio-400">{item.fileName} / {item.fileType} / {formatBytes(item.fileSize)}</p>
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
                  ))}
                </div>
              ) : (
                <EmptyState label="Add context documents, coverage, emails, writer notes, or other reference material connected to this script." />
              )}
            </div>
          </div>
        </Panel>
      ) : null}

      {tab === "versions" ? (
        <Panel>
          <SectionHeader eyebrow="History" title="Versions" action={onUpload ? <TableLink href={`/scripts/${doc.id}/versions`}>Manage versions</TableLink> : undefined} />
          <div className="grid gap-3">
            {documentVersions.map((item) => <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><div className="flex items-center justify-between gap-3"><p className="text-[13px] font-semibold text-studio-100">Version {item.versionNumber}: {item.fileName}</p><div className="flex shrink-0 items-center gap-1.5">{canDownload ? <DownloadFileLink fileName={item.fileName} dataUrl={item.dataUrl} fallbackText={item.extractedText} resourceType="documentVersion" resourceId={item.id} currentUser={currentUser} compact /> : null}<Badge value={item.status} /></div></div><p className="mt-1.5 text-xs text-studio-300">{item.notes}</p>{item.markdownNotes ? <p className="mt-1 text-xs font-semibold text-amberline">Markdown notes attached</p> : null}<p className="mt-1 text-[11px] text-studio-500">{item.fileType} / {formatBytes(item.fileSize)} / {item.createdAt}</p></div>)}
          </div>
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
  onUpload?: (input: DocumentUploadInput) => Promise<void>;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const documentVersions = versions.filter((version) => version.documentId === documentId).sort((a, b) => b.versionNumber - a.versionNumber);
  const compareVersions = [...documentVersions].sort((a, b) => a.versionNumber - b.versionNumber);
  const [fromVersionId, setFromVersionId] = useState(compareVersions[0]?.id ?? "");
  const [toVersionId, setToVersionId] = useState(compareVersions[1]?.id ?? compareVersions[0]?.id ?? "");
  const fromVersion = compareVersions.find((version) => version.id === fromVersionId) ?? compareVersions[0];
  const toVersion = compareVersions.find((version) => version.id === toVersionId) ?? compareVersions[1] ?? fromVersion;
  const diff = buildTextDiff(fromVersion?.extractedText ?? "", toVersion?.extractedText ?? "");
  const canDownload = canDownloadFiles(currentUser?.role);
  return (
    <div className="space-y-4">
      <Panel>
        <SectionHeader eyebrow="History" title="Document Versions" action={onUpload ? <PrimaryButton icon={UploadCloud} label="Upload New Version" onClick={() => setUploadOpen((open) => !open)} /> : undefined} />
        {uploadOpen && onUpload ? <DocumentUploadPanel projectId={document.projectId} documents={[document]} onUpload={onUpload} onDone={() => setUploadOpen(false)} /> : null}
        <div className="grid gap-3">
          {documentVersions.map((version) => <div key={version.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><div className="flex items-center justify-between gap-3"><p className="text-[13px] font-semibold text-studio-100">Version {version.versionNumber}: {version.fileName}</p><div className="flex shrink-0 items-center gap-1.5">{canDownload ? <DownloadFileLink fileName={version.fileName} dataUrl={version.dataUrl} fallbackText={version.extractedText} resourceType="documentVersion" resourceId={version.id} currentUser={currentUser} compact /> : null}<Badge value={version.status} /></div></div><p className="mt-1.5 text-xs text-studio-300">{version.notes}</p>{version.markdownNotes ? <p className="mt-1 text-xs font-semibold text-amberline">Markdown notes attached</p> : null}<p className="mt-1 text-[11px] text-studio-500">{version.fileType} / {formatBytes(version.fileSize)} / {version.createdAt}</p></div>)}
        </div>
      </Panel>
      <Panel>
        <SectionHeader eyebrow="Compare" title="Version Comparison" />
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
  const documentVersions = versions.filter((version) => version.documentId === documentId).sort((a, b) => a.versionNumber - b.versionNumber);
  const [fromVersionId, setFromVersionId] = useState(documentVersions[0]?.id ?? "");
  const [toVersionId, setToVersionId] = useState(documentVersions[1]?.id ?? documentVersions[0]?.id ?? "");
  const fromVersion = documentVersions.find((version) => version.id === fromVersionId) ?? documentVersions[0];
  const toVersion = documentVersions.find((version) => version.id === toVersionId) ?? documentVersions[1] ?? fromVersion;
  const diff = buildTextDiff(fromVersion?.extractedText ?? "", toVersion?.extractedText ?? "");
  return (
    <Panel>
      <SectionHeader eyebrow="Compare" title="Version Diff" action={<GhostButton icon={FileDiff} label="Save Diff" />} />
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
  const doc = documents.find((item) => item.id === documentId) ?? documents[0];
  const version = currentVersionFor(doc.id, documents, versions);
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
  onDeleteTask
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
}) {
  const canViewAllTasks = canViewAllProjectTasks(currentUser?.role);
  const canDeleteTasks = currentUser?.role === "ADMIN";
  const tasks = allTasks.filter((task) => (!projectId || task.projectId === projectId) && (canViewAllTasks || task.assignedToId === currentUser?.id));
  const generalTasks = tasks.filter((task) => !task.projectId && task.targetType === "GENERAL");
  const slateTasks = tasks.filter((task) => task.targetType === "PROJECT_LEAD");
  const projectTasks = tasks.filter((task) => task.projectId && task.targetType !== "PROJECT_LEAD");
  const projectName = projectId ? projectTitle(projectId) : undefined;
  return (
    <div className="grid gap-4">
      <Panel>
        <SectionHeader eyebrow="Flexible Tracking" title={compact ? "Tasks" : canViewAllTasks ? "General Tasks" : "My General Tasks"} action={onCreateTask ? <NewTaskDialog projects={projects} users={users} onCreateTask={onCreateTask} /> : undefined} />
        {generalTasks.length ? (
          <TaskRows tasks={generalTasks} users={users} projects={projects} selectedTaskId={selectedTaskId} showAssignee={canViewAllTasks} showContext onUpdateTask={onUpdateTask} onDeleteTask={canDeleteTasks ? onDeleteTask : undefined} />
        ) : (
          <EmptyState label={canViewAllTasks ? "No general tasks yet. Create one for follow-ups that are not tied to a slate item or prospect." : "No general tasks assigned to you."} />
        )}
      </Panel>
      <Panel>
        <SectionHeader eyebrow={projectName ? `Showing ${projectName}` : "Development Slate"} title={compact ? "Slate Tasks" : canViewAllTasks ? "Development Slate Tasks" : "My Development Slate Tasks"} />
        {projectTasks.length ? (
          <TaskRows tasks={projectTasks} users={users} projects={projects} selectedTaskId={selectedTaskId} showAssignee={canViewAllTasks} showContext onUpdateTask={onUpdateTask} onDeleteTask={canDeleteTasks ? onDeleteTask : undefined} />
        ) : (
          <EmptyState label={projectName ? (canViewAllTasks ? `No Development Slate tasks for ${projectName}. Create one when there is a next step.` : `No Development Slate tasks assigned to you for ${projectName}.`) : "No Development Slate tasks match this view."} />
        )}
      </Panel>
      <Panel>
        <SectionHeader eyebrow="Prospects" title={canViewAllTasks ? "Prospect Tasks" : "My Prospect Tasks"} />
        {slateTasks.length ? (
          <TaskRows tasks={slateTasks} users={users} projects={projects} selectedTaskId={selectedTaskId} showAssignee={canViewAllTasks} showContext onUpdateTask={onUpdateTask} onDeleteTask={canDeleteTasks ? onDeleteTask : undefined} />
        ) : (
          <EmptyState label={projectName ? (canViewAllTasks ? `No prospect tasks for ${projectName}.` : `No prospect tasks assigned to you for ${projectName}.`) : "No prospect tasks match this view."} />
        )}
      </Panel>
    </div>
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

function Contacts({
  initialContacts = hammerContacts,
  contactRelationships = hammerContactRelationships,
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
  onDeleteRelationship
}: {
  initialContacts?: HammerContact[];
  contactRelationships?: HammerContactRelationship[];
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
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ContactType | "ALL">("ALL");
  const [status, setStatus] = useState<ContactStatus | "ALL">("ALL");
  const [ownerId, setOwnerId] = useState("ALL");
  const [localContacts, setLocalContacts] = useState<HammerContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState(initialContacts[0]?.id ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    company: "",
    type: "OTHER" as ContactType,
    title: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    status: "ACTIVE" as ContactStatus,
    ownerId: "",
    tags: "",
    lastContacted: "",
    nextFollowUp: "",
    projectIds: [] as string[],
    notes: ""
  });
  const [relationshipDraft, setRelationshipDraft] = useState({ toContactId: "", relationshipType: "AGENT" as ContactRelationshipType, notes: "" });
  const contacts = useMemo(() => {
    if (databaseMode) return initialContacts;
    const localById = new Map(localContacts.map((contact) => [contact.id, contact]));
    return [
      ...initialContacts.map((contact) => localById.get(contact.id) ?? contact),
      ...localContacts.filter((contact) => !initialContacts.some((initialContact) => initialContact.id === contact.id))
    ];
  }, [databaseMode, initialContacts, localContacts]);
  const filteredContacts = contacts.filter((contact) => {
    const matchesType = type === "ALL" || contact.type === type;
    const matchesStatus = status === "ALL" || (contact.status ?? "ACTIVE") === status;
    const matchesOwner = ownerId === "ALL" || (contact.ownerId ?? "") === ownerId;
    const haystack = `${contact.name} ${contact.company} ${contact.title} ${contact.email} ${contact.location} ${contact.notes} ${(contact.tags ?? []).join(" ")}`.toLowerCase();
    return matchesType && matchesStatus && matchesOwner && haystack.includes(search.toLowerCase());
  });
  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) ?? filteredContacts[0] ?? contacts[0];
  const relationshipProjects = selectedContact ? projects.filter((project) => draft.projectIds.includes(project.id)) : [];
  const relationshipScripts = selectedContact ? documents.filter((document) => document.contactId === selectedContact.id || document.source === selectedContact.company || document.writerName === selectedContact.name) : [];
  const relationshipTasks = selectedContact ? tasks.filter((task) => task.targetType === "CONTACT" && task.targetId === selectedContact.id) : [];
  const linkedContacts = selectedContact ? contactRelationships.filter((relationship) => relationship.fromContactId === selectedContact.id || relationship.toContactId === selectedContact.id) : [];
  const followUpContacts = contacts.filter((contact) => contact.nextFollowUp && (contact.status ?? "ACTIVE") !== "ARCHIVED").sort((a, b) => (a.nextFollowUp ?? "").localeCompare(b.nextFollowUp ?? "")).slice(0, 5);

  useEffect(() => {
    try {
      const storedContacts = window.localStorage.getItem(HAMMER_LOCAL_CONTACTS_STORAGE_KEY);
      if (storedContacts) setLocalContacts(JSON.parse(storedContacts) as HammerContact[]);
    } catch {
      setLocalContacts([]);
    }
  }, []);

  useEffect(() => {
    if (!selectedContact) return;
    setDraft({
      name: selectedContact.name,
      company: selectedContact.company,
      type: selectedContact.type,
      title: selectedContact.title,
      email: selectedContact.email,
      phone: selectedContact.phone,
      location: selectedContact.location,
      website: selectedContact.website ?? "",
      status: selectedContact.status ?? "ACTIVE",
      ownerId: selectedContact.ownerId ?? "",
      tags: (selectedContact.tags ?? []).join(", "),
      lastContacted: selectedContact.lastContacted ?? "",
      nextFollowUp: selectedContact.nextFollowUp ?? "",
      projectIds: selectedContact.projectIds,
      notes: selectedContact.notes
    });
  }, [selectedContact]);

  async function importContacts(file?: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      const importedContacts = parseContactsCsv(text);
      if (!importedContacts.length) {
        setImportMessage("No contacts found in CSV.");
        return;
      }
      if (databaseMode && onDatabaseImport) {
        await onDatabaseImport(importedContacts);
        setImportMessage(`Imported ${importedContacts.length} contact${importedContacts.length === 1 ? "" : "s"} to database.`);
        return;
      }
      const nextContacts = [...localContacts, ...importedContacts];
      setLocalContacts(nextContacts);
      window.localStorage.setItem(HAMMER_LOCAL_CONTACTS_STORAGE_KEY, JSON.stringify(nextContacts));
      setImportMessage(`Imported ${importedContacts.length} contact${importedContacts.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Could not import CSV.");
    }
  }

  function exportContacts() {
    const csv = buildContactsCsv(filteredContacts);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `greenlight-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function saveContact() {
    if (!selectedContact) return;
    const patch = {
      name: draft.name.trim() || "Unnamed Contact",
      company: draft.company.trim(),
      type: draft.type,
      title: draft.title.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      location: draft.location.trim(),
      website: draft.website.trim() || undefined,
      status: draft.status,
      ownerId: draft.ownerId || undefined,
      tags: draft.tags.split(/[;,]/).map((tag) => tag.trim()).filter(Boolean),
      lastContacted: draft.lastContacted || undefined,
      nextFollowUp: draft.nextFollowUp || undefined,
      projectIds: draft.projectIds,
      notes: draft.notes
    };
    if (databaseMode) {
      await onUpdateContact?.(selectedContact.id, patch);
    } else {
      const updatedContact = { ...selectedContact, ...patch };
      const nextContacts = [...localContacts.filter((contact) => contact.id !== selectedContact.id), updatedContact];
      setLocalContacts(nextContacts);
      window.localStorage.setItem(HAMMER_LOCAL_CONTACTS_STORAGE_KEY, JSON.stringify(nextContacts));
    }
    setImportMessage("Contact updated.");
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
    setImportMessage("Contact link added.");
  }

  async function createManualContact(input: Omit<HammerContact, "id">) {
    if (databaseMode) {
      await onCreateContact?.(input);
    } else {
      const nextContact: HammerContact = {
        id: `contact-local-${Date.now()}`,
        ...input
      };
      const nextContacts = [nextContact, ...localContacts];
      setLocalContacts(nextContacts);
      setSelectedContactId(nextContact.id);
      window.localStorage.setItem(HAMMER_LOCAL_CONTACTS_STORAGE_KEY, JSON.stringify(nextContacts));
    }
    setCreateOpen(false);
    setImportMessage("Contact added.");
  }

  async function deleteSelectedContact() {
    if (!selectedContact) return;
    if (!window.confirm(`Delete contact "${selectedContact.name}"?`)) return;
    if (databaseMode) {
      await onDeleteContact?.(selectedContact.id);
    } else {
      const nextContacts = localContacts.filter((contact) => contact.id !== selectedContact.id);
      setLocalContacts(nextContacts);
      window.localStorage.setItem(HAMMER_LOCAL_CONTACTS_STORAGE_KEY, JSON.stringify(nextContacts));
    }
    setSelectedContactId("");
    setImportMessage("Contact deleted.");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel>
          <SectionHeader eyebrow="Collaborative CRM" title="Contacts" action={<div className="flex flex-wrap gap-2"><PrimaryButton icon={Plus} label="Add Contact" onClick={() => setCreateOpen(true)} /><label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs font-semibold text-studio-200 transition hover:border-amberline/40 hover:text-amberline"><UploadCloud className="h-3.5 w-3.5" />Import CSV<input className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => importContacts(event.target.files?.[0])} /></label><button type="button" className="rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs font-semibold text-studio-200 hover:border-amberline/40 hover:text-amberline" onClick={exportContacts}>Export CSV</button></div>} />
          <div className="mb-3 grid gap-2 lg:grid-cols-[1fr_180px_180px_180px]">
            <input className="field" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search names, companies, tags, notes" />
            <select className="field" value={type} onChange={(event) => setType(event.target.value as ContactType | "ALL")}>
              <option value="ALL">All contact types</option>
              {contactTypes.map((contactType) => <option key={contactType} value={contactType}>{statusLabel(contactType)}</option>)}
            </select>
            <select className="field" value={status} onChange={(event) => setStatus(event.target.value as ContactStatus | "ALL")}>
              <option value="ALL">All statuses</option>
              {contactStatuses.map((contactStatus) => <option key={contactStatus} value={contactStatus}>{statusLabel(contactStatus)}</option>)}
            </select>
            <select className="field" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
              <option value="ALL">All owners</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </div>
          {importMessage ? <p className="mb-3 text-xs text-studio-300">{importMessage}</p> : null}
          {filteredContacts.length ? (
            <div className="data-scroll">
              <table className="data-table min-w-[940px]">
                <thead className="text-[11px] uppercase tracking-[0.12em] text-studio-400">
                  <tr><th className="py-2">Name</th><th>Type</th><th>Company</th><th>Email</th><th>Phone</th><th>Development Slate</th><th>Notes</th></tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} onClick={() => setSelectedContactId(contact.id)} className={cn("cursor-pointer text-studio-200 transition hover:bg-white/[0.035]", selectedContact?.id === contact.id && "bg-emerald-400/10")}>
                      <td className="py-2.5">
                        <p className="font-semibold text-studio-100">{contact.name}</p>
                        <p className="mt-0.5 text-xs text-studio-400">{contact.title} / {contact.location}</p>
                      </td>
                      <td><Badge value={contact.type} /></td>
                      <td>{contact.company}</td>
                      <td><a className="text-sky-200 hover:text-amberline" href={`mailto:${contact.email}`} onClick={(event) => event.stopPropagation()}>{contact.email}</a></td>
                      <td className="text-studio-300">{contact.phone}</td>
                      <td className="space-x-1.5">{contact.projectIds.map((projectId) => <TableLink key={projectId} href={`/projects/${projectId}`}>{projectTitle(projectId)}</TableLink>)}</td>
                      <td className="max-w-[260px] text-studio-300">{contact.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState label="No contacts match this search." />}
        </Panel>

        <Panel>
          {selectedContact ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge value={selectedContact.type} />
                      <Badge value={selectedContact.status ?? "ACTIVE"} subtle />
                    </div>
                    <h3 className="mt-2 text-xl font-semibold text-studio-100">{selectedContact.name}</h3>
                    <p className="mt-1 text-[13px] text-studio-300">{selectedContact.title} / {selectedContact.company}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedContact.email ? <TableLink href={`mailto:${selectedContact.email}`}>Email</TableLink> : null}
                    {selectedContact.website ? <TableLink href={selectedContact.website}>Website</TableLink> : null}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Company</span>
                    <input className="field" value={draft.company} onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))} placeholder="Company, agency, vendor" />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Title / Role</span>
                    <input className="field" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Writer, manager, artist..." />
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
                    <input className="field" value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Los Angeles, CA" />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Website</span>
                    <input className="field" value={draft.website} onChange={(event) => setDraft((current) => ({ ...current, website: event.target.value }))} placeholder="https://..." />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Status</span>
                    <select className="field" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ContactStatus }))}>
                      {contactStatuses.map((contactStatus) => <option key={contactStatus} value={contactStatus}>{statusLabel(contactStatus)}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Relationship Owner</span>
                    <select className="field" value={draft.ownerId} onChange={(event) => setDraft((current) => ({ ...current, ownerId: event.target.value }))}>
                      <option value="">Unassigned owner</option>
                      {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Last Contacted</span>
                    <input className="field" type="date" value={draft.lastContacted} onChange={(event) => setDraft((current) => ({ ...current, lastContacted: event.target.value }))} />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Next Follow-Up</span>
                    <input className="field" type="date" value={draft.nextFollowUp} onChange={(event) => setDraft((current) => ({ ...current, nextFollowUp: event.target.value }))} />
                  </label>
                </div>
                <label className="mt-3 grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Tags</span>
                  <input className="field" value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="Tags, separated by commas" />
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
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Relationship Notes</span>
                  <textarea className="field min-h-24" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Relationship notes" />
                </label>
                <div className="mt-3 flex justify-end"><PrimaryButton icon={CheckCircle2} label="Save Relationship" onClick={saveContact} /></div>
                <div className="mt-2 flex justify-end">
                  <button type="button" onClick={deleteSelectedContact} className="inline-flex items-center gap-1.5 rounded border border-rose-400/25 bg-rose-500/5 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:border-rose-300/50 hover:text-rose-200">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Contact
                  </button>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <SectionHeader eyebrow="Contact Network" title="Linked Contacts" />
                <form onSubmit={addContactRelationship} className="mt-3 grid gap-2 lg:grid-cols-[1fr_150px_1fr_auto]">
                  <select className="field" value={relationshipDraft.toContactId} onChange={(event) => setRelationshipDraft((current) => ({ ...current, toContactId: event.target.value }))}>
                    <option value="">Choose contact</option>
                    {contacts.filter((contact) => contact.id !== selectedContact.id).map((contact) => (
                      <option key={contact.id} value={contact.id}>{contact.name} / {contact.company}</option>
                    ))}
                  </select>
                  <select className="field" value={relationshipDraft.relationshipType} onChange={(event) => setRelationshipDraft((current) => ({ ...current, relationshipType: event.target.value as ContactRelationshipType }))}>
                    {contactRelationshipTypes.map((relationshipType) => <option key={relationshipType} value={relationshipType}>{statusLabel(relationshipType)}</option>)}
                  </select>
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
                        <div>
                          <p className="text-[13px] font-semibold text-studio-100">{otherContact?.name ?? "Missing contact"}</p>
                          <p className="mt-0.5 text-xs text-studio-400">{isOutbound ? statusLabel(relationship.relationshipType) : `Linked as ${statusLabel(relationship.relationshipType)}`} / {otherContact?.company ?? "Unknown company"}</p>
                          {relationship.notes ? <p className="mt-1 text-xs text-studio-300">{relationship.notes}</p> : null}
                        </div>
                        {onDeleteRelationship ? <DangerButton label="Remove" onClick={() => onDeleteRelationship(relationship.id)} /> : null}
                      </div>
                    );
                  }) : <EmptyState label="No linked contacts yet. Add agents, managers, assistants, reps, or referral relationships here." />}
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <RelationshipList title="Development Slate" empty="No linked slate items." items={relationshipProjects.map((project) => ({ id: project.id, title: project.title, detail: statusLabel(project.status), href: `/projects/${project.id}` }))} />
                <RelationshipList title="Scripts" empty="No linked scripts." items={relationshipScripts.map((document) => ({ id: document.id, title: document.title, detail: document.writerName ?? document.source ?? statusLabel(document.type), href: `/scripts/${document.id}` }))} />
                <RelationshipList title="Follow-Ups" empty="No contact tasks yet." items={relationshipTasks.map((task) => ({ id: task.id, title: task.title, detail: `${statusLabel(task.status)} / ${task.dueDate || "No due date"}`, href: `/tasks?task=${task.id}` }))} />
              </div>
            </div>
          ) : <EmptyState label="Select a contact to view relationship details." />}
        </Panel>
      </div>
      <Panel>
        <SectionHeader eyebrow="Relationship Queue" title="Upcoming Follow-Ups" />
        {followUpContacts.length ? <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">{followUpContacts.map((contact) => <button key={contact.id} type="button" onClick={() => setSelectedContactId(contact.id)} className="rounded-md border border-white/10 bg-white/[0.03] p-2.5 text-left transition hover:border-amberline/35"><p className="truncate text-[13px] font-semibold text-studio-100">{contact.name}</p><p className="mt-1 text-xs text-studio-400">{contact.nextFollowUp} / {userName(contact.ownerId ?? currentUser.id)}</p></button>)}</div> : <EmptyState label="No follow-ups scheduled." />}
      </Panel>
      {createOpen ? (
        <ContactCreateModal
          users={users}
          projects={projects}
          currentUser={currentUser}
          onClose={() => setCreateOpen(false)}
          onCreate={createManualContact}
        />
      ) : null}
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
    notes: ""
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
      await onCreate({
        ...draft,
        name: draft.name.trim(),
        company: draft.company.trim(),
        title: draft.title.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        location: draft.location.trim(),
        website: draft.website?.trim(),
        tags: tagsText.split(/[;,]/).map((tag) => tag.trim()).filter(Boolean),
        lastContacted: draft.lastContacted || undefined,
        nextFollowUp: draft.nextFollowUp || undefined,
        ownerId: draft.ownerId || undefined,
        notes: draft.notes.trim()
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
          <SectionHeader eyebrow="Collaborative CRM" title="Add Contact" />
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
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Company</span>
            <input className="field" value={draft.company} onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))} placeholder="Company, agency, vendor" />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Title / Role</span>
            <input className="field" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Writer, manager, artist..." />
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
            <input className="field" value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Los Angeles, CA" />
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
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Relationship Notes</span>
          <textarea className="field min-h-24" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Relationship notes" />
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
  const subject = `GreenLight Executive Report - ${scopeLabel} - ${formatReportWindow(windowStart, windowEnd)}`;
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

  return (
    <div className="space-y-4">
      <Panel className="border-amberline/20 bg-amberline/[0.045]">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.16em] text-amberline">Executive Email Report</p>
            <h2 className="mt-1 text-xl font-semibold text-studio-100">Generate a studio-ready update</h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-5 text-studio-300">Choose a date/time window and GreenLight will assemble changes, task pressure, material uploads, approvals, and decision points into a concise email draft.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:w-[620px]">
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-400">From</span>
              <input className="field" type="datetime-local" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-400">To</span>
              <input className="field" type="datetime-local" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-400">Scope</span>
              <select className="field" value={scope} onChange={(event) => setScope(event.target.value)}>
                <option value="ALL">All Development</option>
                <option value="PROSPECTS">Prospects Only</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
              </select>
            </label>
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 md:grid-cols-4">
        <SmallStat label="Changed Items" value={`${updatedProjects.length + updatedProspects.length + newVersions.length + newSupportingDocs.length}`} />
        <SmallStat label="Tasks Due" value={`${dueTasks.length}`} />
        <SmallStat label="Pending Decisions" value={`${pendingApprovals.length}`} />
        <SmallStat label="Comments / Notes" value={`${commentActivity.length}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-4">
          <Panel>
            <SectionHeader eyebrow="Attention" title="What Matters" />
            <ReportList
              emptyLabel="No urgent items in this window."
              items={[
                ...urgentTasks.slice(0, 5).map((task) => ({ label: "Task", title: task.title, detail: `${nameForUserFromList(task.assignedToId, users)} / ${task.priority} / ${task.status}` })),
                ...greenlightProjects.slice(0, 3).map((project) => ({ label: "Greenlight", title: project.title, detail: project.logline })),
                ...onHoldProjects.slice(0, 3).map((project) => ({ label: "On Hold", title: project.title, detail: project.logline })),
                ...assetReviews.slice(0, 3).map((asset) => ({ label: "Asset", title: asset.title, detail: `${projectTitleFromList(asset.projectId, projects)} / ${statusLabel(asset.status)}` }))
              ]}
            />
          </Panel>
          <Panel>
            <SectionHeader eyebrow="Window Activity" title="Changes" />
            <ReportList
              emptyLabel="No project, prospect, or material changes in this window."
              items={[
                ...updatedProjects.map((project) => ({ label: "Project", title: project.title, detail: `${statusLabel(project.status)} / updated ${project.updatedAt}` })),
                ...updatedProspects.map((prospect) => ({ label: "Prospect", title: prospect.title, detail: `${prospect.creator || "Writer TBD"} / ${prospect.lastUpdated || "updated"}` })),
                ...newVersions.map((version) => {
                  const document = documents.find((item) => item.id === version.documentId);
                  return { label: "Version", title: document ? `${document.title} v${version.versionNumber}` : `Version ${version.versionNumber}`, detail: `${version.fileName} / ${statusLabel(version.status)}` };
                }),
                ...newSupportingDocs.map((document) => ({ label: "Support", title: document.title, detail: `${document.fileName} / ${statusLabel(document.type)}` }))
              ]}
            />
          </Panel>
          <Panel>
            <SectionHeader eyebrow="This Window" title="Tasks and Approvals" />
            <ReportList
              emptyLabel="No tasks due or approval changes in this window."
              items={[
                ...dueTasks.map((task) => ({ label: "Task Due", title: task.title, detail: `${nameForUserFromList(task.assignedToId, users)} / due ${task.dueDate} / ${statusLabel(task.status)}` })),
                ...approvalActivity.map((approval) => ({ label: "Approval", title: approval.targetId, detail: `${statusLabel(approval.status)} / reviewer ${nameForUserFromList(approval.reviewerId, users)}` }))
              ]}
            />
          </Panel>
        </div>

        <Panel>
          <SectionHeader eyebrow="Email Draft" title="Executive Summary" />
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-400">Recipient</span>
            <input className="field" type="email" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="executive@example.com" />
          </label>
          <label className="mt-3 grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-studio-400">Subject</span>
            <input className="field" value={subject} readOnly />
          </label>
          <textarea className="field mt-3 min-h-[640px] font-mono text-[12px] leading-5" value={emailBody} readOnly />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={copyReport} className="rounded-md bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 hover:bg-emerald-300">{copied ? "Copied" : "Copy Email"}</button>
            <button type="button" onClick={downloadReport} className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:border-amberline/40 hover:text-amberline">Download TXT</button>
            <a href={mailtoHref} className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:border-amberline/40 hover:text-amberline">Open Email Draft</a>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ReportList({ items, emptyLabel }: { items: Array<{ label: string; title: string; detail: string }>; emptyLabel: string }) {
  if (!items.length) return <EmptyState label={emptyLabel} />;
  return (
    <div className="space-y-2">
      {items.slice(0, 10).map((item, index) => (
        <div key={`${item.label}-${item.title}-${index}`} className="rounded-md border border-white/10 bg-white/[0.03] p-2.5">
          <p className="font-display text-[10px] uppercase tracking-[0.12em] text-amberline">{item.label}</p>
          <p className="mt-1 text-[13px] font-semibold text-studio-100">{item.title}</p>
          <p className="mt-0.5 text-xs leading-5 text-studio-400">{item.detail}</p>
        </div>
      ))}
    </div>
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
            <p className="font-display text-[10px] uppercase tracking-[0.16em] text-amberline">Executive Slate Brief</p>
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
          <SectionHeader eyebrow="Decisions" title="Needs Executive Attention" />
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
            )) : <EmptyState label="No executive decisions are waiting right now." />}
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
  return (
    <div className="data-scroll">
      <table className="data-table min-w-[860px]">
        <thead className="text-[11px] uppercase tracking-[0.12em] text-studio-400">
          <tr><th className="py-2">Project</th><th>Overall Status</th><th>Current Material</th><th>Open Items</th><th>Next Step</th></tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {briefs.map((brief) => (
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
  onStatusChange: (projectId: string, status: HammerProjectStatus) => void;
}) {
  const canCreateProject = currentUser.role === "ADMIN" || currentUser.role === "PRODUCER" || currentUser.role === "EXECUTIVE";
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<HammerUser | null>(null);
  const [createdUserReceipt, setCreatedUserReceipt] = useState<{ name: string; email: string; password: string } | null>(null);
  const [localUserStates, setLocalUserStates] = useState<Record<string, { inactive?: boolean; deleted?: boolean }>>({});
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
        <div className="data-scroll">
          <table className="data-table min-w-[720px]">
            <thead className="text-xs uppercase tracking-[0.16em] text-studio-400"><tr><th className="py-2">Project</th><th>Current Status</th><th>Status Control</th><th>Updated</th><th>Admin</th></tr></thead>
            <tbody className="divide-y divide-white/10">
              {projects.map((project) => (
                <tr key={project.id}>
                  <td className="py-2.5 font-semibold text-studio-100">{project.title}</td>
                  <td><Badge value={project.status} /></td>
                  <td>
                    <select
                      className="rounded-md border border-white/10 bg-studio-950 px-2.5 py-1.5 text-[13px] text-studio-100 outline-none focus:border-amberline/60"
                      value={project.status}
                      onChange={(event) => onStatusChange(project.id, event.target.value as HammerProjectStatus)}
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
        <div className="data-scroll">
          <table className="data-table min-w-[900px]">
            <thead className="text-xs uppercase tracking-[0.16em] text-studio-400"><tr><th className="py-2">Name</th><th>Email</th><th>Global Role</th><th>Status</th><th>Project Access</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-white/10">
              {visibleUsers.map((user) => {
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

function ProjectTable({ projects }: { projects: HammerProject[] }) {
  const [sort, setSort] = useState<{ key: ProjectSortKey; direction: "asc" | "desc" }>({ key: "title", direction: "asc" });
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

  if (!projects.length) return <EmptyState label="No projects match this view." />;
  return <div className="data-scroll"><table className="data-table min-w-[980px]"><thead><tr><SortableHeader label="Project" sortKey="title" activeSort={sort} onSort={toggleSort} /><SortableHeader label="Logline" sortKey="logline" activeSort={sort} onSort={toggleSort} /><SortableHeader label="Status" sortKey="status" activeSort={sort} onSort={toggleSort} /><SortableHeader label="Owner" sortKey="owner" activeSort={sort} onSort={toggleSort} /><SortableHeader label="Updated" sortKey="updatedAt" activeSort={sort} onSort={toggleSort} /></tr></thead><tbody>{sortedProjects.map((project) => <tr key={project.id} className="transition hover:bg-white/[0.035]"><td><Link className="block font-semibold text-studio-100" href={`/projects/${project.id}`}>{project.title}<p className="mt-0.5 text-xs font-normal text-studio-400">{project.genre}</p></Link></td><td><Link className="line-clamp-2 max-w-[420px] text-[13px] leading-5 text-studio-300" href={`/projects/${project.id}`}>{project.logline || "-"}</Link></td><td><Link className="block" href={`/projects/${project.id}`}><Badge value={project.status} /></Link></td><td><Link className="block text-studio-300" href={`/projects/${project.id}`}>{userName(project.ownerId)}</Link></td><td><Link className="block text-studio-300" href={`/projects/${project.id}`}>{project.updatedAt}</Link></td></tr>)}</tbody></table></div>;
}

function SortableHeader<TSortKey extends string>({ label, sortKey, activeSort, onSort }: { label: string; sortKey: TSortKey; activeSort: { key: TSortKey; direction: "asc" | "desc" }; onSort: (key: TSortKey) => void }) {
  const active = activeSort.key === sortKey;
  return (
    <th>
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

function taskContextLabel(task: HammerTask) {
  if (task.targetType === "GENERAL" || !task.projectId) return "General";
  if (task.targetType === "PROJECT_LEAD") return "Prospect";
  return projectTitle(task.projectId);
}

function TaskRows({ tasks, users = hammerUsers, projects = hammerProjects, selectedTaskId, showAssignee = false, showContext = false, onUpdateTask, onDeleteTask }: { tasks: HammerTask[]; users?: HammerUser[]; projects?: HammerProject[]; selectedTaskId?: string; showAssignee?: boolean; showContext?: boolean; onUpdateTask?: (taskId: string, patch: TaskPatch) => void; onDeleteTask?: (taskId: string) => void }) {
  const gridClass = showAssignee
    ? showContext ? "md:grid-cols-[1fr_130px_120px_120px_110px_100px_128px]" : "md:grid-cols-[1fr_130px_120px_110px_100px_128px]"
    : showContext ? "md:grid-cols-[1fr_120px_120px_110px_100px_128px]" : "md:grid-cols-[1fr_120px_110px_100px_128px]";
  const nameForUser = (userId: string) => users.find((user) => user.id === userId)?.name ?? userName(userId);
  return (
    <div className="data-scroll-list grid gap-2">
      <div className={cn("hidden px-2.5 text-[11px] uppercase tracking-[0.12em] text-studio-400 md:grid", gridClass)}>
        <span>Task</span>
        {showAssignee ? <span>Assignee</span> : null}
        {showContext ? <span>Area</span> : null}
        <span>Priority</span>
        <span>Progress</span>
        <span>Due</span>
        <span>{onUpdateTask || onDeleteTask ? "Actions" : ""}</span>
      </div>
      {tasks.map((task) => (
        <div
          key={task.id}
          className={cn(
            "grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5 transition hover:border-amberline/35 hover:bg-white/[0.055]",
            gridClass,
            selectedTaskId === task.id && "border-amberline/45 bg-amberline/10"
          )}
        >
          <div>
            <p className="text-[13px] font-semibold text-studio-100">{task.title}</p>
            <p className="mt-0.5 text-xs text-studio-300">{task.description}</p>
          </div>
          {showAssignee ? <p className="text-xs font-semibold text-studio-300">{nameForUser(task.assignedToId)}</p> : null}
          {showContext ? <p className="text-xs text-studio-300">{taskContextLabel(task)}</p> : null}
          {onUpdateTask ? (
            <TaskInlineSelect label="Priority" value={task.priority} options={["LOW", "MEDIUM", "HIGH", "URGENT"]} onChange={(value) => onUpdateTask(task.id, { priority: value as TaskPriority })} />
          ) : <Badge value={task.priority} />}
          {onUpdateTask ? (
            <TaskInlineSelect label="Progress" value={task.status} options={["TODO", "IN_PROGRESS", "DONE", "ON_HOLD", "REVIEW"]} onChange={(value) => onUpdateTask(task.id, { status: value as TaskStatus })} />
          ) : <Badge value={task.status} />}
          <p className="text-xs text-studio-300">{task.dueDate}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {onUpdateTask ? <EditTaskDialog task={task} users={users} projects={projects} onUpdateTask={onUpdateTask} /> : null}
            {onDeleteTask ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete task "${task.title}"?`)) onDeleteTask(task.id);
                }}
                className="inline-flex h-7 items-center justify-center gap-1 rounded border border-rose-400/25 bg-rose-500/5 px-2 text-[11px] font-semibold text-rose-300 transition hover:border-rose-300/50 hover:text-rose-200"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function EditTaskDialog({ task, users, projects, onUpdateTask }: { task: HammerTask; users: HammerUser[]; projects: HammerProject[]; onUpdateTask: (taskId: string, patch: TaskPatch) => void }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"GENERAL" | "PROJECT">(task.projectId ? "PROJECT" : "GENERAL");
  const [projectId, setProjectId] = useState(task.projectId || projects[0]?.id || "");
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assignedToId, setAssignedToId] = useState(task.assignedToId || users[0]?.id || "");
  const [dueDate, setDueDate] = useState(task.dueDate || defaultDueDate());
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);

  useEffect(() => {
    if (!open) return;
    setScope(task.projectId ? "PROJECT" : "GENERAL");
    setProjectId(task.projectId || projects[0]?.id || "");
    setTitle(task.title);
    setDescription(task.description);
    setAssignedToId(task.assignedToId || users[0]?.id || "");
    setDueDate(task.dueDate || defaultDueDate());
    setPriority(task.priority);
    setStatus(task.status);
  }, [open, projects, task, users]);

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
    setOpen(false);
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-7 items-center justify-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 text-[11px] font-semibold text-studio-300 transition hover:border-amberline/35 hover:text-amberline">
        <Pencil className="h-3 w-3" />
        Edit
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <form onSubmit={submit} className="w-full max-w-xl rounded-lg border border-white/10 bg-studio-950 p-4 shadow-glow">
            <div className="flex items-start justify-between gap-3">
              <SectionHeader eyebrow="Task" title="Edit Task" />
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close task editor">
                <X className="h-4 w-4" />
              </button>
            </div>
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
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded border border-white/10 px-3 py-2 text-sm font-semibold text-studio-300 hover:text-amberline">Cancel</button>
              <button type="submit" className="rounded bg-amberline px-3 py-2 text-sm font-semibold text-studio-950 hover:bg-emerald-300">Save Task</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function TaskInlineSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const tone = toneForStatus(value);
  return (
    <label className="grid gap-1">
      <span className="sr-only">{label}</span>
      <select
        className={cn("status-badge rounded border px-2 py-1 font-display text-[11px] uppercase outline-none transition focus:border-amberline/60", badgeStyles[tone].solid)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => <option key={option} value={option}>{badgeLabel(option)}</option>)}
      </select>
    </label>
  );
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
  const href = dataUrl || textDownloadUrl(fallbackText);
  const hasDownloadSource = Boolean(href || (resourceType && resourceId));
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
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-white/12 bg-studio-950 p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
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
        </div>
      ) : null}
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

function PrimaryButton({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick?: () => void }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-md bg-amberline px-2.5 py-1.5 text-xs font-semibold text-studio-950 transition hover:bg-emerald-300"><Icon className="h-3.5 w-3.5" />{label}</button>;
}

function GhostButton({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return <button className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs font-semibold text-studio-200 transition hover:border-amberline/40 hover:text-amberline"><Icon className="h-3.5 w-3.5" />{label}</button>;
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
  return projects.find((project) => project.id === projectId)?.title ?? projectTitle(projectId);
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
    `${input.dueTasks.length} task${input.dueTasks.length === 1 ? "" : "s"} due in the selected window`,
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
  const taskLines = input.dueTasks.map((task) => `${task.title} - ${nameForUserFromList(task.assignedToId, input.users)} - due ${task.dueDate} - ${statusLabel(task.status)} / ${task.priority}`);
  const approvalLines = [
    ...input.pendingApprovals.map((approval) => `${approval.targetType} ${approval.targetId}: ${statusLabel(approval.status)} - reviewer ${nameForUserFromList(approval.reviewerId, input.users)}`),
    ...input.approvalActivity.map((approval) => `${approval.targetType} ${approval.targetId}: activity ${statusLabel(approval.status)}`)
  ];
  const noteLines = input.comments.slice(0, 10).map((comment) => `${statusLabel(comment.targetType)} ${comment.targetId}: ${comment.body}`);

  return [
    `Hi team,`,
    "",
    `Here is the GreenLight executive report for ${input.scopeLabel}.`,
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
  const rows = parseCsvRows(csv).filter((row) => row.some((cell) => cell.trim()));
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => normalizeCsvHeader(header));
  return rows.slice(1).map((row, index) => {
    const record = Object.fromEntries(headers.map((header, cellIndex) => [header, row[cellIndex]?.trim() ?? ""]));
    const type = normalizeContactType(record.type);
    return {
      id: `contact-local-${Date.now()}-${index}`,
      name: record.name || "Unnamed Contact",
      company: record.company || "Independent",
      type,
      title: record.title || statusLabel(type),
      email: record.email || "",
      phone: record.phone || "",
      location: record.location || "",
      website: record.website || "",
      status: normalizeContactStatus(record.status),
      ownerId: record.ownerid || record.owner || "",
      tags: parseTags(record.tags),
      lastContacted: record.lastcontacted || "",
      nextFollowUp: record.nextfollowup || record.followup || "",
      projectIds: parseContactProjects(record.projects || record.project || record.projectids),
      notes: record.notes || ""
    };
  });
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
  const headers = ["name", "company", "type", "title", "email", "phone", "location", "website", "status", "ownerId", "tags", "lastContacted", "nextFollowUp", "projects", "notes"];
  const rows = contacts.map((contact) => [
    contact.name,
    contact.company,
    contact.type,
    contact.title,
    contact.email,
    contact.phone,
    contact.location,
    contact.website ?? "",
    contact.status ?? "ACTIVE",
    contact.ownerId ?? "",
    (contact.tags ?? []).join("; "),
    contact.lastContacted ?? "",
    contact.nextFollowUp ?? "",
    contact.projectIds.map(projectTitle).join("; "),
    contact.notes
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

function normalizeCsvHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
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

function parseContactProjects(value: string) {
  if (!value.trim()) return [];
  return value
    .split(/[;|]/)
    .map((item) => item.trim())
    .map((item) => hammerProjects.find((project) => project.id === item || project.title.toLowerCase() === item.toLowerCase())?.id)
    .filter((projectId): projectId is string => Boolean(projectId));
}

function escapeCsvCell(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll("\"", "\"\"")}"` : value;
}

function currentVersionFor(documentId: string, documents: HammerDocument[], versions: HammerDocumentVersion[]) {
  const doc = documents.find((item) => item.id === documentId);
  return versions.find((version) => version.id === doc?.currentVersionId) ?? versions.filter((version) => version.documentId === documentId).sort((a, b) => b.versionNumber - a.versionNumber)[0];
}

async function extractTextFromUpload(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (file.type === "application/pdf" || extension === "pdf") {
    return extractPdfText(file);
  }
  if (extension === "fdx" || file.type === "text/plain" || extension === "txt") {
    const text = await file.text();
    if (!text.trim()) throw new Error("No text found in uploaded file.");
    return text;
  }
  if (extension === "docx" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return `DOCX uploaded: ${file.name}\n\nText extraction for DOCX is queued for the server-backed parser. Upload PDF, FDX, or TXT for immediate breakdown and diff text in this MVP.`;
  }
  throw new Error("Unsupported file type. Upload PDF, DOCX, FDX, or TXT.");
}

function inferFileType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === "fdx") return "application/xml";
  return "text/plain";
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
    "project-new": "New Project",
    "project-detail": context.project.title,
    "project-documents": context.project.title,
    "project-assets": context.project.title,
    scripts: "Scripts in Context",
    "script-detail": context.document.title,
    "script-versions": "Version History",
    "script-diff": "Version Diff",
    "script-breakdown": "Script Breakdown",
    assets: "Assets",
    "asset-detail": context.asset.title,
    tasks: "Tasks",
    contacts: "Contacts",
    reviews: "Reviews",
    reports: "Reports",
    executive: "Executive",
    "admin-users": "Admin",
    account: "Account"
  };
  return titles[view];
}

type BreadcrumbItem = {
  label: string;
  href?: string;
};

function PageBreadcrumbs({ view, project, document, asset, accessDenied = false }: { view: HammerView; project: HammerProject; document: typeof hammerDocuments[number]; asset: typeof hammerAssets[number]; accessDenied?: boolean }) {
  const router = useRouter();
  const [hasPageHistory, setHasPageHistory] = useState(false);
  const breadcrumbs = accessDenied ? [{ label: "Development Slate", href: "/projects" }, { label: "Access Required" }] : breadcrumbsForView(view, { project, document, asset });
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

function breadcrumbsForView(view: HammerView, context: { project: HammerProject; document: typeof hammerDocuments[number]; asset: typeof hammerAssets[number] }): BreadcrumbItem[] {
  const scriptTrail = context.document.projectId
    ? [{ label: "Development Slate", href: "/projects" }, { label: projectTitle(context.document.projectId), href: `/projects/${context.document.projectId}/documents` }, { label: context.document.title, href: `/scripts/${context.document.id}` }]
    : [{ label: "Prospects", href: "/prospects" }, { label: context.document.title, href: `/scripts/${context.document.id}` }];
  const projectTrail = [{ label: "Development Slate", href: "/projects" }, { label: context.project.title, href: `/projects/${context.project.id}` }];

  if (view === "script-detail") return scriptTrail;
  if (view === "collections") return [{ label: "Collections" }];
  if (view === "script-versions") return [...scriptTrail, { label: "Versions" }];
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
