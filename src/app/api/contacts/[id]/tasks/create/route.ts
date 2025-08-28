import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { tasks, workspaces } from '@/server/db/schema';
import { getServerUserId } from '@/server/auth/user';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getServerUserId();
    
    const { id: contactId } = await params;
    const body = await request.json();
    const { title, description, priority, estimatedMinutes } = body;
    
    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    // Get or create default workspace
    let defaultWorkspace = await db.query.workspaces.findFirst({
      where: and(eq(workspaces.userId, userId), eq(workspaces.isDefault, true))
    });

    if (!defaultWorkspace) {
      // Create default workspace
      const newWorkspace = await db.insert(workspaces).values({
        userId,
        name: 'Default Workspace',
        description: 'Auto-created workspace for contact tasks',
        isDefault: true
      }).returning();
      defaultWorkspace = newWorkspace[0];
    }

    const newTask = await db.insert(tasks).values({
      userId,
      workspaceId: defaultWorkspace.id,
      title: title.trim(),
      description: description ? description.trim() : null,
      priority: priority || 'medium',
      estimatedMinutes: estimatedMinutes || null,
      source: 'ai_generated',
      approvalStatus: 'approved', // Auto-approve AI generated tasks from user request
      taggedContacts: [contactId] // Store contact ID in tagged contacts
    }).returning();

    return NextResponse.json(newTask[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' }, 
      { status: 500 }
    );
  }
}