import { ICustomerRepository } from "../../domain/repositories/ICustomerRepository";
import { Customer } from "../../domain/entities/Customer";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";
import {
  CreateCustomerDTO,
  CustomerFilterDTO,
  CustomerDomainListResponseDTO,
  CustomerDTOMapper,
} from "../../application/dtos/CustomerDTO";

// Type for API response data
interface ApiResponseData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customer?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customers?: any;
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

export class ApiCustomerRepository implements ICustomerRepository {
  constructor(private httpClient: HttpClient) {}

  async createCustomer(customerData: CreateCustomerDTO): Promise<Customer> {
    const response = await this.httpClient.post(
      API_ENDPOINTS.CUSTOMERS.CREATE,
      customerData
    );

    const responseData = (response as { data: ApiResponseData }).data;

    // Handle the actual API response structure
    if (responseData.data && responseData.data.id) {
      return new Customer(responseData.data);
    }

    // Fallback to other possible structures
    if (responseData.customer) {
      return new Customer(responseData.customer);
    }

    if (responseData.id) {
      return new Customer(responseData);
    }

    throw new Error(
      `Unexpected API response structure for createCustomer: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async getCustomers(
    params?: CustomerFilterDTO
  ): Promise<CustomerDomainListResponseDTO> {
    const queryParams = new URLSearchParams();

    if (params?.skip !== undefined)
      queryParams.append("skip", params.skip.toString());
    if (params?.take !== undefined)
      queryParams.append("take", params.take.toString());
    if (params?.name) queryParams.append("name", params.name);
    if (params?.phone) queryParams.append("phone", params.phone);
    if (params?.email) queryParams.append("email", params.email);
    if (params?.address) queryParams.append("address", params.address);
    if (params?.hasDebt !== undefined)
      queryParams.append("hasDebt", params.hasDebt.toString());
    if (params?.isActive !== undefined)
      queryParams.append("isActive", params.isActive.toString());
    if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const url = `${API_ENDPOINTS.CUSTOMERS.GET_ALL}${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await this.httpClient.get(url);

    // Debug: Log the response structure
    console.log("API Response:", response);
    console.log("Response data:", (response as { data: ApiResponseData }).data);

    // Handle different possible response structures
    const responseData = (response as { data: ApiResponseData }).data;

    // Case 1: response.data.customers (with pagination)
    if (responseData.customers && responseData.customers.data) {
      return CustomerDTOMapper.toDomainListResponseDTO(
        responseData.customers.data.map(
          (customer: Record<string, unknown>) => new Customer(customer)
        ),
        responseData.customers.total || 0,
        responseData.customers.page || 1,
        responseData.customers.limit || 10,
        responseData.customers.totalPages || 1,
        responseData.customers.hasNextPage || false,
        responseData.customers.hasPrevPage || false
      );
    }

    // Case 2: response.data.customers (array directly)
    if (responseData.customers && Array.isArray(responseData.customers)) {
      return CustomerDTOMapper.toDomainListResponseDTO(
        responseData.customers.map(
          (customer: Record<string, unknown>) => new Customer(customer)
        ),
        responseData.customers.length,
        1,
        responseData.customers.length,
        1,
        false,
        false
      );
    }

    // Case 3: response.data is the array directly
    if (Array.isArray(responseData)) {
      return CustomerDTOMapper.toDomainListResponseDTO(
        responseData.map(
          (customer: Record<string, unknown>) => new Customer(customer)
        ),
        responseData.length,
        1,
        responseData.length,
        1,
        false,
        false
      );
    }

    // Case 4: response.data.data (common API pattern)
    if (responseData.data && Array.isArray(responseData.data)) {
      return CustomerDTOMapper.toDomainListResponseDTO(
        responseData.data.map(
          (customer: Record<string, unknown>) => new Customer(customer)
        ),
        responseData.total || responseData.data.length,
        responseData.page || 1,
        responseData.limit || responseData.data.length,
        responseData.totalPages || 1,
        responseData.hasNextPage || false,
        responseData.hasPrevPage || false
      );
    }

    // Case 5: response.data.items (another common pattern)
    if (responseData.items && Array.isArray(responseData.items)) {
      return CustomerDTOMapper.toDomainListResponseDTO(
        responseData.items.map(
          (customer: Record<string, unknown>) => new Customer(customer)
        ),
        responseData.total || responseData.items.length,
        responseData.page || 1,
        responseData.limit || responseData.items.length,
        responseData.totalPages || 1,
        responseData.hasNextPage || false,
        responseData.hasPrevPage || false
      );
    }

    // Case 6: response.data.results (another common pattern)
    if (responseData.results && Array.isArray(responseData.results)) {
      return CustomerDTOMapper.toDomainListResponseDTO(
        responseData.results.map(
          (customer: Record<string, unknown>) => new Customer(customer)
        ),
        responseData.total || responseData.results.length,
        responseData.page || 1,
        responseData.limit || responseData.results.length,
        responseData.totalPages || 1,
        responseData.hasNextPage || false,
        responseData.hasPrevPage || false
      );
    }

    // Case 7: response.data.content (Spring Boot pattern)
    if (responseData.content && Array.isArray(responseData.content)) {
      return CustomerDTOMapper.toDomainListResponseDTO(
        responseData.content.map(
          (customer: Record<string, unknown>) => new Customer(customer)
        ),
        responseData.totalElements || responseData.content.length,
        responseData.number || 1,
        responseData.size || responseData.content.length,
        responseData.totalPages || 1,
        responseData.hasNext || false,
        responseData.hasPrevious || false
      );
    }

    // If none of the expected structures match, try to find any array in the response
    const allKeys = Object.keys(responseData);
    for (const key of allKeys) {
      if (Array.isArray(responseData[key])) {
        console.warn(
          `Found array in unexpected key: ${key}`,
          responseData[key]
        );
        return CustomerDTOMapper.toDomainListResponseDTO(
          responseData[key].map(
            (customer: Record<string, unknown>) => new Customer(customer)
          ),
          responseData.total || responseData[key].length,
          responseData.page || 1,
          responseData.limit || responseData[key].length,
          responseData.totalPages || 1,
          responseData.hasNextPage || false,
          responseData.hasPrevPage || false
        );
      }
    }

    // If still no match, throw an error with the full response structure
    throw new Error(
      `Unexpected API response structure: ${JSON.stringify(
        responseData,
        null,
        2
      )}`
    );
  }

  async getAllCustomers(): Promise<Customer[]> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.CUSTOMERS.GET_ALL_NO_PAGINATION
    );

    const responseData = (response as { data: ApiResponseData }).data;

    // Handle different possible response structures
    if (responseData.customers && Array.isArray(responseData.customers)) {
      return responseData.customers.map(
        (customer: Record<string, unknown>) => new Customer(customer)
      );
    }

    if (Array.isArray(responseData)) {
      return responseData.map(
        (customer: Record<string, unknown>) => new Customer(customer)
      );
    }

    if (responseData.data && Array.isArray(responseData.data)) {
      return responseData.data.map(
        (customer: Record<string, unknown>) => new Customer(customer)
      );
    }

    throw new Error(
      `Unexpected API response structure for getAllCustomers: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async getCustomersWithDebts(): Promise<Customer[]> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.CUSTOMERS.GET_WITH_DEBTS
    );

    const responseData = (response as { data: ApiResponseData }).data;

    // Handle different possible response structures
    if (responseData.customers && Array.isArray(responseData.customers)) {
      return responseData.customers.map(
        (customer: Record<string, unknown>) => new Customer(customer)
      );
    }

    if (Array.isArray(responseData)) {
      return responseData.map(
        (customer: Record<string, unknown>) => new Customer(customer)
      );
    }

    if (responseData.data && Array.isArray(responseData.data)) {
      return responseData.data.map(
        (customer: Record<string, unknown>) => new Customer(customer)
      );
    }

    throw new Error(
      `Unexpected API response structure for getCustomersWithDebts: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async getCustomerById(id: number): Promise<Customer> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.CUSTOMERS.GET_BY_ID(id.toString())
    );

    const responseData = (response as { data: ApiResponseData }).data;

    if (responseData.customer) {
      return new Customer(responseData.customer);
    }

    if (responseData.data) {
      return new Customer(responseData.data);
    }

    // If the response is the customer object directly
    if (responseData.id) {
      return new Customer(responseData);
    }

    throw new Error(
      `Unexpected API response structure for getCustomerById: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async updateCustomer(
    id: number,
    customerData: Partial<Customer>
  ): Promise<Customer> {
    const response = await this.httpClient.put(
      API_ENDPOINTS.CUSTOMERS.UPDATE(id.toString()),
      customerData
    );

    const responseData = (response as { data: ApiResponseData }).data;

    if (responseData.customer) {
      return new Customer(responseData.customer);
    }

    if (responseData.data) {
      return new Customer(responseData.data);
    }

    if (responseData.id) {
      return new Customer(responseData);
    }

    throw new Error(
      `Unexpected API response structure for updateCustomer: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const response = await this.httpClient.delete(
      API_ENDPOINTS.CUSTOMERS.DELETE(id.toString())
    );

    const responseData = (response as { data: ApiResponseData }).data;

    // Handle boolean response (success/failure)
    if (typeof responseData === "boolean") {
      return responseData;
    }

    // Handle object response with success property
    if (responseData && typeof responseData.success === "boolean") {
      return responseData.success;
    }

    // Handle object response with message property (common pattern)
    if (responseData && responseData.message) {
      return true; // If we get a message, assume success
    }

    // If we get here, assume success (no error was thrown)
    return true;
  }

  async getCustomerByEmail(email: string): Promise<Customer> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.CUSTOMERS.GET_BY_EMAIL(email)
    );

    const responseData = (response as { data: ApiResponseData }).data;

    if (responseData.customer) {
      return new Customer(responseData.customer);
    }

    if (responseData.data) {
      return new Customer(responseData.data);
    }

    if (responseData.id) {
      return new Customer(responseData);
    }

    throw new Error(
      `Unexpected API response structure for getCustomerByEmail: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async getCustomerByPhone(phone: string): Promise<Customer> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.CUSTOMERS.GET_BY_PHONE(phone)
    );

    const responseData = (response as { data: ApiResponseData }).data;

    if (responseData.customer) {
      return new Customer(responseData.customer);
    }

    if (responseData.data) {
      return new Customer(responseData.data);
    }

    if (responseData.id) {
      return new Customer(responseData);
    }

    throw new Error(
      `Unexpected API response structure for getCustomerByPhone: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async getDeletedCustomers(): Promise<Customer[]> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.CUSTOMERS.GET_DELETED
    );

    const responseData = (response as { data: ApiResponseData }).data;

    // Handle different possible response structures
    if (responseData.customers && Array.isArray(responseData.customers)) {
      return responseData.customers.map(
        (customer: Record<string, unknown>) => new Customer(customer)
      );
    }

    if (Array.isArray(responseData)) {
      return responseData.map(
        (customer: Record<string, unknown>) => new Customer(customer)
      );
    }

    if (responseData.data && Array.isArray(responseData.data)) {
      return responseData.data.map(
        (customer: Record<string, unknown>) => new Customer(customer)
      );
    }

    throw new Error(
      `Unexpected API response structure for getDeletedCustomers: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async restoreCustomer(id: number): Promise<Customer> {
    const response = await this.httpClient.put(
      API_ENDPOINTS.CUSTOMERS.RESTORE(id.toString())
    );

    const responseData = (response as { data: ApiResponseData }).data;

    if (responseData.customer) {
      return new Customer(responseData.customer);
    }

    if (responseData.data) {
      return new Customer(responseData.data);
    }

    if (responseData.id) {
      return new Customer(responseData);
    }

    throw new Error(
      `Unexpected API response structure for restoreCustomer: ${JSON.stringify(
        responseData
      )}`
    );
  }
}
