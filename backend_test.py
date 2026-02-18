#!/usr/bin/env python3
"""
Video Poker Backend API Test Suite
Tests all video poker endpoints as specified in the review request
"""

import requests
import json
import sys
from datetime import datetime

# Use the public backend URL from frontend/.env
BASE_URL = "https://mobile-poker-casino.preview.emergentagent.com/api"

# Test configuration
CORRECT_PASSWORD = "c27041279"
WRONG_PASSWORD = "wrongpassword"

class VideoPokerTester:
    def __init__(self):
        self.results = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "test_details": []
        }
        self.session = requests.Session()
    
    def log_test(self, test_name, passed, details=""):
        """Log test result"""
        self.results["total_tests"] += 1
        if passed:
            self.results["passed_tests"] += 1
            status = "PASS"
        else:
            self.results["failed_tests"] += 1
            status = "FAIL"
        
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        
        self.results["test_details"].append(result)
        print(f"[{status}] {test_name}: {details}")
    
    def test_credits_endpoint(self):
        """Test GET /api/credits endpoint"""
        print("\n=== Testing GET /api/credits ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/credits")
            
            if response.status_code == 200:
                data = response.json()
                if "credits" in data:
                    self.log_test("GET /credits", True, f"Credits: {data['credits']}")
                    return data["credits"]
                else:
                    self.log_test("GET /credits", False, "Response missing 'credits' field")
                    return None
            else:
                self.log_test("GET /credits", False, f"Status code: {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test("GET /credits", False, f"Exception: {str(e)}")
            return None
    
    def test_paytable_endpoint(self):
        """Test GET /api/paytable endpoint"""
        print("\n=== Testing GET /api/paytable ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/paytable")
            
            if response.status_code == 200:
                data = response.json()
                expected_hands = ['royal_flush', 'straight_flush', 'four_of_a_kind', 
                                'full_house', 'flush', 'straight', 'three_of_a_kind', 
                                'two_pair', 'jacks_or_better', 'nothing']
                
                all_hands_present = all(hand in data for hand in expected_hands)
                if all_hands_present:
                    self.log_test("GET /paytable", True, f"All expected hands present")
                    return data
                else:
                    missing = [hand for hand in expected_hands if hand not in data]
                    self.log_test("GET /paytable", False, f"Missing hands: {missing}")
                    return None
            else:
                self.log_test("GET /paytable", False, f"Status code: {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test("GET /paytable", False, f"Exception: {str(e)}")
            return None
    
    def test_reload_endpoint(self):
        """Test POST /api/reload endpoint with various scenarios"""
        print("\n=== Testing POST /api/reload ===")
        
        # Test 1: Correct password and valid amount
        try:
            payload = {"password": CORRECT_PASSWORD, "amount": 5000}
            response = self.session.post(f"{BASE_URL}/reload", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "credits" in data and "message" in data:
                    self.log_test("Reload with correct password", True, f"Credits: {data['credits']}")
                else:
                    self.log_test("Reload with correct password", False, "Response missing required fields")
            else:
                self.log_test("Reload with correct password", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Reload with correct password", False, f"Exception: {str(e)}")
        
        # Test 2: Wrong password
        try:
            payload = {"password": WRONG_PASSWORD, "amount": 5000}
            response = self.session.post(f"{BASE_URL}/reload", json=payload)
            
            if response.status_code == 401:
                self.log_test("Reload with wrong password", True, "Correctly rejected with 401")
            else:
                self.log_test("Reload with wrong password", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_test("Reload with wrong password", False, f"Exception: {str(e)}")
        
        # Test 3: Amount too low
        try:
            payload = {"password": CORRECT_PASSWORD, "amount": 1500}
            response = self.session.post(f"{BASE_URL}/reload", json=payload)
            
            if response.status_code == 400:
                self.log_test("Reload amount too low", True, "Correctly rejected with 400")
            else:
                self.log_test("Reload amount too low", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Reload amount too low", False, f"Exception: {str(e)}")
        
        # Test 4: Amount too high
        try:
            payload = {"password": CORRECT_PASSWORD, "amount": 1500000}
            response = self.session.post(f"{BASE_URL}/reload", json=payload)
            
            if response.status_code == 400:
                self.log_test("Reload amount too high", True, "Correctly rejected with 400")
            else:
                self.log_test("Reload amount too high", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Reload amount too high", False, f"Exception: {str(e)}")
        
        # Get final credits after reload tests
        return self.test_credits_endpoint()
    
    def test_deal_endpoint(self):
        """Test POST /api/deal endpoint"""
        print("\n=== Testing POST /api/deal ===")
        
        # First ensure we have enough credits
        try:
            payload = {"password": CORRECT_PASSWORD, "amount": 10000}
            response = self.session.post(f"{BASE_URL}/reload", json=payload)
            print(f"Reloaded credits for deal testing: {response.status_code}")
        except Exception as e:
            print(f"Error reloading credits: {e}")
        
        # Test 1: Valid bet 100
        try:
            payload = {"bet": 100}
            response = self.session.post(f"{BASE_URL}/deal", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "hand" in data and "credits" in data:
                    if len(data["hand"]) == 5:
                        self.log_test("Deal with bet 100", True, f"Got 5 cards, credits: {data['credits']}")
                        return data
                    else:
                        self.log_test("Deal with bet 100", False, f"Expected 5 cards, got {len(data['hand'])}")
                else:
                    self.log_test("Deal with bet 100", False, "Response missing required fields")
            else:
                self.log_test("Deal with bet 100", False, f"Status code: {response.status_code}, response: {response.text}")
        except Exception as e:
            self.log_test("Deal with bet 100", False, f"Exception: {str(e)}")
        
        # Test 2: Valid bet 2000
        try:
            payload = {"bet": 2000}
            response = self.session.post(f"{BASE_URL}/deal", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "hand" in data and len(data["hand"]) == 5:
                    self.log_test("Deal with bet 2000", True, f"Got 5 cards, credits: {data['credits']}")
                else:
                    self.log_test("Deal with bet 2000", False, "Invalid hand returned")
            else:
                self.log_test("Deal with bet 2000", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Deal with bet 2000", False, f"Exception: {str(e)}")
        
        # Test 3: Invalid bet 50 (too low)
        try:
            payload = {"bet": 50}
            response = self.session.post(f"{BASE_URL}/deal", json=payload)
            
            if response.status_code == 400:
                self.log_test("Deal with invalid bet 50", True, "Correctly rejected with 400")
            else:
                self.log_test("Deal with invalid bet 50", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Deal with invalid bet 50", False, f"Exception: {str(e)}")
        
        # Test 4: Invalid bet 2500 (too high)
        try:
            payload = {"bet": 2500}
            response = self.session.post(f"{BASE_URL}/deal", json=payload)
            
            if response.status_code == 400:
                self.log_test("Deal with invalid bet 2500", True, "Correctly rejected with 400")
            else:
                self.log_test("Deal with invalid bet 2500", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Deal with invalid bet 2500", False, f"Exception: {str(e)}")
        
        return None
    
    def test_draw_endpoint(self):
        """Test POST /api/draw endpoint"""
        print("\n=== Testing POST /api/draw ===")
        
        # First deal a hand with bet 500
        try:
            payload = {"bet": 500}
            deal_response = self.session.post(f"{BASE_URL}/deal", json=payload)
            
            if deal_response.status_code != 200:
                self.log_test("Draw setup (deal)", False, f"Failed to deal hand: {deal_response.status_code}")
                return
                
            deal_data = deal_response.json()
            original_hand = deal_data["hand"]
            credits_before = deal_data["credits"]
            
            # Test draw with held_indices [0, 2, 4]
            payload = {"held_indices": [0, 2, 4]}
            response = self.session.post(f"{BASE_URL}/draw", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["hand", "hand_type", "multiplier", "winnings", "credits"]
                
                if all(field in data for field in required_fields):
                    # Check that held cards remained the same
                    new_hand = data["hand"]
                    held_cards_same = (original_hand[0] == new_hand[0] and 
                                     original_hand[2] == new_hand[2] and 
                                     original_hand[4] == new_hand[4])
                    
                    if held_cards_same:
                        self.log_test("Draw with held indices", True, 
                                    f"Hand: {data['hand_type']}, Multiplier: {data['multiplier']}, "
                                    f"Winnings: {data['winnings']}, Credits: {data['credits']}")
                    else:
                        self.log_test("Draw with held indices", False, "Held cards were not preserved")
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Draw with held indices", False, f"Missing fields: {missing}")
            else:
                self.log_test("Draw with held indices", False, f"Status code: {response.status_code}, response: {response.text}")
                
        except Exception as e:
            self.log_test("Draw with held indices", False, f"Exception: {str(e)}")
        
        # Test draw without active game
        try:
            payload = {"held_indices": [0, 1, 2]}
            response = self.session.post(f"{BASE_URL}/draw", json=payload)
            
            if response.status_code == 400:
                self.log_test("Draw without active game", True, "Correctly rejected with 400")
            else:
                self.log_test("Draw without active game", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Draw without active game", False, f"Exception: {str(e)}")
    
    def test_hand_evaluation_multiple_rounds(self):
        """Test hand evaluation by playing multiple rounds"""
        print("\n=== Testing Hand Evaluation (Multiple Rounds) ===")
        
        hands_seen = set()
        
        for i in range(10):  # Play 10 rounds
            try:
                # Deal
                deal_payload = {"bet": 100}
                deal_response = self.session.post(f"{BASE_URL}/deal", json=deal_payload)
                
                if deal_response.status_code != 200:
                    continue
                
                # Draw (hold all cards to see original hand evaluation)
                draw_payload = {"held_indices": [0, 1, 2, 3, 4]}
                draw_response = self.session.post(f"{BASE_URL}/draw", json=draw_payload)
                
                if draw_response.status_code == 200:
                    data = draw_response.json()
                    hand_type = data.get("hand_type", "unknown")
                    hands_seen.add(hand_type)
                    
                    if i < 3:  # Log first few rounds for verification
                        self.log_test(f"Hand evaluation round {i+1}", True, 
                                    f"Hand type: {hand_type}, Multiplier: {data.get('multiplier', 0)}")
                
            except Exception as e:
                self.log_test(f"Hand evaluation round {i+1}", False, f"Exception: {str(e)}")
        
        # Summary of hand types seen
        if hands_seen:
            self.log_test("Hand evaluation variety", True, f"Hand types seen: {list(hands_seen)}")
        else:
            self.log_test("Hand evaluation variety", False, "No hands successfully evaluated")
    
    def run_all_tests(self):
        """Run all test suites"""
        print(f"\n{'='*60}")
        print("STARTING VIDEO POKER BACKEND API TESTS")
        print(f"Base URL: {BASE_URL}")
        print(f"{'='*60}")
        
        # Test each endpoint
        self.test_credits_endpoint()
        self.test_paytable_endpoint()
        self.test_reload_endpoint()
        self.test_deal_endpoint()
        self.test_draw_endpoint()
        self.test_hand_evaluation_multiple_rounds()
        
        # Print summary
        print(f"\n{'='*60}")
        print("TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {self.results['total_tests']}")
        print(f"Passed: {self.results['passed_tests']}")
        print(f"Failed: {self.results['failed_tests']}")
        print(f"Success Rate: {(self.results['passed_tests']/self.results['total_tests']*100):.1f}%")
        
        # Print failed tests
        failed_tests = [t for t in self.results['test_details'] if t['status'] == 'FAIL']
        if failed_tests:
            print(f"\nFAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  ❌ {test['test']}: {test['details']}")
        
        return self.results

if __name__ == "__main__":
    tester = VideoPokerTester()
    results = tester.run_all_tests()
    
    # Exit with non-zero code if any tests failed
    sys.exit(0 if results['failed_tests'] == 0 else 1)