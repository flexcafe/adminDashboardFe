import { Supplier } from "../entities/Supplier";
import {
  CreateSupplierDTO,
  SupplierFilterDTO,
  SupplierDomainListResponseDTO,
} from "../../application/dtos/SupplierDTO";

export interface ISupplierRepository {
  /**
   * Create a new supplier
   */
  createSupplier(supplierData: CreateSupplierDTO): Promise<Supplier>;

  /**
   * Get suppliers with optional filtering and pagination
   */
  getSuppliers(
    params?: SupplierFilterDTO
  ): Promise<SupplierDomainListResponseDTO>;

  /**
   * Get all suppliers without pagination
   */
  getAllSuppliers(): Promise<Supplier[]>;

  /**
   * Get suppliers with debts
   */
  getSuppliersWithDebts(): Promise<Supplier[]>;

  /**
   * Get supplier by ID
   */
  getSupplierById(id: number): Promise<Supplier>;

  /**
   * Update supplier
   */
  updateSupplier(
    id: number,
    supplierData: Partial<Supplier>
  ): Promise<Supplier>;

  /**
   * Delete supplier (soft delete)
   */
  deleteSupplier(id: number): Promise<boolean>;

  /**
   * Get supplier by email
   */
  getSupplierByEmail(email: string): Promise<Supplier>;

  /**
   * Get supplier by phone
   */
  getSupplierByPhone(phone: string): Promise<Supplier>;

  /**
   * Get deleted suppliers
   */
  getDeletedSuppliers(): Promise<Supplier[]>;

  /**
   * Restore a deleted supplier
   */
  restoreSupplier(id: number): Promise<Supplier>;
}
