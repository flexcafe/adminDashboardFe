import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import container from "@/core/infrastructure/di/container";
import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import { API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import type {
  AdminChatRecord,
  PaymentResolutionPayload,
  SendInstructionPayload,
} from "./types";

type ApiResponse<T> = {
  message?: string;
  code?: number;
  data?: T;
};

type AdminChatContextValue = {
  awaitingInstruction: AdminChatRecord[];
  pending: AdminChatRecord[];
  isLoading: boolean;
  error: string | null;
  refreshQueues: () => Promise<void>;
  sendInstruction: (
    transactionId: string,
    payload: SendInstructionPayload
  ) => Promise<string>;
  markReceived: (
    transactionId: string,
    payload: PaymentResolutionPayload
  ) => Promise<string>;
  markTransferred: (
    transactionId: string,
    payload: PaymentResolutionPayload
  ) => Promise<string>;
};

const AdminChatContext = createContext<AdminChatContextValue | null>(null);

const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const toRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object"
    );
  }

  if (value && typeof value === "object") {
    const source = value as {
      items?: unknown;
      data?: unknown;
      records?: unknown;
      rows?: unknown;
    };

    const collections = [source.items, source.data, source.records, source.rows];
    for (const collection of collections) {
      if (Array.isArray(collection)) {
        return collection.filter(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === "object"
        );
      }
    }
  }

  return [];
};

const pickFirstText = (
  item: Record<string, unknown>,
  keys: string[],
  fallback = ""
) => {
  for (const key of keys) {
    const value = toText(item[key]);
    if (value) return value;
  }
  return fallback;
};

const normalizeRecord = (
  item: Record<string, unknown>,
  queue: "awaitingInstruction" | "pending"
): AdminChatRecord | null => {
  const transactionId = pickFirstText(item, [
    "transactionId",
    "id",
    "safePaymentId",
    "transaction_id",
  ]);

  if (!transactionId) return null;

  const amountValue =
    toNumber(item.amount) ??
    toNumber(item.price) ??
    toNumber(item.totalAmount) ??
    toNumber(item.safePaymentAmount);

  const stage =
    (pickFirstText(item, ["status", "transactionStatus", "stage"]) as
      | AdminChatRecord["stage"]
      | "") ||
    (queue === "awaitingInstruction"
      ? "SAFE_PAYMENT_AWAITING_INSTRUCTION"
      : "SAFE_PAYMENT_PENDING");

  const stageLabelMap: Record<AdminChatRecord["stage"], string> = {
    SAFE_PAYMENT_AWAITING_INSTRUCTION: "Awaiting instruction",
    SAFE_PAYMENT_INSTRUCTION_SENT: "Instruction sent",
    SAFE_PAYMENT_PENDING: "Pending buyer proof",
    SAFE_PAYMENT_RECEIVED: "Received by admin",
    COMPLETED: "Completed",
  };

  return {
    id: transactionId,
    transactionId,
    chatRoomId: pickFirstText(item, ["chatRoomId", "roomId", "chatId"]),
    listingId: pickFirstText(item, ["listingId", "productId"]),
    listingTitle: pickFirstText(item, [
      "listingTitle",
      "itemTitle",
      "productName",
      "title",
    ]),
    buyerId: pickFirstText(item, ["buyerId", "userId"]),
    buyerName: pickFirstText(item, [
      "buyerName",
      "buyerNickname",
      "buyerUserName",
      "buyer",
    ]),
    buyerPhone: pickFirstText(item, ["buyerPhone", "buyerContact", "phone"]),
    buyerKbzPayName: pickFirstText(item, [
      "buyerKbzAccountName",
      "buyerKbzPayName",
      "kbzAccountName",
    ]),
    buyerKbzPayPhone: pickFirstText(item, [
      "buyerKbzPhoneNumber",
      "buyerKbzPayPhone",
      "kbzPayPhoneNumber",
      "kbzPhone",
    ]),
    sellerId: pickFirstText(item, ["sellerId"]),
    sellerName: pickFirstText(item, [
      "sellerName",
      "sellerNickname",
      "sellerUserName",
      "seller",
    ]),
    sellerPhone: pickFirstText(item, ["sellerPhone", "sellerContact"]),
    amountLabel:
      pickFirstText(item, ["amountLabel", "formattedAmount"]) ||
      (amountValue !== null ? amountValue.toLocaleString() : ""),
    amountValue,
    currency: pickFirstText(item, ["currency"], "MMK"),
    createdAt: pickFirstText(item, ["createdAt", "requestedAt"]),
    updatedAt: pickFirstText(item, ["updatedAt", "submittedAt", "createdAt"]),
    instructionSentAt: pickFirstText(item, ["instructionSentAt"]),
    submittedAt: pickFirstText(item, ["submittedAt", "paymentSubmittedAt"]),
    receivedAt: pickFirstText(item, ["receivedAt"]),
    transferredAt: pickFirstText(item, ["transferredAt"]),
    adminReceivingPhone: pickFirstText(item, [
      "adminReceivingPhone",
      "adminReceivingPhoneNumber",
      "receivingPhone",
    ]),
    adminNote: pickFirstText(item, ["adminNote", "instructionNote", "note"]),
    paymentReference: pickFirstText(item, [
      "paymentReference",
      "transferReference",
      "kbzTransferRef",
    ]),
    stage,
    stageLabel: stageLabelMap[stage] ?? "In progress",
    canSendInstruction: stage === "SAFE_PAYMENT_AWAITING_INSTRUCTION",
    canMarkReceived:
      stage === "SAFE_PAYMENT_PENDING" ||
      stage === "SAFE_PAYMENT_INSTRUCTION_SENT",
    canMarkTransferred: stage === "SAFE_PAYMENT_RECEIVED",
  };
};

export function AdminChatProvider({ children }: PropsWithChildren) {
  const httpClient = container.resolve<HttpClient>("httpClient");
  const [awaitingInstruction, setAwaitingInstruction] = useState<
    AdminChatRecord[]
  >([]);
  const [pending, setPending] = useState<AdminChatRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshQueues = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [awaitingResponse, pendingResponse] = await Promise.all([
        httpClient.get<ApiResponse<unknown>>(
          API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.AWAITING_INSTRUCTION
        ),
        httpClient.get<ApiResponse<unknown>>(
          API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.PENDING
        ),
      ]);

      setAwaitingInstruction(
        toRecordArray(awaitingResponse?.data)
          .map((item) => normalizeRecord(item, "awaitingInstruction"))
          .filter((item): item is AdminChatRecord => !!item)
      );

      setPending(
        toRecordArray(pendingResponse?.data)
          .map((item) => normalizeRecord(item, "pending"))
          .filter((item): item is AdminChatRecord => !!item)
      );
    } catch (loadError) {
      setAwaitingInstruction([]);
      setPending([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load admin chat safe-payment queues."
      );
    } finally {
      setIsLoading(false);
    }
  }, [httpClient]);

  useEffect(() => {
    void refreshQueues();
  }, [refreshQueues]);

  const sendInstruction = useCallback(
    async (transactionId: string, payload: SendInstructionPayload) => {
      const response = await httpClient.post<ApiResponse<unknown>>(
        API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.SEND_INSTRUCTION(transactionId),
        {
          adminReceivingPhone: payload.adminReceivingPhone.trim(),
          adminReceivingPhoneNumber: payload.adminReceivingPhone.trim(),
          adminNote: payload.adminNote.trim(),
        }
      );

      await refreshQueues();

      return response?.message || "Instruction sent successfully.";
    },
    [httpClient, refreshQueues]
  );

  const markReceived = useCallback(
    async (transactionId: string, payload: PaymentResolutionPayload) => {
      const response = await httpClient.post<ApiResponse<unknown>>(
        API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.RECEIVED(transactionId),
        {
          adminNote: payload.adminNote.trim(),
        }
      );

      await refreshQueues();

      return response?.message || "Payment marked as received.";
    },
    [httpClient, refreshQueues]
  );

  const markTransferred = useCallback(
    async (transactionId: string, payload: PaymentResolutionPayload) => {
      const response = await httpClient.post<ApiResponse<unknown>>(
        API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.TRANSFERRED(transactionId),
        {
          adminNote: payload.adminNote.trim(),
        }
      );

      await refreshQueues();

      return response?.message || "Payment marked as transferred.";
    },
    [httpClient, refreshQueues]
  );

  const value = useMemo<AdminChatContextValue>(
    () => ({
      awaitingInstruction,
      pending,
      isLoading,
      error,
      refreshQueues,
      sendInstruction,
      markReceived,
      markTransferred,
    }),
    [
      awaitingInstruction,
      error,
      isLoading,
      markReceived,
      markTransferred,
      pending,
      refreshQueues,
      sendInstruction,
    ]
  );

  return (
    <AdminChatContext.Provider value={value}>
      {children}
    </AdminChatContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminChat() {
  const context = useContext(AdminChatContext);

  if (!context) {
    throw new Error("useAdminChat must be used within AdminChatProvider.");
  }

  return context;
}
