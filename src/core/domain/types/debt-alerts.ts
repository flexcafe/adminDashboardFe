export interface DebtAlert {
  id: number;
  type: "customer" | "supplier";
  entityId: number;
  entityName: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
  alertType: "approaching" | "due" | "overdue";
  timestamp: string;
  transactionId?: number;
  description?: string;
}

export interface DebtAlertCounters {
  customer: number;
  supplier: number;
  overdue: number;
  dueToday: number;
  approaching: number;
  total: number;
}

export interface DebtAlertNotification {
  title: string;
  message: string;
  severity: "info" | "warning" | "error";
  icon?: string;
}

export type DebtAlertType = DebtAlert["type"];
export type DebtAlertTypeType = DebtAlert["alertType"];
