import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { User, Company, CreateCompanyInput } from '../../../server/src/schema';

interface CompanyFormProps {
  currentUser: User;
  onSuccess: (company: Company) => void;
  company?: Company; // For editing existing company
}

export default function CompanyForm({ currentUser, onSuccess, company }: CompanyFormProps) {
  const [formData, setFormData] = useState<CreateCompanyInput>({
    name: company?.name || '',
    industry: company?.industry || null,
    address: company?.address || null,
    phone: company?.phone || null,
    email: company?.email || null,
    website: company?.website || null,
    fleet_size: company?.fleet_size || null,
    annual_revenue: company?.annual_revenue || null,
    notes: company?.notes || null,
    assigned_bdm: company?.assigned_bdm || currentUser.id
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const industries = [
    'Transportation & Logistics',
    'Construction',
    'Agriculture',
    'Retail & Distribution',
    'Food & Beverage',
    'Manufacturing',
    'Healthcare',
    'Government',
    'Mining & Energy',
    'Waste Management',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await trpc.createCompany.mutate(formData);
      onSuccess(result);
      // Reset form if creating new company
      if (!company) {
        setFormData({
          name: '',
          industry: null,
          address: null,
          phone: null,
          email: null,
          website: null,
          fleet_size: null,
          annual_revenue: null,
          notes: null,
          assigned_bdm: currentUser.id
        });
      }
    } catch (error) {
      console.error('Failed to create company:', error);
      setError('Failed to save company. Please try again.');
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

      {/* Company Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Company Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateCompanyInput) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Enter company name"
          required
        />
      </div>

      {/* Industry */}
      <div className="space-y-2">
        <Label htmlFor="industry">Industry</Label>
        <Select 
          value={formData.industry || ''} 
          onValueChange={(value: string) => 
            setFormData((prev: CreateCompanyInput) => ({ ...prev, industry: value || null }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select industry" />
          </SelectTrigger>
          <SelectContent>
            {industries.map((industry) => (
              <SelectItem key={industry} value={industry}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateCompanyInput) => ({ ...prev, email: e.target.value || null }))
            }
            placeholder="company@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateCompanyInput) => ({ ...prev, phone: e.target.value || null }))
            }
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      {/* Website */}
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          value={formData.website || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateCompanyInput) => ({ ...prev, website: e.target.value || null }))
          }
          placeholder="https://www.company.com"
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={formData.address || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateCompanyInput) => ({ ...prev, address: e.target.value || null }))
          }
          placeholder="Street address, city, state, zip"
          rows={2}
        />
      </div>

      {/* Fleet Size and Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fleet_size">Fleet Size</Label>
          <Input
            id="fleet_size"
            type="number"
            min="0"
            value={formData.fleet_size || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateCompanyInput) => ({ 
                ...prev, 
                fleet_size: e.target.value ? parseInt(e.target.value) : null 
              }))
            }
            placeholder="Number of vehicles"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="annual_revenue">Annual Revenue ($)</Label>
          <Input
            id="annual_revenue"
            type="number"
            min="0"
            step="1000"
            value={formData.annual_revenue || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateCompanyInput) => ({ 
                ...prev, 
                annual_revenue: e.target.value ? parseFloat(e.target.value) : null 
              }))
            }
            placeholder="Annual revenue"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateCompanyInput) => ({ ...prev, notes: e.target.value || null }))
          }
          placeholder="Additional notes about the company..."
          rows={3}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button 
          type="submit" 
          disabled={isLoading || !formData.name.trim()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              {company ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <span className="mr-2">{company ? '💾' : '✅'}</span>
              {company ? 'Update Company' : 'Create Company'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}