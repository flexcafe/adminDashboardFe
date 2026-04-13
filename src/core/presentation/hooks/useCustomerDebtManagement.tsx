import { useCallback, useState } from "react";
import container from "../../infrastructure/di/container";
import { ICustomerDebtService } from "../../domain/services/ICustomerDebtService";
import { CustomerDebt } from "../../domain/entities/CustomerDebt";
import {
  CreateCustomerDebtDTO,
  UpdateCustomerDebtDTO,
  CustomerDebtListResponseDTO,
} from "../../application/dtos/CustomerDebtDTO";

export interface UseCustomerDebtManagementReturn {
  // State
  debts: CustomerDebt[];
  totalDebts: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  create: (dto: CreateCustomerDebtDTO) => Promise<CustomerDebt>;
  getList: (query?: {
    customerId?: number;
    customerName?: string;
    isSettled?: boolean;
    alertSent?: boolean;
    dueBefore?: string;
    dueAfter?: string;
    overdue?: boolean;
    farFromDue?: boolean;
    dueToday?: boolean;
    skip?: number;
    take?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => Promise<CustomerDebtListResponseDTO>;
  getAll: () => Promise<CustomerDebt[]>;
  getOverdue: () => Promise<CustomerDebt[]>;
  getByCustomer: (customerId: number) => Promise<CustomerDebt[]>;
  searchDebtsByCustomerName: (
    customerName: string,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<CustomerDebtListResponseDTO>;
  searchDebtsByTransactionId: (
    transactionId: number,
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ) => Promise<CustomerDebtListResponseDTO>;
  getByTransaction: (transactionId: number) => Promise<CustomerDebt>;
  getById: (id: number) => Promise<CustomerDebt>;
  update: (id: number, dto: UpdateCustomerDebtDTO) => Promise<CustomerDebt>;
  remove: (id: number) => Promise<boolean>;
  settle: (id: number) => Promise<CustomerDebt>;
  markAlertSent: (id: number) => Promise<CustomerDebt>;
  getPurchaseDebts: (query?: {
    customerId?: number;
    skip?: number;
    take?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => Promise<CustomerDebtListResponseDTO>;
  getCreditBalances: (query?: {
    customerId?: number;
    skip?: number;
    take?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => Promise<CustomerDebtListResponseDTO>;
  getExchangeDebts: (query?: {
    customerId?: number;
    skip?: number;
    take?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => Promise<CustomerDebtListResponseDTO>;
  getRefundAdjustments: (query?: {
    customerId?: number;
    skip?: number;
    take?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => Promise<CustomerDebtListResponseDTO>;
  getSummaryByCustomer: (customerId: number) => Promise<unknown>;
  clearError: () => void;
}

export function useCustomerDebtManagement(): UseCustomerDebtManagementReturn {
  const [debts, setDebts] = useState<CustomerDebt[]>([]);
  const [totalDebts, setTotalDebts] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = container.resolve<ICustomerDebtService>(
    "customerDebtService"
  );

  const clearError = useCallback(() => setError(null), []);

  const create = useCallback(
    async (dto: CreateCustomerDebtDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const created = await service.create(dto);
        setDebts((prev) => [created, ...prev]);
        setTotalDebts((prev) => prev + 1);
        return created;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create customer debt";
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
      customerId?: number;
      isSettled?: boolean;
      alertSent?: boolean;
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
          err instanceof Error ? err.message : "Failed to load customer debts";
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
          : "Failed to load all customer debts";
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
          : "Failed to load overdue customer debts";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [clearError, service]);

  const getByCustomer = useCallback(
    async (customerId: number) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.getByCustomer(customerId);
        setDebts(result);
        setTotalDebts(result.length);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load customer debts";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const searchDebtsByCustomerName = useCallback(
    async (
      customerName: string,
      take = 10,
      skip = 0,
      sortBy?: string,
      sortOrder?: "asc" | "desc"
    ) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.searchDebtsByCustomerName(
          customerName,
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
          err instanceof Error ? err.message : "Failed to load customer debts";
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
            : "Failed to load customer debts";
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
            : "Failed to load customer debt";
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
          err instanceof Error ? err.message : "Failed to load customer debt";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const update = useCallback(
    async (id: number, dto: UpdateCustomerDebtDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.update(id, dto);
        setDebts((prev) => prev.map((d) => (d.id === id ? result : d)));
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update customer debt";
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
          err instanceof Error ? err.message : "Failed to delete customer debt";
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
          err instanceof Error ? err.message : "Failed to settle customer debt";
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

  const getPurchaseDebts = useCallback(
    async (query?: {
      customerId?: number;
      skip?: number;
      take?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.getPurchaseDebts(query);
        setDebts(result.debts);
        setTotalDebts(result.total);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load purchase debts";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const getCreditBalances = useCallback(
    async (query?: {
      customerId?: number;
      skip?: number;
      take?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.getCreditBalances(query);
        setDebts(result.debts);
        setTotalDebts(result.total);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load credit balances";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const getExchangeDebts = useCallback(
    async (query?: {
      customerId?: number;
      skip?: number;
      take?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.getExchangeDebts(query);
        setDebts(result.debts);
        setTotalDebts(result.total);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load exchange debts";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const getRefundAdjustments = useCallback(
    async (query?: {
      customerId?: number;
      skip?: number;
      take?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.getRefundAdjustments(query);
        setDebts(result.debts);
        setTotalDebts(result.total);
        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load refund adjustments";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, service]
  );

  const getSummaryByCustomer = useCallback(
    async (customerId: number) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await service.getSummaryByCustomer(customerId);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load debt summary";
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
    getByCustomer,
    searchDebtsByCustomerName,
    searchDebtsByTransactionId,
    getByTransaction,
    getById,
    update,
    remove,
    settle,
    markAlertSent,
    getPurchaseDebts,
    getCreditBalances,
    getExchangeDebts,
    getRefundAdjustments,
    getSummaryByCustomer,
    clearError,
  };
}
