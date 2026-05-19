import { AdminChatWorkspace } from "@/components/adminChat/AdminChatWorkspace";
import { AdminChatProvider } from "@/features/adminChat/AdminChatContext";

export function AdminChatPage() {
  return (
    <AdminChatProvider>
      <AdminChatWorkspace />
    </AdminChatProvider>
  );
}
