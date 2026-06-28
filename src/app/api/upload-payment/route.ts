import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ 
    success: false, 
    error: "This endpoint is obsolete. Manual payment upload is no longer supported." 
  }, { status: 410 }); // 410 Gone
}
