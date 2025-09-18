import { db } from '../db';
import { companiesTable } from '../db/schema';
import { type Company, type GetCompaniesQuery } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getCompanies = async (query: GetCompaniesQuery = {}): Promise<Company[]> => {
  try {
    let results;

    if (query.assigned_bdm !== undefined) {
      // Query with filter
      let filteredQuery = db.select()
        .from(companiesTable)
        .where(eq(companiesTable.assigned_bdm, query.assigned_bdm))
        .orderBy(desc(companiesTable.created_at));

      if (query.limit !== undefined && query.offset !== undefined) {
        results = await filteredQuery.limit(query.limit).offset(query.offset).execute();
      } else if (query.limit !== undefined) {
        results = await filteredQuery.limit(query.limit).execute();
      } else if (query.offset !== undefined) {
        results = await filteredQuery.offset(query.offset).execute();
      } else {
        results = await filteredQuery.execute();
      }
    } else {
      // Query without filter
      let unfilteredQuery = db.select()
        .from(companiesTable)
        .orderBy(desc(companiesTable.created_at));

      if (query.limit !== undefined && query.offset !== undefined) {
        results = await unfilteredQuery.limit(query.limit).offset(query.offset).execute();
      } else if (query.limit !== undefined) {
        results = await unfilteredQuery.limit(query.limit).execute();
      } else if (query.offset !== undefined) {
        results = await unfilteredQuery.offset(query.offset).execute();
      } else {
        results = await unfilteredQuery.execute();
      }
    }

    // Convert numeric fields back to numbers
    return results.map(company => ({
      ...company,
      annual_revenue: company.annual_revenue ? parseFloat(company.annual_revenue) : null
    }));
  } catch (error) {
    console.error('Get companies failed:', error);
    throw error;
  }
};