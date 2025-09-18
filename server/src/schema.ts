import { z } from 'zod';

// User roles enum
export const userRoleSchema = z.enum(['BDM', 'MANAGEMENT']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Pipeline stages enum
export const pipelineStageSchema = z.enum([
  'LEAD',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST'
]);
export type PipelineStage = z.infer<typeof pipelineStageSchema>;

// Visit types enum
export const visitTypeSchema = z.enum(['SALES_CALL', 'FOLLOW_UP', 'DEMO', 'SUPPORT', 'OTHER']);
export type VisitType = z.infer<typeof visitTypeSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type User = z.infer<typeof userSchema>;

// Company schema
export const companySchema = z.object({
  id: z.number(),
  name: z.string(),
  industry: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  website: z.string().nullable(),
  fleet_size: z.number().int().nullable(),
  annual_revenue: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  created_by: z.number(),
  assigned_bdm: z.number()
});
export type Company = z.infer<typeof companySchema>;

// Contact schema
export const contactSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  name: z.string(),
  position: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  is_primary: z.boolean(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Contact = z.infer<typeof contactSchema>;

// Visit schema
export const visitSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  contact_id: z.number().nullable(),
  user_id: z.number(),
  visit_type: visitTypeSchema,
  visit_date: z.coerce.date(),
  duration_minutes: z.number().int().nullable(),
  summary: z.string(),
  objectives: z.string().nullable(),
  outcomes: z.string().nullable(),
  next_steps: z.string().nullable(),
  follow_up_date: z.coerce.date().nullable(),
  location: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Visit = z.infer<typeof visitSchema>;

// Sales Opportunity schema
export const salesOpportunitySchema = z.object({
  id: z.number(),
  company_id: z.number(),
  contact_id: z.number().nullable(),
  user_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  value: z.number().nullable(),
  probability: z.number().int().min(0).max(100),
  stage: pipelineStageSchema,
  expected_close_date: z.coerce.date().nullable(),
  actual_close_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type SalesOpportunity = z.infer<typeof salesOpportunitySchema>;

// Input schemas for creating records
export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createCompanyInputSchema = z.object({
  name: z.string(),
  industry: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().nullable().optional(),
  fleet_size: z.number().int().nullable().optional(),
  annual_revenue: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  assigned_bdm: z.number()
});
export type CreateCompanyInput = z.infer<typeof createCompanyInputSchema>;

export const createContactInputSchema = z.object({
  company_id: z.number(),
  name: z.string(),
  position: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  is_primary: z.boolean().optional(),
  notes: z.string().nullable().optional()
});
export type CreateContactInput = z.infer<typeof createContactInputSchema>;

export const createVisitInputSchema = z.object({
  company_id: z.number(),
  contact_id: z.number().nullable().optional(),
  visit_type: visitTypeSchema,
  visit_date: z.coerce.date(),
  duration_minutes: z.number().int().nullable().optional(),
  summary: z.string(),
  objectives: z.string().nullable().optional(),
  outcomes: z.string().nullable().optional(),
  next_steps: z.string().nullable().optional(),
  follow_up_date: z.coerce.date().nullable().optional(),
  location: z.string().nullable().optional()
});
export type CreateVisitInput = z.infer<typeof createVisitInputSchema>;

export const createSalesOpportunityInputSchema = z.object({
  company_id: z.number(),
  contact_id: z.number().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  value: z.number().nullable().optional(),
  probability: z.number().int().min(0).max(100),
  stage: pipelineStageSchema,
  expected_close_date: z.coerce.date().nullable().optional()
});
export type CreateSalesOpportunityInput = z.infer<typeof createSalesOpportunityInputSchema>;

// Update schemas
export const updateCompanyInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  industry: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().nullable().optional(),
  fleet_size: z.number().int().nullable().optional(),
  annual_revenue: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  assigned_bdm: z.number().optional()
});
export type UpdateCompanyInput = z.infer<typeof updateCompanyInputSchema>;

export const updateContactInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  position: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  is_primary: z.boolean().optional(),
  notes: z.string().nullable().optional()
});
export type UpdateContactInput = z.infer<typeof updateContactInputSchema>;

export const updateSalesOpportunityInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  value: z.number().nullable().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  stage: pipelineStageSchema.optional(),
  expected_close_date: z.coerce.date().nullable().optional(),
  actual_close_date: z.coerce.date().nullable().optional()
});
export type UpdateSalesOpportunityInput = z.infer<typeof updateSalesOpportunityInputSchema>;

// Query schemas
export const getCompaniesQuerySchema = z.object({
  assigned_bdm: z.number().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});
export type GetCompaniesQuery = z.infer<typeof getCompaniesQuerySchema>;

export const getVisitsQuerySchema = z.object({
  company_id: z.number().optional(),
  user_id: z.number().optional(),
  from_date: z.coerce.date().optional(),
  to_date: z.coerce.date().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});
export type GetVisitsQuery = z.infer<typeof getVisitsQuerySchema>;

export const getSalesOpportunitiesQuerySchema = z.object({
  company_id: z.number().optional(),
  user_id: z.number().optional(),
  stage: pipelineStageSchema.optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});
export type GetSalesOpportunitiesQuery = z.infer<typeof getSalesOpportunitiesQuerySchema>;

// Dashboard data schema
export const dashboardDataSchema = z.object({
  total_companies: z.number().int(),
  total_visits_this_month: z.number().int(),
  total_opportunities: z.number().int(),
  pipeline_value: z.number(),
  recent_visits: z.array(visitSchema),
  opportunities_by_stage: z.array(z.object({
    stage: pipelineStageSchema,
    count: z.number().int(),
    total_value: z.number()
  }))
});
export type DashboardData = z.infer<typeof dashboardDataSchema>;

// Company with relations schema
export const companyWithRelationsSchema = companySchema.extend({
  contacts: z.array(contactSchema),
  visits: z.array(visitSchema),
  sales_opportunities: z.array(salesOpportunitySchema)
});
export type CompanyWithRelations = z.infer<typeof companyWithRelationsSchema>;