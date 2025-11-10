-- Add serial_number_left and serial_number_right columns to devices table
-- This migration adds support for bilateral devices with separate serial numbers

-- Add new columns
ALTER TABLE devices ADD COLUMN serial_number_left VARCHAR(100);
ALTER TABLE devices ADD COLUMN serial_number_right VARCHAR(100);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS ix_device_serial_left ON devices(serial_number_left);
CREATE INDEX IF NOT EXISTS ix_device_serial_right ON devices(serial_number_right);

-- Optional: Migrate existing bilateral devices
-- If a device has ear='BILATERAL' and serial_number contains 'L:' and 'R:' format,
-- split them into separate columns
UPDATE devices 
SET 
  serial_number_left = SUBSTR(serial_number, INSTR(serial_number, 'L:') + 2, 
                              INSTR(serial_number, ',') - INSTR(serial_number, 'L:') - 2),
  serial_number_right = SUBSTR(serial_number, INSTR(serial_number, 'R:') + 2)
WHERE ear = 'BILATERAL' 
  AND serial_number LIKE '%L:%' 
  AND serial_number LIKE '%R:%';
