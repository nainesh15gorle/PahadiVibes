import { NextResponse } from "next/server";
import { supabaseAdmin, mapDbAddressToAddress, mapAddressToDbAddress } from "@/lib/supabase";
import { AddressSchema } from "@/lib/zod/schemas";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership of the address
    const { data: existingAddress, error: fetchError } = await supabaseAdmin
      .from("addresses")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !existingAddress) {
      return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 });
    }

    // Validate request body and resolve name mapping
    const validatedData = AddressSchema.parse({
      ...body,
      fullName: body.fullName || body.customerName,
      userId: user.id,
    });

    const updatedAddress = {
      ...validatedData,
      id,
    };

    // If setting to default, unset other default addresses
    if (updatedAddress.isDefault) {
      const { error: resetError } = await supabaseAdmin
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .neq("id", id);

      if (resetError) {
        console.error("Failed to reset other addresses default state:", resetError);
      }
    }

    const dbAddress = mapAddressToDbAddress(updatedAddress);
    const { error: updateError } = await supabaseAdmin
      .from("addresses")
      .update(dbAddress)
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, data: updatedAddress });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 });
    }
    console.error("PUT /api/addresses/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update address" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership of the address
    const { data: existingAddress, error: fetchError } = await supabaseAdmin
      .from("addresses")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !existingAddress) {
      return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 });
    }

    const wasDefault = existingAddress.is_default;

    // Delete address
    const { error: deleteError } = await supabaseAdmin
      .from("addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      throw deleteError;
    }

    // If the deleted address was default, set another address as default
    if (wasDefault) {
      const { data: otherAddresses } = await supabaseAdmin
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (otherAddresses && otherAddresses.length > 0) {
        await supabaseAdmin
          .from("addresses")
          .update({ is_default: true })
          .eq("id", otherAddresses[0].id);
      }
    }

    return NextResponse.json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/addresses/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete address" }, { status: 500 });
  }
}
