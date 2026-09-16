UPDATE "queries" SET "status" = 'ASSIGNED' WHERE "status" IN ('CLASSIFYING', 'ROUTED');
UPDATE "queries" SET "status" = 'AUTO_ESCALATED' WHERE "status" = 'ESCALATED';
UPDATE "queries" SET "status" = 'RESOLVED' WHERE "status" = 'CLOSED';
