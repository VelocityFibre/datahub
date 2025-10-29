#!/bin/bash

# VelocityFibre DataHub - Cron Job Setup Script
# This sets up automatic syncing every 6 hours

echo "=== VelocityFibre DataHub - Cron Setup ==="
echo ""
echo "This will add a cron job to sync data every 6 hours."
echo ""

# Path to DataHub
DATAHUB_PATH="/home/louisdup/VF/VelocityFibre_DataHub"

# Check if path exists
if [ ! -d "$DATAHUB_PATH" ]; then
    echo "❌ Error: DataHub path not found: $DATAHUB_PATH"
    exit 1
fi

# Create log directory if it doesn't exist
mkdir -p "$DATAHUB_PATH/logs"

# Cron job command
CRON_CMD="0 */6 * * * cd $DATAHUB_PATH && NODE_OPTIONS=\"--max-old-space-size=8192\" /usr/bin/npm run sync >> $DATAHUB_PATH/logs/cron-sync.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "VelocityFibre_DataHub.*npm run sync"; then
    echo "⚠️  Cron job already exists!"
    echo ""
    echo "Current cron jobs:"
    crontab -l | grep VelocityFibre_DataHub
    echo ""
    read -p "Do you want to replace it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    # Remove old cron job
    crontab -l | grep -v "VelocityFibre_DataHub.*npm run sync" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "# VelocityFibre DataHub - Auto-sync every 6 hours"; echo "$CRON_CMD") | crontab -

echo "✅ Cron job added successfully!"
echo ""
echo "Schedule: Every 6 hours (00:00, 06:00, 12:00, 18:00)"
echo "Command: npm run sync"
echo "Logs: $DATAHUB_PATH/logs/cron-sync.log"
echo ""
echo "View all cron jobs:"
echo "  crontab -l"
echo ""
echo "View sync logs:"
echo "  tail -f $DATAHUB_PATH/logs/cron-sync.log"
echo ""
echo "Remove cron job:"
echo "  crontab -e  (then delete the line)"
echo ""
