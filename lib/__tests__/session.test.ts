import { describe, it, expect } from "vitest";
import { isValidRoleForUser, type UserRoles } from "../session";

describe("session role validation", () => {
  it("always allows player role", () => {
    const roles: UserRoles = {
      player: true,
      organizer: false,
      manager: false,
      admin: false,
    };
    expect(isValidRoleForUser("player", roles)).toBe(true);
    expect(isValidRoleForUser("organizer", roles)).toBe(false);
    expect(isValidRoleForUser("manager", roles)).toBe(false);
    expect(isValidRoleForUser("admin", roles)).toBe(false);
  });

  it("allows organizer and manager when enabled", () => {
    const roles: UserRoles = {
      player: true,
      organizer: true,
      manager: true,
      admin: false,
    };
    expect(isValidRoleForUser("player", roles)).toBe(true);
    expect(isValidRoleForUser("organizer", roles)).toBe(true);
    expect(isValidRoleForUser("manager", roles)).toBe(true);
    expect(isValidRoleForUser("admin", roles)).toBe(false);
  });
});
