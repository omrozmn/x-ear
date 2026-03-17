# API Migration Rollback Plan

## Emergency Rollback Procedures

### Immediate Rollback (< 1 minute)

#### Option 1: CLI Command
```bash
node public/assets/api/migration-cli.js rollback
```

#### Option 2: Direct JavaScript
```javascript
// In browser console or Node.js
require('./public/assets/api/index.js').emergencyRollback();
```

#### Option 3: LocalStorage (Browser)
```javascript
// In browser console
localStorage.setItem('api_migration_flags', JSON.stringify({
  useGeneratedClient: false,
  enableShadowValidation: false,
  emergencyFallback: true
}));
location.reload();
```

### Gradual Rollback (Recommended)

#### Step 1: Disable New Operations
```bash
# Disable DELETE operations first (most risky)
node public/assets/api/migration-cli.js set-phase PHASE_4_CREATE_OPERATIONS

# Then disable POST operations
node public/assets/api/migration-cli.js set-phase PHASE_3_IDEMPOTENT_WRITES

# Then disable PUT operations
node public/assets/api/migration-cli.js set-phase PHASE_2_ALL_GETS

# Finally disable all but patient GETs
node public/assets/api/migration-cli.js set-phase PHASE_1_GET_PATIENTS

# Complete rollback to shadow mode only
node public/assets/api/migration-cli.js set-phase PHASE_0_SHADOW
```

#### Step 2: Monitor and Validate
```bash
# Check current status
node public/assets/api/migration-cli.js status

# Run smoke tests to verify
node -e "require('./public/assets/api/smoke-test.js').quickSmokeTest()"
```

## Rollback Triggers

### Automatic Rollback Conditions
- Error rate > 5% (configurable via `maxErrorRate`)
- 10 consecutive errors (configurable via `rollbackThreshold`)
- Critical system failures

### Manual Rollback Indicators
- User reports of data inconsistency
- Performance degradation > 50%
- Authentication/authorization failures
- Database connection issues
- Network timeout increases

## Monitoring and Detection

### Key Metrics to Monitor
1. **Error Rates**
   - HTTP 4xx/5xx responses
   - Network timeouts
   - Parsing errors

2. **Performance Metrics**
   - Response time increases
   - Memory usage spikes
   - CPU utilization

3. **Data Consistency**
   - Shadow validation mismatches
   - Data format errors
   - Missing required fields

### Monitoring Commands
```bash
# Check migration status
node public/assets/api/migration-cli.js status

# Run comprehensive tests
node -e "require('./public/assets/api/smoke-test.js').quickSmokeTest()"

# Check API health
curl http://localhost:5003/api/health
```

## Recovery Procedures

### After Emergency Rollback

1. **Immediate Actions**
   - Verify all systems are operational
   - Check data integrity
   - Notify stakeholders

2. **Investigation**
   - Review error logs
   - Analyze shadow validation data
   - Identify root cause

3. **Fix and Re-deploy**
   - Apply necessary fixes
   - Test in staging environment
   - Gradual re-enablement

### Data Recovery
If data inconsistencies are detected:

1. **Stop all write operations**
   ```bash
   node public/assets/api/migration-cli.js rollback
   ```

2. **Assess data integrity**
   - Compare legacy vs generated client data
   - Identify affected records
   - Determine recovery strategy

3. **Recovery options**
   - Database rollback (if available)
   - Manual data correction
   - Re-sync from authoritative source

## Communication Plan

### Internal Team
- Immediate Slack notification
- Email to development team
- Incident report creation

### External Users
- Status page update
- User notification (if needed)
- Support team briefing

## Testing After Rollback

### Verification Checklist
- [ ] All API endpoints responding
- [ ] Authentication working
- [ ] Data consistency verified
- [ ] Performance metrics normal
- [ ] User workflows functional

### Test Commands
```bash
# Basic functionality
node -e "require('./public/assets/api/smoke-test.js').quickSmokeTest()"

# Specific endpoint tests
curl -H "Authorization: Bearer $TOKEN" http://localhost:5003/api/patients
curl -H "Authorization: Bearer $TOKEN" http://localhost:5003/api/appointments
```

## Prevention Measures

### Before Migration
- Comprehensive testing in staging
- Shadow validation enabled
- Monitoring systems active
- Rollback procedures tested

### During Migration
- Gradual phase rollout
- Continuous monitoring
- Regular status checks
- Team availability

### After Migration
- Extended monitoring period
- Performance baseline establishment
- Documentation updates
- Lessons learned session

## Contact Information

### Emergency Contacts
- Development Team Lead: [Contact Info]
- DevOps Engineer: [Contact Info]
- Product Manager: [Contact Info]

### Escalation Path
1. Development Team (0-15 minutes)
2. Team Lead (15-30 minutes)
3. Engineering Manager (30+ minutes)

## Appendix

### Migration Phases Reference
```
PHASE_0_SHADOW: Shadow validation only
PHASE_1_GET_PATIENTS: Enable GET operations for patients
PHASE_2_ALL_GETS: Enable all GET operations
PHASE_3_IDEMPOTENT_WRITES: Enable PUT operations
PHASE_4_CREATE_OPERATIONS: Enable POST operations
PHASE_5_DELETE_OPERATIONS: Enable DELETE operations
PHASE_6_FULL_MIGRATION: Full migration complete
```

### Useful Commands
```bash
# Status check
node public/assets/api/migration-cli.js status

# List phases
node public/assets/api/migration-cli.js phases

# Emergency rollback
node public/assets/api/migration-cli.js rollback

# Set specific phase
node public/assets/api/migration-cli.js set-phase PHASE_NAME
```