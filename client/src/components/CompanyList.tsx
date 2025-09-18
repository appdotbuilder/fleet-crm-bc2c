import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import CompanyForm from '@/components/CompanyForm';
import type { User, Company } from '../../../server/src/schema';

interface CompanyListProps {
  currentUser: User;
  onCompanySelect: (company: Company) => void;
}

export default function CompanyList({ currentUser, onCompanySelect }: CompanyListProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'fleet_size'>('name');
  const [filterBy, setFilterBy] = useState<'all' | 'assigned'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      // For BDM users, filter by assigned companies
      const query = currentUser.role === 'BDM' ? { assigned_bdm: currentUser.id } : {};
      const result = await trpc.getCompanies.query(query);
      setCompanies(result);
      setFilteredCompanies(result);
    } catch (error) {
      console.error('Failed to load companies:', error);
      // Use empty array as fallback since server handlers are stub implementations
      setCompanies([]);
      setFilteredCompanies([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, currentUser.role]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Filter and search companies
  useEffect(() => {
    let filtered = companies;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply assignment filter (only for MANAGEMENT users)
    if (currentUser.role === 'MANAGEMENT' && filterBy === 'assigned') {
      filtered = filtered.filter(company => company.assigned_bdm === currentUser.id);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'fleet_size':
          return (b.fleet_size || 0) - (a.fleet_size || 0);
        default:
          return 0;
      }
    });

    setFilteredCompanies(filtered);
  }, [companies, searchTerm, sortBy, filterBy, currentUser.id, currentUser.role]);

  const handleCompanyCreated = (company: Company) => {
    setCompanies(prev => [company, ...prev]);
    setShowCreateDialog(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <span>🏢</span>
            <span>Companies</span>
          </h2>
          <p className="text-gray-600 mt-1">
            Manage your {currentUser.role === 'BDM' ? 'assigned' : 'team\'s'} customer companies
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <span className="mr-2">➕</span>
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
            </DialogHeader>
            <CompanyForm 
              currentUser={currentUser}
              onSuccess={handleCompanyCreated}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <Input
                placeholder="🔍 Search companies by name, industry, or email..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex space-x-2">
              <Select value={sortBy} onValueChange={(value: 'name' | 'created_at' | 'fleet_size') => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="created_at">Recently Added</SelectItem>
                  <SelectItem value="fleet_size">Fleet Size</SelectItem>
                </SelectContent>
              </Select>

              {currentUser.role === 'MANAGEMENT' && (
                <Select value={filterBy} onValueChange={(value: 'all' | 'assigned') => setFilterBy(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    <SelectItem value="assigned">My Companies</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies Grid */}
      {filteredCompanies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company: Company) => (
            <Card 
              key={company.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => onCompanySelect(company)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                      {company.name}
                    </CardTitle>
                    {company.industry && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {company.industry}
                      </Badge>
                    )}
                  </div>
                  <div className="text-2xl ml-2">🏢</div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-gray-600">
                  {company.fleet_size && (
                    <div className="flex items-center space-x-2">
                      <span>🚛</span>
                      <span>{company.fleet_size} vehicles</span>
                    </div>
                  )}
                  
                  {company.annual_revenue && (
                    <div className="flex items-center space-x-2">
                      <span>💰</span>
                      <span>${(company.annual_revenue / 1000000).toFixed(1)}M revenue</span>
                    </div>
                  )}
                  
                  {company.email && (
                    <div className="flex items-center space-x-2">
                      <span>📧</span>
                      <span className="truncate">{company.email}</span>
                    </div>
                  )}
                  
                  {company.phone && (
                    <div className="flex items-center space-x-2">
                      <span>📞</span>
                      <span>{company.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                    <span>📅</span>
                    <span className="text-xs">Added {company.created_at.toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">🏢</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No companies found' : 'No companies yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search terms or filters'
                  : 'Get started by adding your first customer company'
                }
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <span className="mr-2">➕</span>
                  Add First Company
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}