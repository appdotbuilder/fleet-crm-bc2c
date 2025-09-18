import { type CreateContactInput, type Contact } from '../schema';

export async function createContact(input: CreateContactInput): Promise<Contact> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new contact for a company.
    // Should validate that the company exists before creating the contact.
    // If is_primary is true, should ensure no other contact for the company is marked as primary.
    return Promise.resolve({
        id: 0, // Placeholder ID
        company_id: input.company_id,
        name: input.name,
        position: input.position || null,
        phone: input.phone || null,
        email: input.email || null,
        is_primary: input.is_primary || false,
        notes: input.notes || null,
        created_at: new Date(),
        updated_at: new Date()
    } as Contact);
}