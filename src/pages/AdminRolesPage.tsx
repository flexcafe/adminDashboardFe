import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AdminRoleFormModal } from "@/features/adminRoles/AdminRoleFormModal";
import {
  createAdminRole,
  deleteAdminRole,
  listAdminRoles,
  listPermissions,
  updateAdminRole,
  type AdminRole,
  type AdminRolePayload,
  type Permission,
} from "@/features/adminRoles/adminRolesApi";

// ── Inline Icons ───────────────────────────────────────────────────────────────

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a4 4 0 0 0-4 4v1.4c0 .7-.2 1.39-.58 1.98L6 12.5h12l-1.42-2.12A3.6 3.6 0 0 1 16 8.4V7a4 4 0 0 0-4-4Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const getStatusBadgeClassName = (isActive: boolean) => {
  return isActive ? "rewardsBadge completed" : "rewardsBadge rejected";
};

const formatPermissionLabel = (value: string) => {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

// ── Page Component ─────────────────────────────────────────────────────────────

export function AdminRolesPage() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalSubmitError, setModalSubmitError] = useState<string | null>(null);

  // Modal state for create/edit
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    role: AdminRole | null;
  }>({
    isOpen: false,
    mode: "create",
    role: null,
  });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AdminRole | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2200);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setPageError(null);
      setModalSubmitError(null);

      const [rolesData, permissionsData] = await Promise.all([
        listAdminRoles(),
        listPermissions(),
      ]);

      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : t("adminRolesPage.loadError")
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRoles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return roles;

    return roles.filter(
      (item) =>
        `${item.name} ${item.description ?? ""} ${item.permissions.join(" ")}`
          .toLowerCase()
          .includes(query)
    );
  }, [searchQuery, roles]);

  const permissionLabelByAlias = useMemo(() => {
    const aliases = new Map<string, string>();

    for (const permission of permissions) {
      const label = permission.name?.trim() || formatPermissionLabel(permission.key || permission.id);
      for (const alias of [permission.id, permission.key, permission.name]) {
        if (alias) {
          aliases.set(alias, label);
        }
      }
    }

    return aliases;
  }, [permissions]);

  const getPermissionLabel = useCallback(
    (value: string) => {
      return permissionLabelByAlias.get(value) || formatPermissionLabel(value) || value;
    },
    [permissionLabelByAlias]
  );

  // ── Modal submit handler ───────────────────────────────────────────────────

  const handleModalSubmit = async (payload: AdminRolePayload) => {
    try {
      setIsSaving(true);
      setPageError(null);
      setModalSubmitError(null);

      if (modalState.mode === "create") {
        await createAdminRole(payload);
        showToast(t("adminRolesPage.createdToast"));
      } else if (modalState.role) {
        await updateAdminRole(modalState.role.id, payload);
        showToast(t("adminRolesPage.updatedToast"));
      }

      setModalState({ isOpen: false, mode: "create", role: null });
      await loadData();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("adminRolesPage.saveError");
      setPageError(errorMessage);
      setModalSubmitError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete handler ─────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setModalSubmitError(null);
      await deleteAdminRole(deleteTarget.id);
      setDeleteTarget(null);
      showToast(t("adminRolesPage.deletedToast"));
      await loadData();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : t("adminRolesPage.deleteError")
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="page adminRolesPage">
      {/* Page Header */}
      <div className="pageHeader">
        <div>
          <p className="pageEyebrow">{t("adminRolesPage.eyebrow")}</p>
          <h1 className="pageTitle">{t("adminRolesPage.title")}</h1>
          <p className="pageDescription">{t("adminRolesPage.description")}</p>
        </div>
        <div className="pageHeaderActions">
          <button
            type="button"
            className="verificationActionButton subtle"
            onClick={() => {
              void loadData();
            }}
            disabled={isLoading || isSaving}
          >
            {isLoading ? t("adminRolesPage.refreshing") : t("common.refresh")}
          </button>
          <button
            type="button"
            className="verificationActionButton"
            onClick={() => {
              setModalSubmitError(null);
              setModalState({ isOpen: true, mode: "create", role: null });
            }}
          >
            <PlusIcon />
            <span>{t("adminRolesPage.create")}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-12 gap-4 mb-6">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <div className="metricCard rewardsSummaryCard">
            <div className="rewardsSummaryIcon rewardsSummaryIconIndigo">
              <ShieldIcon />
            </div>
            <div className="metricLabel">{t("adminRolesPage.totalRoles")}</div>
            <div className="metricValue">{roles.length}</div>
            <div className="metricMeta">{t("adminRolesPage.totalRolesMeta")}</div>
          </div>
        </div>
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <div className="metricCard rewardsSummaryCard">
            <div className="rewardsSummaryIcon rewardsSummaryIconSky">
              <UsersIcon />
            </div>
            <div className="metricLabel">{t("adminRolesPage.totalPermissions")}</div>
            <div className="metricValue">{permissions.length}</div>
            <div className="metricMeta">{t("adminRolesPage.totalPermissionsMeta")}</div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {pageError ? <p className="authError surfaceMessage">{pageError}</p> : null}

      {/* Roles Table */}
      <section className="card w-full" style={{ marginTop: "24px" }}>
        <div className="sliderSectionHead sliderSectionHeadSplit">
          <div>
            <h2 className="sectionTitle">{t("adminRolesPage.listTitle")}</h2>
            <p className="sectionDescription">
              {t("adminRolesPage.listDescription")}
            </p>
          </div>
          <div className="verificationSearchField sliderSearchField">
            <input
              type="search"
              className="authInput verificationSearchInput"
              placeholder={t("adminRolesPage.searchPlaceholder")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="sliderAdsTableWrap" style={{ marginTop: "16px" }}>
          <table className="verificationTable">
            <thead>
              <tr>
                <th>{t("adminRolesPage.nameColumn")}</th>
                <th>{t("adminRolesPage.descriptionColumn")}</th>
                <th>{t("adminRolesPage.permissionsColumn")}</th>
                <th>{t("rewardsPage.status")}</th>
                <th className="verificationActionCell">{t("adminRolesPage.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5}>
                    <div className="verificationEmptyState">
                      {t("adminRolesPage.loading")}
                    </div>
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="verificationEmptyState">
                      {searchQuery.trim()
                        ? t("adminRolesPage.emptySearch")
                        : t("adminRolesPage.emptyDefault")}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => (
                  <tr key={role.id}>
                    <td>
                      <div className="sliderTableTitle">{role.name}</div>
                    </td>
                    <td>
                      <div className="muted">
                        {role.description || t("adminRolesPage.noDescription")}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.length > 0 ? (
                          role.permissions.slice(0, 3).map((perm) => (
                            <span key={perm} className="inlineBadge">
                              {getPermissionLabel(perm)}
                            </span>
                          ))
                        ) : (
                          <span className="muted">
                            {t("adminRolesPage.noPermissions")}
                          </span>
                        )}
                        {role.permissions.length > 3 ? (
                          <span className="inlineBadge muted">
                            +{role.permissions.length - 3}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span className={getStatusBadgeClassName(role.isActive)}>
                        {role.isActive
                          ? t("adminRolesPage.active")
                          : t("adminRolesPage.inactive")}
                      </span>
                    </td>
                    <td className="verificationActionCell">
                      <div className="sliderActionButtons">
                        <button
                          type="button"
                          className="verificationActionButton subtle"
                          onClick={() => {
                            setModalSubmitError(null);
                            setModalState({
                              isOpen: true,
                              mode: "edit",
                              role,
                            });
                          }}
                        >
                          {t("adminRolesPage.edit")}
                        </button>
                        <button
                          type="button"
                          className="verificationActionButton subtle danger"
                          onClick={() => setDeleteTarget(role)}
                        >
                          {t("adminRolesPage.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Toast */}
      {toastMessage ? <div className="rewardsToast">{toastMessage}</div> : null}

      {/* Create / Edit Modal */}
      <AdminRoleFormModal
        key={`${modalState.mode}-${modalState.role?.id ?? "new"}-${modalState.isOpen ? "open" : "closed"}`}
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        initialData={modalState.role}
        permissions={permissions}
        isSaving={isSaving}
        submitError={modalSubmitError}
        onClose={() => {
          setModalSubmitError(null);
          setModalState({ isOpen: false, mode: "create", role: null });
        }}
        onSubmit={handleModalSubmit}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget ? (
          <motion.div
            className="sliderModalOverlay"
            role="presentation"
            onClick={() => setDeleteTarget(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <motion.div
              className="sliderConfirmDialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-role-delete-title"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.985, y: 8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
            <h2 id="admin-role-delete-title" className="sectionTitle">
              {t("adminRolesPage.deleteTitle")}
            </h2>
            <p className="sectionDescription">
              {t("adminRolesPage.deleteDescription", { name: deleteTarget.name })}
            </p>
            <div className="sliderModalActions">
              <button
                type="button"
                className="verificationActionButton subtle"
                onClick={() => setDeleteTarget(null)}
                disabled={isSaving}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="verificationActionButton danger"
                onClick={() => {
                  void handleDelete();
                }}
                disabled={isSaving}
              >
                {isSaving ? t("adminRolesPage.deleting") : t("adminRolesPage.delete")}
              </button>
            </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
