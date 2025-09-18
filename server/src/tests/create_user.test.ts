import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input data
const testUserBDM: CreateUserInput = {
  email: 'john.doe@company.com',
  name: 'John Doe',
  role: 'BDM'
};

const testUserManagement: CreateUserInput = {
  email: 'jane.manager@company.com',
  name: 'Jane Manager',
  role: 'MANAGEMENT'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with BDM role', async () => {
    const result = await createUser(testUserBDM);

    // Basic field validation
    expect(result.email).toEqual('john.doe@company.com');
    expect(result.name).toEqual('John Doe');
    expect(result.role).toEqual('BDM');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with MANAGEMENT role', async () => {
    const result = await createUser(testUserManagement);

    expect(result.email).toEqual('jane.manager@company.com');
    expect(result.name).toEqual('Jane Manager');
    expect(result.role).toEqual('MANAGEMENT');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testUserBDM);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toEqual('john.doe@company.com');
    expect(savedUser.name).toEqual('John Doe');
    expect(savedUser.role).toEqual('BDM');
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple users with unique IDs', async () => {
    const user1 = await createUser(testUserBDM);
    const user2 = await createUser(testUserManagement);

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('john.doe@company.com');
    expect(user2.email).toEqual('jane.manager@company.com');

    // Verify both users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });

  it('should handle duplicate email constraint', async () => {
    // Create first user
    await createUser(testUserBDM);

    // Try to create another user with same email
    const duplicateUser: CreateUserInput = {
      email: 'john.doe@company.com', // Same email
      name: 'John Different',
      role: 'MANAGEMENT'
    };

    await expect(createUser(duplicateUser)).rejects.toThrow(/duplicate key value violates unique constraint|UNIQUE constraint failed/i);
  });

  it('should set created_at and updated_at timestamps', async () => {
    const beforeCreate = new Date();
    const result = await createUser(testUserBDM);
    const afterCreate = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });

  it('should handle various email formats', async () => {
    const userWithComplexEmail: CreateUserInput = {
      email: 'user.name+tag@sub-domain.example.co.uk',
      name: 'Complex Email User',
      role: 'BDM'
    };

    const result = await createUser(userWithComplexEmail);
    expect(result.email).toEqual('user.name+tag@sub-domain.example.co.uk');
    expect(result.name).toEqual('Complex Email User');
  });
});