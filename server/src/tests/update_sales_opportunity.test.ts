import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, companiesTable, contactsTable, salesOpportunitiesTable } from '../db/schema';
import { type UpdateSalesOpportunityInput, type CreateUserInput, type CreateCompanyInput, type CreateContactInput } from '../schema';
import { updateSalesOpportunity } from '../handlers/update_sales_opportunity';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser: CreateUserInput = {
  email: 'test.user@example.com',
  name: 'Test User',
  role: 'BDM'
};

const testCompanyInput = {
  name: 'Test Company',
  industry: 'Technology',
  assigned_bdm: 1 // Will be set after user creation
};

const testContactInput = {
  company_id: 1, // Will be set after company creation
  name: 'Test Contact',
  position: 'Manager',
  email: 'contact@example.com',
  is_primary: true
};

const testOpportunityInput = {
  company_id: 1, // Will be set after company creation
  contact_id: 1, // Will be set after contact creation
  user_id: 1, // Will be set after user creation
  title: 'Original Opportunity',
  description: 'Original description',
  value: 50000.00,
  probability: 75,
  stage: 'QUALIFIED' as const,
  expected_close_date: new Date('2024-12-31')
};

describe('updateSalesOpportunity', () => {
  let userId: number;
  let companyId: number;
  let contactId: number;
  let opportunityId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test company
    const companyResult = await db.insert(companiesTable)
      .values({
        ...testCompanyInput,
        created_by: userId,
        assigned_bdm: userId
      })
      .returning()
      .execute();
    companyId = companyResult[0].id;

    // Create test contact
    const contactResult = await db.insert(contactsTable)
      .values({
        ...testContactInput,
        company_id: companyId
      })
      .returning()
      .execute();
    contactId = contactResult[0].id;

    // Create test sales opportunity
    const opportunityResult = await db.insert(salesOpportunitiesTable)
      .values({
        ...testOpportunityInput,
        company_id: companyId,
        contact_id: contactId,
        user_id: userId,
        value: testOpportunityInput.value.toString()
      })
      .returning()
      .execute();
    opportunityId = opportunityResult[0].id;
  });

  afterEach(resetDB);

  it('should update basic opportunity fields', async () => {
    const updateInput: UpdateSalesOpportunityInput = {
      id: opportunityId,
      title: 'Updated Opportunity Title',
      description: 'Updated description',
      probability: 85
    };

    const result = await updateSalesOpportunity(updateInput);

    expect(result.id).toEqual(opportunityId);
    expect(result.title).toEqual('Updated Opportunity Title');
    expect(result.description).toEqual('Updated description');
    expect(result.probability).toEqual(85);
    expect(result.stage).toEqual('QUALIFIED'); // Should remain unchanged
    expect(typeof result.value).toEqual('number');
    expect(result.value).toEqual(50000);
  });

  it('should update value field with numeric conversion', async () => {
    const updateInput: UpdateSalesOpportunityInput = {
      id: opportunityId,
      value: 75000.50
    };

    const result = await updateSalesOpportunity(updateInput);

    expect(result.value).toEqual(75000.50);
    expect(typeof result.value).toEqual('number');

    // Verify in database
    const dbResult = await db.select()
      .from(salesOpportunitiesTable)
      .where(eq(salesOpportunitiesTable.id, opportunityId))
      .execute();

    expect(parseFloat(dbResult[0].value!)).toEqual(75000.50);
  });

  it('should update stage without auto-setting close date for non-closed stages', async () => {
    const updateInput: UpdateSalesOpportunityInput = {
      id: opportunityId,
      stage: 'PROPOSAL'
    };

    const result = await updateSalesOpportunity(updateInput);

    expect(result.stage).toEqual('PROPOSAL');
    expect(result.actual_close_date).toBeNull();
  });

  it('should auto-set actual_close_date when updating to CLOSED_WON', async () => {
    const updateInput: UpdateSalesOpportunityInput = {
      id: opportunityId,
      stage: 'CLOSED_WON'
    };

    const result = await updateSalesOpportunity(updateInput);

    expect(result.stage).toEqual('CLOSED_WON');
    expect(result.actual_close_date).toBeInstanceOf(Date);
    expect(result.actual_close_date!.getTime()).toBeCloseTo(Date.now(), -2); // Within 100ms
  });

  it('should auto-set actual_close_date when updating to CLOSED_LOST', async () => {
    const updateInput: UpdateSalesOpportunityInput = {
      id: opportunityId,
      stage: 'CLOSED_LOST'
    };

    const result = await updateSalesOpportunity(updateInput);

    expect(result.stage).toEqual('CLOSED_LOST');
    expect(result.actual_close_date).toBeInstanceOf(Date);
    expect(result.actual_close_date!.getTime()).toBeCloseTo(Date.now(), -2); // Within 100ms
  });

  it('should not override explicitly provided actual_close_date for closed stages', async () => {
    const customCloseDate = new Date('2024-01-15');
    const updateInput: UpdateSalesOpportunityInput = {
      id: opportunityId,
      stage: 'CLOSED_WON',
      actual_close_date: customCloseDate
    };

    const result = await updateSalesOpportunity(updateInput);

    expect(result.stage).toEqual('CLOSED_WON');
    expect(result.actual_close_date).toEqual(customCloseDate);
  });

  it('should handle null values correctly', async () => {
    const updateInput: UpdateSalesOpportunityInput = {
      id: opportunityId,
      description: null,
      value: null,
      expected_close_date: null
    };

    const result = await updateSalesOpportunity(updateInput);

    expect(result.description).toBeNull();
    expect(result.value).toBeNull();
    expect(result.expected_close_date).toBeNull();
  });

  it('should update expected_close_date', async () => {
    const newDate = new Date('2025-06-30');
    const updateInput: UpdateSalesOpportunityInput = {
      id: opportunityId,
      expected_close_date: newDate
    };

    const result = await updateSalesOpportunity(updateInput);

    expect(result.expected_close_date).toEqual(newDate);
  });

  it('should update multiple fields simultaneously', async () => {
    const updateInput: UpdateSalesOpportunityInput = {
      id: opportunityId,
      title: 'Multi-Field Update',
      value: 100000,
      probability: 95,
      stage: 'NEGOTIATION',
      expected_close_date: new Date('2024-03-15')
    };

    const result = await updateSalesOpportunity(updateInput);

    expect(result.title).toEqual('Multi-Field Update');
    expect(result.value).toEqual(100000);
    expect(result.probability).toEqual(95);
    expect(result.stage).toEqual('NEGOTIATION');
    expect(result.expected_close_date).toEqual(new Date('2024-03-15'));
    expect(result.actual_close_date).toBeNull(); // Should remain null for non-closed stage
  });

  it('should persist changes in database', async () => {
    const updateInput: UpdateSalesOpportunityInput = {
      id: opportunityId,
      title: 'Database Persistence Test',
      probability: 90
    };

    await updateSalesOpportunity(updateInput);

    // Verify changes were persisted
    const dbResult = await db.select()
      .from(salesOpportunitiesTable)
      .where(eq(salesOpportunitiesTable.id, opportunityId))
      .execute();

    expect(dbResult).toHaveLength(1);
    expect(dbResult[0].title).toEqual('Database Persistence Test');
    expect(dbResult[0].probability).toEqual(90);
    expect(dbResult[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when opportunity does not exist', async () => {
    const updateInput: UpdateSalesOpportunityInput = {
      id: 99999,
      title: 'Non-existent Opportunity'
    };

    await expect(updateSalesOpportunity(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should update updated_at timestamp', async () => {
    // Get original timestamp
    const originalResult = await db.select()
      .from(salesOpportunitiesTable)
      .where(eq(salesOpportunitiesTable.id, opportunityId))
      .execute();
    const originalTimestamp = originalResult[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateSalesOpportunityInput = {
      id: opportunityId,
      title: 'Timestamp Test'
    };

    const result = await updateSalesOpportunity(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
    expect(result.updated_at.getTime()).toBeCloseTo(Date.now(), -2); // Within 100ms
  });
});