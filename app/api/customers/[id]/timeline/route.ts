import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth-server.ts';
import { db } from '@/src/db/index.ts';
import { timelineInteractions, customers } from '@/src/db/schema.ts';
import { eq, and } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuthToken(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verify customer belongs to the user
    const [cust] = await db.select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.userId, user.uid)));

    if (!cust) {
      return NextResponse.json({ error: 'Customer not found or access denied' }, { status: 404 });
    }

    const body = await req.json();
    const { type, title, timestamp, description } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const newInteraction = {
      id: `i_${Date.now()}`,
      customerId: id,
      type: type || 'note',
      title,
      timestamp: timestamp || 'Just now',
      description,
      createdAt: new Date(),
    };

    await db.insert(timelineInteractions).values(newInteraction);

    return NextResponse.json(newInteraction);
  } catch (error) {
    console.error(`Error adding timeline entry for customer ${id}:`, error);
    return NextResponse.json({ error: 'Database insertion failed' }, { status: 500 });
  }
}
