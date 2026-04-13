import { Supplier, Debt } from "../../domain/entities/Supplier";

export interface CreateSupplierDTO {
  name: string;
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
  remarks?: string;
  isActive?: boolean;
}

export interface UpdateSupplierDTO {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  contactPerson?: string;
  remarks?: string;
  isActive?: boolean;
}

export interface SupplierResponseDTO {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
  isActive: boolean;
  remarks: string;
  debt: Debt[];
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListResponseDTO {
  suppliers: SupplierResponseDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Domain response DTO that uses Supplier entities (for internal service layer)
export interface SupplierDomainListResponseDTO {
  suppliers: Supplier[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SupplierSearchDTO {
  query: string;
  skip?: number;
  take?: number;
}

export interface SupplierFilterDTO {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  contactPerson?: string;
  hasDebt?: boolean;
  isActive?: boolean;
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Utility functions for DTO conversion
export class SupplierDTOMapper {
  static toResponseDTO(supplier: Supplier): SupplierResponseDTO {
    return {
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      contactPerson: supplier.contactPerson,
      isActive: supplier.isActive,
      remarks: supplier.remarks || "",
      debt: supplier.debt,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }

  static toResponseDTOList(suppliers: Supplier[]): SupplierResponseDTO[] {
    return suppliers.map((supplier) => this.toResponseDTO(supplier));
  }

  static toDomainListResponseDTO(
    suppliers: Supplier[],
    total: number,
    page: number,
    limit: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPrevPage: boolean
  ): SupplierDomainListResponseDTO {
    return {
      suppliers,
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
    };
  }

  static fromCreateDTO(
    dto: CreateSupplierDTO
  ): Omit<Supplier, "id" | "createdAt" | "updatedAt"> {
    return {
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      contactPerson: dto.contactPerson,
      remarks: dto.remarks || "",
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      debt: [],
    };
  }

  static fromUpdateDTO(dto: UpdateSupplierDTO): Partial<Supplier> {
    const updateData: Partial<Supplier> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.contactPerson !== undefined)
      updateData.contactPerson = dto.contactPerson;
    if (dto.remarks !== undefined) updateData.remarks = dto.remarks;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return updateData;
  }
}
