import { db } from '../db';
import { companiesTable } from '../db/schema';
import { type UpdateCompanyInput, type Company } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCompany = async (input: UpdateCompanyInput): Promise<Company> => {
  try {
    // First check if the company exists
    const existingCompany = await db.select()
      .from(companiesTable)
      .where(eq(companiesTable.id, input.id))
      .execute();

    if (existingCompany.length === 0) {
      throw new Error(`Company with id ${input.id} not found`);
    }

    // Prepare update values, excluding the id and handling numeric conversions
    const updateValues: any = {
      updated_at: new Date()
    };

    // Only include fields that are provided in the input
    if (input.name !== undefined) {
      updateValues.name = input.name;
    }
    if (input.industry !== undefined) {
      updateValues.industry = input.industry;
    }
    if (input.address !== undefined) {
      updateValues.address = input.address;
    }
    if (input.phone !== undefined) {
      updateValues.phone = input.phone;
    }
    if (input.email !== undefined) {
      updateValues.email = input.email;
    }
    if (input.website !== undefined) {
      updateValues.website = input.website;
    }
    if (input.fleet_size !== undefined) {
      updateValues.fleet_size = input.fleet_size;
    }
    if (input.annual_revenue !== undefined) {
      // Convert number to string for numeric column
      updateValues.annual_revenue = input.annual_revenue?.toString() || null;
    }
    if (input.notes !== undefined) {
      updateValues.notes = input.notes;
    }
    if (input.assigned_bdm !== undefined) {
      updateValues.assigned_bdm = input.assigned_bdm;
    }

    // Update the company
    const result = await db.update(companiesTable)
      .set(updateValues)
      .where(eq(companiesTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const company = result[0];
    return {
      ...company,
      annual_revenue: company.annual_revenue ? parseFloat(company.annual_revenue) : null
    };
  } catch (error) {
    console.error('Company update failed:', error);
    throw error;
  }
};