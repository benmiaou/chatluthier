# ChatLuthier Admin Management Scripts

This directory contains scripts for managing administrator privileges in ChatLuthier.

## Available Scripts

### 1. `makeAdmin.js` - Grant Admin Privileges

**Usage:**
```bash
node scripts/makeAdmin.js <userId|userPseudo>
```

**Examples:**
```bash
# Make user with ID "user_123" an admin
node scripts/makeAdmin.js user_123

# Make user with pseudo "john_doe" an admin  
node scripts/makeAdmin.js john_doe
```

**What it does:**
- Connects to the SQLite database
- Finds the user by ID or pseudo
- Sets `is_admin = TRUE` in the users table
- Updates the `updated_at` timestamp
- Shows success message with user details

**Error handling:**
- If user not found: Shows list of available users
- If user already admin: Informs user is already admin
- If database error: Shows error message

### 2. `removeAdmin.js` - Revoke Admin Privileges

**Usage:**
```bash
node scripts/removeAdmin.js <userId|userPseudo>
```

**Examples:**
```bash
# Remove admin from user with ID "user_123"
node scripts/removeAdmin.js user_123

# Remove admin from user with pseudo "john_doe"
node scripts/removeAdmin.js john_doe
```

**What it does:**
- Connects to the SQLite database
- Finds the user by ID or pseudo
- Sets `is_admin = FALSE` in the users table
- Updates the `updated_at` timestamp
- Shows success message with user details

**Error handling:**
- If user not found: Shows list of available users
- If user not admin: Informs user is not an admin
- If database error: Shows error message

## Requirements

- Node.js v14+
- SQLite database must be accessible
- Scripts must be run from the project root directory

## Database Schema

The scripts work with the following users table structure:

```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    pseudo TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    secret_question TEXT,
    secret_answer_hash TEXT,
    is_admin BOOLEAN DEFAULT FALSE,  -- This is what we modify
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Notes

1. **Run scripts carefully**: These scripts directly modify database records
2. **Backup first**: Consider backing up your database before making changes
3. **Restrict access**: Keep these scripts secure as they provide admin access
4. **Audit trail**: Changes are logged with timestamps in the `updated_at` field

## Troubleshooting

**"Database connection established" but no users found:**
- Check that your database file exists and is accessible
- Verify users have been created in the system

**SQLITE_ERROR: no such table: users:**
- Run the database initialization script first
- Check that the database schema matches expectations

**Permission denied:**
- Ensure you have read/write access to the database file
- Run scripts with appropriate permissions

## Example Workflow

```bash
# List users (run with invalid user to see list)
node scripts/makeAdmin.js nonexistent

# Make a user admin
node scripts/makeAdmin.js john_doe

# Verify user is now admin
node scripts/makeAdmin.js john_doe

# Remove admin privileges later
node scripts/removeAdmin.js john_doe
```