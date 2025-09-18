import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, companiesTable, contactsTable } from '../db/schema';
import { type CreateContactInput } from '../schema';
import { createContact } from '../handlers/create_contact';
import { eq } from 'drizzle-orm';

describe('createContact', () => {
  let testUser: { id: number };
  let testCompany: { id: number };

  beforeEach(async () => {
    await createDB();
    
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'BDM'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test company
    const companyResult = await db.insert(companiesTable)
      .values({
        name: 'Test Company',
        created_by: testUser.id,
        assigned_bdm: testUser.id
      })
      .returning()
      .execute();
    testCompany = companyResult[0];
  });

  afterEach(resetDB);

  const testInput: CreateContactInput = {
    company_id: 0, // Will be set in tests
    name: 'John Doe',
    position: 'Manager',
    phone: '+1234567890',
    email: 'john.doe@example.com',
    is_primary: false,
    notes: 'Test contact notes'
  };

  it('should create a contact successfully', async () => {
    const input = { ...testInput, company_id: testCompany.id };
    const result = await createContact(input);

    // Verify returned data
    expect(result.id).toBeDefined();
    expect(result.company_id).toBe(testCompany.id);
    expect(result.name).toBe('John Doe');
    expect(result.position).toBe('Manager');
    expect(result.phone).toBe('+1234567890');
    expect(result.email).toBe('john.doe@example.com');
    expect(result.is_primary).toBe(false);
    expect(result.notes).toBe('Test contact notes');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save contact to database', async () => {
    const input = { ...testInput, company_id: testCompany.id };
    const result = await createContact(input);

    // Verify data was saved to database
    const contacts = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, result.id))
      .execute();

    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe('John Doe');
    expect(contacts[0].company_id).toBe(testCompany.id);
    expect(contacts[0].position).toBe('Manager');
    expect(contacts[0].phone).toBe('+1234567890');
    expect(contacts[0].email).toBe('john.doe@example.com');
    expect(contacts[0].is_primary).toBe(false);
    expect(contacts[0].notes).toBe('Test contact notes');
  });

  it('should handle optional fields correctly', async () => {
    const minimalInput: CreateContactInput = {
      company_id: testCompany.id,
      name: 'Jane Smith'
    };

    const result = await createContact(minimalInput);

    expect(result.name).toBe('Jane Smith');
    expect(result.position).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.is_primary).toBe(false);
    expect(result.notes).toBeNull();
  });

  it('should set is_primary to true when specified', async () => {
    const input = { 
      ...testInput, 
      company_id: testCompany.id,
      is_primary: true 
    };

    const result = await createContact(input);

    expect(result.is_primary).toBe(true);

    // Verify in database
    const contact = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, result.id))
      .execute();

    expect(contact[0].is_primary).toBe(true);
  });

  it('should unset existing primary contact when creating new primary contact', async () => {
    // Create first primary contact
    const firstInput = { 
      ...testInput, 
      company_id: testCompany.id,
      name: 'First Contact',
      is_primary: true 
    };
    const firstContact = await createContact(firstInput);

    // Verify first contact is primary
    expect(firstContact.is_primary).toBe(true);

    // Create second primary contact
    const secondInput = { 
      ...testInput, 
      company_id: testCompany.id,
      name: 'Second Contact',
      is_primary: true 
    };
    const secondContact = await createContact(secondInput);

    // Verify second contact is primary
    expect(secondContact.is_primary).toBe(true);

    // Verify first contact is no longer primary
    const contacts = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.company_id, testCompany.id))
      .execute();

    const firstUpdated = contacts.find(c => c.id === firstContact.id);
    const secondUpdated = contacts.find(c => c.id === secondContact.id);

    expect(firstUpdated?.is_primary).toBe(false);
    expect(secondUpdated?.is_primary).toBe(true);
  });

  it('should not affect other company contacts when setting primary', async () => {
    // Create another company
    const secondCompanyResult = await db.insert(companiesTable)
      .values({
        name: 'Second Company',
        created_by: testUser.id,
        assigned_bdm: testUser.id
      })
      .returning()
      .execute();
    const secondCompany = secondCompanyResult[0];

    // Create primary contact for first company
    const firstCompanyContact = await createContact({
      ...testInput,
      company_id: testCompany.id,
      name: 'Contact 1',
      is_primary: true
    });

    // Create primary contact for second company
    const secondCompanyContact = await createContact({
      ...testInput,
      company_id: secondCompany.id,
      name: 'Contact 2',
      is_primary: true
    });

    // Both should remain primary since they're for different companies
    const allContacts = await db.select()
      .from(contactsTable)
      .execute();

    const contact1 = allContacts.find(c => c.id === firstCompanyContact.id);
    const contact2 = allContacts.find(c => c.id === secondCompanyContact.id);

    expect(contact1?.is_primary).toBe(true);
    expect(contact2?.is_primary).toBe(true);
  });

  it('should throw error when company does not exist', async () => {
    const input = { ...testInput, company_id: 99999 };

    await expect(createContact(input)).rejects.toThrow(/Company with id 99999 not found/i);
  });

  it('should handle null email gracefully', async () => {
    const input: CreateContactInput = {
      company_id: testCompany.id,
      name: 'No Email Contact',
      email: null
    };

    const result = await createContact(input);

    expect(result.email).toBeNull();
  });
});