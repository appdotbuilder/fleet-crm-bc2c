import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  createCompanyInputSchema,
  createContactInputSchema,
  createVisitInputSchema,
  createSalesOpportunityInputSchema,
  updateCompanyInputSchema,
  updateContactInputSchema,
  updateSalesOpportunityInputSchema,
  getCompaniesQuerySchema,
  getVisitsQuerySchema,
  getSalesOpportunitiesQuerySchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { createCompany } from './handlers/create_company';
import { getCompanies } from './handlers/get_companies';
import { getCompanyById } from './handlers/get_company_by_id';
import { updateCompany } from './handlers/update_company';
import { createContact } from './handlers/create_contact';
import { getContacts } from './handlers/get_contacts';
import { updateContact } from './handlers/update_contact';
import { createVisit } from './handlers/create_visit';
import { getVisits } from './handlers/get_visits';
import { createSalesOpportunity } from './handlers/create_sales_opportunity';
import { getSalesOpportunities } from './handlers/get_sales_opportunities';
import { updateSalesOpportunity } from './handlers/update_sales_opportunity';
import { getDashboardData } from './handlers/get_dashboard_data';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),

  // Company management routes
  createCompany: publicProcedure
    .input(createCompanyInputSchema)
    .mutation(({ input }) => {
      // TODO: Get userId from authentication context
      const userId = 1; // Placeholder - should come from auth context
      return createCompany(input, userId);
    }),

  getCompanies: publicProcedure
    .input(getCompaniesQuerySchema.optional())
    .query(({ input }) => getCompanies(input)),

  getCompanyById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCompanyById(input.id)),

  updateCompany: publicProcedure
    .input(updateCompanyInputSchema)
    .mutation(({ input }) => updateCompany(input)),

  // Contact management routes
  createContact: publicProcedure
    .input(createContactInputSchema)
    .mutation(({ input }) => createContact(input)),

  getContacts: publicProcedure
    .input(z.object({ companyId: z.number().optional() }))
    .query(({ input }) => getContacts(input.companyId)),

  updateContact: publicProcedure
    .input(updateContactInputSchema)
    .mutation(({ input }) => updateContact(input)),

  // Visit management routes
  createVisit: publicProcedure
    .input(createVisitInputSchema)
    .mutation(({ input }) => {
      // TODO: Get userId from authentication context
      const userId = 1; // Placeholder - should come from auth context
      return createVisit(input, userId);
    }),

  getVisits: publicProcedure
    .input(getVisitsQuerySchema.optional())
    .query(({ input }) => getVisits(input)),

  // Sales opportunity management routes
  createSalesOpportunity: publicProcedure
    .input(createSalesOpportunityInputSchema)
    .mutation(({ input }) => {
      // TODO: Get userId from authentication context
      const userId = 1; // Placeholder - should come from auth context
      return createSalesOpportunity(input, userId);
    }),

  getSalesOpportunities: publicProcedure
    .input(getSalesOpportunitiesQuerySchema.optional())
    .query(({ input }) => getSalesOpportunities(input)),

  updateSalesOpportunity: publicProcedure
    .input(updateSalesOpportunityInputSchema)
    .mutation(({ input }) => updateSalesOpportunity(input)),

  // Dashboard route
  getDashboardData: publicProcedure
    .query(() => {
      // TODO: Get userId and userRole from authentication context
      const userId = 1; // Placeholder - should come from auth context
      const userRole = 'BDM'; // Placeholder - should come from auth context
      return getDashboardData(userId, userRole);
    })
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();