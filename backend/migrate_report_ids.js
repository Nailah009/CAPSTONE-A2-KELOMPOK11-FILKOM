import db from './db.js'

function formatDateDDMMYYYY(date = new Date()) {
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}${month}${year}`
}

async function migrateReportIds() {
  try {
    console.log('Starting Report ID migration...')
    
    // Get all reports
    const [reports] = await db.query('SELECT id, camera_id, timestamp FROM reports ORDER BY timestamp ASC')
    
    if (!reports || reports.length === 0) {
      console.log('No reports found to migrate.')
      return
    }
    
    console.log(`Found ${reports.length} reports to migrate`)
    
    // Map to track new IDs for duplicate handling
    const idMap = new Map()
    const updateStatements = []
    
    for (const report of reports) {
      const cameraId = report.camera_id || 'CAM-LAPTOP'
      const dateStr = formatDateDDMMYYYY(report.timestamp)
      let newId = `RPT-${cameraId}-${dateStr}`
      
      // Handle duplicates with counter
      let counter = 1
      let uniqueId = newId
      while (idMap.has(uniqueId)) {
        counter++
        uniqueId = `${newId}-${String(counter).padStart(2, '0')}`
      }
      
      idMap.set(uniqueId, true)
      
      if (report.id !== uniqueId) {
        updateStatements.push({
          oldId: report.id,
          newId: uniqueId,
          cameraId,
          dateStr
        })
      }
    }
    
    console.log(`${updateStatements.length} reports need ID updates`)
    
    // Update IDs
    for (const stmt of updateStatements) {
      try {
        // Update reports table
        await db.query('UPDATE reports SET id = ? WHERE id = ?', [stmt.newId, stmt.oldId])
        console.log(`✓ Migrated: ${stmt.oldId} → ${stmt.newId}`)
      } catch (error) {
        console.error(`✗ Failed to migrate ${stmt.oldId}:`, error.message)
      }
    }
    
    console.log('\n✓ Migration completed successfully!')
    console.log('\nNew Report ID Format: RPT-{CAMERAID}-{DDMMYYYY}')
    console.log('Examples:')
    console.log('  RPT-CAM-01-25052026')
    console.log('  RPT-CAM-02-26052026-01 (for duplicate on same day)')
    
  } catch (error) {
    console.error('Migration failed:', error.message)
  } finally {
    process.exit(0)
  }
}

migrateReportIds()
