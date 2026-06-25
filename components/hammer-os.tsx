"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FileDiff, Gauge, MessageSquare, PackageCheck, Plus, Search, ShieldCheck, Trash2, UploadCloud, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, MetricCard, Panel, SectionHeader } from "@/components/ui";
import {
  currentVersion,
  assignedProjectsForUser,
  HAMMER_ACTIVE_PROJECT_EVENT,
  HAMMER_ACTIVE_PROJECT_STORAGE_KEY,
  HAMMER_DEMO_USER_EVENT,
  HAMMER_DEMO_USER_STORAGE_KEY,
  HAMMER_LOCAL_CONTACTS_STORAGE_KEY,
  HAMMER_LOCAL_DOCUMENTS_STORAGE_KEY,
  HAMMER_LOCAL_PROJECTS_EVENT,
  HAMMER_LOCAL_PROJECTS_STORAGE_KEY,
  HAMMER_LOCAL_VERSION_STATUS_STORAGE_KEY,
  HAMMER_LOCAL_VERSIONS_STORAGE_KEY,
  hammerApprovals,
  hammerAssetLinks,
  hammerAssets,
  hammerAuditEvents,
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
  type HammerProjectStatus,
  type HammerProject,
  type HammerUser,
  type HammerDocument,
  type HammerDocumentVersion,
  type DocumentType,
  type ScriptStatus,
  type ContactType,
  type HammerContact
} from "@/lib/hammer-data";
import { buildTextDiff } from "@/lib/hammer-diff";
import { extractPdfText } from "@/lib/pdf-parser";
import { parseScriptText } from "@/lib/script-parser";
import { cn } from "@/lib/utils";

const HAMMER_DISMISSED_BREAKDOWN_ENTITIES_STORAGE_KEY = "hammer:dismissed-breakdown-entities";
const HAMMER_DOCUMENT_PROJECT_OVERRIDES_STORAGE_KEY = "hammer:document-project-overrides";

type HammerView = "dashboard" | "projects" | "project-new" | "project-detail" | "project-documents" | "project-assets" | "scripts" | "script-detail" | "script-versions" | "script-diff" | "script-breakdown" | "assets" | "asset-detail" | "tasks" | "contacts" | "reviews" | "executive" | "admin-users";

interface SessionUser {
  email: string;
  name: string;
  appRole?: string;
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

function toSessionUser(user: HammerUser): SessionUser {
  return {
    email: user.email,
    name: user.name,
    appRole: user.role
  };
}

export function HammerOS({ view, id, selectedTaskId }: { view: HammerView; id?: string; selectedTaskId?: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState(hammerProjects);
  const [localProjects, setLocalProjects] = useState<HammerProject[]>([]);
  const [query, setQuery] = useState("");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState(hammerProjects[0]?.id ?? "");
  const [localDocuments, setLocalDocuments] = useState<HammerDocument[]>([]);
  const [localVersions, setLocalVersions] = useState<HammerDocumentVersion[]>([]);
  const [versionStatuses, setVersionStatuses] = useState<Record<string, ScriptStatus>>({});
  const [documentProjectOverrides, setDocumentProjectOverrides] = useState<Record<string, string | null>>({});
  const documents = useMemo(() => [...hammerDocuments, ...localDocuments].map((document) => (
    Object.prototype.hasOwnProperty.call(documentProjectOverrides, document.id)
      ? { ...document, projectId: documentProjectOverrides[document.id] ?? undefined }
      : document
  )), [documentProjectOverrides, localDocuments]);
  const versions = useMemo(() => [...hammerVersions, ...localVersions].map((version) => versionStatuses[version.id] ? { ...version, status: versionStatuses[version.id] } : version), [localVersions, versionStatuses]);
  const project = projects.find((item) => item.id === id) ?? projects[0];
  const document = documents.find((item) => item.id === id) ?? documents[0];
  const asset = hammerAssets.find((item) => item.id === id) ?? hammerAssets[0];
  const activeProject = projects.find((item) => item.id === activeProjectId) ?? projects[0];
  const filteredProjects = projects.filter((item) => `${item.title} ${item.genre} ${item.status}`.toLowerCase().includes(query.toLowerCase()));
  const currentUser = hammerUserByEmail(sessionUser?.email);

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await response.json();
        const storedDemoEmail = data.mode === "database" ? null : window.localStorage.getItem(HAMMER_DEMO_USER_STORAGE_KEY);
        const storedDemoUser = hammerUsers.find((item) => item.email === storedDemoEmail);
        setSessionUser(storedDemoUser ? toSessionUser(storedDemoUser) : data.user ?? data.demoUser ?? null);
      } catch {
        setSessionUser(null);
      } finally {
        setSessionLoaded(true);
      }
    }

    loadSession();
  }, []);

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
      if (storedDocuments) setLocalDocuments(JSON.parse(storedDocuments) as HammerDocument[]);
      if (storedVersions) setLocalVersions(JSON.parse(storedVersions) as HammerDocumentVersion[]);
      if (storedStatuses) setVersionStatuses(JSON.parse(storedStatuses) as Record<string, ScriptStatus>);
      if (storedProjectOverrides) setDocumentProjectOverrides(JSON.parse(storedProjectOverrides) as Record<string, string | null>);
    } catch {
      setLocalDocuments([]);
      setLocalVersions([]);
      setDocumentProjectOverrides({});
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

  function addProject(draft?: Partial<ProjectDraft>) {
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
  }

  function updateDocumentStatus(versionId: string, status: ScriptStatus) {
    setVersionStatuses((current) => {
      const next = { ...current, [versionId]: status };
      window.localStorage.setItem(HAMMER_LOCAL_VERSION_STATUS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function assignDocumentToProject(documentId: string, projectId: string) {
    setDocumentProjectOverrides((current) => {
      const next = { ...current, [documentId]: projectId };
      window.localStorage.setItem(HAMMER_DOCUMENT_PROJECT_OVERRIDES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function deleteUploadedDocument(documentId: string) {
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
    if (documentId === id) router.push("/scripts");
  }

  const scriptDetailViews: HammerView[] = ["script-detail", "script-versions", "script-diff", "script-breakdown"];
  const isScriptDetailView = scriptDetailViews.includes(view);
  const scriptAccessLoading = isScriptDetailView && !sessionLoaded;
  const scriptAccessDenied = isScriptDetailView && sessionLoaded && !canAccessScriptDocument(currentUser.role, document, activeProject.id);

  const content = (() => {
    if (scriptAccessLoading) {
      return <Panel><EmptyState label="Checking script access..." /></Panel>;
    }
    if (scriptAccessDenied) {
      return <AccessDenied title="Script access required" detail="You can only open scripts attached to your active project. Producers, executives, and admins can access the full script library." />;
    }
    if (view === "dashboard") return <Dashboard currentUser={currentUser} activeProjectId={activeProject.id} />;
    if (view === "projects") return <Projects projects={filteredProjects} />;
    if (view === "project-new") return <ProjectCreationMoved />;
    if (view === "project-detail") return <ProjectWorkspace project={project} activeTab="overview" documents={documents} versions={versions} onUpload={uploadDocumentVersion} onDelete={deleteUploadedDocument} />;
    if (view === "project-documents") return <ProjectWorkspace project={project} activeTab="documents" documents={documents} versions={versions} onUpload={uploadDocumentVersion} onDelete={deleteUploadedDocument} />;
    if (view === "project-assets") return <ProjectWorkspace project={project} activeTab="assets" />;
    if (view === "scripts") return <Scripts activeProjectId={activeProject.id} currentUser={currentUser} projects={projects} documents={documents} versions={versions} onUpload={uploadDocumentVersion} onDelete={deleteUploadedDocument} onAssignToProject={assignDocumentToProject} repositoryMode />;
    if (view === "script-detail") return <ScriptDetail documentId={document.id} documents={documents} versions={versions} onUpload={uploadDocumentVersion} onStatusChange={updateDocumentStatus} onDelete={deleteUploadedDocument} />;
    if (view === "script-versions") return <ScriptVersions documentId={document.id} versions={versions} document={document} onUpload={uploadDocumentVersion} />;
    if (view === "script-diff") return <ScriptDiff documentId={document.id} versions={versions} />;
    if (view === "script-breakdown") return <ScriptBreakdown documentId={document.id} documents={documents} versions={versions} />;
    if (view === "assets") return <Assets projectId={activeProject.id} />;
    if (view === "asset-detail") return <AssetDetail assetId={asset.id} />;
    if (view === "tasks") return <Tasks projectId={activeProject.id} selectedTaskId={selectedTaskId} currentUser={currentUser} />;
    if (view === "contacts") {
      if (!canViewContacts(currentUser.role)) return <AccessDenied title="Contacts access required" detail="Only admins, producers, and executives can view the studio contact directory." />;
      return <Contacts />;
    }
    if (view === "reviews") return <Reviews projectId={activeProject.id} />;
    if (view === "executive") return <Executive projects={projects} />;
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

function Dashboard({ currentUser, activeProjectId }: { currentUser: ReturnType<typeof hammerUserByEmail>; activeProjectId: string }) {
  const projects = canViewAllProjects(currentUser.role) ? hammerProjects : assignedProjectsForUser(currentUser.id);
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const projectIds = new Set(projects.map((project) => project.id));
  const scopedProjectIds = new Set(activeProject ? [activeProject.id] : Array.from(projectIds));
  const documents = hammerDocuments.filter((document) => document.projectId && scopedProjectIds.has(document.projectId));
  const documentIds = new Set(documents.map((document) => document.id));
  const scriptsInProgress = hammerVersions.filter((version) => documentIds.has(version.documentId) && ["DRAFT", "IN_PROGRESS", "INTERNAL_REVIEW"].includes(version.status)).length;
  const awaiting = hammerApprovals.filter((approval) => scopedProjectIds.has(approval.projectId) && approval.reviewerId === currentUser.id && approval.status === "REQUESTED").length;
  const projectTasks = hammerTasks.filter((task) => scopedProjectIds.has(task.projectId) && task.status !== "DONE" && task.status !== "ARCHIVED");
  const canViewAllTasks = canViewAllProjectTasks(currentUser.role);
  const visibleTasks = canViewAllTasks ? projectTasks : projectTasks.filter((task) => task.assignedToId === currentUser.id);
  const assignedToMe = projectTasks.filter((task) => task.assignedToId === currentUser.id).length;
  const dueSoon = visibleTasks.length;
  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.16em] text-amberline">My Dashboard</p>
            <h2 className="mt-1 text-lg font-semibold text-studio-100">{currentUser.name}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge value={currentUser.role} />
            {activeProject ? <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-studio-300">{activeProject.title}</span> : null}
          <span className="rounded border border-sky-400/30 bg-sky-400/10 px-2 py-1 text-[11px] text-sky-200">{projects.length} assigned projects</span>
          </div>
        </div>
      </Panel>
      <Panel>
        <SectionHeader eyebrow="Access" title="My Projects" />
        <ProjectTable projects={projects.slice(0, 5)} />
      </Panel>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="My Projects" value={`${projects.filter((project) => !["ARCHIVED", "PASSED"].includes(project.status)).length}`} sub="Assigned access" />
        <MetricCard label="Scripts In Progress" value={`${scriptsInProgress}`} sub="Selected project" />
        <MetricCard label="My Reviews" value={`${awaiting}`} sub="Waiting on me" />
        <MetricCard label={canViewAllTasks ? "Open Tasks" : "My Open Tasks"} value={`${dueSoon}`} sub={canViewAllTasks ? `${assignedToMe} assigned to me` : "Assigned to me"} />
      </div>
      <Panel>
        <SectionHeader eyebrow="Work" title={canViewAllTasks ? "Project Tasks" : "My Tasks"} />
        {visibleTasks.length ? <TaskRows tasks={visibleTasks} showAssignee={canViewAllTasks} /> : <EmptyState label={activeProject ? (canViewAllTasks ? `No open tasks for ${activeProject.title}. Create one when there is a next step.` : `No open tasks assigned to you for ${activeProject.title}.`) : "No open tasks for this project."} />}
      </Panel>
    </div>
  );
}

function Projects({ projects, onCreate }: { projects: HammerProject[]; onCreate?: () => void }) {
  return (
    <Panel>
      <SectionHeader eyebrow="Slate" title="Projects" action={onCreate ? <PrimaryButton icon={Plus} label="New" onClick={onCreate} /> : undefined} />
      <ProjectTable projects={projects} />
    </Panel>
  );
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
  documents = hammerDocuments,
  versions = hammerVersions,
  onUpload,
  onDelete
}: {
  project: HammerProject;
  activeTab: ProjectWorkspaceTab;
  documents?: HammerDocument[];
  versions?: HammerDocumentVersion[];
  onUpload?: (input: DocumentUploadInput) => Promise<void>;
  onDelete?: (documentId: string) => void;
}) {
  const docs = documents.filter((doc) => doc.projectId === project.id);
  const tasks = hammerTasks.filter((task) => task.projectId === project.id);
  const assets = hammerAssets.filter((asset) => asset.projectId === project.id);
  const approvals = hammerApprovals.filter((approval) => approval.projectId === project.id);
  const firstScript = docs.find((doc) => doc.type === "SCRIPT") ?? docs[0];
  const openTasks = tasks.filter((task) => task.status !== "DONE" && task.status !== "ARCHIVED");
  const pendingReviews = approvals.filter((approval) => approval.status === "REQUESTED" || approval.status === "CHANGES_REQUESTED");
  const projectIds = new Set([project.id]);
  const tabs = [
    { id: "overview", label: "Overview", href: `/projects/${project.id}` },
    { id: "documents", label: "Documents", href: `/projects/${project.id}/documents` },
    { id: "breakdown", label: "Breakdown", href: firstScript ? `/scripts/${firstScript.id}/breakdown` : `/projects/${project.id}/documents` },
    { id: "assets", label: "Assets", href: `/projects/${project.id}/assets` },
    { id: "tasks", label: "Tasks", href: "/tasks" },
    { id: "reviews", label: "Reviews", href: "/reviews" }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-white/10 bg-studio-850/60 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge value={project.status} />
              <Badge value={project.stage} subtle />
              <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-studio-300">Updated {project.updatedAt}</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-studio-100">{project.title}</h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-5 text-studio-300">{project.logline}</p>
          </div>
          <div className="grid min-w-[260px] grid-cols-2 gap-x-5 gap-y-2 text-[13px]">
            <ProjectMeta label="Type" value={project.type} />
            <ProjectMeta label="Genre" value={project.genre} />
            <ProjectMeta label="Owner" value={userName(project.ownerId)} />
            <ProjectMeta label="Stage" value={statusLabel(project.stage)} />
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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Documents" value={`${docs.length}`} sub="Scripts, treatments, business docs" />
              <MetricCard label="Open Tasks" value={`${openTasks.length}`} sub="Active project work" />
              <MetricCard label="Assets" value={`${assets.length}`} sub="Linked or uploaded" />
              <MetricCard label="Reviews" value={`${pendingReviews.length}`} sub="Awaiting decision" />
            </div>
            <Panel>
              <SectionHeader eyebrow="Next Actions" title="Project Work" />
              {openTasks.length ? <TaskRows tasks={openTasks.slice(0, 4)} /> : <EmptyState label={`No open tasks for ${project.title}. Create one when there is a next step.`} />}
            </Panel>
            <Panel>
              <SectionHeader eyebrow="Latest Files" title="Documents" action={<TableLink href={`/projects/${project.id}/documents`}>View all</TableLink>} />
              <DocumentRows docs={docs.slice(0, 3)} versions={versions} omitProject />
            </Panel>
          </div>
          <div className="space-y-4">
            <CommentsPanel targetId={project.id} />
            <ActivityPanel projectIds={projectIds} />
          </div>
        </div>
      ) : null}

      {activeTab === "documents" ? <Scripts projectId={project.id} documents={documents} versions={versions} onUpload={onUpload} onDelete={onDelete} /> : null}
      {activeTab === "assets" ? <Assets projectId={project.id} /> : null}
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
  repositoryMode?: boolean;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<"INBOX" | "ACTIVE">("INBOX");
  const [librarySearch, setLibrarySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ScriptStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "ALL">("ALL");
  const scopedProjectId = projectId ?? activeProjectId;
  const projectNameForId = (lookupProjectId?: string) => lookupProjectId ? projectTitleFromList(lookupProjectId, projects) : "Inbox";
  const scriptDocuments = documents.filter((doc) => ["SCRIPT", "TREATMENT", "OUTLINE", "NOTES", "COVERAGE", "BUSINESS_DOCUMENT"].includes(doc.type));
  const filteredDocuments = scriptDocuments.filter((doc) => {
    if (!["SCRIPT", "TREATMENT", "OUTLINE", "NOTES", "COVERAGE", "BUSINESS_DOCUMENT"].includes(doc.type)) return false;
    const version = currentVersionFor(doc.id, documents, versions);
    if (statusFilter !== "ALL" && version?.status !== statusFilter) return false;
    if (typeFilter !== "ALL" && doc.type !== typeFilter) return false;
    const haystack = `${doc.title} ${doc.writerName ?? ""} ${doc.source ?? ""} ${doc.projectId ? projectNameForId(doc.projectId) : "Inbox"} ${version?.status ?? ""}`.toLowerCase();
    return !librarySearch.trim() || haystack.includes(librarySearch.toLowerCase());
  });
  const docs = filteredDocuments.filter((doc) => !scopedProjectId || doc.projectId === scopedProjectId);
  const incomingDocs = filteredDocuments.filter((doc) => !doc.projectId);
  const activeProjectDocs = filteredDocuments.filter((doc) => doc.projectId === scopedProjectId);
  const allProjectDocs = filteredDocuments.filter((doc) => doc.projectId);
  const projectName = scopedProjectId ? projectNameForId(scopedProjectId) : undefined;
  const canManageLibrary = canManageScriptLibrary(currentUser?.role);

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
        <DocumentRows docs={docs} versions={versions} projects={projects} omitProject={Boolean(projectId)} onDelete={onDelete} emptyLabel={projectName ? `No documents for ${projectName} yet. Upload a script, treatment, outline, or coverage document.` : "No documents match this view."} />
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel>
        <SectionHeader
          eyebrow="Repository"
          title={canManageLibrary ? "Script Library" : `${projectName ?? "Project"} Scripts`}
          action={onUpload ? (
            <div className="flex flex-wrap gap-1.5">
              {canManageLibrary ? <button type="button" onClick={() => { setUploadTarget("INBOX"); setUploadOpen((open) => uploadTarget === "INBOX" ? !open : true); }} className="inline-flex items-center gap-1.5 rounded-md bg-amberline px-2.5 py-1.5 text-xs font-semibold text-studio-950 transition hover:bg-amber-300"><UploadCloud className="h-3.5 w-3.5" />Incoming</button> : null}
              <button type="button" onClick={() => { setUploadTarget("ACTIVE"); setUploadOpen((open) => uploadTarget === "ACTIVE" ? !open : true); }} className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition", canManageLibrary ? "border border-white/10 bg-white/[0.025] text-studio-200 hover:border-amberline/40 hover:text-amberline" : "bg-amberline text-studio-950 hover:bg-amber-300")}><UploadCloud className="h-3.5 w-3.5" />To Project</button>
            </div>
          ) : undefined}
        />
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

      {canManageLibrary ? (
        <ScriptLibraryPanel title="Incoming Scripts" eyebrow="Triage" count={incomingDocs.length} description="Unassigned submissions and specs that have not been attached to a project yet.">
          <DocumentRows docs={incomingDocs} versions={versions} projects={projects} showInboxMeta onDelete={onDelete} onAssignToProject={onAssignToProject} assignableProjects={projects} defaultProjectId={scopedProjectId} emptyLabel="No incoming scripts match these filters." />
        </ScriptLibraryPanel>
      ) : null}

      <ScriptLibraryPanel title="Active Project Scripts" eyebrow={projectName ?? "Selected Project"} count={activeProjectDocs.length} description={`Scripts, treatments, outlines, notes, and coverage attached to ${projectName ?? "the selected project"}.`}>
        <DocumentRows docs={activeProjectDocs} versions={versions} projects={projects} omitProject showInboxMeta={canManageLibrary} onDelete={onDelete} emptyLabel={projectName ? `No scripts for ${projectName} match these filters.` : "No scripts match the selected project."} />
      </ScriptLibraryPanel>

      {canManageLibrary ? (
        <ScriptLibraryPanel title="All Project Scripts" eyebrow="Library" count={allProjectDocs.length} description="Cross-project library for searching the full slate. Incoming scripts stay in the triage panel above.">
          <DocumentRows docs={allProjectDocs} versions={versions} projects={projects} showInboxMeta onDelete={onDelete} emptyLabel="No project scripts match these filters." />
        </ScriptLibraryPanel>
      ) : null}
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
    <div className="overflow-x-auto">
      <table className={cn("w-full text-left text-[13px]", omitProject ? "min-w-[760px]" : "min-w-[860px]")}>
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
            const selectedProjectId = assignmentDrafts[doc.id] ?? (defaultProjectId && assignableProjects.some((project) => project.id === defaultProjectId) ? defaultProjectId : assignableProjects[0]?.id ?? "");
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
                  {onAssignToProject && !doc.projectId && assignableProjects.length ? (
                    <span className="inline-flex items-center gap-1 align-middle">
                      <select
                        aria-label={`Project for ${doc.title}`}
                        className="rounded border border-white/10 bg-studio-950/70 px-1.5 py-1 text-[11px] text-studio-200 outline-none focus:border-amberline/60"
                        value={selectedProjectId}
                        onChange={(event) => setAssignmentDrafts((current) => ({ ...current, [doc.id]: event.target.value }))}
                      >
                        {assignableProjects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                      </select>
                      <button type="button" onClick={() => onAssignToProject(doc.id, selectedProjectId)} className="rounded border border-emerald-400/25 bg-emerald-400/5 px-1.5 py-1 text-[11px] font-semibold text-emerald-300 hover:border-emerald-300/50 hover:text-emerald-200">Assign</button>
                    </span>
                  ) : null}
                  {onDelete && doc.id.startsWith("doc-local-") ? <DangerButton label="Delete" onClick={() => onDelete(doc.id)} /> : null}
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
  onUpload,
  onStatusChange,
  onDelete
}: {
  documentId: string;
  documents?: HammerDocument[];
  versions?: HammerDocumentVersion[];
  onUpload?: (input: DocumentUploadInput) => Promise<void>;
  onStatusChange?: (versionId: string, status: ScriptStatus) => void;
  onDelete?: (documentId: string) => void;
}) {
  const doc = documents.find((item) => item.id === documentId) ?? documents[0];
  const version = currentVersionFor(doc.id, documents, versions);
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Panel>
        <SectionHeader
          eyebrow={doc.type}
          title={doc.title}
          action={<div className="flex flex-wrap gap-1.5"><TableLink href={`/scripts/${doc.id}/breakdown`}>Open Breakdown</TableLink>{onUpload ? <TableLink href={`/scripts/${doc.id}/versions`}>Manage versions</TableLink> : null}{onDelete && doc.id.startsWith("doc-local-") ? <DangerButton label="Delete" onClick={() => onDelete(doc.id)} /> : null}</div>}
        />
        <pre className="max-h-[520px] overflow-auto rounded-lg border border-white/10 bg-black/25 p-3 text-[13px] leading-5 text-studio-200">{version?.extractedText}</pre>
      </Panel>
      <div className="space-y-4">
        <Panel>
          <SectionHeader eyebrow="Current" title={`Version ${version?.versionNumber}`} />
          <div className="space-y-3">
            <Badge value={version?.status ?? "DRAFT"} />
            {version && onStatusChange ? (
              <select className="field" value={version.status} onChange={(event) => onStatusChange(version.id, event.target.value as ScriptStatus)}>
                {hammerScriptStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            ) : null}
            <SmallStat label="Project" value={doc.projectId ? projectTitle(doc.projectId) : "Inbox / Unassigned"} />
            <SmallStat label="Writer" value={doc.writerName ?? userName(doc.createdById)} />
            {doc.source ? <SmallStat label="Source" value={doc.source} /> : null}
            <p className="text-[13px] text-studio-300">{version?.notes}</p>
          </div>
        </Panel>
        <CommentsPanel targetId={version?.id ?? doc.id} />
      </div>
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

function Assets({ projectId }: { projectId?: string }) {
  const assets = hammerAssets.filter((asset) => !projectId || asset.projectId === projectId);
  const projectName = projectId ? projectTitle(projectId) : undefined;
  return (
    <Panel>
      <SectionHeader eyebrow={projectName ? `Showing ${projectName}` : "GCS Backed"} title="Assets" action={<PrimaryButton icon={UploadCloud} label="Upload Asset" />} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {assets.length ? assets.map((asset) => <Link key={asset.id} href={`/assets/${asset.id}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 transition hover:border-amberline/40"><div className="flex aspect-video items-center justify-center rounded-md bg-studio-950 text-amberline"><PackageCheck className="h-8 w-8" /></div><div className="mt-2.5 flex items-start justify-between gap-3"><div><h3 className="text-[13px] font-semibold text-studio-100">{asset.title}</h3><p className="mt-1 text-xs text-studio-300">{asset.description}</p></div><Badge value={asset.status} /></div><p className="mt-2 text-[11px] text-studio-400">{asset.fileName}</p></Link>) : <div className="md:col-span-2 xl:col-span-3"><EmptyState label={projectName ? `No assets for ${projectName} yet. Upload reference, keyframe, storyboard, or mood art.` : "No assets match this view."} /></div>}
      </div>
    </Panel>
  );
}

function AssetDetail({ assetId }: { assetId: string }) {
  const asset = hammerAssets.find((item) => item.id === assetId) ?? hammerAssets[0];
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

function Tasks({ projectId, compact = false, selectedTaskId, currentUser }: { projectId?: string; compact?: boolean; selectedTaskId?: string; currentUser?: ReturnType<typeof hammerUserByEmail> }) {
  const canViewAllTasks = canViewAllProjectTasks(currentUser?.role);
  const tasks = hammerTasks.filter((task) => (!projectId || task.projectId === projectId) && (canViewAllTasks || task.assignedToId === currentUser?.id));
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const projectName = projectId ? projectTitle(projectId) : undefined;
  return (
    <div className={cn("grid gap-4", selectedTask && "xl:grid-cols-[1fr_320px]")}>
      <Panel>
        <SectionHeader eyebrow={projectName ? `Showing ${projectName}` : "Tracking"} title={compact ? "Tasks" : canViewAllTasks ? "Project Tasks" : "My Tasks"} action={<PrimaryButton icon={Plus} label="New Task" />} />
        {tasks.length ? <TaskRows tasks={tasks} selectedTaskId={selectedTaskId} showAssignee={canViewAllTasks} /> : <EmptyState label={projectName ? (canViewAllTasks ? `No tasks for ${projectName}. Create one when there is a next step.` : `No tasks assigned to you for ${projectName}.`) : "No tasks match this view."} />}
      </Panel>
      {selectedTask ? <TaskDetail task={selectedTask} /> : null}
    </div>
  );
}

const contactTypes: ContactType[] = ["WRITER", "PRODUCER", "ARTIST", "EXECUTIVE", "AGENCY", "MANAGEMENT", "LEGAL", "VENDOR", "OTHER"];

function Contacts() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ContactType | "ALL">("ALL");
  const [localContacts, setLocalContacts] = useState<HammerContact[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const contacts = useMemo(() => [...hammerContacts, ...localContacts], [localContacts]);
  const filteredContacts = contacts.filter((contact) => {
    const matchesType = type === "ALL" || contact.type === type;
    const haystack = `${contact.name} ${contact.company} ${contact.title} ${contact.email} ${contact.location} ${contact.notes}`.toLowerCase();
    return matchesType && haystack.includes(search.toLowerCase());
  });
  const byType = countBy(contacts.map((contact) => contact.type));

  useEffect(() => {
    try {
      const storedContacts = window.localStorage.getItem(HAMMER_LOCAL_CONTACTS_STORAGE_KEY);
      if (storedContacts) setLocalContacts(JSON.parse(storedContacts) as HammerContact[]);
    } catch {
      setLocalContacts([]);
    }
  }, []);

  async function importContacts(file?: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      const importedContacts = parseContactsCsv(text);
      if (!importedContacts.length) {
        setImportMessage("No contacts found in CSV.");
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
    link.download = `hammer-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Contacts" value={`${contacts.length}`} sub="Studio directory" />
        <MetricCard label="Writers" value={`${byType.WRITER ?? 0}`} sub="Creative contacts" />
        <MetricCard label="Artists/Vendors" value={`${(byType.ARTIST ?? 0) + (byType.VENDOR ?? 0)}`} sub="Visual development" />
        <MetricCard label="Agencies/Reps" value={`${(byType.AGENCY ?? 0) + (byType.MANAGEMENT ?? 0)}`} sub="External partners" />
      </div>
      <Panel>
        <SectionHeader eyebrow="Directory" title="Contacts" action={<div className="flex flex-wrap gap-2"><GhostButton icon={UploadCloud} label="Import CSV" /><PrimaryButton icon={Plus} label="New Contact" /></div>} />
        <div className="mb-3 grid gap-2 md:grid-cols-[1fr_220px_220px]">
          <input className="field" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts, companies, notes" />
          <select className="field" value={type} onChange={(event) => setType(event.target.value as ContactType | "ALL")}>
            <option value="ALL">All contact types</option>
            {contactTypes.map((contactType) => <option key={contactType} value={contactType}>{statusLabel(contactType)}</option>)}
          </select>
          <button type="button" className="rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs font-semibold text-studio-200 hover:border-amberline/40 hover:text-amberline" onClick={exportContacts}>Export CSV</button>
        </div>
        <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-studio-100">CSV import</p>
              <p className="mt-0.5 text-xs text-studio-400">Columns: name, company, type, title, email, phone, location, projects, notes</p>
            </div>
            <input className="block text-xs text-studio-300 file:mr-3 file:rounded file:border-0 file:bg-studio-100 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-studio-950" type="file" accept=".csv,text/csv" onChange={(event) => importContacts(event.target.files?.[0])} />
          </div>
          {importMessage ? <p className="mt-2 text-xs text-studio-300">{importMessage}</p> : null}
        </div>
        {filteredContacts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-studio-400">
                <tr><th className="py-2">Name</th><th>Type</th><th>Company</th><th>Email</th><th>Phone</th><th>Projects</th><th>Notes</th></tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="text-studio-200">
                    <td className="py-2.5">
                      <p className="font-semibold text-studio-100">{contact.name}</p>
                      <p className="mt-0.5 text-xs text-studio-400">{contact.title} / {contact.location}</p>
                    </td>
                    <td><Badge value={contact.type} /></td>
                    <td>{contact.company}</td>
                    <td><a className="text-sky-200 hover:text-amberline" href={`mailto:${contact.email}`}>{contact.email}</a></td>
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

function Executive({ projects }: { projects: HammerProject[] }) {
  const byStatus = countBy(projects.map((project) => project.status));
  const byStage = countBy(projects.map((project) => project.stage));
  const scriptReviewApprovals = hammerApprovals.filter((approval) => approval.targetType === "DOCUMENT_VERSION" && approval.status === "REQUESTED");
  const firstScriptReview = scriptReviewApprovals[0];
  const firstReviewDocument = firstScriptReview ? hammerDocuments.find((document) => document.currentVersionId === firstScriptReview.targetId || hammerVersions.some((version) => version.id === firstScriptReview.targetId && version.documentId === document.id)) : undefined;
  const assetsAwaitingApproval = hammerAssets.filter((asset) => asset.status === "IN_REVIEW");
  const overdueTasks = hammerTasks.filter((task) => task.priority === "URGENT");
  const greenlightCandidates = projects.filter((project) => project.status === "GREENLIGHT_REVIEW");
  return (
    <div className="space-y-4">
      <Panel className="bg-white/[0.025] shadow-none">
        <p className="text-[13px] text-studio-300">Portfolio view across the full development slate. Use the active project selector for project-scoped work pages.</p>
      </Panel>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Scripts Awaiting Review" value={`${scriptReviewApprovals.length}`} sub={firstReviewDocument?.title} href={firstReviewDocument ? `/scripts/${firstReviewDocument.id}` : undefined} />
        <MetricCard label="Assets Awaiting Approval" value={`${assetsAwaitingApproval.length}`} sub={assetsAwaitingApproval[0]?.title} href={assetsAwaitingApproval[0] ? `/assets/${assetsAwaitingApproval[0].id}` : undefined} />
        <MetricCard label="Overdue Tasks" value={`${overdueTasks.length}`} sub={overdueTasks[0]?.title} href={overdueTasks[0] ? `/tasks?task=${overdueTasks[0].id}` : undefined} />
        <MetricCard label="Greenlight Candidates" value={`${greenlightCandidates.length}`} sub={greenlightCandidates[0]?.title} href={greenlightCandidates[0] ? `/projects/${greenlightCandidates[0].id}` : undefined} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel><SectionHeader eyebrow="Status" title="Projects by Status" />{Object.entries(byStatus).map(([label, count]) => <Bar key={label} label={statusLabel(label)} value={count} max={projects.length} />)}</Panel>
        <Panel><SectionHeader eyebrow="Stage" title="Projects by Stage" />{Object.entries(byStage).map(([label, count]) => <Bar key={label} label={statusLabel(label)} value={count} max={projects.length} />)}</Panel>
      </div>
      <Projects projects={projects} />
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
              {hammerUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <PrimaryButton icon={Plus} label="Create Project" />
            {!canCreateProject ? <p className="text-xs text-studio-400">Project creation is available to Admins.</p> : null}
          </div>
        </form>
      </Panel>

      <Panel>
        <SectionHeader eyebrow="Projects" title="Project Status" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="text-xs uppercase tracking-[0.16em] text-studio-400"><tr><th className="py-2">Name</th><th>Email</th><th>Global Role</th><th>Project Access</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-white/10">{hammerUsers.map((user) => <tr key={user.id}><td className="py-2.5 font-semibold text-studio-100">{user.name}</td><td className="text-studio-300">{user.email}</td><td><Badge value={user.role} /></td><td className="text-studio-300">Membership role + resource visibility</td><td><GhostButton icon={ShieldCheck} label="Assign Role" /></td></tr>)}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function ProjectTable({ projects }: { projects: HammerProject[] }) {
  if (!projects.length) return <EmptyState label="No projects match this view." />;
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[13px]"><thead className="text-[11px] uppercase tracking-[0.12em] text-studio-400"><tr><th className="py-2">Project</th><th>Status</th><th>Stage</th><th>Owner</th><th>Updated</th><th>Actions</th></tr></thead><tbody className="divide-y divide-white/10">{projects.map((project) => <tr key={project.id}><td className="py-2.5"><Link className="font-semibold text-studio-100" href={`/projects/${project.id}`}>{project.title}</Link><p className="mt-0.5 text-xs text-studio-400">{project.genre}</p></td><td><Badge value={project.status} /></td><td><Badge value={project.stage} subtle /></td><td className="text-studio-300">{userName(project.ownerId)}</td><td className="text-studio-300">{project.updatedAt}</td><td className="space-x-1.5"><TableLink href={`/projects/${project.id}/documents`}>Docs</TableLink><TableLink href={`/projects/${project.id}/assets`}>Assets</TableLink></td></tr>)}</tbody></table></div>;
}

function TaskRows({ tasks, selectedTaskId, showAssignee = false }: { tasks: HammerTask[]; selectedTaskId?: string; showAssignee?: boolean }) {
  return (
    <div className="grid gap-2">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={`/tasks?task=${encodeURIComponent(task.id)}`}
          className={cn(
            "grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5 transition hover:border-amberline/35 hover:bg-white/[0.055]",
            showAssignee ? "md:grid-cols-[1fr_130px_120px_110px_100px]" : "md:grid-cols-[1fr_120px_110px_100px]",
            selectedTaskId === task.id && "border-amberline/45 bg-amberline/10"
          )}
        >
          <div>
            <p className="text-[13px] font-semibold text-studio-100">{task.title}</p>
            <p className="mt-0.5 text-xs text-studio-300">{task.description}</p>
          </div>
          {showAssignee ? <p className="text-xs font-semibold text-studio-300">{userName(task.assignedToId)}</p> : null}
          <Badge value={task.priority} />
          <Badge value={task.status} />
          <p className="text-xs text-studio-300">{task.dueDate}</p>
        </Link>
      ))}
    </div>
  );
}

function TaskDetail({ task }: { task: HammerTask }) {
  return (
    <Panel>
      <SectionHeader eyebrow="Selected Task" title={task.title} />
      <div className="space-y-2 text-[13px] text-studio-300">
        <p>{task.description}</p>
        <SmallStat label="Project" value={projectTitle(task.projectId)} />
        <SmallStat label="Assigned To" value={userName(task.assignedToId)} />
        <SmallStat label="Due" value={task.dueDate} />
        <div className="flex flex-wrap gap-2">
          <Badge value={task.priority} />
          <Badge value={task.status} />
          <Badge value={task.targetType} />
        </div>
      </div>
    </Panel>
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

function ActivityPanel({ targetId, projectIds }: { targetId?: string; projectIds?: Set<string> }) {
  const projectTargetIds = new Set<string>([
    ...hammerDocuments.filter((document) => document.projectId && projectIds?.has(document.projectId)).map((document) => document.id),
    ...hammerVersions.filter((version) => {
      const document = hammerDocuments.find((item) => item.id === version.documentId);
      return document?.projectId ? projectIds?.has(document.projectId) : false;
    }).map((version) => version.id),
    ...hammerAssets.filter((asset) => projectIds?.has(asset.projectId)).map((asset) => asset.id),
    ...(projectIds ? Array.from(projectIds) : [])
  ]);
  const events = hammerAuditEvents
    .filter((event) => {
      if (targetId) return event.targetId === targetId;
      if (projectIds) return projectTargetIds.has(event.targetId);
      return true;
    })
    .slice(0, 5);
  return <Panel><SectionHeader eyebrow="Audit" title="Recent Activity" />{events.map((event) => <div key={event.id} className="mb-2 rounded border border-white/10 bg-white/[0.03] p-2.5"><p className="text-[13px] font-semibold text-studio-100">{statusLabel(event.action)}</p><p className="mt-0.5 text-xs text-studio-300">{event.metadata}</p><p className="mt-1.5 text-[11px] text-studio-500">{userName(event.actorUserId)} / {event.createdAt}</p></div>)}</Panel>;
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
  return <span className={cn("inline-flex rounded border px-2 py-1 font-display text-[11px] uppercase", subtle ? styles.subtle : styles.solid)}>{statusLabel(value)}</span>;
}

type BadgeTone = "green" | "yellow" | "red" | "blue" | "purple" | "neutral";

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
  if (["GREENLIGHT", "GREENLIGHT_REVIEW", "APPROVED", "DONE", "LOCKED", "CONSIDER", "PROJECT_LINKED"].includes(key)) return "green";
  if (["REVIEW", "IN_REVIEW", "INTERNAL_REVIEW", "REQUESTED", "IN_PROGRESS", "REVISION_REQUESTED", "CHANGES_REQUESTED", "MEDIUM", "READING", "COVERAGE_REQUESTED", "COVERAGE_COMPLETE"].includes(key)) return "yellow";
  if (["ON_HOLD", "ARCHIVED", "PASSED", "PASS", "BLOCKED", "REJECTED", "CANCELLED", "URGENT", "REVISION_REQUESTED"].includes(key)) return "red";
  if (["SCRIPT", "DEVELOPMENT", "DRAFT", "OUTLINE", "TODO", "LOW", "UPLOADED", "TREATMENT", "RECEIVED", "LOGGED"].includes(key)) return "blue";
  if (["VISDEV", "VISUAL_DEVELOPMENT", "LOOKBOOK", "PACKAGING", "KEYFRAME", "STORYBOARD", "ARTIST", "EXECUTIVE", "PRODUCER", "ADMIN"].includes(key)) return "purple";
  return "neutral";
}

function TableLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="rounded border border-white/10 px-1.5 py-1 text-[11px] font-semibold text-studio-300 hover:text-amberline">{children}</Link>;
}

function PrimaryButton({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick?: () => void }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-md bg-amberline px-2.5 py-1.5 text-xs font-semibold text-studio-950 transition hover:bg-amber-300"><Icon className="h-3.5 w-3.5" />{label}</button>;
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

function canAccessScriptDocument(role: string | undefined, document: HammerDocument, activeProjectId: string) {
  if (canManageScriptLibrary(role)) return true;
  return Boolean(document.projectId && document.projectId === activeProjectId);
}

function canViewContacts(role?: string) {
  return role === "ADMIN" || role === "PRODUCER" || role === "EXECUTIVE";
}

function projectTitleFromList(projectId: string, projects: HammerProject[]) {
  return projects.find((project) => project.id === projectId)?.title ?? projectTitle(projectId);
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
      projectIds: parseContactProjects(record.projects || record.project || record.projectids),
      notes: record.notes || ""
    };
  });
}

function buildContactsCsv(contacts: HammerContact[]) {
  const headers = ["name", "company", "type", "title", "email", "phone", "location", "projects", "notes"];
  const rows = contacts.map((contact) => [
    contact.name,
    contact.company,
    contact.type,
    contact.title,
    contact.email,
    contact.phone,
    contact.location,
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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
}

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
  return [{ label: "Hammer OS" }, { label: titleForView(view, context) }];
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
  if (["assets", "tasks", "reviews"].includes(view)) return activeProject.title;
  return null;
}
