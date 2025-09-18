import { db } from '../db';
import { contactsTable } from '../db/schema';
import { type UpdateContactInput, type Contact } from '../schema';
import { eq, and, ne } from 'drizzle-orm';

export const updateContact = async (input: UpdateContactInput): Promise<Contact> => {
  try {
    // First, verify the contact exists and get its current data
    const existingContact = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, input.id))
      .execute();

    if (existingContact.length === 0) {
      throw new Error(`Contact with id ${input.id} not found`);
    }

    const currentContact = existingContact[0];

    // If setting is_primary to true, unset all other primary contacts for this company
    if (input.is_primary === true) {
      await db.update(contactsTable)
        .set({ 
          is_primary: false,
          updated_at: new Date()
        })
        .where(and(
          eq(contactsTable.company_id, currentContact.company_id),
          ne(contactsTable.id, input.id)
        ))
        .execute();
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof contactsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.position !== undefined) updateData.position = input.position;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.is_primary !== undefined) updateData.is_primary = input.is_primary;
    if (input.notes !== undefined) updateData.notes = input.notes;

    // Update the contact
    const result = await db.update(contactsTable)
      .set(updateData)
      .where(eq(contactsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Contact update failed:', error);
    throw error;
  }
};