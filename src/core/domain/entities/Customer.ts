export interface Debt {
  id: number;
  amount: number;
  dueDate: string;
  isSettled: boolean;
  alertSent: boolean;
  transactionId: number;
  remarks: string;
}

export interface CustomerData {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  debt: Debt[];
  createdAt: string;
  updatedAt: string;
}

export class Customer {
  public id: number;
  public name: string;
  public phone: string;
  public email: string;
  public address: string;
  public debt: Debt[];
  public createdAt: string;
  public updatedAt: string;

  // Index signature for compatibility with Record<string, unknown>
  [key: string]: unknown;

  constructor(
    data: CustomerData | Partial<CustomerData> | Record<string, unknown>
  ) {
    // Handle case where data might be null, undefined, or malformed
    if (!data) {
      throw new Error("Customer data is required");
    }

    // Type guard function to safely access properties
    const getProperty = (
      obj: Record<string, unknown>,
      key: string,
      defaultValue: unknown
    ) => {
      return obj[key] !== undefined ? obj[key] : defaultValue;
    };

    // Safely extract properties with fallbacks
    this.id = Number(getProperty(data as Record<string, unknown>, "id", 0));
    this.name = String(
      getProperty(data as Record<string, unknown>, "name", "")
    );
    this.phone = String(
      getProperty(data as Record<string, unknown>, "phone", "")
    );
    this.email = String(
      getProperty(data as Record<string, unknown>, "email", "")
    );
    this.address = String(
      getProperty(data as Record<string, unknown>, "address", "")
    );
    this.debt = Array.isArray(
      getProperty(data as Record<string, unknown>, "debt", [])
    )
      ? (getProperty(data as Record<string, unknown>, "debt", []) as Debt[])
      : [];
    this.createdAt = String(
      getProperty(
        data as Record<string, unknown>,
        "createdAt",
        new Date().toISOString()
      )
    );
    this.updatedAt = String(
      getProperty(
        data as Record<string, unknown>,
        "updatedAt",
        new Date().toISOString()
      )
    );

    // Validate required fields
    if (!this.id || !this.name || !this.email) {
      // Customer created with missing required fields - this is expected for new customers
    }
  }

  isValid(): boolean {
    // Basic email regex pattern for domain entity validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;

    return (
      !!this.id &&
      !!this.name &&
      !!this.phone &&
      phoneRegex.test(this.phone) &&
      !!this.email &&
      emailRegex.test(this.email) &&
      !!this.address
    );
  }

  hasOutstandingDebt(): boolean {
    return this.debt.some((debt) => !debt.isSettled);
  }

  getTotalDebt(): number {
    return this.debt
      .filter((debt) => !debt.isSettled)
      .reduce((total, debt) => total + debt.amount, 0);
  }

  getOverdueDebts(): Debt[] {
    const now = new Date();
    return this.debt.filter(
      (debt) => !debt.isSettled && new Date(debt.dueDate) < now
    );
  }
}
