import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import { API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import { DebtAlert, DebtAlertCounters } from "@/core/domain/types/debt-alerts";

export class DebtAlertService {
  private httpClient: HttpClient;

  constructor() {
    this.httpClient = new HttpClient();
  }

  async getAllAlerts(): Promise<DebtAlert[]> {
    try {
      const response = await this.httpClient.get<DebtAlert[]>(
        API_ENDPOINTS.DEBT_ALERTS.GET_ALL
      );
      return response;
    } catch (error) {
      console.error("Failed to fetch all debt alerts:", error);
      throw error;
    }
  }

  async getActiveAlerts(): Promise<DebtAlert[]> {
    try {
      const response = await this.httpClient.get<DebtAlert[]>(
        API_ENDPOINTS.DEBT_ALERTS.GET_ACTIVE
      );
      return response;
    } catch (error) {
      console.error("Failed to fetch active debt alerts:", error);
      throw error;
    }
  }

  async getAlertsByType(type: "customer" | "supplier"): Promise<DebtAlert[]> {
    try {
      const response = await this.httpClient.get<DebtAlert[]>(
        API_ENDPOINTS.DEBT_ALERTS.GET_BY_TYPE(type)
      );
      return response;
    } catch (error) {
      console.error(`Failed to fetch ${type} debt alerts:`, error);
      throw error;
    }
  }

  async getAlertsByAlertType(
    alertType: "approaching" | "due" | "overdue"
  ): Promise<DebtAlert[]> {
    try {
      const response = await this.httpClient.get<DebtAlert[]>(
        API_ENDPOINTS.DEBT_ALERTS.GET_BY_ALERT_TYPE(alertType)
      );
      return response;
    } catch (error) {
      console.error(`Failed to fetch ${alertType} debt alerts:`, error);
      throw error;
    }
  }

  async markAlertAsRead(alertId: number): Promise<void> {
    try {
      await this.httpClient.patch(
        API_ENDPOINTS.DEBT_ALERTS.MARK_READ(alertId.toString()),
        {}
      );
    } catch (error) {
      console.error("Failed to mark debt alert as read:", error);
      throw error;
    }
  }

  async markAllAlertsAsRead(): Promise<void> {
    try {
      await this.httpClient.patch(API_ENDPOINTS.DEBT_ALERTS.MARK_ALL_READ, {});
    } catch (error) {
      console.error("Failed to mark all debt alerts as read:", error);
      throw error;
    }
  }

  async getAlertCounters(): Promise<DebtAlertCounters> {
    try {
      const response = await this.httpClient.get<DebtAlertCounters>(
        API_ENDPOINTS.DEBT_ALERTS.GET_COUNTERS
      );
      return response;
    } catch (error) {
      console.error("Failed to fetch debt alert counters:", error);
      throw error;
    }
  }

  // Helper method to get overdue alerts
  async getOverdueAlerts(): Promise<DebtAlert[]> {
    return this.getAlertsByAlertType("overdue");
  }

  // Helper method to get due today alerts
  async getDueTodayAlerts(): Promise<DebtAlert[]> {
    return this.getAlertsByAlertType("due");
  }

  // Helper method to get approaching alerts
  async getApproachingAlerts(): Promise<DebtAlert[]> {
    return this.getAlertsByAlertType("approaching");
  }
}

// Singleton instance
export const debtAlertService = new DebtAlertService();
