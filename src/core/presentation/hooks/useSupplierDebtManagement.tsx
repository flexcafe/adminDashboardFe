import { useCallback, useState } from "react";
import container from "../../infrastructure/di/container";
import { ISupplierDebtService } from "../../domain/services/ISupplierDebtService";
import { SupplierDebt } from "../../domain/entities/SupplierDebt";
import {
  CreateSupplierDebtDTO,
  UpdateSupplierDebtDTO,
  SupplierDebtListResponseDTO,
} from "../../application/dtos/SupplierDebtDTO";

export interface UseSupplierDebtManagementReturn {
  // State
  debts: SupplierDebt[];
  totalDebts: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  create: (dto: CreateSupplierDebtDTO) => Promise<SupplierDebt>;
  getList: (query?: {
    supplierId?: number;
    supplierName?: string;
    isSettled?: boolean;
    dueBefore?: string;
    dueAfter?: string;
    overdue?: boolean;
    farFromDue?: boolean;
    dueToday?: boolean;
    skip?: number;
    take?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => Promise<SupplierDebtListResponseDTO>;
  getAll: () => Promise<SupplierDebt[]>;
  getOverdue: () => Promise<SupplierDebt[]>;
  getBySupplier: (supplierId: number) => Promise<SupplierDebt[]>;
  searchDebtsBySupplierName: (
    supplierName: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<SupplierDebtListResponseDTO>;
  searchDebtsByTransactionId: (
    transactionId: number,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<SupplierDebtListResponseDTO>;
  getByTransaction: (transactionId: number) => Promise<SupplierDebt>;
  getById: (id: number) => Promise<SupplierDebt>;
  update: (id: number, dto: UpdateSupplierDebtDTO) => Promise<SupplierDebt>;
  remove: (id: number) => Promise<boolean>;
  settle: (id: number) => Promise<SupplierDebt>;
  markAlertSent: (id: number) => Promise<SupplierDebt>;
  clearError: () => void;
}

export function useSupplierDebtManagement(): UseSupplierDebtManagementReturn {
  const [debts, setDebts] = useState<SupplierDebt[]>([]);
  const [totalDebts, setTotalDebts] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = container.resolve<ISupplierDebtService>(
    "supplierDebtService"
  );

  const clearError = useCallback(() => setError(null), []);

  const create = useCallback(
    async (dto: CreateSupplierDebtDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const created = await service.create(dto);
        setDebts((prev) => [created, ...prev]);
        setTotalDebts((prev) => prev + 1);
        return created;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create supplier debt";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const getList = useCallback(
    async (query?: {
      supplierId?: number;
      isSettled?: boolean;
      dueBefore?: string;
      dueAfter?: string;
      skip?: number;
      take?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.getList(query);
        setDebts(result.debts);
        setTotalDebts(result.total);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load supplier debts";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const getAll = useCallback(async () => {
    try {
      setIsLoading(true);
      clearError();
      const result = await service.getAll();
      setDebts(result);
      setTotalDebts(result.length);
      return result;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load all supplier debts";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [clearError, service]);

  const getOverdue = useCallback(async () => {
    try {
      setIsLoading(true);
      clearError();
      const result = await service.getOverdue();
      setDebts(result);
      setTotalDebts(result.length);
      return result;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load overdue supplier debts";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [clearError, service]);

  const getBySupplier = useCallback(
    async (supplierId: number) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.getBySupplier(supplierId);
        setDebts(result);
        setTotalDebts(result.length);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load supplier debts";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const searchDebtsBySupplierName = useCallback(
    async (
      supplierName: string,
      take = 10,
      skip = 0,
      sortBy?: string,
      sortOrder?: "asc" | "desc"
    ) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.searchDebtsBySupplierName(
          supplierName,
          take,
          skip,
          sortBy,
          sortOrder
        );
        setDebts(result.debts);
        setTotalDebts(result.total);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load supplier debts";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const searchDebtsByTransactionId = useCallback(
    async (
      transactionId: number,
      take = 10,
      skip = 0,
      sortBy?: string,
      sortOrder?: "asc" | "desc"
    ) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.searchDebtsByTransactionId(
          transactionId,
          take,
          skip,
          sortBy,
          sortOrder
        );
        setDebts(result.debts);
        setTotalDebts(result.total);
        return result;
      } catch (err) {
        const axiosError = err as {
          response?: { data?: { message?: string } };
        };
        const message =
          err instanceof Error && axiosError.response?.data?.message
            ? axiosError.response.data.message
            : err instanceof Error
            ? err.message
            : "Failed to load supplier debts";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const getByTransaction = useCallback(
    async (transactionId: number) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.getByTransaction(transactionId);
        return result;
      } catch (err) {
        const axiosError = err as {
          response?: { data?: { message?: string } };
        };
        const message =
          err instanceof Error && axiosError.response?.data?.message
            ? axiosError.response.data.message
            : err instanceof Error
            ? err.message
            : "Failed to load supplier debt";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const getById = useCallback(
    async (id: number) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.getById(id);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load supplier debt";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const update = useCallback(
    async (id: number, dto: UpdateSupplierDebtDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.update(id, dto);
        setDebts((prev) => prev.map((d) => (d.id === id ? result : d)));
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update supplier debt";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const remove = useCallback(
    async (id: number) => {
      try {
        setIsLoading(true);
        clearError();
        const ok = await service.delete(id);
        if (ok) {
          setDebts((prev) => prev.filter((d) => d.id !== id));
          setTotalDebts((prev) => Math.max(0, prev - 1));
        }
        return ok;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete supplier debt";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const settle = useCallback(
    async (id: number) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.settle(id);
        setDebts((prev) => prev.map((d) => (d.id === id ? result : d)));
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to settle supplier debt";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const markAlertSent = useCallback(
    async (id: number) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.markAlertSent(id);
        setDebts((prev) => prev.map((d) => (d.id === id ? result : d)));
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to mark alert sent";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  return {
    debts,
    totalDebts,
    isLoading,
    error,
    create,
    getList,
    getAll,
    getOverdue,
    getBySupplier,
    searchDebtsBySupplierName,
    searchDebtsByTransactionId,
    getByTransaction,
    getById,
    update,
    remove,
    settle,
    markAlertSent,
    clearError,
  };
}
