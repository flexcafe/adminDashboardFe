import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type AdminRole,
  type AdminRolePayload,
  type Permission,
} from "./adminRolesApi";

// ── Types ──────────────────────────────────────────────────────────────────────

type AdminRoleFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialData?: AdminRole | null;
  permissions: Permission[];
  isSaving: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (payload: AdminRolePayload) => Promise<void>;
};

type FormState = {
  name: string;
  description: string;
  selectedPermissions: string[];
  isActive: boolean;
};

type FormErrors = Partial<Record<"name", string>>;

const createInitialState = (initialData?: AdminRole | null): FormState => ({
  name: initialData?.name || "",
  description: initialData?.description || "",
  selectedPermissions: initialData?.permissions || [],
  isActive: initialData?.isActive ?? true,
});

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Convert a snake_case key into a human-readable label (e.g. "MANAGE_CATEGORIES" → "Manage Categories"). */
const formatPermissionName = (name: string): string => {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const dedupePermissions = (values: string[]) => Array.from(new Set(values));

const normalizeSelectedPermissions = (
  selectedPermissions: string[],
  permissions: Permission[]
) => {
  if (selectedPermissions.length === 0) return [];

  const permissionByAlias = new Map<string, string>();
  for (const permission of permissions) {
    const aliases = [permission.id, permission.key, permission.name];
    for (const alias of aliases) {
      if (alias) {
        permissionByAlias.set(alias, permission.id);
      }
    }
  }

  const knownPermissionIds = new Set(permissions.map((permission) => permission.id));

  return dedupePermissions(
    selectedPermissions
      .map((value) => permissionByAlias.get(value))
      .filter((value): value is string => !!value && knownPermissionIds.has(value))
  );
};

// ── Component ──────────────────────────────────────────────────────────────────

export function AdminRoleFormModal({
  isOpen,
  mode,
  initialData,
  permissions,
  isSaving,
  submitError,
  onClose,
  onSubmit,
}: AdminRoleFormModalProps) {
  const { t } = useTranslation();
  const wasOpenRef = useRef(false);
  const [formState, setFormState] = useState<FormState>(() =>
    ({
      ...createInitialState(initialData),
      selectedPermissions: normalizeSelectedPermissions(
        initialData?.permissions || [],
        permissions
      ),
    })
  );
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    const openingNow = !wasOpenRef.current;
    if (!openingNow) return;

    setFormState({
      ...createInitialState(initialData),
      selectedPermissions: normalizeSelectedPermissions(
        initialData?.permissions || [],
        permissions
      ),
    });
    setErrors({});
    wasOpenRef.current = true;
  }, [initialData, permissions, mode, isOpen]);

  useEffect(() => {
    if (!isOpen || permissions.length === 0) return;

    setFormState((prev) => {
      const normalized = normalizeSelectedPermissions(prev.selectedPermissions, permissions);
      if (normalized.length === prev.selectedPermissions.length &&
        normalized.every((value, index) => value === prev.selectedPermissions[index])) {
        return prev;
      }
      return {
        ...prev,
        selectedPermissions: normalized,
      };
    });
  }, [isOpen, permissions]);

  // Group permissions by group name
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    for (const perm of permissions) {
      const group = perm.group || "General";
      if (!groups[group]) groups[group] = [];
      groups[group].push(perm);
    }
    return groups;
  }, [permissions]);

  // Count selected permissions
  const selectedCount = formState.selectedPermissions.length;
  const totalCount = permissions.length;

  if (!isOpen) return null;

  const togglePermission = (permissionId: string) => {
    setFormState((prev) => ({
      ...prev,
      selectedPermissions: prev.selectedPermissions.includes(permissionId)
        ? prev.selectedPermissions.filter((p) => p !== permissionId)
        : [...prev.selectedPermissions, permissionId],
    }));
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!formState.name.trim()) {
      next.name = t("adminRolesPage.nameRequired");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    await onSubmit({
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      permissions: formState.selectedPermissions,
      isActive: formState.isActive,
    });
  };

  return (
    <div className="sliderModalOverlay" role="presentation" onClick={onClose}>
      <div
        className="sliderModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-role-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sliderModalHeader">
          <div>
            <p className="pageEyebrow">{t("adminRolesPage.eyebrow")}</p>
            <h2 id="admin-role-modal-title" className="sectionTitle">
              {mode === "create"
                ? t("adminRolesPage.createTitle")
                : t("adminRolesPage.editTitle")}
            </h2>
            <p className="sectionDescription">{t("adminRolesPage.description")}</p>
          </div>
          <button type="button" className="sliderModalClose" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>

        <form className="sliderForm" onSubmit={handleSubmit}>
          {submitError ? (
            <p className="authError surfaceMessage">{submitError}</p>
          ) : null}

          <div className="adminRolesFormFields">
            {/* Role Name */}
            <label className="sliderFormField">
              <span className="authLabel">{t("adminRolesPage.nameLabel")}</span>
              <input
                className="authInput"
                type="text"
                value={formState.name}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, name: event.target.value }));
                }}
                onInput={() =>
                  setErrors((prev) => ({ ...prev, name: undefined }))
                }
                placeholder={t("adminRolesPage.namePlaceholder")}
              />
              {errors.name ? (
                <span className="authError">{errors.name}</span>
              ) : null}
            </label>

            {/* Description */}
            <label className="sliderFormField">
              <span className="authLabel">
                {t("adminRolesPage.descriptionLabel")}
              </span>
              <textarea
                className="authInput"
                rows={2}
                value={formState.description}
                onChange={(event) => {
                  setFormState((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }));
                }}
                placeholder={t("adminRolesPage.descriptionPlaceholder")}
              />
            </label>

            {mode === "edit" ? (
              <label className="sliderFormField sliderToggleField">
                <span className="authLabel">{t("adminRolesPage.activeLabel")}</span>
                <button
                  type="button"
                  className={
                    formState.isActive ? "sliderToggle active" : "sliderToggle"
                  }
                  onClick={() => {
                    setFormState((prev) => ({
                      ...prev,
                      isActive: !prev.isActive,
                    }));
                  }}
                >
                  <span className="sliderToggleKnob" />
                  <span className="sliderToggleLabel">
                    {formState.isActive
                      ? t("adminRolesPage.active")
                      : t("adminRolesPage.inactive")}
                  </span>
                </button>
              </label>
            ) : null}
          </div>

          {/* ── Permissions Section ──────────────────────────────────────────── */}
          <div className="adminRolesPermissionsSection">
            <div className="adminRolesPermissionsSectionHeader">
              <span className="authLabel">
                {t("adminRolesPage.permissionsLabel")}
              </span>
              <span className="adminRolesPermissionsCount">
                {t("adminRolesPage.permissionsSelectedCount", {
                  selected: selectedCount,
                  total: totalCount,
                  defaultValue: "{{selected}} / {{total}} selected",
                })}
              </span>
            </div>

            {permissions.length === 0 ? (
              <p className="muted">{t("adminRolesPage.loadingPermissions")}</p>
            ) : (
              <div className="adminRolesPermissionsGrid">
                {Object.entries(groupedPermissions).map(([group, perms]) => (
                  <div key={group} className="adminRolesPermissionGroup">
                    <div className="adminRolesPermissionGroupTitle">
                      {formatPermissionName(group)}
                    </div>
                    <div className="adminRolesPermissionItems">
                      {perms.map((perm) => {
                        const isChecked = formState.selectedPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`adminRolesPermissionItem${isChecked ? " checked" : ""}`}
                          >
                            <input
                              type="checkbox"
                              className="adminRolesPermissionCheckbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.id)}
                            />
                            <span className="adminRolesPermissionCheckboxVisual" aria-hidden="true">
                              {isChecked ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : null}
                            </span>
                            <span className="adminRolesPermissionLabel">
                              {formatPermissionName(perm.name)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sliderModalActions">
            <button
              type="button"
              className="verificationActionButton subtle"
              onClick={onClose}
              disabled={isSaving}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="verificationActionButton"
              disabled={isSaving}
            >
              {isSaving
                ? t("adminRolesPage.saving")
                : mode === "create"
                  ? t("adminRolesPage.createSubmit")
                  : t("adminRolesPage.saveChanges")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
