import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, companiesTable, contactsTable, visitsTable } from '../db/schema';
import { type CreateVisitInput } from '../schema';
import { createVisit } from '../handlers/create_visit';
import { eq } from 'drizzle-orm';

describe('createVisit', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCompanyId: number;
  let testContactId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'BDM'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test company
    const companyResult = await db.insert(companiesTable)
      .values({
        name: 'Test Company',
        created_by: testUserId,
        assigned_bdm: testUserId
      })
      .returning()
      .execute();
    testCompanyId = companyResult[0].id;

    // Create test contact
    const contactResult = await db.insert(contactsTable)
      .values({
        company_id: testCompanyId,
        name: 'Test Contact',
        is_primary: true
      })
      .returning()
      .execute();
    testContactId = contactResult[0].id;
  });

  const createTestInput = (): CreateVisitInput => ({
    company_id: testCompanyId,
    contact_id: testContactId,
    visit_type: 'SALES_CALL',
    visit_date: new Date('2024-01-15T10:30:00Z'),
    duration_minutes: 60,
    summary: 'Discussed fleet management solutions and pricing',
    objectives: 'Present our fleet tracking solution',
    outcomes: 'Customer showed interest, requested detailed proposal',
    next_steps: 'Send detailed proposal by end of week',
    follow_up_date: new Date('2024-01-22T10:30:00Z'),
    location: 'Customer office - Building A, Room 301'
  });

  it('should create a visit with all fields', async () => {
    const input = createTestInput();
    const result = await createVisit(input, testUserId);

    // Validate all fields
    expect(result.id).toBeDefined();
    expect(result.company_id).toEqual(testCompanyId);
    expect(result.contact_id).toEqual(testContactId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.visit_type).toEqual('SALES_CALL');
    expect(result.visit_date).toEqual(input.visit_date);
    expect(result.duration_minutes).toEqual(60);
    expect(result.summary).toEqual(input.summary);
    expect(result.objectives).toEqual(input.objectives || null);
    expect(result.outcomes).toEqual(input.outcomes || null);
    expect(result.next_steps).toEqual(input.next_steps || null);
    expect(result.follow_up_date).toEqual(input.follow_up_date || null);
    expect(result.location).toEqual(input.location || null);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a visit without optional fields', async () => {
    const minimalInput: CreateVisitInput = {
      company_id: testCompanyId,
      visit_type: 'FOLLOW_UP',
      visit_date: new Date('2024-01-15T14:00:00Z'),
      summary: 'Quick follow-up call to discuss pricing questions'
    };

    const result = await createVisit(minimalInput, testUserId);

    expect(result.id).toBeDefined();
    expect(result.company_id).toEqual(testCompanyId);
    expect(result.contact_id).toBeNull();
    expect(result.user_id).toEqual(testUserId);
    expect(result.visit_type).toEqual('FOLLOW_UP');
    expect(result.visit_date).toEqual(minimalInput.visit_date);
    expect(result.duration_minutes).toBeNull();
    expect(result.summary).toEqual(minimalInput.summary);
    expect(result.objectives).toBeNull();
    expect(result.outcomes).toBeNull();
    expect(result.next_steps).toBeNull();
    expect(result.follow_up_date).toBeNull();
    expect(result.location).toBeNull();
  });

  it('should save visit to database', async () => {
    const input = createTestInput();
    const result = await createVisit(input, testUserId);

    // Query database to verify the visit was saved
    const visits = await db.select()
      .from(visitsTable)
      .where(eq(visitsTable.id, result.id))
      .execute();

    expect(visits).toHaveLength(1);
    expect(visits[0].company_id).toEqual(testCompanyId);
    expect(visits[0].contact_id).toEqual(testContactId);
    expect(visits[0].user_id).toEqual(testUserId);
    expect(visits[0].visit_type).toEqual('SALES_CALL');
    expect(visits[0].summary).toEqual(input.summary);
    expect(visits[0].visit_date).toEqual(input.visit_date);
    expect(visits[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different visit types correctly', async () => {
    const visitTypes = ['SALES_CALL', 'FOLLOW_UP', 'DEMO', 'SUPPORT', 'OTHER'] as const;
    
    for (const visitType of visitTypes) {
      const input: CreateVisitInput = {
        company_id: testCompanyId,
        visit_type: visitType,
        visit_date: new Date(),
        summary: `Test ${visitType} visit`
      };

      const result = await createVisit(input, testUserId);
      expect(result.visit_type).toEqual(visitType);
    }
  });

  it('should throw error when company does not exist', async () => {
    const input: CreateVisitInput = {
      company_id: 99999, // Non-existent company ID
      visit_type: 'SALES_CALL',
      visit_date: new Date(),
      summary: 'Test visit'
    };

    await expect(createVisit(input, testUserId)).rejects.toThrow(/company not found/i);
  });

  it('should throw error when contact does not exist', async () => {
    const input: CreateVisitInput = {
      company_id: testCompanyId,
      contact_id: 99999, // Non-existent contact ID
      visit_type: 'SALES_CALL',
      visit_date: new Date(),
      summary: 'Test visit'
    };

    await expect(createVisit(input, testUserId)).rejects.toThrow(/contact not found/i);
  });

  it('should throw error when contact belongs to different company', async () => {
    // Create another company
    const anotherCompanyResult = await db.insert(companiesTable)
      .values({
        name: 'Another Company',
        created_by: testUserId,
        assigned_bdm: testUserId
      })
      .returning()
      .execute();

    // Create contact for the other company
    const otherContactResult = await db.insert(contactsTable)
      .values({
        company_id: anotherCompanyResult[0].id,
        name: 'Other Contact',
        is_primary: true
      })
      .returning()
      .execute();

    const input: CreateVisitInput = {
      company_id: testCompanyId, // First company
      contact_id: otherContactResult[0].id, // Contact from second company
      visit_type: 'SALES_CALL',
      visit_date: new Date(),
      summary: 'Test visit'
    };

    await expect(createVisit(input, testUserId)).rejects.toThrow(/contact not found or does not belong to the specified company/i);
  });

  it('should handle null values in optional fields correctly', async () => {
    const input: CreateVisitInput = {
      company_id: testCompanyId,
      contact_id: null,
      visit_type: 'DEMO',
      visit_date: new Date('2024-01-20T09:00:00Z'),
      duration_minutes: null,
      summary: 'Product demonstration session',
      objectives: null,
      outcomes: null,
      next_steps: null,
      follow_up_date: null,
      location: null
    };

    const result = await createVisit(input, testUserId);

    expect(result.contact_id).toBeNull();
    expect(result.duration_minutes).toBeNull();
    expect(result.objectives).toBeNull();
    expect(result.outcomes).toBeNull();
    expect(result.next_steps).toBeNull();
    expect(result.follow_up_date).toBeNull();
    expect(result.location).toBeNull();
  });

  it('should create multiple visits for same company', async () => {
    const input1: CreateVisitInput = {
      company_id: testCompanyId,
      visit_type: 'SALES_CALL',
      visit_date: new Date('2024-01-15T10:00:00Z'),
      summary: 'First visit - initial meeting'
    };

    const input2: CreateVisitInput = {
      company_id: testCompanyId,
      visit_type: 'FOLLOW_UP',
      visit_date: new Date('2024-01-16T14:00:00Z'),
      summary: 'Second visit - follow-up discussion'
    };

    const result1 = await createVisit(input1, testUserId);
    const result2 = await createVisit(input2, testUserId);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.company_id).toEqual(testCompanyId);
    expect(result2.company_id).toEqual(testCompanyId);
    expect(result1.visit_type).toEqual('SALES_CALL');
    expect(result2.visit_type).toEqual('FOLLOW_UP');

    // Verify both visits are in database
    const visits = await db.select()
      .from(visitsTable)
      .where(eq(visitsTable.company_id, testCompanyId))
      .execute();

    expect(visits).toHaveLength(2);
  });
});