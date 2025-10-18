# X-EAR Complete Migration Plan
## Tam Migration Stratejisi (Aşamalı Değil)

### Migration Yaklaşımı
Legacy uygulamayı kapsamlı bir prototip olarak değerlendirip, tüm özellikleri modern React/TypeScript stack'ine tamamen migrate ediyoruz. Orval'a geçiş nedeniyle zaten kırılan sayfalar olduğu için aşamalı migration yerine complete migration yapıyoruz.

## 1. LEGACY DOSYA KATEGORİZASYONU

### A. Core HTML Pages (Migration Priority: HIGH)
```
public/
├── dashboard.html          → pages/dashboard/
├── patients.html          → pages/patients/
├── appointments.html      → pages/appointments/
├── inventory.html         → pages/inventory/
├── invoices.html          → pages/invoices/
├── suppliers.html         → pages/suppliers/
├── settings.html          → pages/settings/
├── reports.html           → pages/reports/
├── sgk.html              → pages/sgk/
├── uts-kayitlari.html    → pages/uts/
├── campaigns.html         → pages/campaigns/
├── cashflow.html          → pages/cashflow/
├── automation.html        → pages/automation/
├── admin-panel.html       → pages/admin/
└── activity-logs.html     → pages/activity-logs/
```

### B. Core JavaScript Modules (Migration Priority: HIGH)
```
assets/js/
├── app.js                 → src/App.tsx (already exists)
├── auth.js                → src/stores/authStore.ts (already exists)
├── dashboard.js           → src/pages/dashboard/
├── patients.js            → src/pages/patients/
├── appointments/          → src/pages/appointments/
├── inventory/             → src/pages/inventory/
├── suppliers/             → src/pages/suppliers/
├── domain/                → src/services/
│   ├── patients/          → src/services/patients/
│   ├── appointments/      → src/services/appointments/
│   ├── inventory/         → src/services/inventory/
│   ├── sgk/              → src/services/sgk/
│   ├── sms/              → src/services/sms/
│   ├── uts/              → src/services/uts/
│   └── efatura/          → src/services/efatura/
├── components/            → src/components/
├── utils.js              → src/utils/
└── storage-keys.js       → src/constants/storage-keys.ts (already exists)
```

### C. API Integration (Migration Priority: CRITICAL)
```
assets/js/
├── api-client-wrapper.js     → src/api/client.ts (already exists)
├── orval-wrapper.js          → src/api/orval-mutator.ts (already exists)
├── generated/                → Already handled by Orval
├── backend-service-manager.js → src/services/backend/
└── indexeddb-outbox.js       → src/services/offline/
```

### D. UI Components & Widgets (Migration Priority: HIGH)
```
assets/js/
├── modal-helper.js           → src/components/ui/Modal/
├── modern-datepicker.js      → src/components/ui/DatePicker/
├── modern-timepicker.js      → src/components/ui/TimePicker/
├── components/               → src/components/
│   ├── multi-select-search.js → src/components/ui/MultiSelect/
│   ├── supplier-autocomplete.js → src/components/forms/SupplierAutocomplete/
│   └── quick-look-modal.js   → src/components/ui/QuickLook/
└── widgets/                  → src/components/widgets/
```

### E. Business Logic & Services (Migration Priority: HIGH)
```
assets/js/
├── automation-engine.js      → src/services/automation/
├── automation-manager.js     → src/services/automation/
├── patient-matching-service.js → src/services/patients/
├── ocr-engine.js            → src/services/ocr/
├── pdf-converter.js         → src/services/pdf/
├── image-processor.js       → src/services/image/
├── email-manager.js         → src/services/email/
├── sms-gateway.js           → src/services/sms/
└── storage-manager.js       → src/services/storage/
```

## 2. MIGRATION EXECUTION PLAN

### Phase 1: Foundation Setup (Day 1)
- [x] Project structure already created
- [x] Orval configuration already setup
- [x] Basic authentication already implemented
- [ ] Complete storage-keys migration
- [ ] Setup offline-first architecture
- [ ] Implement IndexedDB outbox pattern

### Phase 2: Core Services Migration (Days 2-5)
- [ ] Migrate all domain services (patients, appointments, inventory, etc.)
- [ ] Implement API client wrappers
- [ ] Setup state management with Zustand
- [ ] Migrate utility functions
- [ ] Implement error handling and logging

### Phase 3: UI Components Migration (Days 6-10)
- [ ] Migrate all reusable components
- [ ] Implement form components with validation
- [ ] Create modal and dialog components
- [ ] Setup date/time pickers
- [ ] Implement autocomplete components

### Phase 4: Page Components Migration (Days 11-20)
- [ ] Dashboard page with all widgets
- [ ] Patients management (full CRUD)
- [ ] Appointments calendar and management
- [ ] Inventory management
- [ ] Suppliers management
- [ ] Invoices and billing
- [ ] SGK integration pages
- [ ] UTS records management
- [ ] Reports and analytics
- [ ] Settings and configuration
- [ ] Admin panel
- [ ] Activity logs

### Phase 5: Advanced Features (Days 21-25)
- [ ] Automation engine
- [ ] OCR and document processing
- [ ] Email and SMS integration
- [ ] Cashflow management
- [ ] Campaign management
- [ ] Advanced reporting
- [ ] Mobile optimization

### Phase 6: Testing & Optimization (Days 26-30)
- [ ] Unit tests for all components
- [ ] Integration tests for API calls
- [ ] E2E tests for critical workflows
- [ ] Performance optimization
- [ ] Bundle size optimization
- [ ] Accessibility improvements

## 3. TECHNICAL REQUIREMENTS

### File Organization (Max 500 LOC per file)
```
src/
├── components/
│   ├── ui/                    # Reusable UI components (<200 LOC each)
│   ├── forms/                 # Form components (<300 LOC each)
│   ├── layout/                # Layout components (<250 LOC each)
│   └── widgets/               # Dashboard widgets (<400 LOC each)
├── pages/                     # Page components (<500 LOC each)
├── services/                  # Business logic (<300 LOC each)
├── hooks/                     # Custom hooks (<150 LOC each)
├── stores/                    # State management (<200 LOC each)
└── utils/                     # Utility functions (<100 LOC each)
```

### API Integration Strategy
- Use generated Orval client exclusively
- Implement offline-first with IndexedDB outbox
- Add idempotency keys for all mutations
- Implement proper error handling and retry logic

### State Management
- Zustand for global state
- React Query for server state
- Local state for component-specific data

### Testing Strategy
- Vitest for unit tests
- Testing Library for component tests
- MSW for API mocking
- Playwright for E2E tests

## 4. MIGRATION CHECKLIST

### Pre-Migration
- [x] Project structure created
- [x] Dependencies installed
- [x] Orval configuration setup
- [ ] Storage keys registry completed
- [ ] Offline architecture implemented

### Core Migration
- [ ] All HTML pages converted to React components
- [ ] All JavaScript modules converted to TypeScript
- [ ] All API calls using generated client
- [ ] All business logic properly organized
- [ ] All UI components implemented

### Quality Assurance
- [ ] All features working as in legacy
- [ ] No manual API calls (ESLint enforced)
- [ ] TypeScript compilation clean
- [ ] All tests passing
- [ ] Performance benchmarks met

### Post-Migration
- [ ] Legacy code removed
- [ ] Documentation updated
- [ ] Deployment pipeline updated
- [ ] Team training completed

## 5. SUCCESS CRITERIA

### Must Have
- ✅ All legacy features migrated
- ✅ API contract compliance
- ✅ Offline-first functionality
- ✅ Type safety throughout
- ✅ Performance equal or better than legacy

### Should Have
- ✅ Comprehensive test coverage (>80%)
- ✅ Accessibility compliance
- ✅ Mobile responsiveness
- ✅ Error boundaries and handling

### Could Have
- ✅ Advanced animations
- ✅ PWA capabilities
- ✅ Advanced analytics
- ✅ Performance monitoring

## 6. RISK MITIGATION

### Technical Risks
- **API Breaking Changes**: Use contract testing
- **Data Loss**: Implement proper backup/restore
- **Performance Issues**: Continuous monitoring
- **Browser Compatibility**: Comprehensive testing

### Business Risks
- **Feature Parity**: Detailed feature mapping
- **User Experience**: Usability testing
- **Training**: Comprehensive documentation
- **Rollback Plan**: Legacy system maintenance

## Next Steps
1. Start with Phase 1: Foundation Setup
2. Implement storage-keys migration
3. Setup offline-first architecture
4. Begin core services migration
5. Follow the daily execution plan

Bu plan, legacy uygulamanın tüm özelliklerini modern React/TypeScript stack'ine tamamen migrate etmek için tasarlanmıştır. Aşamalı yaklaşım yerine complete migration stratejisi benimsenmiştir.

### CI/CD Integration
- GitHub Actions (frontend.yml + backend.yml)
  - Build → Lint → Test → TypeCheck → Playwright
  - Orval auto-regenerate on PR
  - Upload source maps (Sentry)
  - Build artifacts → /dist → Vercel or Docker image
- Auto tag release (semver)
- Preview deploys for every PR (Netlify/Vercel)

| Feature | Legacy Page | New Page | Status | Notes |
|----------|-------------|----------|---------|--------|
| Patient CRUD | patients.html | /pages/patients/ | ✅ | Full parity |
| Appointment Calendar | appointments.html | /pages/appointments/ | 🟡 | Missing drag/drop |
| SGK Integration | sgk.html | /pages/sgk/ | 🔴 | Waiting API refactor |

### Observability & Monitoring
- **Posthog**: React + Flask entegrasyonu (errors, performance)
- **Prometheus**: Backend health metrics (/metrics endpoint)
- **Lighthouse CI**: Frontend performance metrics
- **UptimeRobot or Pingdom**: Endpoint uptime monitor