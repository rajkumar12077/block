# Properly updating the MongoDB schema

## 1. Run the migration script

```bash
node src/scripts/update-complaint-schema.js
```

## 2. Update the schema validator in MongoDB (optional but recommended)

If you're using MongoDB schema validation, you'll need to update the validator to include the new enum value.
In the MongoDB shell, you can run:

```javascript
db.runCommand({
  collMod: "complaints",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["status"],
      properties: {
        status: {
          bsonType: "string",
          enum: ["pending", "claimed", "approved", "rejected", "refunded", "cancelled"],
          description: "must be one of the enum values"
        }
      }
    }
  }
})
```

## 3. Update the Mongoose schema definition (already done)

We've updated the schema to include 'cancelled' as a valid status, but Mongoose may be caching the old schema.
After deploying the changes, restart the application to ensure Mongoose uses the updated schema.

## 4. Testing the changes

After implementing these changes, verify that:
1. Existing complaints display correctly
2. New complaints can be cancelled successfully
3. The status is displayed as "CANCELLED" in the UI when a complaint is cancelled

## Note on Schema Migrations

For future schema changes, consider using a migration framework like mongoose-migrate or implementing a versioning system for your schemas.