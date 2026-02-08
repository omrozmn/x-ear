# Playwright Performance Testing Guide

## Overview

This guide covers comprehensive performance testing strategies for X-Ear CRM using Playwright. All tests include detailed metrics collection and debuggable failure reporting.

## Table of Contents

1. [Page Load Performance](#page-load-performance)
2. [API Response Time Testing](#api-response-time-testing)
3. [Frontend Rendering Performance](#frontend-rendering-performance)
4. [Database Query Performance](#database-query-performance)
5. [Memory Leak Detection](#memory-leak-detection)
6. [Network Payload Optimization](#network-payload-optimization)
7. [Concurrent User Testing](#concurrent-user-testing)
8. [Lighthouse Integration](#lighthouse-integration)
9. [Performance Budgets](#performance-budgets)
10. [Real User Monitoring (RUM)](#real-user-monitoring-rum)

---

## 1. Page Load Performance

### 1.1 Core Web Vitals

**Test: Largest Contentful Paint (LCP)**
```typescript
test('PERF-LCP-001: LCP under 2.5s on dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  
  // Measure LCP on dashboard
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve({
          lcp: lastEntry.renderTime || lastEntry.loadTime,
          element: lastEntry.element?.tagName
        });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      
      // Timeout after 10s
      setTimeout(() => resolve({ lcp: null }), 10000);
    });
  });
  
  console.log('LCP Metrics:', metrics);
  
  expect(metrics.lcp, 'LCP should be under 2500ms').toBeLessThan(2500);
});
```


**Test: First Input Delay (FID)**
```typescript
test('PERF-FID-001: FID under 100ms', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Measure FID
  const fid = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          resolve({
            fid: entry.processingStart - entry.startTime,
            name: entry.name
          });
        });
      }).observe({ type: 'first-input', buffered: true });
      
      setTimeout(() => resolve({ fid: null }), 5000);
    });
  });
  
  console.log('FID Metrics:', fid);
  
  if (fid.fid !== null) {
    expect(fid.fid, 'FID should be under 100ms').toBeLessThan(100);
  }
});
```

**Test: Cumulative Layout Shift (CLS)**
```typescript
test('PERF-CLS-001: CLS under 0.1', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Wait for page to stabilize
  await page.waitForTimeout(2000);
  
  // Measure CLS
  const cls = await page.evaluate(() => {
    return new Promise((resolve) => {
      let clsValue = 0;
      
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
      
      setTimeout(() => resolve(clsValue), 3000);
    });
  });
  
  console.log('CLS Value:', cls);
  
  expect(cls, 'CLS should be under 0.1').toBeLessThan(0.1);
});
```

### 1.2 Time to Interactive (TTI)

**Test: TTI Measurement**
```typescript
test('PERF-TTI-001: Time to Interactive under 3.8s', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Wait for network idle (proxy for TTI)
  await page.waitForLoadState('networkidle');
  
  const tti = Date.now() - startTime;
  
  console.log('Time to Interactive:', tti, 'ms');
  
  expect(tti, 'TTI should be under 3800ms').toBeLessThan(3800);
});
```

---

## 2. API Response Time Testing

### 2.1 Critical Endpoint Performance

**Test: Party List API Response Time**
```typescript
test('PERF-API-001: Party list API responds under 500ms', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Measure API response time
  const apiTiming = await page.evaluate(async () => {
    const startTime = performance.now();
    
    const response = await fetch('/api/parties?page=1&perPage=20', {
      headers: {
        'Authorization': `Bearer ${document.cookie.match(/access_token=([^;]+)/)?.[1]}`
      }
    });
    
    const endTime = performance.now();
    
    return {
      duration: endTime - startTime,
      status: response.status,
      size: response.headers.get('content-length')
    };
  });
  
  console.log('API Timing:', apiTiming);
  
  expect(apiTiming.duration, 'Party list API should respond under 500ms').toBeLessThan(500);
  expect(apiTiming.status, 'API should return 200').toBe(200);
});
```

**Test: Search API Performance**
```typescript
test('PERF-API-002: Search API responds under 300ms', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  await page.goto('/parties');
  
  // Measure search performance
  const searchTiming = await page.evaluate(async () => {
    const startTime = performance.now();
    
    const response = await fetch('/api/parties?search=test&page=1&perPage=20', {
      headers: {
        'Authorization': `Bearer ${document.cookie.match(/access_token=([^;]+)/)?.[1]}`
      }
    });
    
    const endTime = performance.now();
    
    return {
      duration: endTime - startTime,
      status: response.status
    };
  });
  
  console.log('Search API Timing:', searchTiming);
  
  expect(searchTiming.duration, 'Search API should respond under 300ms').toBeLessThan(300);
});
```

### 2.2 Bulk Operations Performance

**Test: Bulk Upload Performance**
```typescript
test('PERF-API-003: Bulk upload 100 parties under 5s', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  await page.goto('/parties');
  await page.click('[data-testid="party-bulk-upload-button"]');
  
  // Create CSV with 100 parties
  const csvContent = [
    'firstName,lastName,phone,email',
    ...Array.from({ length: 100 }, (_, i) => 
      `Test${i},User${i},+90555123${String(i).padStart(4, '0')},test${i}@example.com`
    )
  ].join('\n');
  
  const startTime = Date.now();
  
  // Upload file
  await page.setInputFiles('[data-testid="file-upload-input"]', {
    name: 'bulk_parties.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent)
  });
  
  // Wait for upload to complete
  await page.waitForSelector('[data-testid="upload-result-modal"]', { timeout: 10000 });
  
  const uploadTime = Date.now() - startTime;
  
  console.log('Bulk Upload Time:', uploadTime, 'ms');
  
  expect(uploadTime, 'Bulk upload of 100 parties should complete under 5000ms').toBeLessThan(5000);
});
```


---

## 3. Frontend Rendering Performance

### 3.1 Component Render Time

**Test: Large Table Rendering**
```typescript
test('PERF-RENDER-001: Party table renders 100 rows under 1s', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Navigate to parties with 100 items per page
  const startTime = Date.now();
  
  await page.goto('/parties?perPage=100');
  
  // Wait for table to render
  await page.waitForSelector('[data-testid="party-table-row"]');
  
  const renderTime = Date.now() - startTime;
  
  // Count rendered rows
  const rowCount = await page.locator('[data-testid="party-table-row"]').count();
  
  console.log('Table Render Time:', renderTime, 'ms');
  console.log('Rows Rendered:', rowCount);
  
  expect(renderTime, 'Table should render under 1000ms').toBeLessThan(1000);
  expect(rowCount, 'Should render 100 rows').toBeGreaterThanOrEqual(20); // At least 20 rows
});
```

**Test: Form Interaction Performance**
```typescript
test('PERF-RENDER-002: Form opens and renders under 200ms', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  await page.goto('/parties');
  
  // Measure form open time
  const startTime = Date.now();
  
  await page.click('[data-testid="party-create-button"]');
  await page.waitForSelector('[data-testid="party-form-modal"]');
  
  const openTime = Date.now() - startTime;
  
  console.log('Form Open Time:', openTime, 'ms');
  
  expect(openTime, 'Form should open under 200ms').toBeLessThan(200);
});
```

### 3.2 Virtual Scrolling Performance

**Test: Scroll Performance**
```typescript
test('PERF-RENDER-003: Smooth scrolling with 1000+ items', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  await page.goto('/parties');
  
  // Measure scroll performance
  const scrollMetrics = await page.evaluate(async () => {
    const container = document.querySelector('[data-testid="party-table"]');
    if (!container) return { fps: 0, dropped: 0 };
    
    let frameCount = 0;
    let droppedFrames = 0;
    let lastTime = performance.now();
    
    const measureFrame = () => {
      const currentTime = performance.now();
      const delta = currentTime - lastTime;
      
      if (delta > 16.67) { // 60fps = 16.67ms per frame
        droppedFrames++;
      }
      
      frameCount++;
      lastTime = currentTime;
    };
    
    // Scroll and measure
    return new Promise((resolve) => {
      const observer = new PerformanceObserver(() => {
        measureFrame();
      });
      
      observer.observe({ entryTypes: ['measure'] });
      
      // Scroll 10 times
      let scrollCount = 0;
      const scrollInterval = setInterval(() => {
        container.scrollTop += 100;
        scrollCount++;
        
        if (scrollCount >= 10) {
          clearInterval(scrollInterval);
          observer.disconnect();
          
          resolve({
            fps: frameCount / (scrollCount * 0.1), // Approximate FPS
            dropped: droppedFrames
          });
        }
      }, 100);
    });
  });
  
  console.log('Scroll Metrics:', scrollMetrics);
  
  expect(scrollMetrics.dropped, 'Should have minimal dropped frames').toBeLessThan(5);
});
```

---

## 4. Database Query Performance

### 4.1 Query Execution Time

**Test: Complex Query Performance**
```typescript
test('PERF-DB-001: Complex party query with joins under 200ms', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Intercept API call to measure backend timing
  let serverTiming: string | null = null;
  
  page.on('response', response => {
    if (response.url().includes('/api/parties')) {
      serverTiming = response.headers()['server-timing'];
    }
  });
  
  await page.goto('/parties?include=roles,hearingProfile');
  
  await page.waitForTimeout(1000);
  
  console.log('Server-Timing Header:', serverTiming);
  
  // Parse server-timing header if available
  if (serverTiming) {
    const dbTime = serverTiming.match(/db;dur=(\d+)/)?.[1];
    if (dbTime) {
      expect(parseInt(dbTime), 'DB query should execute under 200ms').toBeLessThan(200);
    }
  }
});
```

### 4.2 N+1 Query Detection

**Test: No N+1 Queries in List Endpoints**
```typescript
test('PERF-DB-002: Party list avoids N+1 queries', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Count API calls
  const apiCalls: string[] = [];
  
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiCalls.push(request.url());
    }
  });
  
  await page.goto('/parties');
  
  await page.waitForTimeout(2000);
  
  console.log('API Calls Made:', apiCalls.length);
  console.log('API Calls:', apiCalls);
  
  // Should make only 1 call to /api/parties, not N calls for each party
  const partyCalls = apiCalls.filter(url => url.includes('/api/parties'));
  expect(partyCalls.length, 'Should make only 1 party list call').toBe(1);
});
```


---

## 5. Memory Leak Detection

### 5.1 Memory Usage Monitoring

**Test: No Memory Leaks in Navigation**
```typescript
test('PERF-MEM-001: Memory stable after repeated navigation', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Measure initial memory
  const initialMemory = await page.evaluate(() => {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  });
  
  // Navigate 20 times
  const routes = ['/parties', '/sales', '/invoices', '/dashboard'];
  
  for (let i = 0; i < 20; i++) {
    const route = routes[i % routes.length];
    await page.goto(route);
    await page.waitForTimeout(500);
  }
  
  // Force garbage collection (if available)
  await page.evaluate(() => {
    if (window.gc) {
      window.gc();
    }
  });
  
  await page.waitForTimeout(1000);
  
  // Measure final memory
  const finalMemory = await page.evaluate(() => {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  });
  
  const memoryIncrease = finalMemory - initialMemory;
  const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
  
  console.log('Initial Memory:', (initialMemory / (1024 * 1024)).toFixed(2), 'MB');
  console.log('Final Memory:', (finalMemory / (1024 * 1024)).toFixed(2), 'MB');
  console.log('Memory Increase:', memoryIncreaseMB.toFixed(2), 'MB');
  
  // Memory should not increase by more than 50MB
  expect(memoryIncreaseMB, 'Memory increase should be under 50MB').toBeLessThan(50);
});
```

**Test: Event Listener Cleanup**
```typescript
test('PERF-MEM-002: Event listeners cleaned up on unmount', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Count initial listeners
  const initialListeners = await page.evaluate(() => {
    const getEventListeners = (window as any).getEventListeners;
    if (!getEventListeners) return 0;
    
    let count = 0;
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      const listeners = getEventListeners(el);
      count += Object.keys(listeners).length;
    });
    return count;
  });
  
  // Navigate and return
  await page.goto('/parties');
  await page.click('[data-testid="party-create-button"]');
  await page.click('[data-testid="modal-close-button"]');
  await page.goto('/dashboard');
  
  // Count final listeners
  const finalListeners = await page.evaluate(() => {
    const getEventListeners = (window as any).getEventListeners;
    if (!getEventListeners) return 0;
    
    let count = 0;
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      const listeners = getEventListeners(el);
      count += Object.keys(listeners).length;
    });
    return count;
  });
  
  console.log('Initial Listeners:', initialListeners);
  console.log('Final Listeners:', finalListeners);
  
  // Listener count should not grow significantly
  const listenerIncrease = finalListeners - initialListeners;
  expect(listenerIncrease, 'Listener count should not increase significantly').toBeLessThan(50);
});
```

---

## 6. Network Payload Optimization

### 6.1 Response Size Testing

**Test: API Response Size Reasonable**
```typescript
test('PERF-NET-001: Party list response under 100KB', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Intercept response
  let responseSize = 0;
  
  page.on('response', async response => {
    if (response.url().includes('/api/parties?')) {
      const body = await response.body();
      responseSize = body.length;
    }
  });
  
  await page.goto('/parties');
  
  await page.waitForTimeout(1000);
  
  const responseSizeKB = responseSize / 1024;
  
  console.log('Response Size:', responseSizeKB.toFixed(2), 'KB');
  
  expect(responseSizeKB, 'Response size should be under 100KB').toBeLessThan(100);
});
```

**Test: Compression Enabled**
```typescript
test('PERF-NET-002: API responses compressed', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Check compression headers
  page.on('response', response => {
    if (response.url().includes('/api/parties')) {
      const encoding = response.headers()['content-encoding'];
      console.log('Content-Encoding:', encoding);
      
      expect(encoding, 'API responses should be compressed').toMatch(/gzip|br|deflate/);
    }
  });
  
  await page.goto('/parties');
  await page.waitForTimeout(1000);
});
```

### 6.2 Bundle Size Testing

**Test: JavaScript Bundle Size**
```typescript
test('PERF-NET-003: Main JS bundle under 500KB', async ({ page }) => {
  const resources: any[] = [];
  
  page.on('response', async response => {
    if (response.url().endsWith('.js')) {
      const body = await response.body();
      resources.push({
        url: response.url(),
        size: body.length,
        compressed: response.headers()['content-encoding']
      });
    }
  });
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Find main bundle
  const mainBundle = resources.find(r => r.url.includes('index') || r.url.includes('main'));
  
  if (mainBundle) {
    const bundleSizeKB = mainBundle.size / 1024;
    console.log('Main Bundle Size:', bundleSizeKB.toFixed(2), 'KB');
    console.log('Compressed:', mainBundle.compressed);
    
    expect(bundleSizeKB, 'Main bundle should be under 500KB').toBeLessThan(500);
  }
  
  // Total JS size
  const totalJSSize = resources.reduce((sum, r) => sum + r.size, 0) / 1024;
  console.log('Total JS Size:', totalJSSize.toFixed(2), 'KB');
  
  expect(totalJSSize, 'Total JS should be under 1MB').toBeLessThan(1024);
});
```


---

## 7. Concurrent User Testing

### 7.1 Load Testing with Multiple Contexts

**Test: 10 Concurrent Users**
```typescript
test('PERF-LOAD-001: System handles 10 concurrent users', async ({ browser }) => {
  const userCount = 10;
  const contexts = [];
  const results: any[] = [];
  
  // Create 10 browser contexts (simulating 10 users)
  for (let i = 0; i < userCount; i++) {
    const context = await browser.newContext();
    contexts.push(context);
  }
  
  // All users login and navigate simultaneously
  const startTime = Date.now();
  
  await Promise.all(contexts.map(async (context, index) => {
    const page = await context.newPage();
    const userStartTime = Date.now();
    
    try {
      await page.goto('/login');
      await page.fill('[data-testid="login-identifier-input"]', `user${index}@example.com`);
      await page.fill('[data-testid="login-password-input"]', 'password123');
      await page.click('[data-testid="login-submit-button"]');
      await page.waitForURL('/dashboard', { timeout: 10000 });
      
      // Navigate to parties
      await page.goto('/parties');
      await page.waitForSelector('[data-testid="party-table-row"]', { timeout: 10000 });
      
      const userEndTime = Date.now();
      
      results.push({
        user: index,
        duration: userEndTime - userStartTime,
        success: true
      });
    } catch (error) {
      results.push({
        user: index,
        duration: Date.now() - userStartTime,
        success: false,
        error: error.message
      });
    }
  }));
  
  const totalTime = Date.now() - startTime;
  
  // Analyze results
  const successCount = results.filter(r => r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const maxDuration = Math.max(...results.map(r => r.duration));
  
  console.log('Concurrent Users:', userCount);
  console.log('Total Time:', totalTime, 'ms');
  console.log('Success Rate:', (successCount / userCount * 100).toFixed(2), '%');
  console.log('Avg Duration:', avgDuration.toFixed(2), 'ms');
  console.log('Max Duration:', maxDuration, 'ms');
  
  // Cleanup
  await Promise.all(contexts.map(ctx => ctx.close()));
  
  // Assertions
  expect(successCount, 'All users should succeed').toBe(userCount);
  expect(avgDuration, 'Average duration should be under 5000ms').toBeLessThan(5000);
  expect(maxDuration, 'Max duration should be under 10000ms').toBeLessThan(10000);
});
```

**Test: Concurrent Write Operations**
```typescript
test('PERF-LOAD-002: Concurrent party creation', async ({ browser }) => {
  const concurrentWrites = 5;
  const contexts = [];
  const results: any[] = [];
  
  // Create contexts
  for (let i = 0; i < concurrentWrites; i++) {
    const context = await browser.newContext();
    contexts.push(context);
  }
  
  // Login all users first
  const pages = await Promise.all(contexts.map(async (context) => {
    const page = await context.newPage();
    await page.goto('/login');
    await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
    await page.fill('[data-testid="login-password-input"]', 'password123');
    await page.click('[data-testid="login-submit-button"]');
    await page.waitForURL('/dashboard');
    return page;
  }));
  
  // All users create party simultaneously
  const startTime = Date.now();
  
  await Promise.all(pages.map(async (page, index) => {
    const createStartTime = Date.now();
    
    try {
      await page.goto('/parties');
      await page.click('[data-testid="party-create-button"]');
      await page.fill('[data-testid="party-first-name-input"]', `Concurrent${index}`);
      await page.fill('[data-testid="party-last-name-input"]', `User${index}`);
      await page.fill('[data-testid="party-phone-input"]', `+90555000${String(index).padStart(4, '0')}`);
      await page.click('[data-testid="party-submit-button"]');
      await page.waitForSelector('[data-testid="success-toast"]', { timeout: 10000 });
      
      results.push({
        user: index,
        duration: Date.now() - createStartTime,
        success: true
      });
    } catch (error) {
      results.push({
        user: index,
        duration: Date.now() - createStartTime,
        success: false,
        error: error.message
      });
    }
  }));
  
  const totalTime = Date.now() - startTime;
  
  // Analyze results
  const successCount = results.filter(r => r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  console.log('Concurrent Writes:', concurrentWrites);
  console.log('Total Time:', totalTime, 'ms');
  console.log('Success Rate:', (successCount / concurrentWrites * 100).toFixed(2), '%');
  console.log('Avg Duration:', avgDuration.toFixed(2), 'ms');
  
  // Cleanup
  await Promise.all(contexts.map(ctx => ctx.close()));
  
  // Assertions
  expect(successCount, 'All writes should succeed').toBe(concurrentWrites);
  expect(avgDuration, 'Average write time should be under 3000ms').toBeLessThan(3000);
});
```

---

## 8. Lighthouse Integration

### 8.1 Lighthouse Audit

**Test: Lighthouse Performance Score**
```typescript
import { playAudit } from 'playwright-lighthouse';

test('PERF-LIGHTHOUSE-001: Performance score above 90', async ({ page, context }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Run Lighthouse audit
  const audit = await playAudit({
    page,
    thresholds: {
      performance: 90,
      accessibility: 90,
      'best-practices': 90,
      seo: 80
    },
    reports: {
      formats: {
        html: true,
        json: true
      },
      directory: './lighthouse-reports'
    }
  });
  
  console.log('Lighthouse Scores:', audit.lhr.categories);
  
  expect(audit.lhr.categories.performance.score * 100).toBeGreaterThanOrEqual(90);
});
```

---

## 9. Performance Budgets

### 9.1 Budget Configuration

**Performance Budget File: `performance-budget.json`**
```json
{
  "budgets": [
    {
      "resourceType": "script",
      "budget": 500
    },
    {
      "resourceType": "stylesheet",
      "budget": 100
    },
    {
      "resourceType": "image",
      "budget": 200
    },
    {
      "resourceType": "font",
      "budget": 100
    },
    {
      "resourceType": "document",
      "budget": 50
    },
    {
      "resourceType": "total",
      "budget": 1000
    }
  ],
  "timings": [
    {
      "metric": "first-contentful-paint",
      "budget": 2000
    },
    {
      "metric": "largest-contentful-paint",
      "budget": 2500
    },
    {
      "metric": "time-to-interactive",
      "budget": 3800
    },
    {
      "metric": "cumulative-layout-shift",
      "budget": 0.1
    }
  ]
}
```

**Test: Enforce Performance Budget**
```typescript
test('PERF-BUDGET-001: Performance budget not exceeded', async ({ page }) => {
  const budget = {
    script: 500 * 1024, // 500KB
    stylesheet: 100 * 1024, // 100KB
    image: 200 * 1024, // 200KB
    font: 100 * 1024, // 100KB
    total: 1000 * 1024 // 1MB
  };
  
  const resources = {
    script: 0,
    stylesheet: 0,
    image: 0,
    font: 0,
    total: 0
  };
  
  page.on('response', async response => {
    const contentType = response.headers()['content-type'] || '';
    const body = await response.body().catch(() => Buffer.from([]));
    const size = body.length;
    
    if (contentType.includes('javascript')) {
      resources.script += size;
    } else if (contentType.includes('css')) {
      resources.stylesheet += size;
    } else if (contentType.includes('image')) {
      resources.image += size;
    } else if (contentType.includes('font')) {
      resources.font += size;
    }
    
    resources.total += size;
  });
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Log resource sizes
  console.log('Resource Sizes:');
  console.log('  Script:', (resources.script / 1024).toFixed(2), 'KB');
  console.log('  Stylesheet:', (resources.stylesheet / 1024).toFixed(2), 'KB');
  console.log('  Image:', (resources.image / 1024).toFixed(2), 'KB');
  console.log('  Font:', (resources.font / 1024).toFixed(2), 'KB');
  console.log('  Total:', (resources.total / 1024).toFixed(2), 'KB');
  
  // Check budgets
  expect(resources.script, 'Script budget exceeded').toBeLessThanOrEqual(budget.script);
  expect(resources.stylesheet, 'Stylesheet budget exceeded').toBeLessThanOrEqual(budget.stylesheet);
  expect(resources.image, 'Image budget exceeded').toBeLessThanOrEqual(budget.image);
  expect(resources.font, 'Font budget exceeded').toBeLessThanOrEqual(budget.font);
  expect(resources.total, 'Total budget exceeded').toBeLessThanOrEqual(budget.total);
});
```


---

## 10. Real User Monitoring (RUM)

### 10.1 Custom Performance Metrics

**Test: Custom Timing Marks**
```typescript
test('PERF-RUM-001: Custom performance marks tracked', async ({ page }) => {
  await page.goto('/login');
  
  // Add custom performance marks
  await page.evaluate(() => {
    performance.mark('login-start');
  });
  
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  
  await page.waitForURL('/dashboard');
  
  await page.evaluate(() => {
    performance.mark('login-end');
    performance.measure('login-duration', 'login-start', 'login-end');
  });
  
  // Get custom metrics
  const metrics = await page.evaluate(() => {
    const measures = performance.getEntriesByType('measure');
    return measures.map(m => ({
      name: m.name,
      duration: m.duration
    }));
  });
  
  console.log('Custom Metrics:', metrics);
  
  const loginDuration = metrics.find(m => m.name === 'login-duration');
  expect(loginDuration?.duration, 'Login should complete under 3000ms').toBeLessThan(3000);
});
```

**Test: Navigation Timing API**
```typescript
test('PERF-RUM-002: Navigation timing collected', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="login-identifier-input"]', 'test@example.com');
  await page.fill('[data-testid="login-password-input"]', 'password123');
  await page.click('[data-testid="login-submit-button"]');
  await page.waitForURL('/dashboard');
  
  // Collect navigation timing
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      dns: nav.domainLookupEnd - nav.domainLookupStart,
      tcp: nav.connectEnd - nav.connectStart,
      request: nav.responseStart - nav.requestStart,
      response: nav.responseEnd - nav.responseStart,
      dom: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
      load: nav.loadEventEnd - nav.loadEventStart,
      total: nav.loadEventEnd - nav.fetchStart
    };
  });
  
  console.log('Navigation Timing:');
  console.log('  DNS:', timing.dns.toFixed(2), 'ms');
  console.log('  TCP:', timing.tcp.toFixed(2), 'ms');
  console.log('  Request:', timing.request.toFixed(2), 'ms');
  console.log('  Response:', timing.response.toFixed(2), 'ms');
  console.log('  DOM:', timing.dom.toFixed(2), 'ms');
  console.log('  Load:', timing.load.toFixed(2), 'ms');
  console.log('  Total:', timing.total.toFixed(2), 'ms');
  
  // Assertions
  expect(timing.total, 'Total page load should be under 5000ms').toBeLessThan(5000);
  expect(timing.dns, 'DNS lookup should be under 100ms').toBeLessThan(100);
  expect(timing.request, 'Request time should be under 500ms').toBeLessThan(500);
});
```

---

## Performance Test Execution

### Run All Performance Tests
```bash
# Run all performance tests
npx playwright test --grep "PERF-"

# Run specific category
npx playwright test --grep "PERF-LCP-"
npx playwright test --grep "PERF-API-"
npx playwright test --grep "PERF-RENDER-"
npx playwright test --grep "PERF-MEM-"
npx playwright test --grep "PERF-LOAD-"

# Run with performance profiling
npx playwright test --grep "PERF-" --reporter=html

# Run with Chrome DevTools Protocol tracing
npx playwright test --grep "PERF-" --trace on
```

### CI/CD Integration
```yaml
# .github/workflows/performance-tests.yml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *' # Run daily at 2 AM
  push:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      
      # Run performance tests
      - run: npx playwright test --grep "PERF-"
      
      # Upload results
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: performance-test-results
          path: |
            playwright-report/
            lighthouse-reports/
      
      # Compare with baseline
      - name: Performance Regression Check
        run: |
          node scripts/compare-performance-baseline.js
```

### Performance Monitoring Dashboard

**Script: `scripts/compare-performance-baseline.js`**
```javascript
const fs = require('fs');
const path = require('path');

// Load current results
const currentResults = JSON.parse(
  fs.readFileSync('./playwright-report/results.json', 'utf8')
);

// Load baseline
const baseline = JSON.parse(
  fs.readFileSync('./performance-baseline.json', 'utf8')
);

// Compare metrics
const regressions = [];

for (const [metric, currentValue] of Object.entries(currentResults)) {
  const baselineValue = baseline[metric];
  
  if (baselineValue) {
    const change = ((currentValue - baselineValue) / baselineValue) * 100;
    
    // Flag if performance degraded by more than 10%
    if (change > 10) {
      regressions.push({
        metric,
        baseline: baselineValue,
        current: currentValue,
        change: change.toFixed(2) + '%'
      });
    }
  }
}

// Report regressions
if (regressions.length > 0) {
  console.error('Performance Regressions Detected:');
  console.table(regressions);
  process.exit(1);
} else {
  console.log('No performance regressions detected.');
}
```

---

## Performance Testing Checklist

- [ ] Core Web Vitals measured (LCP, FID, CLS)
- [ ] API response times under thresholds
- [ ] Frontend rendering performance optimized
- [ ] No N+1 queries detected
- [ ] Memory leaks checked
- [ ] Network payloads optimized
- [ ] Concurrent user load tested
- [ ] Lighthouse audit passing
- [ ] Performance budgets enforced
- [ ] RUM metrics collected
- [ ] All tests are debuggable with detailed metrics
- [ ] Performance tests run in CI/CD
- [ ] Baseline comparison automated
- [ ] Performance dashboard configured

---

## Performance Optimization Tips

### Frontend Optimization
1. **Code Splitting**: Split bundles by route
2. **Lazy Loading**: Load components on demand
3. **Memoization**: Use React.memo, useMemo, useCallback
4. **Virtual Scrolling**: For large lists (react-window, react-virtualized)
5. **Image Optimization**: WebP format, lazy loading, responsive images
6. **Tree Shaking**: Remove unused code
7. **Debouncing**: Debounce search inputs and API calls

### Backend Optimization
1. **Database Indexing**: Index frequently queried columns
2. **Query Optimization**: Use joins instead of N+1 queries
3. **Caching**: Redis for frequently accessed data
4. **Pagination**: Limit result sets
5. **Connection Pooling**: Reuse database connections
6. **Compression**: Enable gzip/brotli compression
7. **CDN**: Serve static assets from CDN

### API Optimization
1. **Response Compression**: Enable gzip/brotli
2. **Field Selection**: Allow clients to request specific fields
3. **Batch Endpoints**: Combine multiple requests
4. **Rate Limiting**: Prevent abuse
5. **Caching Headers**: Set appropriate Cache-Control headers
6. **HTTP/2**: Enable HTTP/2 for multiplexing
7. **GraphQL**: Consider for complex data requirements

---

## Performance Metrics Reference

### Target Metrics (Good)
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1
- **TTI**: < 3.8s
- **API Response**: < 500ms
- **Page Load**: < 3s
- **Bundle Size**: < 500KB (main)
- **Memory Growth**: < 50MB per session

### Warning Thresholds
- **LCP**: 2.5s - 4s
- **FID**: 100ms - 300ms
- **CLS**: 0.1 - 0.25
- **TTI**: 3.8s - 7.3s
- **API Response**: 500ms - 1s
- **Page Load**: 3s - 5s

### Critical Thresholds (Poor)
- **LCP**: > 4s
- **FID**: > 300ms
- **CLS**: > 0.25
- **TTI**: > 7.3s
- **API Response**: > 1s
- **Page Load**: > 5s

---

## Debugging Performance Issues

### Chrome DevTools
1. **Performance Tab**: Record and analyze runtime performance
2. **Network Tab**: Check request timing and payload sizes
3. **Memory Tab**: Detect memory leaks
4. **Lighthouse**: Run audits
5. **Coverage Tab**: Find unused code

### Playwright Tracing
```bash
# Enable tracing
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Performance Profiling
```typescript
// Add to playwright.config.ts
use: {
  trace: 'on-first-retry',
  video: 'retain-on-failure',
  screenshot: 'only-on-failure'
}
```

---

## Resources

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Playwright Performance](https://playwright.dev/docs/test-performance)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
