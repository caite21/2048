/*
* File: script.js
* Author: Caite Sklar
* Date: June 2024
* Description: Logic for game application based on the game 2048.
*/


const BOARD_LEN = 4;
const STEP = 24;
let IS_PUZZLE = false;
let SCORE = 0;
let LEVEL = 1;
let SQUARE_ARR = [];
let INACTIVE_SQRS = [];
let NEXT_LOCATION = [];

const SQR_ELEMENTS  = Array.from(document.getElementsByClassName('square'));

const SQR_COLOURS = {
    2: "#fddeaf",
    4: "#f5be84",
    8: "#fb965b",
    16: "#fa724b", 
    32: "#f54b31",
    64: "#eb3951",
    128: "#6a2283", 
    256: "#2aa1d3",
    512: "#2271ab",
    1024: "#234882",
    2048: "#1b1f46",
    4096: "#b47bcb", 
    8192: "#870c5c",
    16384: "#7d000f",
    32768: "#a88b2c",
    65536: "black",
};

// initialize page
refreshCookies();
// don't let user exit menu at first
document.getElementById("main-menu-close-button").style.visibility = "hidden";


let IS_MOVING = false;
let CONTAINER = document.getElementById('game-border');
let MS = 50;

// handling keyboard events
CONTAINER.addEventListener('keydown', async (event) => {
    event.preventDefault();
    if (IS_MOVING) return; 
    blockMoved = false;
    IS_MOVING = true;
    
    if (event.key == 'ArrowUp' || event.key == 'w') blockMoved = up();
    else if (event.key == 'ArrowDown' || event.key == 's') blockMoved = down();
    else if (event.key == 'ArrowLeft' || event.key == 'a') blockMoved = left();
    else if (event.key == 'ArrowRight' || event.key == 'd') blockMoved = right();

    await sleep(MS);
    if (blockMoved) {
        generateNewSquare();
        if (isGameOver()) {
            gameOver();
        }
    }
    IS_MOVING = false;
});

// handling swipe events
let START_X = 0;
let START_Y = 0;
CONTAINER.addEventListener('touchstart', function(event) {
    START_X = event.touches[0].clientX;
    START_Y = event.touches[0].clientY;
}, { passive: false });

CONTAINER.addEventListener('touchmove', async function(event) {
    event.preventDefault();
    if (IS_MOVING) return; 
    blockMoved = false;
    IS_MOVING = true;

    let endX = event.touches[0].clientX;
    let endY = event.touches[0].clientY;
    let deltaX = endX - START_X;
    let deltaY = endY - START_Y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) blockMoved = right();
        else blockMoved = left();
    } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
        if (deltaY > 0) blockMoved = down();
        else blockMoved = up();
    }
    await sleep(MS);
    if (blockMoved) {
        generateNewSquare();
        if (isGameOver()) gameOver();
    }
    
}, { passive: false });

CONTAINER.addEventListener('touchend', function(event) {
    IS_MOVING = false;
});


// playing game functions
function animate(elem, CSS_class_name) {
    // clear all (and only) animations
    elem.classList.remove('appear');
    elem.classList.remove('merge');
    elem.classList.remove('mergeMed');
    elem.classList.remove('mergeLarge');
    elem.classList.remove('hide-menu');
    elem.classList.remove('open-menu');

    void elem.offsetWidth;
    elem.classList.add(CSS_class_name);
}

function adjustLargeSquare(sqr) {
    if (sqr.value < 16) return;

    if (sqr.value >= 10000) {
        sqr.elem.classList.add('square-5-digits');
    }
    else if (sqr.value >= 1000) {
        sqr.elem.classList.add('square-4-digits');
    }    
    else if (sqr.value >= 16) {
        sqr.elem.classList.add('square-2-3-digits');
    }
}

function activate(row, col, value) {
    let sqr = INACTIVE_SQRS.pop();
    SQUARE_ARR[row][col] = sqr;
    sqr.active= true;
    sqr.value= value;
    sqr.elem.style.top = `${row * STEP}%`;
    sqr.elem.style.left = `${col * STEP}%`;
    sqr.elem.style.backgroundColor =  SQR_COLOURS[value];
    sqr.elem.innerHTML = `${value}`;
    adjustLargeSquare(sqr);
    sqr.elem.style.visibility = 'visible';
    animate(sqr.elem, 'appear'); 
}

function deactivate(sqr) {
    sqr.active = false;
    INACTIVE_SQRS.push(sqr);
    // block moves towards block it will merge with before disappearing
    setTimeout(() => {
        sqr.value = 0; 
        sqr.elem.className = 'square';
        sqr.elem.style.visibility = 'hidden';
    }, 50);
}

function displayMove() {
    while (NEXT_LOCATION.length > 0) {
        let l  = NEXT_LOCATION.pop();
        let sqr = l[0];
        let y = l[1];
        let x = l[2];
        
        sqr.elem.classList.add('slide');
        sqr.elem.style.left = `${x * STEP}%`;
        sqr.elem.style.top = `${y * STEP}%`;
        sqr.elem.style.backgroundColor =  SQR_COLOURS[sqr.value];
        sqr.elem.innerHTML = `${sqr.value}`;
        adjustLargeSquare(sqr);

        if (!sqr.active) {
            deactivate(sqr);
        }
    }
    document.getElementById("score").innerHTML = `${SCORE}`; 
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function updateLevel() {
    LEVEL++;
    setCookie('level', LEVEL);
    document.getElementById("level").innerHTML = LEVEL; 
    if (LEVEL >= 10) document.documentElement.style.setProperty('--title-color', SQR_COLOURS[2**LEVEL]);

    }

function merge(sqr1, sqr2) {
    sqr1.value *= 2;
    sqr2.active = false;

    if (sqr1.value < 2048) {
        animate(sqr1.elem, 'merge');
    } else if (sqr1.value < 10000) {
        animate(sqr1.elem, 'mergeMed');
    } else if (sqr1.value < 100000) {
        animate(sqr1.elem, 'mergeLarge');
    } 

    SCORE += sqr1.value;
    if (sqr1.value > 2**LEVEL) {
        updateLevel();
    }
}

function up() {
    movement = false;
    for (let col = 0; col < BOARD_LEN; col++) {
        let j = 0;
        for (let i = 1; i < BOARD_LEN; i++) {
            if (SQUARE_ARR[i][col] != null) {
                moved = false;
                while (!moved && j != i) {
                    if (SQUARE_ARR[j][col] == null) {
                        // move to empty spot
                        NEXT_LOCATION.push([SQUARE_ARR[i][col], j, col]);
                        SQUARE_ARR[j][col] = SQUARE_ARR[i][col];
                        SQUARE_ARR[i][col] = null;
                        moved = true;
                        movement = true;
                    }
                    else if (SQUARE_ARR[i][col].value == SQUARE_ARR[j][col].value) {
                        // merge with spot
                        merge(SQUARE_ARR[j][col], SQUARE_ARR[i][col]);
                        NEXT_LOCATION.push([SQUARE_ARR[i][col], j, col]);
                        NEXT_LOCATION.push([SQUARE_ARR[j][col], j, col]);
                        SQUARE_ARR[i][col] = null;
                        j++;
                        moved = true;
                        movement = true;
                    } 
                    else {
                        // spot is blocked by different value block
                        j++;
                    }
                }
            }
        }
    }
    displayMove();
    return movement;
}

function down() {
    movement = false;
    for (let col = 0; col < BOARD_LEN; col++) {
        let j = BOARD_LEN - 1;
        for (let i = BOARD_LEN - 2; i >= 0; i--) {
            if (SQUARE_ARR[i][col] != null) {
                moved = false;
                while (!moved && j != i) {
                    if (SQUARE_ARR[j][col] == null) {
                        // move to empty spot
                        NEXT_LOCATION.push([SQUARE_ARR[i][col], j, col]);
                        SQUARE_ARR[j][col] = SQUARE_ARR[i][col];
                        SQUARE_ARR[i][col] = null;
                        moved = true;
                        movement = true;
                    }
                    else if (SQUARE_ARR[i][col].value == SQUARE_ARR[j][col].value) {
                        // merge with spot
                        merge(SQUARE_ARR[j][col], SQUARE_ARR[i][col]);
                        NEXT_LOCATION.push([SQUARE_ARR[i][col], j, col]);
                        NEXT_LOCATION.push([SQUARE_ARR[j][col], j, col]);
                        SQUARE_ARR[i][col] = null;
                        j--;
                        moved = true;
                        movement = true;
                    }
                    else {
                        // spot is blocked by different value block
                        j--;
                    }
                }
            }
        }
    }
    displayMove();
    return movement;
}

function left() {
    movement = false;
    for (let row = 0; row < BOARD_LEN; row++) {
        let j = 0;
        for (let i = 1; i < BOARD_LEN; i++) {
            if (SQUARE_ARR[row][i] != null) {
                moved = false;
                while (!moved && j != i) {
                    if (SQUARE_ARR[row][j] == null) {
                        // move to empty spot
                        NEXT_LOCATION.push([SQUARE_ARR[row][i], row, j]);
                        SQUARE_ARR[row][j] = SQUARE_ARR[row][i];
                        SQUARE_ARR[row][i] = null;
                        moved = true;
                        movement = true;
                    }
                    else if (SQUARE_ARR[row][i].value == SQUARE_ARR[row][j].value) {
                        // merge 
                        merge(SQUARE_ARR[row][j], SQUARE_ARR[row][i]);
                        NEXT_LOCATION.push([SQUARE_ARR[row][i], row, j]);
                        NEXT_LOCATION.push([SQUARE_ARR[row][j], row, j]);
                        SQUARE_ARR[row][i] = null;
                        j++;
                        moved = true;
                        movement = true;
                    }
                    else {
                        // spot is blocked by different value block
                        j++;
                    }
                }
            }
        }
    }
    displayMove();
    return movement;
}

function right() {
    movement = false;
    for (let row = 0; row < BOARD_LEN; row++) {
        let j = BOARD_LEN - 1;
        for (let i = BOARD_LEN - 2; i >= 0; i--) {
            if (SQUARE_ARR[row][i] != null) {
                moved = false;
                while (!moved && j != i) {
                    if (SQUARE_ARR[row][j] == null) {
                        // move to empty spot
                        NEXT_LOCATION.push([SQUARE_ARR[row][i], row, j]);
                        SQUARE_ARR[row][j] = SQUARE_ARR[row][i];
                        SQUARE_ARR[row][i] = null;
                        moved = true;
                        movement = true;
                    }
                    else if (SQUARE_ARR[row][i].value == SQUARE_ARR[row][j].value) {
                        // merge 
                        merge(SQUARE_ARR[row][j], SQUARE_ARR[row][i]);
                        NEXT_LOCATION.push([SQUARE_ARR[row][i], row, j]);
                        NEXT_LOCATION.push([SQUARE_ARR[row][j], row, j]);
                        SQUARE_ARR[row][i] = null;
                        j--;
                        moved = true;
                        movement = true;
                    }
                    else {
                        // spot is blocked by different value block
                        j--;
                    }
                }
            }
        }
    }
    displayMove();
    return movement;
}

function generateNewSquare() {
    // number of inactive squares to choose from
    let randIndex = Math.floor(Math.random() * INACTIVE_SQRS.length);
    let count  = 0;
    for (let row = 0; row < BOARD_LEN; row++) {
        for (let col = 0; col < BOARD_LEN; col++) {
            if (SQUARE_ARR[row][col] == null) {
                if (count == randIndex) {
                    // value is 2 or 10% chance of being 4 
                    let randValue = 2;
                    if (Math.random() < 0.1) randValue = 4;
                    activate(row, col, randValue);
                    return;
                }
                count++;
            }
        }
    }
}

function generateNewMedSquare() {
    // number of inactive squares to choose from
    let randIndex = Math.floor(Math.random() * INACTIVE_SQRS.length);
    let count  = 0;
    for (let row = 0; row < BOARD_LEN; row++) {
        for (let col = 0; col < BOARD_LEN; col++) {
            if (SQUARE_ARR[row][col] == null) {
                if (count == randIndex) {
                    // value could be in range 8 to 1024 
                    let value = 0;
                    let randValue = Math.random();
                    if (randValue < 0.2) value = 8;
                    else if (randValue < 0.3) value = 16;
                    else if (randValue < 0.4) value = 32;
                    else if (randValue < 0.5) value = 64;
                    else if (randValue < 0.6) value = 128;
                    else if (randValue < 0.8) value = 256;
                    else if (randValue < 1) value = 512;

                    activate(row, col, value);
                    return;
                }
                count++;
            }
        }
    }
}


function isGameOver() {
    if (INACTIVE_SQRS.length == 0) {
        // check if move is possible

        // check if horizontal move is possible
        for (let row = 0; row < BOARD_LEN; row++) {
            let val = null;
            for (let col = 0; col < BOARD_LEN; col++) {
                if (SQUARE_ARR[row][col].value == val) {
                    return false;
                } else {
                    val = SQUARE_ARR[row][col].value;
                }
            }
        }
        // check if vertical move is possible
        for (let col = 0; col < BOARD_LEN; col++) {
            let val = null;
            for (let row = 0; row < BOARD_LEN; row++) {
                if (SQUARE_ARR[row][col].value == val) {
                    return false;
                } else {
                    val = SQUARE_ARR[row][col].value;
                }
            }
        }
        return true;
    }
    return false;
}

function openMenu() {
    document.getElementById('main-menu').style.display = 'block';
    document.getElementById('scores-menu').style.display = 'none';
    animate(document.getElementById('main-menu'), 'open-menu');
}

function openScoresMenu() {
    document.getElementById('scores-menu').style.display = 'block';
    document.getElementById('main-menu').style.display = 'none';
    animate(document.getElementById('scores-menu'), 'open-menu');
}

function setCookie(name, value) {
    expires = "; expires=Thu, 1 Jan 2026 12:00:00 GMT";
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function refreshCookies() {
    document.getElementById('top-score-1').innerHTML = getCookie('top-score-1');    
    document.getElementById('top-score-2').innerHTML = getCookie('top-score-2');
    document.getElementById('top-score-3').innerHTML = getCookie('top-score-3');
    document.getElementById('top-score-1-bottom').innerHTML = getCookie('top-score-1');    
    document.getElementById('top-score-2-bottom').innerHTML = getCookie('top-score-2');
    document.getElementById('top-score-3-bottom').innerHTML = getCookie('top-score-3');
    document.getElementById('username').innerHTML = getCookie('username');
}

function saveScore() {
    const scores = [
        getCookie('top-score-1'),
        getCookie('top-score-2'),
        getCookie('top-score-3')
    ];

    for (let i = 0; i < scores.length; i++) {
        if (SCORE > scores[i]) {
            scores.splice(i, 0, SCORE);
            break;
        }
    }

    setCookie('top-score-1', scores[0]);
    setCookie('top-score-2', scores[1]);
    setCookie('top-score-3', scores[2]);
    refreshCookies();
}
   
function play() {
    // reset
    SCORE = 0;
    LEVEL = 1;
    SQUARE_ARR = [];
    INACTIVE_SQRS = [];
    NEXT_LOCATION = [];

    // initialize block elements
    let countElems = 0;
    for (let row = 0; row < BOARD_LEN; row++) {
        let rowArr = [];
        for (let col = 0; col < BOARD_LEN; col++) {
            let sqr = {elem: SQR_ELEMENTS[countElems]};
            rowArr[col] = null;
            countElems++;
            deactivate(sqr);
        }
        SQUARE_ARR[row] = rowArr;
    }

    // close menus and start game
    animate( document.getElementById("main-menu"), 'hide-menu');
    animate( document.getElementById("game-over-menu"), 'hide-menu');
    document.getElementById("score").innerHTML = SCORE;
    document.getElementById("level").innerHTML = LEVEL; 
    document.getElementById('game-border').focus();
    setTimeout(() => {
        document.getElementById("main-menu").style.display = 'none';
        document.getElementById("scores-menu").style.display = 'none';
        document.getElementById("game-over-menu").style.visibility = "hidden";
        // allow user to close main menu now that a first game has been started
        document.getElementById("main-menu-close-button").style.visibility = "visible";
        document.getElementById('menu-title').innerHTML = 'New Game:';
        
    }, 180);
    setTimeout(() => {
        // initial game state
        if (IS_PUZZLE) {
            for (let i = 0; i < 5; i++) 
                generateNewSquare(); 
            for (let i = 0; i < 8; i++) 
                generateNewMedSquare();
        }
        else {
            generateNewSquare(); generateNewSquare();
        }
    }, 300);
}

function setUsername() {
    user = prompt("Please enter your name:", "");
    if (user != "" && user != null) {
        setCookie("username", user);
        refreshCookies();
    }
}

function normalPlay() {
    IS_PUZZLE = false;
    play();
}

function puzzlePlay() {
    IS_PUZZLE = true;
    play();
}

function gameOver() {
    animate(document.getElementById("game-over-menu"), 'appear');
    document.getElementById("game-over-menu").style.visibility = "visible";
    document.getElementById("game-over-score").innerHTML = SCORE;
    saveScore();
}
