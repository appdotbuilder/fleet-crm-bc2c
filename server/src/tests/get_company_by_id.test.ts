import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  companiesTable, 
  contactsTable, 
  visitsTable, 
  salesOpportunitiesTable 
} from '../db/schema';
import { getCompanyById } from '../handlers/get_company_by_id';

describe('getCompanyById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent company', async () => {
    const result = await getCompanyById(999);
    expect(result).toBeNull();
  });

  it('should return company with empty relations when no related data exists', async () => {
    // Create test user first
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'BDM'
      })
      .returning()
      .execute();

    const user = users[0];

    // Create company without any related data
    const companies = await db.insert(companiesTable)
      .values({
        name: 'Test Company',
        industry: 'Technology',
        address: '123 Test St',
        phone: '+1234567890',
        email: 'contact@test.com',
        website: 'https://test.com',
        fleet_size: 50,
        annual_revenue: '1000000.50',
        notes: 'Test notes',
        created_by: user.id,
        assigned_bdm: user.id
      })
      .returning()
      .execute();

    const company = companies[0];

    const result = await getCompanyById(company.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(company.id);
    expect(result!.name).toEqual('Test Company');
    expect(result!.industry).toEqual('Technology');
    expect(result!.address).toEqual('123 Test St');
    expect(result!.phone).toEqual('+1234567890');
    expect(result!.email).toEqual('contact@test.com');
    expect(result!.website).toEqual('https://test.com');
    expect(result!.fleet_size).toEqual(50);
    expect(result!.annual_revenue).toEqual(1000000.50);
    expect(typeof result!.annual_revenue).toBe('number');
    expect(result!.notes).toEqual('Test notes');
    expect(result!.created_by).toEqual(user.id);
    expect(result!.assigned_bdm).toEqual(user.id);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Check empty relations
    expect(result!.contacts).toEqual([]);
    expect(result!.visits).toEqual([]);
    expect(result!.sales_opportunities).toEqual([]);
  });

  it('should return company with all related data', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'BDM'
      })
      .returning()
      .execute();

    const user = users[0];

    // Create company
    const companies = await db.insert(companiesTable)
      .values({
        name: 'Full Test Company',
        industry: 'Logistics',
        annual_revenue: '5000000.75',
        created_by: user.id,
        assigned_bdm: user.id
      })
      .returning()
      .execute();

    const company = companies[0];

    // Create contact
    const contacts = await db.insert(contactsTable)
      .values({
        company_id: company.id,
        name: 'John Doe',
        position: 'Fleet Manager',
        phone: '+1987654321',
        email: 'john@fulltest.com',
        is_primary: true,
        notes: 'Primary contact'
      })
      .returning()
      .execute();

    const contact = contacts[0];

    // Create visit
    const visitDate = new Date('2024-01-15T10:00:00Z');
    const visits = await db.insert(visitsTable)
      .values({
        company_id: company.id,
        contact_id: contact.id,
        user_id: user.id,
        visit_type: 'SALES_CALL',
        visit_date: visitDate,
        duration_minutes: 90,
        summary: 'Initial sales meeting',
        objectives: 'Understand fleet needs',
        outcomes: 'Positive response',
        next_steps: 'Send proposal',
        follow_up_date: new Date('2024-01-22T10:00:00Z'),
        location: 'Client office'
      })
      .returning()
      .execute();

    const visit = visits[0];

    // Create sales opportunity
    const opportunities = await db.insert(salesOpportunitiesTable)
      .values({
        company_id: company.id,
        contact_id: contact.id,
        user_id: user.id,
        title: 'Fleet Management System',
        description: 'Complete fleet tracking solution',
        value: '250000.00',
        probability: 75,
        stage: 'PROPOSAL',
        expected_close_date: new Date('2024-03-01T00:00:00Z')
      })
      .returning()
      .execute();

    const opportunity = opportunities[0];

    const result = await getCompanyById(company.id);

    expect(result).not.toBeNull();
    
    // Check company data
    expect(result!.id).toEqual(company.id);
    expect(result!.name).toEqual('Full Test Company');
    expect(result!.industry).toEqual('Logistics');
    expect(result!.annual_revenue).toEqual(5000000.75);
    expect(typeof result!.annual_revenue).toBe('number');

    // Check contacts
    expect(result!.contacts).toHaveLength(1);
    expect(result!.contacts[0].id).toEqual(contact.id);
    expect(result!.contacts[0].name).toEqual('John Doe');
    expect(result!.contacts[0].position).toEqual('Fleet Manager');
    expect(result!.contacts[0].phone).toEqual('+1987654321');
    expect(result!.contacts[0].email).toEqual('john@fulltest.com');
    expect(result!.contacts[0].is_primary).toBe(true);
    expect(result!.contacts[0].notes).toEqual('Primary contact');

    // Check visits
    expect(result!.visits).toHaveLength(1);
    expect(result!.visits[0].id).toEqual(visit.id);
    expect(result!.visits[0].company_id).toEqual(company.id);
    expect(result!.visits[0].contact_id).toEqual(contact.id);
    expect(result!.visits[0].user_id).toEqual(user.id);
    expect(result!.visits[0].visit_type).toEqual('SALES_CALL');
    expect(result!.visits[0].visit_date).toEqual(visitDate);
    expect(result!.visits[0].duration_minutes).toEqual(90);
    expect(result!.visits[0].summary).toEqual('Initial sales meeting');
    expect(result!.visits[0].objectives).toEqual('Understand fleet needs');
    expect(result!.visits[0].outcomes).toEqual('Positive response');
    expect(result!.visits[0].next_steps).toEqual('Send proposal');
    expect(result!.visits[0].location).toEqual('Client office');

    // Check sales opportunities
    expect(result!.sales_opportunities).toHaveLength(1);
    expect(result!.sales_opportunities[0].id).toEqual(opportunity.id);
    expect(result!.sales_opportunities[0].company_id).toEqual(company.id);
    expect(result!.sales_opportunities[0].contact_id).toEqual(contact.id);
    expect(result!.sales_opportunities[0].user_id).toEqual(user.id);
    expect(result!.sales_opportunities[0].title).toEqual('Fleet Management System');
    expect(result!.sales_opportunities[0].description).toEqual('Complete fleet tracking solution');
    expect(result!.sales_opportunities[0].value).toEqual(250000.00);
    expect(typeof result!.sales_opportunities[0].value).toBe('number');
    expect(result!.sales_opportunities[0].probability).toEqual(75);
    expect(result!.sales_opportunities[0].stage).toEqual('PROPOSAL');
    expect(result!.sales_opportunities[0].expected_close_date).toEqual(new Date('2024-03-01T00:00:00Z'));
  });

  it('should handle null numeric values correctly', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'BDM'
      })
      .returning()
      .execute();

    const user = users[0];

    // Create company with null annual_revenue
    const companies = await db.insert(companiesTable)
      .values({
        name: 'Null Revenue Company',
        annual_revenue: null, // Explicitly null
        created_by: user.id,
        assigned_bdm: user.id
      })
      .returning()
      .execute();

    const company = companies[0];

    // Create sales opportunity with null value
    await db.insert(salesOpportunitiesTable)
      .values({
        company_id: company.id,
        user_id: user.id,
        title: 'No Value Opportunity',
        value: null, // Explicitly null
        probability: 50,
        stage: 'LEAD'
      })
      .execute();

    const result = await getCompanyById(company.id);

    expect(result).not.toBeNull();
    expect(result!.annual_revenue).toBeNull();
    expect(result!.sales_opportunities).toHaveLength(1);
    expect(result!.sales_opportunities[0].value).toBeNull();
  });

  it('should return company with multiple related records', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'BDM'
      })
      .returning()
      .execute();

    const user = users[0];

    // Create company
    const companies = await db.insert(companiesTable)
      .values({
        name: 'Multi Relation Company',
        created_by: user.id,
        assigned_bdm: user.id
      })
      .returning()
      .execute();

    const company = companies[0];

    // Create multiple contacts
    await db.insert(contactsTable)
      .values([
        {
          company_id: company.id,
          name: 'Contact One',
          is_primary: true
        },
        {
          company_id: company.id,
          name: 'Contact Two',
          is_primary: false
        }
      ])
      .execute();

    // Create multiple visits
    await db.insert(visitsTable)
      .values([
        {
          company_id: company.id,
          user_id: user.id,
          visit_type: 'SALES_CALL',
          visit_date: new Date('2024-01-01T10:00:00Z'),
          summary: 'First visit'
        },
        {
          company_id: company.id,
          user_id: user.id,
          visit_type: 'FOLLOW_UP',
          visit_date: new Date('2024-01-10T10:00:00Z'),
          summary: 'Follow up visit'
        }
      ])
      .execute();

    // Create multiple sales opportunities
    await db.insert(salesOpportunitiesTable)
      .values([
        {
          company_id: company.id,
          user_id: user.id,
          title: 'Opportunity One',
          value: '100000.00',
          probability: 60,
          stage: 'QUALIFIED'
        },
        {
          company_id: company.id,
          user_id: user.id,
          title: 'Opportunity Two',
          value: '150000.00',
          probability: 40,
          stage: 'PROPOSAL'
        }
      ])
      .execute();

    const result = await getCompanyById(company.id);

    expect(result).not.toBeNull();
    expect(result!.contacts).toHaveLength(2);
    expect(result!.visits).toHaveLength(2);
    expect(result!.sales_opportunities).toHaveLength(2);

    // Verify numeric conversions on opportunities
    result!.sales_opportunities.forEach(opp => {
      expect(typeof opp.value).toBe('number');
    });

    const opportunityValues = result!.sales_opportunities.map(opp => opp.value);
    expect(opportunityValues).toContain(100000.00);
    expect(opportunityValues).toContain(150000.00);
  });
});