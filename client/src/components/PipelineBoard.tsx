import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import OpportunityForm from '@/components/OpportunityForm';
import type { User, SalesOpportunity, PipelineStage, Company } from '../../../server/src/schema';

interface PipelineBoardProps {
  currentUser: User;
}

export default function PipelineBoard({ currentUser }: PipelineBoardProps) {
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<SalesOpportunity | null>(null);
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);

  const stages: { 
    id: PipelineStage; 
    title: string; 
    color: string; 
    bgColor: string;
    description: string;
  }[] = [
    { 
      id: 'LEAD', 
      title: 'Leads', 
      color: 'text-gray-700', 
      bgColor: 'bg-gray-50 border-gray-200',
      description: 'Initial prospects'
    },
    { 
      id: 'QUALIFIED', 
      title: 'Qualified', 
      color: 'text-blue-700', 
      bgColor: 'bg-blue-50 border-blue-200',
      description: 'Validated opportunities'
    },
    { 
      id: 'PROPOSAL', 
      title: 'Proposal', 
      color: 'text-yellow-700', 
      bgColor: 'bg-yellow-50 border-yellow-200',
      description: 'Proposals submitted'
    },
    { 
      id: 'NEGOTIATION', 
      title: 'Negotiation', 
      color: 'text-orange-700', 
      bgColor: 'bg-orange-50 border-orange-200',
      description: 'In negotiations'
    },
    { 
      id: 'CLOSED_WON', 
      title: 'Closed Won', 
      color: 'text-green-700', 
      bgColor: 'bg-green-50 border-green-200',
      description: 'Successfully closed'
    },
    { 
      id: 'CLOSED_LOST', 
      title: 'Closed Lost', 
      color: 'text-red-700', 
      bgColor: 'bg-red-50 border-red-200',
      description: 'Lost opportunities'
    }
  ];

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load opportunities and companies in parallel
      const [opportunitiesResult, companiesResult] = await Promise.all([
        trpc.getSalesOpportunities.query(
          currentUser.role === 'BDM' && filter === 'mine' 
            ? { user_id: currentUser.id }
            : {}
        ),
        trpc.getCompanies.query(
          currentUser.role === 'BDM' 
            ? { assigned_bdm: currentUser.id }
            : {}
        )
      ]);
      
      setOpportunities(opportunitiesResult);
      setCompanies(companiesResult);
    } catch (error) {
      console.error('Failed to load pipeline data:', error);
      // Use empty arrays as fallback since server handlers are stub implementations
      setOpportunities([]);
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, currentUser.role, filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getOpportunitiesForStage = (stageId: PipelineStage) => {
    return opportunities.filter(opp => opp.stage === stageId);
  };

  const getCompanyName = (companyId: number) => {
    const company = companies.find(c => c.id === companyId);
    return company?.name || 'Unknown Company';
  };

  const getTotalValue = (stageId: PipelineStage) => {
    return getOpportunitiesForStage(stageId)
      .reduce((sum, opp) => sum + (opp.value || 0), 0);
  };

  const handleOpportunityClick = (opportunity: SalesOpportunity) => {
    setSelectedOpportunity(opportunity);
  };

  const handleOpportunityUpdate = (updatedOpportunity: SalesOpportunity) => {
    setOpportunities(prev => 
      prev.map(opp => 
        opp.id === updatedOpportunity.id ? updatedOpportunity : opp
      )
    );
    setSelectedOpportunity(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-96 animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-20 bg-gray-200 rounded"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalPipelineValue = opportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <span>🎯</span>
            <span>Sales Pipeline</span>
          </h2>
          <p className="text-gray-600 mt-1">
            Track opportunities through your sales process
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {currentUser.role === 'MANAGEMENT' && (
            <Select value={filter} onValueChange={(value: 'all' | 'mine') => setFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Opportunities</SelectItem>
                <SelectItem value="mine">My Opportunities</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          <Button onClick={() => setShowOpportunityForm(true)}>
            <span className="mr-2">➕</span>
            New Opportunity
          </Button>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Opportunities</p>
              <p className="text-2xl font-bold">{opportunities.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Pipeline Value</p>
              <p className="text-2xl font-bold text-green-600">
                ${(totalPipelineValue / 1000).toFixed(0)}K
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Won This Month</p>
              <p className="text-2xl font-bold text-green-600">
                {opportunities.filter(opp => 
                  opp.stage === 'CLOSED_WON' && 
                  opp.actual_close_date &&
                  new Date(opp.actual_close_date).getMonth() === new Date().getMonth()
                ).length}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Win Rate</p>
              <p className="text-2xl font-bold text-blue-600">
                {opportunities.length > 0 
                  ? Math.round((opportunities.filter(opp => opp.stage === 'CLOSED_WON').length / opportunities.length) * 100)
                  : 0
                }%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-h-[600px]">
        {stages.map((stage) => {
          const stageOpportunities = getOpportunitiesForStage(stage.id);
          const stageValue = getTotalValue(stage.id);
          
          return (
            <Card key={stage.id} className={`${stage.bgColor} border-2`}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-sm font-semibold ${stage.color}`}>
                  {stage.title}
                </CardTitle>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">{stage.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span>{stageOpportunities.length} opportunities</span>
                    <span className="font-medium">
                      ${(stageValue / 1000).toFixed(0)}K
                    </span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-3 max-h-[500px] overflow-y-auto">
                {stageOpportunities.map((opportunity: SalesOpportunity) => (
                  <Card 
                    key={opportunity.id}
                    className="cursor-pointer hover:shadow-md transition-shadow bg-white border-gray-200"
                    onClick={() => handleOpportunityClick(opportunity)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm mb-1 line-clamp-2">
                        {opportunity.title}
                      </h4>
                      
                      <p className="text-xs text-gray-600 mb-2">
                        {getCompanyName(opportunity.company_id)}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs">
                        {opportunity.value && (
                          <span className="font-medium text-green-600">
                            ${(opportunity.value / 1000).toFixed(0)}K
                          </span>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {opportunity.probability}%
                        </Badge>
                      </div>
                      
                      {opportunity.expected_close_date && (
                        <p className="text-xs text-gray-500 mt-2">
                          Close: {opportunity.expected_close_date.toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {stageOpportunities.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-2xl mb-2">🎯</div>
                    <p className="text-xs">No opportunities</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Opportunity Details Dialog */}
      {selectedOpportunity && (
        <Dialog open={!!selectedOpportunity} onOpenChange={() => setSelectedOpportunity(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Opportunity</DialogTitle>
            </DialogHeader>
            <OpportunityForm
              company={companies.find(c => c.id === selectedOpportunity.company_id)!}
              currentUser={currentUser}
              opportunity={selectedOpportunity}
              onSuccess={handleOpportunityUpdate}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* New Opportunity Dialog */}
      <Dialog open={showOpportunityForm} onOpenChange={setShowOpportunityForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Opportunity</DialogTitle>
          </DialogHeader>
          {companies.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Select a company to create an opportunity for:
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {companies.map((company) => (
                  <Card 
                    key={company.id}
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => {
                      // Here you would typically show the opportunity form for this company
                      console.log('Create opportunity for:', company.name);
                      setShowOpportunityForm(false);
                    }}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium">{company.name}</h4>
                      {company.industry && (
                        <p className="text-sm text-gray-600">{company.industry}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🏢</div>
              <p className="text-gray-600 mb-4">
                No companies available. Add a company first to create opportunities.
              </p>
              <Button onClick={() => setShowOpportunityForm(false)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}