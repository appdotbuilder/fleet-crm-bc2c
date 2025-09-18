import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Company, 
  Contact, 
  SalesOpportunity, 
  CreateSalesOpportunityInput, 
  PipelineStage 
} from '../../../server/src/schema';

interface OpportunityFormProps {
  company: Company & { contacts?: Contact[] };
  currentUser: User;
  onSuccess: (opportunity: SalesOpportunity) => void;
  opportunity?: SalesOpportunity; // For editing existing opportunity
}

export default function OpportunityForm({ 
  company, 
  onSuccess, 
  opportunity 
}: OpportunityFormProps) {
  const [formData, setFormData] = useState<CreateSalesOpportunityInput>({
    company_id: company.id,
    contact_id: opportunity?.contact_id || null,
    title: opportunity?.title || '',
    description: opportunity?.description || null,
    value: opportunity?.value || null,
    probability: opportunity?.probability || 50,
    stage: opportunity?.stage || 'LEAD',
    expected_close_date: opportunity?.expected_close_date || null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const stages: { value: PipelineStage; label: string; color: string }[] = [
    { value: 'LEAD', label: 'Lead', color: 'text-gray-700' },
    { value: 'QUALIFIED', label: 'Qualified', color: 'text-blue-700' },
    { value: 'PROPOSAL', label: 'Proposal', color: 'text-yellow-700' },
    { value: 'NEGOTIATION', label: 'Negotiation', color: 'text-orange-700' },
    { value: 'CLOSED_WON', label: 'Closed Won', color: 'text-green-700' },
    { value: 'CLOSED_LOST', label: 'Closed Lost', color: 'text-red-700' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Opportunity title is required.');
      return;
    }

    if (formData.probability < 0 || formData.probability > 100) {
      setError('Probability must be between 0 and 100.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const result = await trpc.createSalesOpportunity.mutate(formData);
      onSuccess(result);
      
      // Reset form if creating new opportunity
      if (!opportunity) {
        setFormData({
          company_id: company.id,
          contact_id: null,
          title: '',
          description: null,
          value: null,
          probability: 50,
          stage: 'LEAD',
          expected_close_date: null
        });
      }
    } catch (error) {
      console.error('Failed to create opportunity:', error);
      setError('Failed to save opportunity. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Opportunity Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Opportunity Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateSalesOpportunityInput) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Fleet vehicle upgrade, new truck purchase, etc."
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateSalesOpportunityInput) => ({ 
              ...prev, 
              description: e.target.value || null 
            }))
          }
          placeholder="Detailed description of the opportunity..."
          rows={3}
        />
      </div>

      {/* Contact Selection */}
      {company.contacts && company.contacts.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="contact">Associated Contact</Label>
          <Select 
            value={formData.contact_id?.toString() || 'none'} 
            onValueChange={(value: string) => 
              setFormData((prev: CreateSalesOpportunityInput) => ({ 
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
              {company.contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id.toString()}>
                  <div className="flex items-center space-x-2">
                    <span>{contact.name}</span>
                    {contact.position && (
                      <span className="text-sm text-gray-500">- {contact.position}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Value and Probability */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="value">Opportunity Value ($)</Label>
          <Input
            id="value"
            type="number"
            min="0"
            step="1000"
            value={formData.value || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateSalesOpportunityInput) => ({ 
                ...prev, 
                value: e.target.value ? parseFloat(e.target.value) : null 
              }))
            }
            placeholder="50000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="probability">Probability (%)</Label>
          <Input
            id="probability"
            type="number"
            min="0"
            max="100"
            step="5"
            value={formData.probability}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateSalesOpportunityInput) => ({ 
                ...prev, 
                probability: parseInt(e.target.value) || 0 
              }))
            }
            required
          />
        </div>
      </div>

      {/* Stage */}
      <div className="space-y-2">
        <Label htmlFor="stage">Pipeline Stage</Label>
        <Select 
          value={formData.stage} 
          onValueChange={(value: PipelineStage) => 
            setFormData((prev: CreateSalesOpportunityInput) => ({ ...prev, stage: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stages.map((stage) => (
              <SelectItem key={stage.value} value={stage.value}>
                <span className={stage.color}>{stage.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expected Close Date */}
      <div className="space-y-2">
        <Label htmlFor="expected_close_date">Expected Close Date</Label>
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <span className="mr-2">📅</span>
              {formData.expected_close_date 
                ? formData.expected_close_date.toLocaleDateString()
                : 'Select expected close date (optional)'
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.expected_close_date || undefined}
              onSelect={(date: Date | undefined) => {
                setFormData((prev: CreateSalesOpportunityInput) => ({ 
                  ...prev, 
                  expected_close_date: date || null 
                }));
                setShowCalendar(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {formData.expected_close_date && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => 
              setFormData((prev: CreateSalesOpportunityInput) => ({ 
                ...prev, 
                expected_close_date: null 
              }))
            }
            className="text-red-600 hover:text-red-700"
          >
            Clear date
          </Button>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button 
          type="submit" 
          disabled={isLoading || !formData.title.trim()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              {opportunity ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <span className="mr-2">{opportunity ? '💾' : '🎯'}</span>
              {opportunity ? 'Update Opportunity' : 'Create Opportunity'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}