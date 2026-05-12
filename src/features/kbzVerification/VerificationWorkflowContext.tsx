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
  VerificationRecord,
  VerificationResolutionPayload,
} from "./types";

type ApiResponse<T> = {
  message?: string;
  code?: number;
  data?: T;
};

type VerificationWorkflowContextValue = {
  registeredAccounts: VerificationRecord[];
  verificationRequested: VerificationRecord[];
  moneyCheckRequests: VerificationRecord[];
  verifiedUsers: VerificationRecord[];
  isLoading: boolean;
  error: string | null;
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

  return {
    id: toText(item.id) || userId,
    userId,
    userName:
      toText(item.accountName) ||
      toText(item.nickname) ||
      toText(item.userName) ||
      toText(item.name) ||
      toText(item.username),
    userPhoneOrEmail:
      toText(item.kbzPayPhoneNumber) ||
      toText(item.kbzPayPhone) ||
      toText(item.phone) ||
      toText(item.email) ||
      toText(item.contact),
    createdAt:
      toText(item.createdAt) ||
      toText(item.requestedAt) ||
      toText(item.registeredAt) ||
      toText(item.date) ||
      new Date().toISOString(),
    status,
    adminPhoneForTransfer:
      toText(item.adminPhoneForTransfer) || toText(item.transferPhone),
    instructionNote: toText(item.adminNote) || toText(item.instructionNote),
    instructionSentAt:
      toText(item.instructionSentAt) || toText(item.sentInstructionAt),
    finalAdminNote: toText(item.finalAdminNote) || toText(item.verifyNote),
    lastActionAt:
      toText(item.updatedAt) ||
      toText(item.verifiedAt) ||
      toText(item.checkedAt) ||
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [
        registeredResponse,
        requestedResponse,
        moneyCheckResponse,
        verifiedResponse,
      ] = await Promise.all([
        httpClient.get<ApiResponse<unknown>>(
          API_ENDPOINTS.AUTH.KBZPAY_REGISTERED_ACCOUNTS
        ),
        httpClient.get<ApiResponse<unknown>>(
          API_ENDPOINTS.AUTH.KBZPAY_VERIFICATION_REQUESTED
        ),
        httpClient.get<ApiResponse<unknown>>(
          API_ENDPOINTS.AUTH.KBZPAY_MONEY_CHECK
        ),
        httpClient.get<ApiResponse<unknown>>(
          API_ENDPOINTS.AUTH.KBZPAY_VERIFIED_USERS
        ),
      ]);

      setRegisteredAccounts(
        toRecordArray(registeredResponse?.data)
          .map((item) => normalizeVerificationRecord(item, "REGISTERED"))
          .filter((item): item is VerificationRecord => !!item)
      );

      setVerificationRequested(
        toRecordArray(requestedResponse?.data)
          .map((item) =>
            normalizeVerificationRecord(item, "VERIFICATION_REQUESTED")
          )
          .filter((item): item is VerificationRecord => !!item)
      );

      setMoneyCheckRequests(
        toRecordArray(moneyCheckResponse?.data)
          .map((item) => normalizeVerificationRecord(item, "MONEY_CHECK"))
          .filter((item): item is VerificationRecord => !!item)
      );

      setVerifiedUsers(
        toRecordArray(verifiedResponse?.data)
          .map((item) => normalizeVerificationRecord(item, "VERIFIED"))
          .filter((item): item is VerificationRecord => !!item)
      );
    } catch (loadError) {
      setRegisteredAccounts([]);
      setVerificationRequested([]);
      setMoneyCheckRequests([]);
      setVerifiedUsers([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load KBZPay verification requests."
      );
    } finally {
      setIsLoading(false);
    }
  }, [httpClient]);

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
          adminNote: payload.adminNote.trim(),
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
      error,
      refreshRequests,
      getRecordByUserId,
      sendInstruction,
      verifyRequest,
    }),
    [
      error,
      getRecordByUserId,
      isLoading,
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
