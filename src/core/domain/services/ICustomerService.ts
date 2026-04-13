import { Customer } from "../entities/Customer";
import {
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerFilterDTO,
  CustomerDomainListResponseDTO,
} from "../../application/dtos/CustomerDTO";

/**
 * Interface for customer service
 */
export interface ICustomerService {
  /**
   * Create a new customer
   */
  createCustomer(customerData: CreateCustomerDTO): Promise<Customer>;

  /**
   * Get customers with pagination, filtering, and sorting
   */
  getCustomers(
    params?: CustomerFilterDTO
  ): Promise<CustomerDomainListResponseDTO>;

  /**
   * Get all customers
   */
  getAllCustomers(): Promise<Customer[]>;

  /**
   * Get customers with debts
   */
  getCustomersWithDebts(
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<CustomerDomainListResponseDTO>;

  /**
   * Get customer by ID
   */
  getCustomerById(id: number): Promise<Customer>;

  /**
   * Update customer
   */
  updateCustomer(
    id: number,
    customerData: UpdateCustomerDTO
  ): Promise<Customer>;

  /**
   * Delete customer
   */
  deleteCustomer(id: number): Promise<boolean>;

  /**
   * Get customer by email
   */
  getCustomerByEmail(email: string): Promise<Customer>;

  /**
   * Get customer by phone
   */
  getCustomerByPhone(phone: string): Promise<Customer>;

  /**
   * Search customers by name
   */
  searchCustomersByName(
    name: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<CustomerDomainListResponseDTO>;

  /**
   * Search customers by email
   */
  searchCustomersByEmail(
    email: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<CustomerDomainListResponseDTO>;

  /**
   * Search customers by phone
   */
  searchCustomersByPhone(
    phone: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<CustomerDomainListResponseDTO>;

  /**
   * Search customers by address
   */
  searchCustomersByAddress(
    address: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<CustomerDomainListResponseDTO>;

  /**
   * General search customers
   */
  searchCustomers(
    query: string,
    take?: number,
    skip?: number
  ): Promise<CustomerDomainListResponseDTO>;

  /**
   * Get customers with overdue debts
   */
  getCustomersWithOverdueDebts(
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<CustomerDomainListResponseDTO>;

  /**
   * Get deleted customers
   */
  getDeletedCustomers(
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<CustomerDomainListResponseDTO>;

  /**
   * Restore deleted customer
   */
  restoreCustomer(id: number): Promise<Customer>;
}
