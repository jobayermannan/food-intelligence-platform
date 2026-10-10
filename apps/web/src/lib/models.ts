export type Role = "OWNER" | "ADMIN" | "STAFF" | "VIEWER";
export type Unit = "piece" | "kg" | "gram" | "litre" | "ml" | "package";
export interface User { id: string; email: string; displayName: string }
export interface Business { id: string; name: string; role: Role; timezone: string; currency: string; defaultTaxRate: string; expiryCriticalHours: number; expiryWarningHours: number }
export interface Location { id: string; code: string; name: string; archivedAt: string | null }
export interface Category { id: string; name: string }
export interface Supplier { id: string; name: string; reference: string | null; archivedAt: string | null }
export interface Product { id: string; name: string; sku: string; categoryId: string; baseUnit: Unit; packageDefinition: string | null; sellingPrice: string; archivedAt: string | null }
export interface Position { id: string; productId: string; locationId: string; onHand: string; reorderLevel: string }
export interface Batch { id: string; productId: string; inventoryId: string; supplierId: string | null; remaining: string; unitCost: string; expiryStatus: string; expiresAt: string | null; receivedAt: string; lotReference: string | null }
export interface BatchRow { batch: Batch; position: Position }
export interface Movement { id: string; batchId: string; inventoryId: string; type: string; delta: string; unitCost: string; occurredAt: string; reason: string | null }
export interface Allocation { id: string; batchId: string; quantity: string; unitCost: string; returnedQuantity: string }
export interface SaleItem { id: string; productId: string; productName: string; sku: string; baseUnit: Unit; quantity: string; unitPrice: string; discountAmount: string; taxAmount: string; totalAmount: string; allocations: Allocation[] }
export interface ReturnLine { id: string; quantity: string; restocked: string; disposed: string; totalAmount: string; allocationId: string }
export interface Order { id: string; orderNumber: string; locationId: string; currency: string; grossAmount: string; discountAmount: string; netAmount: string; taxAmount: string; totalAmount: string; completedAt: string; items: SaleItem[]; returns: ReturnLine[] }
export interface Waste { id: string; locationId: string; productId: string; batchId: string; quantity: string; totalCost: string; reason: string; notes: string | null; origin: string; occurredAt: string }
export interface Expiry { batch: Batch; locationId: string; productName: string; valueAtRisk: string; classification: "NONPERISHABLE" | "UNKNOWN" | "EXPIRED" | "CRITICAL" | "WARNING" | "SAFE" }
export interface Discount { id: string; productId: string; batchId: string | null; percent: string; validFrom: string; validUntil: string; explanation: string }
export interface Recommendation { label: string; recommendedPercent: number; estimatedExcessQuantity: string; urgency: string; reasons: string[]; algorithmVersion: string }
export interface Member { id: string; userId: string; email: string; role: Role; status: string; locationIds: string[] }
export interface Audit { id: string; action: string; actorUserId: string; targetUserId: string | null; previousRole: string | null; newRole: string | null; occurredAt?: string; createdAt?: string }
export interface Revenue { sales: {locationId: string; gross: string; discounts: string; net: string; tax: string}[]; returns: {locationId: string; net: string; tax: string}[] }
export interface StockMetric { productId: string; locationId: string; onHand: string; reorderLevel: string; unit: string; value: string; lowStock: boolean }
