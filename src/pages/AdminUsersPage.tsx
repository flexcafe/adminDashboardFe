import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreateAdminUserModal } from "@/features/adminUsers/CreateAdminUserModal";
import { AdminUsersTable } from "@/features/adminUsers/AdminUsersTable";
import {
  changeAdminUserRole,
  createAdminUser,
  demoteAdminUser,
  listAdminUsers,
  type AdminUser,
  type CreateAdminUserPayload,
} from "@/features/adminUsers/adminUsersApi";
import {
  listAdminRoles,
  type AdminRole,
} from "@/features/adminRoles/adminRolesApi";

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4Z" />
      <path d="m9.5 12 1.75 1.75L14.5 10.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function AdminUsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [modalSubmitError, setModalSubmitError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2200);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setPageError(null);

      const [usersData, rolesData] = await Promise.all([
        listAdminUsers(),
        listAdminRoles(),
      ]);

      setUsers(usersData);
      setRoles(rolesData);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : t("adminUsersPage.loadError")
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) =>
      `${user.nickname} ${user.phone} ${user.email} ${user.adminRoleName}`
        .toLowerCase()
        .includes(query)
    );
  }, [searchQuery, users]);

  const totalAdmins = users.length;
  const activeRoles = useMemo(
    () => roles.filter((role) => role.id && role.name).length,
    [roles]
  );

  const handleCreateAdminUser = async (payload: CreateAdminUserPayload) => {
    try {
      setIsSaving(true);
      setPageError(null);
      setModalSubmitError(null);
      await createAdminUser(payload);
      setIsCreateModalOpen(false);
      showToast(t("adminUsersPage.createdToast"));
      await loadData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("adminUsersPage.createError");
      setPageError(message);
      setModalSubmitError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeRole = async (userId: string, roleId: string) => {
    try {
      setBusyUserId(userId);
      setPageError(null);
      await changeAdminUserRole(userId, { adminRoleId: roleId });
      showToast(t("adminUsersPage.roleUpdatedToast"));
      await loadData();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : t("adminUsersPage.roleUpdateError")
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDemote = async (user: AdminUser) => {
    const confirmed = window.confirm(
      t("adminUsersPage.demoteConfirm", { name: user.nickname })
    );
    if (!confirmed) return;

    try {
      setBusyUserId(user.id);
      setPageError(null);
      await demoteAdminUser(user.id);
      showToast(t("adminUsersPage.demotedToast"));
      await loadData();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : t("adminUsersPage.demoteError")
      );
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <section className="page adminUsersPage">
      <div className="pageHeader">
        <div>
          <p className="pageEyebrow">{t("adminUsersPage.eyebrow")}</p>
          <h1 className="pageTitle">{t("adminUsersPage.title")}</h1>
          <p className="pageDescription">{t("adminUsersPage.description")}</p>
        </div>
        <div className="pageHeaderActions">
          <button
            type="button"
            className="verificationActionButton subtle"
            onClick={() => {
              void loadData();
            }}
            disabled={isLoading || isSaving || !!busyUserId}
          >
            {isLoading ? t("adminUsersPage.refreshing") : t("common.refresh")}
          </button>
          <button
            type="button"
            className="verificationActionButton"
            onClick={() => {
              setModalSubmitError(null);
              setIsCreateModalOpen(true);
            }}
            disabled={isSaving}
          >
            <PlusIcon />
            <span>{t("adminUsersPage.create")}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 mb-6">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <div className="metricCard rewardsSummaryCard">
            <div className="rewardsSummaryIcon rewardsSummaryIconSky">
              <UsersIcon />
            </div>
            <div className="metricLabel">{t("adminUsersPage.totalAdminUsers")}</div>
            <div className="metricValue">{totalAdmins}</div>
            <div className="metricMeta">{t("adminUsersPage.totalAdminUsersMeta")}</div>
          </div>
        </div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <div className="metricCard rewardsSummaryCard">
            <div className="rewardsSummaryIcon rewardsSummaryIconIndigo">
              <ShieldIcon />
            </div>
            <div className="metricLabel">{t("adminUsersPage.activeRoles")}</div>
            <div className="metricValue">{activeRoles}</div>
            <div className="metricMeta">{t("adminUsersPage.activeRolesMeta")}</div>
          </div>
        </div>
      </div>

      {pageError ? <p className="authError surfaceMessage">{pageError}</p> : null}

      <section className="card w-full" style={{ marginTop: "24px" }}>
        <div className="sliderSectionHead sliderSectionHeadSplit">
          <div>
            <h2 className="sectionTitle">{t("adminUsersPage.listTitle")}</h2>
            <p className="sectionDescription">{t("adminUsersPage.listDescription")}</p>
          </div>
          <div className="verificationSearchField sliderSearchField">
            <input
              type="search"
              className="authInput verificationSearchInput"
              placeholder={t("adminUsersPage.searchPlaceholder")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        <AdminUsersTable
          users={filteredUsers}
          roles={roles}
          isLoading={isLoading}
          busyUserId={busyUserId}
          onChangeRole={handleChangeRole}
          onDemote={handleDemote}
        />
      </section>

      {toastMessage ? <div className="rewardsToast">{toastMessage}</div> : null}

      <CreateAdminUserModal
        isOpen={isCreateModalOpen}
        isSaving={isSaving}
        submitError={modalSubmitError}
        onClose={() => {
          setModalSubmitError(null);
          setIsCreateModalOpen(false);
        }}
        onSubmit={handleCreateAdminUser}
      />
    </section>
  );
}
