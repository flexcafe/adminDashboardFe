import axios from "axios";
import { User } from "../../domain/entities/User";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS, API_CONFIG } from "../api/constants";
import { tokenCookies } from "@/lib/cookies";

/**
 * API response types for auth endpoints
 */
interface LoginResponse {
  token: string;
}

interface RegisterResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  profileImageUrl?: string;
  createdDate: string;
  updatedDate: string;
}

interface ApiResponse<T> {
  message: string;
  code: number;
  data: T;
}

/**
 * Auth Repository implementation for API calls
 * Handles authentication through HTTP API
 */
export class ApiAuthRepository {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Login user with email and password
   */
  async login(
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    try {
      const response = await this.httpClient.post<ApiResponse<LoginResponse>>(
        API_ENDPOINTS.AUTH.LOGIN,
        {
          email,
          password,
        }
      );

      if (response.code === 200 && response.data) {
        const token = response.data.token;

        // Store token in secure cookie
        tokenCookies.setToken(token);

        // Get CSRF token after successful login
        try {
          await this.httpClient.refreshCsrfToken();
        } catch {
          // console.warn("Failed to get CSRF token after login:", csrfError); // Removed for security
          // Don't fail login if CSRF token fetch fails
        }

        // Get user data by making a request to get current user
        const userResponse = await this.httpClient.get<
          ApiResponse<RegisterResponse>
        >(API_ENDPOINTS.USERS.BASE);

        if (userResponse.code === 200 && userResponse.data) {
          const user = this.mapApiResponseToUser(userResponse.data);

          // Store user in secure cookie
          tokenCookies.setUser(JSON.stringify(user));

          return { user, token };
        }
      }

      throw new Error("Login failed");
    } catch (error: unknown) {
      console.error("Error during login:", error);

      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.message;
        if (msg) throw new Error(String(msg));
      }
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Invalid credentials");
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
    try {
      const response = await this.httpClient.post<
        ApiResponse<RegisterResponse>
      >(API_ENDPOINTS.AUTH.REGISTER, {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        password: userData.password,
      });

      if (response.code === 200 && response.data) {
        return this.mapApiResponseToUser(response.data);
      }

      throw new Error("Registration failed");
    } catch (error) {
      console.error("Error during registration:", error);
      throw new Error("Registration failed");
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Clear CSRF token
      this.httpClient.clearCsrfToken();

      // Clear stored data from secure cookies
      tokenCookies.clearAll();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }

  /**
   * Get current user from secure cookie
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const userJson = tokenCookies.getUser();
      if (!userJson) {
        return null;
      }

      const userData = JSON.parse(userJson);
      const user = this.mapApiResponseToUser(userData);

      return user;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  /**
   * Map API response to User entity
   */
  private mapApiResponseToUser(apiUser: RegisterResponse): User {
    return new User({
      id: apiUser.id,
      name: apiUser.name,
      email: apiUser.email,
      phone: apiUser.phone,
      role: apiUser.role as "ADMIN" | "STAFF",
      profileImageUrl: this.convertToFullUrl(apiUser.profileImageUrl),
      createdDate: new Date(apiUser.createdDate),
      updatedDate: new Date(apiUser.updatedDate),
    });
  }

  /**
   * Convert relative URL to full URL
   */
  private convertToFullUrl(url?: string): string | undefined {
    if (!url) {
      return undefined;
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `${API_CONFIG.BASE_URL}${url}`;
  }
}
