import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";
import { SupplierDebt } from "../../domain/entities/SupplierDebt";
import {
  ISupplierDebtRepository,
  SupplierDebtFilterDTO,
} from "../../domain/repositories/ISupplierDebtRepository";
import {
  CreateSupplierDebtDTO,
  UpdateSupplierDebtDTO,
  SupplierDebtDTOMapper,
} from "../../application/dtos/SupplierDebtDTO";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export class ApiSupplierDebtRepository implements ISupplierDebtRepository {
  constructor(private httpClient: HttpClient) {}

  async create(debt: CreateSupplierDebtDTO): Promise<SupplierDebt> {
    const response = await this.httpClient.post(
      API_ENDPOINTS.SUPPLIER_DEBTS.BASE,
      debt
    );
    const data = (response as AnyRecord).data || response;
    return new SupplierDebt(data);
  }

  async getList(
    filter?: SupplierDebtFilterDTO
  ): Promise<ReturnType<typeof SupplierDebtDTOMapper.toDomainListResponseDTO>> {
    const params = new URLSearchParams();
    if (filter?.supplierId !== undefined)
      params.append("supplierId", String(filter.supplierId));
    if (filter?.supplierName !== undefined)
      params.append("supplierName", filter.supplierName);
    if (filter?.isSettled !== undefined)
      params.append("isSettled", String(filter.isSettled));
    if (filter?.dueBefore) params.append("dueBefore", filter.dueBefore);
    if (filter?.dueAfter) params.append("dueAfter", filter.dueAfter);
    if (filter?.overdue !== undefined)
      params.append("overdue", String(filter.overdue));
    if (filter?.farFromDue !== undefined)
      params.append("farFromDue", String(filter.farFromDue));
    if (filter?.dueToday !== undefined)
      params.append("dueToday", String(filter.dueToday));
    if (filter?.take !== undefined) params.append("take", String(filter.take));
    if (filter?.skip !== undefined) params.append("skip", String(filter.skip));
    if (filter?.sortBy) params.append("sortBy", filter.sortBy);
    if (filter?.sortOrder) params.append("sortOrder", filter.sortOrder);

    const url = `${API_ENDPOINTS.SUPPLIER_DEBTS.BASE}${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    const response = await this.httpClient.get(url);
    const res = (response as AnyRecord).data || response;

    if (res?.data?.debts && Array.isArray(res.data.debts)) {
      const debts = res.data.debts.map((d: AnyRecord) => new SupplierDebt(d));
      const total = Number(res.data.total ?? debts.length);
      const take = Number(filter?.take ?? debts.length);
      const skip = Number(filter?.skip ?? 0);
      const page = Math.floor(skip / (take || 1)) + 1;
      const totalPages = Math.ceil(total / (take || 1));
      const hasNextPage = skip + take < total;
      const hasPrevPage = skip > 0;
      return SupplierDebtDTOMapper.toDomainListResponseDTO(
        debts,
        total,
        page,
        take,
        totalPages,
        hasNextPage,
        hasPrevPage
      );
    }

    // Fallback: array direct
    if (Array.isArray(res)) {
      const debts = res.map((d: AnyRecord) => new SupplierDebt(d));
      const total = debts.length;
      const take = Number(filter?.take ?? debts.length);
      const skip = Number(filter?.skip ?? 0);
      const page = Math.floor(skip / (take || 1)) + 1;
      const totalPages = Math.ceil(total / (take || 1));
      const hasNextPage = skip + take < total;
      const hasPrevPage = skip > 0;
      return SupplierDebtDTOMapper.toDomainListResponseDTO(
        debts,
        total,
        page,
        take,
        totalPages,
        hasNextPage,
        hasPrevPage
      );
    }

    // Another fallback: res.data is array
    if (Array.isArray(res?.data)) {
      const debts = res.data.map((d: AnyRecord) => new SupplierDebt(d));
      const total = Number(res.total ?? debts.length);
      const take = Number(filter?.take ?? debts.length);
      const skip = Number(filter?.skip ?? 0);
      const page = Math.floor(skip / (take || 1)) + 1;
      const totalPages = Math.ceil(total / (take || 1));
      const hasNextPage = skip + take < total;
      const hasPrevPage = skip > 0;
      return SupplierDebtDTOMapper.toDomainListResponseDTO(
        debts,
        total,
        page,
        take,
        totalPages,
        hasNextPage,
        hasPrevPage
      );
    }

    // Standard shape from provided docs
    if (res?.success && res?.data?.debts) {
      const debts = res.data.debts.map((d: AnyRecord) => new SupplierDebt(d));
      const total = Number(res.data.total ?? debts.length);
      const take = Number(filter?.take ?? debts.length);
      const skip = Number(filter?.skip ?? 0);
      const page = Math.floor(skip / (take || 1)) + 1;
      const totalPages = Math.ceil(total / (take || 1));
      const hasNextPage = skip + take < total;
      const hasPrevPage = skip > 0;
      return SupplierDebtDTOMapper.toDomainListResponseDTO(
        debts,
        total,
        page,
        take,
        totalPages,
        hasNextPage,
        hasPrevPage
      );
    }

    // Unknown structure
    const debts = (res?.debts || res?.data || []).map(
      (d: AnyRecord) => new SupplierDebt(d)
    );
    const total = Number(res?.total ?? debts.length);
    const take = Number(filter?.take ?? debts.length);
    const skip = Number(filter?.skip ?? 0);
    const page = Math.floor(skip / (take || 1)) + 1;
    const totalPages = Math.ceil(total / (take || 1));
    const hasNextPage = skip + take < total;
    const hasPrevPage = skip > 0;
    return SupplierDebtDTOMapper.toDomainListResponseDTO(
      debts,
      total,
      page,
      take,
      totalPages,
      hasNextPage,
      hasPrevPage
    );
  }

  async getAll(): Promise<SupplierDebt[]> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.SUPPLIER_DEBTS.GET_ALL
    );
    const res = (response as AnyRecord).data || response;
    const items = Array.isArray(res?.data) ? res.data : res?.data ?? res;
    return (items as AnyRecord[]).map((d) => new SupplierDebt(d));
  }

  async getOverdue(): Promise<SupplierDebt[]> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.SUPPLIER_DEBTS.GET_OVERDUE
    );
    const res = (response as AnyRecord).data || response;
    const items = Array.isArray(res?.data) ? res.data : res?.data ?? res;
    return (items as AnyRecord[]).map((d) => new SupplierDebt(d));
  }

  async getBySupplier(supplierId: number): Promise<SupplierDebt[]> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.SUPPLIER_DEBTS.GET_BY_SUPPLIER(String(supplierId))
    );
    const res = (response as AnyRecord).data || response;
    const items = Array.isArray(res?.data) ? res.data : res?.data ?? res;
    return (items as AnyRecord[]).map((d) => new SupplierDebt(d));
  }

  async searchBySupplierName(
    supplierName: string,
    take = 10,
    skip = 0,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<ReturnType<typeof SupplierDebtDTOMapper.toDomainListResponseDTO>> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.SUPPLIER_DEBTS.GET_BY_SUPPLIER_NAME(supplierName)
    );
    const res = (response as AnyRecord).data || response;

    // Handle different response formats
    let items: AnyRecord[] = [];
    if (Array.isArray(res?.data)) {
      items = res.data;
    } else if (Array.isArray(res)) {
      items = res;
    } else {
      items = [];
    }

    // Convert to domain entities
    const debts = items.map((d) => new SupplierDebt(d));

    // Client-side pagination and sorting since the endpoint returns all results
    const sortedDebts =
      sortBy && sortOrder
        ? [...debts].sort((a, b) => {
            const aValue = (a as unknown as AnyRecord)[sortBy];
            const bValue = (b as unknown as AnyRecord)[sortBy];
            if (sortOrder === "asc") {
              return aValue > bValue ? 1 : -1;
            } else {
              return aValue < bValue ? 1 : -1;
            }
          })
        : debts;

    // Apply pagination
    const paginatedDebts = sortedDebts.slice(skip, skip + take);
    const total = debts.length;
    const page = Math.floor(skip / take) + 1;
    const totalPages = Math.ceil(total / take);
    const hasNextPage = skip + take < total;
    const hasPrevPage = skip > 0;

    return SupplierDebtDTOMapper.toDomainListResponseDTO(
      paginatedDebts,
      total,
      page,
      take,
      totalPages,
      hasNextPage,
      hasPrevPage
    );
  }

  async searchByTransactionId(
    transactionId: number,
    take = 10,
    skip = 0,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<ReturnType<typeof SupplierDebtDTOMapper.toDomainListResponseDTO>> {
    try {
      const response = await this.httpClient.get(
        API_ENDPOINTS.SUPPLIER_DEBTS.GET_BY_TRANSACTION(String(transactionId))
      );
      const res = (response as AnyRecord).data || response;

      // Handle different response formats - could be single debt or array
      let items: AnyRecord[] = [];
      if (Array.isArray(res?.data)) {
        items = res.data;
      } else if (Array.isArray(res?.debts)) {
        items = res.debts;
      } else if (Array.isArray(res)) {
        items = res;
      } else if (res) {
        // Single debt object - wrap in array
        items = [res];
      } else {
        items = [];
      }

      // Convert to domain entities
      const debts = items.map((d) => new SupplierDebt(d));

      // Client-side pagination and sorting since the endpoint returns all results
      const sortedDebts =
        sortBy && sortOrder
          ? [...debts].sort((a, b) => {
              const aValue = (a as unknown as AnyRecord)[sortBy];
              const bValue = (b as unknown as AnyRecord)[sortBy];
              if (sortOrder === "asc") {
                return aValue > bValue ? 1 : -1;
              } else {
                return aValue < bValue ? 1 : -1;
              }
            })
          : debts;

      // Apply pagination
      const paginatedDebts = sortedDebts.slice(skip, skip + take);
      const total = debts.length;
      const page = Math.floor(skip / take) + 1;
      const totalPages = Math.ceil(total / take);
      const hasNextPage = skip + take < total;
      const hasPrevPage = skip > 0;

      return SupplierDebtDTOMapper.toDomainListResponseDTO(
        paginatedDebts,
        total,
        page,
        take,
        totalPages,
        hasNextPage,
        hasPrevPage
      );
    } catch (error) {
      // Handle 404 or other errors gracefully - return empty list like name search does
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
        // Transaction not found - return empty list
        return SupplierDebtDTOMapper.toDomainListResponseDTO(
          [],
          0,
          1,
          take,
          0,
          false,
          false
        );
      }
      // Re-throw other errors
      throw error;
    }
  }

  async getByTransaction(transactionId: number): Promise<SupplierDebt> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.SUPPLIER_DEBTS.GET_BY_TRANSACTION(String(transactionId))
    );
    const res = (response as AnyRecord).data || response;
    return new SupplierDebt(res);
  }

  async getById(id: number): Promise<SupplierDebt> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.SUPPLIER_DEBTS.GET_BY_ID(String(id))
    );
    const res = (response as AnyRecord).data || response;
    return new SupplierDebt(res);
  }

  async update(
    id: number,
    update: UpdateSupplierDebtDTO
  ): Promise<SupplierDebt> {
    const response = await this.httpClient.put(
      API_ENDPOINTS.SUPPLIER_DEBTS.UPDATE(String(id)),
      update
    );
    const res = (response as AnyRecord).data || response;
    return new SupplierDebt(res);
  }

  async delete(id: number): Promise<boolean> {
    const response = await this.httpClient.delete(
      API_ENDPOINTS.SUPPLIER_DEBTS.DELETE(String(id))
    );
    const res = (response as AnyRecord).data || response;
    return Boolean(res?.data ?? res ?? true);
  }

  async settle(id: number): Promise<SupplierDebt> {
    const response = await this.httpClient.put(
      API_ENDPOINTS.SUPPLIER_DEBTS.SETTLE(String(id))
    );
    const res = (response as AnyRecord).data || response;
    return new SupplierDebt(res);
  }

  async markAlertSent(id: number): Promise<SupplierDebt> {
    const response = await this.httpClient.put(
      API_ENDPOINTS.SUPPLIER_DEBTS.MARK_ALERT_SENT(String(id))
    );
    const res = (response as AnyRecord).data || response;
    return new SupplierDebt(res);
  }
}
