// script.js — Sudoku board + validation + backtracking solver

const SIZE = 9;
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const toastEl = document.getElementById('toast');

const inputs = []; // linear list of 81 inputs for quick access

// Create the 9x9 grid (DOM)
function createBoard() {
  boardEl.innerHTML = '';
  inputs.length = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      // Make horizontal thicker lines after rows 2 and 5 via class if needed
      if (r === 2 || r === 5) cell.classList.add(`row-${r}`);

      const inp = document.createElement('input');
      inp.type = 'text'; inp.inputMode = 'numeric'; inp.maxLength = 1; inp.autocomplete = 'off';
      inp.dataset.row = r; inp.dataset.col = c;

      // Only allow digits 1-9 to be typed/pasted
      inp.addEventListener('beforeinput', (e) => {
        if (e.data === null) return; // deletion/backspace
        if (!/[1-9]/.test(e.data)) e.preventDefault();
      });

      // Clean pasted content and mark validity on each change
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/[^1-9]/g, '');
        markValidity(+inp.dataset.row, +inp.dataset.col);
      });

      cell.appendChild(inp);
      boardEl.appendChild(cell);
      inputs.push(inp);
    }
  }
}

// Read the board into a 2D array of numbers (0 = empty)
function getBoard() {
  const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  for (const inp of inputs) {
    const r = +inp.dataset.row, c = +inp.dataset.col;
    b[r][c] = inp.value ? +inp.value : 0;
  }
  return b;
}

// Write a 2D board array to inputs. If mask provided, make those cells readOnly+prefilled
function setBoard(board, mask = null) {
  for (const inp of inputs) {
    const r = +inp.dataset.row, c = +inp.dataset.col;
    const v = board[r][c];
    inp.value = v ? String(v) : '';
    if (mask) {
      const fixed = !!mask[r][c];
      inp.readOnly = fixed;
      inp.classList.toggle('prefilled', fixed);
    } else {
      inp.readOnly = false;
      inp.classList.remove('prefilled');
    }
  }
}

// Helpers: status & toast
function showStatus(text, type='info') {
  statusEl.textContent = text;
  statusEl.style.borderColor = type === 'error' ? 'var(--danger)' : type === 'ok' ? 'var(--ok)' : 'rgba(148,163,184,.25)';
}
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1400);
}

// Remove highlight classes from all cells
function clearHighlights() {
  inputs.forEach(i => i.classList.remove('invalid','ok'));
}

// Check whether placing val at board[r][c] is allowed
function isSafe(board, r, c, val) {
  // row
  for (let j = 0; j < SIZE; j++) if (board[r][j] === val) return false;
  // column
  for (let i = 0; i < SIZE; i++) if (board[i][c] === val) return false;
  // 3x3 box
  const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    if (board[br+i][bc+j] === val) return false;
  return true;
}

// Mark a single cell as valid/invalid (used for immediate feedback)
function markValidity(r, c) {
  clearHighlights();
  const b = getBoard();
  const inp = inputs[r * SIZE + c];
  const val = b[r][c];
  if (!val) { showStatus('Empty cell'); return; }
  b[r][c] = 0; // temporarily remove to avoid self-conflict
  const ok = isSafe(b, r, c, val);
  inp.classList.add(ok ? 'ok' : 'invalid');
  showStatus(ok ? 'Looks valid' : 'Conflict detected', ok ? 'ok' : 'error');
}

// Validate whole board and highlight conflicts
function validateBoard() {
  clearHighlights();
  const b = getBoard();
  let valid = true;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = b[r][c];
      if (!v) continue;
      b[r][c] = 0;
      const ok = isSafe(b, r, c, v);
      if (!ok) { inputs[r*SIZE + c].classList.add('invalid'); valid = false; }
      b[r][c] = v;
    }
  }
  showStatus(valid ? 'Board valid' : 'Conflicts found', valid ? 'ok' : 'error');
  return valid;
}

// Backtracking solver: find an empty cell or return null
function findEmpty(board) {
  for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) if (board[r][c] === 0) return [r,c];
  return null;
}

// Solve in-place, return true if solved
function solveSudoku(board) {
  const pos = findEmpty(board);
  if (!pos) return true; // solved
  const [r,c] = pos;
  for (let d=1; d<=9; d++) {
    if (isSafe(board, r, c, d)) {
      board[r][c] = d;
      if (solveSudoku(board)) return true;
      board[r][c] = 0; // backtrack
    }
  }
  return false;
}

// Preset puzzles (strings of 81 chars; 0 means empty)
const PUZZLES = [
  // Easy
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
  // Medium
  "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
  // Hard
  "005300000800000020070010500400005300010070006003200080060500009004000030000009700",
  // Very hard
  "000000907000420180000705026100904000050000040000507009920108000034059000507000000"
];
let puzzleIndex = 0;

function loadPuzzle(str) {
  const mask = Array.from({length:SIZE}, ()=>Array(SIZE).fill(0));
  const board = Array.from({length:SIZE}, ()=>Array(SIZE).fill(0));
  for (let i=0;i<81;i++) {
    const r = Math.floor(i/9), c = i%9;
    const ch = str[i];
    const v = ch === '.' || ch === '0' ? 0 : Number(ch);
    board[r][c] = v;
    mask[r][c] = v ? 1 : 0;
  }
  setBoard(board, mask);
  showStatus('Puzzle loaded #' + (puzzleIndex+1));
}

function generateNext() {
  puzzleIndex = (puzzleIndex + 1) % PUZZLES.length;
  loadPuzzle(PUZZLES[puzzleIndex]);
  toast('Loaded puzzle #' + (puzzleIndex+1));
}

// Button handlers
function onSolve() {
  clearHighlights();
  const board = getBoard();
  // quick validation before attempting to solve
  if (!validateBoard()) { toast('Fix conflicts first'); return; }
  const copy = board.map(row => row.slice());
  const t0 = performance.now();
  const ok = solveSudoku(board);
  const dt = (performance.now() - t0).toFixed(2);
  if (ok) {
    setBoard(board); showStatus(`Solved in ${dt} ms`, 'ok'); toast('Solved!');
  } else {
    setBoard(copy); showStatus('Unsolvable', 'error'); toast('No solution found');
  }
}

function onClear() {
  clearHighlights();
  const empty = Array.from({length:SIZE}, ()=>Array(SIZE).fill(0));
  setBoard(empty);
  inputs.forEach(i => { i.readOnly = false; i.classList.remove('prefilled'); });
  showStatus('Cleared');
}

// Initialize UI and bind buttons
createBoard();
loadPuzzle(PUZZLES[puzzleIndex]);

document.getElementById('btn-generate').addEventListener('click', generateNext);
document.getElementById('btn-validate').addEventListener('click', validateBoard);
document.getElementById('btn-solve').addEventListener('click', onSolve);
document.getElementById('btn-clear').addEventListener('click', onClear);
