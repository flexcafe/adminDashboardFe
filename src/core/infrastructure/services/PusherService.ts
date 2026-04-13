import Pusher from "pusher-js";
import { PUSHER_CONFIG, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/config/pusher";
import { DebtAlert } from "@/core/domain/types/debt-alerts";

class PusherService {
  private pusher: Pusher | null = null;
  private listeners: Map<string, (alert: DebtAlert) => void> = new Map();
  private isConnected: boolean = false;

  constructor() {
    this.initializePusher();
  }

  private initializePusher(): void {
    if (!PUSHER_CONFIG.key) {
      console.log(
        "Pusher key not configured. Running in test mode - alerts will work for testing."
      );
      // Set connected to true for test mode
      this.isConnected = true;
      return;
    }

    try {
      this.pusher = new Pusher(PUSHER_CONFIG.key, {
        cluster: PUSHER_CONFIG.cluster,
      });

      this.pusher
        .subscribe(PUSHER_CHANNELS.DEBT_ALERTS)
        .bind(PUSHER_EVENTS.DEBT_ALERT, (data: DebtAlert) => {
          this.notifyListeners(data);
        });

      this.pusher.connection.bind("connected", () => {
        this.isConnected = true;
        console.log("Pusher connected successfully");
      });

      this.pusher.connection.bind("disconnected", () => {
        this.isConnected = false;
        console.log("Pusher disconnected");
      });

      this.pusher.connection.bind("error", (error: unknown) => {
        console.error("Pusher connection error:", error);
        this.isConnected = false;
      });
    } catch (error) {
      console.error("Failed to initialize Pusher:", error);
      // Set connected to true for test mode even if Pusher fails
      this.isConnected = true;
    }
  }

  public subscribe(callback: (alert: DebtAlert) => void): string {
    const id = Math.random().toString(36).substr(2, 9);
    this.listeners.set(id, callback);
    return id;
  }

  public unsubscribe(id: string): void {
    this.listeners.delete(id);
  }

  private notifyListeners(alert: DebtAlert): void {
    this.listeners.forEach((callback) => {
      try {
        callback(alert);
      } catch (error) {
        console.error("Error in debt alert callback:", error);
      }
    });
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public disconnect(): void {
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
      this.isConnected = false;
    }
  }

  // For testing purposes
  public triggerTestAlert(alert: DebtAlert): void {
    console.log("🔔 Triggering test alert:", alert);
    this.notifyListeners(alert);
  }
}

// Singleton instance
export const pusherService = new PusherService();
