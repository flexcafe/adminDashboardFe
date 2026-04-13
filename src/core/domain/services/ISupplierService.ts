import { Supplier } from "../entities/Supplier";
import {
  CreateSupplierDTO,
  UpdateSupplierDTO,
  SupplierFilterDTO,
  SupplierDomainListResponseDTO,
} from "../../application/dtos/SupplierDTO";

/**
 * Interface for supplier service
 */
export interface ISupplierService {
  /**
   * Create a new supplier
   */
  createSupplier(supplierData: CreateSupplierDTO): Promise<Supplier>;

  /**
   * Get suppliers with pagination, filtering, and sorting
   */
  getSuppliers(
    params?: SupplierFilterDTO
  ): Promise<SupplierDomainListResponseDTO>;

  /**
   * Get all suppliers
   */
  getAllSuppliers(): Promise<Supplier[]>;

  /**
   * Get suppliers with debts
   */
  getSuppliersWithDebts(
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO>;

  /**
   * Get supplier by ID
   */
  getSupplierById(id: number): Promise<Supplier>;

  /**
   * Update supplier
   */
  updateSupplier(
    id: number,
    supplierData: UpdateSupplierDTO
  ): Promise<Supplier>;

  /**
   * Delete supplier
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
   * Search suppliers by name
   */
  searchSuppliersByName(
    name: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO>;

  /**
   * Search suppliers by email
   */
  searchSuppliersByEmail(
    email: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO>;

  /**
   * Search suppliers by phone
   */
  searchSuppliersByPhone(
    phone: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO>;

  /**
   * Search suppliers by address
   */
  searchSuppliersByAddress(
    address: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO>;

  /**
   * Search suppliers by contact person
   */
  searchSuppliersByContactPerson(
    contactPerson: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO>;

  /**
   * General search suppliers
   */
  searchSuppliers(
    query: string,
    take?: number,
    skip?: number
  ): Promise<SupplierDomainListResponseDTO>;

  /**
   * Get suppliers with overdue debts
   */
  getSuppliersWithOverdueDebts(
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO>;

  /**
   * Get deleted suppliers
   */
  getDeletedSuppliers(
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO>;

  /**
   * Restore deleted supplier
   */
  restoreSupplier(id: number): Promise<Supplier>;
}
