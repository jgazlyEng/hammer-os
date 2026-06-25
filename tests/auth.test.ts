import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSessionCookie, hashPassword, readUserFromToken, userCanAccessProject, userCanApprove, userCanManageProject, userCanUploadScripts, verifyPassword, type AuthenticatedUser } from "../lib/auth";

describe("auth helpers", () => {
  it("hashes and verifies passwords", () => {
    const encoded = hashPassword("correct horse battery staple");

    assert.equal(verifyPassword("correct horse battery staple", encoded), true);
    assert.equal(verifyPassword("wrong password", encoded), false);
  });

  it("round-trips signed session cookies", () => {
    const user: AuthenticatedUser = {
      id: "user_1",
      email: "producer@example.com",
      name: "Producer",
      appRole: "producer",
      projectRoles: { project_a: "producer" }
    };

    const token = createSessionCookie(user);
    const decoded = readUserFromToken(token);

    assert.equal(decoded?.email, user.email);
    assert.equal(decoded?.projectRoles.project_a, "producer");
  });

  it("enforces project role boundaries", () => {
    const departmentLead: AuthenticatedUser = {
      id: "user_2",
      email: "lead@example.com",
      name: "Department Lead",
      appRole: "department_lead",
      projectRoles: { project_a: "department_lead" }
    };

    assert.equal(userCanAccessProject(departmentLead, "project_a"), true);
    assert.equal(userCanAccessProject(departmentLead, "project_b"), false);
    assert.equal(userCanApprove(departmentLead, "project_a"), true);
    assert.equal(userCanManageProject(departmentLead, "project_a"), false);
    assert.equal(userCanUploadScripts(departmentLead, "project_a"), false);
  });

  it("allows admins to cross project boundaries", () => {
    const admin: AuthenticatedUser = {
      id: "admin",
      email: "admin@example.com",
      name: "Admin",
      appRole: "admin",
      projectRoles: {}
    };

    assert.equal(userCanAccessProject(admin, "any_project"), true);
    assert.equal(userCanManageProject(admin, "any_project"), true);
    assert.equal(userCanUploadScripts(admin, "any_project"), true);
  });
});
