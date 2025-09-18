import { db } from '../db';
import { companiesTable } from '../db/schema';
import { type CreateCompanyInput, type Company } from '../schema';

export const createCompany = async (input: CreateCompanyInput, userId: number): Promise<Company> => {
  try {
    // Insert company record
    const result = await db.insert(companiesTable)
      .values({
        name: input.name,
        industry: input.industry || null,
        address: input.address || null,
        phone: input.phone || null,
        email: input.email || null,
        website: input.website || null,
        fleet_size: input.fleet_size || null,
        annual_revenue: input.annual_revenue !== undefined && input.annual_revenue !== null ? input.annual_revenue.toString() : null, // Convert number to string for numeric column
        notes: input.notes || null,
        created_by: userId,
        assigned_bdm: input.assigned_bdm
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const company = result[0];
    return {
      ...company,
      annual_revenue: company.annual_revenue !== null ? parseFloat(company.annual_revenue) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Company creation failed:', error);
    throw error;
  }
};