import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getWhatsAppDiagnosticStatus } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * GET /api/whatsapp/status
 *
 * Diagnostic endpoint for WhatsApp Cloud API integration.
 * Protected by checkAdminAuth().
 */
export async function GET() {
  try {
    const auth = await checkAdminAuth();
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const diag = getWhatsAppDiagnosticStatus();
    return NextResponse.json({
      success: true,
      ...diag,
    });
  } catch (error: any) {
    console.error('GET /api/whatsapp/status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
