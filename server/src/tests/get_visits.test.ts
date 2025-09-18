import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, companiesTable, contactsTable, visitsTable } from '../db/schema';
import { type GetVisitsQuery } from '../schema';
import { getVisits } from '../handlers/get_visits';

// Test data setup
const testUser = {
  email: 'test.bdm@company.com',
  name: 'Test BDM',
  role: 'BDM' as const
};

const testCompany = {
  name: 'Test Company',
  industry: 'Technology',
  assigned_bdm: 1,
  created_by: 1
};

const testContact = {
  company_id: 1,
  name: 'Test Contact',
  position: 'Manager',
  is_primary: true
};

const testVisit1 = {
  company_id: 1,
  contact_id: 1,
  user_id: 1,
  visit_type: 'SALES_CALL' as const,
  visit_date: new Date('2024-01-15'),
  duration_minutes: 60,
  summary: 'First sales call',
  objectives: 'Understand requirements',
  outcomes: 'Positive response',
  next_steps: 'Send proposal',
  location: 'Client office'
};

const testVisit2 = {
  company_id: 1,
  contact_id: 1,
  user_id: 1,
  visit_type: 'FOLLOW_UP' as const,
  visit_date: new Date('2024-01-20'),
  duration_minutes: 30,
  summary: 'Follow-up call',
  objectives: 'Discuss proposal',
  outcomes: 'Questions addressed',
  next_steps: 'Schedule demo',
  location: 'Phone call'
};

describe('getVisits', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all visits when no filters applied', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(companiesTable).values(testCompany).execute();
    await db.insert(contactsTable).values(testContact).execute();
    await db.insert(visitsTable).values([testVisit1, testVisit2]).execute();

    const result = await getVisits();

    expect(result).toHaveLength(2);
    expect(result[0].summary).toEqual('Follow-up call'); // Most recent first
    expect(result[1].summary).toEqual('First sales call');
    expect(result[0].visit_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter visits by company_id', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(companiesTable).values([
      testCompany,
      { ...testCompany, id: 2, name: 'Another Company' }
    ]).execute();
    await db.insert(contactsTable).values([
      testContact,
      { ...testContact, id: 2, company_id: 2 }
    ]).execute();
    await db.insert(visitsTable).values([
      testVisit1,
      { ...testVisit2, company_id: 2, contact_id: 2 }
    ]).execute();

    const query: GetVisitsQuery = { company_id: 1 };
    const result = await getVisits(query);

    expect(result).toHaveLength(1);
    expect(result[0].company_id).toEqual(1);
    expect(result[0].summary).toEqual('First sales call');
  });

  it('should filter visits by user_id', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values([
      testUser,
      { ...testUser, id: 2, email: 'another.bdm@company.com', name: 'Another BDM' }
    ]).execute();
    await db.insert(companiesTable).values(testCompany).execute();
    await db.insert(contactsTable).values(testContact).execute();
    await db.insert(visitsTable).values([
      testVisit1,
      { ...testVisit2, user_id: 2 }
    ]).execute();

    const query: GetVisitsQuery = { user_id: 1 };
    const result = await getVisits(query);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(1);
    expect(result[0].summary).toEqual('First sales call');
  });

  it('should filter visits by date range', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(companiesTable).values(testCompany).execute();
    await db.insert(contactsTable).values(testContact).execute();
    
    const visits = [
      { ...testVisit1, visit_date: new Date('2024-01-10') }, // Before range
      { ...testVisit2, visit_date: new Date('2024-01-18') }, // In range
      { ...testVisit1, visit_date: new Date('2024-01-25'), summary: 'Third visit' } // After range
    ];
    await db.insert(visitsTable).values(visits).execute();

    const query: GetVisitsQuery = {
      from_date: new Date('2024-01-15'),
      to_date: new Date('2024-01-20')
    };
    const result = await getVisits(query);

    expect(result).toHaveLength(1);
    expect(result[0].visit_date).toEqual(new Date('2024-01-18'));
    expect(result[0].summary).toEqual('Follow-up call');
  });

  it('should filter visits from a specific date onwards', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(companiesTable).values(testCompany).execute();
    await db.insert(contactsTable).values(testContact).execute();
    
    const visits = [
      { ...testVisit1, visit_date: new Date('2024-01-10') },
      { ...testVisit2, visit_date: new Date('2024-01-18') },
      { ...testVisit1, visit_date: new Date('2024-01-25'), summary: 'Third visit' }
    ];
    await db.insert(visitsTable).values(visits).execute();

    const query: GetVisitsQuery = {
      from_date: new Date('2024-01-18')
    };
    const result = await getVisits(query);

    expect(result).toHaveLength(2);
    expect(result.every(visit => visit.visit_date >= new Date('2024-01-18'))).toBe(true);
    expect(result[0].summary).toEqual('Third visit'); // Most recent first
    expect(result[1].summary).toEqual('Follow-up call');
  });

  it('should apply pagination with limit and offset', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(companiesTable).values(testCompany).execute();
    await db.insert(contactsTable).values(testContact).execute();
    
    const visits = [
      { ...testVisit1, visit_date: new Date('2024-01-10'), summary: 'Visit 1' },
      { ...testVisit1, visit_date: new Date('2024-01-15'), summary: 'Visit 2' },
      { ...testVisit1, visit_date: new Date('2024-01-20'), summary: 'Visit 3' },
      { ...testVisit1, visit_date: new Date('2024-01-25'), summary: 'Visit 4' }
    ];
    await db.insert(visitsTable).values(visits).execute();

    const query: GetVisitsQuery = {
      limit: 2,
      offset: 1
    };
    const result = await getVisits(query);

    expect(result).toHaveLength(2);
    expect(result[0].summary).toEqual('Visit 3'); // Second most recent
    expect(result[1].summary).toEqual('Visit 2'); // Third most recent
  });

  it('should combine multiple filters', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values([
      testUser,
      { ...testUser, id: 2, email: 'another.bdm@company.com', name: 'Another BDM' }
    ]).execute();
    await db.insert(companiesTable).values([
      testCompany,
      { ...testCompany, id: 2, name: 'Another Company' }
    ]).execute();
    await db.insert(contactsTable).values([
      testContact,
      { ...testContact, id: 2, company_id: 2 }
    ]).execute();
    
    const visits = [
      { ...testVisit1, company_id: 1, user_id: 1, visit_date: new Date('2024-01-10') },
      { ...testVisit1, company_id: 1, user_id: 2, visit_date: new Date('2024-01-15') },
      { ...testVisit1, company_id: 2, user_id: 1, visit_date: new Date('2024-01-18') },
      { ...testVisit1, company_id: 1, user_id: 1, visit_date: new Date('2024-01-20') }
    ];
    await db.insert(visitsTable).values(visits).execute();

    const query: GetVisitsQuery = {
      company_id: 1,
      user_id: 1,
      from_date: new Date('2024-01-12')
    };
    const result = await getVisits(query);

    expect(result).toHaveLength(1);
    expect(result[0].company_id).toEqual(1);
    expect(result[0].user_id).toEqual(1);
    expect(result[0].visit_date).toEqual(new Date('2024-01-20'));
  });

  it('should return empty array when no visits match filters', async () => {
    // Create prerequisite data but no visits
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(companiesTable).values(testCompany).execute();
    await db.insert(contactsTable).values(testContact).execute();

    const query: GetVisitsQuery = { company_id: 999 };
    const result = await getVisits(query);

    expect(result).toHaveLength(0);
  });

  it('should handle visits with nullable fields', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(companiesTable).values(testCompany).execute();
    await db.insert(contactsTable).values(testContact).execute();
    
    const visitWithNulls = {
      company_id: 1,
      contact_id: null, // Nullable
      user_id: 1,
      visit_type: 'OTHER' as const,
      visit_date: new Date('2024-01-15'),
      duration_minutes: null, // Nullable
      summary: 'Visit with nulls',
      objectives: null, // Nullable
      outcomes: null, // Nullable
      next_steps: null, // Nullable
      follow_up_date: null, // Nullable
      location: null // Nullable
    };
    await db.insert(visitsTable).values(visitWithNulls).execute();

    const result = await getVisits();

    expect(result).toHaveLength(1);
    expect(result[0].contact_id).toBeNull();
    expect(result[0].duration_minutes).toBeNull();
    expect(result[0].objectives).toBeNull();
    expect(result[0].outcomes).toBeNull();
    expect(result[0].next_steps).toBeNull();
    expect(result[0].follow_up_date).toBeNull();
    expect(result[0].location).toBeNull();
    expect(result[0].summary).toEqual('Visit with nulls');
  });

  it('should order results by visit_date descending by default', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(companiesTable).values(testCompany).execute();
    await db.insert(contactsTable).values(testContact).execute();
    
    const visits = [
      { ...testVisit1, visit_date: new Date('2024-01-10'), summary: 'Oldest visit' },
      { ...testVisit1, visit_date: new Date('2024-01-20'), summary: 'Newest visit' },
      { ...testVisit1, visit_date: new Date('2024-01-15'), summary: 'Middle visit' }
    ];
    await db.insert(visitsTable).values(visits).execute();

    const result = await getVisits();

    expect(result).toHaveLength(3);
    expect(result[0].summary).toEqual('Newest visit');
    expect(result[1].summary).toEqual('Middle visit');
    expect(result[2].summary).toEqual('Oldest visit');
  });
});