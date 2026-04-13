import { useState, useCallback } from "react";
import { ICustomerService } from "../../domain/services/ICustomerService";
import { Customer } from "../../domain/entities/Customer";
import {
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerFilterDTO,
  CustomerDomainListResponseDTO,
} from "../../application/dtos/CustomerDTO";
import container from "../../infrastructure/di/container";

interface UseCustomerManagementReturn {
  // State
  customers: Customer[];
  totalCustomers: number;
  currentCustomer: Customer | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createCustomer: (customerData: CreateCustomerDTO) => Promise<Customer>;
  getCustomers: (
    params?: CustomerFilterDTO
  ) => Promise<CustomerDomainListResponseDTO>;
  getAllCustomers: () => Promise<Customer[]>;
  getCustomersWithDebts: (
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<CustomerDomainListResponseDTO>;
  getDeletedCustomers: (
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<CustomerDomainListResponseDTO>;
  getCustomerById: (id: number) => Promise<Customer>;
  updateCustomer: (
    id: number,
    customerData: UpdateCustomerDTO
  ) => Promise<Customer>;
  deleteCustomer: (id: number) => Promise<boolean>;
  restoreCustomer: (id: number) => Promise<Customer>;
  searchCustomers: (
    query: string,
    take?: number,
    skip?: number
  ) => Promise<CustomerDomainListResponseDTO>;
  searchCustomersByName: (
    name: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<CustomerDomainListResponseDTO>;
  searchCustomersByEmail: (
    email: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<CustomerDomainListResponseDTO>;
  searchCustomersByPhone: (
    phone: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<CustomerDomainListResponseDTO>;
  searchCustomersByAddress: (
    address: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<CustomerDomainListResponseDTO>;
  getCustomersWithOverdueDebts: (
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<CustomerDomainListResponseDTO>;
  clearError: () => void;
}

/**
 * Custom hook for customer management operations
 */
export function useCustomerManagement(): UseCustomerManagementReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get service from container
  const customerService =
    container.resolve<ICustomerService>("customerService");

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createCustomer = useCallback(
    async (customerData: CreateCustomerDTO) => {
      try {
        setIsLoading(true);
        clearError();

        const customer = await customerService.createCustomer(customerData);

        setCustomers((prev) => [customer, ...prev]);
        setTotalCustomers((prev) => prev + 1);
        return customer;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create customer";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const getCustomers = useCallback(
    async (params?: CustomerFilterDTO) => {
      try {
        setIsLoading(true);
        clearError();

        console.log(
          "useCustomerManagement: Starting getCustomers with params:",
          params
        );

        console.log("useCustomerManagement: Customer service resolved");

        const result = await customerService.getCustomers(params);

        console.log("useCustomerManagement: Service returned result:", result);
        console.log(
          "useCustomerManagement: Customers array:",
          result.customers
        );

        setCustomers(result.customers);
        setTotalCustomers(result.total);

        return result;
      } catch (err) {
        console.error("useCustomerManagement: Error in getCustomers:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch customers";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const getAllCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      clearError();

      const allCustomers = await customerService.getAllCustomers();
      setCustomers(allCustomers);
      setTotalCustomers(allCustomers.length);
      return allCustomers;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch all customers";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [clearError, customerService]);

  const getCustomersWithDebts = useCallback(
    async (
      take?: number,
      skip?: number,
      sortBy?: string,
      sortOrder?: "asc" | "desc"
    ) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await customerService.getCustomersWithDebts(
          take,
          skip,
          sortBy,
          sortOrder
        );

        setCustomers(result.customers);
        setTotalCustomers(result.total);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch customers with debts";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const getCustomerById = useCallback(
    async (id: number) => {
      try {
        setIsLoading(true);
        clearError();

        const customer = await customerService.getCustomerById(id);
        setCurrentCustomer(customer);
        return customer;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch customer";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const updateCustomer = useCallback(
    async (id: number, customerData: UpdateCustomerDTO) => {
      try {
        setIsLoading(true);
        clearError();

        const updatedCustomer = await customerService.updateCustomer(
          id,
          customerData
        );

        setCustomers((prev) =>
          prev.map((customer) =>
            customer.id === id ? updatedCustomer : customer
          )
        );

        if (currentCustomer?.id === id) {
          setCurrentCustomer(updatedCustomer);
        }

        return updatedCustomer;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update customer";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService, currentCustomer]
  );

  const deleteCustomer = useCallback(
    async (id: number) => {
      try {
        setIsLoading(true);
        clearError();

        const success = await customerService.deleteCustomer(id);

        if (success) {
          setCustomers((prev) => prev.filter((customer) => customer.id !== id));
          setTotalCustomers((prev) => prev - 1);

          if (currentCustomer?.id === id) {
            setCurrentCustomer(null);
          }
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete customer";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService, currentCustomer]
  );

  const searchCustomers = useCallback(
    async (query: string, take?: number, skip?: number) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await customerService.searchCustomers(query, take, skip);

        setCustomers(result.customers);
        setTotalCustomers(result.total);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to search customers";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const searchCustomersByName = useCallback(
    async (
      name: string,
      take?: number,
      skip?: number,
      sortBy?: string,
      sortOrder?: "asc" | "desc"
    ) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await customerService.searchCustomersByName(
          name,
          take || 10,
          skip || 0,
          sortBy,
          sortOrder
        );

        setCustomers(result.customers);
        setTotalCustomers(result.total);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to search customers by name";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const searchCustomersByEmail = useCallback(
    async (
      email: string,
      take?: number,
      skip?: number,
      sortBy?: string,
      sortOrder?: "asc" | "desc"
    ) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await customerService.searchCustomersByEmail(
          email,
          take || 10,
          skip || 0,
          sortBy,
          sortOrder
        );

        setCustomers(result.customers);
        setTotalCustomers(result.total);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to search customers by email";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const searchCustomersByPhone = useCallback(
    async (
      phone: string,
      take?: number,
      skip?: number,
      sortBy?: string,
      sortOrder?: "asc" | "desc"
    ) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await customerService.searchCustomersByPhone(
          phone,
          take || 10,
          skip || 0,
          sortBy,
          sortOrder
        );

        setCustomers(result.customers);
        setTotalCustomers(result.total);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to search customers by phone";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const searchCustomersByAddress = useCallback(
    async (
      address: string,
      take?: number,
      skip?: number,
      sortBy?: string,
      sortOrder?: "asc" | "desc"
    ) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await customerService.searchCustomersByAddress(
          address,
          take || 10,
          skip || 0,
          sortBy,
          sortOrder
        );

        setCustomers(result.customers);
        setTotalCustomers(result.total);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to search customers by address";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const getCustomersWithOverdueDebts = useCallback(
    async (
      take?: number,
      skip?: number,
      sortBy?: string,
      sortOrder?: "asc" | "desc"
    ) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await customerService.getCustomersWithOverdueDebts(
          take,
          skip,
          sortBy,
          sortOrder
        );

        setCustomers(result.customers);
        setTotalCustomers(result.total);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch customers with overdue debts";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const getDeletedCustomers = useCallback(
    async (
      take?: number,
      skip?: number,
      sortBy?: string,
      sortOrder?: "asc" | "desc"
    ) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await customerService.getDeletedCustomers(
          take,
          skip,
          sortBy,
          sortOrder
        );
        setCustomers(result.customers);
        setTotalCustomers(result.total);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch deleted customers";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  const restoreCustomer = useCallback(
    async (id: number) => {
      try {
        setIsLoading(true);
        clearError();

        const restoredCustomer = await customerService.restoreCustomer(id);

        // Remove from current list (if viewing deleted customers)
        setCustomers((prev) => prev.filter((customer) => customer.id !== id));
        setTotalCustomers((prev) => prev - 1);

        return restoredCustomer;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to restore customer";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, customerService]
  );

  return {
    customers,
    totalCustomers,
    currentCustomer,
    isLoading,
    error,
    createCustomer,
    getCustomers,
    getAllCustomers,
    getCustomersWithDebts,
    getDeletedCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    restoreCustomer,
    searchCustomers,
    searchCustomersByName,
    searchCustomersByEmail,
    searchCustomersByPhone,
    searchCustomersByAddress,
    getCustomersWithOverdueDebts,
    clearError,
  };
}
