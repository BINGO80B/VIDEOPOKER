const buyTicketsScreen = document.getElementById('buy-tickets-screen');
const drawScreen = document.getElementById('draw-screen');
const countdownElement = document.getElementById('countdown');
const ticketsSoldElement = document.getElementById('tickets-sold');
const totalPotElement = document.getElementById('total-pot');
const firstLinePrizeElement = document.getElementById('first-line-prize');
const secondLinePrizeElement = document.getElementById('second-line-prize');
const bingoPrizeElement = document.getElementById('bingo-prize');
const drawFirstLinePrizeElement = document.getElementById('draw-first-line-prize');
const drawSecondLinePrizeElement = document.getElementById('draw-second-line-prize');
const drawBingoPrizeElement = document.getElementById('draw-bingo-prize');
const creditsElement = document.getElementById('credit-amount');
const ticketsContainer = document.getElementById('tickets-container');
const buySelectedTicketsBtn = document.getElementById('buy-selected-tickets');
const currentBall = document.getElementById('ball-number');
const drawnBallsContainer = document.getElementById('drawn-balls');
const playerTicketsContainer = document.getElementById('player-tickets');

let balls = Array.from({length: 90}, (_, i) => i + 1);
let calledBalls = [];
let intervalId;
let countdownTime = 120; // 2 minutes in seconds
let ticketsSold = 0;
let ticketPrice = 200;
let totalPot = 0;
let firstLinePrize = 0;
let secondLinePrize = 0;
let bingoPrize = 0;
let credits = 2000;
let selectedTickets = new Set();
let playerTickets = [];
let autoTickets = [];
let drawIntervalId;
let firstLineWon = false;
let secondLineWon = false;
let bingoWon = false;
let ticketSalesEnded = false;

function updateCountdown() {
    const minutes = Math.floor(countdownTime / 60);
    const seconds = countdownTime % 60;
    countdownElement.textContent = `Tiempo para el sorteo: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (countdownTime > 15 && !ticketSalesEnded) {
        countdownTime--;
        simulateTicketSales();
    } else if (countdownTime === 15 && !ticketSalesEnded) {
        ticketSalesEnded = true;
        endTicketSales();
    } else if (countdownTime > 0) {
        countdownTime--;
    } else {
        clearInterval(intervalId);
        if (playerTickets.length > 0 || autoTickets.length > 0) {
            showDrawScreen();
            startGame();
        } else {
            resetGame();
        }
    }
}

function simulateTicketSales() {
    ticketsSold++;
    updatePrizes();
    updateDisplay();
}

function endTicketSales() {
    showEndOfSalesMessage();
    buySelectedTicketsBtn.disabled = true;
    updatePrizes();
    updateDisplay();
}

function showEndOfSalesMessage() {
    const existingMessage = document.querySelector('.end-of-sales-message');
    if (!existingMessage) {
        const messageElement = document.createElement('div');
        messageElement.textContent = "El tiempo de compra ha terminado";
        messageElement.style.color = "red";
        messageElement.style.fontWeight = "bold";
        messageElement.style.marginTop = "10px";
        messageElement.classList.add('end-of-sales-message');
        countdownElement.insertAdjacentElement('afterend', messageElement);
    }
}

function updatePrizes() {
    totalPot = ticketsSold * ticketPrice;
    const netPot = totalPot * 0.9; // 10% de comisión
    firstLinePrize = netPot * 0.2;
    secondLinePrize = netPot * 0.2;
    bingoPrize = netPot * 0.6;
}

function updateDisplay() {
    ticketsSoldElement.textContent = `Tickets vendidos: ${ticketsSold}`;
    totalPotElement.textContent = `Bote total: $${totalPot}`;
    firstLinePrizeElement.textContent = `Premio 1ª línea: $${firstLinePrize.toFixed(2)}`;
    secondLinePrizeElement.textContent = `Premio 2ª línea: $${secondLinePrize.toFixed(2)}`;
    bingoPrizeElement.textContent = `Premio Bingo: $${bingoPrize.toFixed(2)}`;
    drawFirstLinePrizeElement.textContent = `Premio 1ª línea: $${firstLinePrize.toFixed(2)}`;
    drawSecondLinePrizeElement.textContent = `Premio 2ª línea: $${secondLinePrize.toFixed(2)}`;
    drawBingoPrizeElement.textContent = `Premio Bingo: $${bingoPrize.toFixed(2)}`;
    creditsElement.textContent = credits;
}

function startGame() {
    drawIntervalId = setInterval(drawBall, 1500);
}

function startTicketSales() {
    intervalId = setInterval(updateCountdown, 1000);
    buySelectedTicketsBtn.disabled = false;
    ticketSalesEnded = false;
}

function resetGame() {
    clearInterval(intervalId);
    clearInterval(drawIntervalId);
    balls = Array.from({length: 90}, (_, i) => i + 1);
    calledBalls = [];
    currentBall.textContent = '--';
    drawnBallsContainer.innerHTML = '';
    playerTicketsContainer.innerHTML = '';
    countdownTime = 120;
    ticketsSold = 0;
    totalPot = 0;
    firstLinePrize = 0;
    secondLinePrize = 0;
    bingoPrize = 0;
    selectedTickets.clear();
    playerTickets = [];
    autoTickets = [];
    firstLineWon = false;
    secondLineWon = false;
    bingoWon = false;
    ticketSalesEnded = false;
    
    const buyTicketsButton = drawScreen.querySelector('button');
    if (buyTicketsButton) {
        buyTicketsButton.remove();
    }
    
    const endOfSalesMessage = document.querySelector('.end-of-sales-message');
    if (endOfSalesMessage) {
        endOfSalesMessage.remove();
    }
    
    const winnerMessage = document.querySelector('.winner-message');
    if (winnerMessage) {
        winnerMessage.remove();
    }
    
    updateDisplay();
    countdownElement.textContent = 'Tiempo para el sorteo: 02:00';
    createTickets();
    showBuyTicketsScreen();
    startTicketSales();
}

function createTicketGrid() {
    function generateUniqueRandomNumbers(min, max, count) {
        const numbers = new Set();
        while (numbers.size < count) {
            numbers.add(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        return Array.from(numbers);
    }

    const columnRanges = [
        [1, 9], [10, 19], [20, 29], [30, 39], [40, 49],
        [50, 59], [60, 69], [70, 79], [80, 90]
    ];
    const ticketNumbers = columnRanges.map(([min, max]) => generateUniqueRandomNumbers(min, max, 3));

    const ticketGrid = Array(3).fill().map(() => Array(9).fill(null));

    for (let row = 0; row < 3; row++) {
        let numbersInRow = 0;
        let availableColumns = [...Array(9).keys()];
        
        while (numbersInRow < 5) {
            const randomColumnIndex = Math.floor(Math.random() * availableColumns.length);
            const col = availableColumns[randomColumnIndex];
            
            if (ticketNumbers[col].length > 0) {
                ticketGrid[row][col] = ticketNumbers[col].pop();
                numbersInRow++;
                availableColumns.splice(randomColumnIndex, 1);
            } else {
                availableColumns.splice(randomColumnIndex, 1);
            }
        }
    }

    return ticketGrid;
}

function createTicket() {
    const ticket = document.createElement('div');
    ticket.classList.add('ticket');
    const grid = document.createElement('div');
    grid.classList.add('ticket-grid');

    const ticketGrid = createTicketGrid();

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.classList.add('ticket-number');
            if (ticketGrid[row][col] !== null) {
                cell.textContent = ticketGrid[row][col];
            }
            grid.appendChild(cell);
        }
    }

    ticket.appendChild(grid);
    ticket.addEventListener('click', () => toggleTicketSelection(ticket));

    return { ticket, grid: ticketGrid };
}

function toggleTicketSelection(ticket) {
    if (!ticketSalesEnded) {
        if (ticket.classList.contains('selected')) {
            ticket.classList.remove('selected');
            selectedTickets.delete(ticket);
        } else {
            ticket.classList.add('selected');
            selectedTickets.add(ticket);
        }
        updateBuyButtonState();
    }
}

function updateBuyButtonState() {
    buySelectedTicketsBtn.disabled = selectedTickets.size === 0 || selectedTickets.size * ticketPrice > credits || ticketSalesEnded;
}

function createTickets() {
    ticketsContainer.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const { ticket } = createTicket();
        ticketsContainer.appendChild(ticket);
    }
    updateBuyButtonState();
}

function buySelectedTicketsHandler() {
    if (!ticketSalesEnded) {
        const cost = selectedTickets.size * ticketPrice;
        if (cost <= credits) {
            credits -= cost;
            ticketsSold += selectedTickets.size;
            selectedTickets.forEach(ticket => {
                const ticketGrid = Array(3).fill().map(() => Array(9).fill(null));
                const cells = ticket.querySelectorAll('.ticket-number');
                cells.forEach((cell, index) => {
                    const row = Math.floor(index / 9);
                    const col = index % 9;
                    ticketGrid[row][col] = cell.textContent || null;
                });
                playerTickets.push(ticketGrid);
            });
            updatePrizes();
            updateDisplay();
            selectedTickets.clear();
            createTickets();
        } else {
            alert('No tienes suficientes créditos para comprar estos tickets.');
        }
    } else {
        alert('El tiempo de compra ha terminado.');
    }
}

function showBuyTicketsScreen() {
    buyTicketsScreen.classList.add('active');
    drawScreen.classList.remove('active');
}

function showDrawScreen() {
    buyTicketsScreen.classList.remove('active');
    drawScreen.classList.add('active');
    displayPlayerTickets();
}

function displayPlayerTickets() {
    playerTicketsContainer.innerHTML = '';
    
    playerTickets.forEach((ticketGrid, index) => {
        const ticketElement = createTicketElement(ticketGrid, `Jugador-${index + 1}`);
        playerTicketsContainer.appendChild(ticketElement);
    });
}

function createTicketElement(ticketGrid, id) {
    const ticketElement = document.createElement('div');
    ticketElement.classList.add('player-ticket');
    ticketElement.dataset.id = id;
    const grid = document.createElement('div');
    grid.classList.add('ticket-grid');
    
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.classList.add('ticket-number');
            if (ticketGrid[row][col] !== null) {
                cell.textContent = ticketGrid[row][col];
            }
            grid.appendChild(cell);
        }
    }
    
    ticketElement.appendChild(grid);
    return ticketElement;
}

function drawBall() {
    if (balls.length === 0 || (firstLineWon && secondLineWon && bingoWon)) {
        clearInterval(drawIntervalId);
        alert('¡El juego ha terminado!');
        enableBuyTicketsButton();
        return;
    }

    const randomIndex = Math.floor(Math.random() * balls.length);
    const drawnBall = balls.splice(randomIndex, 1)[0];
    calledBalls.push(drawnBall);

    currentBall.textContent = drawnBall;
    
    const ballElement = document.createElement('div');
    ballElement.classList.add('drawn-ball');
    ballElement.textContent = drawnBall;
    ballElement.style.backgroundColor = getRandomColor();
    drawnBallsContainer.appendChild(ballElement);

    if (drawnBallsContainer.children.length > 5) {
        drawnBallsContainer.removeChild(drawnBallsContainer.firstChild);
    }

    markPlayerTickets(drawnBall);
    updateTicketColors();
    reorderTickets();
    checkForWinners();
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function markPlayerTickets(number) {
    const tickets = playerTicketsContainer.querySelectorAll('.player-ticket');
    tickets.forEach(ticket => {
        const numbers = ticket.querySelectorAll('.ticket-number');
        numbers.forEach(cell => {
            if (cell.textContent === number.toString()) {
                cell.classList.add('marked');
            }
        });
    });
}

function updateTicketColors() {
    const tickets = playerTicketsContainer.querySelectorAll('.player-ticket');
    
    tickets.forEach(ticket => {
        const rows = [
            Array.from(ticket.querySelectorAll('.ticket-number')).slice(0, 9),
            Array.from(ticket.querySelectorAll('.ticket-number')).slice(9, 18),
            Array.from(ticket.querySelectorAll('.ticket-number')).slice(18, 27)
        ];

        let minMissingForLine = 5;
        rows.forEach(row => {
            const markedInRow = row.filter(cell => cell.classList.contains('marked')).length;
            const missingForLine = 5 - markedInRow;
            if (missingForLine < minMissingForLine) {
                minMissingForLine = missingForLine;
            }
        });

        if (secondLineWon) {
            // Cambiar a modo Bingo
            const totalMarked = rows.flat().filter(cell => cell.classList.contains('marked')).length;
            const missingForBingo = 15 - totalMarked;
            
            if (missingForBingo <= 3) {
                ticket.style.backgroundColor = missingForBingo === 1 ? '#FFCCCB' : missingForBingo === 2 ? '#FFFACD' : '#90EE90';
            } else {
                ticket.style.backgroundColor = '';
            }
        } else {
            // Modo línea
            if (minMissingForLine <= 3) {
                ticket.style.backgroundColor = minMissingForLine === 1 ? '#FFCCCB' : minMissingForLine === 2 ? '#FFFACD' : '#90EE90';
            } else {
                ticket.style.backgroundColor = '';
            }
        }
    });
}

function reorderTickets() {
    const tickets = Array.from(playerTicketsContainer.querySelectorAll('.player-ticket'));
    tickets.sort((a, b) => {
        const colorOrder = {'#FFCCCB': 0, '#FFFACD': 1, '#90EE90': 2, '': 3};
        return colorOrder[a.style.backgroundColor] - colorOrder[b.style.backgroundColor];
    });
    playerTicketsContainer.innerHTML = '';
    tickets.forEach(ticket => playerTicketsContainer.appendChild(ticket));
}

function checkForWinners() {
    if (!firstLineWon) {
        checkFirstLine();
    } else if (!secondLineWon) {
        checkSecondLine();
    } else if (!bingoWon) {
        checkBingo();
    }
}

function checkFirstLine() {
    const tickets = playerTicketsContainer.querySelectorAll('.player-ticket');
    const winners = [];

    tickets.forEach(ticket => {
        const rows = [
            Array.from(ticket.querySelectorAll('.ticket-number')).slice(0, 9),
            Array.from(ticket.querySelectorAll('.ticket-number')).slice(9, 18),
            Array.from(ticket.querySelectorAll('.ticket-number')).slice(18, 27)
        ];

        rows.forEach((row, index) => {
            if (row.filter(cell => cell.classList.contains('marked')).length === 5) {
                winners.push({ id: ticket.dataset.id, row: index + 1 });
            }
        });
    });

    if (winners.length > 0) {
        firstLineWon = true;
        const prize = firstLinePrize / winners.length;
        winners.forEach(winner => {
            showWinnerAlert('Primera Línea', winner.id, prize);
        });
    }
}

function checkSecondLine() {
    const tickets = playerTicketsContainer.querySelectorAll('.player-ticket');
    const winners = [];

    tickets.forEach(ticket => {
        const rows = [
            Array.from(ticket.querySelectorAll('.ticket-number')).slice(0, 9),
            Array.from(ticket.querySelectorAll('.ticket-number')).slice(9, 18),
            Array.from(ticket.querySelectorAll('.ticket-number')).slice(18, 27)
        ];

        let completedLines = 0;
        rows.forEach((row, index) => {
            if (row.filter(cell => cell.classList.contains('marked')).length === 5) {
                completedLines++;
            }
        });

        if (completedLines >= 2) {
            winners.push({ id: ticket.dataset.id });
        }
    });

    if (winners.length > 0) {
        secondLineWon = true;
        const prize = secondLinePrize / winners.length;
        winners.forEach(winner => {
            showWinnerAlert('Segunda Línea', winner.id, prize);
        });
    }
}

function checkBingo() {
    const tickets = playerTicketsContainer.querySelectorAll('.player-ticket');
    const winners = [];

    tickets.forEach(ticket => {
        const numbers = ticket.querySelectorAll('.ticket-number');
        if (Array.from(numbers).filter(cell => cell.classList.contains('marked')).length === 15) {
            winners.push({ id: ticket.dataset.id });
        }
    });

    if (winners.length > 0) {
        bingoWon = true;
        const prize = bingoPrize / winners.length;
        winners.forEach(winner => {
            showWinnerAlert('Bingo', winner.id, prize);
        });
    }
}

function showWinnerAlert(prizeType, ticketId, prize) {
    clearInterval(drawIntervalId);
    const winnerID = Math.floor(Math.random() * 90000) + 10000;

    if (ticketId.startsWith('Jugador')) {
        // Es el jugador que compra los tickets
        const alertElement = document.createElement('div');
        alertElement.classList.add('winner-alert');
        alertElement.innerHTML = `
            <h2>¡${prizeType}!</h2>
            <p>Ticket ganador ID: ${ticketId}</p>
            <p>Jugador ID: ${winnerID}</p>
            <p>Premio: $${prize.toFixed(2)}</p>
        `;

        document.body.appendChild(alertElement);

        credits += prize;
        updateDisplay();

        const playerAlert = document.createElement('div');
        playerAlert.classList.add('player-alert');
        playerAlert.textContent = `¡Felicidades! Has ganado $${prize.toFixed(2)} en ${prizeType}. Tus créditos han sido actualizados.`;
        document.body.appendChild(playerAlert);

        setTimeout(() => {
            alertElement.remove();
            playerAlert.remove();
            resumeGame();
        }, 6000);
    } else {
        // Es otro jugador
        showWinnerMessage(prizeType, ticketId, winnerID, prize);
        setTimeout(resumeGame, 6000);
    }
}

function showWinnerMessage(prizeType, ticketId, winnerID, prize) {
    const existingMessage = document.querySelector('.winner-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageElement = document.createElement('div');
    messageElement.classList.add('winner-message');
    messageElement.innerHTML = `
        <h3>¡${prizeType}!</h3>
        <p>Ticket ganador ID: ${ticketId}</p>
        <p>Jugador ID: ${winnerID}</p>
        <p>Premio: $${prize.toFixed(2)}</p>
    `;

    const insertAfter = document.querySelector('#drawn-balls');
    insertAfter.parentNode.insertBefore(messageElement, insertAfter.nextSibling);
}

function resumeGame() {
    if (!bingoWon) {
        drawIntervalId = setInterval(drawBall, 1500);
    } else {
        enableBuyTicketsButton();
    }
}

function enableBuyTicketsButton() {
    const existingButton = drawScreen.querySelector('button');
    if (!existingButton) {
        const buyTicketsButton = document.createElement('button');
        buyTicketsButton.textContent = 'Comprar Tickets';
        buyTicketsButton.addEventListener('click', () => {
            resetGame();
            showBuyTicketsScreen();
        });
        drawScreen.appendChild(buyTicketsButton);
    }
}

createTickets();
updateDisplay();
showBuyTicketsScreen();
startTicketSales();

buySelectedTicketsBtn.addEventListener('click', buySelectedTicketsHandler);