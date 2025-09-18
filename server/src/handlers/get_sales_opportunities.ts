import { db } from '../db';
import { salesOpportunitiesTable } from '../db/schema';
import { type SalesOpportunity, type GetSalesOpportunitiesQuery } from '../schema';
import { eq, and, desc, type SQL } from 'drizzle-orm';

export async function getSalesOpportunities(query: GetSalesOpportunitiesQuery = {}): Promise<SalesOpportunity[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Apply filters
    if (query.company_id !== undefined) {
      conditions.push(eq(salesOpportunitiesTable.company_id, query.company_id));
    }

    if (query.user_id !== undefined) {
      conditions.push(eq(salesOpportunitiesTable.user_id, query.user_id));
    }

    if (query.stage !== undefined) {
      conditions.push(eq(salesOpportunitiesTable.stage, query.stage));
    }

    // Build the complete query at once
    const limit = query.limit || 50; // Default limit
    const offset = query.offset || 0; // Default offset

    const results = conditions.length > 0
      ? await db.select()
          .from(salesOpportunitiesTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(salesOpportunitiesTable.created_at))
          .limit(limit)
          .offset(offset)
          .execute()
      : await db.select()
          .from(salesOpportunitiesTable)
          .orderBy(desc(salesOpportunitiesTable.created_at))
          .limit(limit)
          .offset(offset)
          .execute();

    // Convert numeric fields and return
    return results.map(opportunity => ({
      ...opportunity,
      value: opportunity.value ? parseFloat(opportunity.value) : null
    }));
  } catch (error) {
    console.error('Failed to get sales opportunities:', error);
    throw error;
  }
}