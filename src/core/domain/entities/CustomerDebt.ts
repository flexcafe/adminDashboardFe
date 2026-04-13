export interface CustomerMinimal {
  id: number;
  name: string;
}

export interface CustomerDebtData {
  id: number;
  customerId: number;
  amount: number;
  dueDate: string;
  isSettled: boolean;
  alertSent: boolean;
  transactionId?: number;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  customer?: CustomerMinimal | null;
}

export class CustomerDebt {
  public id: number;
  public customerId: number;
  public amount: number;
  public dueDate: string;
  public isSettled: boolean;
  public alertSent: boolean;
  public transactionId?: number;
  public remarks: string;
  public createdAt: string;
  public updatedAt: string;
  public customer?: CustomerMinimal | null;

  [key: string]: unknown;

  constructor(data: CustomerDebtData | Record<string, unknown>) {
    if (!data) {
      throw new Error("CustomerDebt data is required");
    }

    const getProperty = (
      obj: Record<string, unknown>,
      key: string,
      defaultValue: unknown
    ) => (obj[key] !== undefined ? obj[key] : defaultValue);

    this.id = Number(getProperty(data as Record<string, unknown>, "id", 0));
    this.customerId = Number(
      getProperty(data as Record<string, unknown>, "customerId", 0)
    );
    this.amount = Number(
      getProperty(data as Record<string, unknown>, "amount", 0)
    );
    this.dueDate = String(
      getProperty(
        data as Record<string, unknown>,
        "dueDate",
        new Date().toISOString()
      )
    );
    this.isSettled = Boolean(
      getProperty(data as Record<string, unknown>, "isSettled", false)
    );
    this.alertSent = Boolean(
      getProperty(data as Record<string, unknown>, "alertSent", false)
    );
    const txn = getProperty(
      data as Record<string, unknown>,
      "transactionId",
      undefined
    );
    this.transactionId =
      txn === undefined || txn === null ? undefined : Number(txn);
    this.remarks = String(
      getProperty(data as Record<string, unknown>, "remarks", "")
    );
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
    const customer = getProperty(
      data as Record<string, unknown>,
      "customer",
      null
    ) as CustomerMinimal | null;
    if (customer && typeof customer === "object") {
      const cObj = customer as unknown as Record<string, unknown>;
      this.customer = {
        id: Number(cObj.id ?? 0),
        name: String(cObj.name ?? ""),
      };
    } else {
      this.customer = null;
    }
  }

  isOverdue(reference: Date = new Date()): boolean {
    return !this.isSettled && new Date(this.dueDate) < reference;
  }
}



