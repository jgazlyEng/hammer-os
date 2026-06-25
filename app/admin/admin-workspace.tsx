"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, ShieldCheck, Trash2, UserPlus, UsersRound } from "lucide-react";
import { EmptyState, Panel, SectionHeader } from "@/components/ui";
import { projects as seededProjects } from "@/lib/mock-data";
import type { Project } from "@/lib/types";

type AppRole = "admin" | "executive" | "producer" | "department_lead";
type ProjectRole = "owner" | "executive" | "producer" | "department_lead" | "viewer";

interface AdminMembership {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  project?: {
    id: string;
    title: string;
    stage?: string | null;
  };
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  appRole: AppRole;
  createdAt?: string;
  updatedAt?: string;
  memberships: AdminMembership[];
}

interface UserDraft {
  name: string;
  email: string;
  password: string;
  appRole: AppRole;
}

const emptyDraft: UserDraft = {
  name: "",
  email: "",
  password: "",
  appRole: "producer"
};

const appRoles: Array<{ value: AppRole; label: string; detail: string }> = [
  { value: "admin", label: "Admin", detail: "Full system and user management access." },
  { value: "executive", label: "Executive", detail: "Read executive dashboards and reports." },
  { value: "producer", label: "Producer", detail: "Manage projects, scripts, changes, and approvals." },
  { value: "department_lead", label: "Department Lead", detail: "Review approvals and department impacts." }
];

const projectRoles: Array<{ value: ProjectRole; label: string }> = [
  { value: "owner", label: "Owner" },
  { value: "producer", label: "Producer" },
  { value: "executive", label: "Executive" },
  { value: "department_lead", label: "Department Lead" },
  { value: "viewer", label: "Viewer" }
];

export function AdminWorkspace() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [projects, setProjects] = useState<Project[]>(seededProjects);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [draft, setDraft] = useState<UserDraft>(emptyDraft);
  const [membershipProjectId, setMembershipProjectId] = useState("");
  const [membershipRole, setMembershipRole] = useState<ProjectRole>("viewer");
  const [resetPassword, setResetPassword] = useState("");
  const [message, setMessage] = useState("Loading admin console...");
  const [mode, setMode] = useState<"database" | "demo">("demo");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const selectedUser = useMemo(() => users.find((user) => user.id === selectedUserId) ?? users[0] ?? null, [selectedUserId, users]);
  const roleCounts = useMemo(() => {
    return users.reduce<Record<AppRole, number>>(
      (counts, user) => {
        counts[user.appRole] += 1;
        return counts;
      },
      { admin: 0, executive: 0, producer: 0, department_lead: 0 }
    );
  }, [users]);

  useEffect(() => {
    if (!selectedUserId && users[0]) setSelectedUserId(users[0].id);
  }, [selectedUserId, users]);

  async function loadAdminData() {
    setBusy(true);
    try {
      const [usersResponse, projectsResponse] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" })
      ]);

      const usersData = await usersResponse.json();
      if (!usersResponse.ok) {
        setUsers([]);
        setMessage(usersData.error ?? "Admin access required.");
        return;
      }

      const nextUsers = Array.isArray(usersData.users) ? usersData.users : [];
      setUsers(nextUsers);
      setMode(usersData.mode === "database" ? "database" : "demo");

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        if (Array.isArray(projectsData.projects)) setProjects(projectsData.projects);
      }

      setMessage(usersData.mode === "database" ? "Admin console connected to database." : "Demo mode: configure DATABASE_URL to create users and assign memberships.");
    } catch {
      setMessage("Admin API is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not create user.");
        return;
      }
      setDraft(emptyDraft);
      setUsers((current) => [data.user, ...current]);
      setSelectedUserId(data.user.id);
      setMessage(`${data.user.name} created.`);
    } catch {
      setMessage("Could not create user.");
    } finally {
      setBusy(false);
    }
  }

  async function updateUser(user: AdminUser, patch: Partial<UserDraft>) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not update user.");
        return;
      }
      setUsers((current) => current.map((item) => (item.id === user.id ? data.user : item)));
      setMessage(`${data.user.name} updated.`);
    } catch {
      setMessage("Could not update user.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(user: AdminUser) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not delete user.");
        return;
      }
      const nextUsers = users.filter((item) => item.id !== user.id);
      setUsers(nextUsers);
      setSelectedUserId(nextUsers[0]?.id ?? "");
      setMessage(`${user.name} deleted.`);
    } catch {
      setMessage("Could not delete user.");
    } finally {
      setBusy(false);
    }
  }

  async function assignMembership(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser || !membershipProjectId) {
      setMessage("Select a user and project first.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: membershipProjectId, role: membershipRole })
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not assign membership.");
        return;
      }
      await loadAdminData();
      setMessage(`${selectedUser.name} assigned to ${data.membership.project.title}.`);
    } catch {
      setMessage("Could not assign membership.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMembership(membership: AdminMembership) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/memberships/${membership.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not remove membership.");
        return;
      }
      await loadAdminData();
      setMessage("Project access removed.");
    } catch {
      setMessage("Could not remove membership.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.24em] text-amberline">Admin Console</p>
          <h1 className="mt-2 text-3xl font-semibold text-studio-100 md:text-4xl">Users and Project Access</h1>
          <p className="mt-3 max-w-3xl text-studio-300">Create production users, set global roles, and control which films each person can access.</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-studio-850 px-4 py-3 font-display text-sm text-studio-300">
          {mode === "database" ? "Database Mode" : "Demo Mode"} / {users.length} users
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetric label="Admins" value={roleCounts.admin} />
        <AdminMetric label="Executives" value={roleCounts.executive} />
        <AdminMetric label="Producers" value={roleCounts.producer} />
        <AdminMetric label="Department Leads" value={roleCounts.department_lead} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <Panel>
            <SectionHeader eyebrow="Create User" title="New Account" />
            <form onSubmit={createUser} className="space-y-4">
              <Field label="Name">
                <input className="field" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Maya Chen" />
              </Field>
              <Field label="Email">
                <input className="field" type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="maya@example.com" />
              </Field>
              <Field label="Temporary Password">
                <input className="field" type="password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} placeholder="At least 8 characters" />
              </Field>
              <Field label="Global Role">
                <select className="field" value={draft.appRole} onChange={(event) => setDraft({ ...draft, appRole: event.target.value as AppRole })}>
                  {appRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </Field>
              <button type="submit" disabled={busy || mode === "demo"} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amberline px-4 py-3 font-semibold text-studio-950 transition hover:bg-[#f1c974] disabled:cursor-not-allowed disabled:opacity-50">
                <UserPlus className="h-4 w-4" />
                Create User
              </button>
            </form>
          </Panel>

          <Panel>
            <SectionHeader eyebrow="Role Guide" title="Access Model" />
            <div className="space-y-3">
              {appRoles.map((role) => (
                <div key={role.value} className="rounded border border-white/10 bg-white/[0.03] p-3">
                  <p className="font-semibold text-studio-100">{role.label}</p>
                  <p className="mt-1 text-sm leading-6 text-studio-300">{role.detail}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <SectionHeader eyebrow="Users" title="Production Accounts" />
            {users.length ? (
              <div className="grid gap-3">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={`rounded-lg border p-4 text-left transition ${selectedUser?.id === user.id ? "border-amberline/50 bg-amberline/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-lg font-semibold text-studio-100">{user.name}</p>
                          <RoleBadge role={user.appRole} />
                        </div>
                        <p className="mt-1 text-sm text-studio-300">{user.email}</p>
                      </div>
                      <p className="font-display text-xs uppercase tracking-[0.16em] text-studio-300">{user.memberships.length} projects</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState label="No users loaded. Sign in as an admin or configure DATABASE_URL." />
            )}
          </Panel>

          {selectedUser ? (
            <Panel>
              <SectionHeader
                eyebrow="Selected User"
                title={selectedUser.name}
                action={<RoleBadge role={selectedUser.appRole} />}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name">
                  <input disabled={mode === "demo"} className="field disabled:opacity-50" value={selectedUser.name} onChange={(event) => setUsers((current) => current.map((item) => item.id === selectedUser.id ? { ...item, name: event.target.value } : item))} />
                </Field>
                <Field label="Email">
                  <input disabled={mode === "demo"} className="field disabled:opacity-50" type="email" value={selectedUser.email} onChange={(event) => setUsers((current) => current.map((item) => item.id === selectedUser.id ? { ...item, email: event.target.value } : item))} />
                </Field>
              </div>
              <button type="button" disabled={busy || mode === "demo"} onClick={() => updateUser(selectedUser, { name: selectedUser.name, email: selectedUser.email })} className="mt-4 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-studio-100 transition hover:border-amberline/40 disabled:opacity-50">
                Save Profile
              </button>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Global Role">
                  <select className="field" value={selectedUser.appRole} onChange={(event) => updateUser(selectedUser, { appRole: event.target.value as AppRole })}>
                    {appRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                </Field>
                <Field label="Reset Password">
                  <div className="flex gap-2">
                    <input className="field" type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="New password" />
                    <button type="button" disabled={!resetPassword || busy || mode === "demo"} onClick={() => { updateUser(selectedUser, { password: resetPassword }); setResetPassword(""); }} className="inline-flex shrink-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-studio-100 transition hover:border-amberline/40 disabled:opacity-50">
                      <KeyRound className="h-4 w-4" />
                      Set
                    </button>
                  </div>
                </Field>
              </div>

              <div className="mt-6">
                <SectionHeader eyebrow="Project Memberships" title="Film Access" />
                <form onSubmit={assignMembership} className="grid gap-3 md:grid-cols-[1fr_0.7fr_auto]">
                  <select className="field" value={membershipProjectId} onChange={(event) => setMembershipProjectId(event.target.value)}>
                    <option value="">Select project</option>
                    {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                  </select>
                  <select className="field" value={membershipRole} onChange={(event) => setMembershipRole(event.target.value as ProjectRole)}>
                    {projectRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                  <button type="submit" disabled={busy || mode === "demo"} className="rounded-md bg-amberline px-4 py-3 font-semibold text-studio-950 transition hover:bg-[#f1c974] disabled:opacity-50">
                    Assign
                  </button>
                </form>

                <div className="mt-4 grid gap-3">
                  {selectedUser.memberships.length ? selectedUser.memberships.map((membership) => (
                    <div key={membership.id} className="flex flex-col gap-3 rounded border border-white/10 bg-white/[0.03] p-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-studio-100">{membership.project?.title ?? membership.projectId}</p>
                        <p className="mt-1 text-sm text-studio-300">{labelForProjectRole(membership.role)} / {membership.project?.stage ?? "Project access"}</p>
                      </div>
                      <button type="button" disabled={busy || mode === "demo"} onClick={() => removeMembership(membership)} className="inline-flex items-center justify-center gap-2 rounded border border-ember/30 bg-ember/10 px-3 py-2 text-sm font-semibold text-ember transition hover:border-ember/70 disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  )) : (
                    <EmptyState label="No project access assigned yet." />
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 md:flex-row md:items-center md:justify-between">
                <p className="text-sm leading-6 text-studio-300">Deleting a user removes memberships and keeps audit logs with nullable actor references.</p>
                <button type="button" disabled={busy || mode === "demo"} onClick={() => deleteUser(selectedUser)} className="inline-flex items-center justify-center gap-2 rounded-md border border-ember/35 bg-ember/10 px-3 py-2 text-sm font-semibold text-ember transition hover:border-ember/70 disabled:opacity-50">
                  <Trash2 className="h-4 w-4" />
                  Delete User
                </button>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      <Panel className="mt-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-amberline" />
          <div>
            <p className="font-semibold text-studio-100">Admin Status</p>
            <p className="mt-1 text-sm leading-6 text-studio-300">{message}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-display text-xs uppercase tracking-[0.16em] text-studio-300">{label}</span>
      {children}
    </label>
  );
}

function AdminMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-studio-850 p-4">
      <div className="flex items-center gap-2 font-display text-xs uppercase tracking-[0.16em] text-studio-300">
        <UsersRound className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold text-studio-100">{value}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: AppRole }) {
  const label = role.replace("_", " ");
  const tone = role === "admin" ? "border-red-300/45 bg-red-500/20 text-red-200" : role === "producer" ? "border-amberline/35 bg-amberline/10 text-amberline" : "border-signal/35 bg-signal/10 text-signal";
  return <span className={`inline-flex rounded border px-2 py-1 font-display text-[11px] uppercase ${tone}`}>{label}</span>;
}

function labelForProjectRole(role: ProjectRole) {
  return role.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}
