export interface SupplierMinimal {
  id: number;
  name: string;
}

export interface SupplierDebtData {
  id: number;
  supplierId: number;
  amount: number;
  dueDate: string;
  isSettled: boolean;
  alertSent: boolean;
  transactionId?: number;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  supplier?: SupplierMinimal | null;
}

export class SupplierDebt {
  public id: number;
  public supplierId: number;
  public amount: number;
  public dueDate: string;
  public isSettled: boolean;
  public alertSent: boolean;
  public transactionId?: number;
  public remarks: string;
  public createdAt: string;
  public updatedAt: string;
  public supplier?: SupplierMinimal | null;

  [key: string]: unknown;

  constructor(data: SupplierDebtData | Record<string, unknown>) {
    if (!data) {
      throw new Error("SupplierDebt data is required");
    }

    const getProperty = (
      obj: Record<string, unknown>,
      key: string,
      defaultValue: unknown
    ) => (obj[key] !== undefined ? obj[key] : defaultValue);

    this.id = Number(getProperty(data as Record<string, unknown>, "id", 0));
    this.supplierId = Number(
      getProperty(data as Record<string, unknown>, "supplierId", 0)
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
    const supplier = getProperty(
      data as Record<string, unknown>,
      "supplier",
      null
    ) as SupplierMinimal | null;
    if (supplier && typeof supplier === "object") {
      const sObj = supplier as unknown as Record<string, unknown>;
      this.supplier = {
        id: Number(sObj.id ?? 0),
        name: String(sObj.name ?? ""),
      };
    } else {
      this.supplier = null;
    }
  }

  isOverdue(reference: Date = new Date()): boolean {
    return !this.isSettled && new Date(this.dueDate) < reference;
  }
}


