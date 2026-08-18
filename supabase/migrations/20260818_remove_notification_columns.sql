-- Remove deprecated notification preferences from existing databases.
ALTER TABLE users
  DROP COLUMN IF EXISTS notify_push,
  DROP COLUMN IF EXISTS notify_registration,
  DROP COLUMN IF EXISTS notify_analysis,
  DROP COLUMN IF EXISTS notify_recommend,
  DROP COLUMN IF EXISTS notify_event;
