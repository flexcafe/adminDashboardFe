import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminRoleFormModal } from "../AdminRoleFormModal";
import type { AdminRole, Permission } from "../adminRolesApi";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === "adminRolesPage.permissionsSelectedCount") {
        return `${params?.selected} / ${params?.total} selected`;
      }

      const map: Record<string, string> = {
        "adminRolesPage.eyebrow": "Admin Roles",
        "adminRolesPage.createTitle": "Create Admin Role",
        "adminRolesPage.editTitle": "Edit Admin Role",
        "adminRolesPage.description": "Manage roles",
        "common.close": "Close",
        "adminRolesPage.nameLabel": "Role Name",
        "adminRolesPage.namePlaceholder": "Enter role name",
        "adminRolesPage.descriptionLabel": "Description",
        "adminRolesPage.descriptionPlaceholder": "Enter description",
        "adminRolesPage.activeLabel": "Active",
        "adminRolesPage.active": "Active",
        "adminRolesPage.inactive": "Inactive",
        "adminRolesPage.permissionsLabel": "Permissions",
        "adminRolesPage.loadingPermissions": "Loading permissions...",
        "common.cancel": "Cancel",
        "adminRolesPage.saving": "Saving...",
        "adminRolesPage.createSubmit": "Create Role",
        "adminRolesPage.saveChanges": "Save Changes",
        "adminRolesPage.nameRequired": "Role name is required.",
      };

      return map[key] ?? key;
    },
  }),
}));

const basePermissions: Permission[] = [
  { id: "READ_USERS", key: "READ_USERS", name: "READ_USERS", group: "USERS" },
  { id: "EDIT_USERS", key: "EDIT_USERS", name: "EDIT_USERS", group: "USERS" },
];

const baseRole: AdminRole = {
  id: "role-1",
  name: "Supervisor",
  description: "Manages users",
  permissions: ["READ_USERS"],
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("AdminRoleFormModal", () => {
  it("does not wipe in-progress form input when permissions prop refreshes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});

    const { rerender } = render(
      <AdminRoleFormModal
        isOpen={true}
        mode="edit"
        initialData={baseRole}
        permissions={basePermissions}
        isSaving={false}
        submitError={null}
        onClose={() => {}}
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByPlaceholderText("Enter role name");
    await user.clear(nameInput);
    await user.type(nameInput, "Custom Edited Role");

    const refreshedPermissions: Permission[] = [
      ...basePermissions,
      { id: "DELETE_USERS", key: "DELETE_USERS", name: "DELETE_USERS", group: "USERS" },
    ];

    rerender(
      <AdminRoleFormModal
        isOpen={true}
        mode="edit"
        initialData={baseRole}
        permissions={refreshedPermissions}
        isSaving={false}
        submitError={null}
        onClose={() => {}}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByPlaceholderText("Enter role name")).toHaveValue("Custom Edited Role");
  });

  it("submits only currently valid checked permission IDs and excludes stale IDs", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});

    const roleWithStalePermission: AdminRole = {
      ...baseRole,
      permissions: ["STALE_PERMISSION", "READ_USERS"],
    };

    render(
      <AdminRoleFormModal
        isOpen={true}
        mode="edit"
        initialData={roleWithStalePermission}
        permissions={basePermissions}
        isSaving={false}
        submitError={null}
        onClose={() => {}}
        onSubmit={onSubmit}
      />
    );

    const readUsers = screen.getByLabelText("READ USERS") as HTMLInputElement;
    const editUsers = screen.getByLabelText("EDIT USERS") as HTMLInputElement;

    expect(readUsers.checked).toBe(true);
    expect(editUsers.checked).toBe(false);

    await user.click(readUsers);
    await user.click(editUsers);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: ["EDIT_USERS"],
      })
    );
  });
});
