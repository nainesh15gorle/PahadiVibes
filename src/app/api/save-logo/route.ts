import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    
    // The image should be a base64 string like "data:image/png;base64,iVBORw0KGgo..."
    const base64Data = image.replace(/^data:image\/png;base64,/, "");
    
    const filePath = path.join(process.cwd(), "public", "logo-gold.png");
    
    fs.writeFileSync(filePath, base64Data, 'base64');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save logo:", error);
    return NextResponse.json({ success: false, error: "Failed to save logo" }, { status: 500 });
  }
}
