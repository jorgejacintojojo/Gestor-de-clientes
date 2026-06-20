import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Define the 'users' table.
export const users = pgTable('users', {
  uid: text('uid').primaryKey(), // Firebase Auth UID as primary key string
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'customers' table.
export const customers = pgTable('customers', {
  id: text('id').primaryKey(), // Unique string ID (e.g. c1, c2, or uuid)
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  company: text('company').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  address: text('address'),
  status: text('status').notNull(), // 'Lead' | 'Customer' | 'Inactive' | 'Negotiation'
  leadSource: text('lead_source'),
  dealValue: integer('deal_value'),
  dealProgress: integer('deal_progress'), // 0 - 100
  dealNextStep: text('deal_next_step'),
  avatarUrl: text('avatar_url'),
  initials: text('initials').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'timeline_interactions' table.
export const timelineInteractions = pgTable('timeline_interactions', {
  id: text('id').primaryKey(),
  customerId: text('customer_id')
    .references(() => customers.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(), // 'call' | 'mail' | 'meet' | 'note' | 'contract'
  title: text('title').notNull(),
  timestamp: text('timestamp').notNull(), // string for relative or actual datetime (e.g. "3 days ago")
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'activities' table.
export const activities = pgTable('activities', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(), // 'call' | 'meet' | 'task'
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  time: text('time').notNull(), // e.g. "10:30 AM" or "Tomorrow"
  status: text('status'), // e.g. "Overdue", "High", "Standard"
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
