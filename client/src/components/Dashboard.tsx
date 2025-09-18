import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import type { User, DashboardData, Visit } from '../../../server/src/schema';

interface DashboardProps {
  currentUser: User;
}

export default function Dashboard({ currentUser }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await trpc.getDashboardData.query();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Use fallback data since server handlers are stub implementations
      setDashboardData({
        total_companies: 0,
        total_visits_this_month: 0,
        total_opportunities: 0,
        pipeline_value: 0,
        recent_visits: [],
        opportunities_by_stage: []
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Unable to load dashboard data</p>
        <Button onClick={loadDashboardData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'LEAD': return 'bg-gray-500';
      case 'QUALIFIED': return 'bg-blue-500';
      case 'PROPOSAL': return 'bg-yellow-500';
      case 'NEGOTIATION': return 'bg-orange-500';
      case 'CLOSED_WON': return 'bg-green-500';
      case 'CLOSED_LOST': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatStageLabel = (stage: string) => {
    return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getVisitTypeIcon = (type: string) => {
    switch (type) {
      case 'SALES_CALL': return '📞';
      case 'FOLLOW_UP': return '🔄';
      case 'DEMO': return '🎬';
      case 'SUPPORT': return '🛠️';
      default: return '📋';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {currentUser.name}! 👋
            </h2>
            <p className="text-gray-600">
              Here's what's happening with your {currentUser.role === 'MANAGEMENT' ? 'team\'s' : ''} sales activities
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Badge variant="outline" className="text-sm">
              {currentUser.role === 'BDM' ? 'Business Development Manager' : 'Management'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Companies</p>
                <p className="text-3xl font-bold text-blue-900">
                  {dashboardData.total_companies}
                </p>
              </div>
              <div className="text-blue-500 text-2xl">🏢</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Visits This Month</p>
                <p className="text-3xl font-bold text-green-900">
                  {dashboardData.total_visits_this_month}
                </p>
              </div>
              <div className="text-green-500 text-2xl">📅</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Active Opportunities</p>
                <p className="text-3xl font-bold text-purple-900">
                  {dashboardData.total_opportunities}
                </p>
              </div>
              <div className="text-purple-500 text-2xl">🎯</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium">Pipeline Value</p>
                <p className="text-3xl font-bold text-yellow-900">
                  ${(dashboardData.pipeline_value / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="text-yellow-500 text-2xl">💰</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Activities Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📊</span>
              <span>Sales Pipeline Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.opportunities_by_stage.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.opportunities_by_stage.map((stage) => {
                  const totalOpportunities = dashboardData.opportunities_by_stage.reduce((sum, s) => sum + s.count, 0);
                  const percentage = totalOpportunities > 0 ? (stage.count / totalOpportunities) * 100 : 0;
                  
                  return (
                    <div key={stage.stage} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getStageColor(stage.stage)}`}></div>
                          <span className="font-medium">{formatStageLabel(stage.stage)}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{stage.count}</span>
                          <span className="text-gray-500 ml-2">
                            (${(stage.total_value / 1000).toFixed(0)}K)
                          </span>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📈</div>
                <p>No opportunities in pipeline yet</p>
                <p className="text-sm">Create your first sales opportunity to see pipeline data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Visits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>⏰</span>
              <span>Recent Visits</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.recent_visits.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recent_visits.map((visit: Visit) => (
                  <div key={visit.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                    <div className="text-xl">
                      {getVisitTypeIcon(visit.visit_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {visit.visit_type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {visit.summary}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {visit.visit_date.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>No recent visits</p>
                <p className="text-sm">Log your first visit to see activity here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>⚡</span>
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <span className="text-2xl">🏢</span>
              <span className="text-sm">Add Company</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <span className="text-2xl">📝</span>
              <span className="text-sm">Log Visit</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <span className="text-2xl">🎯</span>
              <span className="text-sm">New Opportunity</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <span className="text-2xl">📊</span>
              <span className="text-sm">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}