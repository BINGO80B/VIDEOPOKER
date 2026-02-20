#!/usr/bin/env python3
"""
Video Poker Double Game Test Suite - Fixed Version
Clean testing of double game functionality with proper state management
"""

import requests
import json
import sys
from datetime import datetime

# Use the public backend URL from frontend/.env
BASE_URL = "https://mobile-poker-casino.preview.emergentagent.com/api"
CORRECT_PASSWORD = "c27041279"

class CleanDoubleGameTester:
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
    
    def clean_state(self):
        """Clean any existing double game state"""
        try:
            self.session.post(f"{BASE_URL}/double/cancel")
        except:
            pass
    
    def test_double_edge_cases_clean(self):
        """Test double game edge cases with clean state"""
        print("\n=== Testing Double Game Edge Cases (Clean) ===")
        
        # Clean state first
        self.clean_state()
        
        # Set low credits (2000) for insufficient credit test
        try:
            self.session.post(f"{BASE_URL}/reload", json={"password": CORRECT_PASSWORD, "amount": 2000})
        except:
            pass
        
        # Test 1: Try to start double without sufficient credits (amount > credits)
        try:
            response = self.session.post(f"{BASE_URL}/double/start?amount=150000")
            if response.status_code == 400:
                self.log_test("Double start insufficient credits (clean)", True, "Correctly rejected with 400")
            else:
                self.log_test("Double start insufficient credits (clean)", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Double start insufficient credits (clean)", False, f"Exception: {str(e)}")
        
        # Clean state again to ensure no double game is active
        self.clean_state()
        
        # Test 2: Try to select card without active double game
        try:
            response = self.session.post(f"{BASE_URL}/double/select", json={"selected_index": 0})
            if response.status_code == 400:
                self.log_test("Double select without active game (clean)", True, "Correctly rejected with 400")
            else:
                self.log_test("Double select without active game (clean)", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Double select without active game (clean)", False, f"Exception: {str(e)}")
    
    def test_complete_double_workflow(self):
        """Test the complete double workflow as requested"""
        print("\n=== Testing Complete Double Workflow ===")
        
        # Clean state
        self.clean_state()
        
        # a. First reload credits: POST /api/reload with password "c27041279" and amount 10000
        try:
            reload_response = self.session.post(f"{BASE_URL}/reload", 
                                              json={"password": "c27041279", "amount": 10000})
            if reload_response.status_code == 200:
                data = reload_response.json()
                self.log_test("Reload 10000 credits", True, f"Credits: {data.get('credits')}")
            else:
                self.log_test("Reload 10000 credits", False, f"Status: {reload_response.status_code}")
                return
        except Exception as e:
            self.log_test("Reload 10000 credits", False, f"Exception: {str(e)}")
            return
        
        # b. Deal a hand: POST /api/deal with bet 500
        try:
            deal_response = self.session.post(f"{BASE_URL}/deal", json={"bet": 500})
            if deal_response.status_code == 200:
                deal_data = deal_response.json()
                self.log_test("Deal hand with bet 500", True, f"5 cards dealt, credits: {deal_data.get('credits')}")
            else:
                self.log_test("Deal hand with bet 500", False, f"Status: {deal_response.status_code}")
                return
        except Exception as e:
            self.log_test("Deal hand with bet 500", False, f"Exception: {str(e)}")
            return
        
        # c. Draw cards: POST /api/draw with held_indices []
        try:
            draw_response = self.session.post(f"{BASE_URL}/draw", json={"held_indices": []})
            if draw_response.status_code == 200:
                draw_data = draw_response.json()
                winnings = draw_data.get("winnings", 0)
                hand_type = draw_data.get("hand_type")
                credits_after_draw = draw_data.get("credits")
                
                self.log_test("Draw cards (discard all)", True, 
                            f"Hand: {hand_type}, Winnings: {winnings}, Credits: {credits_after_draw}")
                
                # d. If winnings > 0, test double game
                if winnings > 0:
                    self.test_double_game_mechanics(credits_after_draw)
                else:
                    # Try to force a winning hand for testing by playing more rounds
                    self.force_winning_hand_and_test()
            else:
                self.log_test("Draw cards (discard all)", False, f"Status: {draw_response.status_code}")
        except Exception as e:
            self.log_test("Draw cards (discard all)", False, f"Exception: {str(e)}")
    
    def force_winning_hand_and_test(self):
        """Force a winning hand by playing multiple rounds"""
        print("\n--- Attempting to get winning hand for double testing ---")
        
        for attempt in range(15):  # Try up to 15 hands
            try:
                # Deal
                deal_response = self.session.post(f"{BASE_URL}/deal", json={"bet": 500})
                if deal_response.status_code != 200:
                    continue
                
                # Draw (hold no cards for maximum variety)
                draw_response = self.session.post(f"{BASE_URL}/draw", json={"held_indices": []})
                if draw_response.status_code != 200:
                    continue
                
                draw_data = draw_response.json()
                winnings = draw_data.get("winnings", 0)
                
                if winnings > 0:
                    credits = draw_data.get("credits")
                    hand_type = draw_data.get("hand_type")
                    self.log_test(f"Winning hand found (attempt {attempt + 1})", True, 
                                f"Hand: {hand_type}, Winnings: {winnings}")
                    self.test_double_game_mechanics(credits)
                    return
                    
            except Exception as e:
                continue
        
        self.log_test("Force winning hand", False, "Could not get winning hand in 15 attempts")
    
    def test_double_game_mechanics(self, initial_credits):
        """Test double game mechanics with actual winnings"""
        print("\n--- Testing Double Game Mechanics ---")
        
        amount = 500
        
        # Test POST /api/double/start?amount=500
        try:
            start_response = self.session.post(f"{BASE_URL}/double/start?amount={amount}")
            if start_response.status_code == 200:
                start_data = start_response.json()
                dealer_card = start_data.get("dealer_card")
                returned_amount = start_data.get("amount")
                
                if dealer_card and returned_amount == amount:
                    self.log_test("Double start with amount 500", True, 
                                f"Dealer card: {dealer_card['rank']} of {dealer_card['suit']}")
                    
                    # Test POST /api/double/select with selected_index 0
                    self.test_double_select_mechanics(initial_credits, amount)
                else:
                    self.log_test("Double start with amount 500", False, "Missing dealer_card or incorrect amount")
            else:
                self.log_test("Double start with amount 500", False, f"Status: {start_response.status_code}")
        except Exception as e:
            self.log_test("Double start with amount 500", False, f"Exception: {str(e)}")
    
    def test_double_select_mechanics(self, initial_credits, amount):
        """Test double select mechanics"""
        try:
            select_response = self.session.post(f"{BASE_URL}/double/select", json={"selected_index": 0})
            if select_response.status_code == 200:
                select_data = select_response.json()
                
                required_fields = ["result", "player_card", "dealer_card", "credits", "amount"]
                if all(field in select_data for field in required_fields):
                    result = select_data["result"]
                    player_card = select_data["player_card"]
                    dealer_card = select_data["dealer_card"] 
                    final_credits = select_data["credits"]
                    
                    # Verify result logic
                    rank_values = {'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, 
                                 '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14}
                    
                    player_val = rank_values[player_card["rank"]]
                    dealer_val = rank_values[dealer_card["rank"]]
                    
                    if player_val > dealer_val:
                        expected_result = "win"
                        expected_credits = initial_credits + amount
                    elif player_val < dealer_val:
                        expected_result = "lose"
                        expected_credits = initial_credits - amount
                    else:
                        expected_result = "tie"
                        expected_credits = initial_credits
                    
                    # Check result correctness
                    result_correct = (result == expected_result)
                    credits_correct = (final_credits == expected_credits)
                    
                    if result_correct and credits_correct:
                        self.log_test("Double select logic verification", True, 
                                    f"Result: {result}, Player: {player_card['rank']}, Dealer: {dealer_card['rank']}, Credits: {final_credits}")
                    else:
                        issues = []
                        if not result_correct:
                            issues.append(f"Result expected {expected_result}, got {result}")
                        if not credits_correct:
                            issues.append(f"Credits expected {expected_credits}, got {final_credits}")
                        self.log_test("Double select logic verification", False, "; ".join(issues))
                else:
                    missing = [f for f in required_fields if f not in select_data]
                    self.log_test("Double select logic verification", False, f"Missing fields: {missing}")
            else:
                self.log_test("Double select logic verification", False, f"Status: {select_response.status_code}")
        except Exception as e:
            self.log_test("Double select logic verification", False, f"Exception: {str(e)}")
    
    def test_double_cancel_functionality(self):
        """Test POST /api/double/cancel"""
        print("\n=== Testing Double Cancel Functionality ===")
        
        # Clean state first
        self.clean_state()
        
        # Get a winning hand first
        winning_achieved = False
        for attempt in range(10):
            try:
                deal_response = self.session.post(f"{BASE_URL}/deal", json={"bet": 500})
                if deal_response.status_code != 200:
                    continue
                    
                draw_response = self.session.post(f"{BASE_URL}/draw", json={"held_indices": []})
                if draw_response.status_code != 200:
                    continue
                
                draw_data = draw_response.json()
                if draw_data.get("winnings", 0) > 0:
                    winning_achieved = True
                    break
            except:
                continue
        
        if not winning_achieved:
            self.log_test("Double cancel setup", False, "Could not achieve winning hand")
            return
        
        # Start double game
        try:
            start_response = self.session.post(f"{BASE_URL}/double/start?amount=500")
            if start_response.status_code == 200:
                # Now test cancel
                cancel_response = self.session.post(f"{BASE_URL}/double/cancel")
                if cancel_response.status_code == 200:
                    cancel_data = cancel_response.json()
                    if "credits" in cancel_data:
                        self.log_test("Double cancel functionality", True, 
                                    f"Cancelled successfully, Credits: {cancel_data['credits']}")
                    else:
                        self.log_test("Double cancel functionality", False, "Missing credits in response")
                else:
                    self.log_test("Double cancel functionality", False, f"Status: {cancel_response.status_code}")
            else:
                self.log_test("Double cancel setup", False, "Could not start double game")
        except Exception as e:
            self.log_test("Double cancel functionality", False, f"Exception: {str(e)}")
    
    def run_focused_tests(self):
        """Run focused tests for the review requirements"""
        print(f"\n{'='*60}")
        print("FOCUSED VIDEO POKER DOUBLE GAME TESTS")
        print(f"Base URL: {BASE_URL}")
        print(f"{'='*60}")
        
        # Test specific requirements from review
        self.test_complete_double_workflow()
        self.test_double_edge_cases_clean()
        self.test_double_cancel_functionality()
        
        # Print summary
        print(f"\n{'='*60}")
        print("FOCUSED TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {self.results['total_tests']}")
        print(f"Passed: {self.results['passed_tests']}")
        print(f"Failed: {self.results['failed_tests']}")
        
        if self.results['total_tests'] > 0:
            success_rate = (self.results['passed_tests']/self.results['total_tests']*100)
            print(f"Success Rate: {success_rate:.1f}%")
        
        # Print failed tests
        failed_tests = [t for t in self.results['test_details'] if t['status'] == 'FAIL']
        if failed_tests:
            print(f"\nFAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  ❌ {test['test']}: {test['details']}")
        
        return self.results

if __name__ == "__main__":
    tester = CleanDoubleGameTester()
    results = tester.run_focused_tests()
    
    # Exit with non-zero code if any tests failed
    sys.exit(0 if results['failed_tests'] == 0 else 1)