import { db } from '../db';
import { salesOpportunitiesTable } from '../db/schema';
import { type UpdateSalesOpportunityInput, type SalesOpportunity } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateSalesOpportunity(input: UpdateSalesOpportunityInput): Promise<SalesOpportunity> {
  try {
    // First, check if the opportunity exists
    const existing = await db.select()
      .from(salesOpportunitiesTable)
      .where(eq(salesOpportunitiesTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error(`Sales opportunity with id ${input.id} not found`);
    }

    // Prepare the update data
    const updateData: any = {
      updated_at: new Date()
    };

    // Add provided fields to update data
    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.value !== undefined) {
      updateData.value = input.value !== null ? input.value.toString() : null;
    }
    if (input.probability !== undefined) {
      updateData.probability = input.probability;
    }
    if (input.expected_close_date !== undefined) {
      updateData.expected_close_date = input.expected_close_date;
    }
    if (input.actual_close_date !== undefined) {
      updateData.actual_close_date = input.actual_close_date;
    }

    // Handle stage updates - auto-set actual_close_date for closed stages
    if (input.stage !== undefined) {
      updateData.stage = input.stage;
      if ((input.stage === 'CLOSED_WON' || input.stage === 'CLOSED_LOST') && input.actual_close_date === undefined) {
        updateData.actual_close_date = new Date();
      }
    }

    // Update the opportunity
    const result = await db.update(salesOpportunitiesTable)
      .set(updateData)
      .where(eq(salesOpportunitiesTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const opportunity = result[0];
    return {
      ...opportunity,
      value: opportunity.value ? parseFloat(opportunity.value) : null
    };
  } catch (error) {
    console.error('Sales opportunity update failed:', error);
    throw error;
  }
}