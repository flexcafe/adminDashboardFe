import { useState, useCallback } from "react";
import { ISupplierService } from "../../domain/services/ISupplierService";
import { Supplier } from "../../domain/entities/Supplier";
import {
  CreateSupplierDTO,
  UpdateSupplierDTO,
  SupplierFilterDTO,
  SupplierDomainListResponseDTO,
} from "../../application/dtos/SupplierDTO";
import container from "../../infrastructure/di/container";

interface UseSupplierManagementReturn {
  // State
  suppliers: Supplier[];
  totalSuppliers: number;
  currentSupplier: Supplier | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createSupplier: (supplierData: CreateSupplierDTO) => Promise<Supplier>;
  getSuppliers: (
    params?: SupplierFilterDTO
  ) => Promise<SupplierDomainListResponseDTO>;
  getAllSuppliers: () => Promise<Supplier[]>;
  getSuppliersWithDebts: (
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<SupplierDomainListResponseDTO>;
  getDeletedSuppliers: (
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<SupplierDomainListResponseDTO>;
  getSupplierById: (id: number) => Promise<Supplier>;
  updateSupplier: (
    id: number,
    supplierData: UpdateSupplierDTO
  ) => Promise<Supplier>;
  deleteSupplier: (id: number) => Promise<boolean>;
  restoreSupplier: (id: number) => Promise<Supplier>;
  searchSuppliers: (
    query: string,
    take?: number,
    skip?: number
  ) => Promise<SupplierDomainListResponseDTO>;
  searchSuppliersByName: (
    name: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<SupplierDomainListResponseDTO>;
  searchSuppliersByEmail: (
    email: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<SupplierDomainListResponseDTO>;
  searchSuppliersByPhone: (
    phone: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<SupplierDomainListResponseDTO>;
  searchSuppliersByAddress: (
    address: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<SupplierDomainListResponseDTO>;
  searchSuppliersByContactPerson: (
    contactPerson: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<SupplierDomainListResponseDTO>;
  getSuppliersWithOverdueDebts: (
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<SupplierDomainListResponseDTO>;
  clearError: () => void;
}

/**
 * Custom hook for supplier management operations
 */
export function useSupplierManagement(): UseSupplierManagementReturn {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [totalSuppliers, setTotalSuppliers] = useState<number>(0);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get service from container
  const supplierService =
    container.resolve<ISupplierService>("supplierService");

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createSupplier = useCallback(
    async (supplierData: CreateSupplierDTO) => {
      try {
        setIsLoading(true);
        clearError();

        const newSupplier = await supplierService.createSupplier(supplierData);

        // Update local state
        setSuppliers((prev) => [newSupplier, ...prev]);
        setTotalSuppliers((prev) => prev + 1);

        return newSupplier;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create supplier";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, supplierService]
  );

  const getSuppliers = useCallback(
    async (params?: SupplierFilterDTO) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await supplierService.getSuppliers(params);

        setSuppliers(result.suppliers);
        setTotalSuppliers(result.total);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get suppliers";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, supplierService]
  );

  const getAllSuppliers = useCallback(async () => {
    try {
      setIsLoading(true);
      clearError();

      const allSuppliers = await supplierService.getAllSuppliers();

      setSuppliers(allSuppliers);
      setTotalSuppliers(allSuppliers.length);

      return allSuppliers;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get all suppliers";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [clearError, supplierService]);

  const getSuppliersWithDebts = useCallback(
    async (
      take?: number,
      skip?: number,
      sortBy?: string,
      sortOrder?: "asc" | "desc"
    ) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await supplierService.getSuppliersWithDebts(
          take,
          skip,
          sortBy,
          sortOrder
        );

        setSuppliers(result.suppliers);
        setTotalSuppliers(result.total);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to get suppliers with debts";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, supplierService]
  );

  const getDeletedSuppliers = useCallback(
    async (
      take?: number,
      skip?: number,
      sortBy?: string,
      sortOrder?: "asc" | "desc"
    ) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await supplierService.getDeletedSuppliers(
          take,
          skip,
          sortBy,
          sortOrder
        );

        setSuppliers(result.suppliers);
        setTotalSuppliers(result.total);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to get deleted suppliers";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, supplierService]
  );

  const getSupplierById = useCallback(
    async (id: number) => {
      try {
        setIsLoading(true);
        clearError();

        const supplier = await supplierService.getSupplierById(id);
        setCurrentSupplier(supplier);

        return supplier;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get supplier";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, supplierService]
  );

  const updateSupplier = useCallback(
    async (id: number, supplierData: UpdateSupplierDTO) => {
      try {
        setIsLoading(true);
        clearError();

        const updatedSupplier = await supplierService.updateSupplier(
          id,
          supplierData
        );

        // Update local state
        setSuppliers((prev) =>
          prev.map((supplier) =>
            supplier.id === id ? updatedSupplier : supplier
          )
        );

        if (currentSupplier && currentSupplier.id === id) {
          setCurrentSupplier(updatedSupplier);
        }

        return updatedSupplier;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update supplier";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, supplierService, currentSupplier]
  );

  const deleteSupplier = useCallback(
    async (id: number) => {
      try {
        setIsLoading(true);
        clearError();

        const success = await supplierService.deleteSupplier(id);

        if (success) {
          // Remove from local state
          setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id));
          setTotalSuppliers((prev) => prev - 1);

          if (currentSupplier && currentSupplier.id === id) {
            setCurrentSupplier(null);
          }
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete supplier";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, supplierService, currentSupplier]
  );

  const restoreSupplier = useCallback(
    async (id: number) => {
      try {
        setIsLoading(true);
        clearError();

        const restoredSupplier = await supplierService.restoreSupplier(id);

        // Add back to local state if not already there
        setSuppliers((prev) => {
          const exists = prev.some((supplier) => supplier.id === id);
          if (!exists) {
            return [restoredSupplier, ...prev];
          }
          return prev.map((supplier) =>
            supplier.id === id ? restoredSupplier : supplier
          );
        });

        return restoredSupplier;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to restore supplier";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, supplierService]
  );

  const searchSuppliers = useCallback(
    async (query: string, take?: number, skip?: number) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await supplierService.searchSuppliers(query, take, skip);

        setSuppliers(result.suppliers);
        setTotalSuppliers(result.total);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to search suppliers";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, supplierService]
  );

  const searchSuppliersByName = useCallback(
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

        const result = await supplierService.searchSuppliersByName(
          name,
          take,
          skip,
          sortBy,
          sortOrder
        );

        setSuppliers(result.suppliers);
        setTotalSuppliers(result.total);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to search suppliers by name";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, supplierService]
  );

  const searchSuppliersByEmail = useCallback(
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

        const result = await supplierService.searchSuppliersByEmail(
          email,
          take,
          skip,
          sortBy,
          sortOrder
        );

        setSuppliers(result.suppliers);
        setTotalSuppliers(result.total);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to search suppliers by email";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, supplierService]
  );

  const searchSuppliersByPhone = useCallback(
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

        const result = await supplierService.searchSuppliersByPhone(
          phone,
          take,
          skip,
          sortBy,
          sortOrder
        );

        setSuppliers(result.suppliers);
        setTotalSuppliers(result.total);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to search suppliers by phone";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, supplierService]
  );

  const searchSuppliersByAddress = useCallback(
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

        const result = await supplierService.searchSuppliersByAddress(
          address,
          take,
          skip,
          sortBy,
          sortOrder
        );

        setSuppliers(result.suppliers);
        setTotalSuppliers(result.total);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to search suppliers by address";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, supplierService]
  );

  const searchSuppliersByContactPerson = useCallback(
    async (
      contactPerson: string,
      take?: number,
      skip?: number,
      sortBy?: string,
      sortOrder?: "asc" | "desc"
    ) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await supplierService.searchSuppliersByContactPerson(
          contactPerson,
          take,
          skip,
          sortBy,
          sortOrder
        );

        setSuppliers(result.suppliers);
        setTotalSuppliers(result.total);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to search suppliers by contact person";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, supplierService]
  );

  const getSuppliersWithOverdueDebts = useCallback(
    async (
      take?: number,
      skip?: number,
      sortBy?: string,
      sortOrder?: "asc" | "desc"
    ) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await supplierService.getSuppliersWithOverdueDebts(
          take,
          skip,
          sortBy,
          sortOrder
        );

        setSuppliers(result.suppliers);
        setTotalSuppliers(result.total);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to get suppliers with overdue debts";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, supplierService]
  );

  return {
    // State
    suppliers,
    totalSuppliers,
    currentSupplier,
    isLoading,
    error,

    // Actions
    createSupplier,
    getSuppliers,
    getAllSuppliers,
    getSuppliersWithDebts,
    getDeletedSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    restoreSupplier,
    searchSuppliers,
    searchSuppliersByName,
    searchSuppliersByEmail,
    searchSuppliersByPhone,
    searchSuppliersByAddress,
    searchSuppliersByContactPerson,
    getSuppliersWithOverdueDebts,
    clearError,
  };
}
