import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { companiesTable, usersTable } from '../db/schema';
import { type CreateCompanyInput } from '../schema';
import { createCompany } from '../handlers/create_company';
import { eq } from 'drizzle-orm';

describe('createCompany', () => {
  let testUser: { id: number };
  let testBdmUser: { id: number };

  beforeEach(async () => {
    await createDB();

    // Create test users for foreign key relationships
    const userResults = await db.insert(usersTable)
      .values([
        { email: 'creator@test.com', name: 'Creator User', role: 'MANAGEMENT' },
        { email: 'bdm@test.com', name: 'BDM User', role: 'BDM' }
      ])
      .returning()
      .execute();

    testUser = userResults[0];
    testBdmUser = userResults[1];
  });

  afterEach(resetDB);

  const baseInput: CreateCompanyInput = {
    name: 'Test Company',
    industry: 'Technology',
    address: '123 Test St',
    phone: '+1234567890',
    email: 'contact@testcompany.com',
    website: 'https://testcompany.com',
    fleet_size: 50,
    annual_revenue: 1000000.50,
    notes: 'Test company notes',
    assigned_bdm: 0 // Will be set in tests
  };

  it('should create a company with all fields', async () => {
    const input = { ...baseInput, assigned_bdm: testBdmUser.id };
    const result = await createCompany(input, testUser.id);

    // Basic field validation
    expect(result.name).toEqual('Test Company');
    expect(result.industry).toEqual('Technology');
    expect(result.address).toEqual('123 Test St');
    expect(result.phone).toEqual('+1234567890');
    expect(result.email).toEqual('contact@testcompany.com');
    expect(result.website).toEqual('https://testcompany.com');
    expect(result.fleet_size).toEqual(50);
    expect(result.annual_revenue).toEqual(1000000.50);
    expect(typeof result.annual_revenue).toEqual('number');
    expect(result.notes).toEqual('Test company notes');
    expect(result.created_by).toEqual(testUser.id);
    expect(result.assigned_bdm).toEqual(testBdmUser.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a company with minimal required fields', async () => {
    const minimalInput: CreateCompanyInput = {
      name: 'Minimal Company',
      assigned_bdm: testBdmUser.id
    };

    const result = await createCompany(minimalInput, testUser.id);

    expect(result.name).toEqual('Minimal Company');
    expect(result.industry).toBeNull();
    expect(result.address).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.website).toBeNull();
    expect(result.fleet_size).toBeNull();
    expect(result.annual_revenue).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.created_by).toEqual(testUser.id);
    expect(result.assigned_bdm).toEqual(testBdmUser.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save company to database correctly', async () => {
    const input = { ...baseInput, assigned_bdm: testBdmUser.id };
    const result = await createCompany(input, testUser.id);

    // Query using proper drizzle syntax
    const companies = await db.select()
      .from(companiesTable)
      .where(eq(companiesTable.id, result.id))
      .execute();

    expect(companies).toHaveLength(1);
    const savedCompany = companies[0];
    
    expect(savedCompany.name).toEqual('Test Company');
    expect(savedCompany.industry).toEqual('Technology');
    expect(savedCompany.address).toEqual('123 Test St');
    expect(savedCompany.phone).toEqual('+1234567890');
    expect(savedCompany.email).toEqual('contact@testcompany.com');
    expect(savedCompany.website).toEqual('https://testcompany.com');
    expect(savedCompany.fleet_size).toEqual(50);
    expect(parseFloat(savedCompany.annual_revenue!)).toEqual(1000000.50); // Stored as string, convert back
    expect(savedCompany.notes).toEqual('Test company notes');
    expect(savedCompany.created_by).toEqual(testUser.id);
    expect(savedCompany.assigned_bdm).toEqual(testBdmUser.id);
    expect(savedCompany.created_at).toBeInstanceOf(Date);
    expect(savedCompany.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null values for optional fields', async () => {
    const inputWithNulls: CreateCompanyInput = {
      name: 'Company with Nulls',
      industry: null,
      address: null,
      phone: null,
      email: null,
      website: null,
      fleet_size: null,
      annual_revenue: null,
      notes: null,
      assigned_bdm: testBdmUser.id
    };

    const result = await createCompany(inputWithNulls, testUser.id);

    expect(result.name).toEqual('Company with Nulls');
    expect(result.industry).toBeNull();
    expect(result.address).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.website).toBeNull();
    expect(result.fleet_size).toBeNull();
    expect(result.annual_revenue).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.created_by).toEqual(testUser.id);
    expect(result.assigned_bdm).toEqual(testBdmUser.id);
  });

  it('should handle zero annual revenue correctly', async () => {
    const input = { 
      ...baseInput, 
      annual_revenue: 0,
      assigned_bdm: testBdmUser.id 
    };
    const result = await createCompany(input, testUser.id);

    expect(result.annual_revenue).toEqual(0);
    expect(typeof result.annual_revenue).toEqual('number');

    // Verify in database
    const companies = await db.select()
      .from(companiesTable)
      .where(eq(companiesTable.id, result.id))
      .execute();

    expect(parseFloat(companies[0].annual_revenue!)).toEqual(0);
  });

  it('should throw error for invalid foreign key - assigned_bdm', async () => {
    const input = { ...baseInput, assigned_bdm: 999999 }; // Non-existent user ID

    await expect(createCompany(input, testUser.id)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should throw error for invalid foreign key - created_by', async () => {
    const input = { ...baseInput, assigned_bdm: testBdmUser.id };

    await expect(createCompany(input, 999999)).rejects.toThrow(/violates foreign key constraint/i);
  });
});