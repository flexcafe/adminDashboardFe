export type VerificationStatus =
  | "REGISTERED"
  | "VERIFICATION_REQUESTED"
  | "MONEY_CHECK"
  | "VERIFIED";

export type VerificationListTab =
  | "registered"
  | "requested"
  | "moneyCheck"
  | "verified";

export type VerificationRecord = {
  id: string;
  userId: string;
  userName: string;
  userPhoneOrEmail: string;
  createdAt: string;
  status: VerificationStatus;
  statusLabel: string;
  adminPhoneForTransfer?: string;
  instructionNote?: string;
  instructionSentAt?: string;
  finalAdminNote?: string;
  lastActionAt?: string;
  canSendInstruction: boolean;
  canVerify: boolean;
};

export type VerificationInstructionPayload = {
  adminPhoneForTransfer: string;
  adminNote: string;
};

export type VerificationResolutionPayload = {
  adminNote: string;
};
