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
    
    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    const taskSuggestions = await ContactAIActionsService.generateTaskSuggestions(
      userId, 
      contactId
    );

    return NextResponse.json({ suggestions: taskSuggestions });
  } catch (error) {
    console.error('Error generating task suggestions:', error);
    
    if (error instanceof Error && error.message === 'Contact not found') {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: 'Failed to generate task suggestions' }, 
      { status: 500 }
    );
  }
}