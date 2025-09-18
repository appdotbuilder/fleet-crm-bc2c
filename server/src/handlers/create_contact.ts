import { db } from '../db';
import { contactsTable, companiesTable } from '../db/schema';
import { type CreateContactInput, type Contact } from '../schema';
import { eq } from 'drizzle-orm';

export const createContact = async (input: CreateContactInput): Promise<Contact> => {
  try {
    // Validate that the company exists
    const company = await db.select()
      .from(companiesTable)
      .where(eq(companiesTable.id, input.company_id))
      .limit(1)
      .execute();

    if (company.length === 0) {
      throw new Error(`Company with id ${input.company_id} not found`);
    }

    // If is_primary is true, unset any existing primary contact for the company
    if (input.is_primary === true) {
      await db.update(contactsTable)
        .set({ is_primary: false })
        .where(eq(contactsTable.company_id, input.company_id))
        .execute();
    }

    // Insert new contact record
    const result = await db.insert(contactsTable)
      .values({
        company_id: input.company_id,
        name: input.name,
        position: input.position || null,
        phone: input.phone || null,
        email: input.email || null,
        is_primary: input.is_primary || false,
        notes: input.notes || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Contact creation failed:', error);
    throw error;
  }
};