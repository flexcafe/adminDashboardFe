import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import type { AdminRole } from "@/features/adminRoles/adminRolesApi";
import type { AdminUser } from "./adminUsersApi";

type AdminUsersTableProps = {
  users: AdminUser[];
  roles: AdminRole[];
  isLoading?: boolean;
  busyUserId?: string | null;
  onChangeRole: (userId: string, roleId: string) => Promise<void>;
  onDemote: (user: AdminUser) => Promise<void>;
};

export function AdminUsersTable({
  users,
  roles,
  isLoading = false,
  busyUserId = null,
  onChangeRole,
  onDemote,
}: AdminUsersTableProps) {
  const { t } = useTranslation();
  const [roleDraftByUserId, setRoleDraftByUserId] = useState<Record<string, string>>(
    {}
  );

  const availableRoles = useMemo(
    () => roles.filter((role) => role.id && role.name),
    [roles]
  );

  const getSelectedRoleId = (user: AdminUser) =>
    roleDraftByUserId[user.id] ?? user.adminRoleId ?? "";

  const getDisplayName = (user: AdminUser) => {
    const trimmedName = user.nickname.trim();
    if (trimmedName && trimmedName !== "Unnamed admin") return trimmedName;
    const emailPrefix = user.email.split("@")[0]?.trim();
    return emailPrefix || t("adminUsersPage.unnamedAdmin");
  };

  return (
    <div className="sliderAdsTableWrap" style={{ marginTop: "16px" }}>
      <table className="verificationTable">
        <thead>
          <tr>
            <th>{t("adminUsersPage.nicknameColumn")}</th>
            <th>{t("adminUsersPage.phoneColumn")}</th>
            <th>{t("adminUsersPage.emailColumn")}</th>
            <th>{t("adminUsersPage.currentRoleColumn")}</th>
            <th className="verificationActionCell">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={5}>
                <ApiLoadingState label={t("adminUsersPage.loading")} compact />
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div className="verificationEmptyState">{t("adminUsersPage.emptyDefault")}</div>
              </td>
            </tr>
          ) : (
            users.map((user) => {
              const selectedRoleId = getSelectedRoleId(user);
              const isBusy = busyUserId === user.id;

              return (
                <tr key={user.id}>
                  <td>
                    <div className="sliderTableTitle">{getDisplayName(user)}</div>
                  </td>
                  <td>{user.phone}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className="inlineBadge">{user.adminRoleName}</span>
                  </td>
                  <td className="verificationActionCell adminUsersActionCell">
                    <div className="adminUsersActions">
                      <select
                        className="authInput adminUsersRoleSelect"
                        value={selectedRoleId}
                        onChange={(event) =>
                          setRoleDraftByUserId((prev) => ({
                            ...prev,
                            [user.id]: event.target.value,
                          }))
                        }
                        disabled={isBusy || availableRoles.length === 0}
                      >
                        <option value="">{t("adminUsersPage.selectRole")}</option>
                        {availableRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <div className="sliderActionButtons adminUsersActionButtons">
                        <button
                          type="button"
                          className="verificationActionButton subtle"
                          disabled={isBusy || !selectedRoleId || selectedRoleId === user.adminRoleId}
                          onClick={() => void onChangeRole(user.id, selectedRoleId)}
                        >
                          {isBusy ? t("adminUsersPage.saving") : t("adminUsersPage.changeRole")}
                        </button>
                        <button
                          type="button"
                          className="verificationActionButton subtle danger"
                          disabled={isBusy}
                          onClick={() => void onDemote(user)}
                        >
                          {isBusy ? t("adminUsersPage.working") : t("adminUsersPage.demote")}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
