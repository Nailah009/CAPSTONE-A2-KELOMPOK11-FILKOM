# Report ID Format Change - Summary

## Changes Made

### 1. New Report ID Format
**Old Format:** `RPT-{TIMESTAMP_MS}` (e.g., `RPT-1779702463245`)
**New Format:** `RPT-{CAMERAID}-{DDMMYYYY}` (e.g., `RPT-CAM-LAPTOP-25052026`)

### 2. Implementation Details

#### Backend Changes (server.js)
- Added `formatDateDDMMYYYY()` function to format date as DDMMYYYY
- Updated `insertReport()` function to generate IDs with new format
- Added uniqueness handling: if multiple violations occur on same day from same camera, counter is appended
  - First report: `RPT-CAM-01-25052026`
  - Second report same day: `RPT-CAM-01-25052026-02`
  - Third report same day: `RPT-CAM-01-25052026-03`

#### Migration Script (migrate_report_ids.js)
- Created migration script to update all existing reports in database
- Successfully migrated 16 existing reports
- Examples of migrated IDs:
  - `RPT-1779702463245` → `RPT-CAM-LAPTOP-25052026`
  - `RPT-1779714296645` → `RPT-CAM-LAPTOP-25052026-10`
  - `RPT-1779777405466` → `RPT-CAM-LAPTOP-26052026`

## Benefits

✅ **More Readable**: Immediately see which camera and what date
✅ **Better Tracking**: Easy to group violations by camera and date
✅ **Unique IDs**: Counter ensures uniqueness even with multiple violations
✅ **Human-Friendly**: No need to decode timestamps

## Examples

| Camera | Date | First Report | Second Report | Third Report |
|--------|------|--------------|----------------|--------------|
| CAM-01 | 25/05/2026 | RPT-CAM-01-25052026 | RPT-CAM-01-25052026-02 | RPT-CAM-01-25052026-03 |
| CAM-02 | 26/05/2026 | RPT-CAM-02-26052026 | RPT-CAM-02-26052026-02 | - |
| CAM-LAPTOP | 25/05/2026 | RPT-CAM-LAPTOP-25052026 | RPT-CAM-LAPTOP-25052026-02 | RPT-CAM-LAPTOP-25052026-03 |

## Testing

✅ Backend server starts without errors
✅ Migration script successfully updated all 16 existing reports
✅ New reports will use new ID format automatically
✅ Report IDs remain unique with counter mechanism

## Database Impact

- All existing report IDs in `reports` table have been updated
- No foreign key conflicts (reports table is source of truth for IDs)
- New reports created via API will automatically use new format
