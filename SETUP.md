# VelocityFibre DataHub - Setup Guide

## Step-by-Step Setup Instructions

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure SharePoint Access

You need to create an Azure AD app registration to access SharePoint:

#### 2.1 Create App Registration

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory**
3. Click **App registrations** in the left sidebar
4. Click **New registration**
5. Fill in:
   - **Name**: `VelocityFibre DataHub`
   - **Supported account types**: Select "Accounts in this organizational directory only"
   - **Redirect URI**: Leave blank
6. Click **Register**

#### 2.2 Get Credentials

After registration, you'll see the Overview page:

1. Copy the **Application (client) ID**
2. Copy the **Directory (tenant) ID**

#### 2.3 Create Client Secret

1. In the left sidebar, click **Certificates & secrets**
2. Click **New client secret**
3. Add a description: `DataHub Secret`
4. Set expiration: `24 months` (or your preference)
5. Click **Add**
6. **IMPORTANT**: Copy the secret **Value** immediately (you won't be able to see it again!)

#### 2.4 Grant API Permissions

1. In the left sidebar, click **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Application permissions** (not Delegated)
5. Search for and add:
   - `Sites.Read.All`
   - `Files.Read.All`
6. Click **Add permissions**
7. Click **Grant admin consent for [Your Organization]**
8. Confirm by clicking **Yes**

### Step 3: Update Environment Variables

Edit `.env.local` and add your SharePoint credentials:

```env
SHAREPOINT_CLIENT_ID=<paste Application (client) ID here>
SHAREPOINT_CLIENT_SECRET=<paste client secret here>
SHAREPOINT_TENANT_ID=<paste Directory (tenant) ID here>
```

### Step 4: Test SharePoint Connection

Run a test to verify SharePoint access:

```bash
npm run sync:lawley
```

This will:
- Authenticate with SharePoint
- Download the Lawley Excel file
- Display sample data
- Show available columns

### Step 5: Initialize Database

Run the main initialization script:

```bash
npm run dev
```

This will:
- Test Neon database connection
- Create necessary tables (`lawley_project`, `sync_log`)
- Run initial data sync
- Display sync results

### Step 6: Verify Data

You can verify the data was synced by connecting to your Neon database:

```bash
# Using psql (if installed)
psql "$NEON_DATABASE_URL"

# Then run queries
SELECT COUNT(*) FROM lawley_project;
SELECT * FROM lawley_project LIMIT 5;
SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 5;
```

### Step 7: Start API Server (Optional)

If you want to enable the Power BI API:

```bash
npm run api
```

The API will be available at `http://localhost:3000`

Test it:
```bash
# Health check (no auth required)
curl http://localhost:3000/api/powerbi/health

# Get data (requires API key)
curl -H "X-API-Key: temp_powerbi_key_change_in_production" \
  http://localhost:3000/api/powerbi/lawley/data
```

## Common Issues

### Issue: "Failed to authenticate with SharePoint"

**Cause**: Invalid credentials or insufficient permissions

**Solution**:
1. Double-check your Client ID, Secret, and Tenant ID
2. Ensure you granted admin consent for API permissions
3. Wait 5-10 minutes after granting permissions (Azure propagation delay)

### Issue: "Failed to fetch file from SharePoint"

**Cause**: File URL might be incorrect or access denied

**Solution**:
1. Verify the file URL is correct in `.env.local`
2. Make sure the file is in the correct SharePoint site
3. Try accessing the file manually with your browser to confirm it exists

### Issue: "Database connection failed"

**Cause**: Network or credential issue

**Solution**:
1. Check your internet connection
2. Verify the Neon connection string is correct
3. Try connecting directly with psql to test

## Next Steps

Once setup is complete:

1. **Schedule Regular Syncs**: Set up a cron job to run `npm run sync:lawley` periodically
2. **Analyze Data Structure**: Review the data to optimize the database schema
3. **Connect Power BI**: Use the API endpoints to create Power BI reports
4. **Add More Data Sources**: Extend the system with additional connectors

## Security Notes

- **Never commit `.env.local`** to version control
- **Rotate API keys** regularly
- **Use strong API keys** in production
- **Restrict API access** by IP if possible
- **Monitor logs** for suspicious activity

## Support

If you encounter issues:
1. Check the logs in `logs/datahub.log`
2. Review error messages in `logs/error.log`
3. Refer to `README.md` for troubleshooting tips
4. Check `claude.md` for architecture details
