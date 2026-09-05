import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import {
  dispatchRecoveryNotification,
  getWhatsAppDiagnosticStatus,
  maskPhoneNumber,
} from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * POST /api/whatsapp/test
 *
 * Secure admin endpoint to trigger a test WhatsApp merchant notification.
 * Protected by checkAdminAuth().
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate Admin
    const auth = await checkAdminAuth();
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    // 2. Parse request body (optional recipient override)
    let body: { recipient?: string; messageType?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const recipientOverride = body.recipient?.trim();

    // 3. Check status
    const diag = getWhatsAppDiagnosticStatus();

    // 4. Dispatch Test Alert
    const sendResult = await dispatchRecoveryNotification(
      'TEST_ALERT',
      {
        orderId: 'TEST-DEMO-001',
        amount: 1499,
        customerName: 'Pahadi AI Test Demo',
        resolvedBy: 'Admin Test Console',
      },
      {
        recipient: recipientOverride,
        forceSend: true,
      }
    );

    // 5. Return sanitized response (never leak raw secrets or full recipient phone numbers)
    return NextResponse.json({
      success: sendResult.success,
      provider: sendResult.provider,
      mode: diag.mode,
      status: diag.status,
      recipientMasked: maskPhoneNumber(sendResult.recipient),
      messageId: sendResult.success ? sendResult.messageId : undefined,
      error: !sendResult.success ? sendResult.error : undefined,
      timestamp: sendResult.timestamp,
    });
  } catch (error: any) {
    console.error('POST /api/whatsapp/test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
