import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth-server.ts';
import { db } from '@/src/db/index.ts';
import { customers, timelineInteractions, activities } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';

const DEFAULT_CUSTOMERS = [
  {
    id: 'c1',
    name: 'Alex Danvers',
    company: 'L-Corp Dynamics',
    email: 'alex.danvers@lcorpdynamics.com',
    phone: '+1 (555) 728-1992',
    address: '100 Science Parkway, National City, CA',
    status: 'Lead',
    leadSource: 'Website Inquiry',
    dealValue: 12000,
    dealProgress: 20,
    dealNextStep: 'Initial outreach call scheduled.',
    avatarUrl: '',
    initials: 'AD',
    timeline: [
      { id: 'i1', type: 'note', title: 'Lead Captured', timestamp: '3 days ago', description: 'Web form inquiry regarding custom pipeline reporting.' }
    ]
  },
  {
    id: 'c2',
    name: 'Arthur Morgan',
    company: 'Blackwater Imports',
    email: 'arthur@blackwaterimports.com',
    phone: '+1 (555) 902-1200',
    address: '1899 Frontier Blvd, Saint Denis, LA',
    status: 'Customer',
    leadSource: 'Referral',
    dealValue: 65000,
    dealProgress: 100,
    dealNextStep: 'Deal closed. Supporting roll-out stage.',
    avatarUrl: '',
    initials: 'AM',
    timeline: [
      { id: 'i2a', type: 'meet', title: 'Onboarding Session', timestamp: '5 days ago', description: 'Completed setup guidelines with Arthur.' },
      { id: 'i2b', type: 'note', title: 'Contract Signed', timestamp: '1 week ago', description: 'Standard enterprise tier terms accepted.' }
    ]
  },
  {
    id: 'c3',
    name: 'Bethany Ross',
    company: 'Ross & Associates',
    email: 'b.ross@associates.com',
    phone: '+1 (555) 700-1928',
    address: '742 Executive Way, Seattle, WA',
    status: 'Inactive',
    leadSource: 'Industry Event',
    dealValue: 0,
    dealProgress: 0,
    dealNextStep: 'Inactive account.',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKSJjmro5AKe5RELiL0XiQDT9jgmXn13mlH46QLTOMj-OipplzibgawOdK3dZ5DNFERgIrhEpzhY5-2ZY-uHgPH1CzrnYzcOQVj17NCvJVyvHIQs02W0guv42m3tSAigF9Rv635Gr7OcmGcVq7iSxP9cxomDDIh2eGdEUdt-G7IalwgAymrk20tPXX2yTxTqKdZgdd2-qhxEEA9cMTNVF3vpfZuT4FaPIMnaNIgGr0qacDufZpjz1QwxLWOpZyQSQHGzCnvlykzxB1',
    initials: 'BR',
    timeline: [
      { id: 'i3', type: 'mail', title: 'Follow-up Email', timestamp: 'Oct 24', description: 'Checked in on Q2 budgeting requests. No reply received.' }
    ]
  },
  {
    id: 'c4',
    name: 'Clark Kent',
    company: 'Daily Planet Media',
    email: 'ckent@dailyplanet.com',
    phone: '+1 (555) 234-9000',
    address: '222 Metropolis Ave, Floor 14, Metropolis, NY',
    status: 'Customer',
    leadSource: 'LinkedIn',
    dealValue: 24000,
    dealProgress: 100,
    dealNextStep: 'Active subscriber support.',
    avatarUrl: '',
    initials: 'CK',
    timeline: [
      { id: 'i4', type: 'call', title: 'Support Handshake', timestamp: '2 weeks ago', description: 'Assisted in configuration of daily alert integrations.' }
    ]
  },
  {
    id: 'c5',
    name: 'Alex Martinez',
    company: 'TechLogistics Corp',
    email: 'a.martinez@techlogistics.com',
    phone: '+1 (555) 012-3456',
    address: '452 Innovation Way, Suite 1200, Austin, TX',
    status: 'Negotiation',
    leadSource: 'Website Inquiry',
    dealValue: 45000,
    dealProgress: 75,
    dealNextStep: 'Contract finalization with legal team.',
    avatarUrl: '',
    initials: 'AM',
    timeline: [
      { id: 'i5a', type: 'meet', title: 'Meeting Notes', timestamp: '2h ago', description: 'Discussed Q4 expansion plans. Alex is interested in our enterprise tier package.' },
      { id: 'i5b', type: 'call', title: 'Outbound Call', timestamp: 'Yesterday', description: 'Duration: 12m 45s. Follow-up regarding the technical documentation sent last week.' },
      { id: 'i5c', type: 'contract', title: 'Contract Sent', timestamp: 'Oct 12', description: 'Initial draft of the service agreement delivered via DocuSign.' }
    ]
  }
];

const DEFAULT_ACTIVITIES = [
  { id: 'act1', type: 'call', title: 'Call John Doe', subtitle: 'Follow up on Enterprise Deal', time: '10:30 AM', status: 'Overdue', completed: false },
  { id: 'act2', type: 'meet', title: 'Meeting with Acme Corp', subtitle: 'Quarterly Review Session', time: '02:00 PM', status: 'High', completed: false },
  { id: 'act3', type: 'task', title: 'Send Proposal', subtitle: 'TechStart Inc. Integration', time: 'Tomorrow', completed: false }
];

export async function POST(req: NextRequest) {
  const user = await verifyAuthToken(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Purge existing entries for this user (using cascade delete)
    await db.delete(customers).where(eq(customers.userId, user.uid));
    await db.delete(activities).where(eq(activities.userId, user.uid));

    // 2. Insert Default Activities
    for (const act of DEFAULT_ACTIVITIES) {
      await db.insert(activities).values({
        id: act.id,
        userId: user.uid,
        type: act.type,
        title: act.title,
        subtitle: act.subtitle,
        time: act.time,
        status: act.status,
        completed: act.completed,
        createdAt: new Date()
      });
    }

    // 3. Insert Default Customers & Timeline
    for (const cust of DEFAULT_CUSTOMERS) {
      await db.insert(customers).values({
        id: cust.id,
        userId: user.uid,
        name: cust.name,
        company: cust.company,
        email: cust.email,
        phone: cust.phone,
        address: cust.address,
        status: cust.status,
        leadSource: cust.leadSource,
        dealValue: cust.dealValue,
        dealProgress: cust.dealProgress,
        dealNextStep: cust.dealNextStep,
        avatarUrl: cust.avatarUrl,
        initials: cust.initials,
        createdAt: new Date()
      });

      for (const timeline of cust.timeline) {
        await db.insert(timelineInteractions).values({
          id: timeline.id,
          customerId: cust.id,
          type: timeline.type,
          title: timeline.title,
          timestamp: timeline.timestamp,
          description: timeline.description,
          createdAt: new Date()
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting database:', error);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}
