import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth-server.ts';
import { db } from '@/src/db/index.ts';
import { customers, timelineInteractions } from '@/src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';

// GET customers
export async function GET(req: NextRequest) {
  const user = await verifyAuthToken(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Query Layer
    const customerList = await db.select()
      .from(customers)
      .where(eq(customers.userId, user.uid));

    const enrichedCustomers = await Promise.all(
      customerList.map(async (cust) => {
        const timelineList = await db.select()
          .from(timelineInteractions)
          .where(eq(timelineInteractions.customerId, cust.id))
          .orderBy(desc(timelineInteractions.createdAt));
        
        return {
          ...cust,
          timeline: timelineList,
        };
      })
    );

    return NextResponse.json(enrichedCustomers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
}

// POST create custom customer
export async function POST(req: NextRequest) {
  const user = await verifyAuthToken(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, company, email, phone, address, status, leadSource, dealValue, dealProgress, dealNextStep, avatarUrl, initials } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const newCustomer = {
      id: id || `c_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.uid,
      name,
      company: company || '',
      email: email || '',
      phone: phone || '',
      address: address || '',
      status: status || 'Lead',
      leadSource: leadSource || '',
      dealValue: parseInt(dealValue) || 0,
      dealProgress: parseInt(dealProgress) || 0,
      dealNextStep: dealNextStep || '',
      avatarUrl: avatarUrl || '',
      initials: initials || name.substring(0, 2).toUpperCase(),
      createdAt: new Date()
    };

    await db.insert(customers).values(newCustomer);

    // Create an initial timeline entry so there is context
    const initialTimeline = {
      id: `i_${Date.now()}`,
      customerId: newCustomer.id,
      type: 'note' as const,
      title: 'Lead Captured',
      timestamp: 'Just now',
      description: 'Customer record initialized in Gestor de Clientes.',
      createdAt: new Date()
    };

    await db.insert(timelineInteractions).values(initialTimeline);

    return NextResponse.json({
      ...newCustomer,
      timeline: [initialTimeline]
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Database mutation failed' }, { status: 500 });
  }
}
