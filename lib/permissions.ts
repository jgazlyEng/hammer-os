import type { HammerRole } from "@/lib/hammer-data";

const roleRank: Record<HammerRole, number> = {
  STANDARD: 1,
  VIEWER: 1,
  CONTRACTOR: 2,
  ARTIST: 3,
  WRITER: 3,
  DEVELOPMENT: 4,
  PRODUCER: 5,
  EXECUTIVE: 6,
  ADMIN: 7
};

export function canManageUsers(role: HammerRole) {
  return role === "ADMIN";
}

export function canViewExecutive(role: HammerRole) {
  return ["ADMIN", "EXECUTIVE", "PRODUCER"].includes(role);
}

export function canUploadDocuments(role: HammerRole) {
  return roleRank[role] >= roleRank.ARTIST && role !== "VIEWER" && role !== "STANDARD";
}

export function canRunBreakdown(role: HammerRole) {
  return ["ADMIN", "PRODUCER", "EXECUTIVE"].includes(role);
}

export function canApprove(role: HammerRole) {
  return ["ADMIN", "EXECUTIVE", "PRODUCER"].includes(role);
}

export function canUploadAssets(role: HammerRole) {
  return ["ADMIN", "PRODUCER", "ARTIST"].includes(role);
}
