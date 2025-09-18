import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, companiesTable, contactsTable, salesOpportunitiesTable } from '../db/schema';
import { type CreateSalesOpportunityInput } from '../schema';
import { createSalesOpportunity } from '../handlers/create_sales_opportunity';
import { eq } from 'drizzle-orm';

// Test data
let testUser: any;
let testCompany: any;
let testContact: any;
let otherCompany: any;
let otherContact: any;

const validInput: CreateSalesOpportunityInput = {
  company_id: 1, // Will be updated in beforeEach
  contact_id: 1, // Will be updated in beforeEach
  title: 'Fleet Management Software Deal',
  description: 'Opportunity to sell our fleet management solution',
  value: 50000,
  probability: 75,
  stage: 'PROPOSAL',
  expected_close_date: new Date('2024-06-30')
};

describe('createSalesOpportunity', () => {
  beforeEach(async () => {
    await createDB();

    // Create test user
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
        industry: 'Logistics',
        fleet_size: 100,
        annual_revenue: '1000000',
        created_by: testUser.id,
        assigned_bdm: testUser.id
      })
      .returning()
      .execute();
    testCompany = companyResult[0];

    // Create test contact
    const contactResult = await db.insert(contactsTable)
      .values({
        company_id: testCompany.id,
        name: 'John Doe',
        position: 'Fleet Manager',
        email: 'john@testcompany.com',
        is_primary: true
      })
      .returning()
      .execute();
    testContact = contactResult[0];

    // Create another company for validation testing
    const otherCompanyResult = await db.insert(companiesTable)
      .values({
        name: 'Other Company',
        industry: 'Manufacturing',
        created_by: testUser.id,
        assigned_bdm: testUser.id
      })
      .returning()
      .execute();
    otherCompany = otherCompanyResult[0];

    // Create contact for other company
    const otherContactResult = await db.insert(contactsTable)
      .values({
        company_id: otherCompany.id,
        name: 'Jane Smith',
        position: 'Operations Manager',
        email: 'jane@othercompany.com',
        is_primary: true
      })
      .returning()
      .execute();
    otherContact = otherContactResult[0];

    // Update input with actual IDs
    validInput.company_id = testCompany.id;
    validInput.contact_id = testContact.id;
  });

  afterEach(resetDB);

  it('should create a sales opportunity with all fields', async () => {
    const result = await createSalesOpportunity(validInput, testUser.id);

    // Verify returned data
    expect(result.company_id).toEqual(testCompany.id);
    expect(result.contact_id).toEqual(testContact.id);
    expect(result.user_id).toEqual(testUser.id);
    expect(result.title).toEqual('Fleet Management Software Deal');
    expect(result.description).toEqual('Opportunity to sell our fleet management solution');
    expect(result.value).toEqual(50000);
    expect(typeof result.value).toEqual('number');
    expect(result.probability).toEqual(75);
    expect(result.stage).toEqual('PROPOSAL');
    expect(result.expected_close_date).toBeInstanceOf(Date);
    expect(result.actual_close_date).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create opportunity without optional fields', async () => {
    const minimalInput: CreateSalesOpportunityInput = {
      company_id: testCompany.id,
      title: 'Minimal Opportunity',
      probability: 50,
      stage: 'LEAD'
    };

    const result = await createSalesOpportunity(minimalInput, testUser.id);

    expect(result.company_id).toEqual(testCompany.id);
    expect(result.contact_id).toBeNull();
    expect(result.user_id).toEqual(testUser.id);
    expect(result.title).toEqual('Minimal Opportunity');
    expect(result.description).toBeNull();
    expect(result.value).toBeNull();
    expect(result.probability).toEqual(50);
    expect(result.stage).toEqual('LEAD');
    expect(result.expected_close_date).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should create opportunity without contact_id', async () => {
    const inputWithoutContact: CreateSalesOpportunityInput = {
      company_id: testCompany.id,
      title: 'No Contact Opportunity',
      value: 25000,
      probability: 60,
      stage: 'QUALIFIED'
    };

    const result = await createSalesOpportunity(inputWithoutContact, testUser.id);

    expect(result.contact_id).toBeNull();
    expect(result.company_id).toEqual(testCompany.id);
    expect(result.title).toEqual('No Contact Opportunity');
    expect(result.value).toEqual(25000);
  });

  it('should save opportunity to database correctly', async () => {
    const result = await createSalesOpportunity(validInput, testUser.id);

    // Query database to verify data was saved
    const opportunities = await db.select()
      .from(salesOpportunitiesTable)
      .where(eq(salesOpportunitiesTable.id, result.id))
      .execute();

    expect(opportunities).toHaveLength(1);
    const dbOpportunity = opportunities[0];
    expect(dbOpportunity.company_id).toEqual(testCompany.id);
    expect(dbOpportunity.contact_id).toEqual(testContact.id);
    expect(dbOpportunity.user_id).toEqual(testUser.id);
    expect(dbOpportunity.title).toEqual('Fleet Management Software Deal');
    expect(parseFloat(dbOpportunity.value!)).toEqual(50000); // Numeric conversion
    expect(dbOpportunity.probability).toEqual(75);
    expect(dbOpportunity.stage).toEqual('PROPOSAL');
  });

  it('should handle zero value correctly', async () => {
    const zeroValueInput: CreateSalesOpportunityInput = {
      company_id: testCompany.id,
      title: 'Zero Value Opportunity',
      value: 0,
      probability: 25,
      stage: 'LEAD'
    };

    const result = await createSalesOpportunity(zeroValueInput, testUser.id);

    expect(result.value).toEqual(0);
    expect(typeof result.value).toEqual('number');
  });

  it('should throw error when company does not exist', async () => {
    const invalidInput: CreateSalesOpportunityInput = {
      company_id: 99999, // Non-existent company
      title: 'Invalid Opportunity',
      probability: 50,
      stage: 'LEAD'
    };

    await expect(
      createSalesOpportunity(invalidInput, testUser.id)
    ).rejects.toThrow(/company with id 99999 not found/i);
  });

  it('should throw error when contact does not exist', async () => {
    const invalidContactInput: CreateSalesOpportunityInput = {
      company_id: testCompany.id,
      contact_id: 99999, // Non-existent contact
      title: 'Invalid Contact Opportunity',
      probability: 50,
      stage: 'LEAD'
    };

    await expect(
      createSalesOpportunity(invalidContactInput, testUser.id)
    ).rejects.toThrow(/contact with id 99999 not found/i);
  });

  it('should throw error when contact belongs to different company', async () => {
    const wrongCompanyContactInput: CreateSalesOpportunityInput = {
      company_id: testCompany.id,
      contact_id: otherContact.id, // Contact belongs to otherCompany
      title: 'Wrong Company Contact',
      probability: 50,
      stage: 'LEAD'
    };

    await expect(
      createSalesOpportunity(wrongCompanyContactInput, testUser.id)
    ).rejects.toThrow(/contact with id .+ not found for company/i);
  });

  it('should handle different pipeline stages', async () => {
    const stages = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'] as const;

    for (const stage of stages) {
      const stageInput: CreateSalesOpportunityInput = {
        company_id: testCompany.id,
        title: `${stage} Opportunity`,
        probability: 50,
        stage: stage
      };

      const result = await createSalesOpportunity(stageInput, testUser.id);
      expect(result.stage).toEqual(stage);
    }
  });

  it('should handle boundary probability values', async () => {
    // Test minimum probability (0)
    const minProbInput: CreateSalesOpportunityInput = {
      company_id: testCompany.id,
      title: 'Min Probability',
      probability: 0,
      stage: 'LEAD'
    };

    const minResult = await createSalesOpportunity(minProbInput, testUser.id);
    expect(minResult.probability).toEqual(0);

    // Test maximum probability (100)
    const maxProbInput: CreateSalesOpportunityInput = {
      company_id: testCompany.id,
      title: 'Max Probability',
      probability: 100,
      stage: 'CLOSED_WON'
    };

    const maxResult = await createSalesOpportunity(maxProbInput, testUser.id);
    expect(maxResult.probability).toEqual(100);
  });
});