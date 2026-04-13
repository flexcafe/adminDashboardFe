import {
  ICustomerDebtService,
  CustomerDebtQueryDTO,
} from "../../domain/services/ICustomerDebtService";
import { ICustomerDebtRepository } from "../../domain/repositories/ICustomerDebtRepository";
import { CustomerDebt } from "../../domain/entities/CustomerDebt";
import {
  CreateCustomerDebtDTO,
  UpdateCustomerDebtDTO,
  CustomerDebtListResponseDTO,
} from "../dtos/CustomerDebtDTO";

export class CustomerDebtService implements ICustomerDebtService {
  constructor(private repo: ICustomerDebtRepository) {}

  async create(debt: CreateCustomerDebtDTO): Promise<CustomerDebt> {
    if (!debt.customerId || !debt.amount || !debt.dueDate) {
      throw new Error("customerId, amount and dueDate are required");
    }
    return this.repo.create({ isSettled: false, ...debt });
  }

  async getList(
    query?: CustomerDebtQueryDTO
  ): Promise<CustomerDebtListResponseDTO> {
    // Pass through; repository adapts API shapes
    return this.repo.getList(query);
  }

  async getAll(): Promise<CustomerDebt[]> {
    return this.repo.getAll();
  }

  async getOverdue(): Promise<CustomerDebt[]> {
    return this.repo.getOverdue();
  }

  async getByCustomer(customerId: number): Promise<CustomerDebt[]> {
    if (!customerId || customerId <= 0) throw new Error("Invalid customerId");
    return this.repo.getByCustomer(customerId);
  }

  async searchDebtsByCustomerName(
    customerName: string,
    take = 10,
    skip = 0,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<CustomerDebtListResponseDTO> {
    if (!customerName || customerName.trim() === "")
      throw new Error("Invalid customerName");
    return this.repo.searchByCustomerName(
      customerName,
      take,
      skip,
      sortBy,
      sortOrder
    );
  }

  async searchDebtsByTransactionId(
    transactionId: number,
    take = 10,
    skip = 0,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<CustomerDebtListResponseDTO> {
    if (!transactionId || transactionId <= 0)
      throw new Error("Invalid transactionId");
    return this.repo.searchByTransactionId(
      transactionId,
      take,
      skip,
      sortBy,
      sortOrder
    );
  }

  async getByTransaction(transactionId: number): Promise<CustomerDebt> {
    if (!transactionId || transactionId <= 0)
      throw new Error("Invalid transactionId");
    return this.repo.getByTransaction(transactionId);
  }

  async getById(id: number): Promise<CustomerDebt> {
    if (!id || id <= 0) throw new Error("Invalid id");
    return this.repo.getById(id);
  }

  async update(
    id: number,
    update: UpdateCustomerDebtDTO
  ): Promise<CustomerDebt> {
    if (!id || id <= 0) throw new Error("Invalid id");
    return this.repo.update(id, update);
  }

  async delete(id: number): Promise<boolean> {
    if (!id || id <= 0) throw new Error("Invalid id");
    return this.repo.delete(id);
  }

  async settle(id: number): Promise<CustomerDebt> {
    if (!id || id <= 0) throw new Error("Invalid id");
    return this.repo.settle(id);
  }

  async markAlertSent(id: number): Promise<CustomerDebt> {
    if (!id || id <= 0) throw new Error("Invalid id");
    return this.repo.markAlertSent(id);
  }

  async getPurchaseDebts(
    query?: CustomerDebtQueryDTO
  ): Promise<CustomerDebtListResponseDTO> {
    return this.repo.getPurchaseDebts(query);
  }

  async getCreditBalances(
    query?: CustomerDebtQueryDTO
  ): Promise<CustomerDebtListResponseDTO> {
    return this.repo.getCreditBalances(query);
  }

  async getExchangeDebts(
    query?: CustomerDebtQueryDTO
  ): Promise<CustomerDebtListResponseDTO> {
    return this.repo.getExchangeDebts(query);
  }

  async getRefundAdjustments(
    query?: CustomerDebtQueryDTO
  ): Promise<CustomerDebtListResponseDTO> {
    return this.repo.getRefundAdjustments(query);
  }

  async getSummaryByCustomer(customerId: number): Promise<unknown> {
    if (!customerId || customerId <= 0) throw new Error("Invalid customerId");
    return this.repo.getSummaryByCustomer(customerId);
  }
}
