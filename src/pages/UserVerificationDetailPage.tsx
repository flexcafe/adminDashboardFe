import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UserVerificationDetail } from "@/components/kbzVerification/UserVerificationDetail";
import { useVerificationWorkflow } from "@/features/kbzVerification/VerificationWorkflowContext";

const DEFAULT_ADMIN_PHONE = "";
const DEFAULT_INSTRUCTION_NOTE = "";
const DEFAULT_VERIFICATION_NOTE = "";

export function UserVerificationDetailPage() {
  const navigate = useNavigate();
  const { userId = "" } = useParams();
  const {
    getRecordByUserId,
    sendInstruction,
    verifyRequest,
  } = useVerificationWorkflow();

  const record = getRecordByUserId(userId);

  const [adminPhoneForTransfer, setAdminPhoneForTransfer] = useState(
    record?.adminPhoneForTransfer || DEFAULT_ADMIN_PHONE
  );
  const [instructionNote, setInstructionNote] = useState(
    record?.instructionNote || DEFAULT_INSTRUCTION_NOTE
  );
  const [finalAdminNote, setFinalAdminNote] = useState(
    record?.finalAdminNote || DEFAULT_VERIFICATION_NOTE
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(
    null
  );
  const [isSubmittingInstruction, setIsSubmittingInstruction] = useState(false);
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  useEffect(() => {
    if (!record) return;
    setAdminPhoneForTransfer(
      record.adminPhoneForTransfer || DEFAULT_ADMIN_PHONE
    );
    setInstructionNote(record.instructionNote || DEFAULT_INSTRUCTION_NOTE);
    setFinalAdminNote(record.finalAdminNote || DEFAULT_VERIFICATION_NOTE);
  }, [record]);

  const handleSendInstruction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!record || !record.canSendInstruction) return;

    try {
      setIsSubmittingInstruction(true);
      setFeedback(null);
      setFeedbackType(null);
      const message = await sendInstruction(record.userId, {
        adminPhoneForTransfer,
        adminNote: instructionNote,
      });
      setFeedback(message);
      setFeedbackType("success");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Failed to send instruction. Please try again."
      );
      setFeedbackType("error");
    } finally {
      setIsSubmittingInstruction(false);
    }
  };

  const handleVerify = async () => {
    if (!record || !record.canVerify) return;
    if (!finalAdminNote.trim()) {
      setFeedback("Final admin note is required.");
      setFeedbackType("error");
      return;
    }

    try {
      setIsSubmittingResolution(true);
      setFeedback(null);
      setFeedbackType(null);
      const message = await verifyRequest(record.userId, {
        adminNote: finalAdminNote,
      });
      setFeedback(message);
      setFeedbackType("success");
      navigate("/dashboard");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Failed to verify the user."
      );
      setFeedbackType("error");
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  return (
    <UserVerificationDetail
      record={record}
      adminPhoneForTransfer={adminPhoneForTransfer}
      instructionNote={instructionNote}
      finalAdminNote={finalAdminNote}
      feedback={feedback}
      feedbackType={feedbackType}
      isSubmittingInstruction={isSubmittingInstruction}
      isSubmittingResolution={isSubmittingResolution}
      onAdminPhoneChange={setAdminPhoneForTransfer}
      onInstructionNoteChange={setInstructionNote}
      onFinalAdminNoteChange={setFinalAdminNote}
      onSendInstruction={handleSendInstruction}
      onVerify={handleVerify}
    />
  );
}
