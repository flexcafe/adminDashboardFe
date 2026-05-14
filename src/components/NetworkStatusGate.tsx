import { useEffect, useState, type ReactNode } from "react";
import { LoadingScreen } from "./LoadingScreen";

type NetworkStatusGateProps = {
  children: ReactNode;
};

export function NetworkStatusGate({ children }: NetworkStatusGateProps) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <LoadingScreen
        title="No Internet"
        subtitle="Your connection is offline. Please check your network and try again."
        badge="Offline Alert"
      />
    );
  }

  return <>{children}</>;
}
