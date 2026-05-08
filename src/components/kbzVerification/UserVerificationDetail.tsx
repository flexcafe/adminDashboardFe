import { useState, type FormEvent } from "react";
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

const formatDateTime = (value?: string) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
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
  const [copiedField, setCopiedField] = useState<"phone" | "note" | null>(null);
  const hasRealData = !!record?.userName.trim() || !!record?.userPhoneOrEmail.trim();

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
            Back to List
          </Link>
          <h1 className="pageTitle">Verification request not found</h1>
          <p className="pageDescription">
            No real verification data is available for this user right now.
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
            Back to List
          </Link>
          <p className="pageEyebrow">Verification Detail</p>
          <h1 className="pageTitle">{record.userName || "Verification Detail"}</h1>
          <p className="pageDescription">
            {record.userPhoneOrEmail || "No contact information available."}
            {record.createdAt
              ? ` - Updated ${formatDateTime(
                  record.lastActionAt || record.createdAt
                )}`
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
              <div className="sectionTitle">Verification Flow</div>
            </div>
          </div>
          <div className="verificationStepper">
            <div className="verificationStep">
              <div className="verificationStepMarker done">
                <CheckIcon />
              </div>
              <div className="verificationStepContent">
                <div className="verificationStepTitle">Open request</div>
                <div className="verificationStepMeta">
                  Admin is reviewing account details.
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
                <div className="verificationStepTitle">Send instruction</div>
                <div className="verificationStepMeta">
                  {record.status === "VERIFIED"
                    ? "Instruction step completed."
                    : record.instructionSentAt
                    ? `Sent ${formatDateTime(record.instructionSentAt)}`
                    : "Share transfer number and the required payment note."}
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
                <div className="verificationStepTitle">Final verification</div>
                <div className="verificationStepMeta">
                  {record.status === "VERIFIED"
                    ? `Verified on ${formatDateTime(record.lastActionAt)}`
                    : canVerify
                      ? "Review the submitted transfer and verify the user."
                      : "Waiting for the next backend verification step."}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="verificationDetailStack">
          <section className="card verificationSectionCard">
            <div className="sectionHeader">
              <div>
                <div className="sectionTitle">Section 1: Instruction</div>
                <p className="verificationSectionText">
                  Share the transfer number and note the user must follow before
                  payment verification.
                </p>
              </div>
            </div>
            <div className="verificationInstructionPreview">
              <div className="verificationPreviewItem verificationPreviewCard">
                <div className="verificationPreviewTop">
                  <span className="detailLabel">Admin Phone</span>
                  <button
                    type="button"
                    className="copyActionButton"
                    onClick={() => void handleCopy(adminPhoneForTransfer, "phone")}
                    disabled={!adminPhoneForTransfer.trim()}
                  >
                    {copiedField === "phone" ? "Copied" : "Copy"}
                  </button>
                </div>
                <span className="detailValue">{adminPhoneForTransfer || "No data available."}</span>
              </div>
              <div className="verificationPreviewItem verificationPreviewCard">
                <div className="verificationPreviewTop">
                  <span className="detailLabel">Instruction Note</span>
                  <button
                    type="button"
                    className="copyActionButton"
                    onClick={() => void handleCopy(instructionNote, "note")}
                    disabled={!instructionNote.trim()}
                  >
                    {copiedField === "note" ? "Copied" : "Copy"}
                  </button>
                </div>
                <span className="detailValue">{instructionNote || "No data available."}</span>
              </div>
            </div>
            <form className="authForm" onSubmit={onSendInstruction}>
              <label className="authLabel" htmlFor="adminPhoneForTransfer">
                Admin Phone for Transfer
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
                Instruction Note
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
                  {isSubmittingInstruction ? "Sending..." : "Send Instruction"}
                </Button>
              </div>
            </form>
          </section>

          <section className="card verificationSectionCard">
            <div className="sectionHeader">
              <div>
                <div className="sectionTitle">Section 2: Verification</div>
                <p className="verificationSectionText">
                  Leave a final admin note and verify the submitted KBZPay
                  transfer.
                </p>
              </div>
            </div>
            <div className="authForm">
              <label className="authLabel" htmlFor="finalAdminNote">
                Final Admin Note
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
                  {isSubmittingResolution ? "Working..." : "Verify"}
                </Button>
              </div>
            </div>
          </section>

          {isReadOnly ? (
            <p className="surfaceMessage">
              This record is read-only for the current backend stage.
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
