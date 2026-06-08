import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  listAdminRoles,
  type AdminRole,
} from "@/features/adminRoles/adminRolesApi";
import type { CreateAdminUserPayload } from "./adminUsersApi";

type CreateAdminUserModalProps = {
  isOpen: boolean;
  isSaving: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (payload: CreateAdminUserPayload) => Promise<void>;
};

type FormState = {
  nickname: string;
  phone: string;
  email: string;
  password: string;
  adminRoleId: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_STATE: FormState = {
  nickname: "",
  phone: "",
  email: "",
  password: "",
  adminRoleId: "",
};

export function CreateAdminUserModal({
  isOpen,
  isSaving,
  submitError,
  onClose,
  onSubmit,
}: CreateAdminUserModalProps) {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FormErrors>({});

  const availableRoles = useMemo(
    () => roles.filter((role) => role.id && role.name),
    [roles]
  );

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadRoles = async () => {
      try {
        setIsLoadingRoles(true);
        setRolesError(null);
        const nextRoles = await listAdminRoles();
        if (!isMounted) return;
        setRoles(nextRoles);
      } catch (error) {
        if (!isMounted) return;
        setRoles([]);
        setRolesError(
          error instanceof Error ? error.message : t("adminUsersPage.rolesLoadError")
        );
      } finally {
        if (isMounted) {
          setIsLoadingRoles(false);
        }
      }
    };

    void loadRoles();

    return () => {
      isMounted = false;
    };
  }, [isOpen, t]);

  const resetState = () => {
    setFormState(INITIAL_STATE);
    setErrors({});
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!formState.nickname.trim()) nextErrors.nickname = t("adminUsersPage.nicknameRequired");
    if (!formState.phone.trim()) {
      nextErrors.phone = t("adminUsersPage.phoneRequired");
    }
    if (!formState.email.trim()) {
      nextErrors.email = t("adminUsersPage.emailRequired");
    } else if (!/\S+@\S+\.\S+/.test(formState.email)) {
      nextErrors.email = t("adminUsersPage.invalidEmail");
    }
    if (!formState.password.trim()) nextErrors.password = t("adminUsersPage.passwordRequired");
    if (!formState.adminRoleId) nextErrors.adminRoleId = t("adminUsersPage.roleRequired");

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    await onSubmit({
      nickname: formState.nickname.trim(),
      phone: formState.phone.trim(),
      email: formState.email.trim(),
      password: formState.password,
      adminRoleId: formState.adminRoleId,
    });

    resetState();
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="sliderModalOverlay"
          role="presentation"
          onClick={handleClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <motion.div
            className="sliderModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-admin-user-modal-title"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: 8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="sliderModalHeader">
              <div>
                <p className="pageEyebrow">{t("adminUsersPage.eyebrow")}</p>
                <h2 id="create-admin-user-modal-title" className="sectionTitle">
                  {t("adminUsersPage.createModalTitle")}
                </h2>
                <p className="sectionDescription">{t("adminUsersPage.createModalDescription")}</p>
              </div>
              <button type="button" className="sliderModalClose" onClick={handleClose}>
                {t("common.close")}
              </button>
            </div>

            <form className="sliderForm" onSubmit={handleSubmit}>
              {submitError ? <p className="authError surfaceMessage">{submitError}</p> : null}
              {rolesError ? <p className="authError surfaceMessage">{rolesError}</p> : null}

              <div className="grid grid-cols-1 gap-4">
                <label className="sliderFormField">
                  <span className="authLabel">{t("adminUsersPage.nicknameLabel")}</span>
                  <input
                    className="authInput"
                    type="text"
                    value={formState.nickname}
                    onChange={(event) => {
                      setFormState((prev) => ({ ...prev, nickname: event.target.value }));
                      setErrors((prev) => ({ ...prev, nickname: undefined }));
                    }}
                    placeholder={t("adminUsersPage.nicknamePlaceholder")}
                  />
                  {errors.nickname ? <span className="authError">{errors.nickname}</span> : null}
                </label>

                <label className="sliderFormField">
                  <span className="authLabel">{t("common.phone")}</span>
                  <input
                    className="authInput"
                    type="tel"
                    value={formState.phone}
                    onChange={(event) => {
                      setFormState((prev) => ({ ...prev, phone: event.target.value }));
                      setErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    placeholder={t("adminUsersPage.phonePlaceholder")}
                  />
                  {errors.phone ? <span className="authError">{errors.phone}</span> : null}
                </label>

                <label className="sliderFormField">
                  <span className="authLabel">{t("common.email")}</span>
                  <input
                    className="authInput"
                    type="email"
                    value={formState.email}
                    onChange={(event) => {
                      setFormState((prev) => ({ ...prev, email: event.target.value }));
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    placeholder="name@example.com"
                  />
                  {errors.email ? <span className="authError">{errors.email}</span> : null}
                </label>

                <label className="sliderFormField">
                  <span className="authLabel">{t("adminUsersPage.passwordLabel")}</span>
                  <input
                    className="authInput"
                    type="password"
                    value={formState.password}
                    onChange={(event) => {
                      setFormState((prev) => ({ ...prev, password: event.target.value }));
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    placeholder={t("adminUsersPage.passwordPlaceholder")}
                  />
                  {errors.password ? <span className="authError">{errors.password}</span> : null}
                </label>

                <label className="sliderFormField">
                  <span className="authLabel">{t("adminUsersPage.roleLabel")}</span>
                  <select
                    className="authInput"
                    value={formState.adminRoleId}
                    onChange={(event) => {
                      setFormState((prev) => ({ ...prev, adminRoleId: event.target.value }));
                      setErrors((prev) => ({ ...prev, adminRoleId: undefined }));
                    }}
                    disabled={isLoadingRoles || availableRoles.length === 0}
                  >
                    <option value="">
                      {isLoadingRoles
                        ? t("adminUsersPage.loadingRoles")
                        : availableRoles.length === 0
                          ? t("adminUsersPage.noRoles")
                          : t("adminUsersPage.selectRole")}
                    </option>
                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  {errors.adminRoleId ? <span className="authError">{errors.adminRoleId}</span> : null}
                </label>
              </div>

              <div className="sliderModalActions">
                <button
                  type="button"
                  className="verificationActionButton subtle"
                  onClick={handleClose}
                  disabled={isSaving}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="verificationActionButton"
                  disabled={isSaving}
                >
                  {isSaving ? t("adminUsersPage.creating") : t("adminUsersPage.create")}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
