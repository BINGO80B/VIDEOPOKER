let usedCodes = new Set();
let currentUser = null;
let credits = 0;
let currentWin = 0;
let currentBet = 100;
let withdrawalCount = 0;
let deck = [];
let hand = [];

const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const cardsContainer = document.getElementById('cards');
const dealBtn = document.getElementById('dealBtn');
const drawBtn = document.getElementById('drawBtn');
const messageEl = document.getElementById('message');
const creditEl = document.getElementById('creditAmount');
const toggleScreenBtn = document.getElementById('toggleScreenBtn');
const gameScreen = document.getElementById('game-screen');
const registrationScreen = document.getElementById('registration-screen');
const loginScreen = document.getElementById('login-screen');
const betSelector = document.getElementById('betAmount');
const creditsBtn = document.getElementById('creditsBtn');
const creditsModal = document.getElementById('creditsModal');
const codeInput = document.getElementById('codeInput');
const submitCodeBtn = document.getElementById('submitCodeBtn');
const withdrawAmount = document.getElementById('withdrawAmount');
const withdrawBtn = document.getElementById('withdrawBtn');
const receiptModal = document.getElementById('receiptModal');
const closeReceiptBtn = document.getElementById('closeReceiptBtn');
const usernameInput = document.getElementById('username');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const currentUsernameEl = document.getElementById('currentUsername');
const currentUserIdEl = document.getElementById('currentUserId');
const registrationMessageEl = document.getElementById('registrationMessage');
const loginMessageEl = document.getElementById('loginMessage');
const savedUsernameEl = document.getElementById('savedUsername');
const closeCreditsModalBtn = document.getElementById('closeCreditsModalBtn');
const rightPanel = document.querySelector('.right-panel');

const payTable = {
    'Escalera Real': [25000, 50000, 75000, 100000, 125000],
    'Escalera de Color': [5000, 10000, 15000, 20000, 25000],
    'Poker': [2500, 5000, 7500, 10000, 12500],
    'Full': [700, 1400, 2100, 2800, 3500],
    'Color': [500, 1000, 1500, 2000, 2500],
    'Escalera': [400, 800, 1200, 1600, 2000],
    'Trío': [300, 600, 900, 1200, 1500],
    'Dos Pares': [200, 400, 600, 800, 1000],
    'Par de J o mejor': [100, 200, 300, 400, 500]
};

const withdrawalCodes = ['0Bdu2N1p', '0RdchqhF', '5AX3h85p', '6XH887Br', '76PeQOOZ', '8ScdQcAM', '8rxivoWU', '924VviZi', '9wqb9ufy'];

const predefinedCodes = [
    { code: 'poker12345', credits: 5000 },
    { code: 'poker12346', credits: 5000 },
    { code: 'poker12347', credits: 5000 },
    { code: 'poker12348', credits: 5000 },
    { code: 'poker12349', credits: 5000 },
    { code: 'poker12350', credits: 5000 },
    { code: 'poker12351', credits: 5000 },
    { code: 'poker12352', credits: 5000 },
    { code: 'poker12353', credits: 5000 }
];

function saveUserData() {
    if (currentUser) {
        const userData = {
            ...currentUser,
            credits: credits
        };
        localStorage.setItem('videoPokerUser', JSON.stringify(userData));
        console.log('Datos de usuario guardados:', userData);
    }
}

function loadUserData() {
    const savedData = localStorage.getItem('videoPokerUser');
    console.log('Datos cargados del localStorage:', savedData);
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        currentUser = {
            username: parsedData.username,
            id: parsedData.id
        };
        credits = parsedData.credits || 0;
        console.log('Datos de usuario cargados:', currentUser, 'Créditos:', credits);
        return true;
    }
    return false;
}

function showLoginScreen() {
    registrationScreen.classList.remove('hidden');
    loginScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    
    const savedUser = JSON.parse(localStorage.getItem('videoPokerUser'));
    if (savedUser && savedUser.username) {
        savedUsernameEl.textContent = savedUser.username;
        loginScreen.classList.remove('hidden');
        registrationScreen.classList.add('hidden');
    } else {
        savedUsernameEl.textContent = '';
        registrationScreen.classList.remove('hidden');
        loginScreen.classList.add('hidden');
    }
}

function loginUser() {
    if (loadUserData()) {
        showGameScreen();
        updateUserInfo();
        updateCredits();
        messageEl.textContent = `Bienvenido de nuevo, ${currentUser.username}!`;
    } else {
        loginMessageEl.textContent = "No se encontró un usuario guardado. Por favor, regístrate.";
    }
}

function registerUser() {
    const username = usernameInput.value.trim();
    if (username) {
        const userId = generateUniqueId();
        currentUser = { username, id: userId };
        credits = 0;
        saveUserData();
        showGameScreen();
        updateUserInfo();
        updateCredits();
        messageEl.textContent = `Bienvenido, ${currentUser.username}!`;
    } else {
        registrationMessageEl.textContent = "Por favor, ingresa un nombre de usuario.";
    }
}

function updateUserInfo() {
    if (currentUser) {
        currentUsernameEl.textContent = currentUser.username;
        currentUserIdEl.textContent = currentUser.id;
    }
}

function updateCredits() {
    creditEl.textContent = credits;
    saveUserData();
}

function logoutUser() {
    currentUser = null;
    credits = 0;
    localStorage.removeItem('videoPokerUser');
    updateCredits();
    showLoginScreen();
}

function createDeck() {
    deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ suit, value });
        }
    }
}

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function dealInitialHand() {
    hand = [];
    for (let i = 0; i < 5; i++) {
        hand.push(deck.pop());
    }
    renderHand();
    const initialResult = checkHand();
    if (initialResult.winMultiplier > 0) {
        messageEl.textContent = `${initialResult.handType}! Haz clic en "Cambiar" para mantener esta mano`;
        markWinningCards(initialResult.handType);
    } else {
        messageEl.textContent = 'Selecciona las cartas que quieres mantener';
    }
    dealBtn.disabled = true;
    drawBtn.disabled = false;
}

function dealCards() {
    if (credits >= currentBet) {
        credits -= currentBet;
        updateCredits();
        createDeck();
        shuffleDeck();
        dealInitialHand();
    } else {
        messageEl.textContent = "No tienes suficientes créditos para jugar.";
    }
}

function renderHand() {
    cardsContainer.innerHTML = '';
    hand.forEach((card, index) => {
        const cardEl = createCardElement(card, true);
        cardEl.setAttribute('data-index', index);
        cardEl.addEventListener('click', () => toggleCardSelection(cardEl));
        cardsContainer.appendChild(cardEl);
    });
    updateCardOpacity();
}

function toggleCardSelection(cardEl) {
    cardEl.classList.toggle('selected');
    updateCardOpacity();
}

function updateCardOpacity() {
    const cards = document.querySelectorAll('.card');
    const selectedCards = document.querySelectorAll('.card.selected');
    
    if (selectedCards.length > 0) {
        cards.forEach(card => {
            if (card.classList.contains('selected')) {
                card.style.opacity = '1';
            } else {
                card.style.opacity = '0.6';
            }
        });
    } else {
        cards.forEach(card => {
            card.style.opacity = '1';
        });
    }
}

function drawCards() {
    const cards = document.querySelectorAll('.card');
    cards.forEach((cardEl, index) => {
        if (!cardEl.classList.contains('selected')) {
            hand[index] = deck.pop();
        }
    });
    renderHand();
    const result = checkHand();
    handleWin(result.winMultiplier, result.handType);
}

function checkHand() {
    const handValues = hand.map(card => card.value);
    const handSuits = hand.map(card => card.suit);

    let winMultiplier = 0;
    let handType = '';

    if (isRoyalFlush(handValues, handSuits)) {
        winMultiplier = payTable['Escalera Real'][(currentBet / 100) - 1];
        handType = "Escalera Real";
    } else if (isStraightFlush(handValues, handSuits)) {
        winMultiplier = payTable['Escalera de Color'][(currentBet / 100) - 1];
        handType = "Escalera de Color";
    } else if (isFourOfAKind(handValues)) {
        winMultiplier = payTable['Poker'][(currentBet / 100) - 1];
        handType = "Poker";
    } else if (isFullHouse(handValues)) {
        winMultiplier = payTable['Full'][(currentBet / 100) - 1];
        handType = "Full";
    } else if (isFlush(handSuits)) {
        winMultiplier = payTable['Color'][(currentBet / 100) - 1];
        handType = "Color";
    } else if (isStraight(handValues)) {
        winMultiplier = payTable['Escalera'][(currentBet / 100) - 1];
        handType = "Escalera";
    } else if (isThreeOfAKind(handValues)) {
        winMultiplier = payTable['Trío'][(currentBet / 100) - 1];
        handType = "Trío";
    } else if (isTwoPair(handValues)) {
        winMultiplier = payTable['Dos Pares'][(currentBet / 100) - 1];
        handType = "Dos Pares";
    } else if (isOnePair(handValues)) {
        winMultiplier = payTable['Par de J o mejor'][(currentBet / 100) - 1];
        handType = "Par de J o mejor";
    }

    return { winMultiplier, handType };
}

function isRoyalFlush(values, suits) {
    const royalValues = ['10', 'J', 'Q', 'K', 'A'];
    return isStraightFlush(values, suits) && royalValues.every(v => values.includes(v));
}

function isStraightFlush(values, suits) {
    return isFlush(suits) && isStraight(values);
}

function isFourOfAKind(values) {
    return new Set(values).size === 2 && values.some(v => values.filter(x => x === v).length === 4);
}

function isFullHouse(values) {
    const valueCounts = {};
    for (let value of values) {
        valueCounts[value] = (valueCounts[value] || 0) + 1;
    }
    const counts = Object.values(valueCounts);
    return counts.includes(3) && counts.includes(2);
}

function isFlush(suits) {
    return new Set(suits).size === 1;
}

function isStraight(values) {
    const order = '23456789TJQKA';
    const sortedValues = [...new Set(values)].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    
    if (sortedValues.length !== 5) return false;

    const indices = sortedValues.map(v => order.indexOf(v));
    
    // Comprueba escalera normal
    if (indices[4] - indices[0] === 4) return true;
    
    // Comprueba escalera con As bajo (A, 2, 3, 4, 5)
    if (sortedValues.join('') === 'A2345') return true;

    return false;
}

function isThreeOfAKind(values) {
    return new Set(values).size === 3 && values.some(v => values.filter(x => x === v).length === 3);
}

function isTwoPair(values) {
    const valueCounts = {};
    for (let value of values) {
        valueCounts[value] = (valueCounts[value] || 0) + 1;
    }
    const pairs = Object.values(valueCounts).filter(count => count === 2);
    return pairs.length === 2;
}

function isOnePair(values) {
    const letterPairs = ['J', 'Q', 'K', 'A'];
    return letterPairs.some(letter => values.filter(v => v === letter).length === 2);
}

function markWinningCards(handType) {
    const cardElements = document.querySelectorAll('.card');
    const handValues = hand.map(card => card.value);
    const handSuits = hand.map(card => card.suit);

    cardElements.forEach(card => {
        card.classList.remove('selected');
    });

    switch (handType) {
        case 'Escalera Real':
        case 'Escalera de Color':
        case 'Escalera':
        case 'Color':
            cardElements.forEach(card => 

 card.classList.add('selected'));
            break;
        case 'Poker':
            const fourOfAKindValue = handValues.find(v => handValues.filter(x => x === v).length === 4);
            cardElements.forEach((card, index) => {
                if (hand[index].value === fourOfAKindValue) {
                    card.classList.add('selected');
                }
            });
            break;
        case 'Full':
            const tripleValue = handValues.find(v => handValues.filter(x => x === v).length === 3);
            const pairValue = handValues.find(v => handValues.filter(x => x === v).length === 2);
            cardElements.forEach((card, index) => {
                if (hand[index].value === tripleValue || hand[index].value === pairValue) {
                    card.classList.add('selected');
                }
            });
            break;
        case 'Trío':
            const threeOfAKindValue = handValues.find(v => handValues.filter(x => x === v).length === 3);
            cardElements.forEach((card, index) => {
                if (hand[index].value === threeOfAKindValue) {
                    card.classList.add('selected');
                }
            });
            break;
        case 'Dos Pares':
            const pairValues = [...new Set(handValues)].filter(v => handValues.filter(x => x === v).length === 2);
            cardElements.forEach((card, index) => {
                if (pairValues.includes(hand[index].value)) {
                    card.classList.add('selected');
                }
            });
            break;
        case 'Par de J o mejor':
            const highPairValue = handValues.find(v => handValues.filter(x => x === v).length === 2 && ['J', 'Q', 'K', 'A'].includes(v));
            cardElements.forEach((card, index) => {
                if (hand[index].value === highPairValue) {
                    card.classList.add('selected');
                }
            });
            break;
    }

    updateCardOpacity();
}

function handleWin(winMultiplier, handType) {
    currentWin = winMultiplier;

    if (currentWin > 0) {
        messageEl.textContent = `${handType}! Ganaste ${currentWin}`;
        markWinningCards(handType);
        showDoubleOption();
    } else {
        dealBtn.disabled = false;
        drawBtn.disabled = true;
        messageEl.textContent = `Mala suerte. Apuesta actual: ${currentBet}`;
    }
}

function showDoubleOption() {
    const potentialWin = currentWin * 2;
    messageEl.innerHTML = `¿Deseas doblar?<br>
        Créditos actuales a doblar: ${currentWin}<br>
        Cantidad a ganar si ganas la doblada: ${potentialWin}<br>
        <button id="doubleYesBtn">Sí</button>
        <button id="doubleNoBtn">No</button>`;

    document.getElementById('doubleYesBtn').addEventListener('click', startDoubleGame);
    document.getElementById('doubleNoBtn').addEventListener('click', () => {
        credits += currentWin;
        updateCredits();
        currentWin = 0;
        dealBtn.disabled = false;
        drawBtn.disabled = true;
        messageEl.textContent = `Nueva mano. Apuesta actual: ${currentBet}`;
    });

    drawBtn.disabled = true;
}

function startDoubleGame() {
    cardsContainer.innerHTML = '';
    shuffleDeck();

    const openCard = deck.pop();
    const openCardEl = createCardElement(openCard, true);
    cardsContainer.appendChild(openCardEl);

    const hiddenCards = [];
    for (let i = 0; i < 4; i++) {
        const card = deck.pop();
        hiddenCards.push(card);
        const cardEl = createCardElement(card, false);
        cardEl.addEventListener('click', () => revealCards(cardEl, openCard, hiddenCards));
        cardsContainer.appendChild(cardEl);
    }

    messageEl.textContent = "Selecciona una carta tapada";
    drawBtn.disabled = true;
}

function createCardElement(card, isOpen) {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card');
    if (isOpen) {
        const valueEl = document.createElement('div');
        valueEl.classList.add('card-value');
        valueEl.textContent = card.value;
        
        const suitEl = document.createElement('div');
        suitEl.classList.add('card-suit');
        suitEl.textContent = card.suit;

        const isRed = card.suit === '♥' || card.suit === '♦';
        valueEl.classList.add(isRed ? 'red' : 'black');
        suitEl.classList.add(isRed ? 'red' : 'black');

        cardEl.appendChild(valueEl);
        cardEl.appendChild(suitEl);
    } else {
        cardEl.textContent = '?';
        cardEl.dataset.value = card.value;
        cardEl.dataset.suit = card.suit;
    }
    return cardEl;
}

function revealCards(selectedCardEl, openCard, hiddenCards) {
    const selectedValue = selectedCardEl.dataset.value;
    const selectedSuit = selectedCardEl.dataset.suit;

    const cardElements = cardsContainer.querySelectorAll('.card');
    cardElements.forEach((cardEl, index) => {
        if (index !== 0) {
            const card = hiddenCards[index - 1];
            cardEl.innerHTML = '';

            const valueEl = document.createElement('div');
            valueEl.classList.add('card-value');
            valueEl.textContent = card.value;

            const suitEl = document.createElement('div');
            suitEl.classList.add('card-suit');
            suitEl.textContent = card.suit;

            const isRed = card.suit === '♥' || card.suit === '♦';
            valueEl.classList.add(isRed ? 'red' : 'black');
            suitEl.classList.add(isRed ? 'red' : 'black');

            cardEl.appendChild(valueEl);
            cardEl.appendChild(suitEl);
        }
    });

    const openCardValue = values.indexOf(openCard.value);
    const selectedCardValue = values.indexOf(selectedValue);

    if (selectedCardValue > openCardValue || (selectedValue === 'A' && openCard.value !== 'A')) {
        currentWin *= 2;
        messageEl.textContent = `¡Ganaste! Tus créditos se duplicaron a ${currentWin}`;
        showDoubleOption();
    } else if (selectedCardValue === openCardValue) {
        messageEl.textContent = "Empate. ¿Deseas volver a doblar?";
        showDoubleOption();
    } else {
        currentWin = 0;
        messageEl.textContent = "Perdiste la doblada. Inténtalo de nuevo.";
        dealBtn.disabled = false;
        drawBtn.disabled = true;
        messageEl.textContent += ` Apuesta actual: ${currentBet}`;
    }

    updateCredits();

    Array.from(cardsContainer.children).forEach(card => card.removeEventListener('click', revealCards));
}

function updatePaytableHighlight() {
    const rows = document.querySelectorAll('#paytable table tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, index) => {
            if (index === currentBet / 100) {
                cell.classList.add('highlight');
            } else {
                cell.classList.remove('highlight');
            }
        });
    });
}

function showCreditsModal() {
    creditsModal.classList.remove('hidden');
}

function hideCreditsModal() {
    creditsModal.classList.add('hidden');
}

function submitCode() {
    const code = codeInput.value.trim();

    // Check if the code is a predefined code
    const predefinedCode = predefinedCodes.find(c => c.code === code);
    if (predefinedCode && !usedCodes.has(code)) {
        credits += predefinedCode.credits;
        usedCodes.add(code);
        updateCredits();
        messageEl.textContent = `Se han añadido ${predefinedCode.credits} créditos a tu cuenta.`;
        hideCreditsModal();
        return;
    }

    // Check if the code matches the user's ID
    if (currentUser && code === currentUser.id) {
        credits += 5000;
        updateCredits();
        messageEl.textContent = "Se han añadido 5000 créditos a tu cuenta.";
        hideCreditsModal();
    } else {
        messageEl.textContent = "Código inválido.";
    }
    codeInput.value = '';
}

function withdrawCredits() {
    const amount = parseInt(withdrawAmount.value);
    if (isNaN(amount) || amount <= 0 || amount > credits) {
        messageEl.textContent = "Cantidad inválida para retirar.";
        return;
    }

    credits -= amount;
    updateCredits();

    const withdrawalCode = withdrawalCodes[withdrawalCount % withdrawalCodes.length];
    withdrawalCount++;

    const now = new Date();
    const receiptData = {
        username: currentUser.username,
        playerId: currentUser.id,
        amount: amount,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        code: withdrawalCode
    };

    displayReceipt(receiptData);
    hideCreditsModal();
}

function displayReceipt(data) {
    document.getElementById('receiptUsername').textContent = data.username;
    document.getElementById('receiptPlayerId').textContent = data.playerId;
    document.getElementById('receiptAmount').textContent = data.amount;
    document.getElementById('receiptDate').textContent = data.date;
    document.getElementById('receiptTime').textContent = data.time;
    document.getElementById('receiptCode').textContent = data.code;

    receiptModal.classList.remove('hidden');
}

function generateUniqueId() {
    return Math.random().toString(36).substr(2, 5).toUpperCase();
}

function showGameScreen() {
    registrationScreen.classList.add('hidden');
    loginScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
}

function togglePaytable() {
    if (rightPanel) {
        rightPanel.style.display = rightPanel.style.display === 'none' ? 'block' : 'none';
    }
}

function initializeGame() {
    if (loadUserData()) {
        showGameScreen();
        updateUserInfo();
        updateCredits();
        messageEl.textContent = `Bienvenido de nuevo, ${currentUser.username}!`;
    } else {
        showLoginScreen();
    }

    if (toggleScreenBtn) {
        toggleScreenBtn.addEventListener('click', togglePaytable);
    }

    if (dealBtn && drawBtn && betSelector && creditsBtn && submitCodeBtn && 
        withdrawBtn && closeReceiptBtn && registerBtn && loginBtn && logoutBtn && 
        closeCreditsModalBtn) {
        
        dealBtn.addEventListener('click', () => {
            if (credits >= currentBet) {
                createDeck();
                shuffleDeck();
                dealCards();
            } else {
                messageEl.textContent = "No tienes suficientes créditos para jugar.";
            }
        });

        drawBtn.addEventListener('click', drawCards);

        betSelector.addEventListener('change', (e) => {
            currentBet = parseInt(e.target.value);
            updatePaytableHighlight();
        });

        creditsBtn.addEventListener('click', showCreditsModal);
        submitCodeBtn.addEventListener('click', submitCode);
        withdrawBtn.addEventListener('click', withdrawCredits);
        closeReceiptBtn.addEventListener('click', () => receiptModal.classList.add('hidden'));
        registerBtn.addEventListener('click', registerUser);
        loginBtn.addEventListener('click', loginUser);
        logoutBtn.addEventListener('click', logoutUser);
        closeCreditsModalBtn.addEventListener('click', hideCreditsModal);

        window.addEventListener('click', (event) => {
            if (event.target === creditsModal) {
                hideCreditsModal();
            }
        });
    } else {
        console.error('Algunos elementos del DOM no se encontraron.');
    }

    createDeck();
    shuffleDeck();
    updatePaytableHighlight();
}

document.addEventListener('DOMContentLoaded', initializeGame);
// ... (código anterior sin cambios)

function generateUniqueId() {
    return Math.floor(10000 + Math.random() * 90000).toString();
}

// ... (código anterior sin cambios)

function registerUser() {
    const username = usernameInput.value.trim();
    if (username) {
        const userId = generateUniqueId();
        currentUser = { username, id: userId };
        credits = 0;
        saveUserData();
        showGameScreen();
        updateUserInfo();
        updateCredits();
        messageEl.textContent = `Bienvenido, ${currentUser.username}! Tu ID de jugador es ${userId}`;
    } else {
        registrationMessageEl.textContent = "Por favor, ingresa un nombre de usuario.";
    }
}

function submitCode() {
    const code = codeInput.value.trim();

    // Check if the code is a predefined code
    const predefinedCode = predefinedCodes.find(c => c.code === code);
    if (predefinedCode && !usedCodes.has(code)) {
        credits += predefinedCode.credits;
        usedCodes.add(code);
        updateCredits();
        messageEl.textContent = `Se han añadido ${predefinedCode.credits} créditos a tu cuenta.`;
        hideCreditsModal();
        return;
    }

    // Check if the code matches the user's ID
    if (currentUser && code === currentUser.id) {
        credits += 5000;
        updateCredits();
        messageEl.textContent = "Se han añadido 5000 créditos a tu cuenta.";
        hideCreditsModal();
    } else {
        messageEl.textContent = "Código inválido.";
    }
    codeInput.value = '';
}
