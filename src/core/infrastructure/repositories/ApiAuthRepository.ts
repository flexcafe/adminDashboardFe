import axios from "axios";
import { User } from "../../domain/entities/User";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS, API_CONFIG } from "../api/constants";
import { tokenCookies } from "@/lib/cookies";

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
      const loginPayload: Record<string, string> = { password };
      if (identifier.includes("@")) {
        loginPayload.email = identifier;
      } else {
        loginPayload.phone = identifier;
      }

      const response = await this.httpClient.post<ApiResponse<LoginResponse>>(
        API_ENDPOINTS.AUTH.LOGIN,
        loginPayload
      );

      const token = this.extractToken(response);
      if (!token) {
        throw new Error("Login response did not include a token");
      }

      // Store token in secure cookie
      tokenCookies.setToken(token);

      // Get CSRF token after successful login
      try {
        await this.httpClient.refreshCsrfToken();
      } catch {
        // Don't fail login if CSRF token fetch fails
      }

      // Resolve user directly from login response or JWT payload.
      const responseUser = this.extractUser(response);
      const user = responseUser
        ? this.mapApiResponseToUser(responseUser)
        : this.buildUserFromToken(token, identifier);

      // Store user in secure cookie
      tokenCookies.setUser(JSON.stringify(user));
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
    const normalizedRole = String(apiUser.role || "STAFF").toUpperCase();

    return new User({
      id: String(apiUser.id),
      name: apiUser.name || "",
      email: apiUser.email || "",
      phone: apiUser.phone,
      role: normalizedRole === "ADMIN" ? "ADMIN" : "STAFF",
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

    const candidate =
      data?.user ??
      data?.admin ??
      root.user ??
      root.admin;

    if (candidate && typeof candidate === "object") {
      return candidate as RegisterResponse;
    }
    return null;
  }

  private buildUserFromToken(token: string, identifier: string): User {
    const payload = this.parseJwtPayload(token);
    const role = String(payload?.role || payload?.userRole || "ADMIN").toUpperCase();
    const email =
      typeof payload?.email === "string"
        ? payload.email
        : identifier.includes("@")
          ? identifier
          : "";
    const phone =
      typeof payload?.phone === "string"
        ? payload.phone
        : !identifier.includes("@")
          ? identifier
          : "";
    const now = new Date();
    const profileImageUrl =
      typeof payload?.profileImageUrl === "string"
        ? payload.profileImageUrl
        : undefined;

    return new User({
      id: String(payload?.id || payload?.sub || ""),
      name: String(payload?.name || payload?.username || "Admin"),
      email,
      phone,
      role: role === "ADMIN" ? "ADMIN" : "STAFF",
      profileImageUrl: this.convertToFullUrl(profileImageUrl),
      createdDate: now,
      updatedDate: now,
    });
  }

  private parseJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split(".");
      if (parts.length < 2) return null;

      const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        "="
      );
      const payloadJson = atob(padded);
      return JSON.parse(payloadJson) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
