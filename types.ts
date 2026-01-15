export enum PaymentType {
  CASH = 'Cash',
  QR = 'QR',
  CARD = 'Card',
  CHEQUE = 'Cheque'
}

export enum CollectionStatus {
  RECEIVED = 'Received',
  PENDING = 'Pending',
  REALIZED = 'Realized',
  RETURNED = 'Returned'
}

export enum CustomerStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive'
}

export type UserRole = 'ADMIN' | 'COLLECTOR' | 'ACCOUNTS';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  permissions?: string[]; // Array of View IDs like 'DASHBOARD', 'CUSTOMERS', etc.
}

export interface Route {
  route_id: string;
  route_name: string;
  description?: string;
  status: 'Active' | 'Inactive';
}

export interface Customer {
  customer_id: string;
  customer_name: string;
  address: string;
  whatsapp_number: string;
  phone_number: string;
  business_name: string;
  business_address?: string;
  br_number?: string;
  nic?: string;
  date_of_birth?: string;
  location: string; // GPS string
  credit_limit: number;
  credit_period_days: number;
  route_id: string;
  status: CustomerStatus;
  createdBy?: string;
}

export interface Collection {
  collection_id: string;
  customer_id: string;
  payment_type: PaymentType;
  amount: number;
  status: CollectionStatus;
  cheque_number?: string;
  bank?: string;
  branch?: string;
  realize_date?: string; // YYYY-MM-DD
  collection_date: string; // YYYY-MM-DD
  cheque_image_base64?: string;
  createdBy?: string; 
}

export interface LedgerEntry {
  entry_id: string;
  date: string;
  description: string;
  reference_id: string; 
  collector?: string;
  debit_account: string; 
  credit_account: string; 
  amount: number;
}

export interface AuditLog {
  log_id: string;
  timestamp: string;
  action: string; 
  performedBy: string; 
  userName?: string;
  details: string;
}

export interface GlobalSettings {
  default_credit_limit: number;
  default_credit_period: number;
  enable_cheque_camera: boolean;
  currency_code: string;
  country: string;
}

export interface BankStatementEntry {
  id: string;
  date: string;
  cheque_number: string;
  amount: number;
  status: 'CLEARED' | 'RETURNED';
}