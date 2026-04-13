import { ISupplierRepository } from "../../domain/repositories/ISupplierRepository";
import { Supplier } from "../../domain/entities/Supplier";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";
import {
  CreateSupplierDTO,
  SupplierFilterDTO,
  SupplierDomainListResponseDTO,
  SupplierDTOMapper,
} from "../../application/dtos/SupplierDTO";

// Type for API response data
interface ApiResponseData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supplier?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suppliers?: any;
  id?: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content?: any[];
  totalElements?: number;
  number?: number;
  size?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
  success?: boolean;
  message?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export class ApiSupplierRepository implements ISupplierRepository {
  constructor(private httpClient: HttpClient) {}

  async createSupplier(supplierData: CreateSupplierDTO): Promise<Supplier> {
    const response = await this.httpClient.post(
      API_ENDPOINTS.SUPPLIERS.CREATE,
      supplierData
    );

    const responseData = (response as { data: ApiResponseData }).data;

    // Handle the actual API response structure
    if (responseData.data && responseData.data.id) {
      return new Supplier(responseData.data);
    }

    // Fallback to other possible structures
    if (responseData.supplier) {
      return new Supplier(responseData.supplier);
    }

    if (responseData.id) {
      return new Supplier(responseData);
    }

    throw new Error(
      `Unexpected API response structure for createSupplier: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async getSuppliers(
    params?: SupplierFilterDTO
  ): Promise<SupplierDomainListResponseDTO> {
    const queryParams = new URLSearchParams();

    if (params?.skip !== undefined)
      queryParams.append("skip", params.skip.toString());
    if (params?.take !== undefined)
      queryParams.append("take", params.take.toString());
    if (params?.name) queryParams.append("name", params.name);
    if (params?.phone) queryParams.append("phone", params.phone);
    if (params?.email) queryParams.append("email", params.email);
    if (params?.address) queryParams.append("address", params.address);
    if (params?.contactPerson)
      queryParams.append("contactPerson", params.contactPerson);
    if (params?.hasDebt !== undefined)
      queryParams.append("hasDebt", params.hasDebt.toString());
    if (params?.isActive !== undefined)
      queryParams.append("isActive", params.isActive.toString());
    if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const url = `${API_ENDPOINTS.SUPPLIERS.GET_ALL}${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await this.httpClient.get(url);

    // Debug: Log the response structure
    console.log("API Response:", response);
    console.log("Response data:", (response as { data: ApiResponseData }).data);

    // Handle different possible response structures
    const responseData = (response as { data: ApiResponseData }).data;

    // Case 1: response.data.suppliers (with pagination)
    if (responseData.suppliers && responseData.suppliers.data) {
      return SupplierDTOMapper.toDomainListResponseDTO(
        responseData.suppliers.data.map(
          (supplier: Record<string, unknown>) => new Supplier(supplier)
        ),
        responseData.suppliers.total || 0,
        responseData.suppliers.page || 1,
        responseData.suppliers.limit || 10,
        responseData.suppliers.totalPages || 1,
        responseData.suppliers.hasNextPage || false,
        responseData.suppliers.hasPrevPage || false
      );
    }

    // Case 2: response.data.suppliers (array directly)
    if (responseData.suppliers && Array.isArray(responseData.suppliers)) {
      const total = responseData.total || responseData.suppliers.length;
      const take = params?.take || 10;
      const skip = params?.skip || 0;
      const currentPage = Math.floor(skip / take) + 1;
      const totalPages = Math.ceil(total / take);
      const hasNextPage = currentPage < totalPages;
      const hasPrevPage = currentPage > 1;

      return SupplierDTOMapper.toDomainListResponseDTO(
        responseData.suppliers.map(
          (supplier: Record<string, unknown>) => new Supplier(supplier)
        ),
        total,
        currentPage,
        take,
        totalPages,
        hasNextPage,
        hasPrevPage
      );
    }

    // Case 3: response.data is the array directly
    if (Array.isArray(responseData)) {
      const total = responseData.length;
      const take = params?.take || 10;
      const skip = params?.skip || 0;
      const currentPage = Math.floor(skip / take) + 1;
      const totalPages = Math.ceil(total / take);
      const hasNextPage = currentPage < totalPages;
      const hasPrevPage = currentPage > 1;

      return SupplierDTOMapper.toDomainListResponseDTO(
        responseData.map(
          (supplier: Record<string, unknown>) => new Supplier(supplier)
        ),
        total,
        currentPage,
        take,
        totalPages,
        hasNextPage,
        hasPrevPage
      );
    }

    // Case 4: response.data.data (common API pattern)
    if (responseData.data && Array.isArray(responseData.data)) {
      const total = responseData.total || responseData.data.length;
      const take = params?.take || responseData.limit || 10;
      const skip = params?.skip || 0;
      const currentPage = responseData.page || Math.floor(skip / take) + 1;
      const totalPages = responseData.totalPages || Math.ceil(total / take);
      const hasNextPage =
        responseData.hasNextPage !== undefined
          ? responseData.hasNextPage
          : currentPage < totalPages;
      const hasPrevPage =
        responseData.hasPrevPage !== undefined
          ? responseData.hasPrevPage
          : currentPage > 1;

      return SupplierDTOMapper.toDomainListResponseDTO(
        responseData.data.map(
          (supplier: Record<string, unknown>) => new Supplier(supplier)
        ),
        total,
        currentPage,
        take,
        totalPages,
        hasNextPage,
        hasPrevPage
      );
    }

    // Case 5: response.data.items (another common pattern)
    if (responseData.items && Array.isArray(responseData.items)) {
      const total = responseData.total || responseData.items.length;
      const take = params?.take || responseData.limit || 10;
      const skip = params?.skip || 0;
      const currentPage = responseData.page || Math.floor(skip / take) + 1;
      const totalPages = responseData.totalPages || Math.ceil(total / take);
      const hasNextPage =
        responseData.hasNextPage !== undefined
          ? responseData.hasNextPage
          : currentPage < totalPages;
      const hasPrevPage =
        responseData.hasPrevPage !== undefined
          ? responseData.hasPrevPage
          : currentPage > 1;

      return SupplierDTOMapper.toDomainListResponseDTO(
        responseData.items.map(
          (supplier: Record<string, unknown>) => new Supplier(supplier)
        ),
        total,
        currentPage,
        take,
        totalPages,
        hasNextPage,
        hasPrevPage
      );
    }

    // Case 6: response.data.results (another common pattern)
    if (responseData.results && Array.isArray(responseData.results)) {
      const total = responseData.total || responseData.results.length;
      const take = params?.take || responseData.limit || 10;
      const skip = params?.skip || 0;
      const currentPage = responseData.page || Math.floor(skip / take) + 1;
      const totalPages = responseData.totalPages || Math.ceil(total / take);
      const hasNextPage =
        responseData.hasNextPage !== undefined
          ? responseData.hasNextPage
          : currentPage < totalPages;
      const hasPrevPage =
        responseData.hasPrevPage !== undefined
          ? responseData.hasPrevPage
          : currentPage > 1;

      return SupplierDTOMapper.toDomainListResponseDTO(
        responseData.results.map(
          (supplier: Record<string, unknown>) => new Supplier(supplier)
        ),
        total,
        currentPage,
        take,
        totalPages,
        hasNextPage,
        hasPrevPage
      );
    }

    // Case 7: response.data.content (Spring Boot pattern)
    if (responseData.content && Array.isArray(responseData.content)) {
      return SupplierDTOMapper.toDomainListResponseDTO(
        responseData.content.map(
          (supplier: Record<string, unknown>) => new Supplier(supplier)
        ),
        responseData.totalElements || responseData.content.length,
        responseData.number ? responseData.number + 1 : 1,
        responseData.size || responseData.content.length,
        responseData.totalPages || 1,
        !responseData.last || false,
        !responseData.first || false
      );
    }

    // Case 8: Backend API format based on documentation
    if (
      responseData.success &&
      responseData.data &&
      responseData.data.suppliers
    ) {
      const total =
        responseData.data.total || responseData.data.suppliers.length;
      const take = params?.take || 10;
      const skip = params?.skip || 0;
      const currentPage = Math.floor(skip / take) + 1;
      const totalPages = Math.ceil(total / take);
      const hasNextPage = currentPage < totalPages;
      const hasPrevPage = currentPage > 1;

      return SupplierDTOMapper.toDomainListResponseDTO(
        responseData.data.suppliers.map(
          (supplier: Record<string, unknown>) => new Supplier(supplier)
        ),
        total,
        currentPage,
        take,
        totalPages,
        hasNextPage,
        hasPrevPage
      );
    }

    throw new Error(
      `Unexpected API response structure for getSuppliers: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.SUPPLIERS.GET_ALL_NO_PAGINATION
    );

    const responseData = (response as { data: ApiResponseData }).data;

    // Handle different response structures
    if (
      responseData.success &&
      responseData.data &&
      Array.isArray(responseData.data)
    ) {
      return responseData.data.map(
        (supplier: Record<string, unknown>) => new Supplier(supplier)
      );
    }

    if (responseData.suppliers && Array.isArray(responseData.suppliers)) {
      return responseData.suppliers.map(
        (supplier: Record<string, unknown>) => new Supplier(supplier)
      );
    }

    if (responseData.data && Array.isArray(responseData.data)) {
      return responseData.data.map(
        (supplier: Record<string, unknown>) => new Supplier(supplier)
      );
    }

    if (Array.isArray(responseData)) {
      return responseData.map(
        (supplier: Record<string, unknown>) => new Supplier(supplier)
      );
    }

    throw new Error(
      `Unexpected API response structure for getAllSuppliers: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async getSuppliersWithDebts(): Promise<Supplier[]> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.SUPPLIERS.GET_WITH_DEBTS
    );

    const responseData = (response as { data: ApiResponseData }).data;

    // Handle different response structures
    if (
      responseData.success &&
      responseData.data &&
      Array.isArray(responseData.data)
    ) {
      return responseData.data.map(
        (supplier: Record<string, unknown>) => new Supplier(supplier)
      );
    }

    if (responseData.suppliers && Array.isArray(responseData.suppliers)) {
      return responseData.suppliers.map(
        (supplier: Record<string, unknown>) => new Supplier(supplier)
      );
    }

    if (responseData.data && Array.isArray(responseData.data)) {
      return responseData.data.map(
        (supplier: Record<string, unknown>) => new Supplier(supplier)
      );
    }

    if (Array.isArray(responseData)) {
      return responseData.map(
        (supplier: Record<string, unknown>) => new Supplier(supplier)
      );
    }

    throw new Error(
      `Unexpected API response structure for getSuppliersWithDebts: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async getSupplierById(id: number): Promise<Supplier> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.SUPPLIERS.GET_BY_ID(id.toString())
    );

    const responseData = (response as { data: ApiResponseData }).data;

    if (responseData.supplier) {
      return new Supplier(responseData.supplier);
    }

    if (responseData.data) {
      return new Supplier(responseData.data);
    }

    // If the response is the supplier object directly
    if (responseData.id) {
      return new Supplier(responseData);
    }

    throw new Error(
      `Unexpected API response structure for getSupplierById: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async updateSupplier(
    id: number,
    supplierData: Partial<Supplier>
  ): Promise<Supplier> {
    const response = await this.httpClient.put(
      API_ENDPOINTS.SUPPLIERS.UPDATE(id.toString()),
      supplierData
    );

    const responseData = (response as { data: ApiResponseData }).data;

    if (responseData.supplier) {
      return new Supplier(responseData.supplier);
    }

    if (responseData.data) {
      return new Supplier(responseData.data);
    }

    if (responseData.id) {
      return new Supplier(responseData);
    }

    throw new Error(
      `Unexpected API response structure for updateSupplier: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const response = await this.httpClient.delete(
      API_ENDPOINTS.SUPPLIERS.DELETE(id.toString())
    );

    const responseData = (response as { data: ApiResponseData }).data;

    if (responseData.success !== undefined) {
      return responseData.success;
    }

    if (responseData.data !== undefined) {
      return Boolean(responseData.data);
    }

    // If we get here, assume success
    return true;
  }

  async getSupplierByEmail(email: string): Promise<Supplier> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.SUPPLIERS.GET_BY_EMAIL(email)
    );

    const responseData = (response as { data: ApiResponseData }).data;

    if (responseData.supplier) {
      return new Supplier(responseData.supplier);
    }

    if (responseData.data) {
      return new Supplier(responseData.data);
    }

    if (responseData.id) {
      return new Supplier(responseData);
    }

    throw new Error(
      `Unexpected API response structure for getSupplierByEmail: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async getSupplierByPhone(phone: string): Promise<Supplier> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.SUPPLIERS.GET_BY_PHONE(phone)
    );

    const responseData = (response as { data: ApiResponseData }).data;

    if (responseData.supplier) {
      return new Supplier(responseData.supplier);
    }

    if (responseData.data) {
      return new Supplier(responseData.data);
    }

    if (responseData.id) {
      return new Supplier(responseData);
    }

    throw new Error(
      `Unexpected API response structure for getSupplierByPhone: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async getDeletedSuppliers(): Promise<Supplier[]> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.SUPPLIERS.GET_DELETED
    );

    const responseData = (response as { data: ApiResponseData }).data;

    // Handle different response structures
    if (
      responseData.success &&
      responseData.data &&
      responseData.data.suppliers
    ) {
      return responseData.data.suppliers.map(
        (supplier: Record<string, unknown>) => new Supplier(supplier)
      );
    }

    if (responseData.suppliers && Array.isArray(responseData.suppliers)) {
      return responseData.suppliers.map(
        (supplier: Record<string, unknown>) => new Supplier(supplier)
      );
    }

    if (responseData.data && Array.isArray(responseData.data)) {
      return responseData.data.map(
        (supplier: Record<string, unknown>) => new Supplier(supplier)
      );
    }

    if (Array.isArray(responseData)) {
      return responseData.map(
        (supplier: Record<string, unknown>) => new Supplier(supplier)
      );
    }

    throw new Error(
      `Unexpected API response structure for getDeletedSuppliers: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async restoreSupplier(id: number): Promise<Supplier> {
    const response = await this.httpClient.put(
      API_ENDPOINTS.SUPPLIERS.RESTORE(id.toString())
    );

    const responseData = (response as { data: ApiResponseData }).data;

    if (responseData.supplier) {
      return new Supplier(responseData.supplier);
    }

    if (responseData.data) {
      return new Supplier(responseData.data);
    }

    if (responseData.id) {
      return new Supplier(responseData);
    }

    throw new Error(
      `Unexpected API response structure for restoreSupplier: ${JSON.stringify(
        responseData
      )}`
    );
  }
}
