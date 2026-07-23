"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, ClipboardList, ContactRound, FileBarChart2, FolderKanban, Layers3, LayoutDashboard, LibraryBig, LogOut, Moon, Settings2, Sun, UserRound } from "lucide-react";
import {
  assignedProjectsForUser,
  HAMMER_DOCUMENT_PROJECT_OVERRIDES_STORAGE_KEY,
  HAMMER_ACTIVE_PROJECT_EVENT,
  HAMMER_ACTIVE_PROJECT_STORAGE_KEY,
  HAMMER_DEMO_USER_EVENT,
  HAMMER_DEMO_USER_STORAGE_KEY,
  HAMMER_LOCAL_PROJECTS_EVENT,
  HAMMER_LOCAL_DOCUMENTS_EVENT,
  HAMMER_LOCAL_DOCUMENTS_STORAGE_KEY,
  HAMMER_LOCAL_PROJECTS_STORAGE_KEY,
  HAMMER_LOCAL_USER_STATES_EVENT,
  HAMMER_LOCAL_USER_STATES_STORAGE_KEY,
  hammerDocuments,
  hammerProjects,
  hammerUsers,
  hammerUserByEmail,
  statusLabel,
  type HammerUser,
  type HammerProject,
  type HammerDocument
} from "@/lib/hammer-data";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Development Slate", icon: FolderKanban },
  { href: "/prospects", label: "Prospects", icon: LibraryBig },
  { href: "/collections", label: "Collections", icon: Layers3 },
  { href: "/tasks", label: "Tasks", icon: ClipboardList }
];

const contactsNavItem = { href: "/contacts", label: "Contacts", icon: ContactRound };
const executiveNavItem = { href: "/executive", label: "Executive", icon: BarChart3 };
const reportsNavItem = { href: "/reports", label: "Reports", icon: FileBarChart2 };
const adminNavItem = { href: "/admin/users", label: "Admin", icon: Settings2 };
const accountNavItem = { href: "/account", label: "Account", icon: UserRound };
const HAMMER_THEME_STORAGE_KEY = "hammer-os-theme";
type ThemeMode = "dark" | "light";
type AuthMode = "loading" | "database" | "demo";
type LocalUserState = Record<string, { inactive?: boolean; deleted?: boolean }>;

const emptyShellProject: HammerProject = {
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

interface ShellUser {
  name: string;
  email: string;
  appRole: string;
}

function toShellUser(user: HammerUser): ShellUser {
  return {
    name: user.name,
    email: user.email,
    appRole: user.role
  };
}

function shellUserToHammerUser(user: ShellUser | null): HammerUser {
  const fallback = hammerUserByEmail(user?.email);
  if (!user) return fallback;
  return {
    ...fallback,
    email: user.email,
    name: user.name,
    role: hammerRoleForShellRole(user.appRole) ?? fallback.role
  };
}

function hammerRoleForShellRole(role?: string): HammerUser["role"] | undefined {
  if (role === "admin" || role === "ADMIN") return "ADMIN";
  if (role === "executive" || role === "EXECUTIVE") return "EXECUTIVE";
  if (role === "producer" || role === "PRODUCER") return "PRODUCER";
  if (role === "department_lead" || role === "DEVELOPMENT") return "DEVELOPMENT";
  return undefined;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [projectPreferenceLoaded, setProjectPreferenceLoaded] = useState(false);
  const [localProjects, setLocalProjects] = useState<HammerProject[]>([]);
  const [localDocuments, setLocalDocuments] = useState<HammerDocument[]>([]);
  const [documentProjectOverrides, setDocumentProjectOverrides] = useState<Record<string, string | null>>({});
  const [localUserStates, setLocalUserStates] = useState<LocalUserState>({});
  const [user, setUser] = useState<ShellUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("loading");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const currentUser = useMemo(() => user ? shellUserToHammerUser(user) : null, [user]);
  const safeLocalProjects = useMemo(() => localProjects.filter(isValidProject), [localProjects]);
  const allProjects = useMemo(() => authMode === "demo" ? [...safeLocalProjects, ...hammerProjects.filter((project) => !safeLocalProjects.some((item) => item.id === project.id))] : [], [authMode, safeLocalProjects]);
  const assignedProjects = useMemo(() => currentUser ? assignedProjectsForUser(currentUser.id) : [], [currentUser]);
  const availableProjects = useMemo(() => {
    if (!currentUser) return [];
    if (canViewAllProjects(currentUser.role)) return allProjects;
    return uniqueProjects([...assignedProjects, ...safeLocalProjects.filter((project) => project.ownerId === currentUser.id)]);
  }, [allProjects, assignedProjects, currentUser, safeLocalProjects]);
  const activeProject = useMemo(() => availableProjects.find((project) => project.id === projectId) ?? availableProjects[0] ?? emptyShellProject, [availableProjects, projectId]);
  const allDocuments = useMemo(() => authMode === "demo" ? [...hammerDocuments, ...localDocuments].map((document) => (
    Object.prototype.hasOwnProperty.call(documentProjectOverrides, document.id)
      ? { ...document, projectId: documentProjectOverrides[document.id] ?? undefined }
      : document
  )) : [], [authMode, documentProjectOverrides, localDocuments]);
  const incomingScriptCount = allDocuments.filter((document) => isScriptLibraryDocument(document) && !document.projectId).length;
  const availableDemoUsers = hammerUsers.filter((demoUser) => !localUserStates[demoUser.id]?.inactive && !localUserStates[demoUser.id]?.deleted);
  const showProjectContext = authMode === "demo" && pathname.startsWith("/projects/") && !pathname.startsWith("/projects/new");

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await response.json();
        const mode = data.mode === "database" ? "database" : "demo";
        const storedDemoEmail = window.localStorage.getItem(HAMMER_DEMO_USER_STORAGE_KEY);
        const storedDemoUser = mode === "demo" ? hammerUsers.find((item) => item.email === storedDemoEmail) : undefined;
        setUser(storedDemoUser ? toShellUser(storedDemoUser) : data.user ?? data.demoUser ?? null);
        setAuthMode(mode);
      } catch {
        setUser(toShellUser(hammerUsers[0]));
        setAuthMode("demo");
      }
    }

    loadSession();
  }, []);

  useEffect(() => {
    if (authMode !== "demo") return;

    function loadLocalUserStates() {
      try {
        const storedUserStates = window.localStorage.getItem(HAMMER_LOCAL_USER_STATES_STORAGE_KEY);
        setLocalUserStates(storedUserStates ? JSON.parse(storedUserStates) as LocalUserState : {});
      } catch {
        setLocalUserStates({});
      }
    }

    loadLocalUserStates();
    window.addEventListener(HAMMER_LOCAL_USER_STATES_EVENT, loadLocalUserStates);
    window.addEventListener("storage", loadLocalUserStates);
    return () => {
      window.removeEventListener(HAMMER_LOCAL_USER_STATES_EVENT, loadLocalUserStates);
      window.removeEventListener("storage", loadLocalUserStates);
    };
  }, [authMode]);

  useEffect(() => {
    if (authMode !== "demo") return;

    function loadLocalDocuments() {
      try {
        const storedDocuments = window.localStorage.getItem(HAMMER_LOCAL_DOCUMENTS_STORAGE_KEY);
        const storedProjectOverrides = window.localStorage.getItem(HAMMER_DOCUMENT_PROJECT_OVERRIDES_STORAGE_KEY);
        setLocalDocuments(storedDocuments ? JSON.parse(storedDocuments) as HammerDocument[] : []);
        setDocumentProjectOverrides(storedProjectOverrides ? JSON.parse(storedProjectOverrides) as Record<string, string | null> : {});
      } catch {
        setLocalDocuments([]);
        setDocumentProjectOverrides({});
      }
    }

    loadLocalDocuments();
    window.addEventListener(HAMMER_LOCAL_DOCUMENTS_EVENT, loadLocalDocuments);
    window.addEventListener("storage", loadLocalDocuments);
    return () => {
      window.removeEventListener(HAMMER_LOCAL_DOCUMENTS_EVENT, loadLocalDocuments);
      window.removeEventListener("storage", loadLocalDocuments);
    };
  }, [authMode]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(HAMMER_THEME_STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      document.documentElement.dataset.theme = storedTheme;
    }
  }, []);

  function changeTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(HAMMER_THEME_STORAGE_KEY, nextTheme);
  }

  useEffect(() => {
    if (authMode !== "demo") return;

    function loadLocalProjects() {
      try {
        const storedProjects = window.localStorage.getItem(HAMMER_LOCAL_PROJECTS_STORAGE_KEY);
        setLocalProjects(storedProjects ? JSON.parse(storedProjects) as HammerProject[] : []);
      } catch {
        setLocalProjects([]);
      }
    }

    loadLocalProjects();
    window.addEventListener(HAMMER_LOCAL_PROJECTS_EVENT, loadLocalProjects);
    window.addEventListener("storage", loadLocalProjects);
    return () => {
      window.removeEventListener(HAMMER_LOCAL_PROJECTS_EVENT, loadLocalProjects);
      window.removeEventListener("storage", loadLocalProjects);
    };
  }, [authMode]);

  useEffect(() => {
    if (authMode !== "demo") return;

    function handleDemoUserChange(event: Event) {
      const email = (event as CustomEvent<{ email?: string }>).detail?.email;
      const demoUser = hammerUsers.find((item) => item.email === email);
      if (demoUser) setUser(toShellUser(demoUser));
    }

    window.addEventListener(HAMMER_DEMO_USER_EVENT, handleDemoUserChange);
    return () => window.removeEventListener(HAMMER_DEMO_USER_EVENT, handleDemoUserChange);
  }, [authMode]);

  useEffect(() => {
    if (authMode !== "demo") return;
    const routeProjectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];
    if (routeProjectId && availableProjects.some((project) => project.id === routeProjectId) && routeProjectId !== projectId) {
      setProjectId(routeProjectId);
    }
  }, [authMode, availableProjects, pathname, projectId]);

  useEffect(() => {
    if (authMode !== "demo") return;
    if (projectPreferenceLoaded || pathname.startsWith("/projects/")) return;
    const storedProjectId = window.localStorage.getItem(HAMMER_ACTIVE_PROJECT_STORAGE_KEY);
    if (storedProjectId && availableProjects.some((project) => project.id === storedProjectId)) {
      setProjectId(storedProjectId);
    }
    setProjectPreferenceLoaded(true);
  }, [authMode, availableProjects, pathname, projectPreferenceLoaded]);

  useEffect(() => {
    if (authMode !== "demo") return;
    if (activeProject && activeProject.id !== projectId && !availableProjects.some((project) => project.id === projectId)) {
      setProjectId(activeProject.id);
    }
  }, [authMode, activeProject, availableProjects, projectId]);

  useEffect(() => {
    if (authMode !== "demo") return;
    if (!projectId || !availableProjects.some((project) => project.id === projectId)) return;
    const routeProjectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];
    if (routeProjectId && routeProjectId !== projectId) return;
    if (!routeProjectId && !projectPreferenceLoaded) return;
    window.localStorage.setItem(HAMMER_ACTIVE_PROJECT_STORAGE_KEY, projectId);
    window.dispatchEvent(new CustomEvent(HAMMER_ACTIVE_PROJECT_EVENT, { detail: { projectId } }));
  }, [authMode, availableProjects, pathname, projectId, projectPreferenceLoaded]);

  function changeProject(nextProjectId: string) {
    setProjectId(nextProjectId);
    const projectRoute = pathname.match(/^\/projects\/[^/]+(\/.*)?$/);
    if (projectRoute) {
      router.push(`/projects/${nextProjectId}${projectRoute[1] ?? ""}`);
    }
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 w-[60px] border-r border-white/10 bg-[#303633] backdrop-blur md:w-56">
        <div className="flex h-full flex-col px-2 py-3 md:px-3">
          <div className="flex items-center gap-1.5">
            <Link href="/dashboard" className="logo-mark-tile flex h-10 min-w-0 flex-1 items-center justify-center rounded-md border border-emerald-900/35 bg-[#303633] px-2 shadow-sm">
              <span className="text-base font-black leading-none text-amberline [-webkit-text-stroke:0.75px_#064e3b] md:hidden">G</span>
              <span className="hidden truncate font-sans text-[21px] font-black leading-none tracking-normal [-webkit-text-stroke:0.75px_#064e3b] md:inline">
                <span className="text-amberline">Green</span>
                <span className="text-black">Light</span>
              </span>
            </Link>
            <ThemeToggle theme={theme} onChange={changeTheme} />
          </div>

          <nav className="mt-4 space-y-0.5">
            {[
              ...navItems,
              ...(currentUser?.role === "EXECUTIVE" || currentUser?.role === "ADMIN" ? [executiveNavItem] : []),
              ...(currentUser && canViewReports(currentUser.role) ? [reportsNavItem] : []),
              ...(currentUser && canViewContacts(currentUser.role) ? [contactsNavItem] : []),
            ].map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    title={item.label}
                    className={cn(
                      "group relative flex h-9 items-center justify-center gap-2 rounded-md border border-transparent px-2 text-[13px] text-studio-300 transition hover:bg-white/[0.055] hover:text-studio-100 md:justify-start md:px-2.5",
                      active && "border-emerald-300/20 bg-emerald-400/15 text-studio-100 shadow-[inset_0_0_0_1px_rgba(81,208,138,0.08)]"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active && "text-amberline")} />
                    <span className="hidden md:inline">{item.label}</span>
                    {active ? <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-amberline" /> : null}
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3">
            {currentUser?.role === "ADMIN" ? (
              <nav className="border-t border-white/10 pt-3">
                {(() => {
                const active = pathname === adminNavItem.href || pathname.startsWith(`${adminNavItem.href}/`);
                const Icon = adminNavItem.icon;
                return (
                  <Link
                    href={adminNavItem.href}
                    title={adminNavItem.label}
                    className={cn(
                      "group relative flex h-9 items-center justify-center gap-2 rounded-md px-2 text-[13px] text-studio-400 transition hover:bg-white/[0.04] hover:text-studio-100 md:justify-start md:px-2.5",
                      active && "bg-white/[0.06] text-amberline"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="hidden md:inline">{adminNavItem.label}</span>
                    {active ? <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-amberline" /> : null}
                  </Link>
                );
                })()}
              </nav>
            ) : null}
            <nav className={cn(currentUser?.role === "ADMIN" ? "" : "border-t border-white/10 pt-3")}>
              {(() => {
                const active = pathname === accountNavItem.href || pathname.startsWith(`${accountNavItem.href}/`);
                const Icon = accountNavItem.icon;
                return (
                  <Link
                    href={accountNavItem.href}
                    title={accountNavItem.label}
                    className={cn(
                      "group relative flex h-9 items-center justify-center gap-2 rounded-md px-2 text-[13px] text-studio-400 transition hover:bg-white/[0.04] hover:text-studio-100 md:justify-start md:px-2.5",
                      active && "bg-white/[0.06] text-amberline"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="hidden md:inline">{accountNavItem.label}</span>
                    {active ? <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-amberline" /> : null}
                  </Link>
                );
              })()}
            </nav>
          <div className="hidden md:block">
            <SessionPanel user={user} mode={authMode} demoUsers={availableDemoUsers} onDemoUserChange={setUser} />
          </div>
          </div>
        </div>
      </aside>

      <main className="ml-[60px] px-3 py-3 md:ml-56 md:px-4 md:py-4 xl:px-5">
        <div className="mx-auto max-w-[1320px]">
          {showProjectContext ? (
            <ProjectTopBar activeProject={activeProject} projects={availableProjects} onChange={changeProject} user={user} mode={authMode} />
          ) : (
            <WorkspaceTopBar user={user} mode={authMode} />
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

function WorkspaceTopBar({ user, mode }: { user: ShellUser | null; mode: AuthMode }) {
  return (
    <div className="mb-4 flex items-center justify-end border-b border-white/10 pb-3">
      <div className="hidden items-center gap-2 text-right md:flex">
        <div>
          <p className="text-[13px] font-semibold text-studio-100">{user?.name ?? (mode === "loading" ? "Loading" : "Signed out")}</p>
          <p className="font-display text-[10px] uppercase tracking-[0.12em] text-studio-400">{mode === "loading" ? "Workspace" : mode === "demo" ? "Demo" : user?.appRole ?? "Signed out"}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300">
          <UserRound className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function ProjectTopBar({
  activeProject,
  projects,
  onChange,
  user,
  mode
}: {
  activeProject: HammerProject;
  projects: HammerProject[];
  onChange: (projectId: string) => void;
  user: ShellUser | null;
  mode: AuthMode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="font-display text-[10px] uppercase tracking-[0.16em] text-studio-400">Active project</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <select
            aria-label="Active project"
            className="min-w-[220px] rounded-md border border-white/10 bg-studio-950 px-2.5 py-1.5 text-[13px] font-semibold text-studio-100 outline-none transition focus:border-sky-400/60"
            data-testid="active-project-select"
            value={activeProject.id}
            onChange={(event) => onChange(event.target.value)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          <ShellBadge value={activeProject.status} />
        </div>
      </div>
      <div className="hidden items-center gap-2 text-right md:flex">
        <div>
          <p className="text-[13px] font-semibold text-studio-100">{user?.name ?? (mode === "loading" ? "Loading" : "Signed out")}</p>
          <p className="font-display text-[10px] uppercase tracking-[0.12em] text-studio-400">{mode === "loading" ? "Workspace" : mode === "demo" ? "Demo" : user?.appRole ?? "Signed out"}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-studio-300">
          <UserRound className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function ShellBadge({ value, subtle = false }: { value: string; subtle?: boolean }) {
  const tone = shellToneForStatus(value);
  const styles = shellBadgeStyles[tone];
  return <span className={cn("status-badge rounded border px-2 py-1 font-display text-[11px] uppercase", subtle ? styles.subtle : styles.solid)}>{statusLabel(value)}</span>;
}

type ShellBadgeTone = "green" | "yellow" | "red" | "blue" | "purple" | "neutral";

const shellBadgeStyles: Record<ShellBadgeTone, { solid: string; subtle: string }> = {
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

function shellToneForStatus(value: string): ShellBadgeTone {
  const key = value.toUpperCase();
  if (["GREENLIGHT", "GREENLIGHT_REVIEW", "APPROVED", "DONE", "LOCKED"].includes(key)) return "green";
  if (["REVIEW", "IN_REVIEW", "INTERNAL_REVIEW", "REQUESTED", "IN_PROGRESS", "MEDIUM"].includes(key)) return "yellow";
  if (["ON_HOLD", "ARCHIVED", "PASSED", "BLOCKED", "REJECTED", "CANCELLED", "URGENT"].includes(key)) return "red";
  if (["SCRIPT", "DEVELOPMENT", "DRAFT", "OUTLINE", "TODO", "LOW", "UPLOADED", "TREATMENT"].includes(key)) return "blue";
  if (["VISDEV", "VISUAL_DEVELOPMENT", "LOOKBOOK", "PACKAGING", "ARTIST", "EXECUTIVE", "PRODUCER", "ADMIN"].includes(key)) return "purple";
  return "neutral";
}

function uniqueProjects(projects: HammerProject[]) {
  const seen = new Set<string>();
  return projects.filter((project) => {
    if (seen.has(project.id)) return false;
    seen.add(project.id);
    return true;
  });
}

function isValidProject(project: unknown): project is HammerProject {
  return Boolean(project && typeof project === "object" && "id" in project && "title" in project);
}

function canViewContacts(role: string) {
  return role === "ADMIN" || role === "PRODUCER" || role === "EXECUTIVE";
}

function canViewReports(role: string) {
  return role === "ADMIN" || role === "PRODUCER" || role === "EXECUTIVE";
}

function isScriptLibraryDocument(document: HammerDocument) {
  return ["SCRIPT", "TREATMENT", "OUTLINE", "NOTES", "COVERAGE", "BUSINESS_DOCUMENT"].includes(document.type);
}

function canViewAllProjects(role: string) {
  return role === "ADMIN" || role === "EXECUTIVE" || role === "PRODUCER";
}

function ThemeToggle({ theme, onChange }: { theme: ThemeMode; onChange: (theme: ThemeMode) => void }) {
  const nextTheme = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Moon : Sun;
  return (
    <button
      type="button"
      onClick={() => onChange(nextTheme)}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-studio-300 transition hover:border-amberline/40 hover:text-amberline"
      title={`Switch to ${nextTheme} mode`}
      aria-label={`Switch to ${nextTheme} mode`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function SessionPanel({ user, mode, demoUsers, onDemoUserChange }: { user: ShellUser | null; mode: AuthMode; demoUsers: HammerUser[]; onDemoUserChange: (user: ShellUser) => void }) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/login";
  }

  function changeDemoUser(email: string) {
    const demoUser = demoUsers.find((item) => item.email === email);
    if (!demoUser) return;
    const shellUser = toShellUser(demoUser);
    window.localStorage.setItem(HAMMER_DEMO_USER_STORAGE_KEY, email);
    window.dispatchEvent(new CustomEvent(HAMMER_DEMO_USER_EVENT, { detail: { email } }));
    onDemoUserChange(shellUser);
  }

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.025] p-2.5">
      <p className="truncate text-[13px] font-semibold text-studio-100">{user?.name ?? (mode === "loading" ? "Loading" : "Signed out")}</p>
      <p className="mt-1 truncate text-[11px] text-studio-400">{mode === "loading" ? "Preparing workspace" : mode === "demo" ? user?.appRole ?? "Demo session" : user?.email ?? "Signed out"}</p>
      {mode === "demo" ? (
        <select
          aria-label="Demo user"
          className="mt-2 w-full rounded border border-white/10 bg-studio-950 px-2 py-1.5 text-[11px] font-semibold text-studio-200 outline-none focus:border-amberline/60"
          data-testid="demo-user-select"
          value={demoUsers.some((demoUser) => demoUser.email === user?.email) ? user?.email : demoUsers[0]?.email ?? ""}
          onChange={(event) => changeDemoUser(event.target.value)}
        >
          {demoUsers.map((demoUser) => (
            <option key={demoUser.id} value={demoUser.email}>
              {demoUser.name} / {statusLabel(demoUser.role)}
            </option>
          ))}
        </select>
      ) : null}
      <div className="mt-2">
        <button type="button" onClick={logout} disabled={mode === "loading"} className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-white/10 px-2 py-1.5 text-[11px] font-semibold text-studio-300 hover:text-ember disabled:cursor-not-allowed disabled:opacity-50">
          <LogOut className="h-3.5 w-3.5" />
          Exit
        </button>
      </div>
    </div>
  );
}
