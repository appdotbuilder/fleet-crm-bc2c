import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['BDM', 'MANAGEMENT']);
export const pipelineStageEnum = pgEnum('pipeline_stage', [
  'LEAD',
  'QUALIFIED', 
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST'
]);
export const visitTypeEnum = pgEnum('visit_type', [
  'SALES_CALL',
  'FOLLOW_UP', 
  'DEMO',
  'SUPPORT',
  'OTHER'
]);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Companies table
export const companiesTable = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  industry: text('industry'),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  fleet_size: integer('fleet_size'),
  annual_revenue: numeric('annual_revenue', { precision: 15, scale: 2 }),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  assigned_bdm: integer('assigned_bdm').notNull().references(() => usersTable.id)
});

// Contacts table
export const contactsTable = pgTable('contacts', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companiesTable.id),
  name: text('name').notNull(),
  position: text('position'),
  phone: text('phone'),
  email: text('email'),
  is_primary: boolean('is_primary').notNull().default(false),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Visits table
export const visitsTable = pgTable('visits', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companiesTable.id),
  contact_id: integer('contact_id').references(() => contactsTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  visit_type: visitTypeEnum('visit_type').notNull(),
  visit_date: timestamp('visit_date').notNull(),
  duration_minutes: integer('duration_minutes'),
  summary: text('summary').notNull(),
  objectives: text('objectives'),
  outcomes: text('outcomes'),
  next_steps: text('next_steps'),
  follow_up_date: timestamp('follow_up_date'),
  location: text('location'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Sales Opportunities table
export const salesOpportunitiesTable = pgTable('sales_opportunities', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companiesTable.id),
  contact_id: integer('contact_id').references(() => contactsTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  title: text('title').notNull(),
  description: text('description'),
  value: numeric('value', { precision: 15, scale: 2 }),
  probability: integer('probability').notNull().default(50),
  stage: pipelineStageEnum('stage').notNull(),
  expected_close_date: timestamp('expected_close_date'),
  actual_close_date: timestamp('actual_close_date'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  created_companies: many(companiesTable, { relationName: 'creator' }),
  assigned_companies: many(companiesTable, { relationName: 'assignee' }),
  visits: many(visitsTable),
  sales_opportunities: many(salesOpportunitiesTable)
}));

export const companiesRelations = relations(companiesTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [companiesTable.created_by],
    references: [usersTable.id],
    relationName: 'creator'
  }),
  assigned_bdm_user: one(usersTable, {
    fields: [companiesTable.assigned_bdm],
    references: [usersTable.id],
    relationName: 'assignee'
  }),
  contacts: many(contactsTable),
  visits: many(visitsTable),
  sales_opportunities: many(salesOpportunitiesTable)
}));

export const contactsRelations = relations(contactsTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [contactsTable.company_id],
    references: [companiesTable.id]
  }),
  visits: many(visitsTable),
  sales_opportunities: many(salesOpportunitiesTable)
}));

export const visitsRelations = relations(visitsTable, ({ one }) => ({
  company: one(companiesTable, {
    fields: [visitsTable.company_id],
    references: [companiesTable.id]
  }),
  contact: one(contactsTable, {
    fields: [visitsTable.contact_id],
    references: [contactsTable.id]
  }),
  user: one(usersTable, {
    fields: [visitsTable.user_id],
    references: [usersTable.id]
  })
}));

export const salesOpportunitiesRelations = relations(salesOpportunitiesTable, ({ one }) => ({
  company: one(companiesTable, {
    fields: [salesOpportunitiesTable.company_id],
    references: [companiesTable.id]
  }),
  contact: one(contactsTable, {
    fields: [salesOpportunitiesTable.contact_id],
    references: [contactsTable.id]
  }),
  user: one(usersTable, {
    fields: [salesOpportunitiesTable.user_id],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Company = typeof companiesTable.$inferSelect;
export type NewCompany = typeof companiesTable.$inferInsert;
export type Contact = typeof contactsTable.$inferSelect;
export type NewContact = typeof contactsTable.$inferInsert;
export type Visit = typeof visitsTable.$inferSelect;
export type NewVisit = typeof visitsTable.$inferInsert;
export type SalesOpportunity = typeof salesOpportunitiesTable.$inferSelect;
export type NewSalesOpportunity = typeof salesOpportunitiesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  companies: companiesTable,
  contacts: contactsTable,
  visits: visitsTable,
  sales_opportunities: salesOpportunitiesTable
};

export const tableRelations = {
  usersRelations,
  companiesRelations,
  contactsRelations,
  visitsRelations,
  salesOpportunitiesRelations
};