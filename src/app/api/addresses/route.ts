import { NextResponse } from "next/server";
import { supabaseAdmin, mapDbAddressToAddress, mapAddressToDbAddress } from "@/lib/supabase";
import { AddressSchema } from "@/lib/zod/schemas";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: addresses, error } = await supabaseAdmin
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const mappedAddresses = (addresses || []).map(mapDbAddressToAddress);
    return NextResponse.json({ success: true, data: mappedAddresses });
  } catch (error) {
    console.error("GET /api/addresses error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch addresses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Inject the current authenticated user's ID and resolve name mapping
    const validatedData = AddressSchema.parse({
      ...body,
      fullName: body.fullName || body.customerName,
      userId: user.id,
    });

    const newAddressId = crypto.randomUUID();
    const newAddress = {
      ...validatedData,
      id: newAddressId,
    };

    // If new address is set to default, unset other defaults first
    if (newAddress.isDefault) {
      const { error: resetError } = await supabaseAdmin
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      if (resetError) {
        console.error("Failed to reset other addresses default state:", resetError);
      }
    } else {
      // If this is the only address, make it default
      const { count, error: countError } = await supabaseAdmin
        .from("addresses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!countError && (count === 0 || count === null)) {
        newAddress.isDefault = true;
      }
    }

    const dbAddress = mapAddressToDbAddress(newAddress);
    const { error } = await supabaseAdmin
      .from("addresses")
      .insert(dbAddress);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data: newAddress }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 });
    }
    console.error("POST /api/addresses error:", error);
    return NextResponse.json({ success: false, error: "Failed to save address" }, { status: 500 });
  }
}
