"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FileDiff, Gauge, ImagePlus, MessageSquare, PackageCheck, Plus, Search, ShieldCheck, Trash2, UploadCloud, UsersRound, X } from "lucide-react";
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
  HAMMER_LOCAL_USER_STATES_EVENT,
  HAMMER_LOCAL_USER_STATES_STORAGE_KEY,
  HAMMER_LOCAL_VERSION_STATUS_STORAGE_KEY,
  HAMMER_LOCAL_VERSIONS_STORAGE_KEY,
  hammerApprovals,
  hammerAssetLinks,
  hammerAssets,
  hammerComments,
  hammerContacts,
  hammerDocuments,
  hammerEntities,
  hammerProjectStatuses,
  hammerProjects,
  hammerScenes,
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
  type AssetType,
  type AssetStatus,
  type DocumentType,
  type ScriptStatus,
  type ContactType,
  type ContactStatus,
  type HammerContact
} from "@/lib/hammer-data";
import { buildTextDiff } from "@/lib/hammer-diff";
import { extractPdfText } from "@/lib/pdf-parser";
import { parseScriptText } from "@/lib/script-parser";
import { cn } from "@/lib/utils";

const HAMMER_DISMISSED_BREAKDOWN_ENTITIES_STORAGE_KEY = "hammer:dismissed-breakdown-entities";
const HAMMER_SUPPORTING_DOCUMENTS_STORAGE_KEY = "hammer:supporting-documents";
const HAMMER_REFERENCE_IMAGES_STORAGE_KEY = "hammer:reference-images";

type HammerView = "dashboard" | "projects" | "project-new" | "project-detail" | "project-documents" | "project-assets" | "scripts" | "script-detail" | "script-versions" | "script-diff" | "script-breakdown" | "assets" | "asset-detail" | "tasks" | "contacts" | "reviews" | "executive" | "admin-users";
type ScriptLibrarySection = "inbox" | "projects" | "all";

const emptyProject: HammerProject = {
  id: "no-project",
  title: "No Projects Yet",
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
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
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
  category: AssetType;
  status: AssetStatus;
  fileName: string;
  imageUrl?: string;
  demoTone?: "steel" | "neon" | "forest" | "gold" | "ice";
  uploadedAt: string;
}

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
  const [workspaceApprovals, setWorkspaceApprovals] = useState<HammerApproval[]>([]);
  const [projectLeads, setProjectLeads] = useState<HammerProjectLead[]>([]);
  const [query, setQuery] = useState("");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState(hammerProjects[0]?.id ?? "");
  const [localDocuments, setLocalDocuments] = useState<HammerDocument[]>([]);
  const [localVersions, setLocalVersions] = useState<HammerDocumentVersion[]>([]);
  const [versionStatuses, setVersionStatuses] = useState<Record<string, ScriptStatus>>({});
  const [documentProjectOverrides, setDocumentProjectOverrides] = useState<Record<string, string | null>>({});
  const [supportingDocuments, setSupportingDocuments] = useState<SupportingDocument[]>([]);
  const [localReferenceImages, setLocalReferenceImages] = useState<ProjectReferenceImage[]>([]);
  const [localTasks, setLocalTasks] = useState<HammerTask[]>([]);
  const [taskUpdates, setTaskUpdates] = useState<Record<string, Partial<Pick<HammerTask, "priority" | "status">>>>({});
  const documents = useMemo(() => (workspaceMode === "database" ? localDocuments : [...hammerDocuments, ...localDocuments]).filter(isValidDocument).map((document) => (
    Object.prototype.hasOwnProperty.call(documentProjectOverrides, document.id)
      ? { ...document, projectId: documentProjectOverrides[document.id] ?? undefined }
      : document
  )), [documentProjectOverrides, localDocuments, workspaceMode]);
  const versions = useMemo(() => (workspaceMode === "database" ? localVersions : [...hammerVersions, ...localVersions]).filter(isValidVersion).map((version) => versionStatuses[version.id] ? { ...version, status: versionStatuses[version.id] } : version), [localVersions, versionStatuses, workspaceMode]);
  const tasks = useMemo(() => (workspaceMode === "database" ? localTasks : [...localTasks, ...hammerTasks]).filter(isValidTask).map((task) => ({ ...task, ...taskUpdates[task.id] })), [localTasks, taskUpdates, workspaceMode]);
  const users = (workspaceMode === "database" && workspaceUsers.length ? workspaceUsers : hammerUsers).filter(isValidUser);
  const assets = (workspaceMode === "database" ? workspaceAssets : hammerAssets).filter(isValidAsset);
  const contacts = workspaceMode === "database" ? workspaceContacts : hammerContacts;
  const approvals = workspaceMode === "database" ? workspaceApprovals : hammerApprovals;
  const project = projects.find((item) => item.id === id) ?? projects[0] ?? emptyProject;
  const document = documents.find((item) => item.id === id) ?? documents[0] ?? emptyDocument;
  const asset = assets.find((item) => item.id === id) ?? assets[0] ?? hammerAssets[0];
  const activeProject = projects.find((item) => item.id === activeProjectId) ?? projects[0] ?? emptyProject;
  const filteredProjects = projects.filter(isValidProject).filter((item) => `${item.title} ${item.genre} ${item.status}`.toLowerCase().includes(query.toLowerCase()));
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
    setProjectLeads(data.projectLeads ?? []);
    setWorkspaceUsers(data.users ?? []);
    setWorkspaceApprovals(data.approvals ?? []);
    setVersionStatuses({});
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
      const data = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(data?.error ?? "Database update failed.");
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
      } catch {
        setSessionUser(null);
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
    try {
      const storedProjects = window.localStorage.getItem(HAMMER_LOCAL_PROJECTS_STORAGE_KEY);
      if (!storedProjects) return;
      const parsedProjects = JSON.parse(storedProjects) as HammerProject[];
      setLocalProjects(parsedProjects);
      setProjects([...parsedProjects, ...hammerProjects.filter((project) => !parsedProjects.some((item) => item.id === project.id))]);
    } catch {
      setLocalProjects([]);
    }
  }, []);

  useEffect(() => {
    try {
      const storedDocuments = window.localStorage.getItem(HAMMER_LOCAL_DOCUMENTS_STORAGE_KEY);
      const storedVersions = window.localStorage.getItem(HAMMER_LOCAL_VERSIONS_STORAGE_KEY);
      const storedStatuses = window.localStorage.getItem(HAMMER_LOCAL_VERSION_STATUS_STORAGE_KEY);
      const storedProjectOverrides = window.localStorage.getItem(HAMMER_DOCUMENT_PROJECT_OVERRIDES_STORAGE_KEY);
      const storedSupportingDocuments = window.localStorage.getItem(HAMMER_SUPPORTING_DOCUMENTS_STORAGE_KEY);
      const storedReferenceImages = window.localStorage.getItem(HAMMER_REFERENCE_IMAGES_STORAGE_KEY);
      const storedTasks = window.localStorage.getItem(HAMMER_LOCAL_TASKS_STORAGE_KEY);
      const storedTaskUpdates = window.localStorage.getItem(HAMMER_LOCAL_TASK_UPDATES_STORAGE_KEY);
      if (storedDocuments) setLocalDocuments(JSON.parse(storedDocuments) as HammerDocument[]);
      if (storedVersions) setLocalVersions(JSON.parse(storedVersions) as HammerDocumentVersion[]);
      if (storedStatuses) setVersionStatuses(JSON.parse(storedStatuses) as Record<string, ScriptStatus>);
      if (storedProjectOverrides) setDocumentProjectOverrides(JSON.parse(storedProjectOverrides) as Record<string, string | null>);
      if (storedSupportingDocuments) setSupportingDocuments(JSON.parse(storedSupportingDocuments) as SupportingDocument[]);
      if (storedReferenceImages) setLocalReferenceImages(JSON.parse(storedReferenceImages) as ProjectReferenceImage[]);
      if (storedTasks) setLocalTasks(JSON.parse(storedTasks) as HammerTask[]);
      if (storedTaskUpdates) setTaskUpdates(JSON.parse(storedTaskUpdates) as Record<string, Partial<Pick<HammerTask, "priority" | "status">>>);
    } catch {
      setLocalDocuments([]);
      setLocalVersions([]);
      setDocumentProjectOverrides({});
      setSupportingDocuments([]);
      setLocalReferenceImages([]);
      setLocalTasks([]);
      setTaskUpdates({});
    }
  }, []);

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

  async function updateProjectLead(leadId: string, patch: Partial<HammerProjectLead>) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateProjectLead", { leadId, ...patch });
      return;
    }
    setProjectLeads((current) => current.map((lead) => lead.id === leadId ? { ...lead, ...patch } : lead));
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
    setProjectLeads((current) => current.map((item) => item.id === leadId ? { ...item, promotedProjectId: promotedProject.id, nextActionStatus: "Promoted to Active Project" } : item));
    window.localStorage.setItem(HAMMER_LOCAL_PROJECTS_STORAGE_KEY, JSON.stringify(nextLocalProjects));
    window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_PROJECTS_EVENT));
  }

  async function uploadDocumentVersion(input: {
    projectId?: string;
    documentId?: string;
    title: string;
    type: DocumentType;
    writerName: string;
    file: File;
    notes: string;
  }) {
    const extractedText = await extractTextFromUpload(input.file);
    if (workspaceMode === "database") {
      await runWorkspaceAction("uploadDocumentVersion", {
        projectId: input.projectId,
        documentId: input.documentId,
        title: input.title,
        type: input.type,
        writerName: input.writerName,
        fileName: input.file.name,
        fileType: input.file.type || inferFileType(input.file.name),
        fileSize: input.file.size,
        storagePath: `local://${input.projectId ?? "inbox"}/documents/${input.documentId ?? "new"}/versions/${Date.now()}/${input.file.name}`,
        notes: input.notes,
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
      uploadedById: currentUser.id,
      createdAt: now,
      notes: input.notes || `Uploaded ${input.file.name}.`,
      extractedText
    };
    const nextDocuments = existingDocument
      ? localDocuments.map((doc) => doc.id === existingDocument.id ? { ...doc, title: input.title, type: input.type, writerName: input.writerName, currentVersionId: versionId, updatedAt: now } : doc)
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

  async function uploadSupportingDocument(input: {
    scriptDocumentId: string;
    title: string;
    type: SupportingDocumentType;
    notes: string;
    file: File;
  }) {
    const extractedText = await extractTextFromUpload(input.file);
    const scriptDocument = documents.find((document) => document.id === input.scriptDocumentId);
    if (workspaceMode === "database") {
      await runWorkspaceAction("uploadSupportingDocument", {
        scriptDocumentId: input.scriptDocumentId,
        projectId: scriptDocument?.projectId,
        title: input.title,
        type: input.type,
        notes: input.notes,
        fileName: input.file.name,
        fileType: input.file.type || inferFileType(input.file.name),
        fileSize: input.file.size,
        storagePath: `local://supporting/${input.scriptDocumentId}/${Date.now()}/${input.file.name}`,
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
      fileName: input.file.name,
      fileType: input.file.type || inferFileType(input.file.name),
      fileSize: input.file.size,
      storagePath: `local://supporting/${input.scriptDocumentId}/${id}/${input.file.name}`,
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

  async function createTask(input: {
    projectId: string;
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
      targetId: input.targetId
    };
    const nextTasks = [nextTask, ...localTasks];
    setLocalTasks(nextTasks);
    window.localStorage.setItem(HAMMER_LOCAL_TASKS_STORAGE_KEY, JSON.stringify(nextTasks));
    window.dispatchEvent(new CustomEvent(HAMMER_LOCAL_TASKS_EVENT));
  }

  async function updateTask(taskId: string, patch: Partial<Pick<HammerTask, "priority" | "status">>) {
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

  async function updateContact(contactId: string, patch: Partial<Pick<HammerContact, "status" | "ownerId" | "tags" | "lastContacted" | "nextFollowUp" | "projectIds" | "notes">>) {
    if (workspaceMode === "database") {
      await runWorkspaceAction("updateContact", { contactId, ...patch });
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

  const content = (() => {
    if (scriptAccessLoading) {
      return <Panel><EmptyState label="Checking script access..." /></Panel>;
    }
    if (scriptAccessDenied) {
      return <AccessDenied title="Script access required" detail="You can only open scripts attached to your active project. Producers, executives, and admins can access the full script library." />;
    }
    if (view === "dashboard") return <Dashboard currentUser={currentUser} projects={projects} documents={documents} versions={versions} approvals={approvals} />;
    if (view === "projects") return <Projects projects={filteredProjects} projectLeads={projectLeads} users={users} tasks={tasks} onUpdateLead={updateProjectLead} onPromoteLead={promoteProjectLead} onCreateTask={createTask} />;
    if (view === "project-new") return <ProjectCreationMoved />;
    if (["project-detail", "project-documents", "project-assets"].includes(view) && !projects.length) return <EmptyWorkspaceState />;
    if (view === "project-detail") return <ProjectWorkspace project={project} activeTab="overview" currentUser={currentUser} users={users} projects={projects} tasks={tasks} documents={documents} versions={versions} supportingDocuments={supportingDocuments} referenceImages={localReferenceImages} assets={assets} approvals={approvals} onUpload={uploadDocumentVersion} onDelete={deleteUploadedDocument} onAssignToProject={assignDocumentToProject} onReferenceUpload={uploadReferenceImage} onCreateTask={createTask} />;
    if (view === "project-documents") return <ProjectWorkspace project={project} activeTab="documents" currentUser={currentUser} users={users} projects={projects} tasks={tasks} documents={documents} versions={versions} supportingDocuments={supportingDocuments} referenceImages={localReferenceImages} assets={assets} approvals={approvals} onUpload={uploadDocumentVersion} onDelete={deleteUploadedDocument} onAssignToProject={assignDocumentToProject} onReferenceUpload={uploadReferenceImage} onCreateTask={createTask} />;
    if (view === "project-assets") return <ProjectWorkspace project={project} activeTab="assets" currentUser={currentUser} users={users} projects={projects} tasks={tasks} documents={documents} versions={versions} supportingDocuments={supportingDocuments} referenceImages={localReferenceImages} assets={assets} approvals={approvals} onReferenceUpload={uploadReferenceImage} onCreateTask={createTask} />;
    if (view === "scripts") return <Scripts activeProjectId={projects.length ? activeProject.id : undefined} currentUser={currentUser} projects={projects} documents={documents} versions={versions} onUpload={uploadDocumentVersion} onDelete={deleteUploadedDocument} onAssignToProject={assignDocumentToProject} repositoryMode selectedSection={normalizeScriptSection(scriptSection)} />;
    if (["script-detail", "script-versions", "script-diff", "script-breakdown"].includes(view) && !documents.some((item) => item.id === document.id)) return <EmptyScriptState />;
    if (view === "script-detail") return <ScriptDetail documentId={document.id} documents={documents} versions={versions} supportingDocuments={supportingDocuments} onUpload={uploadDocumentVersion} onSupportingUpload={uploadSupportingDocument} onSupportingDelete={deleteSupportingDocument} onStatusChange={updateDocumentStatus} onDelete={deleteUploadedDocument} />;
    if (view === "script-versions") return <ScriptVersions documentId={document.id} versions={versions} document={document} onUpload={uploadDocumentVersion} />;
    if (view === "script-diff") return <ScriptDiff documentId={document.id} versions={versions} />;
    if (view === "script-breakdown") return <ScriptBreakdown documentId={document.id} documents={documents} versions={versions} />;
    if (view === "assets") return <Assets projectId={projects.length ? activeProject.id : ""} assets={assets} />;
    if (view === "asset-detail") return <AssetDetail assetId={asset.id} assets={assets} />;
    if (view === "tasks") return <Tasks selectedTaskId={selectedTaskId} currentUser={currentUser} users={users} tasks={tasks} projects={projects} onCreateTask={createTask} onUpdateTask={updateTask} />;
    if (view === "contacts") {
      if (!canViewContacts(currentUser.role)) return <AccessDenied title="Contacts access required" detail="Only admins, producers, and executives can view the studio contact directory." />;
      return <Contacts initialContacts={contacts} currentUser={currentUser} users={users} projects={projects} documents={documents} tasks={tasks} databaseMode={workspaceMode === "database"} onDatabaseImport={(importedContacts) => runWorkspaceAction("importContacts", { contacts: importedContacts })} onUpdateContact={updateContact} />;
    }
    if (view === "reviews") return <LegacyRedirect title="Reviews are folded into Scripts" detail="Review work now starts from scripts awaiting review, so the queue is easier to follow." href="/scripts?section=inbox" label="Open Scripts" />;
    if (view === "executive") {
      if (currentUser.role !== "EXECUTIVE") return <AccessDenied title="Executive access required" detail="The executive dashboard is limited to users with the Executive role." />;
      return <Executive projects={projects} documents={documents} versions={versions} tasks={tasks} assets={assets} approvals={approvals} />;
    }
    if (currentUser.role !== "ADMIN") return <AccessDenied title="Admin access required" detail="Only admins can manage projects, users, roles, and project access." />;
    return <AdminUsers projects={projects} currentUser={currentUser} onCreateProject={addProject} onStatusChange={updateProjectStatus} />;
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
        <SectionHeader eyebrow="Review Focus" title={focusDocument ? focusDocument.title : "No script needs attention"} action={focusDocument ? <TableLink href={`/scripts/${focusDocument.id}`}>Open Review</TableLink> : <TableLink href="/scripts">Open Library</TableLink>} />
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
              <TableLink href="/scripts">Script Library</TableLink>
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
          <SectionHeader eyebrow="Intake" title="Recently Received" action={<TableLink href="/scripts">Open Library</TableLink>} />
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
  projects,
  projectLeads,
  users = hammerUsers,
  tasks = hammerTasks,
  onCreate,
  onUpdateLead,
  onPromoteLead,
  onCreateTask
}: {
  projects: HammerProject[];
  projectLeads: HammerProjectLead[];
  users?: HammerUser[];
  tasks?: HammerTask[];
  onCreate?: () => void;
  onUpdateLead?: (leadId: string, patch: Partial<HammerProjectLead>) => Promise<void>;
  onPromoteLead?: (leadId: string) => Promise<void>;
  onCreateTask?: (input: { projectId: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => void;
}) {
  const [section, setSection] = useState<"active" | "slate">("active");
  const [slateSearch, setSlateSearch] = useState("");
  const [filters, setFilters] = useState({ lane: "ALL", genre: "ALL", urgency: "ALL", rights: "ALL", nextAction: "ALL", owner: "ALL", scriptStatus: "ALL", format: "ALL" });
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [leadDraft, setLeadDraft] = useState<Partial<HammerProjectLead>>({});
  const selectedLead = selectedLeadId ? projectLeads.find((lead) => lead.id === selectedLeadId) : undefined;
  const filteredLeads = projectLeads.filter((lead) => {
    const matchesSearch = `${lead.title} ${lead.logline ?? ""} ${lead.creator ?? ""} ${lead.genre ?? ""} ${lead.lane ?? ""} ${lead.notes ?? ""} ${lead.searchKeywords ?? ""} ${lead.contactRep ?? ""}`.toLowerCase().includes(slateSearch.toLowerCase());
    return matchesSearch
      && matchesFilter(filters.lane, lead.lane)
      && matchesFilter(filters.genre, lead.genre)
      && matchesFilter(filters.urgency, lead.urgencyLabel)
      && matchesFilter(filters.rights, lead.rightsStatus)
      && matchesFilter(filters.nextAction, lead.nextActionStatus)
      && matchesFilter(filters.owner, lead.owner)
      && matchesFilter(filters.scriptStatus, lead.scriptStatus)
      && matchesFilter(filters.format, lead.format);
  });
  const slateStats = {
    total: projectLeads.length,
    urgent: projectLeads.filter((lead) => lead.urgencyLabel === "Urgent").length,
    picks: projectLeads.filter((lead) => lead.myPicks).length,
    promoted: projectLeads.filter((lead) => lead.promotedProjectId).length
  };

  useEffect(() => {
    if (!selectedLead) return;
    setLeadDraft(selectedLead);
  }, [selectedLead]);

  async function saveLead() {
    if (!selectedLead || !onUpdateLead) return;
    await onUpdateLead(selectedLead.id, leadDraft);
  }

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader eyebrow="Projects" title={section === "active" ? "Active Projects" : "Development Slate"} action={onCreate && section === "active" ? <PrimaryButton icon={Plus} label="New" onClick={onCreate} /> : undefined} />
          <div className="inline-flex w-fit rounded-md border border-white/10 bg-white/[0.03] p-1">
            <button type="button" onClick={() => setSection("active")} className={cn("rounded px-3 py-1.5 text-xs font-semibold text-studio-300 transition", section === "active" && "bg-amberline text-studio-950")}>Active Projects</button>
            <button type="button" onClick={() => setSection("slate")} className={cn("rounded px-3 py-1.5 text-xs font-semibold text-studio-300 transition", section === "slate" && "bg-amberline text-studio-950")}>Development Slate</button>
          </div>
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
                <MetricCard label="Slate Items" value={`${slateStats.total}`} sub="All tracked opportunities" />
                <MetricCard label="Urgent" value={`${slateStats.urgent}`} sub="Needs attention" />
                <MetricCard label="My Picks" value={`${slateStats.picks}`} sub="Producer marked" />
                <MetricCard label="Promoted" value={`${slateStats.promoted}`} sub="Now active projects" />
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
                <SlateFilter label="Owner" value={filters.owner} options={uniqueLeadOptions(projectLeads, "owner")} onChange={(value) => setFilter("owner", value)} />
              </div>
              <div className="mb-3 grid gap-2 md:grid-cols-4">
                <SlateFilter label="Urgency" value={filters.urgency} options={uniqueLeadOptions(projectLeads, "urgencyLabel")} onChange={(value) => setFilter("urgency", value)} />
                <SlateFilter label="Next Action" value={filters.nextAction} options={uniqueLeadOptions(projectLeads, "nextActionStatus")} onChange={(value) => setFilter("nextAction", value)} />
                <SlateFilter label="Script Status" value={filters.scriptStatus} options={uniqueLeadOptions(projectLeads, "scriptStatus")} onChange={(value) => setFilter("scriptStatus", value)} />
                <SlateFilter label="Format" value={filters.format} options={uniqueLeadOptions(projectLeads, "format")} onChange={(value) => setFilter("format", value)} />
              </div>
              <div className="mb-2 flex items-center justify-between text-xs text-studio-400">
                <span>{filteredLeads.length} of {projectLeads.length} slate items</span>
                <button type="button" className="font-semibold text-amberline" onClick={() => { setSlateSearch(""); setFilters({ lane: "ALL", genre: "ALL", urgency: "ALL", rights: "ALL", nextAction: "ALL", owner: "ALL", scriptStatus: "ALL", format: "ALL" }); }}>Clear filters</button>
              </div>
              <div className="data-scroll data-scroll-slate">
                <table className="data-table min-w-[1320px] table-fixed">
                  <colgroup>
                    <col className="w-[300px]" />
                    <col className="w-[190px]" />
                    <col className="w-[180px]" />
                    <col className="w-[120px]" />
                    <col className="w-[210px]" />
                    <col className="w-[110px]" />
                    <col className="w-[220px]" />
                    <col className="w-[90px]" />
                  </colgroup>
                  <thead>
                    <tr><th>Title</th><th>Lane</th><th>Genre</th><th>Urgency</th><th>Rights</th><th>Owner</th><th>Next Action</th><th>Score</th></tr>
                  </thead>
                  <tbody>
                    {filteredLeads.slice(0, 300).map((lead) => (
                      <tr key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className={cn("cursor-pointer text-studio-200 hover:bg-white/[0.035]", selectedLeadId === lead.id && "bg-emerald-400/10")}>
                        <td><p className="truncate font-semibold text-studio-100">{lead.title}</p><p className="mt-0.5 truncate text-xs text-studio-400">{lead.creator || lead.sourceLink || "No source listed"}</p></td>
                        <td><span className="block truncate">{lead.lane || "-"}</span></td>
                        <td><span className="block truncate">{lead.genre || "-"}</span></td>
                        <td>{lead.urgencyLabel ? <Badge value={lead.urgencyLabel} subtle /> : <span className="text-studio-500">-</span>}</td>
                        <td><span className="block truncate">{lead.rightsStatus || "-"}</span></td>
                        <td><span className="block truncate">{lead.owner || "-"}</span></td>
                        <td><span className="block truncate">{lead.nextActionStatus || "-"}</span></td>
                        <td className="font-semibold text-studio-100">{lead.priorityScore ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredLeads.length > 300 ? <p className="mt-2 text-xs text-studio-400">Showing first 300 matches. Narrow the filters or search to keep the list focused.</p> : null}
            </Panel>
          </div>
          {selectedLead ? (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-studio-950/75 px-4 py-8 backdrop-blur-sm" onMouseDown={() => setSelectedLeadId("")}>
              <div className="w-full max-w-5xl" onMouseDown={(event) => event.stopPropagation()}>
                <SlateLeadPanel
                  lead={selectedLead}
                  draft={leadDraft}
                  projects={projects}
                  users={users}
                  tasks={tasks}
                  onDraftChange={setLeadDraft}
                  onSave={saveLead}
                  onPromote={onPromoteLead}
                  onCreateTask={onCreateTask}
                  onClose={() => setSelectedLeadId("")}
                />
              </div>
            </div>
          ) : null}
        </>
      )}
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

function SlateLeadPanel({
  lead,
  draft,
  projects,
  users,
  tasks,
  onDraftChange,
  onSave,
  onPromote,
  onCreateTask,
  onClose
}: {
  lead?: HammerProjectLead;
  draft: Partial<HammerProjectLead>;
  projects: HammerProject[];
  users: HammerUser[];
  tasks: HammerTask[];
  onDraftChange: React.Dispatch<React.SetStateAction<Partial<HammerProjectLead>>>;
  onSave: () => Promise<void>;
  onPromote?: (leadId: string) => Promise<void>;
  onCreateTask?: (input: { projectId: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => void;
  onClose?: () => void;
}) {
  if (!lead) return <Panel><EmptyState label="Select a slate item to review details." /></Panel>;
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
          <h3 className="mt-2 text-xl font-semibold text-studio-100">{lead.title}</h3>
          <p className="mt-1 text-[13px] text-studio-300">{lead.creator || "Creator not listed"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {promotedProject ? <TableLink href={`/projects/${promotedProject.id}`}>Open Active</TableLink> : <button type="button" onClick={() => onPromote?.(lead.id)} className="rounded-md bg-amberline px-2.5 py-1.5 text-xs font-semibold text-studio-950">Promote</button>}
          {onClose ? (
            <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300 transition hover:border-amberline/40 hover:text-studio-100" aria-label="Close slate details">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-5 text-studio-300">{lead.logline || "No logline provided."}</p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <SlateEditField label="Owner" value={draft.owner} onChange={(value) => onDraftChange((current) => ({ ...current, owner: value }))} />
        <SlateEditField label="Next Action" value={draft.nextActionStatus} onChange={(value) => onDraftChange((current) => ({ ...current, nextActionStatus: value }))} />
        <SlateEditField label="Rights Status" value={draft.rightsStatus} onChange={(value) => onDraftChange((current) => ({ ...current, rightsStatus: value }))} />
        <SlateEditField label="Contact / Rep" value={draft.contactRep} onChange={(value) => onDraftChange((current) => ({ ...current, contactRep: value }))} />
        <SlateEditField label="Script Status" value={draft.scriptStatus} onChange={(value) => onDraftChange((current) => ({ ...current, scriptStatus: value }))} />
        <SlateEditField label="Format" value={draft.format} onChange={(value) => onDraftChange((current) => ({ ...current, format: value }))} />
      </div>
      <label className="mt-3 grid gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Next Step</span>
        <textarea className="field min-h-20" value={draft.nextStep ?? ""} onChange={(event) => onDraftChange((current) => ({ ...current, nextStep: event.target.value }))} />
      </label>
      <SlateNextStepTaskCreator lead={lead} nextStep={draft.nextStep ?? ""} projects={projects} users={users} onCreateTask={onCreateTask} />
      {slateTasks.length ? (
        <div className="mt-3 rounded-md border border-white/10 bg-white/[0.025] p-2.5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Slate Tasks</p>
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
      <div className="mt-3 flex flex-wrap gap-1.5">
        {lead.sourceLink ? <TableLink href={lead.sourceLink}>Source Link</TableLink> : null}
        {lead.scriptPdf ? <TableLink href={lead.scriptPdf}>Script PDF</TableLink> : null}
      </div>
      <div className="mt-4 flex justify-end">
        <PrimaryButton icon={CheckCircle2} label="Save Slate Item" onClick={onSave} />
      </div>
    </Panel>
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
  onCreateTask?: (input: { projectId: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => void;
}) {
  const [assignedToId, setAssignedToId] = useState(users[0]?.id ?? "");
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [message, setMessage] = useState("");
  const fallbackProjectId = lead.promotedProjectId || projects[0]?.id || "";
  const taskTitle = `Slate follow-up: ${lead.title}`;

  function createSlateTask() {
    if (!onCreateTask || !fallbackProjectId || !assignedToId || !nextStep.trim()) {
      setMessage("Add a next step, assignee, and project context first.");
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
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Create Task From Next Step</p>
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

function uniqueLeadOptions(leads: HammerProjectLead[], key: keyof HammerProjectLead) {
  return Array.from(new Set(leads.map((lead) => lead[key]).filter((value): value is string => typeof value === "string" && Boolean(value.trim())))).sort((a, b) => a.localeCompare(b)).slice(0, 160);
}

function ProjectEditor({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel>
        <SectionHeader eyebrow="New Project" title="Create Project" />
        <div className="space-y-3">
          <input className="field" placeholder="Title" />
          <textarea className="field min-h-24" placeholder="Logline" />
          <div className="grid gap-3 md:grid-cols-2">
            <input className="field" placeholder="Type" />
            <input className="field" placeholder="Genre" />
          </div>
          <button onClick={onCreate} className="w-full rounded-md bg-amberline px-3 py-2 text-[13px] font-semibold text-studio-950">Create Project</button>
        </div>
      </Panel>
      <Panel>
        <SectionHeader eyebrow="Defaults" title="MVP Fields" />
        <p className="text-[13px] leading-5 text-studio-300">New projects start in IDEA / DEVELOPMENT, assign the current producer as owner, and write an audit event. The Postgres schema supports soft delete through deletedAt.</p>
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
        This script is not available in the current workspace. Open the script library to upload or select another script.
      </p>
      <Link href="/scripts" className="mt-4 inline-flex rounded-md bg-amberline px-3 py-2 text-[13px] font-semibold text-studio-950 hover:bg-emerald-300">
        Open Scripts
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
  onReferenceUpload?: (input: { projectId: string; title: string; description: string; category: AssetType; file: File }) => Promise<void>;
  onCreateTask?: (input: { projectId: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => void;
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
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge value={project.status} />
              <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-studio-300">Updated {project.updatedAt}</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-studio-100">{project.title}</h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-5 text-studio-300">{project.logline}</p>
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
                  <ProjectScriptFileList docs={scriptDocs.slice(0, 4)} versions={versions} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-studio-100">Supporting Documentation</h3>
                  <ProjectSupportingDocs docs={docs} supportingDocuments={projectSupportingDocs} />
                </div>
              </div>
            </Panel>
            <Panel>
              <SectionHeader eyebrow="Visual Reference" title="Reference Images" action={<TableLink href={`/projects/${project.id}/assets`}>Open reference</TableLink>} />
              <ReferenceImageGrid images={projectReferenceImages.slice(0, 6)} assets={projectAssets.slice(0, 6)} />
            </Panel>
          </div>
          <div className="space-y-4">
            <CommentsPanel targetId={project.id} />
          </div>
        </div>
      ) : null}

      {activeTab === "documents" ? <Scripts projectId={project.id} documents={documents} versions={versions} projects={projects} currentUser={currentUser} onUpload={onUpload} onDelete={onDelete} onAssignToProject={canManageScriptLibrary(currentUser.role) ? onAssignToProject : undefined} /> : null}
      {activeTab === "assets" ? <ProjectReferenceWorkspace project={project} assets={projectAssets} referenceImages={projectReferenceImages} onReferenceUpload={onReferenceUpload} /> : null}
    </div>
  );
}

function ProjectSupportingDocs({ docs, supportingDocuments }: { docs: HammerDocument[]; supportingDocuments: SupportingDocument[] }) {
  const directDocs = docs.filter((doc) => ["NOTES", "COVERAGE", "BUSINESS_DOCUMENT"].includes(doc.type));
  const items = [
    ...directDocs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      detail: statusLabel(doc.type),
      href: `/scripts/${doc.id}`
    })),
    ...supportingDocuments.map((doc) => ({
      id: doc.id,
      title: doc.title,
      detail: doc.fileName,
      href: undefined
    }))
  ];
  if (!items.length) return <EmptyState label="No context docs yet. Add coverage, notes, deck pages, or correspondence from a script's Files tab." />;
  return (
    <div className="grid gap-2">
      {items.slice(0, 5).map((item) => {
        const content = (
          <div className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 transition hover:border-amberline/30 hover:bg-white/[0.05]">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-studio-100">{item.title}</p>
              <p className="mt-0.5 truncate text-xs text-studio-400">{item.detail}</p>
            </div>
          </div>
        );
        return item.href ? <Link key={item.id} href={item.href}>{content}</Link> : <div key={item.id}>{content}</div>;
      })}
    </div>
  );
}

function ProjectScriptFileList({ docs, versions }: { docs: HammerDocument[]; versions: HammerDocumentVersion[] }) {
  if (!docs.length) return <EmptyState label="No scripts, treatments, or outlines attached yet." />;
  return (
    <div className="grid gap-2">
      {docs.map((doc) => {
        const version = currentVersionFor(doc.id, docs, versions);
        return (
          <Link key={doc.id} href={`/scripts/${doc.id}`} className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 transition hover:border-amberline/30 hover:bg-white/[0.05]">
            <p className="truncate text-[13px] font-semibold text-studio-100">{doc.title}</p>
            <p className="mt-0.5 truncate text-xs text-studio-400">{version?.fileName ?? statusLabel(doc.type)}</p>
          </Link>
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
  onCreateTask: (input: { projectId: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => void;
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
  onReferenceUpload
}: {
  project: HammerProject;
  assets: HammerAsset[];
  referenceImages: ProjectReferenceImage[];
  onReferenceUpload?: (input: { projectId: string; title: string; description: string; category: AssetType; file: File }) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <Panel>
        <SectionHeader eyebrow={project.title} title="Reference Images" action={onReferenceUpload ? undefined : <PrimaryButton icon={UploadCloud} label="Upload Reference" />} />
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          {onReferenceUpload ? <ReferenceUpload projectId={project.id} onUpload={onReferenceUpload} /> : null}
          <ReferenceImageGrid images={referenceImages} assets={assets} />
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
  onUpload: (input: { projectId: string; title: string; description: string; category: AssetType; file: File }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
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
      await onUpload({ projectId, title, description, category, file });
      setTitle("");
      setDescription("");
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

function ReferenceImageGrid({ images, assets = [] }: { images: ProjectReferenceImage[]; assets?: HammerAsset[] }) {
  const assetImages: ProjectReferenceImage[] = assets.map((asset) => ({
    id: asset.id,
    projectId: asset.projectId,
    title: asset.title,
    description: asset.description,
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
              </div>
              <Badge value={image.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge value={image.category} subtle />
              <span className="rounded border border-white/10 bg-white/[0.025] px-1.5 py-1 text-[11px] text-studio-400">{image.fileName}</span>
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
  const groupedProjectDocs = projects
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
          <ScriptSectionLink href="/scripts?section=projects" label="Active Projects" active={effectiveSection === "projects"} count={projectDocs.length} />
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
  onUpload: (input: { scriptDocumentId: string; title: string; type: SupportingDocumentType; notes: string; file: File }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<SupportingDocumentType>("CONTEXT");
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
        notes,
        file
      });
      setTitle("");
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
            const selectedProjectId = assignmentDrafts[doc.id] ?? (doc.projectId && assignableProjects.some((project) => project.id === doc.projectId) ? doc.projectId : defaultProjectId && assignableProjects.some((project) => project.id === defaultProjectId) ? defaultProjectId : assignableProjects[0]?.id ?? "");
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
                  <TableLink href={`/scripts/${doc.id}`}>View</TableLink>
                  <TableLink href={`/scripts/${doc.id}/versions`}>Versions</TableLink>
                  <TableLink href={`/scripts/${doc.id}/diff`}>Compare</TableLink>
                  <TableLink href={`/scripts/${doc.id}/breakdown`}>Breakdown</TableLink>
                  {canMoveDocument ? (
                    <span className="inline-flex items-center gap-1 align-middle">
                      <select
                        aria-label={`Project for ${doc.title}`}
                        className="rounded border border-white/10 bg-studio-950/70 px-1.5 py-1 text-[11px] text-studio-200 outline-none focus:border-amberline/60"
                        value={selectedProjectId}
                        onChange={(event) => setAssignmentDrafts((current) => ({ ...current, [doc.id]: event.target.value }))}
                      >
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

function ScriptDetail({
  documentId,
  documents = hammerDocuments,
  versions = hammerVersions,
  supportingDocuments = [],
  onUpload,
  onSupportingUpload,
  onSupportingDelete,
  onStatusChange,
  onDelete
}: {
  documentId: string;
  documents?: HammerDocument[];
  versions?: HammerDocumentVersion[];
  supportingDocuments?: SupportingDocument[];
  onUpload?: (input: DocumentUploadInput) => Promise<void>;
  onSupportingUpload?: (input: { scriptDocumentId: string; title: string; type: SupportingDocumentType; notes: string; file: File }) => Promise<void>;
  onSupportingDelete?: (documentId: string) => void;
  onStatusChange?: (versionId: string, status: ScriptStatus) => void;
  onDelete?: (documentId: string) => void;
}) {
  const doc = documents.find((item) => item.id === documentId) ?? documents[0];
  const version = currentVersionFor(doc.id, documents, versions);
  const [tab, setTab] = useState<"overview" | "notes" | "files" | "versions" | "breakdown">("overview");
  const documentVersions = versions.filter((item) => item.documentId === doc.id).sort((a, b) => b.versionNumber - a.versionNumber);
  const attachedSupportingDocuments = supportingDocuments.filter((item) => item.scriptDocumentId === doc.id);
  const relatedComments = hammerComments.filter((comment) => comment.targetId === (version?.id ?? doc.id) || comment.targetId === doc.id);
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
            ["notes", `Notes${relatedComments.length ? ` (${relatedComments.length})` : ""}`],
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
              <p className="text-[13px] text-studio-300">{version?.notes}</p>
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "notes" ? <CommentsPanel targetId={version?.id ?? doc.id} /> : null}

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
                          {item.notes ? <p className="mt-2 text-[13px] leading-5 text-studio-300">{item.notes}</p> : null}
                          {item.extractedText ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-studio-400">{item.extractedText}</p> : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="text-[11px] text-studio-500">{item.uploadedAt}</span>
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
            {documentVersions.map((item) => <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-studio-100">Version {item.versionNumber}: {item.fileName}</p><Badge value={item.status} /></div><p className="mt-1.5 text-xs text-studio-300">{item.notes}</p><p className="mt-1 text-[11px] text-studio-500">{item.fileType} / {formatBytes(item.fileSize)} / {item.createdAt}</p></div>)}
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
  onUpload
}: {
  documentId: string;
  document: HammerDocument;
  versions?: HammerDocumentVersion[];
  onUpload?: (input: DocumentUploadInput) => Promise<void>;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const documentVersions = versions.filter((version) => version.documentId === documentId).sort((a, b) => b.versionNumber - a.versionNumber);
  return (
    <Panel>
      <SectionHeader eyebrow="History" title="Document Versions" action={onUpload ? <PrimaryButton icon={UploadCloud} label="Upload New Version" onClick={() => setUploadOpen((open) => !open)} /> : undefined} />
      {uploadOpen && onUpload ? <DocumentUploadPanel projectId={document.projectId} documents={[document]} onUpload={onUpload} onDone={() => setUploadOpen(false)} /> : null}
      <div className="grid gap-3">
        {documentVersions.map((version) => <div key={version.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-studio-100">Version {version.versionNumber}: {version.fileName}</p><Badge value={version.status} /></div><p className="mt-1.5 text-xs text-studio-300">{version.notes}</p><p className="mt-1 text-[11px] text-studio-500">{version.fileType} / {formatBytes(version.fileSize)} / {version.createdAt}</p></div>)}
      </div>
    </Panel>
  );
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
  const parsed = useMemo(() => parseScriptText(version?.extractedText ?? "", { projectId: parserProjectId, versionName: `v${version?.versionNumber ?? 1}`, fileName: version?.fileName ?? "script.txt" }), [parserProjectId, version]);
  const scenes = hammerScenes.filter((scene) => scene.documentVersionId === version?.id);
  const breakdownScenes: BreakdownScene[] = useMemo(() => (
    scenes.length
      ? scenes
      : parsed.scenes.map((scene) => ({
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
  ), [parsed.scenes, parserProjectId, scenes, version?.id]);
  const [selectedSceneId, setSelectedSceneId] = useState("");
  const selectedScene = breakdownScenes.find((scene) => scene.id === selectedSceneId) ?? breakdownScenes[0];

  useEffect(() => {
    if (!breakdownScenes.length) return;
    if (!selectedSceneId || !breakdownScenes.some((scene) => scene.id === selectedSceneId)) {
      setSelectedSceneId(breakdownScenes[0].id);
    }
  }, [breakdownScenes, selectedSceneId]);

  return (
    <div className="space-y-4">
      <Panel>
        <SectionHeader eyebrow="Deterministic Parser" title="Script Breakdown" action={<div className="flex gap-2"><GhostButton icon={Gauge} label="Run Breakdown" /><GhostButton icon={CheckCircle2} label="Approve Breakdown" /></div>} />
        <div className="grid gap-3 md:grid-cols-4">
          <SmallStat label="Detected Scenes" value={`${Math.max(scenes.length, parsed.scenes.length)}`} />
          <SmallStat label="Characters" value={`${parsed.characters.length || hammerEntities.filter((e) => e.type === "CHARACTER").length}`} />
          <SmallStat label="Locations" value={`${parsed.environments.length || hammerEntities.filter((e) => e.type === "LOCATION").length}`} />
          <SmallStat label="Props / Actions" value={`${parsed.props.length + parsed.stuntBeats.length}`} />
        </div>
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
      <ParsedEntityPanel parsed={parsed} projectId={parserProjectId} />
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

function Assets({ projectId, assets = hammerAssets }: { projectId?: string; assets?: HammerAsset[] }) {
  const visibleAssets = assets.filter((asset) => !projectId || asset.projectId === projectId);
  const projectName = projectId ? projectTitle(projectId) : undefined;
  return (
    <Panel>
      <SectionHeader eyebrow={projectName ? `Showing ${projectName}` : "GCS Backed"} title="Assets" action={<PrimaryButton icon={UploadCloud} label="Upload Asset" />} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleAssets.length ? visibleAssets.map((asset) => <Link key={asset.id} href={`/assets/${asset.id}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 transition hover:border-amberline/40"><div className="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-studio-950 text-amberline">{asset.imageUrl ? <img src={asset.imageUrl} alt="" className="h-full w-full object-cover" /> : <PackageCheck className="h-8 w-8" />}</div><div className="mt-2.5 flex items-start justify-between gap-3"><div><h3 className="text-[13px] font-semibold text-studio-100">{asset.title}</h3><p className="mt-1 text-xs text-studio-300">{asset.description}</p></div><Badge value={asset.status} /></div><p className="mt-2 text-[11px] text-studio-400">{asset.fileName}</p></Link>) : <div className="md:col-span-2 xl:col-span-3"><EmptyState label={projectName ? `No assets for ${projectName} yet. Upload reference, keyframe, storyboard, or mood art.` : "No assets match this view."} /></div>}
      </div>
    </Panel>
  );
}

function AssetDetail({ assetId, assets = hammerAssets }: { assetId: string; assets?: HammerAsset[] }) {
  const asset = assets.find((item) => item.id === assetId) ?? hammerAssets[0];
  const links = hammerAssetLinks.filter((link) => link.assetId === asset.id);
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Panel>
        <SectionHeader eyebrow={asset.assetType} title={asset.title} action={<GhostButton icon={ShieldCheck} label="Approve Asset" />} />
        <div className="flex aspect-video items-center justify-center rounded-lg border border-white/10 bg-black/25 text-amberline"><PackageCheck className="h-16 w-16" /></div>
        <p className="mt-4 text-studio-300">{asset.description}</p>
      </Panel>
      <div className="space-y-4">
        <Panel><SectionHeader eyebrow="Signed URL" title="File Metadata" /><SmallStat label="Storage Path" value={asset.storagePath} /><SmallStat label="Status" value={statusLabel(asset.status)} /></Panel>
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
  onUpdateTask
}: {
  projectId?: string;
  compact?: boolean;
  selectedTaskId?: string;
  currentUser?: ReturnType<typeof hammerUserByEmail>;
  users?: HammerUser[];
  tasks?: HammerTask[];
  projects?: HammerProject[];
  onCreateTask?: (input: { projectId: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => void;
  onUpdateTask?: (taskId: string, patch: Partial<Pick<HammerTask, "priority" | "status">>) => void;
}) {
  const canViewAllTasks = canViewAllProjectTasks(currentUser?.role);
  const tasks = allTasks.filter((task) => (!projectId || task.projectId === projectId) && (canViewAllTasks || task.assignedToId === currentUser?.id));
  const slateTasks = tasks.filter((task) => task.targetType === "PROJECT_LEAD");
  const projectTasks = tasks.filter((task) => task.targetType !== "PROJECT_LEAD");
  const projectName = projectId ? projectTitle(projectId) : undefined;
  return (
    <div className="grid gap-4">
      <Panel>
        <SectionHeader eyebrow={projectName ? `Showing ${projectName}` : "Project Work"} title={compact ? "Tasks" : canViewAllTasks ? "Project Tasks" : "My Project Tasks"} action={onCreateTask ? <NewTaskDialog projects={projects} users={users} onCreateTask={onCreateTask} /> : undefined} />
        {projectTasks.length ? (
          <TaskRows tasks={projectTasks} selectedTaskId={selectedTaskId} showAssignee={canViewAllTasks} onUpdateTask={onUpdateTask} />
        ) : (
          <EmptyState label={projectName ? (canViewAllTasks ? `No project tasks for ${projectName}. Create one when there is a next step.` : `No project tasks assigned to you for ${projectName}.`) : "No project tasks match this view."} />
        )}
      </Panel>
      <Panel>
        <SectionHeader eyebrow="Development Slate" title={canViewAllTasks ? "Slate Tasks" : "My Slate Tasks"} />
        {slateTasks.length ? (
          <TaskRows tasks={slateTasks} selectedTaskId={selectedTaskId} showAssignee={canViewAllTasks} onUpdateTask={onUpdateTask} />
        ) : (
          <EmptyState label={projectName ? (canViewAllTasks ? `No slate tasks for ${projectName}.` : `No slate tasks assigned to you for ${projectName}.`) : "No slate tasks match this view."} />
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
  onCreateTask: (input: { projectId: string; title: string; description: string; assignedToId: string; dueDate: string; priority: TaskPriority; status?: TaskStatus; targetType: string; targetId: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState(users[0]?.id ?? "");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("TODO");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !title.trim()) return;
    onCreateTask({
      projectId,
      title,
      description,
      assignedToId,
      dueDate: defaultDueDate(),
      priority,
      status,
      targetType: "PROJECT",
      targetId: projectId
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
              <select className="field" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
              </select>
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

function Contacts({
  initialContacts = hammerContacts,
  currentUser,
  users = hammerUsers,
  projects = hammerProjects,
  documents = hammerDocuments,
  tasks = hammerTasks,
  databaseMode = false,
  onDatabaseImport,
  onUpdateContact
}: {
  initialContacts?: HammerContact[];
  currentUser: HammerUser;
  users?: HammerUser[];
  projects?: HammerProject[];
  documents?: HammerDocument[];
  tasks?: HammerTask[];
  databaseMode?: boolean;
  onDatabaseImport?: (contacts: HammerContact[]) => Promise<unknown>;
  onUpdateContact?: (contactId: string, patch: Partial<Pick<HammerContact, "status" | "ownerId" | "tags" | "lastContacted" | "nextFollowUp" | "projectIds" | "notes">>) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ContactType | "ALL">("ALL");
  const [status, setStatus] = useState<ContactStatus | "ALL">("ALL");
  const [ownerId, setOwnerId] = useState("ALL");
  const [localContacts, setLocalContacts] = useState<HammerContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState(initialContacts[0]?.id ?? "");
  const [importMessage, setImportMessage] = useState("");
  const [draft, setDraft] = useState({ status: "ACTIVE" as ContactStatus, ownerId: "", tags: "", lastContacted: "", nextFollowUp: "", projectIds: [] as string[], notes: "" });
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
    setImportMessage("Contact relationship updated.");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel>
          <SectionHeader eyebrow="Collaborative CRM" title="Contacts" action={<div className="flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs font-semibold text-studio-200 transition hover:border-amberline/40 hover:text-amberline"><UploadCloud className="h-3.5 w-3.5" />Import CSV<input className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => importContacts(event.target.files?.[0])} /></label><button type="button" className="rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs font-semibold text-studio-200 hover:border-amberline/40 hover:text-amberline" onClick={exportContacts}>Export CSV</button></div>} />
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
                  <tr><th className="py-2">Name</th><th>Type</th><th>Company</th><th>Email</th><th>Phone</th><th>Projects</th><th>Notes</th></tr>
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
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-studio-400">Assigned Projects</span>
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
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <RelationshipList title="Projects" empty="No linked projects." items={relationshipProjects.map((project) => ({ id: project.id, title: project.title, detail: statusLabel(project.status), href: `/projects/${project.id}` }))} />
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
      detail: `${projectTitle(task.projectId)} / ${userName(task.assignedToId)} / due ${task.dueDate}`,
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
                    <p className="mt-1 text-xs text-studio-400">{projectTitle(task.projectId)} / {userName(task.assignedToId)} / due {task.dueDate}</p>
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
            <p className="mt-1 text-[13px] text-studio-300">Open Projects for the complete active project list, or switch to the Development Slate for incoming opportunities.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TableLink href="/projects">Open Projects</TableLink>
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
  currentUser,
  onCreateProject,
  onStatusChange
}: {
  projects: HammerProject[];
  currentUser: ReturnType<typeof hammerUserByEmail>;
  onCreateProject: (draft: Partial<ProjectDraft>) => void;
  onStatusChange: (projectId: string, status: HammerProjectStatus) => void;
}) {
  const canCreateProject = currentUser.role === "ADMIN";
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

  const visibleUsers = hammerUsers.filter((user) => !localUserStates[user.id]?.deleted);

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

  function deleteUser(user: HammerUser) {
    if (user.id === currentUser.id) return;
    if (!window.confirm(`Delete ${user.name}? This removes the user from the demo admin list.`)) return;
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
        <SectionHeader eyebrow="Projects" title="Create Project" />
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
            <PrimaryButton icon={Plus} label="Create Project" />
            {!canCreateProject ? <p className="text-xs text-studio-400">Project creation is available to Admins.</p> : null}
          </div>
        </form>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Projects" title="Project Status" />
        <div className="data-scroll">
          <table className="data-table min-w-[720px]">
            <thead className="text-xs uppercase tracking-[0.16em] text-studio-400"><tr><th className="py-2">Project</th><th>Current Status</th><th>Status Control</th><th>Updated</th></tr></thead>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="RBAC" title="Users and Roles" action={<GhostButton icon={UsersRound} label="Invite User" />} />
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
                        <GhostButton icon={ShieldCheck} label="Assign Role" />
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
    </div>
  );
}

function ProjectTable({ projects }: { projects: HammerProject[] }) {
  if (!projects.length) return <EmptyState label="No projects match this view." />;
  return <div className="data-scroll"><table className="data-table min-w-[620px]"><thead><tr><th>Project</th><th>Status</th><th>Owner</th><th>Updated</th></tr></thead><tbody>{projects.map((project) => <tr key={project.id} className="transition hover:bg-white/[0.035]"><td><Link className="block font-semibold text-studio-100" href={`/projects/${project.id}`}>{project.title}<p className="mt-0.5 text-xs font-normal text-studio-400">{project.genre}</p></Link></td><td><Link className="block" href={`/projects/${project.id}`}><Badge value={project.status} /></Link></td><td><Link className="block text-studio-300" href={`/projects/${project.id}`}>{userName(project.ownerId)}</Link></td><td><Link className="block text-studio-300" href={`/projects/${project.id}`}>{project.updatedAt}</Link></td></tr>)}</tbody></table></div>;
}

function TaskRows({ tasks, selectedTaskId, showAssignee = false, onUpdateTask }: { tasks: HammerTask[]; selectedTaskId?: string; showAssignee?: boolean; onUpdateTask?: (taskId: string, patch: Partial<Pick<HammerTask, "priority" | "status">>) => void }) {
  const gridClass = showAssignee ? "md:grid-cols-[1fr_130px_120px_110px_100px]" : "md:grid-cols-[1fr_120px_110px_100px]";
  return (
    <div className="data-scroll-list grid gap-2">
      <div className={cn("hidden px-2.5 text-[11px] uppercase tracking-[0.12em] text-studio-400 md:grid", gridClass)}>
        <span>Task</span>
        {showAssignee ? <span>Assignee</span> : null}
        <span>Priority</span>
        <span>Progress</span>
        <span>Due</span>
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
          {showAssignee ? <p className="text-xs font-semibold text-studio-300">{userName(task.assignedToId)}</p> : null}
          {onUpdateTask ? (
            <TaskInlineSelect label="Priority" value={task.priority} options={["LOW", "MEDIUM", "HIGH", "URGENT"]} onChange={(value) => onUpdateTask(task.id, { priority: value as TaskPriority })} />
          ) : <Badge value={task.priority} />}
          {onUpdateTask ? (
            <TaskInlineSelect label="Progress" value={task.status} options={["TODO", "IN_PROGRESS", "DONE", "ON_HOLD", "REVIEW"]} onChange={(value) => onUpdateTask(task.id, { status: value as TaskStatus })} />
          ) : <Badge value={task.status} />}
          <p className="text-xs text-studio-300">{task.dueDate}</p>
        </div>
      ))}
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

function CommentsPanel({ targetId }: { targetId: string }) {
  const comments = hammerComments.filter((comment) => comment.targetId === targetId);
  return <Panel><SectionHeader eyebrow="Notes" title="Comments" />{comments.length ? comments.map((comment) => <div key={comment.id} className="mb-2 rounded border border-white/10 bg-white/[0.03] p-2.5 text-[13px] text-studio-300"><p>{comment.body}</p><p className="mt-1.5 text-[11px] text-studio-500">{userName(comment.createdById)} / {comment.visibility}</p></div>) : <EmptyState label="No comments yet." />}<textarea className="field mt-2.5 min-h-16" placeholder="Add a comment" /></Panel>;
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
  return role === "ADMIN" || role === "PRODUCER" || role === "EXECUTIVE";
}

function canManageScriptLibrary(role?: string) {
  return role === "ADMIN" || role === "PRODUCER" || role === "EXECUTIVE";
}

function canViewAllProjects(role?: string) {
  return role === "ADMIN" || role === "EXECUTIVE";
}

function canAccessScriptDocument(user: ReturnType<typeof hammerUserByEmail>, document: HammerDocument) {
  if (canManageScriptLibrary(user.role)) return true;
  if (!document.projectId) return false;
  return assignedProjectsForUser(user.id).some((project) => project.id === document.projectId);
}

function canViewContacts(role?: string) {
  return role === "ADMIN" || role === "PRODUCER" || role === "EXECUTIVE";
}

function normalizeScriptSection(section?: string): ScriptLibrarySection | undefined {
  if (section === "inbox" || section === "projects" || section === "all") return section;
  return undefined;
}

function projectTitleFromList(projectId: string, projects: HammerProject[]) {
  return projects.find((project) => project.id === projectId)?.title ?? projectTitle(projectId);
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
    return {
      id: externalId || `lead-demo-${index + 1}`,
      title: record.title || "Untitled Slate Item",
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
    projects: "Projects",
    "project-new": "New Project",
    "project-detail": context.project.title,
    "project-documents": context.project.title,
    "project-assets": context.project.title,
    scripts: "Script Library",
    "script-detail": context.document.title,
    "script-versions": "Version History",
    "script-diff": "Version Diff",
    "script-breakdown": "Script Breakdown",
    assets: "Assets",
    "asset-detail": context.asset.title,
    tasks: "Tasks",
    contacts: "Contacts",
    reviews: "Reviews",
    executive: "Executive",
    "admin-users": "Admin"
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
  const breadcrumbs = accessDenied ? [{ label: "Scripts", href: "/scripts" }, { label: "Access Required" }] : breadcrumbsForView(view, { project, document, asset });
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
  const scriptTrail = [{ label: "Scripts", href: "/scripts" }, { label: context.document.title, href: `/scripts/${context.document.id}` }];
  const projectTrail = [{ label: "Projects", href: "/projects" }, { label: context.project.title, href: `/projects/${context.project.id}` }];

  if (view === "script-detail") return scriptTrail;
  if (view === "script-versions") return [...scriptTrail, { label: "Versions" }];
  if (view === "script-diff") return [...scriptTrail, { label: "Diff" }];
  if (view === "script-breakdown") return [...scriptTrail, { label: "Breakdown" }];
  if (view === "project-detail") return projectTrail;
  if (view === "project-documents") return [...projectTrail, { label: "Documents" }];
  if (view === "project-assets") return [...projectTrail, { label: "Assets" }];
  if (view === "asset-detail") return [{ label: "Assets", href: "/assets" }, { label: context.asset.title }];
  if (view === "project-new") return [{ label: "Admin", href: "/admin/users" }, { label: "New Project" }];
  if (view === "admin-users") return [{ label: "Admin" }, { label: "Users" }];
  return [{ label: "GreenLight" }, { label: titleForView(view, context) }];
}

function backHrefForView(view: HammerView, context: { project: HammerProject; document: typeof hammerDocuments[number]; asset: typeof hammerAssets[number] }) {
  if (["script-versions", "script-diff", "script-breakdown"].includes(view)) return `/scripts/${context.document.id}`;
  if (view === "script-detail") return "/scripts";
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
