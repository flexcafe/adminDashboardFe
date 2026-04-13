import { HttpClient } from "../api/HttpClient";
import { IUserRepository } from "../../domain/repositories/IUserRepository";
import { ApiUserRepository } from "../repositories/ApiUserRepository";
import { ApiAuthRepository } from "../repositories/ApiAuthRepository";
import { ICustomerRepository } from "../../domain/repositories/ICustomerRepository";
import { ApiCustomerRepository } from "../repositories/ApiCustomerRepository";
import { ISupplierRepository } from "../../domain/repositories/ISupplierRepository";
import { ApiSupplierRepository } from "../repositories/ApiSupplierRepository";
import { IAuthService } from "../../domain/services/IAuthService";
import { AuthService } from "../../application/services/AuthService";
import { UserManagementService } from "../../application/services/UserManagementService";
import { CustomerManagementService } from "../../application/services/CustomerManagementService";
import { SupplierService } from "../../application/services/SupplierService";
import { ISupplierDebtRepository } from "../../domain/repositories/ISupplierDebtRepository";
import { ApiSupplierDebtRepository } from "../repositories/ApiSupplierDebtRepository";
import { ISupplierDebtService } from "../../domain/services/ISupplierDebtService";
import { SupplierDebtService } from "../../application/services/SupplierDebtService";
import { ICustomerDebtRepository } from "../../domain/repositories/ICustomerDebtRepository";
import { ApiCustomerDebtRepository } from "../repositories/ApiCustomerDebtRepository";
import { ICustomerDebtService } from "../../domain/services/ICustomerDebtService";
import { CustomerDebtService } from "../../application/services/CustomerDebtService";
import { ICustomerService } from "../../domain/services/ICustomerService";
import { IUserService } from "../../domain/services/IUserService";
import { ISupplierService } from "../../domain/services/ISupplierService";

/**
 * Dependency Injection Container
 * Manages instances of services and repositories
 */
class Container {
  private instances: Map<string, unknown> = new Map();

  constructor() {
    this.initializeContainer();
  }

  /**
   * Initialize container with default instances
   */
  private initializeContainer(): void {
    // Create HTTP client
    this.register("httpClient", new HttpClient());

    // Register repositories - Use API repositories for actual API calls
    this.register<IUserRepository>(
      "userRepository",
      new ApiUserRepository(this.resolve("httpClient"))
    );

    this.register<ApiAuthRepository>(
      "authRepository",
      new ApiAuthRepository(this.resolve("httpClient"))
    );

    this.register<ICustomerRepository>(
      "customerRepository",
      new ApiCustomerRepository(this.resolve("httpClient"))
    );

    this.register<ISupplierRepository>(
      "supplierRepository",
      new ApiSupplierRepository(this.resolve("httpClient"))
    );

    // Supplier debts repository
    this.register<ISupplierDebtRepository>(
      "supplierDebtRepository",
      new ApiSupplierDebtRepository(this.resolve("httpClient"))
    );

    // Customer debts repository
    this.register<ICustomerDebtRepository>(
      "customerDebtRepository",
      new ApiCustomerDebtRepository(this.resolve("httpClient"))
    );

    // Register services
    this.register<IAuthService>(
      "authService",
      new AuthService(this.resolve("authRepository"))
    );

    // Register user management service
    this.register<IUserService>(
      "userService",
      new UserManagementService(this.resolve("userRepository"))
    );

    // Register customer management service
    this.register<ICustomerService>(
      "customerService",
      new CustomerManagementService(this.resolve("customerRepository"))
    );

    // Register supplier management service
    this.register<ISupplierService>(
      "supplierService",
      new SupplierService(this.resolve("supplierRepository"))
    );

    // Register supplier debt service
    this.register<ISupplierDebtService>(
      "supplierDebtService",
      new SupplierDebtService(this.resolve("supplierDebtRepository"))
    );

    // Register customer debt service
    this.register<ICustomerDebtService>(
      "customerDebtService",
      new CustomerDebtService(this.resolve("customerDebtRepository"))
    );
  }

  /**
   * Register an instance with the container
   */
  register<T>(key: string, instance: T): void {
    this.instances.set(key, instance);
  }

  /**
   * Resolve an instance from the container
   */
  resolve<T>(key: string): T {
    const instance = this.instances.get(key);
    if (!instance) {
      throw new Error(`No instance registered for key: ${key}`);
    }
    return instance as T;
  }
}

// Create singleton instance
const container = new Container();

export default container;
