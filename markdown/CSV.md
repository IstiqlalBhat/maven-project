# CSV Batch Upload Format

This document describes the CSV format required for batch uploading pitch data for a specific pitcher.

## Important Note

The batch upload feature is designed to import pitch data **for the currently selected pitcher**. You do **NOT** need to include a pitcher name column in your CSV, as the pitches will automatically be associated with the pitcher you're adding them to.

## Required Format

Your CSV file must be in UTF-8 encoding with a header row containing column names. The parser is flexible and accepts multiple naming conventions for headers.

## Supported Headers

The following column headers are recognized (case-insensitive during mapping):

| Standard Header | Alternative Names | Required | Type | Example |
|----------------|-------------------|----------|------|---------|
| `pitch_type` | `pitchType`, `type`, `pitch`, `pitchname` | ✅ Yes | String | `Fastball` |
| `velocity_mph` | `velocity`, `velo`, `speed`, `relspeed` | ❌ No | Number | `95.5` |
| `spin_rate` | `spinRate`, `spin`, `rpm`, `spinrate` | ❌ No | Integer | `2400` |
| `horizontal_break` | `hBreak`, `h_break`, `horizontal`, `horzbreak` | ❌ No | Number | `8.2` |
| `vertical_break` | `vBreak`, `v_break`, `vertical`, `inducedvertbreak` | ❌ No | Number | `14.5` |
| `date` | `game_date`, `date_recorded`, `gamedate` | ❌ No | Date | `2024-03-15` |
| `notes` | `comments`, `description`, `note` | ❌ No | Text | `Bullpen session` |

## Valid Pitch Types

Use the **full pitch name** (not abbreviated codes):

- `Fastball` (4-Seam Fastball)
- `Sinker` (2-Seam Fastball)
- `Slider`
- `Curveball`
- `Changeup`
- `Cutter`
- `Splitter`

> **Note**: Pitch type names are case-sensitive. Use exact capitalization as shown above.

## Example CSV Files

### Minimal Example (Required Field Only)
```csv
pitch_type
Fastball
Slider
Curveball
```

### Recommended Example
```csv
pitch_type,velocity_mph,date
Fastball,95.5,2024-03-15
Slider,87.2,2024-03-15
Curveball,78.5,2024-03-15
```

### Complete Example (All Fields)
```csv
pitch_type,velocity_mph,spin_rate,horizontal_break,vertical_break,date,notes
Fastball,95.5,2400,8.2,14.5,2024-03-15,Bullpen session
Slider,87.2,2650,-4.5,2.1,2024-03-15,Felt good
Curveball,78.5,2800,-6.2,-3.5,2024-03-15,Working on grip
Changeup,84.3,1900,12.1,8.2,2024-03-16,Game day
```

### Alternative Header Names
```csv
type,velo,spin,hBreak,vBreak,game_date,comments
Fastball,95.5,2400,8.2,14.5,2024-03-15,Strong outing
Sinker,93.1,2200,15.3,9.8,2024-03-15,Good movement
```

## Data Type Requirements

### Pitch Type
- **Required**: Yes
- **Format**: Full pitch name (exact match required)
- **Valid Values**: `Fastball`, `Sinker`, `Slider`, `Curveball`, `Changeup`, `Cutter`, `Splitter`
- **Case Sensitive**: Yes - must match exactly

### Velocity
- **Range**: 40-110 mph (enforced by form validation)
- **Format**: Decimal number (e.g., `88.5`)
- **Optional**: Yes (but recommended)

### Spin Rate
- **Range**: 0-4000 rpm (enforced by form validation)
- **Format**: Integer (e.g., `2400`)
- **Optional**: Yes

### Break Values
- **Range**: -20 to 25 inches
- **Format**: Decimal number (e.g., `8.2`)
- **Optional**: Yes
- **Note**: Negative values indicate movement in one direction, positive in the other

### Date
- **Format**: `YYYY-MM-DD` (e.g., `2024-03-15`)
- **Optional**: Yes (will default to today's date if not provided)
- **Also accepts**: ISO 8601 format with time (e.g., `2024-03-15T14:30:00Z`)

### Notes
- **Max Length**: No strict limit
- **Format**: Any text
- **Optional**: Yes

## Common Issues and Solutions

### Issue: "Missing pitch_type" Error
**Cause**: The CSV doesn't have a recognized pitch type column header.

**Solution**: Ensure your CSV has a column named `pitch_type` or one of its alternatives (`type`, `pitchType`). Use the column mapping interface if needed.

### Issue: "Invalid or missing pitch_type" Errors
**Cause**: Pitch types don't match the valid list exactly.

**Solution**: 
- Use full names: `Fastball`, NOT `FF` or `Four-Seam`
- Check capitalization: `Fastball`, NOT `fastball` or `FASTBALL`
- Ensure each row has a pitch type value

### Issue: "Validation failed" with Multiple Rows
**Cause**: Some rows have invalid data (e.g., velocity > 110, invalid pitch type).

**Solution**: Check the error details to see which rows failed. Common fixes:
- Verify pitch types match the valid list exactly (case-sensitive)
- Check that velocity is between 40-110 mph
- Check that spin rate is between 0-4000 rpm
- Check that break values are between -20 and 25 inches
- Verify dates are in `YYYY-MM-DD` format

### Issue: Headers Not Recognized
**Cause**: CSV has non-standard header names.

**Solution**: Click the "Customize Column Mapping" button in the upload interface to manually map your headers to the required fields.

## Tips for Success

1. **Use Standard Headers**: Stick to `pitch_type`, `velocity_mph`, `spin_rate`, etc. for best compatibility
2. **Full Pitch Names**: Always use full pitch names (`Fastball`, `Slider`) not codes (`FF`, `SL`)
3. **Exact Capitalization**: Pitch type names are case-sensitive - use exact capitalization
4. **UTF-8 Encoding**: Save your CSV as UTF-8 to avoid character encoding issues
5. **Consistent Formatting**: Use the same date format throughout your file
6. **Test with Small Files**: Upload a small sample (5-10 rows) first to verify format
7. **Remove Empty Rows**: Clean up any trailing empty rows in your CSV
8. **No Pitcher Name Needed**: Don't include pitcher name - pitches are automatically linked to the selected pitcher

## Exporting from Tracking Systems

### From Rapsodo
Export format should work directly with some column mapping:
- `PitchType` → `pitch_type` (may need to convert codes to full names)
- `RelSpeed` → `velocity_mph`
- `SpinRate` → `spin_rate`

**Important**: Rapsodo may export pitch codes (FF, SL, etc.). You'll need to convert these to full names (Fastball, Slider, etc.) before importing.

### From TrackMan
Map these columns:
- `TaggedPitchType` → `pitch_type` (convert to full names)
- `RelSpeed` → `velocity_mph`
- `SpinRate` → `spin_rate`
- `HorzBreak` → `horizontal_break`
- `InducedVertBreak` → `vertical_break`

**Important**: TrackMan may use different pitch type naming. Ensure conversion to: `Fastball`, `Sinker`, `Slider`, `Curveball`, `Changeup`, `Cutter`, `Splitter`.

### From Excel/Google Sheets
1. Ensure headers are in the first row
2. Use File → Download → CSV (UTF-8) or Save As → CSV
3. Verify that dates are formatted as `YYYY-MM-DD`
4. Ensure pitch types use full names with correct capitalization

## Column Mapping Feature

If your CSV has non-standard headers, use the built-in column mapping feature:

1. Upload your CSV file
2. If columns aren't auto-detected, click **"Customize Column Mapping"**
3. Map your CSV columns to the standard fields
4. Click **"Apply Mapping"** or **"Auto-detect"** to try automatic detection
5. Review the validation results

The system will show you:
- ✅ Number of valid pitches found
- ❌ Any validation errors with row numbers

## Troubleshooting

If you encounter parsing errors:

1. **Open CSV in a text editor** (not Excel) to check for hidden characters
2. **Verify column count** is consistent across all rows
3. **Check for commas in data** - if your notes contain commas, ensure they're properly quoted (Excel does this automatically)
4. **Remove BOM**: Some editors add a Byte Order Mark - save as UTF-8 without BOM
5. **Use the column mapping feature**: The upload interface allows you to manually map non-standard headers
6. **Verify pitch type names**: Make sure you're using full names (`Fastball`) not codes (`FF`)
7. **Check capitalization**: Pitch types are case-sensitive

## Advanced: Converting Pitch Codes to Full Names

If you're importing from a system that uses abbreviations, here's a conversion table:

| Code | Full Name (Use This) |
|------|---------------------|
| FF, FA, 4S | Fastball |
| SI, FT, 2S | Sinker |
| SL | Slider |
| CU, CB | Curveball |
| CH | Changeup |
| FC | Cutter |
| FS, SF | Splitter |

You can use Excel's Find & Replace or a text editor to bulk convert these before importing.
