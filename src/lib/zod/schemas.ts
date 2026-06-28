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
  userId: z.string().optional(), // Can be anonymous
  customerName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  address: z.string().min(5),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  total: z.number().positive(),
  status: z.enum([
    "Pending Verification",
    "Payment Verified",
    "Processing",
    "Packed",
    "Shipped",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
    "Payment Rejected"
  ]).default("Processing"),
  items: z.array(OrderItemSchema).min(1, "Order must contain at least one item"),
  paymentMethod: z.string().default("Razorpay"),
  paymentStatus: z.string().default("Paid"),
  paymentScreenshot: z.string().optional().nullable(),
  utrNumber: z.string().optional().nullable(),
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
