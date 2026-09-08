import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { checkAdminAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const authResult = await checkAdminAuth();
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Unauthorized: Admin access required." },
        { status: authResult.status || 401 }
      );
    }

    const { image } = await request.json();

    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      return NextResponse.json({ success: false, error: "Invalid image format" }, { status: 400 });
    }

    // Maximum 5MB base64 payload size
    if (image.length > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Image file exceeds 5MB limit" }, { status: 400 });
    }

    const base64Data = image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
    const filePath = path.join(process.cwd(), "public", "logo-gold.png");

    fs.writeFileSync(filePath, base64Data, "base64");
    logger.info("Admin updated public/logo-gold.png successfully");

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to save logo", error);
    return NextResponse.json({ success: false, error: "Failed to save logo" }, { status: 500 });
  }
}
