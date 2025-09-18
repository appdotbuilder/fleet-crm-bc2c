import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, companiesTable, contactsTable, salesOpportunitiesTable } from '../db/schema';
import { type CreateUserInput, type CreateCompanyInput, type CreateContactInput, type CreateSalesOpportunityInput } from '../schema';
import { getSalesOpportunities } from '../handlers/get_sales_opportunities';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'bdm@test.com',
  name: 'Test BDM',
  role: 'BDM'
};

const testUser2: CreateUserInput = {
  email: 'bdm2@test.com',
  name: 'Test BDM 2',
  role: 'BDM'
};

const testCompany = {
  name: 'Test Company',
  industry: 'Technology',
  annual_revenue: '50000.00'
};

const testCompany2 = {
  name: 'Test Company 2',
  industry: 'Manufacturing',
  annual_revenue: '75000.00'
};

const testContact: CreateContactInput = {
  company_id: 1, // Will be set after company creation
  name: 'John Contact',
  email: 'john@test.com',
  is_primary: true
};

const testOpportunity1: CreateSalesOpportunityInput = {
  company_id: 1,
  contact_id: 1,
  title: 'Large Fleet Deal',
  description: 'Opportunity for 100 vehicle fleet',
  value: 50000.00,
  probability: 75,
  stage: 'PROPOSAL'
};

const testOpportunity2: CreateSalesOpportunityInput = {
  company_id: 1,
  contact_id: 1,
  title: 'Small Fleet Deal',
  description: 'Opportunity for 20 vehicle fleet',
  value: 15000.00,
  probability: 50,
  stage: 'QUALIFIED'
};

const testOpportunity3: CreateSalesOpportunityInput = {
  company_id: 2,
  contact_id: null,
  title: 'Enterprise Deal',
  description: 'Large enterprise opportunity',
  value: 100000.00,
  probability: 90,
  stage: 'NEGOTIATION'
};

describe('getSalesOpportunities', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all opportunities when no filters are applied', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user2 = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();

    const company1 = await db.insert(companiesTable)
      .values({
        ...testCompany,
        created_by: user[0].id,
        assigned_bdm: user[0].id
      })
      .returning()
      .execute();

    const company2 = await db.insert(companiesTable)
      .values({
        ...testCompany2,
        created_by: user2[0].id,
        assigned_bdm: user2[0].id
      })
      .returning()
      .execute();

    const contact = await db.insert(contactsTable)
      .values({
        ...testContact,
        company_id: company1[0].id
      })
      .returning()
      .execute();

    // Create opportunities
    await db.insert(salesOpportunitiesTable)
      .values({
        ...testOpportunity1,
        company_id: company1[0].id,
        contact_id: contact[0].id,
        user_id: user[0].id,
        value: testOpportunity1.value!.toString()
      })
      .execute();

    await db.insert(salesOpportunitiesTable)
      .values({
        ...testOpportunity2,
        company_id: company1[0].id,
        contact_id: contact[0].id,
        user_id: user[0].id,
        value: testOpportunity2.value!.toString()
      })
      .execute();

    await db.insert(salesOpportunitiesTable)
      .values({
        ...testOpportunity3,
        company_id: company2[0].id,
        contact_id: null,
        user_id: user2[0].id,
        value: testOpportunity3.value!.toString()
      })
      .execute();

    const result = await getSalesOpportunities({});

    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('Enterprise Deal'); // Most recent first
    expect(result[0].value).toBe(100000.00);
    expect(typeof result[0].value).toBe('number');
    expect(result[0].stage).toBe('NEGOTIATION');
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter by company_id', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user2 = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();

    const company1 = await db.insert(companiesTable)
      .values({
        ...testCompany,
        created_by: user[0].id,
        assigned_bdm: user[0].id
      })
      .returning()
      .execute();

    const company2 = await db.insert(companiesTable)
      .values({
        ...testCompany2,
        created_by: user2[0].id,
        assigned_bdm: user2[0].id
      })
      .returning()
      .execute();

    const contact = await db.insert(contactsTable)
      .values({
        ...testContact,
        company_id: company1[0].id
      })
      .returning()
      .execute();

    // Create opportunities for different companies
    await db.insert(salesOpportunitiesTable)
      .values({
        ...testOpportunity1,
        company_id: company1[0].id,
        contact_id: contact[0].id,
        user_id: user[0].id,
        value: testOpportunity1.value!.toString()
      })
      .execute();

    await db.insert(salesOpportunitiesTable)
      .values({
        ...testOpportunity3,
        company_id: company2[0].id,
        contact_id: null,
        user_id: user2[0].id,
        value: testOpportunity3.value!.toString()
      })
      .execute();

    const result = await getSalesOpportunities({ company_id: company1[0].id });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Large Fleet Deal');
    expect(result[0].company_id).toBe(company1[0].id);
  });

  it('should filter by user_id', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user2 = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();

    const company1 = await db.insert(companiesTable)
      .values({
        ...testCompany,
        created_by: user[0].id,
        assigned_bdm: user[0].id
      })
      .returning()
      .execute();

    const contact = await db.insert(contactsTable)
      .values({
        ...testContact,
        company_id: company1[0].id
      })
      .returning()
      .execute();

    // Create opportunities for different users
    await db.insert(salesOpportunitiesTable)
      .values({
        ...testOpportunity1,
        company_id: company1[0].id,
        contact_id: contact[0].id,
        user_id: user[0].id,
        value: testOpportunity1.value!.toString()
      })
      .execute();

    await db.insert(salesOpportunitiesTable)
      .values({
        ...testOpportunity3,
        company_id: company1[0].id,
        contact_id: contact[0].id,
        user_id: user2[0].id,
        value: testOpportunity3.value!.toString()
      })
      .execute();

    const result = await getSalesOpportunities({ user_id: user2[0].id });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Enterprise Deal');
    expect(result[0].user_id).toBe(user2[0].id);
  });

  it('should filter by stage', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const company = await db.insert(companiesTable)
      .values({
        ...testCompany,
        created_by: user[0].id,
        assigned_bdm: user[0].id
      })
      .returning()
      .execute();

    const contact = await db.insert(contactsTable)
      .values({
        ...testContact,
        company_id: company[0].id
      })
      .returning()
      .execute();

    // Create opportunities with different stages
    await db.insert(salesOpportunitiesTable)
      .values({
        ...testOpportunity1,
        company_id: company[0].id,
        contact_id: contact[0].id,
        user_id: user[0].id,
        value: testOpportunity1.value!.toString(),
        stage: 'PROPOSAL'
      })
      .execute();

    await db.insert(salesOpportunitiesTable)
      .values({
        ...testOpportunity2,
        company_id: company[0].id,
        contact_id: contact[0].id,
        user_id: user[0].id,
        value: testOpportunity2.value!.toString(),
        stage: 'QUALIFIED'
      })
      .execute();

    const result = await getSalesOpportunities({ stage: 'QUALIFIED' });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Small Fleet Deal');
    expect(result[0].stage).toBe('QUALIFIED');
  });

  it('should apply pagination with limit and offset', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const company = await db.insert(companiesTable)
      .values({
        ...testCompany,
        created_by: user[0].id,
        assigned_bdm: user[0].id
      })
      .returning()
      .execute();

    const contact = await db.insert(contactsTable)
      .values({
        ...testContact,
        company_id: company[0].id
      })
      .returning()
      .execute();

    // Create multiple opportunities
    for (let i = 1; i <= 5; i++) {
      await db.insert(salesOpportunitiesTable)
        .values({
          company_id: company[0].id,
          contact_id: contact[0].id,
          user_id: user[0].id,
          title: `Opportunity ${i}`,
          probability: 50,
          stage: 'LEAD',
          value: (i * 1000).toString()
        })
        .execute();
    }

    // Test limit
    const limitedResult = await getSalesOpportunities({ limit: 3 });
    expect(limitedResult).toHaveLength(3);

    // Test offset
    const offsetResult = await getSalesOpportunities({ limit: 2, offset: 2 });
    expect(offsetResult).toHaveLength(2);
    expect(offsetResult[0].title).toBe('Opportunity 3'); // Third item (with desc ordering)
  });

  it('should combine multiple filters', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user2 = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();

    const company1 = await db.insert(companiesTable)
      .values({
        ...testCompany,
        created_by: user[0].id,
        assigned_bdm: user[0].id
      })
      .returning()
      .execute();

    const company2 = await db.insert(companiesTable)
      .values({
        ...testCompany2,
        created_by: user2[0].id,
        assigned_bdm: user2[0].id
      })
      .returning()
      .execute();

    const contact = await db.insert(contactsTable)
      .values({
        ...testContact,
        company_id: company1[0].id
      })
      .returning()
      .execute();

    // Create opportunities with different combinations
    await db.insert(salesOpportunitiesTable)
      .values({
        ...testOpportunity1,
        company_id: company1[0].id,
        contact_id: contact[0].id,
        user_id: user[0].id,
        value: testOpportunity1.value!.toString(),
        stage: 'PROPOSAL'
      })
      .execute();

    await db.insert(salesOpportunitiesTable)
      .values({
        ...testOpportunity2,
        company_id: company1[0].id,
        contact_id: contact[0].id,
        user_id: user[0].id,
        value: testOpportunity2.value!.toString(),
        stage: 'QUALIFIED'
      })
      .execute();

    await db.insert(salesOpportunitiesTable)
      .values({
        ...testOpportunity3,
        company_id: company2[0].id,
        contact_id: null,
        user_id: user2[0].id,
        value: testOpportunity3.value!.toString(),
        stage: 'PROPOSAL'
      })
      .execute();

    // Filter by company and stage
    const result = await getSalesOpportunities({ 
      company_id: company1[0].id, 
      stage: 'PROPOSAL' 
    });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Large Fleet Deal');
    expect(result[0].company_id).toBe(company1[0].id);
    expect(result[0].stage).toBe('PROPOSAL');
  });

  it('should return empty array when no opportunities match filters', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const company = await db.insert(companiesTable)
      .values({
        ...testCompany,
        created_by: user[0].id,
        assigned_bdm: user[0].id
      })
      .returning()
      .execute();

    // Create one opportunity
    await db.insert(salesOpportunitiesTable)
      .values({
        ...testOpportunity1,
        company_id: company[0].id,
        contact_id: null,
        user_id: user[0].id,
        value: testOpportunity1.value!.toString()
      })
      .execute();

    // Filter by non-existent company
    const result = await getSalesOpportunities({ company_id: 999 });

    expect(result).toHaveLength(0);
  });

  it('should handle opportunities with null values correctly', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const company = await db.insert(companiesTable)
      .values({
        ...testCompany,
        created_by: user[0].id,
        assigned_bdm: user[0].id
      })
      .returning()
      .execute();

    // Create opportunity with null value
    await db.insert(salesOpportunitiesTable)
      .values({
        company_id: company[0].id,
        contact_id: null,
        user_id: user[0].id,
        title: 'No Value Opportunity',
        probability: 25,
        stage: 'LEAD',
        value: null,
        description: null
      })
      .execute();

    const result = await getSalesOpportunities({});

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('No Value Opportunity');
    expect(result[0].value).toBeNull();
    expect(result[0].description).toBeNull();
    expect(result[0].contact_id).toBeNull();
  });
});