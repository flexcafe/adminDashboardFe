import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();

vi.mock("axios", () => {
  const create = vi.fn(() => ({
    get: mockGet,
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }));

  return {
    default: {
      create,
      isAxiosError: vi.fn(() => false),
    },
    create,
    isAxiosError: vi.fn(() => false),
  };
});

vi.mock("@/lib/cookies", () => ({
  clearAuthAndRedirectToLogin: vi.fn(),
  getTimeUntilExpiration: vi.fn(() => 3600),
  isTokenExpired: vi.fn(() => false),
  isTokenExpiringSoon: vi.fn(() => false),
  tokenCookies: {
    getToken: vi.fn(() => "fake-token"),
  },
}));

describe("listPermissions", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("normalizes nested permissions array under data.permissions", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: { permissions: ["A", "B"] },
      },
    });

    const { listPermissions } = await import("../adminRolesApi");
    const result = await listPermissions();

    expect(result).toEqual([
      { id: "A", name: "A", key: "A", group: "A" },
      { id: "B", name: "B", key: "B", group: "B" },
    ]);
  });

  it("normalizes direct string array under data", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: ["A", "B"],
      },
    });

    const { listPermissions } = await import("../adminRolesApi");
    const result = await listPermissions();

    expect(result).toEqual([
      { id: "A", name: "A", key: "A", group: "A" },
      { id: "B", name: "B", key: "B", group: "B" },
    ]);
  });

  it("returns empty array for null, undefined, or unexpected shapes", async () => {
    const { listPermissions } = await import("../adminRolesApi");

    mockGet.mockResolvedValueOnce({ data: { success: true, data: null } });
    await expect(listPermissions()).resolves.toEqual([]);

    mockGet.mockResolvedValueOnce({ data: { success: true, data: undefined } });
    await expect(listPermissions()).resolves.toEqual([]);

    mockGet.mockResolvedValueOnce({
      data: { success: true, data: { permissions: 123 } },
    });
    await expect(listPermissions()).resolves.toEqual([]);

    mockGet.mockResolvedValueOnce({ data: { success: true, data: "invalid" } });
    await expect(listPermissions()).resolves.toEqual([]);
  });
});
