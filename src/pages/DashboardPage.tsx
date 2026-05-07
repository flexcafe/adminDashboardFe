import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../shared/ui/Button/Button";
import container from "@/core/infrastructure/di/container";
import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import { API_ENDPOINTS } from "@/core/infrastructure/api/constants";

type ApiResponse<T> = {
  message?: string;
  code?: number;
  data?: T;
};

type PendingVerificationItem = {
  id: string;
  userId: string;
  userName: string;
  userPhoneOrEmail: string;
};

const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const toRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === "object"
    );
  }

  if (value && typeof value === "object") {
    const maybeItems = (value as { items?: unknown }).items;
    if (Array.isArray(maybeItems)) {
      return maybeItems.filter(
        (item): item is Record<string, unknown> => !!item && typeof item === "object"
      );
    }
  }
  return [];
};

const normalizePendingVerification = (
  item: Record<string, unknown>
): PendingVerificationItem | null => {
  const userId = toText(item.userId) || toText(item.id) || toText(item.user_id);
  if (!userId) return null;

  return {
    id: toText(item.id) || userId,
    userId,
    userName:
      toText(item.accountName) ||
      toText(item.nickname) ||
      toText(item.userName) ||
      toText(item.name) ||
      toText(item.username) ||
      "Pending User",
    userPhoneOrEmail:
      toText(item.kbzPayPhoneNumber) ||
      toText(item.phone) ||
      toText(item.email) ||
      toText(item.contact) ||
      "No contact",
  };
};

const getUserOptionLabel = (item: PendingVerificationItem): string =>
  `${item.userName} (${item.userPhoneOrEmail})`;

export function DashboardPage() {
  const httpClient = container.resolve<HttpClient>("httpClient");
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerificationItem[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [adminPhoneForTransfer, setAdminPhoneForTransfer] = useState("+959700000000");
  const [instructionNote, setInstructionNote] = useState(
    "Transfer exactly 100 MMK and include your nickname in note."
  );
  const [verificationNote, setVerificationNote] = useState(
    "Received 100 MMK and confirmed account owner."
  );
  const [isSubmittingInstruction, setIsSubmittingInstruction] = useState(false);
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);

  const selectedUser = useMemo(
    () => pendingVerifications.find((item) => item.userId === selectedUserId) || null,
    [pendingVerifications, selectedUserId]
  );

  const loadPendingVerifications = useCallback(async () => {
    try {
      setIsLoadingPending(true);
      const response = await httpClient.get<ApiResponse<unknown>>(
        API_ENDPOINTS.AUTH.KBZPAY_PENDING_VERIFICATIONS
      );
      const normalized = toRecordArray(response?.data)
        .map((item) => normalizePendingVerification(item))
        .filter((item): item is PendingVerificationItem => !!item);
      setPendingVerifications(normalized);
    } catch (error) {
      setFeedbackType("error");
      setFeedback(
        error instanceof Error ? error.message : "Failed to load pending verification requests."
      );
      setPendingVerifications([]);
    } finally {
      setIsLoadingPending(false);
    }
  }, [httpClient]);

  useEffect(() => {
    loadPendingVerifications();
  }, [loadPendingVerifications]);

  useEffect(() => {
    if (!selectedUserId && pendingVerifications.length > 0) {
      setSelectedUserId(pendingVerifications[0].userId);
      return;
    }
    if (
      selectedUserId &&
      pendingVerifications.length > 0 &&
      !pendingVerifications.some((item) => item.userId === selectedUserId)
    ) {
      setSelectedUserId(pendingVerifications[0].userId);
      return;
    }
    if (pendingVerifications.length === 0) {
      setSelectedUserId("");
    }
  }, [selectedUserId, pendingVerifications]);

  const sendInstruction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setFeedbackType(null);
    if (!selectedUserId) {
      setFeedbackType("error");
      setFeedback("Please select a user first.");
      return;
    }

    try {
      setIsSubmittingInstruction(true);
      const response = await httpClient.post<ApiResponse<unknown>>(
        API_ENDPOINTS.AUTH.KBZPAY_SEND_INSTRUCTION(selectedUserId),
        {
          adminPhoneForTransfer: adminPhoneForTransfer.trim(),
          adminNote: instructionNote.trim(),
        }
      );
      setFeedbackType("success");
      setFeedback(response?.message || "Instruction sent successfully.");
      await loadPendingVerifications();
    } catch (error) {
      setFeedbackType("error");
      setFeedback(
        error instanceof Error ? error.message : "Failed to send instruction. Please try again."
      );
    } finally {
      setIsSubmittingInstruction(false);
    }
  };

  const markAsVerified = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setFeedbackType(null);
    if (!selectedUserId) {
      setFeedbackType("error");
      setFeedback("Please select a user first.");
      return;
    }

    try {
      setIsSubmittingVerification(true);
      const response = await httpClient.post<ApiResponse<unknown>>(
        API_ENDPOINTS.AUTH.KBZPAY_VERIFY(selectedUserId),
        { adminNote: verificationNote.trim() }
      );
      setFeedbackType("success");
      setFeedback(response?.message || "User has been marked as KBZPay verified.");
      await loadPendingVerifications();
    } catch (error) {
      setFeedbackType("error");
      setFeedback(
        error instanceof Error ? error.message : "Failed to verify user. Please try again."
      );
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  return (
    <section className="page pageClean">
      <div className="pageHeader">
        <div>
          <p className="pageEyebrow">Verification</p>
          <h1 className="pageTitle">KBZPay Ownership Verification</h1>
        </div>
        <div className="pageHeaderActions">
          <Button type="button" onClick={loadPendingVerifications} disabled={isLoadingPending}>
            {isLoadingPending ? "Refreshing..." : "Refresh queue"}
          </Button>
        </div>
      </div>

      <div className="statsGrid">
        <div className="metricCard metricCardPrimary">
          <div className="metricLabel">Pending requests</div>
          <div className="metricValue">{pendingVerifications.length}</div>
          <div className="metricMeta">
            {isLoadingPending ? "Refreshing verification queue..." : "Awaiting review"}
          </div>
        </div>
        <div className="metricCard">
          <div className="metricLabel">Selected account</div>
          <div className="metricValue metricValueCompact">
            {selectedUser ? selectedUser.userName : "None"}
          </div>
          <div className="metricMeta">
            {selectedUser ? selectedUser.userPhoneOrEmail : "Choose a request to continue"}
          </div>
        </div>
        <div className="metricCard">
          <div className="metricLabel">Verification status</div>
          <div className="metricValue metricValueCompact">
            {selectedUserId ? "Ready" : "Waiting"}
          </div>
          <div className="metricMeta">
            {selectedUserId ? "Actions are enabled for the selected user" : "Select a user from the queue"}
          </div>
        </div>
      </div>

      <div className="dashboardGrid">
        <div className="dashboardMain">
          <div className="card sectionCard">
            <div className="sectionHeader">
              <div>
                <div className="sectionTitle">Target User</div>
              </div>
              <div className="inlineBadge">
                {isLoadingPending ? "Loading" : `${pendingVerifications.length} pending`}
              </div>
            </div>
            <div className="fieldBlock">
              <select
                className="authInput userSelect"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                disabled={isLoadingPending || pendingVerifications.length === 0}
              >
                {pendingVerifications.length === 0 && (
                  <option value="">No pending verification requests</option>
                )}
                {pendingVerifications.map((item) => (
                  <option key={item.id} value={item.userId}>
                    {getUserOptionLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <div className="detailStrip">
              <div className="detailItem">
                <span className="detailLabel">Pending</span>
                <span className="detailValue">{pendingVerifications.length}</span>
              </div>
              <div className="detailItem">
                <span className="detailLabel">Selected</span>
                <span className="detailValue">
                  {selectedUser ? `${selectedUser.userName} (${selectedUser.userPhoneOrEmail})` : "No user selected"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid twoCol">
            <div className="card sectionCard">
              <div className="sectionHeader">
                <div>
                  <div className="sectionTitle">Step 1: Send Transfer Instruction</div>
                </div>
              </div>
              <form className="authForm" onSubmit={sendInstruction}>
                <label className="authLabel" htmlFor="adminPhoneForTransfer">
                  Admin Phone For Transfer
                </label>
                <input
                  id="adminPhoneForTransfer"
                  className="authInput"
                  type="text"
                  value={adminPhoneForTransfer}
                  onChange={(event) => setAdminPhoneForTransfer(event.target.value)}
                  required
                />
                <label className="authLabel" htmlFor="instructionNote">
                  Admin Note
                </label>
                <textarea
                  id="instructionNote"
                  className="authInput"
                  value={instructionNote}
                  onChange={(event) => setInstructionNote(event.target.value)}
                  rows={4}
                  required
                />
                <Button type="submit" disabled={isSubmittingInstruction}>
                  {isSubmittingInstruction ? "Sending..." : "Send Instruction"}
                </Button>
              </form>
            </div>

            <div className="card sectionCard">
              <div className="sectionHeader">
                <div>
                  <div className="sectionTitle">Step 2: Verify Payment</div>
                </div>
              </div>
              <form className="authForm" onSubmit={markAsVerified}>
                <label className="authLabel" htmlFor="verificationNote">
                  Final Admin Note
                </label>
                <textarea
                  id="verificationNote"
                  className="authInput"
                  value={verificationNote}
                  onChange={(event) => setVerificationNote(event.target.value)}
                  rows={6}
                  required
                />
                <Button type="submit" disabled={isSubmittingVerification}>
                  {isSubmittingVerification ? "Verifying..." : "Mark as Verified"}
                </Button>
              </form>
            </div>
          </div>
        </div>

      </div>

      {feedback && (
        <p className={feedbackType === "error" ? "authError surfaceMessage" : "surfaceMessage"} style={{ marginTop: 14 }}>
          {feedback}
        </p>
      )}
    </section>
  );
}
