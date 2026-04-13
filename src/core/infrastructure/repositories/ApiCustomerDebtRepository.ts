import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";
import { CustomerDebt } from "../../domain/entities/CustomerDebt";
import {
  ICustomerDebtRepository,
  CustomerDebtFilterDTO,
} from "../../domain/repositories/ICustomerDebtRepository";
import {
  CreateCustomerDebtDTO,
  UpdateCustomerDebtDTO,
  CustomerDebtDTOMapper,
} from "../../application/dtos/CustomerDebtDTO";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export class ApiCustomerDebtRepository implements ICustomerDebtRepository {
  constructor(private httpClient: HttpClient) {}

  async create(debt: CreateCustomerDebtDTO): Promise<CustomerDebt> {
    const response = await this.httpClient.post(API_ENDPOINTS.DEBTS.BASE, debt);
    const data =
      (response as AnyRecord).data?.debt ||
      (response as AnyRecord).data ||
      response;
    return new CustomerDebt(data);
  }

  async getList(
    filter?: CustomerDebtFilterDTO
  ): Promise<ReturnType<typeof CustomerDebtDTOMapper.toDomainListResponseDTO>> {
    const params = new URLSearchParams();
    if (filter?.customerId !== undefined)
      params.append("customerId", String(filter.customerId));
    if (filter?.customerName !== undefined)
      params.append("customerName", filter.customerName);
    if (filter?.isSettled !== undefined)
      params.append("isSettled", String(filter.isSettled));
    if (filter?.alertSent !== undefined)
      params.append("alertSent", String(filter.alertSent));
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

    const url = `${API_ENDPOINTS.DEBTS.BASE}${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    const response = await this.httpClient.get(url);
    const res = (response as AnyRecord).data || response;

    if (res?.data?.debts && Array.isArray(res.data.debts)) {
      const debts = res.data.debts.map((d: AnyRecord) => new CustomerDebt(d));
      const total = Number(res.data.total ?? debts.length);
      const take = Number(filter?.take ?? debts.length);
      const skip = Number(filter?.skip ?? 0);
      const page = Math.floor(skip / (take || 1)) + 1;
      const totalPages = Math.ceil(total / (take || 1));
      const hasNextPage = skip + take < total;
      const hasPrevPage = skip > 0;
      return CustomerDebtDTOMapper.toDomainListResponseDTO(
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
      const debts = res.map((d: AnyRecord) => new CustomerDebt(d));
      const total = debts.length;
      const take = Number(filter?.take ?? debts.length);
      const skip = Number(filter?.skip ?? 0);
      const page = Math.floor(skip / (take || 1)) + 1;
      const totalPages = Math.ceil(total / (take || 1));
      const hasNextPage = skip + take < total;
      const hasPrevPage = skip > 0;
      return CustomerDebtDTOMapper.toDomainListResponseDTO(
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
      const debts = res.data.map((d: AnyRecord) => new CustomerDebt(d));
      const total = Number(res.total ?? debts.length);
      const take = Number(filter?.take ?? debts.length);
      const skip = Number(filter?.skip ?? 0);
      const page = Math.floor(skip / (take || 1)) + 1;
      const totalPages = Math.ceil(total / (take || 1));
      const hasNextPage = skip + take < total;
      const hasPrevPage = skip > 0;
      return CustomerDebtDTOMapper.toDomainListResponseDTO(
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
      const debts = res.data.debts.map((d: AnyRecord) => new CustomerDebt(d));
      const total = Number(res.data.total ?? debts.length);
      const take = Number(filter?.take ?? debts.length);
      const skip = Number(filter?.skip ?? 0);
      const page = Math.floor(skip / (take || 1)) + 1;
      const totalPages = Math.ceil(total / (take || 1));
      const hasNextPage = skip + take < total;
      const hasPrevPage = skip > 0;
      return CustomerDebtDTOMapper.toDomainListResponseDTO(
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
      (d: AnyRecord) => new CustomerDebt(d)
    );
    const total = Number(res?.total ?? debts.length);
    const take = Number(filter?.take ?? debts.length);
    const skip = Number(filter?.skip ?? 0);
    const page = Math.floor(skip / (take || 1)) + 1;
    const totalPages = Math.ceil(total / (take || 1));
    const hasNextPage = skip + take < total;
    const hasPrevPage = skip > 0;
    return CustomerDebtDTOMapper.toDomainListResponseDTO(
      debts,
      total,
      page,
      take,
      totalPages,
      hasNextPage,
      hasPrevPage
    );
  }

  async getAll(): Promise<CustomerDebt[]> {
    const response = await this.httpClient.get(API_ENDPOINTS.DEBTS.GET_ALL);
    const res = (response as AnyRecord).data || response;
    const items = Array.isArray(res?.debts)
      ? res.debts
      : Array.isArray(res?.data)
      ? res.data
      : res?.data?.debts ?? res;
    return (items as AnyRecord[]).map((d) => new CustomerDebt(d));
  }

  async getOverdue(): Promise<CustomerDebt[]> {
    const response = await this.httpClient.get(API_ENDPOINTS.DEBTS.GET_OVERDUE);
    const res = (response as AnyRecord).data || response;
    const items = Array.isArray(res?.debts)
      ? res.debts
      : Array.isArray(res?.data)
      ? res.data
      : res?.data?.debts ?? res;
    return (items as AnyRecord[]).map((d) => new CustomerDebt(d));
  }

  async getByCustomer(customerId: number): Promise<CustomerDebt[]> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.DEBTS.GET_BY_CUSTOMER(String(customerId))
    );
    const res = (response as AnyRecord).data || response;
    const items = Array.isArray(res?.debts)
      ? res.debts
      : Array.isArray(res?.data)
      ? res.data
      : res?.data?.debts ?? res;
    return (items as AnyRecord[]).map((d) => new CustomerDebt(d));
  }

  async searchByCustomerName(
    customerName: string,
    take = 10,
    skip = 0,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<ReturnType<typeof CustomerDebtDTOMapper.toDomainListResponseDTO>> {
    // Use the getList endpoint with customerName filter
    const params = new URLSearchParams();
    params.append("customerName", customerName);
    params.append("take", String(take));
    params.append("skip", String(skip));
    if (sortBy) params.append("sortBy", sortBy);
    if (sortOrder) params.append("sortOrder", sortOrder);

    const url = `${API_ENDPOINTS.DEBTS.GET_BY_CUSTOMER_NAME(customerName)}`;
    const response = await this.httpClient.get(url);
    const res = (response as AnyRecord).data || response;

    // Handle different response formats
    let items: AnyRecord[] = [];
    if (res?.data?.debts && Array.isArray(res.data.debts)) {
      items = res.data.debts;
    } else if (Array.isArray(res?.data)) {
      items = res.data;
    } else if (Array.isArray(res)) {
      items = res;
    } else {
      items = [];
    }

    // Convert to domain entities
    const debts = items.map((d) => new CustomerDebt(d));

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

    return CustomerDebtDTOMapper.toDomainListResponseDTO(
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
  ): Promise<ReturnType<typeof CustomerDebtDTOMapper.toDomainListResponseDTO>> {
    try {
      const response = await this.httpClient.get(
        API_ENDPOINTS.DEBTS.GET_BY_TRANSACTION(String(transactionId))
      );
      const res = (response as AnyRecord).data || response;

      // Handle different response formats - could be single debt or array
      let items: AnyRecord[] = [];
      if (Array.isArray(res?.data?.debts)) {
        items = res.data.debts;
      } else if (Array.isArray(res?.data)) {
        items = res.data;
      } else if (Array.isArray(res?.debts)) {
        items = res.debts;
      } else if (Array.isArray(res)) {
        items = res;
      } else if (res?.debt || res?.data?.debt || res) {
        // Single debt object - wrap in array
        const debt = res?.debt || res?.data?.debt || res;
        items = [debt];
      } else {
        items = [];
      }

      // Convert to domain entities
      const debts = items.map((d) => new CustomerDebt(d));

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

      return CustomerDebtDTOMapper.toDomainListResponseDTO(
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
        return CustomerDebtDTOMapper.toDomainListResponseDTO(
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

  async getByTransaction(transactionId: number): Promise<CustomerDebt> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.DEBTS.GET_BY_TRANSACTION(String(transactionId))
    );
    const res = (response as AnyRecord).data || response;
    const debt = res?.debt || res?.data?.debt || res;
    return new CustomerDebt(debt);
  }

  async getById(id: number): Promise<CustomerDebt> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.DEBTS.GET_BY_ID(String(id))
    );
    const res = (response as AnyRecord).data || response;
    const debt = res?.debt || res?.data?.debt || res;
    return new CustomerDebt(debt);
  }

  async update(
    id: number,
    update: UpdateCustomerDebtDTO
  ): Promise<CustomerDebt> {
    const response = await this.httpClient.put(
      API_ENDPOINTS.DEBTS.UPDATE(String(id)),
      update
    );
    const res = (response as AnyRecord).data || response;
    const debt = res?.debt || res?.data?.debt || res;
    return new CustomerDebt(debt);
  }

  async delete(id: number): Promise<boolean> {
    const response = await this.httpClient.delete(
      API_ENDPOINTS.DEBTS.DELETE(String(id))
    );
    const res = (response as AnyRecord).data || response;
    return Boolean(res?.data ?? res ?? true);
  }

  async settle(id: number): Promise<CustomerDebt> {
    const response = await this.httpClient.put(
      API_ENDPOINTS.DEBTS.SETTLE(String(id))
    );
    const res = (response as AnyRecord).data || response;
    const debt = res?.debt || res?.data?.debt || res;
    return new CustomerDebt(debt);
  }

  async markAlertSent(id: number): Promise<CustomerDebt> {
    const response = await this.httpClient.put(
      API_ENDPOINTS.DEBTS.MARK_ALERT_SENT(String(id))
    );
    const res = (response as AnyRecord).data || response;
    const debt = res?.debt || res?.data?.debt || res;
    return new CustomerDebt(debt);
  }

  async getPurchaseDebts(
    filter?: CustomerDebtFilterDTO
  ): Promise<ReturnType<typeof CustomerDebtDTOMapper.toDomainListResponseDTO>> {
    const params = new URLSearchParams();
    if (filter?.customerId !== undefined)
      params.append("customerId", String(filter.customerId));
    if (filter?.take !== undefined) params.append("take", String(filter.take));
    if (filter?.skip !== undefined) params.append("skip", String(filter.skip));
    if (filter?.sortBy) params.append("sortBy", filter.sortBy);
    if (filter?.sortOrder) params.append("sortOrder", filter.sortOrder);

    const url = `${API_ENDPOINTS.DEBTS.GET_PURCHASE_DEBTS}${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    const response = await this.httpClient.get(url);
    const res = (response as AnyRecord).data || response;

    if (res?.data?.debts && Array.isArray(res.data.debts)) {
      const debts = res.data.debts.map((d: AnyRecord) => new CustomerDebt(d));
      const total = Number(res.data.total ?? debts.length);
      const take = Number(filter?.take ?? debts.length);
      const skip = Number(filter?.skip ?? 0);
      const page = Math.floor(skip / (take || 1)) + 1;
      const totalPages = Math.ceil(total / (take || 1));
      const hasNextPage = skip + take < total;
      const hasPrevPage = skip > 0;
      return CustomerDebtDTOMapper.toDomainListResponseDTO(
        debts,
        total,
        page,
        take,
        totalPages,
        hasNextPage,
        hasPrevPage
      );
    }

    return this.handleGenericResponse(res, filter);
  }

  async getCreditBalances(
    filter?: CustomerDebtFilterDTO
  ): Promise<ReturnType<typeof CustomerDebtDTOMapper.toDomainListResponseDTO>> {
    const params = new URLSearchParams();
    if (filter?.customerId !== undefined)
      params.append("customerId", String(filter.customerId));
    if (filter?.take !== undefined) params.append("take", String(filter.take));
    if (filter?.skip !== undefined) params.append("skip", String(filter.skip));
    if (filter?.sortBy) params.append("sortBy", filter.sortBy);
    if (filter?.sortOrder) params.append("sortOrder", filter.sortOrder);

    const url = `${API_ENDPOINTS.DEBTS.GET_CREDIT_BALANCES}${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    const response = await this.httpClient.get(url);
    const res = (response as AnyRecord).data || response;

    return this.handleGenericResponse(res, filter);
  }

  async getExchangeDebts(
    filter?: CustomerDebtFilterDTO
  ): Promise<ReturnType<typeof CustomerDebtDTOMapper.toDomainListResponseDTO>> {
    const params = new URLSearchParams();
    if (filter?.customerId !== undefined)
      params.append("customerId", String(filter.customerId));
    if (filter?.take !== undefined) params.append("take", String(filter.take));
    if (filter?.skip !== undefined) params.append("skip", String(filter.skip));
    if (filter?.sortBy) params.append("sortBy", filter.sortBy);
    if (filter?.sortOrder) params.append("sortOrder", filter.sortOrder);

    const url = `${API_ENDPOINTS.DEBTS.GET_EXCHANGE_DEBTS}${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    const response = await this.httpClient.get(url);
    const res = (response as AnyRecord).data || response;

    return this.handleGenericResponse(res, filter);
  }

  async getRefundAdjustments(
    filter?: CustomerDebtFilterDTO
  ): Promise<ReturnType<typeof CustomerDebtDTOMapper.toDomainListResponseDTO>> {
    const params = new URLSearchParams();
    if (filter?.customerId !== undefined)
      params.append("customerId", String(filter.customerId));
    if (filter?.take !== undefined) params.append("take", String(filter.take));
    if (filter?.skip !== undefined) params.append("skip", String(filter.skip));
    if (filter?.sortBy) params.append("sortBy", filter.sortBy);
    if (filter?.sortOrder) params.append("sortOrder", filter.sortOrder);

    const url = `${API_ENDPOINTS.DEBTS.GET_REFUND_ADJUSTMENTS}${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    const response = await this.httpClient.get(url);
    const res = (response as AnyRecord).data || response;

    return this.handleGenericResponse(res, filter);
  }

  async getSummaryByCustomer(customerId: number): Promise<unknown> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.DEBTS.GET_SUMMARY_BY_CUSTOMER(String(customerId))
    );
    return (response as AnyRecord).data || response;
  }

  // Helper method to handle generic responses
  private handleGenericResponse(
    res: AnyRecord,
    filter?: CustomerDebtFilterDTO
  ): ReturnType<typeof CustomerDebtDTOMapper.toDomainListResponseDTO> {
    if (res?.data?.debts && Array.isArray(res.data.debts)) {
      const debts = res.data.debts.map((d: AnyRecord) => new CustomerDebt(d));
      const total = Number(res.data.total ?? debts.length);
      const take = Number(filter?.take ?? debts.length);
      const skip = Number(filter?.skip ?? 0);
      const page = Math.floor(skip / (take || 1)) + 1;
      const totalPages = Math.ceil(total / (take || 1));
      const hasNextPage = skip + take < total;
      const hasPrevPage = skip > 0;
      return CustomerDebtDTOMapper.toDomainListResponseDTO(
        debts,
        total,
        page,
        take,
        totalPages,
        hasNextPage,
        hasPrevPage
      );
    }

    // Fallback
    const debts = (res?.debts || res?.data || []).map(
      (d: AnyRecord) => new CustomerDebt(d)
    );
    const total = Number(res?.total ?? debts.length);
    const take = Number(filter?.take ?? debts.length);
    const skip = Number(filter?.skip ?? 0);
    const page = Math.floor(skip / (take || 1)) + 1;
    const totalPages = Math.ceil(total / (take || 1));
    const hasNextPage = skip + take < total;
    const hasPrevPage = skip > 0;
    return CustomerDebtDTOMapper.toDomainListResponseDTO(
      debts,
      total,
      page,
      take,
      totalPages,
      hasNextPage,
      hasPrevPage
    );
  }
}
