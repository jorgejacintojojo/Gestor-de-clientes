import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth-server.ts';
import { db } from '@/src/db/index.ts';
import { customers } from '@/src/db/schema.ts';
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
    const updateData: Partial<typeof customers.$inferInsert> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.company !== undefined) updateData.company = body.company;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.leadSource !== undefined) updateData.leadSource = body.leadSource;
    if (body.dealValue !== undefined) updateData.dealValue = parseInt(body.dealValue) || 0;
    if (body.dealProgress !== undefined) updateData.dealProgress = parseInt(body.dealProgress) || 0;
    if (body.dealNextStep !== undefined) updateData.dealNextStep = body.dealNextStep;
    if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;
    if (body.initials !== undefined) updateData.initials = body.initials;

    await db.update(customers)
      .set(updateData)
      .where(and(eq(customers.id, id), eq(customers.userId, user.uid)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error updating customer ${id}:`, error);
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
    await db.delete(customers)
      .where(and(eq(customers.id, id), eq(customers.userId, user.uid)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error deleting customer ${id}:`, error);
    return NextResponse.json({ error: 'Database deletion failed' }, { status: 500 });
  }
}
