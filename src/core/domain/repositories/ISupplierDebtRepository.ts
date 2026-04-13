import { SupplierDebt } from "../entities/SupplierDebt";
import {
  CreateSupplierDebtDTO,
  UpdateSupplierDebtDTO,
  SupplierDebtListResponseDTO,
} from "../../application/dtos/SupplierDebtDTO";

export interface SupplierDebtFilterDTO {
  supplierId?: number;
  supplierName?: string;
  isSettled?: boolean;
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

export interface ISupplierDebtRepository {
  create(debt: CreateSupplierDebtDTO): Promise<SupplierDebt>;
  getList(filter?: SupplierDebtFilterDTO): Promise<SupplierDebtListResponseDTO>;
  getAll(): Promise<SupplierDebt[]>;
  getOverdue(): Promise<SupplierDebt[]>;
  getBySupplier(supplierId: number): Promise<SupplierDebt[]>;
  searchBySupplierName(
    supplierName: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDebtListResponseDTO>;
  searchByTransactionId(
    transactionId: number,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDebtListResponseDTO>;
  getByTransaction(transactionId: number): Promise<SupplierDebt>;
  getById(id: number): Promise<SupplierDebt>;
  update(id: number, update: UpdateSupplierDebtDTO): Promise<SupplierDebt>;
  delete(id: number): Promise<boolean>;
  settle(id: number): Promise<SupplierDebt>;
  markAlertSent(id: number): Promise<SupplierDebt>;
}
