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

  it("enforces assigned-project boundaries for artists", () => {
    const artist: AuthenticatedUser = {
      id: "user_2",
      email: "artist@example.com",
      name: "Artist",
      appRole: "artist",
      projectRoles: { project_a: "artist" }
    };

    assert.equal(userCanAccessProject(artist, "project_a"), true);
    assert.equal(userCanAccessProject(artist, "project_b"), false);
    assert.equal(userCanApprove(artist, "project_a"), false);
    assert.equal(userCanManageProject(artist, "project_a"), false);
    assert.equal(userCanUploadScripts(artist, "project_a"), false);
  });

  it("keeps standard users limited to explicitly shared projects", () => {
    const standard: AuthenticatedUser = {
      id: "user_3",
      email: "standard@example.com",
      name: "Standard User",
      appRole: "standard",
      projectRoles: { project_a: "standard" }
    };

    assert.equal(userCanAccessProject(standard, "project_a"), true);
    assert.equal(userCanAccessProject(standard, "project_b"), false);
    assert.equal(userCanManageProject(standard, "project_a"), false);
    assert.equal(userCanApprove(standard, "project_a"), false);
    assert.equal(userCanUploadScripts(standard, "project_a"), false);
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

  it("allows producers and executives to cross project boundaries", () => {
    const producer: AuthenticatedUser = {
      id: "producer",
      email: "producer@example.com",
      name: "Producer",
      appRole: "producer",
      projectRoles: {}
    };
    const executive: AuthenticatedUser = {
      id: "executive",
      email: "executive@example.com",
      name: "Executive",
      appRole: "executive",
      projectRoles: {}
    };

    assert.equal(userCanAccessProject(producer, "any_project"), true);
    assert.equal(userCanManageProject(producer, "any_project"), true);
    assert.equal(userCanAccessProject(executive, "any_project"), true);
    assert.equal(userCanManageProject(executive, "any_project"), true);
  });
});
