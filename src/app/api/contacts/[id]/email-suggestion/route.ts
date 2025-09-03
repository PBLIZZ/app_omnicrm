import { NextRequest, NextResponse } from 'next/server';
import { ContactAIActionsService } from '@/server/services/contact-ai-actions.service';
import { getServerUserId } from '@/server/auth/user';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    const { id: contactId } = await params;
    const body = await request.json().catch(() => ({}));
    const { purpose } = body;
    
    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    const emailSuggestion = await ContactAIActionsService.generateEmailSuggestion(
      userId, 
      contactId,
      purpose
    );

    return NextResponse.json(emailSuggestion);
  } catch (error) {
    console.error('Error generating email suggestion:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Contact not found or has no email address' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: 'Failed to generate email suggestion' }, 
      { status: 500 }
    );
  }
}