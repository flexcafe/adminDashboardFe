import { CustomerDebt } from "../entities/CustomerDebt";
import {
  CreateCustomerDebtDTO,
  UpdateCustomerDebtDTO,
  CustomerDebtListResponseDTO,
} from "../../application/dtos/CustomerDebtDTO";

export interface CustomerDebtQueryDTO {
  customerId?: number;
  isSettled?: boolean;
  alertSent?: boolean;
  dueBefore?: string;
  dueAfter?: string;
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ICustomerDebtService {
  create(debt: CreateCustomerDebtDTO): Promise<CustomerDebt>;
  getList(query?: CustomerDebtQueryDTO): Promise<CustomerDebtListResponseDTO>;
  getAll(): Promise<CustomerDebt[]>;
  getOverdue(): Promise<CustomerDebt[]>;
  getByCustomer(customerId: number): Promise<CustomerDebt[]>;
  searchDebtsByCustomerName(
    customerName: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<CustomerDebtListResponseDTO>;
  searchDebtsByTransactionId(
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
    query?: CustomerDebtQueryDTO
  ): Promise<CustomerDebtListResponseDTO>;
  getCreditBalances(
    query?: CustomerDebtQueryDTO
  ): Promise<CustomerDebtListResponseDTO>;
  getExchangeDebts(
    query?: CustomerDebtQueryDTO
  ): Promise<CustomerDebtListResponseDTO>;
  getRefundAdjustments(
    query?: CustomerDebtQueryDTO
  ): Promise<CustomerDebtListResponseDTO>;
  getSummaryByCustomer(customerId: number): Promise<unknown>;
}
