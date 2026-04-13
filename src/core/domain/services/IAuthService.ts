import { User } from "../entities/User";

/**
 * Interface for authentication service
 */
export interface IAuthService {
  /**
   * Login a user with email and password
   */
  login(email: string, password: string): Promise<User>;

  /**
   * Register a new user (admin only)
   */
  register(userData: {
    name: string;
    email: string;
    phone: string;
    role: "ADMIN" | "STAFF";
    password: string;
  }): Promise<User>;

  /**
   * Logout the current user
   */
  logout(): Promise<void>;

  /**
   * Get the current authenticated user
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * Check if the user is authenticated
   */
  isAuthenticated(): Promise<boolean>;
}
