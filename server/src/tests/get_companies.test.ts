import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, companiesTable } from '../db/schema';
import { type GetCompaniesQuery } from '../schema';
import { getCompanies } from '../handlers/get_companies';
import { eq } from 'drizzle-orm';

// Test data for users
const testUser1 = {
  email: 'bdm1@example.com',
  name: 'BDM User 1',
  role: 'BDM' as const
};

const testUser2 = {
  email: 'bdm2@example.com',
  name: 'BDM User 2',
  role: 'BDM' as const
};

const testUser3 = {
  email: 'manager@example.com',
  name: 'Manager User',
  role: 'MANAGEMENT' as const
};

// Test data for companies
const testCompany1 = {
  name: 'Tech Corp',
  industry: 'Technology',
  address: '123 Tech Street',
  phone: '555-0101',
  email: 'contact@techcorp.com',
  website: 'https://techcorp.com',
  fleet_size: 50,
  annual_revenue: 1500000.50,
  notes: 'Major client'
};

const testCompany2 = {
  name: 'Manufacturing Inc',
  industry: 'Manufacturing',
  address: '456 Factory Ave',
  phone: '555-0102',
  email: 'info@manufacturing.com',
  website: 'https://manufacturing.com',
  fleet_size: 100,
  annual_revenue: 2750000.75,
  notes: 'Growing company'
};

const testCompany3 = {
  name: 'Small Business',
  industry: 'Retail',
  address: null,
  phone: null,
  email: null,
  website: null,
  fleet_size: null,
  annual_revenue: null,
  notes: null
};

describe('getCompanies', () => {
  let user1Id: number, user2Id: number, user3Id: number;
  
  beforeEach(async () => {
    await createDB();
    
    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2, testUser3])
      .returning()
      .execute();
    
    user1Id = users[0].id;
    user2Id = users[1].id;
    user3Id = users[2].id;
  });
  
  afterEach(resetDB);

  it('should return all companies when no filters are applied', async () => {
    // Create test companies assigned to different BDMs
    await db.insert(companiesTable)
      .values([
        {
          ...testCompany1,
          annual_revenue: testCompany1.annual_revenue.toString(),
          created_by: user1Id,
          assigned_bdm: user1Id
        },
        {
          ...testCompany2,
          annual_revenue: testCompany2.annual_revenue.toString(),
          created_by: user2Id,
          assigned_bdm: user2Id
        },
        {
          ...testCompany3,
          created_by: user3Id,
          assigned_bdm: user1Id
        }
      ])
      .execute();

    const result = await getCompanies();

    expect(result).toHaveLength(3);
    
    // Verify all companies are present (order may vary due to timestamps)
    const companyNames = result.map(c => c.name).sort();
    expect(companyNames).toEqual(['Manufacturing Inc', 'Small Business', 'Tech Corp']);
    
    // Find each company and verify numeric conversion
    const techCorp = result.find(c => c.name === 'Tech Corp');
    const manufacturing = result.find(c => c.name === 'Manufacturing Inc');
    const smallBusiness = result.find(c => c.name === 'Small Business');
    
    expect(techCorp?.annual_revenue).toEqual(1500000.50);
    expect(typeof techCorp?.annual_revenue).toBe('number');
    expect(manufacturing?.annual_revenue).toEqual(2750000.75);
    expect(typeof manufacturing?.annual_revenue).toBe('number');
    expect(smallBusiness?.annual_revenue).toBeNull();
  });

  it('should filter companies by assigned_bdm', async () => {
    // Create test companies assigned to different BDMs
    await db.insert(companiesTable)
      .values([
        {
          ...testCompany1,
          annual_revenue: testCompany1.annual_revenue.toString(),
          created_by: user1Id,
          assigned_bdm: user1Id
        },
        {
          ...testCompany2,
          annual_revenue: testCompany2.annual_revenue.toString(),
          created_by: user2Id,
          assigned_bdm: user2Id
        },
        {
          ...testCompany3,
          created_by: user1Id,
          assigned_bdm: user1Id
        }
      ])
      .execute();

    const query: GetCompaniesQuery = {
      assigned_bdm: user1Id
    };

    const result = await getCompanies(query);

    expect(result).toHaveLength(2);
    expect(result.every(company => company.assigned_bdm === user1Id)).toBe(true);
    
    // Verify both companies assigned to user1 are returned
    const companyNames = result.map(c => c.name).sort();
    expect(companyNames).toEqual(['Small Business', 'Tech Corp']);
  });

  it('should apply limit parameter correctly', async () => {
    // Create multiple test companies
    await db.insert(companiesTable)
      .values([
        {
          ...testCompany1,
          annual_revenue: testCompany1.annual_revenue.toString(),
          created_by: user1Id,
          assigned_bdm: user1Id
        },
        {
          ...testCompany2,
          annual_revenue: testCompany2.annual_revenue.toString(),
          created_by: user2Id,
          assigned_bdm: user2Id
        },
        {
          ...testCompany3,
          created_by: user3Id,
          assigned_bdm: user1Id
        }
      ])
      .execute();

    const query: GetCompaniesQuery = {
      limit: 2
    };

    const result = await getCompanies(query);

    expect(result).toHaveLength(2);
    // Just verify we got the correct number, order may vary due to timestamps
    expect(result.every(company => ['Tech Corp', 'Manufacturing Inc', 'Small Business'].includes(company.name))).toBe(true);
  });

  it('should apply offset parameter correctly', async () => {
    // Create multiple test companies
    await db.insert(companiesTable)
      .values([
        {
          ...testCompany1,
          annual_revenue: testCompany1.annual_revenue.toString(),
          created_by: user1Id,
          assigned_bdm: user1Id
        },
        {
          ...testCompany2,
          annual_revenue: testCompany2.annual_revenue.toString(),
          created_by: user2Id,
          assigned_bdm: user2Id
        },
        {
          ...testCompany3,
          created_by: user3Id,
          assigned_bdm: user1Id
        }
      ])
      .execute();

    const query: GetCompaniesQuery = {
      offset: 1
    };

    const result = await getCompanies(query);

    expect(result).toHaveLength(2);
    // Just verify we got the correct number of results after offset
    expect(result.every(company => ['Tech Corp', 'Manufacturing Inc', 'Small Business'].includes(company.name))).toBe(true);
  });

  it('should apply limit and offset together for pagination', async () => {
    // Create multiple test companies
    await db.insert(companiesTable)
      .values([
        {
          ...testCompany1,
          annual_revenue: testCompany1.annual_revenue.toString(),
          created_by: user1Id,
          assigned_bdm: user1Id
        },
        {
          ...testCompany2,
          annual_revenue: testCompany2.annual_revenue.toString(),
          created_by: user2Id,
          assigned_bdm: user2Id
        },
        {
          ...testCompany3,
          created_by: user3Id,
          assigned_bdm: user1Id
        }
      ])
      .execute();

    const query: GetCompaniesQuery = {
      limit: 1,
      offset: 1
    };

    const result = await getCompanies(query);

    expect(result).toHaveLength(1);
    // Just verify we got exactly one result with correct pagination
    expect(['Tech Corp', 'Manufacturing Inc', 'Small Business'].includes(result[0].name)).toBe(true);
  });

  it('should combine all filters correctly', async () => {
    // Create test companies for different BDMs
    await db.insert(companiesTable)
      .values([
        {
          ...testCompany1,
          annual_revenue: testCompany1.annual_revenue.toString(),
          created_by: user1Id,
          assigned_bdm: user1Id
        },
        {
          ...testCompany2,
          annual_revenue: testCompany2.annual_revenue.toString(),
          created_by: user1Id,
          assigned_bdm: user1Id
        },
        {
          ...testCompany3,
          created_by: user1Id,
          assigned_bdm: user1Id
        },
        {
          name: 'Another Company',
          industry: 'Services',
          created_by: user2Id,
          assigned_bdm: user2Id
        }
      ])
      .execute();

    const query: GetCompaniesQuery = {
      assigned_bdm: user1Id,
      limit: 2,
      offset: 1
    };

    const result = await getCompanies(query);

    expect(result).toHaveLength(2);
    expect(result.every(company => company.assigned_bdm === user1Id)).toBe(true);
    
    // Verify we get 2 companies assigned to user1 after skipping 1
    const companyNames = result.map(c => c.name).sort();
    const expectedNames = ['Tech Corp', 'Manufacturing Inc', 'Small Business'];
    expect(result.every(company => expectedNames.includes(company.name))).toBe(true);
  });

  it('should return empty array when no companies match filter', async () => {
    // Create test companies for user1
    await db.insert(companiesTable)
      .values([
        {
          ...testCompany1,
          annual_revenue: testCompany1.annual_revenue.toString(),
          created_by: user1Id,
          assigned_bdm: user1Id
        }
      ])
      .execute();

    const query: GetCompaniesQuery = {
      assigned_bdm: user2Id // Filter by user2 who has no companies
    };

    const result = await getCompanies(query);

    expect(result).toHaveLength(0);
  });

  it('should save companies to database correctly', async () => {
    // Create test company
    const insertedCompanies = await db.insert(companiesTable)
      .values([
        {
          ...testCompany1,
          annual_revenue: testCompany1.annual_revenue.toString(),
          created_by: user1Id,
          assigned_bdm: user1Id
        }
      ])
      .returning()
      .execute();

    // Verify it's saved correctly in database
    const dbCompanies = await db.select()
      .from(companiesTable)
      .where(eq(companiesTable.id, insertedCompanies[0].id))
      .execute();

    expect(dbCompanies).toHaveLength(1);
    expect(dbCompanies[0].name).toEqual('Tech Corp');
    expect(dbCompanies[0].industry).toEqual('Technology');
    expect(parseFloat(dbCompanies[0].annual_revenue!)).toEqual(1500000.50);
    expect(dbCompanies[0].assigned_bdm).toEqual(user1Id);
    expect(dbCompanies[0].created_at).toBeInstanceOf(Date);
    expect(dbCompanies[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle companies with null numeric values correctly', async () => {
    await db.insert(companiesTable)
      .values([
        {
          ...testCompany3,
          created_by: user1Id,
          assigned_bdm: user1Id
        }
      ])
      .execute();

    const result = await getCompanies();

    expect(result).toHaveLength(1);
    expect(result[0].annual_revenue).toBeNull();
    expect(result[0].fleet_size).toBeNull();
    expect(result[0].industry).toEqual('Retail'); // testCompany3 has industry: 'Retail'
    expect(result[0].address).toBeNull();
  });
});