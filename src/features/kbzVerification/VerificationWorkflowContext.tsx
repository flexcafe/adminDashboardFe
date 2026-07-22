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
  VerificationInstructionPayload,
  VerificationListTab,
  VerificationRecord,
  VerificationResolutionPayload,
} from "./types";

type ApiResponse<T> = {
  message?: string;
  code?: number;
  data?: T;
};

export type VerificationQueueLoading = Record<VerificationListTab, boolean>;
export type VerificationQueueErrors = Record<VerificationListTab, string | null>;

const EMPTY_QUEUE_LOADING: VerificationQueueLoading = {
  registered: false,
  requested: false,
  moneyCheck: false,
  verified: false,
};

const EMPTY_QUEUE_ERRORS: VerificationQueueErrors = {
  registered: null,
  requested: null,
  moneyCheck: null,
  verified: null,
};

type VerificationWorkflowContextValue = {
  registeredAccounts: VerificationRecord[];
  verificationRequested: VerificationRecord[];
  moneyCheckRequests: VerificationRecord[];
  verifiedUsers: VerificationRecord[];
  isLoading: boolean;
  isInitialLoading: boolean;
  loadingByQueue: VerificationQueueLoading;
  error: string | null;
  errorsByQueue: VerificationQueueErrors;
  refreshRequests: () => Promise<void>;
  getRecordByUserId: (userId: string) => VerificationRecord | null;
  sendInstruction: (
    userId: string,
    payload: VerificationInstructionPayload
  ) => Promise<string>;
  verifyRequest: (
    userId: string,
    payload: VerificationResolutionPayload
  ) => Promise<string>;
};

const VerificationWorkflowContext =
  createContext<VerificationWorkflowContextValue | null>(null);

const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const toRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object"
    );
  }

  if (value && typeof value === "object") {
    const maybeItems = (value as { items?: unknown }).items;
    if (Array.isArray(maybeItems)) {
      return maybeItems.filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === "object"
      );
    }
  }

  return [];
};

const normalizeVerificationRecord = (
  item: Record<string, unknown>,
  status: VerificationRecord["status"]
): VerificationRecord | null => {
  const userId = toText(item.userId) || toText(item.id) || toText(item.user_id);
  if (!userId) return null;

  const statusMeta: Record<
    VerificationRecord["status"],
    Pick<
      VerificationRecord,
      "statusLabel" | "canSendInstruction" | "canVerify"
    >
  > = {
    REGISTERED: {
      statusLabel: "Registered",
      canSendInstruction: false,
      canVerify: false,
    },
    VERIFICATION_REQUESTED: {
      statusLabel: "Awaiting Instruction",
      canSendInstruction: true,
      canVerify: false,
    },
    MONEY_CHECK: {
      statusLabel: "Money Check",
      canSendInstruction: false,
      canVerify: true,
    },
    VERIFIED: {
      statusLabel: "Verified",
      canSendInstruction: false,
      canVerify: false,
    },
  };

  const accountName = toText(item.accountName) || toText(item.kbzAccountName);
  const kbzPayPhoneNumber =
    toText(item.kbzPayPhoneNumber) || toText(item.kbzPayPhone);
  const nickname =
    toText(item.nickname) ||
    toText(item.userName) ||
    toText(item.name) ||
    toText(item.username);

  return {
    id: toText(item.id) || userId,
    userId,
    userName: nickname || accountName,
    userPhoneOrEmail:
      kbzPayPhoneNumber ||
      toText(item.phone) ||
      toText(item.email) ||
      toText(item.contact),
    accountName: accountName || undefined,
    kbzPayPhoneNumber: kbzPayPhoneNumber || undefined,
    kbzTransactionId:
      toText(item.kbzTransactionId) ||
      toText(item.transactionId) ||
      toText(item.kbz_transaction_id) ||
      undefined,
    createdAt:
      toText(item.createdAt) ||
      toText(item.verifyRequestedAt) ||
      toText(item.requestedAt) ||
      toText(item.registeredAt) ||
      toText(item.date) ||
      toText(item.created_at) ||
      toText(item.verify_requested_at) ||
      toText(item.requested_at) ||
      toText(item.registered_at) ||
      "",
    status,
    adminPhoneForTransfer:
      toText(item.adminPhoneForTransfer) || toText(item.transferPhone),
    instructionNote: toText(item.adminNote) || toText(item.instructionNote),
    instructionSentAt:
      toText(item.adminInstructionSentAt) ||
      toText(item.instructionSentAt) ||
      toText(item.sentInstructionAt),
    finalAdminNote: toText(item.finalAdminNote) || toText(item.verifyNote),
    lastActionAt:
      toText(item.updatedAt) ||
      toText(item.verifiedAt) ||
      toText(item.checkedAt) ||
      toText(item.verifyRequestedAt) ||
      toText(item.adminInstructionSentAt) ||
      toText(item.requestedAt),
    ...statusMeta[status],
  };
};

export function VerificationWorkflowProvider({
  children,
}: PropsWithChildren) {
  const httpClient = container.resolve<HttpClient>("httpClient");
  const [registeredAccounts, setRegisteredAccounts] = useState<
    VerificationRecord[]
  >([]);
  const [verificationRequested, setVerificationRequested] = useState<
    VerificationRecord[]
  >([]);
  const [moneyCheckRequests, setMoneyCheckRequests] = useState<
    VerificationRecord[]
  >([]);
  const [verifiedUsers, setVerifiedUsers] = useState<VerificationRecord[]>([]);
  const [loadingByQueue, setLoadingByQueue] =
    useState<VerificationQueueLoading>(EMPTY_QUEUE_LOADING);
  const [errorsByQueue, setErrorsByQueue] =
    useState<VerificationQueueErrors>(EMPTY_QUEUE_ERRORS);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const isLoading = useMemo(
    () => Object.values(loadingByQueue).some(Boolean),
    [loadingByQueue]
  );
  const isInitialLoading = isLoading && !hasLoadedOnce;
  const error = useMemo(() => {
    const messages = Object.values(errorsByQueue).filter(Boolean);
    if (messages.length === 0) return null;
    if (messages.length === 1) return messages[0];
    return messages.join(" ");
  }, [errorsByQueue]);

  const setQueueLoading = useCallback(
    (queue: VerificationListTab, value: boolean) => {
      setLoadingByQueue((prev) =>
        prev[queue] === value ? prev : { ...prev, [queue]: value }
      );
    },
    []
  );

  const loadQueue = useCallback(
    async (
      queue: VerificationListTab,
      endpoint: string,
      status: VerificationRecord["status"],
      setRecords: (records: VerificationRecord[]) => void,
      failureMessage: string
    ) => {
      setQueueLoading(queue, true);
      try {
        const response = await httpClient.get<ApiResponse<unknown>>(endpoint);
        setRecords(
          toRecordArray(response?.data)
            .map((item) => normalizeVerificationRecord(item, status))
            .filter((item): item is VerificationRecord => !!item)
        );
        setErrorsByQueue((prev) =>
          prev[queue] === null ? prev : { ...prev, [queue]: null }
        );
      } catch (loadError) {
        setRecords([]);
        setErrorsByQueue((prev) => ({
          ...prev,
          [queue]:
            loadError instanceof Error ? loadError.message : failureMessage,
        }));
      } finally {
        setQueueLoading(queue, false);
      }
    },
    [httpClient, setQueueLoading]
  );

  const refreshRequests = useCallback(async () => {
    await Promise.all([
      loadQueue(
        "registered",
        API_ENDPOINTS.AUTH.KBZPAY_REGISTERED_ACCOUNTS,
        "REGISTERED",
        setRegisteredAccounts,
        "Failed to load registered KBZPay accounts."
      ),
      loadQueue(
        "requested",
        API_ENDPOINTS.AUTH.KBZPAY_VERIFICATION_REQUESTED,
        "VERIFICATION_REQUESTED",
        setVerificationRequested,
        "Failed to load KBZPay verification requests."
      ),
      loadQueue(
        "moneyCheck",
        API_ENDPOINTS.AUTH.KBZPAY_MONEY_CHECK,
        "MONEY_CHECK",
        setMoneyCheckRequests,
        "Failed to load KBZPay money-check queue."
      ),
      loadQueue(
        "verified",
        API_ENDPOINTS.AUTH.KBZPAY_VERIFIED_USERS,
        "VERIFIED",
        setVerifiedUsers,
        "Failed to load verified KBZPay users."
      ),
    ]);
    setHasLoadedOnce(true);
  }, [loadQueue]);

  useEffect(() => {
    void refreshRequests();
  }, [refreshRequests]);

  const getRecordByUserId = useCallback(
    (userId: string) =>
      registeredAccounts.find((item) => item.userId === userId) ||
      verificationRequested.find((item) => item.userId === userId) ||
      moneyCheckRequests.find((item) => item.userId === userId) ||
      verifiedUsers.find((item) => item.userId === userId) ||
      null,
    [
      moneyCheckRequests,
      registeredAccounts,
      verificationRequested,
      verifiedUsers,
    ]
  );

  const sendInstruction = useCallback(
    async (userId: string, payload: VerificationInstructionPayload) => {
      const response = await httpClient.post<ApiResponse<unknown>>(
        API_ENDPOINTS.AUTH.KBZPAY_SEND_INSTRUCTION(userId),
        {
          adminPhoneForTransfer: payload.adminPhoneForTransfer.trim(),
          ...(payload.adminNote.trim()
            ? { adminNote: payload.adminNote.trim() }
            : {}),
        }
      );

      await refreshRequests();

      return response?.message || "Instruction sent successfully.";
    },
    [httpClient, refreshRequests]
  );

  const verifyRequest = useCallback(
    async (userId: string, payload: VerificationResolutionPayload) => {
      const response = await httpClient.post<ApiResponse<unknown>>(
        API_ENDPOINTS.AUTH.KBZPAY_VERIFY(userId),
        { adminNote: payload.adminNote.trim() }
      );

      await refreshRequests();

      return response?.message || "User has been marked as KBZPay verified.";
    },
    [httpClient, refreshRequests]
  );

  const value = useMemo<VerificationWorkflowContextValue>(
    () => ({
      registeredAccounts,
      verificationRequested,
      moneyCheckRequests,
      verifiedUsers,
      isLoading,
      isInitialLoading,
      loadingByQueue,
      error,
      errorsByQueue,
      refreshRequests,
      getRecordByUserId,
      sendInstruction,
      verifyRequest,
    }),
    [
      error,
      errorsByQueue,
      getRecordByUserId,
      isInitialLoading,
      isLoading,
      loadingByQueue,
      moneyCheckRequests,
      refreshRequests,
      registeredAccounts,
      sendInstruction,
      verificationRequested,
      verifiedUsers,
      verifyRequest,
    ]
  );

  return (
    <VerificationWorkflowContext.Provider value={value}>
      {children}
    </VerificationWorkflowContext.Provider>
  );
}

// Provider + hook in one module to keep workflow state colocated.
// eslint-disable-next-line react-refresh/only-export-components
export function useVerificationWorkflow() {
  const context = useContext(VerificationWorkflowContext);

  if (!context) {
    throw new Error(
      "useVerificationWorkflow must be used within VerificationWorkflowProvider."
    );
  }

  return context;
}
