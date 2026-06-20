import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth-server.ts';
import { db } from '@/src/db/index.ts';
import { activities } from '@/src/db/schema.ts';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuthToken(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const updateData: Partial<typeof activities.$inferInsert> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.subtitle !== undefined) updateData.subtitle = body.subtitle;
    if (body.time !== undefined) updateData.time = body.time;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.completed !== undefined) updateData.completed = body.completed;

    await db.update(activities)
      .set(updateData)
      .where(and(eq(activities.id, id), eq(activities.userId, user.uid)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error updating activity ${id}:`, error);
    return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuthToken(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await db.delete(activities)
      .where(and(eq(activities.id, id), eq(activities.userId, user.uid)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error deleting activity ${id}:`, error);
    return NextResponse.json({ error: 'Database deletion failed' }, { status: 500 });
  }
}
