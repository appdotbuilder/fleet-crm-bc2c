import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, companiesTable, contactsTable } from '../db/schema';
import { getContacts } from '../handlers/get_contacts';

describe('getContacts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCompanyId1: number;
  let testCompanyId2: number;

  beforeEach(async () => {
    // Create a test user first (required for company creation)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'BDM'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test companies
    const companyResults = await db.insert(companiesTable)
      .values([
        {
          name: 'Test Company 1',
          created_by: testUserId,
          assigned_bdm: testUserId
        },
        {
          name: 'Test Company 2',
          created_by: testUserId,
          assigned_bdm: testUserId
        }
      ])
      .returning()
      .execute();
    
    testCompanyId1 = companyResults[0].id;
    testCompanyId2 = companyResults[1].id;
  });

  it('should return all contacts when no companyId is provided', async () => {
    // Create test contacts for both companies
    await db.insert(contactsTable)
      .values([
        {
          company_id: testCompanyId1,
          name: 'John Doe',
          email: 'john@company1.com',
          position: 'Manager',
          is_primary: true
        },
        {
          company_id: testCompanyId1,
          name: 'Jane Smith',
          email: 'jane@company1.com',
          position: 'Director',
          is_primary: false
        },
        {
          company_id: testCompanyId2,
          name: 'Bob Wilson',
          email: 'bob@company2.com',
          position: 'CEO',
          is_primary: true
        }
      ])
      .execute();

    const results = await getContacts();

    expect(results).toHaveLength(3);
    
    // Verify all contacts are returned
    const names = results.map(contact => contact.name).sort();
    expect(names).toEqual(['Bob Wilson', 'Jane Smith', 'John Doe']);

    // Verify contact data structure
    const johnContact = results.find(c => c.name === 'John Doe');
    expect(johnContact).toBeDefined();
    expect(johnContact!.email).toBe('john@company1.com');
    expect(johnContact!.position).toBe('Manager');
    expect(johnContact!.is_primary).toBe(true);
    expect(johnContact!.company_id).toBe(testCompanyId1);
    expect(johnContact!.id).toBeDefined();
    expect(johnContact!.created_at).toBeInstanceOf(Date);
  });

  it('should return only contacts for specified company', async () => {
    // Create test contacts for both companies
    await db.insert(contactsTable)
      .values([
        {
          company_id: testCompanyId1,
          name: 'John Doe',
          email: 'john@company1.com',
          is_primary: true
        },
        {
          company_id: testCompanyId1,
          name: 'Jane Smith',
          email: 'jane@company1.com',
          is_primary: false
        },
        {
          company_id: testCompanyId2,
          name: 'Bob Wilson',
          email: 'bob@company2.com',
          is_primary: true
        }
      ])
      .execute();

    const results = await getContacts(testCompanyId1);

    expect(results).toHaveLength(2);
    
    // Verify only company 1 contacts are returned
    results.forEach(contact => {
      expect(contact.company_id).toBe(testCompanyId1);
    });

    const names = results.map(contact => contact.name).sort();
    expect(names).toEqual(['Jane Smith', 'John Doe']);
  });

  it('should return empty array when company has no contacts', async () => {
    // Create contacts for company 1 only
    await db.insert(contactsTable)
      .values({
        company_id: testCompanyId1,
        name: 'John Doe',
        email: 'john@company1.com',
        is_primary: true
      })
      .execute();

    const results = await getContacts(testCompanyId2);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should return empty array when no contacts exist', async () => {
    const results = await getContacts();

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should handle contacts with nullable fields correctly', async () => {
    // Create contact with minimal required fields only
    await db.insert(contactsTable)
      .values({
        company_id: testCompanyId1,
        name: 'Minimal Contact',
        is_primary: false
        // position, phone, email, notes are null/undefined
      })
      .execute();

    const results = await getContacts(testCompanyId1);

    expect(results).toHaveLength(1);
    const contact = results[0];
    expect(contact.name).toBe('Minimal Contact');
    expect(contact.position).toBeNull();
    expect(contact.phone).toBeNull();
    expect(contact.email).toBeNull();
    expect(contact.notes).toBeNull();
    expect(contact.is_primary).toBe(false);
  });

  it('should return contacts with all fields populated correctly', async () => {
    await db.insert(contactsTable)
      .values({
        company_id: testCompanyId1,
        name: 'Complete Contact',
        position: 'Senior Manager',
        phone: '+1-555-0123',
        email: 'complete@company.com',
        is_primary: true,
        notes: 'Key decision maker'
      })
      .execute();

    const results = await getContacts(testCompanyId1);

    expect(results).toHaveLength(1);
    const contact = results[0];
    expect(contact.name).toBe('Complete Contact');
    expect(contact.position).toBe('Senior Manager');
    expect(contact.phone).toBe('+1-555-0123');
    expect(contact.email).toBe('complete@company.com');
    expect(contact.is_primary).toBe(true);
    expect(contact.notes).toBe('Key decision maker');
    expect(contact.company_id).toBe(testCompanyId1);
    expect(contact.created_at).toBeInstanceOf(Date);
    expect(contact.updated_at).toBeInstanceOf(Date);
  });
});