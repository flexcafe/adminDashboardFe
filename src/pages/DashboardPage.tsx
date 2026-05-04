import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "../shared/ui/Button/Button";
import container from "@/core/infrastructure/di/container";
import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import { API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import { useUserManagement } from "@/core/presentation/hooks/useUserManagement";

type ApiResponse<T> = {
  message?: string;
  code?: number;
  data?: T;
};

export function DashboardPage() {
  const httpClient = container.resolve<HttpClient>("httpClient");
  const { users, totalUsers, loadUsers, isLoading: isUsersLoading } =
    useUserManagement();

  const [selectedUserId, setSelectedUserId] = useState("");
  const [adminPhoneForTransfer, setAdminPhoneForTransfer] =
    useState("+959700000000");
  const [instructionNote, setInstructionNote] = useState(
    "Transfer exactly 100 MMK and include your nickname in note."
  );
  const [verificationNote, setVerificationNote] = useState(
    "Received 100 MMK and confirmed account owner."
  );
  const [isSubmittingInstruction, setIsSubmittingInstruction] = useState(false);
  const [isSubmittingVerification, setIsSubmittingVerification] =
    useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(
    null
  );

  useEffect(() => {
    loadUsers({ take: 50, skip: 0 });
  }, [loadUsers]);

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUserId, users]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [users, selectedUserId]
  );

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
      setFeedback(
        response?.message ||
          "Instruction sent successfully. Ask the user to transfer 100 MMK now."
      );
    } catch (error) {
      setFeedbackType("error");
      setFeedback(
        error instanceof Error
          ? error.message
          : "Failed to send instruction. Please try again."
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
        {
          adminNote: verificationNote.trim(),
        }
      );

      setFeedbackType("success");
      setFeedback(
        response?.message || "User has been marked as KBZPay verified."
      );
    } catch (error) {
      setFeedbackType("error");
      setFeedback(
        error instanceof Error
          ? error.message
          : "Failed to verify user. Please try again."
      );
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  return (
    <section className="page">
      <div className="pageHeader">
        <h1 className="pageTitle">KBZPay Ownership Verification</h1>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="cardLabel">Target User</div>
        <div style={{ marginTop: 10 }}>
          <select
            className="authInput"
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            disabled={isUsersLoading || users.length === 0}
          >
            {users.length === 0 && <option value="">No users available</option>}
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.phone || user.email || "No contact"}) -{" "}
                {user.id}
              </option>
            ))}
          </select>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          Loaded users: {totalUsers}
          {selectedUser
            ? ` | Selected: ${selectedUser.name} (${selectedUser.phone || selectedUser.email || "No contact"})`
            : ""}
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <div className="card">
          <div className="cardLabel">Step 1: Send Transfer Instruction</div>
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
              placeholder="+959700000000"
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
              placeholder="Transfer exactly 100 MMK and include your nickname in note."
              required
            />

            <Button type="submit" disabled={isSubmittingInstruction}>
              {isSubmittingInstruction ? "Sending..." : "Send Instruction"}
            </Button>
          </form>
        </div>

        <div className="card">
          <div className="cardLabel">Step 2: Verify Payment</div>
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
              placeholder="Received 100 MMK and confirmed account owner."
              required
            />

            <Button type="submit" disabled={isSubmittingVerification}>
              {isSubmittingVerification ? "Verifying..." : "Mark as Verified"}
            </Button>
          </form>
        </div>
      </div>

      {feedback && (
        <p
          className={feedbackType === "error" ? "authError" : "muted"}
          style={{ marginTop: 14 }}
        >
          {feedback}
        </p>
      )}
    </section>
  );
}
