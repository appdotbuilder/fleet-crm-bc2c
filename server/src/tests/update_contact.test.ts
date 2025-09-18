import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, companiesTable, contactsTable } from '../db/schema';
import { type UpdateContactInput, type CreateUserInput, type CreateCompanyInput, type CreateContactInput } from '../schema';
import { updateContact } from '../handlers/update_contact';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'BDM'
};

const testCompany: CreateCompanyInput = {
  name: 'Test Company',
  assigned_bdm: 1
};

const testContact: CreateContactInput = {
  company_id: 1,
  name: 'John Doe',
  position: 'Manager',
  phone: '123-456-7890',
  email: 'john@example.com',
  is_primary: false,
  notes: 'Initial notes'
};

describe('updateContact', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Setup helper to create prerequisite data
  const setupTestData = async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create company
    const companyResult = await db.insert(companiesTable)
      .values({
        name: testCompany.name,
        created_by: userResult[0].id,
        assigned_bdm: userResult[0].id
      })
      .returning()
      .execute();

    // Create contact
    const contactResult = await db.insert(contactsTable)
      .values({
        ...testContact,
        company_id: companyResult[0].id
      })
      .returning()
      .execute();

    return {
      user: userResult[0],
      company: companyResult[0],
      contact: contactResult[0]
    };
  };

  it('should update contact basic fields', async () => {
    const { contact } = await setupTestData();

    const updateInput: UpdateContactInput = {
      id: contact.id,
      name: 'Jane Doe Updated',
      position: 'Senior Manager',
      phone: '987-654-3210',
      email: 'jane.updated@example.com',
      notes: 'Updated notes'
    };

    const result = await updateContact(updateInput);

    expect(result.id).toEqual(contact.id);
    expect(result.name).toEqual('Jane Doe Updated');
    expect(result.position).toEqual('Senior Manager');
    expect(result.phone).toEqual('987-654-3210');
    expect(result.email).toEqual('jane.updated@example.com');
    expect(result.notes).toEqual('Updated notes');
    expect(result.is_primary).toEqual(false); // Unchanged
    expect(result.company_id).toEqual(contact.company_id); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > contact.updated_at).toBe(true);
  });

  it('should update only provided fields', async () => {
    const { contact } = await setupTestData();

    const updateInput: UpdateContactInput = {
      id: contact.id,
      name: 'Updated Name Only'
    };

    const result = await updateContact(updateInput);

    expect(result.name).toEqual('Updated Name Only');
    expect(result.position).toEqual(contact.position); // Unchanged
    expect(result.phone).toEqual(contact.phone); // Unchanged
    expect(result.email).toEqual(contact.email); // Unchanged
    expect(result.is_primary).toEqual(contact.is_primary); // Unchanged
    expect(result.notes).toEqual(contact.notes); // Unchanged
  });

  it('should handle null values correctly', async () => {
    const { contact } = await setupTestData();

    const updateInput: UpdateContactInput = {
      id: contact.id,
      position: null,
      phone: null,
      email: null,
      notes: null
    };

    const result = await updateContact(updateInput);

    expect(result.position).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.name).toEqual(contact.name); // Unchanged
  });

  it('should set is_primary to true and unset other primary contacts', async () => {
    const { company } = await setupTestData();

    // Create a second contact that is currently primary
    const primaryContact = await db.insert(contactsTable)
      .values({
        company_id: company.id,
        name: 'Primary Contact',
        is_primary: true
      })
      .returning()
      .execute();

    // Create a third contact
    const thirdContact = await db.insert(contactsTable)
      .values({
        company_id: company.id,
        name: 'Third Contact',
        is_primary: false
      })
      .returning()
      .execute();

    // Get the original contact
    const originalContact = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.company_id, company.id))
      .execute();

    const targetContact = originalContact.find(c => c.name === 'John Doe');

    // Update the original contact to be primary
    const updateInput: UpdateContactInput = {
      id: targetContact!.id,
      is_primary: true
    };

    const result = await updateContact(updateInput);

    // Verify the updated contact is now primary
    expect(result.is_primary).toBe(true);

    // Verify other contacts are no longer primary
    const allContacts = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.company_id, company.id))
      .execute();

    const otherContacts = allContacts.filter(c => c.id !== result.id);
    otherContacts.forEach(contact => {
      expect(contact.is_primary).toBe(false);
    });

    expect(allContacts.filter(c => c.is_primary).length).toBe(1);
  });

  it('should save updated contact to database', async () => {
    const { contact } = await setupTestData();

    const updateInput: UpdateContactInput = {
      id: contact.id,
      name: 'Database Test Contact',
      email: 'database@test.com'
    };

    await updateContact(updateInput);

    // Verify in database
    const contacts = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, contact.id))
      .execute();

    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toEqual('Database Test Contact');
    expect(contacts[0].email).toEqual('database@test.com');
    expect(contacts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when contact does not exist', async () => {
    await setupTestData();

    const updateInput: UpdateContactInput = {
      id: 99999, // Non-existent ID
      name: 'Non-existent Contact'
    };

    expect(updateContact(updateInput)).rejects.toThrow(/contact with id 99999 not found/i);
  });

  it('should handle setting is_primary to false without affecting other contacts', async () => {
    const { company } = await setupTestData();

    // Create a primary contact
    const primaryContact = await db.insert(contactsTable)
      .values({
        company_id: company.id,
        name: 'Primary Contact',
        is_primary: true
      })
      .returning()
      .execute();

    // Update to set is_primary to false
    const updateInput: UpdateContactInput = {
      id: primaryContact[0].id,
      is_primary: false
    };

    const result = await updateContact(updateInput);

    expect(result.is_primary).toBe(false);

    // Verify no other contacts were affected
    const allContacts = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.company_id, company.id))
      .execute();

    expect(allContacts.filter(c => c.is_primary).length).toBe(0);
  });
});