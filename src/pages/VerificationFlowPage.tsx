import { Outlet } from "react-router-dom";
import { VerificationWorkflowProvider } from "@/features/kbzVerification/VerificationWorkflowContext";

export function VerificationFlowPage() {
  return (
    <VerificationWorkflowProvider>
      <Outlet />
    </VerificationWorkflowProvider>
  );
}
