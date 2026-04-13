import { SupplierDebt } from "../../domain/entities/SupplierDebt";

export interface CreateSupplierDebtDTO {
  supplierId: number;
  amount: number;
  dueDate: string; // ISO string
  isSettled?: boolean;
  transactionId?: number;
  remarks?: string;
}

export interface UpdateSupplierDebtDTO {
  amount?: number;
  dueDate?: string; // ISO string
  isSettled?: boolean;
  alertSent?: boolean;
  remarks?: string;
}

export interface SupplierDebtListResponseDTO {
  debts: SupplierDebt[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export class SupplierDebtDTOMapper {
  static toDomainListResponseDTO(
    debts: SupplierDebt[],
    total: number,
    page: number,
    limit: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPrevPage: boolean
  ): SupplierDebtListResponseDTO {
    return { debts, total, page, limit, totalPages, hasNextPage, hasPrevPage };
  }
}




