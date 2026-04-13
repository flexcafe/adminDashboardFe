import { CustomerDebt } from "../../domain/entities/CustomerDebt";

export interface CreateCustomerDebtDTO {
  customerId: number;
  amount: number;
  dueDate: string; // ISO string
  isSettled?: boolean;
  transactionId?: number;
  remarks?: string;
}

export interface UpdateCustomerDebtDTO {
  amount?: number;
  dueDate?: string; // ISO string
  isSettled?: boolean;
  alertSent?: boolean;
  remarks?: string;
}

export interface CustomerDebtListResponseDTO {
  debts: CustomerDebt[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export class CustomerDebtDTOMapper {
  static toDomainListResponseDTO(
    debts: CustomerDebt[],
    total: number,
    page: number,
    limit: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPrevPage: boolean
  ): CustomerDebtListResponseDTO {
    return { debts, total, page, limit, totalPages, hasNextPage, hasPrevPage };
  }
}



