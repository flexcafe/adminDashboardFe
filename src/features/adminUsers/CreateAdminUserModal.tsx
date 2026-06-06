import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
          error instanceof Error ? error.message : "Failed to load roles."
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
  }, [isOpen]);

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

    if (!formState.nickname.trim()) nextErrors.nickname = "Nickname is required.";
    if (!formState.phone.trim()) {
      nextErrors.phone = "Phone is required.";
    }
    if (!formState.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(formState.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!formState.password.trim()) nextErrors.password = "Password is required.";
    if (!formState.adminRoleId) nextErrors.adminRoleId = "Role is required.";

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
                <p className="pageEyebrow">Admin users</p>
                <h2 id="create-admin-user-modal-title" className="sectionTitle">
                  Create Admin User
                </h2>
                <p className="sectionDescription">
                  Add a new admin account and assign its initial role.
                </p>
              </div>
              <button type="button" className="sliderModalClose" onClick={handleClose}>
                Close
              </button>
            </div>

            <form className="sliderForm" onSubmit={handleSubmit}>
              {submitError ? <p className="authError surfaceMessage">{submitError}</p> : null}
              {rolesError ? <p className="authError surfaceMessage">{rolesError}</p> : null}

              <div className="grid grid-cols-1 gap-4">
                <label className="sliderFormField">
                  <span className="authLabel">Nickname</span>
                  <input
                    className="authInput"
                    type="text"
                    value={formState.nickname}
                    onChange={(event) => {
                      setFormState((prev) => ({ ...prev, nickname: event.target.value }));
                      setErrors((prev) => ({ ...prev, nickname: undefined }));
                    }}
                    placeholder="Staff Manager"
                  />
                  {errors.nickname ? <span className="authError">{errors.nickname}</span> : null}
                </label>

                <label className="sliderFormField">
                  <span className="authLabel">Phone</span>
                  <input
                    className="authInput"
                    type="tel"
                    value={formState.phone}
                    onChange={(event) => {
                      setFormState((prev) => ({ ...prev, phone: event.target.value }));
                      setErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    placeholder="+959987654321"
                  />
                  {errors.phone ? <span className="authError">{errors.phone}</span> : null}
                </label>

                <label className="sliderFormField">
                  <span className="authLabel">Email</span>
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
                  <span className="authLabel">Password</span>
                  <input
                    className="authInput"
                    type="password"
                    value={formState.password}
                    onChange={(event) => {
                      setFormState((prev) => ({ ...prev, password: event.target.value }));
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    placeholder="Enter temporary password"
                  />
                  {errors.password ? <span className="authError">{errors.password}</span> : null}
                </label>

                <label className="sliderFormField">
                  <span className="authLabel">Role</span>
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
                        ? "Loading roles..."
                        : availableRoles.length === 0
                          ? "No active roles available"
                          : "Select a role"}
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="verificationActionButton"
                  disabled={isSaving}
                >
                  {isSaving ? "Creating..." : "Create Admin User"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
