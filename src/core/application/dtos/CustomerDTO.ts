import { Customer, Debt } from "../../domain/entities/Customer";

export interface CreateCustomerDTO {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface UpdateCustomerDTO {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface CustomerResponseDTO {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  debt: Debt[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResponseDTO {
  customers: CustomerResponseDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Domain response DTO that uses Customer entities (for internal service layer)
export interface CustomerDomainListResponseDTO {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CustomerSearchDTO {
  query: string;
  skip?: number;
  take?: number;
}

export interface CustomerFilterDTO {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  hasDebt?: boolean;
  isActive?: boolean;
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Utility functions for DTO conversion
export class CustomerDTOMapper {
  static toResponseDTO(customer: Customer): CustomerResponseDTO {
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      debt: customer.debt,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  static toResponseDTOList(customers: Customer[]): CustomerResponseDTO[] {
    return customers.map((customer) => this.toResponseDTO(customer));
  }

  static toDomainListResponseDTO(
    customers: Customer[],
    total: number,
    page: number,
    limit: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPrevPage: boolean
  ): CustomerDomainListResponseDTO {
    return {
      customers,
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
    };
  }

  static fromCreateDTO(
    dto: CreateCustomerDTO
  ): Omit<Customer, "id" | "createdAt" | "updatedAt"> {
    return {
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      debt: [],
    };
  }

  static fromUpdateDTO(dto: UpdateCustomerDTO): Partial<Customer> {
    const updateData: Partial<Customer> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.address !== undefined) updateData.address = dto.address;

    return updateData;
  }
}
