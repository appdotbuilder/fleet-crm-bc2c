import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, companiesTable, visitsTable, salesOpportunitiesTable } from '../db/schema';
import { getDashboardData } from '../handlers/get_dashboard_data';

describe('getDashboardData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return dashboard data for management user', async () => {
    // Create test users
    const usersResult = await db.insert(usersTable)
      .values([
        { email: 'bdm1@example.com', name: 'BDM User 1', role: 'BDM' },
        { email: 'bdm2@example.com', name: 'BDM User 2', role: 'BDM' },
        { email: 'manager@example.com', name: 'Manager', role: 'MANAGEMENT' }
      ])
      .returning()
      .execute();

    const [bdm1, bdm2, manager] = usersResult;

    // Create test companies
    const companiesResult = await db.insert(companiesTable)
      .values([
        {
          name: 'Company A',
          created_by: manager.id,
          assigned_bdm: bdm1.id,
          annual_revenue: '100000.00'
        },
        {
          name: 'Company B', 
          created_by: manager.id,
          assigned_bdm: bdm2.id,
          annual_revenue: '200000.00'
        },
        {
          name: 'Company C',
          created_by: manager.id,
          assigned_bdm: bdm1.id,
          annual_revenue: '150000.00'
        }
      ])
      .returning()
      .execute();

    const [companyA, companyB, companyC] = companiesResult;

    // Create visits (some in current month, some outside)
    const currentDate = new Date();
    const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15);
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 15);

    await db.insert(visitsTable)
      .values([
        {
          company_id: companyA.id,
          user_id: bdm1.id,
          visit_type: 'SALES_CALL',
          visit_date: thisMonth,
          summary: 'Initial sales call'
        },
        {
          company_id: companyB.id,
          user_id: bdm2.id,
          visit_type: 'FOLLOW_UP',
          visit_date: thisMonth,
          summary: 'Follow up visit'
        },
        {
          company_id: companyC.id,
          user_id: bdm1.id,
          visit_type: 'DEMO',
          visit_date: lastMonth,
          summary: 'Product demo'
        }
      ])
      .execute();

    // Create sales opportunities
    await db.insert(salesOpportunitiesTable)
      .values([
        {
          company_id: companyA.id,
          user_id: bdm1.id,
          title: 'Fleet Management Deal',
          value: '50000.00',
          probability: 75,
          stage: 'PROPOSAL'
        },
        {
          company_id: companyB.id,
          user_id: bdm2.id,
          title: 'Software License',
          value: '25000.00',
          probability: 50,
          stage: 'QUALIFIED'
        },
        {
          company_id: companyC.id,
          user_id: bdm1.id,
          title: 'Closed Deal',
          value: '30000.00',
          probability: 100,
          stage: 'CLOSED_WON'
        }
      ])
      .execute();

    const result = await getDashboardData(manager.id, 'MANAGEMENT');

    // Verify basic counts
    expect(result.total_companies).toBe(3);
    expect(result.total_visits_this_month).toBe(2);
    expect(result.total_opportunities).toBe(2); // Only active opportunities (not closed)
    expect(result.pipeline_value).toBe(75000); // Sum of active opportunities

    // Verify recent visits
    expect(result.recent_visits).toHaveLength(3);
    expect(result.recent_visits[0].visit_date).toBeInstanceOf(Date);

    // Verify opportunities by stage
    expect(result.opportunities_by_stage).toHaveLength(3);
    
    const proposalStage = result.opportunities_by_stage.find(s => s.stage === 'PROPOSAL');
    expect(proposalStage?.count).toBe(1);
    expect(proposalStage?.total_value).toBe(50000);

    const qualifiedStage = result.opportunities_by_stage.find(s => s.stage === 'QUALIFIED');
    expect(qualifiedStage?.count).toBe(1);
    expect(qualifiedStage?.total_value).toBe(25000);

    const closedWonStage = result.opportunities_by_stage.find(s => s.stage === 'CLOSED_WON');
    expect(closedWonStage?.count).toBe(1);
    expect(closedWonStage?.total_value).toBe(30000);
  });

  it('should filter data for BDM user', async () => {
    // Create test users
    const usersResult = await db.insert(usersTable)
      .values([
        { email: 'bdm1@example.com', name: 'BDM User 1', role: 'BDM' },
        { email: 'bdm2@example.com', name: 'BDM User 2', role: 'BDM' },
        { email: 'manager@example.com', name: 'Manager', role: 'MANAGEMENT' }
      ])
      .returning()
      .execute();

    const [bdm1, bdm2, manager] = usersResult;

    // Create test companies - some assigned to bdm1, some to bdm2
    const companiesResult = await db.insert(companiesTable)
      .values([
        {
          name: 'BDM1 Company A',
          created_by: manager.id,
          assigned_bdm: bdm1.id,
          annual_revenue: '100000.00'
        },
        {
          name: 'BDM1 Company B', 
          created_by: manager.id,
          assigned_bdm: bdm1.id,
          annual_revenue: '200000.00'
        },
        {
          name: 'BDM2 Company C',
          created_by: manager.id,
          assigned_bdm: bdm2.id,
          annual_revenue: '150000.00'
        }
      ])
      .returning()
      .execute();

    const [companyA, companyB, companyC] = companiesResult;

    // Create visits for both BDMs
    const currentDate = new Date();
    const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15);

    await db.insert(visitsTable)
      .values([
        {
          company_id: companyA.id,
          user_id: bdm1.id,
          visit_type: 'SALES_CALL',
          visit_date: thisMonth,
          summary: 'BDM1 visit to Company A'
        },
        {
          company_id: companyB.id,
          user_id: bdm1.id,
          visit_type: 'FOLLOW_UP',
          visit_date: thisMonth,
          summary: 'BDM1 visit to Company B'
        },
        {
          company_id: companyC.id,
          user_id: bdm2.id,
          visit_type: 'DEMO',
          visit_date: thisMonth,
          summary: 'BDM2 visit to Company C'
        }
      ])
      .execute();

    // Create opportunities for both BDMs
    await db.insert(salesOpportunitiesTable)
      .values([
        {
          company_id: companyA.id,
          user_id: bdm1.id,
          title: 'BDM1 Deal A',
          value: '50000.00',
          probability: 75,
          stage: 'PROPOSAL'
        },
        {
          company_id: companyB.id,
          user_id: bdm1.id,
          title: 'BDM1 Deal B',
          value: '25000.00',
          probability: 50,
          stage: 'QUALIFIED'
        },
        {
          company_id: companyC.id,
          user_id: bdm2.id,
          title: 'BDM2 Deal C',
          value: '30000.00',
          probability: 60,
          stage: 'NEGOTIATION'
        }
      ])
      .execute();

    const result = await getDashboardData(bdm1.id, 'BDM');

    // Should only show data for BDM1's assigned companies and activities
    expect(result.total_companies).toBe(2); // Only companies assigned to bdm1
    expect(result.total_visits_this_month).toBe(2); // Only bdm1's visits
    expect(result.total_opportunities).toBe(2); // Only bdm1's opportunities
    expect(result.pipeline_value).toBe(75000); // Sum of bdm1's opportunities

    // Recent visits should only include bdm1's visits
    expect(result.recent_visits).toHaveLength(2);
    expect(result.recent_visits.every(v => v.user_id === bdm1.id)).toBe(true);

    // Opportunities by stage should only include bdm1's opportunities
    expect(result.opportunities_by_stage).toHaveLength(2);
    expect(result.opportunities_by_stage.find(s => s.stage === 'PROPOSAL')?.count).toBe(1);
    expect(result.opportunities_by_stage.find(s => s.stage === 'QUALIFIED')?.count).toBe(1);
    expect(result.opportunities_by_stage.find(s => s.stage === 'NEGOTIATION')).toBeUndefined();
  });

  it('should handle empty data gracefully', async () => {
    // Create a user but no related data
    const userResult = await db.insert(usersTable)
      .values([
        { email: 'empty@example.com', name: 'Empty User', role: 'BDM' }
      ])
      .returning()
      .execute();

    const user = userResult[0];

    const result = await getDashboardData(user.id, 'BDM');

    expect(result.total_companies).toBe(0);
    expect(result.total_visits_this_month).toBe(0);
    expect(result.total_opportunities).toBe(0);
    expect(result.pipeline_value).toBe(0);
    expect(result.recent_visits).toHaveLength(0);
    expect(result.opportunities_by_stage).toHaveLength(0);
  });

  it('should handle null values in numeric calculations', async () => {
    // Create test data with null values
    const usersResult = await db.insert(usersTable)
      .values([
        { email: 'bdm@example.com', name: 'BDM User', role: 'BDM' }
      ])
      .returning()
      .execute();

    const bdm = usersResult[0];

    const companiesResult = await db.insert(companiesTable)
      .values([
        {
          name: 'Test Company',
          created_by: bdm.id,
          assigned_bdm: bdm.id
        }
      ])
      .returning()
      .execute();

    const company = companiesResult[0];

    // Create opportunities with null values
    await db.insert(salesOpportunitiesTable)
      .values([
        {
          company_id: company.id,
          user_id: bdm.id,
          title: 'Deal with null value',
          value: null, // null value
          probability: 50,
          stage: 'LEAD'
        },
        {
          company_id: company.id,
          user_id: bdm.id,
          title: 'Deal with value',
          value: '15000.00',
          probability: 75,
          stage: 'QUALIFIED'
        }
      ])
      .execute();

    const result = await getDashboardData(bdm.id, 'BDM');

    expect(result.total_opportunities).toBe(2);
    expect(result.pipeline_value).toBe(15000); // Should handle null values correctly
    expect(result.opportunities_by_stage).toHaveLength(2);

    const leadStage = result.opportunities_by_stage.find(s => s.stage === 'LEAD');
    expect(leadStage?.count).toBe(1);
    expect(leadStage?.total_value).toBe(0); // null should convert to 0

    const qualifiedStage = result.opportunities_by_stage.find(s => s.stage === 'QUALIFIED');
    expect(qualifiedStage?.count).toBe(1);
    expect(qualifiedStage?.total_value).toBe(15000);
  });

  it('should limit recent visits to 5 items', async () => {
    // Create test user and company
    const usersResult = await db.insert(usersTable)
      .values([
        { email: 'bdm@example.com', name: 'BDM User', role: 'BDM' }
      ])
      .returning()
      .execute();

    const bdm = usersResult[0];

    const companiesResult = await db.insert(companiesTable)
      .values([
        {
          name: 'Test Company',
          created_by: bdm.id,
          assigned_bdm: bdm.id
        }
      ])
      .returning()
      .execute();

    const company = companiesResult[0];

    // Create 7 visits to test limit
    const visits = [];
    for (let i = 0; i < 7; i++) {
      const visitDate = new Date();
      visitDate.setDate(visitDate.getDate() - i); // Create visits on different dates
      visits.push({
        company_id: company.id,
        user_id: bdm.id,
        visit_type: 'SALES_CALL' as const,
        visit_date: visitDate,
        summary: `Visit ${i + 1}`
      });
    }

    await db.insert(visitsTable).values(visits).execute();

    const result = await getDashboardData(bdm.id, 'BDM');

    // Should only return 5 most recent visits
    expect(result.recent_visits).toHaveLength(5);
    
    // Should be ordered by visit_date descending (most recent first)
    for (let i = 0; i < 4; i++) {
      expect(result.recent_visits[i].visit_date >= result.recent_visits[i + 1].visit_date).toBe(true);
    }
  });

  it('should handle visits from different months correctly', async () => {
    // Create test user and company
    const usersResult = await db.insert(usersTable)
      .values([
        { email: 'bdm@example.com', name: 'BDM User', role: 'BDM' }
      ])
      .returning()
      .execute();

    const bdm = usersResult[0];

    const companiesResult = await db.insert(companiesTable)
      .values([
        {
          name: 'Test Company',
          created_by: bdm.id,
          assigned_bdm: bdm.id
        }
      ])
      .returning()
      .execute();

    const company = companiesResult[0];

    // Create visits in different months
    const currentDate = new Date();
    const thisMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const thisMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 15);
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 15);

    await db.insert(visitsTable)
      .values([
        {
          company_id: company.id,
          user_id: bdm.id,
          visit_type: 'SALES_CALL',
          visit_date: thisMonthStart,
          summary: 'Visit at start of month'
        },
        {
          company_id: company.id,
          user_id: bdm.id,
          visit_type: 'SALES_CALL',
          visit_date: thisMonthEnd,
          summary: 'Visit at end of month'
        },
        {
          company_id: company.id,
          user_id: bdm.id,
          visit_type: 'SALES_CALL',
          visit_date: lastMonth,
          summary: 'Visit last month'
        },
        {
          company_id: company.id,
          user_id: bdm.id,
          visit_type: 'SALES_CALL',
          visit_date: nextMonth,
          summary: 'Visit next month'
        }
      ])
      .execute();

    const result = await getDashboardData(bdm.id, 'BDM');

    // Should only count visits from current month
    expect(result.total_visits_this_month).toBe(2);
    
    // Recent visits should include all visits (limited to 5)
    expect(result.recent_visits).toHaveLength(4);
  });
});