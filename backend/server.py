from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import random
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Card and Poker Logic
SUITS = ['♠', '♥', '♦', '♣']
RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
RANK_VALUES = {'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14}

# Jacks or Better Paytable (multipliers)
PAYTABLE = {
    'royal_flush': 800,
    'straight_flush': 50,
    'four_of_a_kind': 25,
    'full_house': 7,
    'flush': 5,
    'straight': 4,
    'three_of_a_kind': 3,
    'two_pair': 2,
    'jacks_or_better': 1,
    'nothing': 0
}

def create_deck():
    """Create a standard 52-card deck"""
    deck = []
    for suit in SUITS:
        for rank in RANKS:
            deck.append({'suit': suit, 'rank': rank})
    return deck

def shuffle_deck(deck):
    """Shuffle the deck"""
    shuffled = deck.copy()
    random.shuffle(shuffled)
    return shuffled

def evaluate_hand(cards):
    """Evaluate poker hand and return hand type and multiplier"""
    if len(cards) != 5:
        return 'nothing', 0
    
    # Sort cards by rank value
    sorted_cards = sorted(cards, key=lambda x: RANK_VALUES[x['rank']])
    ranks = [card['rank'] for card in sorted_cards]
    suits = [card['suit'] for card in sorted_cards]
    rank_values = [RANK_VALUES[r] for r in ranks]
    
    # Count occurrences
    rank_counts = {}
    for rank in ranks:
        rank_counts[rank] = rank_counts.get(rank, 0) + 1
    
    counts = sorted(rank_counts.values(), reverse=True)
    
    # Check for flush
    is_flush = len(set(suits)) == 1
    
    # Check for straight
    is_straight = False
    if rank_values == list(range(rank_values[0], rank_values[0] + 5)):
        is_straight = True
    # Check for A-2-3-4-5 straight (wheel)
    elif rank_values == [2, 3, 4, 5, 14]:
        is_straight = True
    
    # Check for royal flush (10-J-Q-K-A of same suit)
    is_royal = is_straight and is_flush and set(ranks) == {'10', 'J', 'Q', 'K', 'A'}
    
    # Determine hand
    if is_royal:
        return 'royal_flush', PAYTABLE['royal_flush']
    elif is_straight and is_flush:
        return 'straight_flush', PAYTABLE['straight_flush']
    elif counts == [4, 1]:
        return 'four_of_a_kind', PAYTABLE['four_of_a_kind']
    elif counts == [3, 2]:
        return 'full_house', PAYTABLE['full_house']
    elif is_flush:
        return 'flush', PAYTABLE['flush']
    elif is_straight:
        return 'straight', PAYTABLE['straight']
    elif counts == [3, 1, 1]:
        return 'three_of_a_kind', PAYTABLE['three_of_a_kind']
    elif counts == [2, 2, 1]:
        return 'two_pair', PAYTABLE['two_pair']
    elif counts == [2, 1, 1, 1]:
        # Check if it's Jacks or Better
        pair_rank = [rank for rank, count in rank_counts.items() if count == 2][0]
        if RANK_VALUES[pair_rank] >= 11:  # J, Q, K, A
            return 'jacks_or_better', PAYTABLE['jacks_or_better']
        else:
            return 'nothing', 0
    else:
        return 'nothing', 0

# Pydantic Models
class Player(BaseModel):
    credits: int = 0
    lastUpdated: datetime = Field(default_factory=datetime.utcnow)

class ReloadRequest(BaseModel):
    password: str
    amount: int

class DealRequest(BaseModel):
    bet: int

class DrawRequest(BaseModel):
    held_indices: List[int]

class GameState(BaseModel):
    deck: List[dict]
    hand: List[dict]
    bet: int

class DoubleRequest(BaseModel):
    selected_index: int

class DoubleState(BaseModel):
    amount: int
    dealer_card: dict
    hidden_cards: List[dict]

# Store game state temporarily (in production, use Redis or similar)
game_states = {}
double_states = {}

# API Endpoints
@api_router.get("/credits")
async def get_credits():
    """Get current player credits"""
    player = await db.players.find_one({"player_id": "single_player"})
    if not player:
        # Initialize player with 0 credits
        player_data = {"player_id": "single_player", "credits": 0, "lastUpdated": datetime.utcnow()}
        await db.players.insert_one(player_data)
        return {"credits": 0}
    return {"credits": player["credits"]}

@api_router.post("/reload")
async def reload_credits(request: ReloadRequest):
    """Reload credits with password protection"""
    if request.password != "c27041279":
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")
    
    if request.amount < 2000 or request.amount > 1000000:
        raise HTTPException(status_code=400, detail="El monto debe estar entre $2,000 y $1,000,000")
    
    player = await db.players.find_one({"player_id": "single_player"})
    if not player:
        player_data = {"player_id": "single_player", "credits": request.amount, "lastUpdated": datetime.utcnow()}
        await db.players.insert_one(player_data)
        new_credits = request.amount
    else:
        new_credits = player["credits"] + request.amount
        await db.players.update_one(
            {"player_id": "single_player"},
            {"$set": {"credits": new_credits, "lastUpdated": datetime.utcnow()}}
        )
    
    return {"credits": new_credits, "message": f"${request.amount} agregados exitosamente"}

@api_router.post("/deal")
async def deal_hand(request: DealRequest):
    """Deal initial 5 cards and deduct bet"""
    # Validate bet
    if request.bet < 100 or request.bet > 2000 or request.bet % 100 != 0:
        raise HTTPException(status_code=400, detail="Apuesta inválida. Debe ser entre $100 y $2,000 en incrementos de $100")
    
    # Check credits
    player = await db.players.find_one({"player_id": "single_player"})
    if not player or player["credits"] < request.bet:
        raise HTTPException(status_code=400, detail="Créditos insuficientes")
    
    # Deduct bet
    new_credits = player["credits"] - request.bet
    await db.players.update_one(
        {"player_id": "single_player"},
        {"$set": {"credits": new_credits}}
    )
    
    # Create and shuffle deck
    deck = create_deck()
    deck = shuffle_deck(deck)
    
    # Deal 5 cards
    hand = deck[:5]
    remaining_deck = deck[5:]
    
    # Store game state
    game_states["single_player"] = {
        "deck": remaining_deck,
        "hand": hand,
        "bet": request.bet
    }
    
    return {
        "hand": hand,
        "credits": new_credits
    }

@api_router.post("/draw")
async def draw_cards(request: DrawRequest):
    """Replace cards not held and evaluate final hand"""
    if "single_player" not in game_states:
        raise HTTPException(status_code=400, detail="No hay juego activo. Haz deal primero.")
    
    game_state = game_states["single_player"]
    deck = game_state["deck"]
    hand = game_state["hand"]
    bet = game_state["bet"]
    
    # Replace cards not held
    new_hand = hand.copy()
    deck_index = 0
    
    for i in range(5):
        if i not in request.held_indices:
            new_hand[i] = deck[deck_index]
            deck_index += 1
    
    # Evaluate hand
    hand_type, multiplier = evaluate_hand(new_hand)
    winnings = bet * multiplier
    
    # Update credits
    player = await db.players.find_one({"player_id": "single_player"})
    new_credits = player["credits"] + winnings
    await db.players.update_one(
        {"player_id": "single_player"},
        {"$set": {"credits": new_credits}}
    )
    
    # Clear game state
    del game_states["single_player"]
    
    return {
        "hand": new_hand,
        "hand_type": hand_type,
        "multiplier": multiplier,
        "winnings": winnings,
        "credits": new_credits
    }

@api_router.post("/double/start")
async def start_double(amount: int):
    """Start double game after winning"""
    player = await db.players.find_one({"player_id": "single_player"})
    if not player or player["credits"] < amount:
        raise HTTPException(status_code=400, detail="Créditos insuficientes para doblar")
    
    # Create and shuffle deck for double game
    deck = create_deck()
    deck = shuffle_deck(deck)
    
    # First card is dealer's (visible), next 4 are hidden
    dealer_card = deck[0]
    hidden_cards = deck[1:5]
    
    # Store double state
    double_states["single_player"] = {
        "amount": amount,
        "dealer_card": dealer_card,
        "hidden_cards": hidden_cards
    }
    
    return {
        "dealer_card": dealer_card,
        "amount": amount
    }

@api_router.post("/double/select")
async def select_double_card(request: DoubleRequest):
    """Select a hidden card and compare with dealer"""
    if "single_player" not in double_states:
        raise HTTPException(status_code=400, detail="No hay juego de doblar activo")
    
    double_state = double_states["single_player"]
    
    if request.selected_index < 0 or request.selected_index > 3:
        raise HTTPException(status_code=400, detail="Índice de carta inválido")
    
    dealer_card = double_state["dealer_card"]
    player_card = double_state["hidden_cards"][request.selected_index]
    amount = double_state["amount"]
    
    dealer_value = RANK_VALUES[dealer_card["rank"]]
    player_value = RANK_VALUES[player_card["rank"]]
    
    player = await db.players.find_one({"player_id": "single_player"})
    
    if player_value > dealer_value:
        # Player wins - double the amount
        result = "win"
        new_credits = player["credits"] + amount
        # Keep double state for potential next double
    elif player_value < dealer_value:
        # Player loses
        result = "lose"
        new_credits = player["credits"] - amount
        # Clear double state
        del double_states["single_player"]
    else:
        # Tie
        result = "tie"
        new_credits = player["credits"]
        # Keep double state for another try
    
    # Update credits
    await db.players.update_one(
        {"player_id": "single_player"},
        {"$set": {"credits": new_credits}}
    )
    
    return {
        "result": result,
        "player_card": player_card,
        "dealer_card": dealer_card,
        "credits": new_credits,
        "amount": amount
    }

@api_router.post("/double/cancel")
async def cancel_double():
    """Cancel double game and keep winnings"""
    if "single_player" in double_states:
        del double_states["single_player"]
    
    player = await db.players.find_one({"player_id": "single_player"})
    return {"credits": player["credits"] if player else 0}

@api_router.get("/paytable")
async def get_paytable():
    """Get the paytable"""
    return PAYTABLE

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
