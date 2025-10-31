# Monthly Maintenance Checklist

**Date:** _________
**Performed by:** _________

## 1. Detect Schema Changes ⬜

```bash
npm run detect:schema-changes
```

**Result:**
- [ ] No new columns detected ✅
- [ ] New columns found ⚠️ (proceed to step 2)

**Notes:**
```
_________________________________________________
_________________________________________________
```

## 2. Review New Columns ⬜

If new columns were detected:

**Columns found:**
```
_________________________________________________
_________________________________________________
_________________________________________________
```

**Decision for each column:**

| Column Name | Keep in raw_data? | Promote to typed? | Reason |
|-------------|-------------------|-------------------|---------|
| __________ | ☐ | ☐ | _________________ |
| __________ | ☐ | ☐ | _________________ |
| __________ | ☐ | ☐ | _________________ |

**Promotion criteria:**
- ✅ Frequently filtered (WHERE clause)
- ✅ Used in joins
- ✅ Used in aggregations (GROUP BY, SUM, etc.)
- ✅ Performance-critical

## 3. Create Migrations (if promoting) ⬜

```bash
# Create: src/database/migrations/00X_description.sql
```

**Migration file created:** `________________________________`

**Columns added:**
- [ ] `______________________` (type: ________)
- [ ] `______________________` (type: ________)

## 4. Update Connectors ⬜

**Files updated:**
- [ ] `src/connectors/sharepoint/worksheets/lawley-qa.connector.ts`
- [ ] `src/connectors/sharepoint/worksheets/________________.ts`

**Changes made:**
```
_________________________________________________
_________________________________________________
```

## 5. Run Migration ⬜

```bash
npm run migrate
```

**Result:**
- [ ] Success ✅
- [ ] Failed ❌ (error: `________________________`)

## 6. Sync Data ⬜

```bash
npm run sync:lawley-activations
```

**Result:**
- [ ] Success ✅
- [ ] Failed ❌ (error: `________________________`)

**Records processed:** ________

## 7. Verify Data ⬜

```sql
-- Check new columns
SELECT zone_no, pon_no, drop_number
FROM sharepoint_lawley_qa
WHERE zone_no IS NOT NULL
LIMIT 10;
```

**Result:**
- [ ] Columns populated ✅
- [ ] No data ❌ (investigate)

**Sample values:**
```
_________________________________________________
_________________________________________________
```

## 8. Check Sync Health ⬜

```bash
npm run check:status
```

**Last 7 days sync summary:**
- Total syncs: ________
- Successful: ________
- Failed: ________
- Average duration: ________ seconds

**Issues found:**
```
_________________________________________________
_________________________________________________
```

## 9. Review Logs ⬜

```bash
tail -100 logs/error.log
```

**Errors found:**
- [ ] None ✅
- [ ] Errors present ⚠️

**Action items:**
```
_________________________________________________
_________________________________________________
```

## 10. Database Health Check ⬜

```sql
-- Check table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC
LIMIT 10;
```

**Largest tables:**
```
_________________________________________________
_________________________________________________
```

**Notes:**
```
_________________________________________________
_________________________________________________
```

---

## Summary

**Overall Status:**
- [ ] ✅ All checks passed
- [ ] ⚠️ Minor issues (documented above)
- [ ] ❌ Critical issues (escalate)

**Next maintenance date:** _________

**Follow-up actions:**
```
_________________________________________________
_________________________________________________
_________________________________________________
```

**Sign-off:** _________________ (Date: ________)

---

## Quick Reference Commands

```bash
# Monthly check
npm run detect:schema-changes

# Apply migrations
npm run migrate

# Sync data
npm run sync:lawley-activations

# Check status
npm run check:status

# View logs
tail -f logs/datahub.log
tail -f logs/error.log

# Database access
psql "$DATABASE_URL"
```
