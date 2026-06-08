import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/Button/Button";
import type { VerificationRecord } from "@/features/kbzVerification/types";

type UserVerificationDetailProps = {
  record: VerificationRecord | null;
  adminPhoneForTransfer: string;
  instructionNote: string;
  finalAdminNote: string;
  feedback: string | null;
  feedbackType: "success" | "error" | null;
  isSubmittingInstruction: boolean;
  isSubmittingResolution: boolean;
  onAdminPhoneChange: (value: string) => void;
  onInstructionNoteChange: (value: string) => void;
  onFinalAdminNoteChange: (value: string) => void;
  onSendInstruction: (event: FormEvent<HTMLFormElement>) => void;
  onVerify: () => void;
};

const formatDateTime = (value: string | undefined, language: string, fallback: string) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(language);
};

const getHeroBadgeClassName = (status: VerificationRecord["status"]) => {
  switch (status) {
    case "REGISTERED":
      return "verificationHeroBadge registered";
    case "VERIFICATION_REQUESTED":
      return "verificationHeroBadge requested";
    case "MONEY_CHECK":
      return "verificationHeroBadge moneyCheck";
    case "VERIFIED":
      return "verificationHeroBadge verified";
    default:
      return "verificationHeroBadge";
  }
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

export function UserVerificationDetail({
  record,
  adminPhoneForTransfer,
  instructionNote,
  finalAdminNote,
  feedback,
  feedbackType,
  isSubmittingInstruction,
  isSubmittingResolution,
  onAdminPhoneChange,
  onInstructionNoteChange,
  onFinalAdminNoteChange,
  onSendInstruction,
  onVerify,
}: UserVerificationDetailProps) {
  const { i18n, t } = useTranslation();
  const [copiedField, setCopiedField] = useState<"phone" | "note" | null>(null);
  const hasRealData = !!record?.userName.trim() || !!record?.userPhoneOrEmail.trim();
  const notAvailable = t("userVerificationDetail.notAvailable");
  const noDataAvailable = t("userVerificationDetail.noDataAvailable");

  const handleCopy = async (value: string, field: "phone" | "note") => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1600);
    } catch {
      setCopiedField(null);
    }
  };

  if (!record || !hasRealData) {
    return (
      <section className="page verificationPage verificationDetailPage">
        <div className="card verificationMissingState">
          <Link to="/dashboard" className="verificationBackLink verificationBackButton">
            {t("userVerificationDetail.backToList")}
          </Link>
          <h1 className="pageTitle">{t("userVerificationDetail.notFoundTitle")}</h1>
          <p className="pageDescription">
            {t("userVerificationDetail.notFoundDescription")}
          </p>
        </div>
      </section>
    );
  }

  const canSendInstruction = record.canSendInstruction;
  const canVerify = record.canVerify;
  const isReadOnly = !canSendInstruction && !canVerify;

  return (
    <section className="page verificationPage verificationDetailPage">
      <div className="pageHeader verificationDetailHeader">
        <div>
          <Link to="/dashboard" className="verificationBackLink verificationBackButton">
            {t("userVerificationDetail.backToList")}
          </Link>
          <p className="pageEyebrow">{t("userVerificationDetail.eyebrow")}</p>
          <h1 className="pageTitle">{record.userName || t("userVerificationDetail.title")}</h1>
          <p className="pageDescription">
            {record.userPhoneOrEmail || t("userVerificationDetail.noContactInformation")}
            {record.createdAt
              ? ` - ${t("userVerificationDetail.updatedAt", {
                  value: formatDateTime(
                  record.lastActionAt || record.createdAt
                    ,
                    i18n.language,
                    notAvailable
                  ),
                })}`
              : ""}
          </p>
        </div>
        <div className={getHeroBadgeClassName(record.status)}>
          {record.statusLabel}
        </div>
      </div>

      <div className="verificationDetailLayout">
        <aside className="card verificationStepperCard">
          <div className="sectionHeader">
            <div>
              <div className="sectionTitle">{t("userVerificationDetail.flowTitle")}</div>
            </div>
          </div>
          <div className="verificationStepper">
            <div className="verificationStep">
              <div className="verificationStepMarker done">
                <CheckIcon />
              </div>
              <div className="verificationStepContent">
                <div className="verificationStepTitle">{t("userVerificationDetail.openRequest")}</div>
                <div className="verificationStepMeta">
                  {t("userVerificationDetail.openRequestMeta")}
                </div>
              </div>
            </div>
            <div className="verificationStep">
              <div
                className={
                  record.status === "VERIFIED" || record.instructionSentAt
                    ? "verificationStepMarker done"
                    : canSendInstruction
                      ? "verificationStepMarker active"
                      : "verificationStepMarker"
                }
              >
                {record.status === "VERIFIED" || record.instructionSentAt ? <CheckIcon /> : "2"}
              </div>
              <div className="verificationStepContent">
                <div className="verificationStepTitle">{t("userVerificationDetail.sendInstructionStep")}</div>
                <div className="verificationStepMeta">
                  {record.status === "VERIFIED"
                    ? t("userVerificationDetail.instructionCompleted")
                    : record.instructionSentAt
                    ? t("userVerificationDetail.sentAt", {
                        value: formatDateTime(record.instructionSentAt, i18n.language, notAvailable),
                      })
                    : t("userVerificationDetail.instructionPendingMeta")}
                </div>
              </div>
            </div>
            <div className="verificationStep">
              <div
                className={
                  record.status === "VERIFIED"
                    ? "verificationStepMarker done"
                    : canVerify
                      ? "verificationStepMarker active"
                      : "verificationStepMarker"
                }
              >
                {record.status === "VERIFIED" ? <CheckIcon /> : "3"}
              </div>
              <div className="verificationStepContent">
                <div className="verificationStepTitle">{t("userVerificationDetail.finalVerification")}</div>
                <div className="verificationStepMeta">
                  {record.status === "VERIFIED"
                    ? t("userVerificationDetail.verifiedOn", {
                        value: formatDateTime(record.lastActionAt, i18n.language, notAvailable),
                      })
                    : canVerify
                      ? t("userVerificationDetail.finalVerificationMeta")
                      : t("userVerificationDetail.waitingForBackendStep")}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="verificationDetailStack">
          <section className="card verificationSectionCard">
            <div className="sectionHeader">
              <div>
                <div className="sectionTitle">{t("userVerificationDetail.sectionInstructionTitle")}</div>
                <p className="verificationSectionText">
                  {t("userVerificationDetail.sectionInstructionDescription")}
                </p>
              </div>
            </div>
            <div className="verificationInstructionPreview">
              <div className="verificationPreviewItem verificationPreviewCard">
                <div className="verificationPreviewTop">
                  <span className="detailLabel">{t("userVerificationDetail.adminPhone")}</span>
                  <button
                    type="button"
                    className="copyActionButton"
                    onClick={() => void handleCopy(adminPhoneForTransfer, "phone")}
                    disabled={!adminPhoneForTransfer.trim()}
                  >
                    {copiedField === "phone"
                      ? t("userVerificationDetail.copied")
                      : t("userVerificationDetail.copy")}
                  </button>
                </div>
                <span className="detailValue">{adminPhoneForTransfer || noDataAvailable}</span>
              </div>
              <div className="verificationPreviewItem verificationPreviewCard">
                <div className="verificationPreviewTop">
                  <span className="detailLabel">{t("userVerificationDetail.instructionNote")}</span>
                  <button
                    type="button"
                    className="copyActionButton"
                    onClick={() => void handleCopy(instructionNote, "note")}
                    disabled={!instructionNote.trim()}
                  >
                    {copiedField === "note"
                      ? t("userVerificationDetail.copied")
                      : t("userVerificationDetail.copy")}
                  </button>
                </div>
                <span className="detailValue">{instructionNote || noDataAvailable}</span>
              </div>
            </div>
            <form className="authForm" onSubmit={onSendInstruction}>
              <label className="authLabel" htmlFor="adminPhoneForTransfer">
                {t("userVerificationDetail.adminPhoneForTransfer")}
              </label>
              <input
                id="adminPhoneForTransfer"
                className="authInput"
                type="text"
                value={adminPhoneForTransfer}
                onChange={(event) => onAdminPhoneChange(event.target.value)}
                required
                disabled={!canSendInstruction}
              />
              <label className="authLabel" htmlFor="instructionNote">
                {t("userVerificationDetail.instructionNote")}
              </label>
              <textarea
                id="instructionNote"
                className="authInput"
                value={instructionNote}
                onChange={(event) => onInstructionNoteChange(event.target.value)}
                rows={4}
                required
                disabled={!canSendInstruction}
              />
              <div className="verificationButtonRow">
                <Button
                  className="verificationPrimaryButton"
                  type="submit"
                  disabled={isSubmittingInstruction || !canSendInstruction}
                >
                  {isSubmittingInstruction
                    ? t("userVerificationDetail.sending")
                    : t("userVerificationDetail.sendInstruction")}
                </Button>
              </div>
            </form>
          </section>

          <section className="card verificationSectionCard">
            <div className="sectionHeader">
              <div>
                <div className="sectionTitle">{t("userVerificationDetail.sectionVerificationTitle")}</div>
                <p className="verificationSectionText">
                  {t("userVerificationDetail.sectionVerificationDescription")}
                </p>
              </div>
            </div>
            <div className="authForm">
              <label className="authLabel" htmlFor="finalAdminNote">
                {t("userVerificationDetail.finalAdminNote")}
              </label>
              <textarea
                id="finalAdminNote"
                className="authInput"
                value={finalAdminNote}
                onChange={(event) => onFinalAdminNoteChange(event.target.value)}
                rows={6}
                required
                disabled={!canVerify}
              />
              <div className="verificationButtonRow">
                <Button
                  className="verificationSuccessButton"
                  type="button"
                  disabled={isSubmittingResolution || !canVerify}
                  onClick={onVerify}
                >
                  {isSubmittingResolution
                    ? t("userVerificationDetail.working")
                    : t("userVerificationDetail.verify")}
                </Button>
              </div>
            </div>
          </section>

          {isReadOnly ? (
            <p className="surfaceMessage">
              {t("userVerificationDetail.readOnly")}
            </p>
          ) : null}

          {feedback ? (
            <p
              className={
                feedbackType === "error"
                  ? "authError surfaceMessage"
                  : "surfaceMessage"
              }
            >
              {feedback}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
