import { CustomerDebt } from "../entities/CustomerDebt";
import {
  CreateCustomerDebtDTO,
  UpdateCustomerDebtDTO,
  CustomerDebtListResponseDTO,
} from "../../application/dtos/CustomerDebtDTO";

export interface CustomerDebtFilterDTO {
  customerId?: number;
  customerName?: string;
  isSettled?: boolean;
  alertSent?: boolean;
  dueBefore?: string; // ISO
  dueAfter?: string; // ISO
  overdue?: boolean; // Filter for overdue debts (past due date, not settled)
  farFromDue?: boolean; // Filter for debts due within 3 days (not settled)
  dueToday?: boolean; // Filter for debts due today (not settled)
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ICustomerDebtRepository {
  create(debt: CreateCustomerDebtDTO): Promise<CustomerDebt>;
  getList(filter?: CustomerDebtFilterDTO): Promise<CustomerDebtListResponseDTO>;
  getAll(): Promise<CustomerDebt[]>;
  getOverdue(): Promise<CustomerDebt[]>;
  getByCustomer(customerId: number): Promise<CustomerDebt[]>;
  searchByCustomerName(
    customerName: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<CustomerDebtListResponseDTO>;
  searchByTransactionId(
    transactionId: number,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<CustomerDebtListResponseDTO>;
  getByTransaction(transactionId: number): Promise<CustomerDebt>;
  getById(id: number): Promise<CustomerDebt>;
  update(id: number, update: UpdateCustomerDebtDTO): Promise<CustomerDebt>;
  delete(id: number): Promise<boolean>;
  settle(id: number): Promise<CustomerDebt>;
  markAlertSent(id: number): Promise<CustomerDebt>;
  getPurchaseDebts(
    filter?: CustomerDebtFilterDTO
  ): Promise<CustomerDebtListResponseDTO>;
  getCreditBalances(
    filter?: CustomerDebtFilterDTO
  ): Promise<CustomerDebtListResponseDTO>;
  getExchangeDebts(
    filter?: CustomerDebtFilterDTO
  ): Promise<CustomerDebtListResponseDTO>;
  getRefundAdjustments(
    filter?: CustomerDebtFilterDTO
  ): Promise<CustomerDebtListResponseDTO>;
  getSummaryByCustomer(customerId: number): Promise<unknown>;
}
