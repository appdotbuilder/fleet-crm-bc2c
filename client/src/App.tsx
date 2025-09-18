import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Dashboard from '@/components/Dashboard';
import CompanyList from '@/components/CompanyList';
import CompanyDetails from '@/components/CompanyDetails';
import VisitForm from '@/components/VisitForm';
import PipelineBoard from '@/components/PipelineBoard';
import UserManagement from '@/components/UserManagement';
import type { User, Company } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize current user - in real app this would come from authentication
  useEffect(() => {
    // Set authenticated user from context/session
    setCurrentUser({
      id: 1,
      email: 'john.doe@company.com',
      name: 'John Doe',
      role: 'BDM',
      created_at: new Date(),
      updated_at: new Date()
    });
  }, []);

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setActiveTab('company-details');
  };

  const handleNewVisit = () => {
    setActiveTab('new-visit');
  };

  const handleBackToList = () => {
    setSelectedCompany(null);
    setActiveTab('companies');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="p-8">
          <CardContent>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading CRM System...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">🚛</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Fleet CRM</h1>
              </div>
              {!isMobile && (
                <Badge variant="secondary" className="ml-4">
                  {currentUser.role}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                Welcome, {currentUser.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('new-visit')}
                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              >
                📝 Quick Visit
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      {isMobile ? (
        <div className="bg-white border-b px-4 py-2 overflow-x-auto">
          <div className="flex space-x-2 min-w-max">
            {[
              { id: 'dashboard', label: '📊 Dashboard' },
              { id: 'companies', label: '🏢 Companies' },
              { id: 'pipeline', label: '🎯 Pipeline' },
              { id: 'new-visit', label: '📝 New Visit' },
              ...(currentUser.role === 'MANAGEMENT' ? [{ id: 'users', label: '👥 Users' }] : [])
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className="whitespace-nowrap text-xs"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        /* Desktop Tabs */
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-auto bg-transparent border-b-0 p-0 space-x-8">
                <TabsTrigger 
                  value="dashboard" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-4 pt-4"
                >
                  📊 Dashboard
                </TabsTrigger>
                <TabsTrigger 
                  value="companies" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-4 pt-4"
                >
                  🏢 Companies
                </TabsTrigger>
                <TabsTrigger 
                  value="pipeline" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-4 pt-4"
                >
                  🎯 Sales Pipeline
                </TabsTrigger>
                <TabsTrigger 
                  value="new-visit" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-4 pt-4"
                >
                  📝 New Visit
                </TabsTrigger>
                {currentUser.role === 'MANAGEMENT' && (
                  <TabsTrigger 
                    value="users" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none pb-4 pt-4"
                  >
                    👥 User Management
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard currentUser={currentUser} />
        )}
        
        {activeTab === 'companies' && (
          <CompanyList 
            currentUser={currentUser}
            onCompanySelect={handleCompanySelect}
          />
        )}
        
        {activeTab === 'company-details' && selectedCompany && (
          <CompanyDetails 
            company={selectedCompany}
            currentUser={currentUser}
            onBack={handleBackToList}
            onNewVisit={handleNewVisit}
          />
        )}
        
        {activeTab === 'pipeline' && (
          <PipelineBoard currentUser={currentUser} />
        )}
        
        {activeTab === 'new-visit' && (
          <VisitForm 
            currentUser={currentUser}
            selectedCompany={selectedCompany}
            onSuccess={() => setActiveTab('dashboard')}
          />
        )}
        
        {activeTab === 'users' && currentUser.role === 'MANAGEMENT' && (
          <UserManagement />
        )}
      </main>
    </div>
  );
}

export default App;