import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Card {
  suit: string;
  rank: string;
}

interface PayTable {
  [key: string]: number;
}

export default function VideoPoker() {
  const [credits, setCredits] = useState(0);
  const [bet, setBet] = useState(100);
  const [hand, setHand] = useState<Card[]>([]);
  const [heldCards, setHeldCards] = useState<boolean[]>([false, false, false, false, false]);
  const [gameState, setGameState] = useState<'betting' | 'dealt' | 'drawn'>('betting');
  const [lastResult, setLastResult] = useState<string>('');
  const [lastWinnings, setLastWinnings] = useState(0);
  const [reloadModalVisible, setReloadModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [reloadAmount, setReloadAmount] = useState('');
  const [payTable, setPayTable] = useState<PayTable>({});

  useEffect(() => {
    fetchCredits();
    fetchPayTable();
  }, []);

  const fetchCredits = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/credits`);
      const data = await response.json();
      setCredits(data.credits);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const fetchPayTable = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/paytable`);
      const data = await response.json();
      setPayTable(data);
    } catch (error) {
      console.error('Error fetching paytable:', error);
    }
  };

  const handleDeal = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet }),
      });

      if (!response.ok) {
        const error = await response.json();
        Alert.alert('Error', error.detail);
        return;
      }

      const data = await response.json();
      setHand(data.hand);
      setCredits(data.credits);
      setHeldCards([false, false, false, false, false]);
      setGameState('dealt');
      setLastResult('');
      setLastWinnings(0);
    } catch (error) {
      console.error('Error dealing:', error);
      Alert.alert('Error', 'Error al repartir cartas');
    }
  };

  const handleDraw = async () => {
    try {
      const heldIndices = heldCards
        .map((held, index) => (held ? index : -1))
        .filter((index) => index !== -1);

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ held_indices: heldIndices }),
      });

      if (!response.ok) {
        const error = await response.json();
        Alert.alert('Error', error.detail);
        return;
      }

      const data = await response.json();
      setHand(data.hand);
      setCredits(data.credits);
      setLastResult(formatHandType(data.hand_type));
      setLastWinnings(data.winnings);
      setGameState('drawn');
    } catch (error) {
      console.error('Error drawing:', error);
      Alert.alert('Error', 'Error al cambiar cartas');
    }
  };

  const handleReload = async () => {
    try {
      const amount = parseInt(reloadAmount);
      if (isNaN(amount) || amount < 2000 || amount > 1000000) {
        Alert.alert('Error', 'El monto debe estar entre $2,000 y $1,000,000');
        return;
      }

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/reload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, amount }),
      });

      if (!response.ok) {
        const error = await response.json();
        Alert.alert('Error', error.detail);
        return;
      }

      const data = await response.json();
      setCredits(data.credits);
      setReloadModalVisible(false);
      setPassword('');
      setReloadAmount('');
      Alert.alert('Éxito', data.message);
    } catch (error) {
      console.error('Error reloading:', error);
      Alert.alert('Error', 'Error al recargar créditos');
    }
  };

  const toggleHold = (index: number) => {
    if (gameState === 'dealt') {
      const newHeld = [...heldCards];
      newHeld[index] = !newHeld[index];
      setHeldCards(newHeld);
    }
  };

  const formatHandType = (handType: string) => {
    const translations: { [key: string]: string } = {
      royal_flush: 'Escalera Real',
      straight_flush: 'Escalera de Color',
      four_of_a_kind: 'Póker',
      full_house: 'Full',
      flush: 'Color',
      straight: 'Escalera',
      three_of_a_kind: 'Trío',
      two_pair: 'Dos Pares',
      jacks_or_better: 'Jacks o Mejor',
      nothing: 'Sin Premio',
    };
    return translations[handType] || handType;
  };

  const getCardColor = (suit: string) => {
    return suit === '♥' || suit === '♦' ? '#ff0000' : '#000000';
  };

  const betOptions = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Pay Table */}
      <View style={styles.payTableContainer}>
        <Text style={styles.payTableTitle}>TABLA DE PREMIOS (x Apuesta)</Text>
        <View style={styles.payTableGrid}>
          <View style={styles.payTableRow}>
            <Text style={styles.payTableText}>Escalera Real: {payTable.royal_flush}x</Text>
            <Text style={styles.payTableText}>Escalera Color: {payTable.straight_flush}x</Text>
          </View>
          <View style={styles.payTableRow}>
            <Text style={styles.payTableText}>Póker: {payTable.four_of_a_kind}x</Text>
            <Text style={styles.payTableText}>Full: {payTable.full_house}x</Text>
          </View>
          <View style={styles.payTableRow}>
            <Text style={styles.payTableText}>Color: {payTable.flush}x</Text>
            <Text style={styles.payTableText}>Escalera: {payTable.straight}x</Text>
          </View>
          <View style={styles.payTableRow}>
            <Text style={styles.payTableText}>Trío: {payTable.three_of_a_kind}x</Text>
            <Text style={styles.payTableText}>Dos Pares: {payTable.two_pair}x</Text>
          </View>
          <View style={styles.payTableRow}>
            <Text style={styles.payTableText}>Jacks+: {payTable.jacks_or_better}x</Text>
          </View>
        </View>
      </View>

      {/* Credits Display */}
      <View style={styles.creditsContainer}>
        <Text style={styles.creditsLabel}>CRÉDITOS:</Text>
        <Text style={styles.creditsAmount}>${credits.toLocaleString()}</Text>
        <TouchableOpacity style={styles.reloadButton} onPress={() => setReloadModalVisible(true)}>
          <Text style={styles.reloadButtonText}>RECARGAR</Text>
        </TouchableOpacity>
      </View>

      {/* Result Display */}
      {lastResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{lastResult}</Text>
          {lastWinnings > 0 && (
            <Text style={styles.winningsText}>¡GANASTE ${lastWinnings.toLocaleString()}!</Text>
          )}
        </View>
      )}

      {/* Cards */}
      <View style={styles.cardsContainer}>
        {hand.length > 0 ? (
          hand.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.card,
                heldCards[index] && styles.cardHeld,
              ]}
              onPress={() => toggleHold(index)}
              disabled={gameState !== 'dealt'}
            >
              <Text style={[styles.cardText, { color: getCardColor(card.suit) }]}>
                {card.rank}{card.suit}
              </Text>
              {heldCards[index] && (
                <View style={styles.heldBadge}>
                  <Text style={styles.heldText}>HOLD</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.placeholderText}>Selecciona tu apuesta y presiona DEAL</Text>
        )}
      </View>

      {/* Bet Selection */}
      <View style={styles.betContainer}>
        <Text style={styles.betLabel}>APUESTA:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.betScroll}>
          {betOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.betButton,
                bet === option && styles.betButtonSelected,
              ]}
              onPress={() => setBet(option)}
              disabled={gameState !== 'betting' && gameState !== 'drawn'}
            >
              <Text
                style={[
                  styles.betButtonText,
                  bet === option && styles.betButtonTextSelected,
                ]}
              >
                ${option}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {(gameState === 'betting' || gameState === 'drawn') && (
          <TouchableOpacity
            style={[styles.actionButton, styles.dealButton]}
            onPress={handleDeal}
          >
            <Text style={styles.actionButtonText}>DEAL</Text>
          </TouchableOpacity>
        )}
        {gameState === 'dealt' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.drawButton]}
            onPress={handleDraw}
          >
            <Text style={styles.actionButtonText}>DRAW</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Reload Modal */}
      <Modal
        visible={reloadModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReloadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>RECARGAR CRÉDITOS</Text>
            
            <Text style={styles.modalLabel}>Contraseña:</Text>
            <TextInput
              style={styles.modalInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Ingresa la contraseña"
              placeholderTextColor="#666"
            />
            
            <Text style={styles.modalLabel}>Monto ($2,000 - $1,000,000):</Text>
            <TextInput
              style={styles.modalInput}
              value={reloadAmount}
              onChangeText={setReloadAmount}
              keyboardType="numeric"
              placeholder="Ingresa el monto"
              placeholderTextColor="#666"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setReloadModalVisible(false);
                  setPassword('');
                  setReloadAmount('');
                }}
              >
                <Text style={styles.modalButtonText}>CANCELAR</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleReload}
              >
                <Text style={styles.modalButtonText}>CONFIRMAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a5c0a',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  payTableContainer: {
    backgroundColor: '#083d08',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  payTableTitle: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  payTableGrid: {
    gap: 4,
  },
  payTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  payTableText: {
    color: '#fff',
    fontSize: 10,
    flex: 1,
  },
  creditsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  creditsLabel: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  creditsAmount: {
    color: '#00ff00',
    fontSize: 24,
    fontWeight: 'bold',
  },
  reloadButton: {
    backgroundColor: '#ff6600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  reloadButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#083d08',
    borderRadius: 8,
  },
  resultText: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  winningsText: {
    color: '#00ff00',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    minHeight: 120,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: 70,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#333',
  },
  cardHeld: {
    borderColor: '#ffd700',
    backgroundColor: '#fffacd',
  },
  cardText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  heldBadge: {
    position: 'absolute',
    top: 4,
    backgroundColor: '#ffd700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  heldText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  betContainer: {
    marginBottom: 12,
  },
  betLabel: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  betScroll: {
    maxHeight: 50,
  },
  betButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#555',
  },
  betButtonSelected: {
    backgroundColor: '#ffd700',
    borderColor: '#ffed4e',
  },
  betButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  betButtonTextSelected: {
    color: '#000',
  },
  actionContainer: {
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  dealButton: {
    backgroundColor: '#00aa00',
  },
  drawButton: {
    backgroundColor: '#0066cc',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#0a5c0a',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    borderWidth: 3,
    borderColor: '#ffd700',
  },
  modalTitle: {
    color: '#ffd700',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  modalInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#666',
  },
  modalButtonConfirm: {
    backgroundColor: '#00aa00',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
