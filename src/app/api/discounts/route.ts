import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { checkAdminAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const dataFilePath = path.join(process.cwd(), "src/lib/data/discounts.json");

async function readDiscounts() {
  try {
    const dir = path.dirname(dataFilePath);
    await fs.mkdir(dir, { recursive: true });
    
    const fileContent = await fs.readFile(dataFilePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      await fs.writeFile(dataFilePath, JSON.stringify([]), "utf-8");
      return [];
    }
    console.error("Read discounts error:", error);
    return [];
  }
}

async function writeDiscounts(data: any) {
  const dir = path.dirname(dataFilePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });

    const discounts = await readDiscounts();
    return NextResponse.json({ success: true, data: discounts });
  } catch (error) {
    console.error("GET /api/discounts error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch discounts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });

    const body = await request.json();
    const { code, type, value, expiryDate, active } = body;

    if (!code || !type || value === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const discounts = await readDiscounts();

    if (discounts.some((d: any) => d.code.toUpperCase() === code.toUpperCase())) {
      return NextResponse.json({ success: false, error: "Discount code already exists" }, { status: 400 });
    }

    const newDiscount = {
      id: crypto.randomUUID(),
      code: code.toUpperCase(),
      type,
      value: Number(value),
      expiryDate: expiryDate || null,
      active: active !== undefined ? active : true,
      createdAt: new Date().toISOString()
    };

    discounts.push(newDiscount);
    await writeDiscounts(discounts);

    return NextResponse.json({ success: true, data: newDiscount }, { status: 201 });
  } catch (error) {
    console.error("POST /api/discounts error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
