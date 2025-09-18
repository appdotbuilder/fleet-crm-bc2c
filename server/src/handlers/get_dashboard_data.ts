import { db } from '../db';
import { companiesTable, visitsTable, salesOpportunitiesTable } from '../db/schema';
import { type DashboardData } from '../schema';
import { eq, and, gte, lte, count, sum, desc, notInArray, SQL } from 'drizzle-orm';

export async function getDashboardData(userId?: number, userRole?: string): Promise<DashboardData> {
  try {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

    // Build base conditions for filtering by user role
    const companyConditions: SQL<unknown>[] = [];
    const visitConditions: SQL<unknown>[] = [];
    const opportunityConditions: SQL<unknown>[] = [];

    if (userRole === 'BDM' && userId) {
      companyConditions.push(eq(companiesTable.assigned_bdm, userId));
      visitConditions.push(eq(visitsTable.user_id, userId));
      opportunityConditions.push(eq(salesOpportunitiesTable.user_id, userId));
    }

    // 1. Get total companies count
    const companiesQuery = companyConditions.length > 0
      ? db.select({ count: count() }).from(companiesTable).where(and(...companyConditions))
      : db.select({ count: count() }).from(companiesTable);
    
    const companiesResult = await companiesQuery.execute();
    const totalCompanies = companiesResult[0]?.count || 0;

    // 2. Get total visits this month
    const monthVisitConditions = [
      gte(visitsTable.visit_date, startOfMonth),
      lte(visitsTable.visit_date, endOfMonth),
      ...visitConditions
    ];
    
    const visitsThisMonthResult = await db.select({ count: count() })
      .from(visitsTable)
      .where(and(...monthVisitConditions))
      .execute();
    const totalVisitsThisMonth = visitsThisMonthResult[0]?.count || 0;

    // 3. Get total active opportunities (not CLOSED_WON or CLOSED_LOST)
    const activeOpportunityConditions = [
      notInArray(salesOpportunitiesTable.stage, ['CLOSED_WON', 'CLOSED_LOST']),
      ...opportunityConditions
    ];
    
    const activeOpportunitiesResult = await db.select({ count: count() })
      .from(salesOpportunitiesTable)
      .where(and(...activeOpportunityConditions))
      .execute();
    const totalOpportunities = activeOpportunitiesResult[0]?.count || 0;

    // 4. Get pipeline value (sum of active opportunities)
    const pipelineValueResult = await db.select({ 
      total: sum(salesOpportunitiesTable.value) 
    })
      .from(salesOpportunitiesTable)
      .where(and(...activeOpportunityConditions))
      .execute();
    const pipelineValue = parseFloat(pipelineValueResult[0]?.total || '0');

    // 5. Get recent visits (latest 5)
    const recentVisitsQuery = visitConditions.length > 0
      ? db.select()
          .from(visitsTable)
          .where(and(...visitConditions))
          .orderBy(desc(visitsTable.visit_date))
          .limit(5)
      : db.select()
          .from(visitsTable)
          .orderBy(desc(visitsTable.visit_date))
          .limit(5);
    
    const recentVisitsResult = await recentVisitsQuery.execute();
    const recentVisits = recentVisitsResult.map(visit => ({
      ...visit,
      visit_date: new Date(visit.visit_date),
      follow_up_date: visit.follow_up_date ? new Date(visit.follow_up_date) : null,
      created_at: new Date(visit.created_at),
      updated_at: new Date(visit.updated_at)
    }));

    // 6. Get opportunities by stage
    const opportunitiesByStageQuery = opportunityConditions.length > 0
      ? db.select({
          stage: salesOpportunitiesTable.stage,
          count: count(),
          total_value: sum(salesOpportunitiesTable.value)
        })
          .from(salesOpportunitiesTable)
          .where(and(...opportunityConditions))
          .groupBy(salesOpportunitiesTable.stage)
      : db.select({
          stage: salesOpportunitiesTable.stage,
          count: count(),
          total_value: sum(salesOpportunitiesTable.value)
        })
          .from(salesOpportunitiesTable)
          .groupBy(salesOpportunitiesTable.stage);
    
    const opportunitiesByStageResult = await opportunitiesByStageQuery.execute();
    const opportunitiesByStage = opportunitiesByStageResult.map(item => ({
      stage: item.stage,
      count: item.count,
      total_value: parseFloat(item.total_value || '0')
    }));

    return {
      total_companies: totalCompanies,
      total_visits_this_month: totalVisitsThisMonth,
      total_opportunities: totalOpportunities,
      pipeline_value: pipelineValue,
      recent_visits: recentVisits,
      opportunities_by_stage: opportunitiesByStage
    };
  } catch (error) {
    console.error('Dashboard data fetch failed:', error);
    throw error;
  }
}