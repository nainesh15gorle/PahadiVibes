// src/lib/zod/schemas.ts
import { z } from "zod";

export const ProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string().min(3),
  category: z.string(),
  price: z.number().positive("Price must be positive"),
  originalPrice: z.number().optional(),
  stock: z.number().int().nonnegative("Stock cannot be negative"),
  featured: z.boolean().default(false),
  bestSeller: z.boolean().default(false),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  images: z.array(z.string().url("Must be a valid image URL")).min(1, "At least one image is required"),
  description: z.string().min(10),
  story: z.string().optional(),
  materials: z.string().optional(),
  dimensions: z.string().optional(),
});

export const CategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  slug: z.string().min(2),
  image: z.string().url(),
  description: z.string().optional(),
});

export const OrderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  subtotal: z.number().positive(),
});

export const OrderSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional().nullable(), // Can be anonymous
  customerName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  address: z.string().min(5),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  total: z.number().positive(),
  status: z.enum([
    "Processing",
    "Packed",
    "Shipped",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
    "Pending"
  ]).default("Processing"),
  items: z.array(OrderItemSchema).min(1, "Order must contain at least one item"),
  paymentMethod: z.string().default("Razorpay"),
  paymentStatus: z.string().default("Paid"),
  razorpayOrderId: z.string().optional().nullable(),
  razorpayPaymentId: z.string().optional().nullable(),
});

export const AddressSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1, "User ID is required"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  customerName: z.string().optional(), // for backwards compatibility validation
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  addressLine1: z.string().min(5, "Address Line 1 must be at least 5 characters"),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().min(6, "PIN Code must be 6 digits"),
  landmark: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
});

// Checkout and Razorpay schemas
export const CheckoutItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  productName: z.string().optional(),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  price: z.number().optional(),
});

export const CustomerDetailsSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  customerName: z.string().optional(),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  addressLine1: z.string().min(5, "Address Line 1 must be at least 5 characters"),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(6, "PIN code must be at least 6 digits"),
  landmark: z.string().optional().nullable(),
  country: z.string().optional().default("India"),
});

export const CreateRazorpayOrderSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1, "Cart must contain at least one item"),
  customerDetails: CustomerDetailsSchema,
  userId: z.string().optional().nullable(),
  total: z.number().optional(), // Server recalculates total from DB prices
});

export const VerifyPaymentSchema = z.object({
  internalOrderId: z.string().min(1, "Internal order ID is required"),
  razorpay_payment_id: z.string().min(1, "Payment ID is required"),
  razorpay_order_id: z.string().min(1, "Razorpay order ID is required"),
  razorpay_signature: z.string().min(1, "Signature is required"),
});

export const AdminLoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const TrackOrderQuerySchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  orderId: z.string().optional().nullable(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum([
    "Processing",
    "Packed",
    "Shipped",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
    "Pending"
  ]).optional(),
  paymentStatus: z.enum([
    "Pending",
    "Paid",
    "Failed",
    "Refunded"
  ]).optional(),
});

export const AiEventSchema = z.object({
  eventId: z.string().optional(),
  eventType: z.string().min(1, "eventType is required"),
  orderId: z.string().optional().nullable(),
  razorpayOrderId: z.string().optional().nullable(),
  razorpayPaymentId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerEmail: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  failureReason: z.string().optional().nullable(),
  cartItems: z.any().optional(),
  rawPayload: z.any().optional(),
  metadata: z.any().optional(),
});
