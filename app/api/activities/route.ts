import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth-server.ts';
import { db } from '@/src/db/index.ts';
import { activities } from '@/src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';

// GET activities
export async function GET(req: NextRequest) {
  const user = await verifyAuthToken(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const list = await db.select()
      .from(activities)
      .where(eq(activities.userId, user.uid))
      .orderBy(desc(activities.createdAt));
    return NextResponse.json(list);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
}

// POST create activity
export async function POST(req: NextRequest) {
  const user = await verifyAuthToken(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, type, title, subtitle, time, status, completed } = body;

    if (!title || !type) {
      return NextResponse.json({ error: 'Title and type are required' }, { status: 400 });
    }

    const newActivity = {
      id: id || `act_${Date.now()}`,
      userId: user.uid,
      type,
      title,
      subtitle: subtitle || '',
      time: time || 'Today',
      status: status || 'Standard',
      completed: completed || false,
      createdAt: new Date(),
    };

    await db.insert(activities).values(newActivity);
    return NextResponse.json(newActivity);
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: 'Database insertion failed' }, { status: 500 });
  }
}
