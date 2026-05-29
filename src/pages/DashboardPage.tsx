import { useEffect, useState } from "react";
import { VerificationList } from "@/components/kbzVerification/VerificationList";
import { useAdminNotifications } from "@/features/adminNotifications/AdminNotificationsContext";
import { useVerificationWorkflow } from "@/features/kbzVerification/VerificationWorkflowContext";
import type { VerificationListTab } from "@/features/kbzVerification/types";

export function DashboardPage() {
  const { lastNotificationAt } = useAdminNotifications();
  const {
    registeredAccounts,
    verificationRequested,
    moneyCheckRequests,
    verifiedUsers,
    isLoading: isVerificationLoading,
    error: verificationError,
    refreshRequests,
  } = useVerificationWorkflow();
  const [activeTab, setActiveTab] = useState<VerificationListTab>("requested");

  useEffect(() => {
    if (!lastNotificationAt) return;
    void refreshRequests();
  }, [lastNotificationAt, refreshRequests]);

  return (
    <div className="dashboardPage">
      <VerificationList
        activeTab={activeTab}
        onTabChange={setActiveTab}
        registeredAccounts={registeredAccounts}
        verificationRequested={verificationRequested}
        moneyCheckRequests={moneyCheckRequests}
        verifiedUsers={verifiedUsers}
        isLoading={isVerificationLoading}
        error={verificationError}
        onRefresh={() => {
          void refreshRequests();
        }}
      />
    </div>
  );
}
