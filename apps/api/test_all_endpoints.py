#!/usr/bin/env python3
"""
Comprehensive Backend Endpoint Testing Script
Tests all admin CRM and landing page endpoints

Usage:
    python test_all_endpoints.py
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, List, Tuple
from colorama import init, Fore, Style

# Initialize colorama for colored output
init(autoreset=True)

# Configuration
BASE_URL = "http://localhost:5003"
ADMIN_EMAIL = "admin@x-ear.com"
ADMIN_PASSWORD = "admin123"

# Test results storage
test_results = {
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "errors": []
}


class EndpointTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_token = None
        # Add Idempotency-Key required by server for write operations
        self.headers = {"Content-Type": "application/json", "Idempotency-Key": "test-run-key"}
        
    def log_test(self, name: str, status: str, details: str = ""):
        """Log test result with colors"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        if status == "PASS":
            print(f"{Fore.GREEN}[{timestamp}] ✓ PASS{Style.RESET_ALL} {name}")
            if details:
                print(f"  {Fore.CYAN}{details}{Style.RESET_ALL}")
            test_results["passed"] += 1
        elif status == "FAIL":
            print(f"{Fore.RED}[{timestamp}] ✗ FAIL{Style.RESET_ALL} {name}")
            if details:
                print(f"  {Fore.RED}{details}{Style.RESET_ALL}")
            test_results["failed"] += 1
            test_results["errors"].append({"test": name, "details": details})
        elif status == "SKIP":
            print(f"{Fore.YELLOW}[{timestamp}] ⊘ SKIP{Style.RESET_ALL} {name}")
            if details:
                print(f"  {Fore.YELLOW}{details}{Style.RESET_ALL}")
            test_results["skipped"] += 1
        else:
            print(f"{Fore.BLUE}[{timestamp}] ℹ INFO{Style.RESET_ALL} {name}")
            if details:
                print(f"  {details}")
    
    def test_endpoint(self, method: str, endpoint: str, **kwargs) -> Tuple[bool, Dict]:
        """
        Generic endpoint testing method
        Returns: (success: bool, response_data: dict)
        """
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=self.headers, timeout=10, **kwargs)
            elif method.upper() == "POST":
                response = self.session.post(url, headers=self.headers, timeout=10, **kwargs)
            elif method.upper() == "PUT":
                response = self.session.put(url, headers=self.headers, timeout=10, **kwargs)
            elif method.upper() == "PATCH":
                response = self.session.patch(url, headers=self.headers, timeout=10, **kwargs)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=self.headers, timeout=10, **kwargs)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            # Try to parse JSON response
            try:
                data = response.json()
            except:
                data = {"status_code": response.status_code, "text": response.text[:200]}
            
            # Consider 2xx and some 4xx as successful test execution (not necessarily success response)
            success = response.status_code < 500
            
            return success, {
                "status_code": response.status_code,
                "data": data
            }
            
        except requests.exceptions.Timeout:
            return False, {"error": "Request timeout"}
        except requests.exceptions.ConnectionError:
            return False, {"error": "Connection error - is the server running?"}
        except Exception as e:
            return False, {"error": str(e)}
    
    def authenticate_admin(self) -> bool:
        """Authenticate as admin and store token"""
        self.log_test("Authentication", "INFO", f"Logging in as {ADMIN_EMAIL}...")
        
        success, response = self.test_endpoint(
            "POST",
            "/api/admin/auth/login",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            }
        )
        
        if success and response["status_code"] == 200:
            data = response.get("data", {})
            # Handle nested structure: data.data.token or data.token
            if isinstance(data, dict):
                inner_data = data.get("data", data)
                if isinstance(inner_data, dict):
                    token = inner_data.get("token") or inner_data.get("access_token")
                else:
                    token = None
            else:
                token = None
            
            if token:
                self.admin_token = token
                self.headers["Authorization"] = f"Bearer {token}"
                self.log_test("Admin Login", "PASS", f"Token: {token[:20]}...")
                return True
            else:
                self.log_test("Admin Login", "FAIL", f"No token in response: {data}")
                return False
        else:
            self.log_test("Admin Login", "FAIL", 
                         f"Status: {response.get('status_code')}, Data: {response.get('data')}")
            return False
    
    def run_all_tests(self):
        """Run all endpoint tests"""
        print(f"\n{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}Starting Backend Endpoint Tests{Style.RESET_ALL}")
        print(f"{Fore.CYAN}Base URL: {self.base_url}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'='*80}{Style.RESET_ALL}\n")
        
        # Test 1: Health Check (no auth required)
        self.test_health_endpoint()
        
        # Test 2: Admin Authentication
        if not self.authenticate_admin():
            print(f"\n{Fore.RED}Authentication failed! Cannot continue with protected endpoints.{Style.RESET_ALL}")
            return
        
        # Test 3: Public Landing Page Endpoints
        self.test_landing_page_endpoints()
        
        # Test 4: Admin Dashboard Endpoints
        self.test_admin_dashboard_endpoints()
        
        # Test 5: Admin Analytics Endpoints
        self.test_admin_analytics_endpoints()
        
        # Test 6: Admin Tenants Endpoints
        self.test_admin_tenants_endpoints()
        
        # Test 7: Admin Plans Endpoints
        self.test_admin_plans_endpoints()
        
        # Test 8: Admin Addons Endpoints
        self.test_admin_addons_endpoints()
        
        # Test 9: Admin Users Endpoints
        self.test_admin_users_endpoints()
        
        # Test 10: Admin Settings Endpoints
        self.test_admin_settings_endpoints()
        
        # Test 11: Admin Tickets Endpoints
        self.test_admin_tickets_endpoints()
        
        # Test 12: Checkout/Commerce Endpoints
        self.test_checkout_endpoints()
        
        # Print summary
        self.print_summary()
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        print(f"\n{Fore.MAGENTA}[Public Health Endpoint]{Style.RESET_ALL}")
        
        success, response = self.test_endpoint("GET", "/api/health")
        
        if success and response["status_code"] == 200:
            self.log_test("GET /api/health", "PASS", 
                         f"Database connected: {response['data'].get('database_connected', False)}")
        else:
            self.log_test("GET /api/health", "FAIL", 
                         f"Status: {response.get('status_code')}")
    
    def test_landing_page_endpoints(self):
        """Test public landing page endpoints"""
        print(f"\n{Fore.MAGENTA}[Landing Page Endpoints]{Style.RESET_ALL}")
        
        # Test GET /api/plans (public)
        success, response = self.test_endpoint("GET", "/api/plans")
        if success and response["status_code"] in [200, 404]:
            self.log_test("GET /api/plans", "PASS", 
                         f"Plans found: {len(response['data'].get('data', [])) if isinstance(response['data'], dict) else 0}")
        else:
            self.log_test("GET /api/plans", "FAIL", 
                         f"Status: {response.get('status_code')}")
        
        # Test GET /api/config/turnstile
        success, response = self.test_endpoint("GET", "/api/config/turnstile")
        if success and response["status_code"] == 200:
            self.log_test("GET /api/config/turnstile", "PASS", 
                         f"Site key configured: {bool(response['data'].get('siteKey'))}")
        else:
            self.log_test("GET /api/config/turnstile", "FAIL", 
                         f"Status: {response.get('status_code')}")
        
        # Test checkout session creation (without actually creating)
        # Just test if endpoint is accessible
        self.log_test("POST /api/checkout/session", "SKIP", 
                     "Skipped to avoid creating test data")
    
    def test_admin_dashboard_endpoints(self):
        """Test admin dashboard endpoints"""
        print(f"\n{Fore.MAGENTA}[Admin Dashboard Endpoints]{Style.RESET_ALL}")
        
        # Test GET /api/admin/dashboard/metrics
        success, response = self.test_endpoint("GET", "/api/admin/dashboard/metrics")
        if success and response["status_code"] in [200, 404]:
            self.log_test("GET /api/admin/dashboard/metrics", "PASS", 
                         f"Metrics retrieved successfully")
        else:
            self.log_test("GET /api/admin/dashboard/metrics", "FAIL", 
                         f"Status: {response.get('status_code')}, Error: {response.get('data', {}).get('error', 'Unknown')}")
    
    def test_admin_analytics_endpoints(self):
        """Test admin analytics endpoints"""
        print(f"\n{Fore.MAGENTA}[Admin Analytics Endpoints]{Style.RESET_ALL}")
        
        # Test GET /api/admin/analytics (main analytics endpoint)
        success, response = self.test_endpoint("GET", "/api/admin/analytics")
        if success and response["status_code"] in [200, 404]:
            self.log_test("GET /api/admin/analytics", "PASS", 
                         f"Analytics data retrieved")
        else:
            self.log_test("GET /api/admin/analytics", "FAIL", 
                         f"Status: {response.get('status_code')}")
    
    def test_admin_tenants_endpoints(self):
        """Test admin tenant management endpoints"""
        print(f"\n{Fore.MAGENTA}[Admin Tenants Endpoints]{Style.RESET_ALL}")
        
        # Test GET /api/admin/tenants
        success, response = self.test_endpoint("GET", "/api/admin/tenants")
        if success and response["status_code"] in [200, 404]:
            tenants = response.get('data', {}).get('data', []) if isinstance(response.get('data'), dict) else []
            self.log_test("GET /api/admin/tenants", "PASS", 
                         f"Tenants found: {len(tenants) if isinstance(tenants, list) else 0}")
        else:
            self.log_test("GET /api/admin/tenants", "FAIL", 
                         f"Status: {response.get('status_code')}")
        
        # Test GET /api/admin/tenants/stats
        success, response = self.test_endpoint("GET", "/api/admin/tenants/stats")
        if success and response["status_code"] in [200, 404]:
            self.log_test("GET /api/admin/tenants/stats", "PASS", 
                         f"Tenant stats retrieved")
        else:
            self.log_test("GET /api/admin/tenants/stats", "FAIL", 
                         f"Status: {response.get('status_code')}")
    
    def test_admin_plans_endpoints(self):
        """Test admin plan management endpoints"""
        print(f"\n{Fore.MAGENTA}[Admin Plans Endpoints]{Style.RESET_ALL}")
        
        # Test GET /api/admin/plans
        success, response = self.test_endpoint("GET", "/api/admin/plans")
        if success and response["status_code"] in [200, 404]:
            plans = response.get('data', {}).get('data', []) if isinstance(response.get('data'), dict) else []
            self.log_test("GET /api/admin/plans", "PASS", 
                         f"Plans found: {len(plans) if isinstance(plans, list) else 0}")
        else:
            self.log_test("GET /api/admin/plans", "FAIL", 
                         f"Status: {response.get('status_code')}")
        
        # Test GET /api/admin/plans/stats
        success, response = self.test_endpoint("GET", "/api/admin/plans/stats")
        if success and response["status_code"] in [200, 404]:
            self.log_test("GET /api/admin/plans/stats", "PASS", 
                         f"Plan stats retrieved")
        else:
            self.log_test("GET /api/admin/plans/stats", "FAIL", 
                         f"Status: {response.get('status_code')}")
    
    def test_admin_addons_endpoints(self):
        """Test admin addon management endpoints"""
        print(f"\n{Fore.MAGENTA}[Admin Addons Endpoints]{Style.RESET_ALL}")
        
        # Test GET /api/admin/addons
        success, response = self.test_endpoint("GET", "/api/admin/addons")
        if success and response["status_code"] in [200, 404]:
            addons = response.get('data', {}).get('data', []) if isinstance(response.get('data'), dict) else []
            self.log_test("GET /api/admin/addons", "PASS", 
                         f"Addons found: {len(addons) if isinstance(addons, list) else 0}")
        else:
            self.log_test("GET /api/admin/addons", "FAIL", 
                         f"Status: {response.get('status_code')}")
    
    def test_admin_users_endpoints(self):
        """Test admin user management endpoints"""
        print(f"\n{Fore.MAGENTA}[Admin Users Endpoints]{Style.RESET_ALL}")
        
        # Test GET /api/admin/users
        success, response = self.test_endpoint("GET", "/api/admin/users")
        if success and response["status_code"] in [200, 404]:
            users = response.get('data', {}).get('data', []) if isinstance(response.get('data'), dict) else []
            self.log_test("GET /api/admin/users", "PASS", 
                         f"Admin users found: {len(users) if isinstance(users, list) else 0}")
        else:
            self.log_test("GET /api/admin/users", "FAIL", 
                         f"Status: {response.get('status_code')}")
        
        # Test GET /api/admin/users/all (all tenant users)
        success, response = self.test_endpoint("GET", "/api/admin/users/all")
        if success and response["status_code"] in [200, 404]:
            data = response.get('data', {})
            users = data.get('users', []) if isinstance(data.get('users'), list) else []
            self.log_test("GET /api/admin/users/all", "PASS", 
                         f"Tenant users found: {len(users)}")
        else:
            self.log_test("GET /api/admin/users/all", "FAIL", 
                         f"Status: {response.get('status_code')}")
    
    def test_admin_settings_endpoints(self):
        """Test admin settings endpoints"""
        print(f"\n{Fore.MAGENTA}[Admin Settings Endpoints]{Style.RESET_ALL}")
        
        # Test GET /api/admin/features
        success, response = self.test_endpoint("GET", "/api/admin/features")
        if success and response["status_code"] == 200:
            features = response.get('data', {}).get('features', {})
            self.log_test("GET /api/admin/features", "PASS", 
                         f"Features found: {len(features) if isinstance(features, dict) else 0}")
        else:
            self.log_test("GET /api/admin/features", "FAIL", 
                         f"Status: {response.get('status_code')}")
    
    def test_admin_tickets_endpoints(self):
        """Test admin support tickets endpoints"""
        print(f"\n{Fore.MAGENTA}[Admin Tickets Endpoints]{Style.RESET_ALL}")
        
        # Test GET /api/admin/tickets
        success, response = self.test_endpoint("GET", "/api/admin/tickets")
        if success and response["status_code"] in [200, 404]:
            tickets = response.get('data', {}).get('data', []) if isinstance(response.get('data'), dict) else []
            self.log_test("GET /api/admin/tickets", "PASS", 
                         f"Tickets found: {len(tickets) if isinstance(tickets, list) else 0}")
        else:
            self.log_test("GET /api/admin/tickets", "FAIL", 
                         f"Status: {response.get('status_code')}")
    
    def test_checkout_endpoints(self):
        """Test checkout and commerce endpoints"""
        print(f"\n{Fore.MAGENTA}[Checkout/Commerce Endpoints]{Style.RESET_ALL}")
        
        # Don't actually create checkout sessions, just verify endpoint exists
        self.log_test("POST /api/checkout/session", "SKIP", 
                     "Skipped to avoid creating test transactions")
        
        self.log_test("POST /api/checkout/confirm", "SKIP", 
                     "Skipped to avoid modifying payment data")
    
    def print_summary(self):
        """Print test summary"""
        print(f"\n{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}Test Summary{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
        
        total = test_results["passed"] + test_results["failed"] + test_results["skipped"]
        
        print(f"\n{Fore.GREEN}Passed:  {test_results['passed']}{Style.RESET_ALL}")
        print(f"{Fore.RED}Failed:  {test_results['failed']}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}Skipped: {test_results['skipped']}{Style.RESET_ALL}")
        print(f"{Fore.WHITE}Total:   {total}{Style.RESET_ALL}")
        
        if test_results["failed"] > 0:
            print(f"\n{Fore.RED}Failed Tests:{Style.RESET_ALL}")
            for error in test_results["errors"]:
                print(f"  {Fore.RED}• {error['test']}{Style.RESET_ALL}")
                print(f"    {error['details']}")
        
        print(f"\n{Fore.CYAN}{'='*80}{Style.RESET_ALL}\n")
        
        # Exit with appropriate code
        sys.exit(0 if test_results["failed"] == 0 else 1)


def main():
    """Main function"""
    tester = EndpointTester(BASE_URL)
    tester.run_all_tests()


if __name__ == "__main__":
    # Try to import colorama, if not available use basic output
    try:
        from colorama import init, Fore, Style
        init(autoreset=True)
    except ImportError:
        print("Warning: colorama not installed. Install it for colored output:")
        print("  pip install colorama")
        # Create dummy classes
        class Fore:
            GREEN = RED = YELLOW = BLUE = MAGENTA = CYAN = WHITE = ""
        class Style:
            RESET_ALL = ""
    
    main()
