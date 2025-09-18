import { db } from '../db';
import { salesOpportunitiesTable, companiesTable, contactsTable } from '../db/schema';
import { type CreateSalesOpportunityInput, type SalesOpportunity } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createSalesOpportunity = async (input: CreateSalesOpportunityInput, userId: number): Promise<SalesOpportunity> => {
  try {
    // Validate that the company exists
    const company = await db.select()
      .from(companiesTable)
      .where(eq(companiesTable.id, input.company_id))
      .execute();

    if (company.length === 0) {
      throw new Error(`Company with id ${input.company_id} not found`);
    }

    // If contact_id is provided, validate that the contact exists and belongs to the company
    if (input.contact_id) {
      const contact = await db.select()
        .from(contactsTable)
        .where(
          and(
            eq(contactsTable.id, input.contact_id),
            eq(contactsTable.company_id, input.company_id)
          )
        )
        .execute();

      if (contact.length === 0) {
        throw new Error(`Contact with id ${input.contact_id} not found for company ${input.company_id}`);
      }
    }

    // Insert the sales opportunity record
    const result = await db.insert(salesOpportunitiesTable)
      .values({
        company_id: input.company_id,
        contact_id: input.contact_id || null,
        user_id: userId,
        title: input.title,
        description: input.description || null,
        value: input.value !== undefined && input.value !== null ? input.value.toString() : null, // Convert number to string for numeric column
        probability: input.probability,
        stage: input.stage,
        expected_close_date: input.expected_close_date || null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const opportunity = result[0];
    return {
      ...opportunity,
      value: opportunity.value ? parseFloat(opportunity.value) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Sales opportunity creation failed:', error);
    throw error;
  }
};