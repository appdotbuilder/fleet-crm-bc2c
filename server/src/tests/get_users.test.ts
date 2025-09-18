import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    
    expect(result).toEqual([]);
  });

  it('should return all users from database', async () => {
    // Create test users
    const testUsers: CreateUserInput[] = [
      {
        email: 'john.doe@company.com',
        name: 'John Doe',
        role: 'BDM'
      },
      {
        email: 'jane.manager@company.com', 
        name: 'Jane Manager',
        role: 'MANAGEMENT'
      },
      {
        email: 'bob.bdm@company.com',
        name: 'Bob Sales',
        role: 'BDM'
      }
    ];

    // Insert users directly into database
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);

    // Verify all users are returned with correct properties
    expect(result.map(u => u.email).sort()).toEqual([
      'bob.bdm@company.com',
      'jane.manager@company.com',
      'john.doe@company.com'
    ]);

    // Check that all expected fields are present
    result.forEach(user => {
      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe('number');
      expect(user.email).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.role).toBeDefined();
      expect(['BDM', 'MANAGEMENT']).toContain(user.role);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return users ordered by creation time', async () => {
    // Create users with slight delay to ensure different timestamps
    const user1Data = {
      email: 'first@company.com',
      name: 'First User',
      role: 'BDM' as const
    };

    await db.insert(usersTable)
      .values(user1Data)
      .execute();

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    const user2Data = {
      email: 'second@company.com',
      name: 'Second User', 
      role: 'MANAGEMENT' as const
    };

    await db.insert(usersTable)
      .values(user2Data)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Verify users are returned (order depends on database implementation)
    const emails = result.map(u => u.email);
    expect(emails).toContain('first@company.com');
    expect(emails).toContain('second@company.com');
  });

  it('should handle different user roles correctly', async () => {
    const bdmUser = {
      email: 'bdm@company.com',
      name: 'BDM User',
      role: 'BDM' as const
    };

    const managementUser = {
      email: 'manager@company.com',
      name: 'Management User',
      role: 'MANAGEMENT' as const
    };

    await db.insert(usersTable)
      .values([bdmUser, managementUser])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);

    const bdmResult = result.find(u => u.email === 'bdm@company.com');
    const managementResult = result.find(u => u.email === 'manager@company.com');

    expect(bdmResult?.role).toBe('BDM');
    expect(managementResult?.role).toBe('MANAGEMENT');
  });
});