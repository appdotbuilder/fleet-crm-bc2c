import { db } from '../db';
import { visitsTable, companiesTable, contactsTable } from '../db/schema';
import { type CreateVisitInput, type Visit } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createVisit(input: CreateVisitInput, userId: number): Promise<Visit> {
  try {
    // Validate that the company exists
    const company = await db.select()
      .from(companiesTable)
      .where(eq(companiesTable.id, input.company_id))
      .execute();

    if (company.length === 0) {
      throw new Error('Company not found');
    }

    // Validate contact if provided
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
        throw new Error('Contact not found or does not belong to the specified company');
      }
    }

    // Insert visit record
    const result = await db.insert(visitsTable)
      .values({
        company_id: input.company_id,
        contact_id: input.contact_id || null,
        user_id: userId,
        visit_type: input.visit_type,
        visit_date: input.visit_date,
        duration_minutes: input.duration_minutes || null,
        summary: input.summary,
        objectives: input.objectives || null,
        outcomes: input.outcomes || null,
        next_steps: input.next_steps || null,
        follow_up_date: input.follow_up_date || null,
        location: input.location || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Visit creation failed:', error);
    throw error;
  }
}