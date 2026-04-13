import { ISupplierRepository } from "../../domain/repositories/ISupplierRepository";
import { Supplier } from "../../domain/entities/Supplier";
import {
  CreateSupplierDTO,
  UpdateSupplierDTO,
  SupplierFilterDTO,
  SupplierDomainListResponseDTO,
  SupplierDTOMapper,
} from "../dtos/SupplierDTO";
import { ISupplierService } from "../../domain/services/ISupplierService";

export class SupplierService implements ISupplierService {
  constructor(private supplierRepository: ISupplierRepository) {}

  async createSupplier(supplierData: CreateSupplierDTO): Promise<Supplier> {
    // Validate required fields for creation
    if (!supplierData.name || !supplierData.name.trim()) {
      throw new Error("Name is required");
    }

    if (!supplierData.email || !supplierData.email.includes("@")) {
      throw new Error("Valid email is required");
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(supplierData.email)) {
      throw new Error("Invalid email format");
    }

    return await this.supplierRepository.createSupplier(supplierData);
  }

  async getSuppliers(
    params?: SupplierFilterDTO
  ): Promise<SupplierDomainListResponseDTO> {
    return await this.supplierRepository.getSuppliers(params);
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    return await this.supplierRepository.getAllSuppliers();
  }

  async getSuppliersWithDebts(
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO> {
    // Use the dedicated endpoint for suppliers with debts
    const suppliersWithDebts =
      await this.supplierRepository.getSuppliersWithDebts();

    // Apply sorting if specified
    const sortedSuppliers = [...suppliersWithDebts];
    if (sortBy && sortOrder) {
      sortedSuppliers.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortBy) {
          case "name":
            aValue = a.name?.toLowerCase() || "";
            bValue = b.name?.toLowerCase() || "";
            break;
          case "email":
            aValue = a.email?.toLowerCase() || "";
            bValue = b.email?.toLowerCase() || "";
            break;
          case "phone":
            aValue = a.phone?.toLowerCase() || "";
            bValue = b.phone?.toLowerCase() || "";
            break;
          case "address":
            aValue = a.address?.toLowerCase() || "";
            bValue = b.address?.toLowerCase() || "";
            break;
          case "contactPerson":
            aValue = a.contactPerson?.toLowerCase() || "";
            bValue = b.contactPerson?.toLowerCase() || "";
            break;
          case "createdAt":
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            break;
          case "updatedAt":
            aValue = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            bValue = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            break;
          default:
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            break;
        }

        if (sortOrder === "asc") {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    // Apply pagination
    const startIndex = skip || 0;
    const endIndex = startIndex + (take || sortedSuppliers.length);
    const paginatedSuppliers = sortedSuppliers.slice(startIndex, endIndex);

    const total = sortedSuppliers.length;
    const currentPage = Math.floor(startIndex / (take || 10)) + 1;
    const limit = take || 10;
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = endIndex < total;
    const hasPrevPage = startIndex > 0;

    return SupplierDTOMapper.toDomainListResponseDTO(
      paginatedSuppliers,
      total,
      currentPage,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage
    );
  }

  async getSupplierById(id: number): Promise<Supplier> {
    if (id <= 0) {
      throw new Error("Invalid supplier ID");
    }
    return await this.supplierRepository.getSupplierById(id);
  }

  async updateSupplier(
    id: number,
    supplierData: UpdateSupplierDTO
  ): Promise<Supplier> {
    if (id <= 0) {
      throw new Error("Invalid supplier ID");
    }

    // Get existing supplier to validate the update
    const existingSupplier = await this.supplierRepository.getSupplierById(id);

    // Use DTO mapper to convert UpdateSupplierDTO to partial Supplier
    const updateData = SupplierDTOMapper.fromUpdateDTO(supplierData);

    // Create a merged supplier object for validation
    const updatedSupplier = new Supplier({
      ...existingSupplier,
      ...updateData,
    });

    if (!updatedSupplier.isValid()) {
      throw new Error("Invalid supplier data");
    }

    return await this.supplierRepository.updateSupplier(id, updateData);
  }

  async deleteSupplier(id: number): Promise<boolean> {
    if (id <= 0) {
      throw new Error("Invalid supplier ID");
    }
    return await this.supplierRepository.deleteSupplier(id);
  }

  async getSupplierByEmail(email: string): Promise<Supplier> {
    if (!email || !email.includes("@")) {
      throw new Error("Invalid email address");
    }
    return await this.supplierRepository.getSupplierByEmail(email);
  }

  async getSupplierByPhone(phone: string): Promise<Supplier> {
    if (!phone || phone.length < 10) {
      throw new Error("Invalid phone number");
    }
    return await this.supplierRepository.getSupplierByPhone(phone);
  }

  /**
   * Search suppliers by name
   */
  async searchSuppliersByName(
    name: string,
    take: number = 10,
    skip: number = 0,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO> {
    if (!name.trim()) {
      throw new Error("Search name cannot be empty");
    }

    return await this.getSuppliers({
      take,
      skip,
      name: name.trim(),
      sortBy,
      sortOrder,
    });
  }

  /**
   * Search suppliers by email
   */
  async searchSuppliersByEmail(
    email: string,
    take: number = 10,
    skip: number = 0,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO> {
    if (!email.trim()) {
      throw new Error("Search email cannot be empty");
    }

    return await this.getSuppliers({
      take,
      skip,
      email: email.trim(),
      sortBy,
      sortOrder,
    });
  }

  /**
   * Search suppliers by phone
   */
  async searchSuppliersByPhone(
    phone: string,
    take: number = 10,
    skip: number = 0,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO> {
    if (!phone.trim()) {
      throw new Error("Search phone cannot be empty");
    }

    return await this.getSuppliers({
      take,
      skip,
      phone: phone.trim(),
      sortBy,
      sortOrder,
    });
  }

  /**
   * Search suppliers by address
   */
  async searchSuppliersByAddress(
    address: string,
    take: number = 10,
    skip: number = 0,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO> {
    if (!address.trim()) {
      throw new Error("Search address cannot be empty");
    }

    return await this.getSuppliers({
      take,
      skip,
      address: address.trim(),
      sortBy,
      sortOrder,
    });
  }

  /**
   * Search suppliers by contact person
   */
  async searchSuppliersByContactPerson(
    contactPerson: string,
    take: number = 10,
    skip: number = 0,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO> {
    if (!contactPerson.trim()) {
      throw new Error("Search contact person cannot be empty");
    }

    return await this.getSuppliers({
      take,
      skip,
      contactPerson: contactPerson.trim(),
      sortBy,
      sortOrder,
    });
  }

  /**
   * General search suppliers (tries name, email, phone in order)
   */
  async searchSuppliers(
    query: string,
    take?: number,
    skip?: number
  ): Promise<SupplierDomainListResponseDTO> {
    if (!query || query.trim().length < 2) {
      throw new Error("Search query must be at least 2 characters long");
    }

    const trimmedQuery = query.trim();

    // Try to find by name first, then by email, then by phone
    // This provides a more comprehensive search experience
    const nameResults = await this.supplierRepository.getSuppliers({
      name: trimmedQuery,
      take,
      skip,
    });

    // If we found results by name, return them
    if (nameResults.suppliers.length > 0) {
      return nameResults;
    }

    // Try email search
    const emailResults = await this.supplierRepository.getSuppliers({
      email: trimmedQuery,
      take,
      skip,
    });

    if (emailResults.suppliers.length > 0) {
      return emailResults;
    }

    // Try phone search
    const phoneResults = await this.supplierRepository.getSuppliers({
      phone: trimmedQuery,
      take,
      skip,
    });

    return phoneResults;
  }

  async getSuppliersWithOverdueDebts(
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO> {
    // First get suppliers with debts, then filter for overdue
    const result = await this.getSuppliersWithDebts(
      take,
      skip,
      sortBy,
      sortOrder
    );

    // Filter for overdue debts
    const overdueSuppliers = result.suppliers.filter(
      (supplier) => supplier.getOverdueDebts().length > 0
    );

    return SupplierDTOMapper.toDomainListResponseDTO(
      overdueSuppliers,
      overdueSuppliers.length,
      result.page,
      result.limit,
      Math.ceil(overdueSuppliers.length / result.limit),
      false, // Since we're filtering, we don't have more pages
      result.hasPrevPage
    );
  }

  async getDeletedSuppliers(
    take?: number,
    skip?: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<SupplierDomainListResponseDTO> {
    // For deleted suppliers, we need to get all and then paginate on the service level
    // since the repository method doesn't support pagination
    const allDeletedSuppliers =
      await this.supplierRepository.getDeletedSuppliers();

    // Apply sorting if specified
    const sortedSuppliers = [...allDeletedSuppliers];
    if (sortBy && sortOrder) {
      sortedSuppliers.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortBy) {
          case "name":
            aValue = a.name?.toLowerCase() || "";
            bValue = b.name?.toLowerCase() || "";
            break;
          case "email":
            aValue = a.email?.toLowerCase() || "";
            bValue = b.email?.toLowerCase() || "";
            break;
          case "phone":
            aValue = a.phone?.toLowerCase() || "";
            bValue = b.phone?.toLowerCase() || "";
            break;
          case "address":
            aValue = a.address?.toLowerCase() || "";
            bValue = b.address?.toLowerCase() || "";
            break;
          case "contactPerson":
            aValue = a.contactPerson?.toLowerCase() || "";
            bValue = b.contactPerson?.toLowerCase() || "";
            break;
          case "createdAt":
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            break;
          case "updatedAt":
            aValue = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            bValue = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            break;
          default:
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            break;
        }

        if (sortOrder === "asc") {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    const startIndex = skip || 0;
    const endIndex = startIndex + (take || sortedSuppliers.length);
    const paginatedSuppliers = sortedSuppliers.slice(startIndex, endIndex);

    const total = sortedSuppliers.length;
    const page = Math.floor(startIndex / (take || 10)) + 1;
    const limit = take || 10;
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = endIndex < total;
    const hasPrevPage = startIndex > 0;

    return SupplierDTOMapper.toDomainListResponseDTO(
      paginatedSuppliers,
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage
    );
  }

  async restoreSupplier(id: number): Promise<Supplier> {
    if (id <= 0) {
      throw new Error("Invalid supplier ID");
    }
    return await this.supplierRepository.restoreSupplier(id);
  }
}
