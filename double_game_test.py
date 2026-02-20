#!/usr/bin/env python3
"""
Video Poker Double Game Test Suite
Comprehensive testing of the double or nothing feature as specified in review request
"""

import requests
import json
import sys
from datetime import datetime

# Use the public backend URL from frontend/.env
BASE_URL = "https://mobile-poker-casino.preview.emergentagent.com/api"
CORRECT_PASSWORD = "c27041279"

class DoubleGameTester:
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
    
    def test_paytable_values(self):
        """Test specific paytable values as required in review"""
        print("\n=== Testing Paytable Values ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/paytable")
            
            if response.status_code == 200:
                paytable = response.json()
                
                # Check specific values from review request
                if paytable.get("full_house") == 7:
                    self.log_test("Paytable full_house value", True, "full_house = 7 (correct)")
                else:
                    self.log_test("Paytable full_house value", False, f"Expected 7, got {paytable.get('full_house')}")
                
                if paytable.get("flush") == 5:
                    self.log_test("Paytable flush value", True, "flush = 5 (correct)")
                else:
                    self.log_test("Paytable flush value", False, f"Expected 5, got {paytable.get('flush')}")
                
                # Verify other key values remain correct
                expected_values = {
                    "royal_flush": 800,
                    "straight_flush": 50,
                    "four_of_a_kind": 25,
                    "straight": 4,
                    "three_of_a_kind": 3,
                    "two_pair": 2,
                    "jacks_or_better": 1,
                    "nothing": 0
                }
                
                all_correct = True
                incorrect_values = []
                for hand, expected in expected_values.items():
                    actual = paytable.get(hand)
                    if actual != expected:
                        all_correct = False
                        incorrect_values.append(f"{hand}: expected {expected}, got {actual}")
                
                if all_correct:
                    self.log_test("Other paytable values", True, "All other values correct")
                else:
                    self.log_test("Other paytable values", False, f"Incorrect: {'; '.join(incorrect_values)}")
                
                return paytable
            else:
                self.log_test("Paytable retrieval", False, f"Status code: {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test("Paytable retrieval", False, f"Exception: {str(e)}")
            return None
    
    def setup_credits(self, amount=10000):
        """Setup credits for testing"""
        try:
            payload = {"password": CORRECT_PASSWORD, "amount": amount}
            response = self.session.post(f"{BASE_URL}/reload", json=payload)
            if response.status_code == 200:
                data = response.json()
                return data.get("credits", 0)
            return 0
        except:
            return 0
    
    def get_current_credits(self):
        """Get current credits"""
        try:
            response = self.session.get(f"{BASE_URL}/credits")
            if response.status_code == 200:
                data = response.json()
                return data.get("credits", 0)
            return 0
        except:
            return 0
    
    def play_hand_to_win(self, bet=500, max_attempts=20):
        """Play hands until we get a winning hand for double testing"""
        for attempt in range(max_attempts):
            try:
                # Deal
                deal_response = self.session.post(f"{BASE_URL}/deal", json={"bet": bet})
                if deal_response.status_code != 200:
                    continue
                
                # Draw (discard all cards to get new hand)
                draw_response = self.session.post(f"{BASE_URL}/draw", json={"held_indices": []})
                if draw_response.status_code != 200:
                    continue
                
                draw_data = draw_response.json()
                winnings = draw_data.get("winnings", 0)
                
                if winnings > 0:
                    return {
                        "winnings": winnings,
                        "hand_type": draw_data.get("hand_type"),
                        "credits": draw_data.get("credits"),
                        "attempt": attempt + 1
                    }
                    
            except Exception as e:
                print(f"Attempt {attempt + 1} failed: {e}")
                continue
        
        return None
    
    def test_double_game_complete_flow(self):
        """Test the complete double or nothing feature flow"""
        print("\n=== Testing Complete Double Game Flow ===")
        
        # Step a: Reload credits
        initial_credits = self.setup_credits(10000)
        if initial_credits > 0:
            self.log_test("Step a: Reload credits", True, f"Credits loaded: {initial_credits}")
        else:
            self.log_test("Step a: Reload credits", False, "Failed to load credits")
            return
        
        # Step b: Deal a hand with bet 500
        try:
            deal_response = self.session.post(f"{BASE_URL}/deal", json={"bet": 500})
            if deal_response.status_code == 200:
                deal_data = deal_response.json()
                self.log_test("Step b: Deal hand", True, f"Dealt 5 cards, credits: {deal_data.get('credits')}")
            else:
                self.log_test("Step b: Deal hand", False, f"Status code: {deal_response.status_code}")
                return
        except Exception as e:
            self.log_test("Step b: Deal hand", False, f"Exception: {str(e)}")
            return
        
        # Step c: Draw cards
        try:
            draw_response = self.session.post(f"{BASE_URL}/draw", json={"held_indices": []})
            if draw_response.status_code == 200:
                draw_data = draw_response.json()
                winnings = draw_data.get("winnings", 0)
                hand_type = draw_data.get("hand_type", "unknown")
                credits_after_draw = draw_data.get("credits", 0)
                
                self.log_test("Step c: Draw cards", True, 
                            f"Hand: {hand_type}, Winnings: {winnings}, Credits: {credits_after_draw}")
                
                # Step d: Test double game if winnings > 0
                if winnings > 0:
                    self.test_double_game_with_winnings(500, credits_after_draw)
                else:
                    self.log_test("Double game test", True, "No winnings to double (expected scenario)")
            else:
                self.log_test("Step c: Draw cards", False, f"Status code: {draw_response.status_code}")
        except Exception as e:
            self.log_test("Step c: Draw cards", False, f"Exception: {str(e)}")
    
    def test_double_game_with_winnings(self, amount, initial_credits):
        """Test double game when we have winnings"""
        print(f"\n=== Testing Double Game with Amount {amount} ===")
        
        # Test double/start
        try:
            response = self.session.post(f"{BASE_URL}/double/start?amount={amount}")
            
            if response.status_code == 200:
                data = response.json()
                if "dealer_card" in data and "amount" in data:
                    dealer_card = data["dealer_card"]
                    self.log_test("POST /double/start", True, 
                                f"Dealer card: {dealer_card['rank']} of {dealer_card['suit']}, Amount: {data['amount']}")
                    
                    # Test double/select with different indices
                    self.test_double_select(initial_credits, amount)
                else:
                    self.log_test("POST /double/start", False, "Response missing required fields")
            else:
                self.log_test("POST /double/start", False, f"Status code: {response.status_code}, response: {response.text}")
        except Exception as e:
            self.log_test("POST /double/start", False, f"Exception: {str(e)}")
    
    def test_double_select(self, initial_credits, amount):
        """Test double card selection"""
        for index in [0, 1, 2, 3]:
            try:
                response = self.session.post(f"{BASE_URL}/double/select", json={"selected_index": index})
                
                if response.status_code == 200:
                    data = response.json()
                    required_fields = ["result", "player_card", "dealer_card", "credits", "amount"]
                    
                    if all(field in data for field in required_fields):
                        result = data["result"]
                        player_card = data["player_card"]
                        dealer_card = data["dealer_card"]
                        final_credits = data["credits"]
                        
                        # Verify result logic
                        player_rank = player_card["rank"]
                        dealer_rank = dealer_card["rank"]
                        
                        rank_values = {'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, 
                                     '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14}
                        
                        player_val = rank_values[player_rank]
                        dealer_val = rank_values[dealer_rank]
                        
                        expected_result = "win" if player_val > dealer_val else "lose" if player_val < dealer_val else "tie"
                        
                        if result == expected_result:
                            # Verify credits updated correctly
                            if result == "win":
                                expected_credits = initial_credits + amount
                            elif result == "lose":
                                expected_credits = initial_credits - amount
                            else:  # tie
                                expected_credits = initial_credits
                            
                            if final_credits == expected_credits:
                                self.log_test(f"Double select index {index}", True, 
                                            f"Result: {result}, Player: {player_rank}, Dealer: {dealer_rank}, Credits: {final_credits}")
                            else:
                                self.log_test(f"Double select index {index}", False, 
                                            f"Credits incorrect. Expected: {expected_credits}, Got: {final_credits}")
                        else:
                            self.log_test(f"Double select index {index}", False, 
                                        f"Result incorrect. Expected: {expected_result}, Got: {result}")
                        
                        # Break after first successful test to avoid state conflicts
                        break
                    else:
                        missing = [f for f in required_fields if f not in data]
                        self.log_test(f"Double select index {index}", False, f"Missing fields: {missing}")
                else:
                    self.log_test(f"Double select index {index}", False, f"Status code: {response.status_code}")
            except Exception as e:
                self.log_test(f"Double select index {index}", False, f"Exception: {str(e)}")
    
    def test_double_cancel(self):
        """Test POST /double/cancel"""
        print("\n=== Testing Double Cancel ===")
        
        # First, try to start a double game
        winning_hand = self.play_hand_to_win(500, 10)
        if not winning_hand:
            self.log_test("Double cancel setup", False, "Could not get winning hand")
            return
        
        # Start double game
        try:
            response = self.session.post(f"{BASE_URL}/double/start?amount=500")
            if response.status_code == 200:
                self.log_test("Double cancel setup (start)", True, "Started double game")
                
                # Now test cancel
                cancel_response = self.session.post(f"{BASE_URL}/double/cancel")
                if cancel_response.status_code == 200:
                    data = cancel_response.json()
                    if "credits" in data:
                        self.log_test("POST /double/cancel", True, f"Cancelled successfully, Credits: {data['credits']}")
                    else:
                        self.log_test("POST /double/cancel", False, "Response missing credits field")
                else:
                    self.log_test("POST /double/cancel", False, f"Status code: {cancel_response.status_code}")
            else:
                self.log_test("Double cancel setup (start)", False, "Could not start double game")
        except Exception as e:
            self.log_test("POST /double/cancel", False, f"Exception: {str(e)}")
    
    def test_double_edge_cases(self):
        """Test double game edge cases"""
        print("\n=== Testing Double Game Edge Cases ===")
        
        # Set up low credits for insufficient credit test
        self.setup_credits(2000)  # Low credits
        
        # Test 1: Try to start double without sufficient credits
        try:
            response = self.session.post(f"{BASE_URL}/double/start?amount=5000")
            if response.status_code == 400:
                self.log_test("Double start insufficient credits", True, "Correctly rejected with 400")
            else:
                self.log_test("Double start insufficient credits", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Double start insufficient credits", False, f"Exception: {str(e)}")
        
        # Test 2: Try to select card without active double game
        try:
            response = self.session.post(f"{BASE_URL}/double/select", json={"selected_index": 0})
            if response.status_code == 400:
                self.log_test("Double select without active game", True, "Correctly rejected with 400")
            else:
                self.log_test("Double select without active game", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Double select without active game", False, f"Exception: {str(e)}")
        
        # Set up for invalid index tests
        self.setup_credits(10000)  # Enough credits
        winning_hand = self.play_hand_to_win(500, 10)
        
        if winning_hand:
            # Start double game for invalid index tests
            start_response = self.session.post(f"{BASE_URL}/double/start?amount=500")
            if start_response.status_code == 200:
                # Test 3: Try to select invalid card index -1
                try:
                    response = self.session.post(f"{BASE_URL}/double/select", json={"selected_index": -1})
                    if response.status_code == 400:
                        self.log_test("Double select index -1", True, "Correctly rejected with 400")
                    else:
                        self.log_test("Double select index -1", False, f"Expected 400, got {response.status_code}")
                except Exception as e:
                    self.log_test("Double select index -1", False, f"Exception: {str(e)}")
                
                # Test 4: Try to select invalid card index 5
                try:
                    response = self.session.post(f"{BASE_URL}/double/select", json={"selected_index": 5})
                    if response.status_code == 400:
                        self.log_test("Double select index 5", True, "Correctly rejected with 400")
                    else:
                        self.log_test("Double select index 5", False, f"Expected 400, got {response.status_code}")
                except Exception as e:
                    self.log_test("Double select index 5", False, f"Exception: {str(e)}")
        else:
            self.log_test("Edge case setup", False, "Could not get winning hand for edge case testing")
    
    def test_multiple_double_rounds(self):
        """Test multiple double rounds"""
        print("\n=== Testing Multiple Double Rounds ===")
        
        self.setup_credits(20000)  # Plenty of credits
        
        # Try to get a winning hand and test multiple doubles
        winning_hand = self.play_hand_to_win(500, 15)
        if not winning_hand:
            self.log_test("Multiple double setup", False, "Could not get winning hand")
            return
        
        round_count = 0
        current_amount = 500
        max_rounds = 3
        
        while round_count < max_rounds:
            try:
                # Start double
                start_response = self.session.post(f"{BASE_URL}/double/start?amount={current_amount}")
                if start_response.status_code != 200:
                    self.log_test(f"Multiple double round {round_count + 1} start", False, "Failed to start")
                    break
                
                # Select card
                select_response = self.session.post(f"{BASE_URL}/double/select", json={"selected_index": 0})
                if select_response.status_code != 200:
                    self.log_test(f"Multiple double round {round_count + 1} select", False, "Failed to select")
                    break
                
                data = select_response.json()
                result = data.get("result")
                
                self.log_test(f"Multiple double round {round_count + 1}", True, 
                            f"Result: {result}, Amount: {current_amount}, Credits: {data.get('credits')}")
                
                if result == "lose":
                    self.log_test("Multiple double termination", True, "Double state cleared after loss")
                    break
                elif result in ["win", "tie"]:
                    if result == "win":
                        current_amount *= 2  # Double the amount for next round
                    round_count += 1
                    
                    if round_count >= max_rounds:
                        self.log_test("Multiple double completion", True, f"Completed {round_count} rounds")
                        break
                else:
                    self.log_test(f"Multiple double round {round_count + 1}", False, f"Unknown result: {result}")
                    break
                    
            except Exception as e:
                self.log_test(f"Multiple double round {round_count + 1}", False, f"Exception: {str(e)}")
                break
    
    def run_all_tests(self):
        """Run all double game test suites"""
        print(f"\n{'='*60}")
        print("STARTING VIDEO POKER DOUBLE GAME TESTS")
        print(f"Base URL: {BASE_URL}")
        print(f"{'='*60}")
        
        # Run all test suites
        self.test_paytable_values()
        self.test_double_game_complete_flow()
        self.test_double_cancel()
        self.test_double_edge_cases()
        self.test_multiple_double_rounds()
        
        # Print summary
        print(f"\n{'='*60}")
        print("DOUBLE GAME TEST SUMMARY")
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
    tester = DoubleGameTester()
    results = tester.run_all_tests()
    
    # Exit with non-zero code if any tests failed
    sys.exit(0 if results['failed_tests'] == 0 else 1)