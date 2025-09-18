import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { trpc } from '@/utils/trpc';
import type { Contact, CreateContactInput } from '../../../server/src/schema';

interface ContactFormProps {
  companyId: number;
  onSuccess: (contact: Contact) => void;
  contact?: Contact; // For editing existing contact
}

export default function ContactForm({ companyId, onSuccess, contact }: ContactFormProps) {
  const [formData, setFormData] = useState<CreateContactInput>({
    company_id: companyId,
    name: contact?.name || '',
    position: contact?.position || null,
    phone: contact?.phone || null,
    email: contact?.email || null,
    is_primary: contact?.is_primary || false,
    notes: contact?.notes || null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Contact name is required.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const result = await trpc.createContact.mutate(formData);
      onSuccess(result);
      
      // Reset form if creating new contact
      if (!contact) {
        setFormData({
          company_id: companyId,
          name: '',
          position: null,
          phone: null,
          email: null,
          is_primary: false,
          notes: null
        });
      }
    } catch (error) {
      console.error('Failed to create contact:', error);
      setError('Failed to save contact. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Contact Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateContactInput) => ({ ...prev, name: e.target.value }))
          }
          placeholder="John Smith"
          required
        />
      </div>

      {/* Position */}
      <div className="space-y-2">
        <Label htmlFor="position">Position/Title</Label>
        <Input
          id="position"
          value={formData.position || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateContactInput) => ({ 
              ...prev, 
              position: e.target.value || null 
            }))
          }
          placeholder="Fleet Manager, CEO, etc."
        />
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
              setFormData((prev: CreateContactInput) => ({ 
                ...prev, 
                email: e.target.value || null 
              }))
            }
            placeholder="john@company.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateContactInput) => ({ 
                ...prev, 
                phone: e.target.value || null 
              }))
            }
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      {/* Primary Contact */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_primary"
          checked={formData.is_primary || false}
          onCheckedChange={(checked: boolean) =>
            setFormData((prev: CreateContactInput) => ({ 
              ...prev, 
              is_primary: checked 
            }))
          }
        />
        <Label htmlFor="is_primary" className="text-sm">
          Primary contact for this company
        </Label>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateContactInput) => ({ 
              ...prev, 
              notes: e.target.value || null 
            }))
          }
          placeholder="Additional information about this contact..."
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
              {contact ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <span className="mr-2">{contact ? '💾' : '✅'}</span>
              {contact ? 'Update Contact' : 'Add Contact'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}