import { SupplierDebt } from "../entities/SupplierDebt";
import {
  CreateSupplierDebtDTO,
  UpdateSupplierDebtDTO,
  SupplierDebtListResponseDTO,
} from "../../application/dtos/SupplierDebtDTO";

export interface SupplierDebtQueryDTO {
  supplierId?: number;
  isSettled?: boolean;
  dueBefore?: string;
  dueAfter?: string;
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ISupplierDebtService {
  create(debt: CreateSupplierDebtDTO): Promise<SupplierDebt>;
  getList(query?: SupplierDebtQueryDTO): Promise<SupplierDebtListResponseDTO>;
  getAll(): Promise<SupplierDebt[]>;
  getOverdue(): Promise<SupplierDebt[]>;
  getBySupplier(supplierId: number): Promise<SupplierDebt[]>;
  searchDebtsBySupplierName(
    supplierName: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDebtListResponseDTO>;
  searchDebtsByTransactionId(
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
