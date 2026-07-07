-- Add availability time columns to staff table
ALTER TABLE staff
ADD COLUMN available_from TIME DEFAULT NULL,
ADD COLUMN available_to TIME DEFAULT NULL;
