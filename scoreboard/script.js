let team1Score = 0;
let team2Score = 0;

let team1Name = "";
let team2Name = "";

let timeLeft = 60;
let timer = null;
let paused = false;


// ---------------------------
// Get HTML elements
// ---------------------------

const setup = document.getElementById("setup");
const game = document.getElementById("game");

const team1NameInput = document.getElementById("team1Name");
const team2NameInput = document.getElementById("team2Name");
const timeInput = document.getElementById("timeInput");

const team1Display = document.getElementById("team1Display");
const team2Display = document.getElementById("team2Display");

const team1ScoreDisplay = document.getElementById("team1Score");
const team2ScoreDisplay = document.getElementById("team2Score");

const timerDisplay = document.getElementById("timer");

const winnerDisplay = document.getElementById("winner");


// ---------------------------
// Start game
// ---------------------------

document.getElementById("startButton").addEventListener("click", function () {

    team1Name = team1NameInput.value.trim();
    team2Name = team2NameInput.value.trim();

    const enteredTime = Number(timeInput.value);

    if (!team1Name || !team2Name || enteredTime <= 0) {
        alert("Please enter both team names and a valid time.");
        return;
    }

    timeLeft = enteredTime;

    team1Display.textContent = team1Name;
    team2Display.textContent = team2Name;

    timerDisplay.textContent = timeLeft;

    setup.style.display = "none";
    game.style.display = "flex";

    startTimer();
});


// ---------------------------
// Team 1 +1
// ---------------------------

document.getElementById("team1Plus").addEventListener("click", function () {

    team1Score++;

    team1ScoreDisplay.textContent = team1Score;
});


// ---------------------------
// Team 1 -1
// ---------------------------

document.getElementById("team1Minus").addEventListener("click", function () {

    if (team1Score > 0) {
        team1Score--;
    }

    team1ScoreDisplay.textContent = team1Score;
});


// ---------------------------
// Team 2 +1
// ---------------------------

document.getElementById("team2Plus").addEventListener("click", function () {

    team2Score++;

    team2ScoreDisplay.textContent = team2Score;
});


// ---------------------------
// Team 2 -1
// ---------------------------

document.getElementById("team2Minus").addEventListener("click", function () {

    if (team2Score > 0) {
        team2Score--;
    }

    team2ScoreDisplay.textContent = team2Score;
});


// ---------------------------
// Timer
// ---------------------------

function startTimer() {

    clearInterval(timer);

    timer = setInterval(function () {

        if (!paused && timeLeft > 0) {

            timeLeft--;

            timerDisplay.textContent = timeLeft;

            if (timeLeft === 0) {
                clearInterval(timer);
                showWinner();
            }
        }

    }, 1000);
}


// ---------------------------
// Pause / Resume
// ---------------------------

document.getElementById("pauseButton").addEventListener("click", function () {

    paused = !paused;

    if (paused) {
        this.textContent = "RESUME";
    } else {
        this.textContent = "PAUSE";
    }
});


// ---------------------------
// Winner
// ---------------------------

function showWinner() {

    if (team1Score > team2Score) {
        winnerDisplay.textContent = team1Name + " WINS!";
    } else if (team2Score > team1Score) {
        winnerDisplay.textContent = team2Name + " WINS!";
    } else {
        winnerDisplay.textContent = "DRAW!";
    }

    winnerDisplay.style.display = "block";
}


// ---------------------------
// Reset
// ---------------------------

document.getElementById("resetButton").addEventListener("click", function () {

    clearInterval(timer);

    team1Score = 0;
    team2Score = 0;

    team1ScoreDisplay.textContent = 0;
    team2ScoreDisplay.textContent = 0;

    winnerDisplay.style.display = "none";

    paused = false;

    document.getElementById("pauseButton").textContent = "PAUSE";

    setup.style.display = "block";
    game.style.display = "none";

    team1NameInput.value = "";
    team2NameInput.value = "";
    timeInput.value = "";
});