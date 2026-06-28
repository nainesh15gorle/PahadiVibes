import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { checkAdminAuth } from "@/lib/auth";

const dataFilePath = path.join(process.cwd(), "src/lib/data/discounts.json");

async function readDiscounts() {
  try {
    const fileContent = await fs.readFile(dataFilePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    return [];
  }
}

async function writeDiscounts(data: any) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });

    const body = await request.json();
    const { active, expiryDate, value, type } = body;

    const discounts = await readDiscounts();
    const index = discounts.findIndex((d: any) => d.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, error: "Discount not found" }, { status: 404 });
    }

    if (active !== undefined) discounts[index].active = active;
    if (expiryDate !== undefined) discounts[index].expiryDate = expiryDate;
    if (value !== undefined) discounts[index].value = Number(value);
    if (type !== undefined) discounts[index].type = type;

    await writeDiscounts(discounts);

    return NextResponse.json({ success: true, data: discounts[index] });
  } catch (error) {
    console.error(`PUT /api/discounts/${id} error:`, error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });

    const discounts = await readDiscounts();
    const filtered = discounts.filter((d: any) => d.id !== id);

    await writeDiscounts(filtered);

    return NextResponse.json({ success: true, message: "Discount deleted" });
  } catch (error) {
    console.error(`DELETE /api/discounts/${id} error:`, error);
    return NextResponse.json({ success: false, error: "Failed to delete discount" }, { status: 500 });
  }
}
