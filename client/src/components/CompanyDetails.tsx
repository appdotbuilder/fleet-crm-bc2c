import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import ContactForm from '@/components/ContactForm';
import OpportunityForm from '@/components/OpportunityForm';
import type { 
  User, 
  Company, 
  CompanyWithRelations, 
  Contact, 
  Visit, 
  SalesOpportunity 
} from '../../../server/src/schema';

interface CompanyDetailsProps {
  company: Company;
  currentUser: User;
  onBack: () => void;
  onNewVisit: () => void;
}

export default function CompanyDetails({ 
  company, 
  currentUser, 
  onBack, 
  onNewVisit 
}: CompanyDetailsProps) {
  const [companyDetails, setCompanyDetails] = useState<CompanyWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const loadCompanyDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getCompanyById.query({ id: company.id });
      setCompanyDetails(result);
    } catch (error) {
      console.error('Failed to load company details:', error);
      // Use fallback data with empty relations since server handlers are stub implementations
      setCompanyDetails({
        ...company,
        contacts: [],
        visits: [],
        sales_opportunities: []
      });
    } finally {
      setIsLoading(false);
    }
  }, [company]);

  useEffect(() => {
    loadCompanyDetails();
  }, [loadCompanyDetails]);

  const handleContactCreated = (contact: Contact) => {
    if (companyDetails) {
      setCompanyDetails({
        ...companyDetails,
        contacts: [...companyDetails.contacts, contact]
      });
    }
    setShowContactForm(false);
  };

  const handleOpportunityCreated = (opportunity: SalesOpportunity) => {
    if (companyDetails) {
      setCompanyDetails({
        ...companyDetails,
        sales_opportunities: [...companyDetails.sales_opportunities, opportunity]
      });
    }
    setShowOpportunityForm(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!companyDetails) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load company details</p>
        <Button onClick={loadCompanyDetails} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'LEAD': return 'bg-gray-100 text-gray-800';
      case 'QUALIFIED': return 'bg-blue-100 text-blue-800';
      case 'PROPOSAL': return 'bg-yellow-100 text-yellow-800';
      case 'NEGOTIATION': return 'bg-orange-100 text-orange-800';
      case 'CLOSED_WON': return 'bg-green-100 text-green-800';
      case 'CLOSED_LOST': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const totalOpportunityValue = companyDetails.sales_opportunities
    .reduce((sum, opp) => sum + (opp.value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <span className="mr-2">←</span>
            Back to Companies
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <span>🏢</span>
              <span>{companyDetails.name}</span>
            </h1>
            {companyDetails.industry && (
              <Badge variant="secondary" className="mt-1">
                {companyDetails.industry}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={onNewVisit}
            className="bg-green-600 hover:bg-green-700"
          >
            <span className="mr-2">📝</span>
            New Visit
          </Button>
          <Dialog open={showOpportunityForm} onOpenChange={setShowOpportunityForm}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <span className="mr-2">🎯</span>
                Add Opportunity
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Sales Opportunity</DialogTitle>
              </DialogHeader>
              <OpportunityForm
                company={companyDetails}
                currentUser={currentUser}
                onSuccess={handleOpportunityCreated}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Company Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Opportunities</p>
                <p className="text-2xl font-bold">{companyDetails.sales_opportunities.length}</p>
              </div>
              <div className="text-2xl">🎯</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pipeline Value</p>
                <p className="text-2xl font-bold">${(totalOpportunityValue / 1000).toFixed(0)}K</p>
              </div>
              <div className="text-2xl">💰</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Visits</p>
                <p className="text-2xl font-bold">{companyDetails.visits.length}</p>
              </div>
              <div className="text-2xl">📅</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts ({companyDetails.contacts.length})
          </TabsTrigger>
          <TabsTrigger value="visits">
            Visits ({companyDetails.visits.length})
          </TabsTrigger>
          <TabsTrigger value="opportunities">
            Opportunities ({companyDetails.sales_opportunities.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {companyDetails.email && (
                  <div className="flex items-center space-x-2">
                    <span>📧</span>
                    <span className="text-sm">{companyDetails.email}</span>
                  </div>
                )}
                
                {companyDetails.phone && (
                  <div className="flex items-center space-x-2">
                    <span>📞</span>
                    <span className="text-sm">{companyDetails.phone}</span>
                  </div>
                )}
                
                {companyDetails.website && (
                  <div className="flex items-center space-x-2">
                    <span>🌐</span>
                    <a 
                      href={companyDetails.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {companyDetails.website}
                    </a>
                  </div>
                )}
                
                {companyDetails.address && (
                  <div className="flex items-start space-x-2">
                    <span>📍</span>
                    <span className="text-sm">{companyDetails.address}</span>
                  </div>
                )}

                <Separator />

                {companyDetails.fleet_size && (
                  <div className="flex items-center space-x-2">
                    <span>🚛</span>
                    <span className="text-sm">{companyDetails.fleet_size} vehicles</span>
                  </div>
                )}
                
                {companyDetails.annual_revenue && (
                  <div className="flex items-center space-x-2">
                    <span>💰</span>
                    <span className="text-sm">
                      ${(companyDetails.annual_revenue / 1000000).toFixed(1)}M annual revenue
                    </span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <span>📅</span>
                  <span className="text-sm">
                    Added {companyDetails.created_at.toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Notes and Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Notes & Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {companyDetails.notes ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-800">{companyDetails.notes}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">No notes available</p>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Recent Visits</h4>
                  {companyDetails.visits.slice(0, 3).map((visit: Visit) => (
                    <div key={visit.id} className="flex items-start space-x-2 text-sm">
                      <span>{getVisitTypeIcon(visit.visit_type)}</span>
                      <div>
                        <p className="text-gray-900">{visit.summary}</p>
                        <p className="text-gray-500 text-xs">
                          {visit.visit_date.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {companyDetails.visits.length === 0 && (
                    <p className="text-sm text-gray-500">No visits recorded yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Company Contacts</h3>
            <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
              <DialogTrigger asChild>
                <Button>
                  <span className="mr-2">➕</span>
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <ContactForm
                  companyId={companyDetails.id}
                  onSuccess={handleContactCreated}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companyDetails.contacts.map((contact: Contact) => (
              <Card key={contact.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{contact.name}</h4>
                      {contact.position && (
                        <p className="text-sm text-gray-600">{contact.position}</p>
                      )}
                      
                      <div className="mt-2 space-y-1">
                        {contact.email && (
                          <p className="text-xs text-gray-500">📧 {contact.email}</p>
                        )}
                        {contact.phone && (
                          <p className="text-xs text-gray-500">📞 {contact.phone}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1">
                      {contact.is_primary && (
                        <Badge variant="default" className="text-xs">Primary</Badge>
                      )}
                    </div>
                  </div>
                  
                  {contact.notes && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                      {contact.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {companyDetails.contacts.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-lg font-semibold mb-2">No contacts yet</h3>
                <p className="text-gray-600 mb-4">
                  Add contacts to track key people at this company
                </p>
                <Button onClick={() => setShowContactForm(true)}>
                  Add First Contact
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Visits Tab */}
        <TabsContent value="visits" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Visit History</h3>
            <Button onClick={onNewVisit} className="bg-green-600 hover:bg-green-700">
              <span className="mr-2">📝</span>
              Log New Visit
            </Button>
          </div>

          <div className="space-y-4">
            {companyDetails.visits.map((visit: Visit) => (
              <Card key={visit.id}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">
                      {getVisitTypeIcon(visit.visit_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">
                          {visit.visit_type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <div className="text-right text-sm text-gray-500">
                          <p>{visit.visit_date.toLocaleDateString()}</p>
                          {visit.duration_minutes && (
                            <p>{visit.duration_minutes} min</p>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">{visit.summary}</p>
                      
                      {visit.outcomes && (
                        <div className="text-sm">
                          <strong>Outcomes:</strong> {visit.outcomes}
                        </div>
                      )}
                      
                      {visit.next_steps && (
                        <div className="text-sm">
                          <strong>Next Steps:</strong> {visit.next_steps}
                        </div>
                      )}
                      
                      {visit.follow_up_date && (
                        <div className="text-sm text-blue-600 mt-2">
                          <strong>Follow-up:</strong> {visit.follow_up_date.toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {companyDetails.visits.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-lg font-semibold mb-2">No visits logged yet</h3>
                <p className="text-gray-600 mb-4">
                  Start tracking your customer interactions by logging your first visit
                </p>
                <Button onClick={onNewVisit} className="bg-green-600 hover:bg-green-700">
                  Log First Visit
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Sales Opportunities</h3>
            <Button onClick={() => setShowOpportunityForm(true)}>
              <span className="mr-2">🎯</span>
              Add Opportunity
            </Button>
          </div>

          <div className="space-y-4">
            {companyDetails.sales_opportunities.map((opportunity: SalesOpportunity) => (
              <Card key={opportunity.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{opportunity.title}</h4>
                      {opportunity.description && (
                        <p className="text-sm text-gray-600 mb-2">{opportunity.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm">
                        {opportunity.value && (
                          <span className="font-medium text-green-600">
                            ${(opportunity.value / 1000).toFixed(0)}K
                          </span>
                        )}
                        <span className="text-gray-500">{opportunity.probability}% probability</span>
                      </div>
                      
                      {opportunity.expected_close_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Expected close: {opportunity.expected_close_date.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <Badge className={getStageColor(opportunity.stage)}>
                      {formatStageLabel(opportunity.stage)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {companyDetails.sales_opportunities.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-lg font-semibold mb-2">No opportunities yet</h3>
                <p className="text-gray-600 mb-4">
                  Track potential sales by creating your first opportunity
                </p>
                <Button onClick={() => setShowOpportunityForm(true)}>
                  Add First Opportunity
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}