import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/Button/Button";
import type { VerificationRecord } from "@/features/kbzVerification/types";

type UserVerificationDetailProps = {
  record: VerificationRecord | null;
  isLoading?: boolean;
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
  isLoading = false,
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
  const [copiedField, setCopiedField] = useState<"phone" | "txn" | null>(null);
  const hasRealData = !!record?.userName.trim() || !!record?.userPhoneOrEmail.trim();
  const notAvailable = t("userVerificationDetail.notAvailable");
  const noDataAvailable = t("userVerificationDetail.noDataAvailable");

  const handleCopy = async (value: string, field: "phone" | "txn") => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1600);
    } catch {
      setCopiedField(null);
    }
  };

  if (isLoading && (!record || !hasRealData)) {
    return (
      <section className="page verificationPage verificationDetailPage">
        <div className="card verificationMissingState verificationLoadingState">
          <Link to="/dashboard" className="verificationBackLink verificationBackButton">
            {t("userVerificationDetail.backToList")}
          </Link>
          <div className="verificationDetailLoading">
            <span className="verificationLoadingSpinner" aria-hidden="true" />
            <h1 className="pageTitle">{t("userVerificationDetail.loadingTitle")}</h1>
            <p className="pageDescription">
              {t("userVerificationDetail.loadingDescription")}
            </p>
          </div>
        </div>
      </section>
    );
  }

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
  const instructionAlreadySent = Boolean(record.instructionSentAt || record.adminPhoneForTransfer);
  const nextActionLabel = canSendInstruction
    ? t("userVerificationDetail.nextActionSend")
    : canVerify
      ? t("userVerificationDetail.nextActionVerify")
      : record.status === "VERIFIED"
        ? t("userVerificationDetail.nextActionDone")
        : t("userVerificationDetail.nextActionWait");

  const nextActionMeta = canSendInstruction
    ? t("userVerificationDetail.nextActionSendMeta")
    : canVerify
      ? t("userVerificationDetail.nextActionVerifyMeta")
      : record.status === "VERIFIED"
        ? t("userVerificationDetail.nextActionDoneMeta")
        : t("userVerificationDetail.nextActionWaitMeta");

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
            {record.kbzPayPhoneNumber || record.userPhoneOrEmail || t("userVerificationDetail.noContactInformation")}
            {record.createdAt
              ? ` · ${t("userVerificationDetail.updatedAt", {
                  value: formatDateTime(
                    record.lastActionAt || record.createdAt,
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

      <div className={`verificationNextActionBanner${canSendInstruction || canVerify ? " actionable" : ""}`}>
        <div>
          <div className="verificationNextActionLabel">{t("userVerificationDetail.nextAction")}</div>
          <div className="verificationNextActionTitle">{nextActionLabel}</div>
          <p className="verificationNextActionMeta">{nextActionMeta}</p>
        </div>
        <span className="verificationAmountChip">{t("userVerificationDetail.transferAmount")}</span>
      </div>

      <div className="verificationDetailLayout">
        <aside className="card verificationStepperCard">
          <div className="sectionHeader">
            <div>
              <div className="sectionTitle">{t("userVerificationDetail.flowTitle")}</div>
              <p className="verificationSectionText">
                {t("userVerificationDetail.flowDescription")}
              </p>
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
                  record.status === "VERIFIED" || record.status === "MONEY_CHECK" || instructionAlreadySent
                    ? "verificationStepMarker done"
                    : canSendInstruction
                      ? "verificationStepMarker active"
                      : "verificationStepMarker"
                }
              >
                {record.status === "VERIFIED" || record.status === "MONEY_CHECK" || instructionAlreadySent ? (
                  <CheckIcon />
                ) : (
                  "2"
                )}
              </div>
              <div className="verificationStepContent">
                <div className="verificationStepTitle">{t("userVerificationDetail.sendInstructionStep")}</div>
                <div className="verificationStepMeta">
                  {record.status === "VERIFIED" || record.status === "MONEY_CHECK"
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
                  record.status === "VERIFIED" || record.status === "MONEY_CHECK"
                    ? "verificationStepMarker done"
                    : "verificationStepMarker"
                }
              >
                {record.status === "VERIFIED" || record.status === "MONEY_CHECK" ? <CheckIcon /> : "3"}
              </div>
              <div className="verificationStepContent">
                <div className="verificationStepTitle">{t("userVerificationDetail.clientTransferStep")}</div>
                <div className="verificationStepMeta">
                  {record.status === "MONEY_CHECK" || record.status === "VERIFIED"
                    ? t("userVerificationDetail.clientTransferDoneMeta")
                    : t("userVerificationDetail.clientTransferPendingMeta")}
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
                {record.status === "VERIFIED" ? <CheckIcon /> : "4"}
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
          <section className="card verificationSectionCard verificationIdentityCard">
            <div className="sectionHeader">
              <div>
                <div className="sectionTitle">{t("userVerificationDetail.accountTitle")}</div>
                <p className="verificationSectionText">
                  {t("userVerificationDetail.accountDescription")}
                </p>
              </div>
            </div>
            <div className="verificationIdentityGrid">
              <div className="detailItem">
                <div className="detailLabel">{t("userVerificationDetail.nickname")}</div>
                <div className="detailValue">{record.userName || noDataAvailable}</div>
              </div>
              <div className="detailItem">
                <div className="detailLabel">{t("userVerificationDetail.accountName")}</div>
                <div className="detailValue">{record.accountName || noDataAvailable}</div>
              </div>
              <div className="detailItem">
                <div className="detailLabel">{t("userVerificationDetail.kbzPayPhone")}</div>
                <div className="detailValue">
                  {record.kbzPayPhoneNumber || record.userPhoneOrEmail || noDataAvailable}
                </div>
              </div>
              <div className="detailItem">
                <div className="verificationPreviewTop">
                  <div className="detailLabel">{t("userVerificationDetail.transactionId")}</div>
                  {record.kbzTransactionId ? (
                    <button
                      type="button"
                      className="copyActionButton"
                      onClick={() => void handleCopy(record.kbzTransactionId || "", "txn")}
                    >
                      {copiedField === "txn"
                        ? t("userVerificationDetail.copied")
                        : t("userVerificationDetail.copy")}
                    </button>
                  ) : null}
                </div>
                <div className="detailValue verificationTxnId">
                  {record.kbzTransactionId || t("userVerificationDetail.transactionPending")}
                </div>
              </div>
            </div>
          </section>

          <section
            className={`card verificationSectionCard${canSendInstruction ? " verificationSectionActive" : ""}${
              !canSendInstruction ? " verificationSectionMuted" : ""
            }`}
          >
            <div className="sectionHeader">
              <div>
                <div className="sectionTitle">{t("userVerificationDetail.sectionInstructionTitle")}</div>
                <p className="verificationSectionText">
                  {t("userVerificationDetail.sectionInstructionDescription")}
                </p>
              </div>
              {canSendInstruction ? (
                <span className="verificationStagePill">{t("userVerificationDetail.yourTurn")}</span>
              ) : null}
            </div>

            {instructionAlreadySent && !canSendInstruction ? (
              <div className="verificationInstructionPreview">
                <div className="verificationPreviewItem verificationPreviewCard">
                  <div className="verificationPreviewTop">
                    <span className="detailLabel">{t("userVerificationDetail.adminPhone")}</span>
                    <button
                      type="button"
                      className="copyActionButton"
                      onClick={() => void handleCopy(record.adminPhoneForTransfer || adminPhoneForTransfer, "phone")}
                      disabled={!(record.adminPhoneForTransfer || adminPhoneForTransfer).trim()}
                    >
                      {copiedField === "phone"
                        ? t("userVerificationDetail.copied")
                        : t("userVerificationDetail.copy")}
                    </button>
                  </div>
                  <span className="detailValue">
                    {record.adminPhoneForTransfer || adminPhoneForTransfer || noDataAvailable}
                  </span>
                </div>
                <div className="verificationPreviewItem verificationPreviewCard">
                  <span className="detailLabel">{t("userVerificationDetail.instructionNote")}</span>
                  <span className="detailValue">
                    {record.instructionNote || instructionNote || noDataAvailable}
                  </span>
                </div>
              </div>
            ) : null}

            {canSendInstruction ? (
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
                  placeholder={t("userVerificationDetail.adminPhonePlaceholder")}
                  required
                />
                <label className="authLabel" htmlFor="instructionNote">
                  {t("userVerificationDetail.instructionNoteOptional")}
                </label>
                <textarea
                  id="instructionNote"
                  className="authInput"
                  value={instructionNote}
                  onChange={(event) => onInstructionNoteChange(event.target.value)}
                  rows={3}
                  placeholder={t("userVerificationDetail.instructionNotePlaceholder")}
                />
                <p className="verificationHelperText">
                  {t("userVerificationDetail.instructionHelper")}
                </p>
                <div className="verificationButtonRow">
                  <Button
                    className="verificationPrimaryButton"
                    type="submit"
                    disabled={isSubmittingInstruction || !adminPhoneForTransfer.trim()}
                  >
                    {isSubmittingInstruction
                      ? t("userVerificationDetail.sending")
                      : t("userVerificationDetail.sendInstruction")}
                  </Button>
                </div>
              </form>
            ) : null}
          </section>

          <section
            className={`card verificationSectionCard${canVerify ? " verificationSectionActive" : ""}${
              !canVerify ? " verificationSectionMuted" : ""
            }`}
          >
            <div className="sectionHeader">
              <div>
                <div className="sectionTitle">{t("userVerificationDetail.sectionVerificationTitle")}</div>
                <p className="verificationSectionText">
                  {t("userVerificationDetail.sectionVerificationDescription")}
                </p>
              </div>
              {canVerify ? (
                <span className="verificationStagePill success">{t("userVerificationDetail.yourTurn")}</span>
              ) : null}
            </div>

            {canVerify ? (
              <>
                <ul className="verificationChecklist">
                  <li>{t("userVerificationDetail.checkAmount")}</li>
                  <li>{t("userVerificationDetail.checkSender")}</li>
                  <li>{t("userVerificationDetail.checkTransaction")}</li>
                </ul>
                <div className="authForm">
                  <label className="authLabel" htmlFor="finalAdminNote">
                    {t("userVerificationDetail.finalAdminNote")}
                  </label>
                  <textarea
                    id="finalAdminNote"
                    className="authInput"
                    value={finalAdminNote}
                    onChange={(event) => onFinalAdminNoteChange(event.target.value)}
                    rows={4}
                    required
                    placeholder={t("userVerificationDetail.finalAdminNotePlaceholder")}
                  />
                  <div className="verificationButtonRow">
                    <Button
                      className="verificationSuccessButton"
                      type="button"
                      disabled={isSubmittingResolution || !finalAdminNote.trim()}
                      onClick={onVerify}
                    >
                      {isSubmittingResolution
                        ? t("userVerificationDetail.working")
                        : t("userVerificationDetail.verify")}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="verificationHelperText">
                {record.status === "VERIFIED"
                  ? t("userVerificationDetail.verifiedHelper")
                  : t("userVerificationDetail.verifyWaitingHelper")}
              </p>
            )}
          </section>

          {isReadOnly && record.status !== "VERIFIED" ? (
            <p className="surfaceMessage">
              {t("userVerificationDetail.readOnly")}
            </p>
          ) : null}

          {feedback ? (
            <p
              className={
                feedbackType === "error"
                  ? "authError surfaceMessage"
                  : "surfaceMessage verificationSuccessMessage"
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
