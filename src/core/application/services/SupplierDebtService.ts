import {
  ISupplierDebtService,
  SupplierDebtQueryDTO,
} from "../../domain/services/ISupplierDebtService";
import { ISupplierDebtRepository } from "../../domain/repositories/ISupplierDebtRepository";
import { SupplierDebt } from "../../domain/entities/SupplierDebt";
import {
  CreateSupplierDebtDTO,
  UpdateSupplierDebtDTO,
  SupplierDebtListResponseDTO,
} from "../dtos/SupplierDebtDTO";

export class SupplierDebtService implements ISupplierDebtService {
  constructor(private repo: ISupplierDebtRepository) {}

  async create(debt: CreateSupplierDebtDTO): Promise<SupplierDebt> {
    if (!debt.supplierId || !debt.amount || !debt.dueDate) {
      throw new Error("supplierId, amount and dueDate are required");
    }
    return this.repo.create({ isSettled: false, ...debt });
  }

  async getList(
    query?: SupplierDebtQueryDTO
  ): Promise<SupplierDebtListResponseDTO> {
    // Pass through; repository adapts API shapes
    return this.repo.getList(query);
  }

  async getAll(): Promise<SupplierDebt[]> {
    return this.repo.getAll();
  }

  async getOverdue(): Promise<SupplierDebt[]> {
    return this.repo.getOverdue();
  }

  async getBySupplier(supplierId: number): Promise<SupplierDebt[]> {
    if (!supplierId || supplierId <= 0) throw new Error("Invalid supplierId");
    return this.repo.getBySupplier(supplierId);
  }

  async searchDebtsBySupplierName(
    supplierName: string,
    take = 10,
    skip = 0,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDebtListResponseDTO> {
    if (!supplierName || supplierName.trim() === "")
      throw new Error("Invalid supplierName");
    return this.repo.searchBySupplierName(
      supplierName,
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
  ): Promise<SupplierDebtListResponseDTO> {
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

  async getByTransaction(transactionId: number): Promise<SupplierDebt> {
    if (!transactionId || transactionId <= 0)
      throw new Error("Invalid transactionId");
    return this.repo.getByTransaction(transactionId);
  }

  async getById(id: number): Promise<SupplierDebt> {
    if (!id || id <= 0) throw new Error("Invalid id");
    return this.repo.getById(id);
  }

  async update(
    id: number,
    update: UpdateSupplierDebtDTO
  ): Promise<SupplierDebt> {
    if (!id || id <= 0) throw new Error("Invalid id");
    return this.repo.update(id, update);
  }

  async delete(id: number): Promise<boolean> {
    if (!id || id <= 0) throw new Error("Invalid id");
    return this.repo.delete(id);
  }

  async settle(id: number): Promise<SupplierDebt> {
    if (!id || id <= 0) throw new Error("Invalid id");
    return this.repo.settle(id);
  }

  async markAlertSent(id: number): Promise<SupplierDebt> {
    if (!id || id <= 0) throw new Error("Invalid id");
    return this.repo.markAlertSent(id);
  }
}
