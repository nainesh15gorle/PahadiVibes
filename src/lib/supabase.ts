import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("Supabase URL or Anon Key is missing. Using placeholders for build time.");
}

// 1. Admin/Service Role client for server-side admin writes (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// 2. Client that uses the user's Supabase access token cookie (respects RLS)
export async function getSupabaseClient() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;

    if (token) {
      return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
  } catch (error) {
    console.error("Failed to get Supabase token for client:", error);
  }

  // Fallback to anonymous client
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// --- MAPPING HELPERS ---

// Products
export interface DbProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  original_price: number | null;
  stock: number;
  description: string;
  story: string | null;
  materials: string | null;
  dimensions: string | null;
  featured: boolean;
  bestseller: boolean;
  status: string;
  images: any; // jsonb array
  created_at?: string;
  updated_at?: string;
}

export function mapDbProductToProduct(dbProduct: DbProduct) {
  let parsedImages: string[] = [];
  if (Array.isArray(dbProduct.images)) {
    parsedImages = dbProduct.images;
  } else if (typeof dbProduct.images === "string") {
    try {
      parsedImages = JSON.parse(dbProduct.images);
    } catch {
      parsedImages = [];
    }
  }

  return {
    id: dbProduct.id,
    name: dbProduct.name,
    slug: dbProduct.slug,
    category: dbProduct.category,
    price: Number(dbProduct.price),
    originalPrice: dbProduct.original_price ? Number(dbProduct.original_price) : undefined,
    stock: Number(dbProduct.stock),
    description: dbProduct.description,
    story: dbProduct.story || undefined,
    materials: dbProduct.materials || undefined,
    dimensions: dbProduct.dimensions || undefined,
    featured: dbProduct.featured,
    bestSeller: dbProduct.bestseller,
    status: dbProduct.status,
    images: parsedImages,
    createdAt: dbProduct.created_at,
    updatedAt: dbProduct.updated_at,
  };
}

export function mapProductToDbProduct(product: any) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category,
    price: product.price,
    original_price: product.originalPrice !== undefined ? product.originalPrice : null,
    stock: product.stock,
    description: product.description,
    story: product.story !== undefined ? product.story : null,
    materials: product.materials !== undefined ? product.materials : null,
    dimensions: product.dimensions !== undefined ? product.dimensions : null,
    featured: !!product.featured,
    bestseller: !!product.bestSeller,
    status: product.status || "Active",
    images: product.images || [],
  };
}

// Orders
export interface DbOrder {
  id: string;
  order_id: string;
  user_id: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  total: number;
  status: string;
  items: any; // jsonb array
  created_at: string;
  payment_method?: string;
  payment_status?: string;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
}

export function mapDbOrderToOrder(dbOrder: DbOrder) {
  let parsedItems = [];
  if (Array.isArray(dbOrder.items)) {
    parsedItems = dbOrder.items;
  } else if (typeof dbOrder.items === "string") {
    try {
      parsedItems = JSON.parse(dbOrder.items);
    } catch {
      parsedItems = [];
    }
  }

  // Extract metadata if stored in items
  const metadataItem = parsedItems.find((item: any) => item && item.isMetadata);
  const itemsWithoutMetadata = parsedItems.filter((item: any) => item && !item.isMetadata);

  return {
    id: dbOrder.id,
    orderId: dbOrder.order_id,
    userId: dbOrder.user_id,
    customerName: dbOrder.customer_name,
    email: dbOrder.email,
    phone: dbOrder.phone,
    address: dbOrder.address,
    city: dbOrder.city,
    state: dbOrder.state,
    pincode: dbOrder.pincode,
    total: Number(dbOrder.total),
    status: dbOrder.status,
    items: itemsWithoutMetadata,
    createdAt: dbOrder.created_at,
    paymentMethod: dbOrder.payment_method || metadataItem?.paymentMethod || "Razorpay",
    paymentStatus: dbOrder.payment_status || metadataItem?.paymentStatus || "Paid",
    razorpayOrderId: dbOrder.razorpay_order_id || metadataItem?.razorpayOrderId || null,
    razorpayPaymentId: dbOrder.razorpay_payment_id || metadataItem?.razorpayPaymentId || null,
  };
}

export function mapOrderToDbOrder(order: any) {
  return {
    id: order.id,
    order_id: order.orderId || order.id,
    user_id: order.userId === "anonymous" ? null : (order.userId || null),
    customer_name: order.customerName,
    email: order.email,
    phone: order.phone,
    address: order.address,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    total: order.total,
    status: order.status || "Processing",
    items: order.items || [],
    created_at: order.createdAt || new Date().toISOString(),
    payment_method: order.paymentMethod || "Razorpay",
    payment_status: order.paymentStatus || "Paid",
    razorpay_order_id: order.razorpayOrderId || null,
    razorpay_payment_id: order.razorpayPaymentId || null,
  };
}

export async function insertOrderSafe(dbOrder: any) {
  // Try direct insert first
  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert(dbOrder)
    .select()
    .maybeSingle();

  if (!error) {
    return { data, error: null };
  }

  // Check if error is due to missing payment columns
  const errorMsg = error.message || "";
  const isMissingColumnError = 
    errorMsg.includes("payment_method") || 
    errorMsg.includes("payment_status") || 
    errorMsg.includes("razorpay_order_id") ||
    errorMsg.includes("razorpay_payment_id") ||
    error.code === "PGRST111" || // Column not found in PostgREST schema cache
    error.code === "42703";      // Undefined column in Postgres

  if (isMissingColumnError) {
    console.warn("Target columns not found. Falling back to storing payment info in items JSON column.");
    
    // Fallback: merge payment fields into the items JSON
    const paymentMetadata = {
      isMetadata: true,
      paymentMethod: dbOrder.payment_method || "Razorpay",
      paymentStatus: dbOrder.payment_status || "Paid",
      razorpayOrderId: dbOrder.razorpay_order_id || null,
      razorpayPaymentId: dbOrder.razorpay_payment_id || null,
    };

    const fallbackItems = [
      ...(Array.isArray(dbOrder.items) ? dbOrder.items : []),
      paymentMetadata
    ];

    // Create a new payload without the missing database columns
    const fallbackDbOrder = {
      id: dbOrder.id,
      order_id: dbOrder.order_id,
      user_id: dbOrder.user_id,
      customer_name: dbOrder.customer_name,
      email: dbOrder.email,
      phone: dbOrder.phone,
      address: dbOrder.address,
      city: dbOrder.city,
      state: dbOrder.state,
      pincode: dbOrder.pincode,
      total: dbOrder.total,
      status: dbOrder.status,
      items: fallbackItems,
      created_at: dbOrder.created_at,
    };

    // Retry insert
    const { data: retryData, error: retryError } = await supabaseAdmin
      .from("orders")
      .insert(fallbackDbOrder)
      .select()
      .maybeSingle();

    return { data: retryData, error: retryError };
  }

  return { data, error };
}

export async function updateOrderStatusSafe(id: string, updateFields: any) {
  // If we want to update paymentStatus, we try direct update first
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update(updateFields)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (!error) {
    return { data, error: null };
  }

  const errorMsg = error.message || "";
  const isMissingColumnError = 
    errorMsg.includes("payment_status") || 
    errorMsg.includes("razorpay_order_id") || 
    errorMsg.includes("razorpay_payment_id") || 
    error.code === "PGRST111" || 
    error.code === "42703";

  if (isMissingColumnError) {
    console.warn("payment_status column not found. Updating payment status inside items JSON.");

    // Fetch existing order to get current items
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existingOrder) {
      return { data: null, error: fetchError || new Error("Order not found") };
    }

    let items = existingOrder.items || [];
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }

    // Modify the metadata item
    if (Array.isArray(items)) {
      const metadataIdx = items.findIndex((item: any) => item && item.isMetadata);
      if (metadataIdx > -1) {
        items[metadataIdx] = {
          ...items[metadataIdx],
          paymentStatus: updateFields.payment_status || items[metadataIdx].paymentStatus || "Paid",
          paymentMethod: updateFields.payment_method || items[metadataIdx].paymentMethod || "Razorpay",
          razorpayOrderId: updateFields.razorpay_order_id || items[metadataIdx].razorpayOrderId || null,
          razorpayPaymentId: updateFields.razorpay_payment_id || items[metadataIdx].razorpayPaymentId || null,
        };
      } else {
        items.push({
          isMetadata: true,
          paymentMethod: updateFields.payment_method || "Razorpay",
          paymentStatus: updateFields.payment_status || "Paid",
          razorpayOrderId: updateFields.razorpay_order_id || null,
          razorpayPaymentId: updateFields.razorpay_payment_id || null,
        });
      }
    }

    const fallbackUpdateFields: any = {
      items
    };
    if (updateFields.status) {
      fallbackUpdateFields.status = updateFields.status;
    }

    const { data: retryData, error: retryError } = await supabaseAdmin
      .from("orders")
      .update(fallbackUpdateFields)
      .eq("id", id)
      .select()
      .maybeSingle();

    return { data: retryData, error: retryError };
  }

  return { data, error };
}

// Categories
export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  image: string;
  description: string | null;
  created_at?: string;
}

export function mapDbCategoryToCategory(dbCategory: DbCategory) {
  return {
    id: dbCategory.id,
    name: dbCategory.name,
    slug: dbCategory.slug,
    image: dbCategory.image,
    description: dbCategory.description || undefined,
    createdAt: dbCategory.created_at,
  };
}

export function mapCategoryToDbCategory(category: any) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    image: category.image,
    description: category.description !== undefined ? category.description : null,
  };
}

// Addresses
export interface DbAddress {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export function mapDbAddressToAddress(dbAddress: DbAddress) {
  return {
    id: dbAddress.id,
    userId: dbAddress.user_id,
    fullName: dbAddress.full_name,
    customerName: dbAddress.full_name, // legacy compatibility
    phone: dbAddress.phone,
    addressLine1: dbAddress.address_line_1,
    addressLine2: dbAddress.address_line_2 || undefined,
    city: dbAddress.city,
    state: dbAddress.state,
    pincode: dbAddress.pincode,
    landmark: dbAddress.landmark || undefined,
    isDefault: dbAddress.is_default,
    createdAt: dbAddress.created_at,
    updatedAt: dbAddress.updated_at,
  };
}

export function mapAddressToDbAddress(address: any) {
  return {
    id: address.id || crypto.randomUUID(),
    user_id: address.userId,
    full_name: address.fullName || address.customerName,
    phone: address.phone,
    address_line_1: address.addressLine1,
    address_line_2: address.addressLine2 || null,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    landmark: address.landmark || null,
    is_default: !!address.isDefault,
  };
}
