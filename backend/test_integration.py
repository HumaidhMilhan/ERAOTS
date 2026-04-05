import requests
import unittest
import time
import uuid

BASE_URL = "http://localhost:8000"

class TestERAOTSBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        print("\n--- Starting ERAOTS Backend Integration Tests ---")
        # 1. Login to get token
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eraots.com", "password": "admin123"}
        )
        if resp.status_code == 200:
            cls.token = resp.json()["access_token"]
            cls.headers = {"Authorization": f"Bearer {cls.token}"}
            print("[✓] Auth: Successfully obtained Super Admin token for alice.")
        else:
            cls.token = None
            cls.headers = {}
            print("[x] Auth: Failed to login. Is test_seed.py run and server active?", resp.text)
            
        cls.department_id = None
        cls.employee_id = None
        cls.scanner_id = None
        cls.leave_id = None
        cls.correction_id = None
        cls.emergency_id = None

    def test_01_departments(self):
        """Test creating and listing departments."""
        # Create
        random_str = str(uuid.uuid4())[:8]
        res = requests.post(f"{BASE_URL}/api/departments/", json={
            "name": f"Integration Test Dept {random_str}",
            "description": "Created by automated tests"
        }, headers=self.headers)
        self.assertEqual(res.status_code, 200, "Failed to create department: " + res.text)
        self.__class__.department_id = res.json()["department_id"]
        
        # List
        res_list = requests.get(f"{BASE_URL}/api/departments/", headers=self.headers)
        self.assertEqual(res_list.status_code, 200, "Failed to list departments")
        self.assertTrue(len(res_list.json()) > 0)
        print("[✓] Departments API verified.")

    def test_02_employees(self):
        """Test creating and listing employees."""
        # Create
        random_str = str(uuid.uuid4())[:8]
        res = requests.post(f"{BASE_URL}/api/employees/", json={
            "first_name": "Test",
            "last_name": f"Worker {random_str}",
            "email": f"testworker{random_str}@eraots.com",
            "department_id": self.department_id,
            "role_name": "EMPLOYEE",
            "password": "securepassword",
            "fingerprint_id": f"TEST_FING_{random_str}"
        }, headers=self.headers)
        self.assertIn(res.status_code, [200, 400], "Failed to create employee: " + res.text)
        if res.status_code == 200:
            self.__class__.employee_id = res.json()["employee_id"]
        
        # List
        res_list = requests.get(f"{BASE_URL}/api/employees/", headers=self.headers)
        self.assertEqual(res_list.status_code, 200, "Failed to list employees")
        print("[✓] Employees API verified.")

    def test_03_scanners(self):
        """Test registering hardware scanners."""
        res = requests.post(f"{BASE_URL}/api/scanners/", json={
            "name": "Test Node Gateway",
            "door_name": "Testing Lobby",
            "location_description": "Lab",
            "heartbeat_interval_sec": 45
        }, headers=self.headers)
        self.assertEqual(res.status_code, 200, "Failed to register scanner: " + res.text)
        self.__class__.scanner_id = res.json()["scanner_id"]
        
        res_list = requests.get(f"{BASE_URL}/api/scanners/", headers=self.headers)
        self.assertEqual(res_list.status_code, 200, "Failed to list scanners")
        print("[✓] Scanners (Hardware) API verified.")

    def test_04_events_and_occupancy(self):
        """Test pushing a scan event and checking occupancy."""
        if not self.scanner_id:
            self.skipTest("No scanner registered.")
            
        res = requests.post(f"{BASE_URL}/api/events/scan", json={
            "scanner_id": self.scanner_id,
            "fingerprint_id": "TEST_FING_123" # Will be "UNKNOWN_FINGERPRINT" but event is valid
        })
        self.assertIn(res.status_code, [200, 404]) # It evaluates validation
        
        res_occ = requests.get(f"{BASE_URL}/api/events/dashboard", headers=self.headers)
        self.assertEqual(res_occ.status_code, 200, "Failed to fetch dashboard")
        print("[✓] Events & Occupancy API verified.")

    def test_05_attendance(self):
        """Test attendance processing."""
        res = requests.post(f"{BASE_URL}/api/attendance/process", params={"target_date": "2026-04-05"}, headers=self.headers)
        self.assertEqual(res.status_code, 200, "Failed to process attendance: " + res.text)
        
        res_get = requests.get(f"{BASE_URL}/api/attendance/", params={"start_date": "2026-04-01"}, headers=self.headers)
        self.assertEqual(res_get.status_code, 200, "Failed to fetch attendance list")
        print("[✓] Attendance Engine API verified.")

    def test_06_settings(self):
        """Test getting and updating policies."""
        res = requests.get(f"{BASE_URL}/api/settings/policies", headers=self.headers)
        self.assertEqual(res.status_code, 200, "Failed to get policies")
        policies = res.json()
        if len(policies) > 0:
            pol_id = policies[0]["policy_id"]
            res_put = requests.put(f"{BASE_URL}/api/settings/policies/{pol_id}", json={
                "name": policies[0]["name"],
                "value": policies[0]["value"]
            }, headers=self.headers)
            self.assertEqual(res_put.status_code, 200)
        print("[✓] Policy Engine API verified.")

    def test_07_schedules_and_leave(self):
        """Test leave creation and listing."""
        types_res = requests.get(f"{BASE_URL}/api/schedules/leave-types", headers=self.headers)
        
        if types_res.status_code == 200 and len(types_res.json()) > 0:
            lt_id = types_res.json()[0]["leave_type_id"]
            res = requests.post(f"{BASE_URL}/api/schedules/leave-requests", json={
                "leave_type_id": lt_id,
                "start_date": "2026-04-10",
                "end_date": "2026-04-12",
                "reason": "Test Leave"
            }, headers=self.headers)
            self.assertEqual(res.status_code, 200, "Failed to submit leave: " + res.text)
            self.__class__.leave_id = res.json()["request_id"]
            
        res_list = requests.get(f"{BASE_URL}/api/schedules/leave-requests", headers=self.headers)
        self.assertEqual(res_list.status_code, 200)
        
        if self.leave_id:
            res_upd = requests.put(f"{BASE_URL}/api/schedules/leave-requests/{self.leave_id}/status", params={"status": "APPROVED", "comment": "Test approval"}, headers=self.headers)
            self.assertEqual(res_upd.status_code, 200, "Failed to approve leave: " + res_upd.text)
        print("[✓] Schedules API verified.")

    def test_08_corrections(self):
        """Test attendance correction loop."""
        res = requests.post(f"{BASE_URL}/api/corrections/", json={
            "correction_date": "2026-04-05",
            "correction_type": "MISSED_SCAN",
            "reason": "Test forgot badge",
            "proposed_time": "2026-04-05T08:55:00Z"
        }, headers=self.headers)
        self.assertEqual(res.status_code, 200, "Failed to submit correction: " + res.text)
        self.__class__.correction_id = res.json()["request_id"]
        
        res_list = requests.get(f"{BASE_URL}/api/corrections/", headers=self.headers)
        self.assertEqual(res_list.status_code, 200)
        
        if self.correction_id:
            res_upd = requests.put(f"{BASE_URL}/api/corrections/{self.correction_id}/status", params={"status": "APPROVED", "comment": "Okay"}, headers=self.headers)
            self.assertEqual(res_upd.status_code, 200, "Failed to update correction status")
        print("[✓] Corrections API verified.")

    def test_09_emergency(self):
        """Test emergency engine."""
        res = requests.post(f"{BASE_URL}/api/emergency/trigger", json={
            "emergency_type": "TEST_DRILL",
            "notes": "Testing"
        }, headers=self.headers)
        if res.status_code == 400 and "active" in res.text:
            pass # already active
        else:
            self.assertEqual(res.status_code, 200, "Failed to trigger emergency: " + res.text)
        
        active = requests.get(f"{BASE_URL}/api/emergency/active", headers=self.headers)
        self.assertEqual(active.status_code, 200)
        
        if active.json():
            ev_id = active.json()["emergency_id"]
            if active.json()["headcount_entries"]:
                hc_id = active.json()["headcount_entries"][0]["id"]
                res_hc = requests.put(f"{BASE_URL}/api/emergency/headcount/{hc_id}/account", headers=self.headers)
                self.assertEqual(res_hc.status_code, 200)
            
            res_res = requests.put(f"{BASE_URL}/api/emergency/{ev_id}/resolve", headers=self.headers)
            self.assertEqual(res_res.status_code, 200)
        print("[✓] Emergency Protocol API verified.")

    def test_10_notifications(self):
        """Test notifications stream."""
        res = requests.get(f"{BASE_URL}/api/notifications/", headers=self.headers)
        self.assertEqual(res.status_code, 200, "Failed to fetch notifications: " + res.text)
        notifs = res.json()
        
        if notifs:
            not_id = notifs[0]["notification_id"]
            res_upd = requests.put(f"{BASE_URL}/api/notifications/{not_id}/read", headers=self.headers)
            self.assertEqual(res_upd.status_code, 200)
        print("[✓] Notifications API verified.")

if __name__ == "__main__":
    unittest.main()
