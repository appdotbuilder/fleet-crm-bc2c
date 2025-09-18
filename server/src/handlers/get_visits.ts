import { db } from '../db';
import { visitsTable } from '../db/schema';
import { type Visit, type GetVisitsQuery } from '../schema';
import { eq, gte, lte, and, desc } from 'drizzle-orm';

export async function getVisits(query: GetVisitsQuery = {}): Promise<Visit[]> {
  try {
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    // Build the complete query in one go to avoid TypeScript issues
    const baseQuery = db.select().from(visitsTable);
    
    // Build where conditions
    const whereConditions = [];
    
    if (query.company_id !== undefined) {
      whereConditions.push(eq(visitsTable.company_id, query.company_id));
    }

    if (query.user_id !== undefined) {
      whereConditions.push(eq(visitsTable.user_id, query.user_id));
    }

    if (query.from_date !== undefined) {
      whereConditions.push(gte(visitsTable.visit_date, query.from_date));
    }

    if (query.to_date !== undefined) {
      whereConditions.push(lte(visitsTable.visit_date, query.to_date));
    }

    // Execute query with conditional where clause
    let results;
    if (whereConditions.length === 0) {
      results = await baseQuery
        .orderBy(desc(visitsTable.visit_date))
        .limit(limit)
        .offset(offset)
        .execute();
    } else if (whereConditions.length === 1) {
      results = await baseQuery
        .where(whereConditions[0])
        .orderBy(desc(visitsTable.visit_date))
        .limit(limit)
        .offset(offset)
        .execute();
    } else {
      results = await baseQuery
        .where(and(...whereConditions))
        .orderBy(desc(visitsTable.visit_date))
        .limit(limit)
        .offset(offset)
        .execute();
    }

    // No numeric conversions needed for visits table - all numeric fields are integers
    return results;
  } catch (error) {
    console.error('Get visits failed:', error);
    throw error;
  }
}