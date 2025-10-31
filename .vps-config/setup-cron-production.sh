#!/bin/bash

# VelocityFibre DataHub - Production Cron Setup Script
# Sets up automatic syncing every 4 hours with comprehensive logging and monitoring

set -e  # Exit on error

echo "=== VelocityFibre DataHub - Production Cron Setup ==="
echo ""

# Path to DataHub on VPS
DATAHUB_PATH="/root/datahub"
LOG_DIR="$DATAHUB_PATH/logs"
CRON_LOG="$LOG_DIR/cron-sync.log"
ERROR_LOG="$LOG_DIR/cron-errors.log"
STATUS_LOG="$LOG_DIR/sync-status.log"

# Check if path exists
if [ ! -d "$DATAHUB_PATH" ]; then
    echo "❌ Error: DataHub path not found: $DATAHUB_PATH"
    echo "   Run this script on the VPS after deployment"
    exit 1
fi

# Create log directory
mkdir -p "$LOG_DIR"
echo "✅ Log directory: $LOG_DIR"

# Remove broken PM2 setup
echo ""
echo "🔧 Removing old PM2 configuration..."
pm2 delete datahub-sync 2>/dev/null || echo "   No PM2 process to remove"
pm2 save 2>/dev/null || true

# Cron job - runs every 4 hours
CRON_SCHEDULE="0 */4 * * *"
CRON_CMD="cd $DATAHUB_PATH && NODE_OPTIONS=\"--max-old-space-size=8192\" /usr/bin/npm run sync >> $CRON_LOG 2>> $ERROR_LOG && echo \"\$(date '+\%Y-\%m-\%d \%H:\%M:\%S') - Sync completed successfully\" >> $STATUS_LOG || echo \"\$(date '+\%Y-\%m-\%d \%H:\%M:\%S') - Sync FAILED\" >> $STATUS_LOG"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$DATAHUB_PATH.*npm run sync"; then
    echo ""
    echo "⚠️  Existing cron job found!"
    echo ""
    echo "Current DataHub cron jobs:"
    crontab -l 2>/dev/null | grep "$DATAHUB_PATH"
    echo ""
    read -p "Replace with new configuration? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Cancelled."
        exit 0
    fi
    # Remove old cron job
    crontab -l 2>/dev/null | grep -v "$DATAHUB_PATH.*npm run sync" | crontab -
    echo "✅ Old cron job removed"
fi

# Add new cron job
echo ""
echo "📅 Installing new cron job..."
(crontab -l 2>/dev/null; echo ""; echo "# VelocityFibre DataHub - Auto-sync every 4 hours"; echo "$CRON_SCHEDULE $CRON_CMD") | crontab -

echo ""
echo "=== ✅ Cron Job Installed Successfully! ==="
echo ""
echo "Configuration:"
echo "  Schedule:    Every 4 hours (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)"
echo "  Command:     npm run sync"
echo "  Working Dir: $DATAHUB_PATH"
echo ""
echo "Log Files:"
echo "  Sync Output: $CRON_LOG"
echo "  Errors:      $ERROR_LOG"
echo "  Status:      $STATUS_LOG"
echo ""
echo "Useful Commands:"
echo "  View cron jobs:      crontab -l"
echo "  View sync log:       tail -f $CRON_LOG"
echo "  View errors:         tail -f $ERROR_LOG"
echo "  View status:         tail -20 $STATUS_LOG"
echo "  Check sync health:   npm run check:sync-health"
echo "  Manual sync now:     cd $DATAHUB_PATH && npm run sync"
echo ""
echo "Next sync will run at the next 4-hour mark (00:00, 04:00, 08:00, etc.)"
echo ""
