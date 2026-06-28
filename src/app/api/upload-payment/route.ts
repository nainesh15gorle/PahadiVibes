// This endpoint is obsolete and has been deactivated.
export async function POST() {
  return new Response(JSON.stringify({ success: false, error: "Obsolete" }), { status: 410 });
}
