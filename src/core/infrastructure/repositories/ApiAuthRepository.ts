import axios from "axios";
import { User } from "../../domain/entities/User";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS, API_CONFIG } from "../api/constants";
import { isTokenExpired, tokenCookies } from "@/lib/cookies";

/**
 * API response types for auth endpoints
 */
interface LoginResponse {
  token?: string;
  accessToken?: string;
  user?: RegisterResponse;
  admin?: RegisterResponse;
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
    identifier: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    try {
      const loginPayload = this.buildLoginPayload(identifier, password);

      const response = await this.httpClient.post<ApiResponse<LoginResponse>>(
        API_ENDPOINTS.AUTH.LOGIN,
        loginPayload
      );

      const token = this.extractToken(response);
      if (!token) {
        throw new Error("Login response did not include a token");
      }

      const responseUser = this.extractUser(response);
      if (!responseUser) {
        throw new Error("Login response did not include a user");
      }

      const user = this.mapApiResponseToUser(responseUser);

      this.persistAuthenticatedSession(token, user);

      return { user, token };
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

  private buildLoginPayload(
    identifier: string,
    password: string
  ): Record<string, string> {
    if (identifier.includes("@")) {
      return { email: identifier, password };
    }

    return { phone: identifier, password };
  }

  private persistAuthenticatedSession(token: string, user: User): void {
    sessionStorage.setItem("wms_token", token);
    sessionStorage.setItem("wms_user", JSON.stringify(user));

    // Keep existing tokenCookies integration so the current app auth restore
    // flow continues to work without wider repository changes.
    tokenCookies.setToken(token);
    tokenCookies.setUser(JSON.stringify(user));
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
      const token = tokenCookies.getToken();
      const userJson = tokenCookies.getUser();
      if (!token || !userJson) {
        tokenCookies.clearAll();
        return null;
      }

      if (isTokenExpired(token)) {
        tokenCookies.clearAll();
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
    const normalizedRole = this.normalizeRole(apiUser.role);

    return new User({
      id: String(apiUser.id),
      name: apiUser.name || "",
      email: apiUser.email || "",
      phone: apiUser.phone,
      role: normalizedRole,
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

  private extractToken(response: unknown): string | null {
    if (!response || typeof response !== "object") return null;
    const root = response as Record<string, unknown>;
    const data =
      root.data && typeof root.data === "object"
        ? (root.data as Record<string, unknown>)
        : null;
    const nestedTokens =
      data?.tokens && typeof data.tokens === "object"
        ? (data.tokens as Record<string, unknown>)
        : null;

    const candidates = [
      root.token,
      root.accessToken,
      data?.token,
      data?.accessToken,
      data?.jwt,
      nestedTokens?.accessToken,
      nestedTokens?.token,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }
    }
    return null;
  }

  private extractUser(response: unknown): RegisterResponse | null {
    if (!response || typeof response !== "object") return null;
    const root = response as Record<string, unknown>;
    const data =
      root.data && typeof root.data === "object"
        ? (root.data as Record<string, unknown>)
        : null;
    const nestedData =
      data?.data && typeof data.data === "object"
        ? (data.data as Record<string, unknown>)
        : null;

    const candidate =
      nestedData?.user ??
      nestedData?.admin ??
      data?.user ??
      data?.admin ??
      root.user ??
      root.admin;

    if (candidate && typeof candidate === "object") {
      return candidate as RegisterResponse;
    }
    return null;
  }

  private normalizeRole(rawRole: unknown): "ADMIN" | "STAFF" {
    const value = String(rawRole || "").trim().toUpperCase();
    return value === "ADMIN" ? "ADMIN" : "STAFF";
  }
}
