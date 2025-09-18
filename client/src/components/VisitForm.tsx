import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { User, Company, Contact, CreateVisitInput, VisitType } from '../../../server/src/schema';

interface VisitFormProps {
  currentUser: User;
  selectedCompany?: Company | null;
  onSuccess: () => void;
}

export default function VisitForm({ currentUser, selectedCompany, onSuccess }: VisitFormProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFollowUpCalendar, setShowFollowUpCalendar] = useState(false);

  const [formData, setFormData] = useState<CreateVisitInput>({
    company_id: selectedCompany?.id || 0,
    contact_id: null,
    visit_type: 'SALES_CALL',
    visit_date: new Date(),
    duration_minutes: null,
    summary: '',
    objectives: null,
    outcomes: null,
    next_steps: null,
    follow_up_date: null,
    location: null
  });

  // Load companies if none selected
  const loadCompanies = useCallback(async () => {
    if (selectedCompany) return;
    
    try {
      const query = currentUser.role === 'BDM' ? { assigned_bdm: currentUser.id } : {};
      const result = await trpc.getCompanies.query(query);
      setCompanies(result);
    } catch (error) {
      console.error('Failed to load companies:', error);
      // Use empty array as fallback since server handlers are stub implementations
      setCompanies([]);
    }
  }, [currentUser.id, currentUser.role, selectedCompany]);

  // Load contacts for selected company
  const loadContacts = useCallback(async (companyId: number) => {
    try {
      const result = await trpc.getContacts.query({ companyId });
      setContacts(result);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      // Use empty array as fallback since server handlers are stub implementations
      setContacts([]);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (formData.company_id > 0) {
      loadContacts(formData.company_id);
    }
  }, [formData.company_id, loadContacts]);

  const visitTypes: { value: VisitType; label: string; icon: string }[] = [
    { value: 'SALES_CALL', label: 'Sales Call', icon: '📞' },
    { value: 'FOLLOW_UP', label: 'Follow-up', icon: '🔄' },
    { value: 'DEMO', label: 'Product Demo', icon: '🎬' },
    { value: 'SUPPORT', label: 'Support Visit', icon: '🛠️' },
    { value: 'OTHER', label: 'Other', icon: '📋' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_id || !formData.summary.trim()) {
      setError('Please select a company and provide a visit summary.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await trpc.createVisit.mutate(formData);
      
      // Reset form
      setFormData({
        company_id: selectedCompany?.id || 0,
        contact_id: null,
        visit_type: 'SALES_CALL',
        visit_date: new Date(),
        duration_minutes: null,
        summary: '',
        objectives: null,
        outcomes: null,
        next_steps: null,
        follow_up_date: null,
        location: null
      });
      
      onSuccess();
    } catch (error) {
      console.error('Failed to create visit:', error);
      setError('Failed to log visit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <span>📝</span>
            <span>Log New Visit</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Record your customer visit details for tracking and follow-up
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Company Selection */}
            {!selectedCompany ? (
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Select 
                  value={formData.company_id > 0 ? formData.company_id.toString() : 'select'} 
                  onValueChange={(value: string) => 
                    setFormData((prev: CreateVisitInput) => ({ 
                      ...prev, 
                      company_id: parseInt(value),
                      contact_id: null // Reset contact when company changes
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Company</Label>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span>🏢</span>
                    <span className="font-medium text-blue-900">{selectedCompany.name}</span>
                    <Badge variant="secondary" className="text-xs">Pre-selected</Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Selection */}
            {contacts.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="contact">Contact Person</Label>
                <Select 
                  value={formData.contact_id?.toString() || 'none'} 
                  onValueChange={(value: string) => 
                    setFormData((prev: CreateVisitInput) => ({ 
                      ...prev, 
                      contact_id: value === 'none' ? null : parseInt(value) 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific contact</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id.toString()}>
                        <div className="flex items-center space-x-2">
                          <span>{contact.name}</span>
                          {contact.position && (
                            <span className="text-sm text-gray-500">- {contact.position}</span>
                          )}
                          {contact.is_primary && (
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Visit Type and Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visit_type">Visit Type *</Label>
                <Select 
                  value={formData.visit_type} 
                  onValueChange={(value: VisitType) => 
                    setFormData((prev: CreateVisitInput) => ({ ...prev, visit_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visitTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visit_date">Visit Date *</Label>
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <span className="mr-2">📅</span>
                      {formData.visit_date.toLocaleDateString()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.visit_date}
                      onSelect={(date: Date | undefined) => {
                        if (date) {
                          setFormData((prev: CreateVisitInput) => ({ ...prev, visit_date: date }));
                          setShowCalendar(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Duration and Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  step="15"
                  value={formData.duration_minutes || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateVisitInput) => ({ 
                      ...prev, 
                      duration_minutes: e.target.value ? parseInt(e.target.value) : null 
                    }))
                  }
                  placeholder="e.g., 60"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateVisitInput) => ({ 
                      ...prev, 
                      location: e.target.value || null 
                    }))
                  }
                  placeholder="Customer site, office, etc."
                />
              </div>
            </div>

            {/* Visit Summary */}
            <div className="space-y-2">
              <Label htmlFor="summary">Visit Summary *</Label>
              <Textarea
                id="summary"
                value={formData.summary}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateVisitInput) => ({ ...prev, summary: e.target.value }))
                }
                placeholder="Provide a brief summary of the visit..."
                rows={3}
                required
              />
            </div>

            {/* Objectives */}
            <div className="space-y-2">
              <Label htmlFor="objectives">Visit Objectives</Label>
              <Textarea
                id="objectives"
                value={formData.objectives || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateVisitInput) => ({ 
                    ...prev, 
                    objectives: e.target.value || null 
                  }))
                }
                placeholder="What were the main objectives for this visit?"
                rows={2}
              />
            </div>

            {/* Outcomes */}
            <div className="space-y-2">
              <Label htmlFor="outcomes">Key Outcomes</Label>
              <Textarea
                id="outcomes"
                value={formData.outcomes || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateVisitInput) => ({ 
                    ...prev, 
                    outcomes: e.target.value || null 
                  }))
                }
                placeholder="What were the key outcomes and decisions made?"
                rows={2}
              />
            </div>

            {/* Next Steps */}
            <div className="space-y-2">
              <Label htmlFor="next_steps">Next Steps</Label>
              <Textarea
                id="next_steps"
                value={formData.next_steps || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateVisitInput) => ({ 
                    ...prev, 
                    next_steps: e.target.value || null 
                  }))
                }
                placeholder="What are the agreed next steps?"
                rows={2}
              />
            </div>

            {/* Follow-up Date */}
            <div className="space-y-2">
              <Label htmlFor="follow_up_date">Follow-up Date</Label>
              <Popover open={showFollowUpCalendar} onOpenChange={setShowFollowUpCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <span className="mr-2">🗓️</span>
                    {formData.follow_up_date 
                      ? formData.follow_up_date.toLocaleDateString()
                      : 'Set follow-up date (optional)'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.follow_up_date || undefined}
                    onSelect={(date: Date | undefined) => {
                      setFormData((prev: CreateVisitInput) => ({ ...prev, follow_up_date: date || null }));
                      setShowFollowUpCalendar(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {formData.follow_up_date && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData((prev: CreateVisitInput) => ({ ...prev, follow_up_date: null }))}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear follow-up date
                </Button>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
              <Button 
                type="submit" 
                disabled={isLoading || !formData.company_id || !formData.summary.trim()}
                className="bg-green-600 hover:bg-green-700 order-2 sm:order-1"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Logging Visit...
                  </>
                ) : (
                  <>
                    <span className="mr-2">✅</span>
                    Log Visit
                  </>
                )}
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={() => onSuccess()}
                disabled={isLoading}
                className="order-1 sm:order-2"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}