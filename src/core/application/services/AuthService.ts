import { User } from "../../domain/entities/User";
import { IAuthService } from "../../domain/services/IAuthService";
import { ApiAuthRepository } from "../../infrastructure/repositories/ApiAuthRepository";
import { calculatePasswordStrength } from "@/lib/utils/password";
import i18n from "@/lib/i18n";

/**
 * Auth Service implementation
 * Contains business logic for authentication-related operations
 */
export class AuthService implements IAuthService {
  private authRepository: ApiAuthRepository;

  constructor(authRepository: ApiAuthRepository) {
    this.authRepository = authRepository;
  }

  /**
   * Login a user with email and password
   */
  async login(email: string, password: string): Promise<User> {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    if (!email.includes("@")) {
      throw new Error("Please enter a valid email address");
    }

    try {
      const result = await this.authRepository.login(email, password);
      return result.user;
    } catch (error) {
      console.error("Login failed:", error);
      throw new Error("Invalid email or password");
    }
  }

  /**
   * Register a new user (admin only)
   */
  async register(userData: {
    name: string;
    email: string;
    phone: string;
    role: "ADMIN" | "STAFF";
    password: string;
  }): Promise<User> {
    // Validate required fields
    if (
      !userData.name ||
      !userData.email ||
      !userData.phone ||
      !userData.password
    ) {
      throw new Error("All fields are required");
    }

    if (!userData.email.includes("@")) {
      throw new Error("Please enter a valid email address");
    }

    if (userData.password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    // Check password strength (must be at least 80%)
    const passwordStrength = calculatePasswordStrength(
      userData.password,
      i18n.t
    );
    if (passwordStrength < 80) {
      throw new Error(
        "Password must be at least 80% strong. Please include uppercase, lowercase, numbers, and special characters."
      );
    }

    try {
      return await this.authRepository.register(userData);
    } catch (error) {
      console.error("Registration failed:", error);
      throw new Error("Registration failed. Please try again.");
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      await this.authRepository.logout();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      return await this.authRepository.getCurrentUser();
    } catch (error) {
      console.error("Error retrieving current user:", error);
      return null;
    }
  }

  /**
   * Check if the user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }
}
