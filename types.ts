
export type UserRole = 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'CUSTOMER';
export type PaymentGateway = 'MERCADO_PAGO' | 'STRIPE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  businessId?: string; // Linked business for owners
}

export interface Collaborator {
  id: string;
  businessId: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
}

export interface Business {
  id: string;
  name: string;
  type: 'BARBERSHOP' | 'SALON';
  description: string;
  address: string;
  image: string;
  rating: number;
  ownerId: string;
  monthlyFee: number;
  revenueSplit: number; // Percentage that goes to central admin
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  gatewayId?: string; // ID of the account on the gateway
  lastPaymentDate?: string;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  price: number;
  duration: number; // in minutes
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  price: number;
  stock: number;
  image: string;
  category?: string;
}

export interface Appointment {
  id: string;
  businessId: string;
  customerId: string;
  collaboratorId: string;
  serviceId: string;
  date: string; // ISO string
  time: string; // HH:mm
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

export interface Transaction {
  id: string;
  businessId: string;
  amount: number;
  adminFee: number;
  partnerNet: number;
  date: string;
  status: 'PAID' | 'PENDING' | 'REFUNDED';
  gateway: PaymentGateway;
}

// Payment Types
export type PaymentMethod = 'pix' | 'credit_card';

export interface PaymentRequest {
  valor: number;
  metodo_pagamento: PaymentMethod;
  email_cliente: string;
  referencia_externa?: string;
  token_cartao?: string;
  business_id?: string;
}

export interface PixPaymentResponse {
  success: boolean;
  qr_code_base64?: string;
  qr_code?: string;
  txid: string;
  payment_id: number;
  status: string;
  application_fee: number;
  error?: string;
  details?: any;
}

export interface CreditCardPaymentResponse {
  success: boolean;
  payment_id: number;
  status: string;
  status_detail: string;
  application_fee: number;
  transaction_amount: number;
  error?: string;
  details?: any;
}

export type PaymentResponse = PixPaymentResponse | CreditCardPaymentResponse;