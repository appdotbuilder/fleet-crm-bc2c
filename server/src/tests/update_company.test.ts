import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { companiesTable, usersTable } from '../db/schema';
import { type UpdateCompanyInput } from '../schema';
import { updateCompany } from '../handlers/update_company';
import { eq } from 'drizzle-orm';

describe('updateCompany', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create test user
  const createTestUser = async () => {
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'BDM'
      })
      .returning()
      .execute();
    return userResult[0];
  };

  // Helper to create test company
  const createTestCompany = async (userId: number) => {
    const companyResult = await db.insert(companiesTable)
      .values({
        name: 'Original Company',
        industry: 'Tech',
        address: '123 Main St',
        phone: '123-456-7890',
        email: 'original@company.com',
        website: 'https://original.com',
        fleet_size: 50,
        annual_revenue: '1000000.50',
        notes: 'Original notes',
        created_by: userId,
        assigned_bdm: userId
      })
      .returning()
      .execute();
    
    return {
      ...companyResult[0],
      annual_revenue: parseFloat(companyResult[0].annual_revenue || '0')
    };
  };

  it('should update company with all fields', async () => {
    const user = await createTestUser();
    const company = await createTestCompany(user.id);

    const updateInput: UpdateCompanyInput = {
      id: company.id,
      name: 'Updated Company Name',
      industry: 'Manufacturing',
      address: '456 New St',
      phone: '987-654-3210',
      email: 'updated@company.com',
      website: 'https://updated.com',
      fleet_size: 75,
      annual_revenue: 2500000.75,
      notes: 'Updated notes',
      assigned_bdm: user.id
    };

    const result = await updateCompany(updateInput);

    // Verify all fields are updated
    expect(result.id).toEqual(company.id);
    expect(result.name).toEqual('Updated Company Name');
    expect(result.industry).toEqual('Manufacturing');
    expect(result.address).toEqual('456 New St');
    expect(result.phone).toEqual('987-654-3210');
    expect(result.email).toEqual('updated@company.com');
    expect(result.website).toEqual('https://updated.com');
    expect(result.fleet_size).toEqual(75);
    expect(result.annual_revenue).toEqual(2500000.75);
    expect(typeof result.annual_revenue).toEqual('number');
    expect(result.notes).toEqual('Updated notes');
    expect(result.assigned_bdm).toEqual(user.id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(company.updated_at.getTime());
  });

  it('should update company with partial fields only', async () => {
    const user = await createTestUser();
    const company = await createTestCompany(user.id);

    const updateInput: UpdateCompanyInput = {
      id: company.id,
      name: 'Partially Updated',
      annual_revenue: 1500000.25
    };

    const result = await updateCompany(updateInput);

    // Verify only specified fields are updated
    expect(result.name).toEqual('Partially Updated');
    expect(result.annual_revenue).toEqual(1500000.25);
    expect(typeof result.annual_revenue).toEqual('number');
    
    // Verify other fields remain unchanged
    expect(result.industry).toEqual('Tech');
    expect(result.address).toEqual('123 Main St');
    expect(result.phone).toEqual('123-456-7890');
    expect(result.email).toEqual('original@company.com');
    expect(result.website).toEqual('https://original.com');
    expect(result.fleet_size).toEqual(50);
    expect(result.notes).toEqual('Original notes');
    expect(result.assigned_bdm).toEqual(user.id);
  });

  it('should handle nullable fields being set to null', async () => {
    const user = await createTestUser();
    const company = await createTestCompany(user.id);

    const updateInput: UpdateCompanyInput = {
      id: company.id,
      industry: null,
      address: null,
      phone: null,
      email: null,
      website: null,
      fleet_size: null,
      annual_revenue: null,
      notes: null
    };

    const result = await updateCompany(updateInput);

    // Verify nullable fields are set to null
    expect(result.industry).toBeNull();
    expect(result.address).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.website).toBeNull();
    expect(result.fleet_size).toBeNull();
    expect(result.annual_revenue).toBeNull();
    expect(result.notes).toBeNull();
    
    // Required field should remain unchanged
    expect(result.name).toEqual('Original Company');
  });

  it('should save updated company to database', async () => {
    const user = await createTestUser();
    const company = await createTestCompany(user.id);

    const updateInput: UpdateCompanyInput = {
      id: company.id,
      name: 'Database Updated',
      annual_revenue: 3000000.99
    };

    await updateCompany(updateInput);

    // Verify changes are persisted in database
    const dbCompany = await db.select()
      .from(companiesTable)
      .where(eq(companiesTable.id, company.id))
      .execute();

    expect(dbCompany).toHaveLength(1);
    expect(dbCompany[0].name).toEqual('Database Updated');
    expect(parseFloat(dbCompany[0].annual_revenue || '0')).toEqual(3000000.99);
    expect(dbCompany[0].updated_at).toBeInstanceOf(Date);
    expect(dbCompany[0].updated_at.getTime()).toBeGreaterThan(company.updated_at.getTime());
  });

  it('should throw error when company does not exist', async () => {
    const updateInput: UpdateCompanyInput = {
      id: 99999,
      name: 'Non-existent Company'
    };

    await expect(updateCompany(updateInput)).rejects.toThrow(/Company with id 99999 not found/i);
  });

  it('should handle updating with same values', async () => {
    const user = await createTestUser();
    const company = await createTestCompany(user.id);

    const updateInput: UpdateCompanyInput = {
      id: company.id,
      name: company.name,
      industry: company.industry,
      annual_revenue: company.annual_revenue
    };

    const result = await updateCompany(updateInput);

    // Values should remain the same
    expect(result.name).toEqual(company.name);
    expect(result.industry).toEqual(company.industry);
    expect(result.annual_revenue).toEqual(company.annual_revenue);
    
    // But updated_at should change
    expect(result.updated_at.getTime()).toBeGreaterThan(company.updated_at.getTime());
  });

  it('should preserve created_by and created_at fields', async () => {
    const user = await createTestUser();
    const company = await createTestCompany(user.id);

    const updateInput: UpdateCompanyInput = {
      id: company.id,
      name: 'Preserve Test'
    };

    const result = await updateCompany(updateInput);

    // These fields should never change during updates
    expect(result.created_by).toEqual(company.created_by);
    expect(result.created_at.getTime()).toEqual(company.created_at.getTime());
  });
});