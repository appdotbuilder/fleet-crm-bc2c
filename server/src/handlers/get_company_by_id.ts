import { db } from '../db';
import { 
  companiesTable, 
  contactsTable, 
  visitsTable, 
  salesOpportunitiesTable 
} from '../db/schema';
import { type CompanyWithRelations } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCompanyById(id: number): Promise<CompanyWithRelations | null> {
  try {
    // Fetch the company
    const companies = await db.select()
      .from(companiesTable)
      .where(eq(companiesTable.id, id))
      .execute();

    if (companies.length === 0) {
      return null;
    }

    const company = companies[0];

    // Fetch related contacts
    const contacts = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.company_id, id))
      .execute();

    // Fetch related visits
    const visits = await db.select()
      .from(visitsTable)
      .where(eq(visitsTable.company_id, id))
      .execute();

    // Fetch related sales opportunities
    const salesOpportunities = await db.select()
      .from(salesOpportunitiesTable)
      .where(eq(salesOpportunitiesTable.company_id, id))
      .execute();

    // Convert numeric fields and return combined data
    return {
      ...company,
      annual_revenue: company.annual_revenue ? parseFloat(company.annual_revenue) : null,
      contacts,
      visits,
      sales_opportunities: salesOpportunities.map(opp => ({
        ...opp,
        value: opp.value ? parseFloat(opp.value) : null
      }))
    };
  } catch (error) {
    console.error('Failed to fetch company by ID:', error);
    throw error;
  }
}