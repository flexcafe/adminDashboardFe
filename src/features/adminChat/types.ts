export type AdminChatStage =
  | "SAFE_PAYMENT_AWAITING_INSTRUCTION"
  | "SAFE_PAYMENT_INSTRUCTION_SENT"
  | "SAFE_PAYMENT_PENDING"
  | "SAFE_PAYMENT_RECEIVED"
  | "COMPLETED";

export type AdminChatQueueTab = "awaitingInstruction" | "pending";

export type AdminChatRecord = {
  id: string;
  transactionId: string;
  chatRoomId: string;
  listingId: string;
  listingTitle: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  buyerKbzPayName: string;
  buyerKbzPayPhone: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  amountLabel: string;
  amountValue: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  instructionSentAt: string;
  submittedAt: string;
  receivedAt: string;
  transferredAt: string;
  adminReceivingPhone: string;
  adminNote: string;
  paymentReference: string;
  stage: AdminChatStage;
  stageLabel: string;
  canSendInstruction: boolean;
  canMarkReceived: boolean;
  canMarkTransferred: boolean;
};

export type SendInstructionPayload = {
  adminReceivingPhone: string;
  adminNote: string;
};

export type PaymentResolutionPayload = {
  adminNote: string;
};
