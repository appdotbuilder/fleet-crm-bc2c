import { db } from '../db';
import { contactsTable } from '../db/schema';
import { type Contact } from '../schema';
import { eq } from 'drizzle-orm';

export async function getContacts(companyId?: number): Promise<Contact[]> {
  try {
    // Build query with proper conditional filtering
    const results = companyId !== undefined 
      ? await db.select()
          .from(contactsTable)
          .where(eq(contactsTable.company_id, companyId))
          .execute()
      : await db.select()
          .from(contactsTable)
          .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    throw error;
  }
}