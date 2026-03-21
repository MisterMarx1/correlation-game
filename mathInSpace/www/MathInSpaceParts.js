// client/src/games/mathInSpace/MathInSpaceParts.js
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { logGamePlayedActivity } from '../../utils/userActivityLogger';
import { dispatchGetAchievementProgressByCreatedBy } from '../../features/achievementProgress/thunks';

// --- Configuration ---
export const DEFAULT_DURATION = 60;
export const DEFAULT_MAX_DIGITS = 1;
export const DEFAULT_NUM_OPTIONS = 4;
export const POINTS_CORRECT_PER_DIGIT = 25; // Base points per digit complexity
export const POINTS_INCORRECT_PENALTY_PER_DIGIT = 25; // Base penalty per digit
export const POINTS_TIMEOUT_PER_DIGIT = 50; // Base penalty for timeout
export const SPEED_BONUS_THRESHOLD_MS = 2000; // Answer within 2 seconds for bonus
export const SPEED_BONUS_POINTS_BASE = 10; // Base speed bonus
export const QUESTION_TIMEOUT = 10; // seconds per question

// --- Helper Functions ---
export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// --- Smart Incorrect Answer Generation ---
export function generateIncorrectAnswers(correctAnswer, num1, num2, operation, numOptions, maxDigits) {
  const incorrectAnswers = new Set(); // Use Set to avoid duplicates easily
  const maxPossibleValue = Math.pow(10, maxDigits) * 2; // Rough upper bound for randoms

  // 1. Off-by-one errors
  if (correctAnswer > 0) incorrectAnswers.add(correctAnswer - 1);
  incorrectAnswers.add(correctAnswer + 1);

  // 2. Operation mistakes (if applicable)
  if (operation === '+') incorrectAnswers.add(Math.abs(num1 - num2));
  if (operation === '-') incorrectAnswers.add(num1 + num2);
  if (operation === '*') {
    incorrectAnswers.add(num1 + num2); // Common confusion
    if (num2 !== 0) incorrectAnswers.add(Math.floor(num1 / num2)); // Division instead
  }
  if (operation === '/') {
    incorrectAnswers.add(num1 * num2); // Multiplication instead
    if (num2 !== 0) incorrectAnswers.add(num1 + num2); // Addition instead
  }

  // 3. Fill remaining slots with random numbers near the answer
  const randomRange = Math.max(5, Math.pow(10, maxDigits - 1 || 1)); // Adjust range based on digits
  while (incorrectAnswers.size < numOptions - 1) {
    let randomAnswer = getRandomInt(
      Math.max(0, correctAnswer - randomRange), // Ensure non-negative
      Math.min(maxPossibleValue, correctAnswer + randomRange)
    );
    // Ensure it's not the correct answer or already added
    if (randomAnswer !== correctAnswer && !incorrectAnswers.has(randomAnswer)) {
      incorrectAnswers.add(randomAnswer);
    }
    // Break infinite loop potential if range is too small / options too high
    if (incorrectAnswers.size >= numOptions * 3) break;
  }

  // Convert Set to Array and ensure correct number of options
  let finalIncorrect = Array.from(incorrectAnswers);
  // Filter out the correct answer if it somehow got in
  finalIncorrect = finalIncorrect.filter((ans) => ans !== correctAnswer);

  // If we have too many, slice it; if too few, add more random (less smart) ones
  if (finalIncorrect.length > numOptions - 1) {
    finalIncorrect = finalIncorrect.slice(0, numOptions - 1);
  }
  while (finalIncorrect.length < numOptions - 1) {
    let randomAnswer = getRandomInt(0, maxPossibleValue);
    if (randomAnswer !== correctAnswer && !finalIncorrect.includes(randomAnswer)) {
      finalIncorrect.push(randomAnswer);
    }
    // Safety break
    if (finalIncorrect.length >= numOptions * 3) break;
  }

  return finalIncorrect;
}

// --- Problem Generation ---
export function generateProblem(maxDigits, selectedOperations) {
  const maxVal = Math.pow(10, maxDigits) - 1;
  const minVal = maxDigits > 1 ? Math.pow(10, maxDigits - 1) : 0; // Single digit starts from 0

  let num1 = getRandomInt(minVal, maxVal);
  let num2 = getRandomInt(minVal, maxVal);
  const operation = selectedOperations[getRandomInt(0, selectedOperations.length - 1)];
  let question = '';
  let answer = 0;

  switch (operation) {
    case '+':
      answer = num1 + num2;
      question = `${num1} + ${num2} = ?`;
      break;
    case '-':
      if (num1 < num2) {
        [num1, num2] = [num2, num1];
      }
      answer = num1 - num2;
      question = `${num1} - ${num2} = ?`;
      break;
    case '*':
      // Reduce numbers slightly for multiplication to keep answers manageable
      num1 = getRandomInt(minVal, Math.max(minVal + 1, Math.floor(maxVal * 0.7)));
      num2 = getRandomInt(minVal, Math.max(minVal + 1, Math.floor(maxVal * 0.7)));
      answer = num1 * num2;
      question = `${num1} × ${num2} = ?`;
      break;
    case '/':
      if (num2 === 0) num2 = getRandomInt(1, maxVal); // Avoid division by zero
      // Ensure whole number division result by generating answer first
      answer = getRandomInt(minVal, maxVal);
      num1 = answer * num2;
      // Check if num1 exceeds maxVal * maxVal (reasonable bound)
      if (num1 > maxVal * maxVal || (num1 > 144 && maxDigits <= 1)) {
        // Regenerate if product is too large
        return generateProblem(maxDigits, selectedOperations); // Recurse to try again
      }
      question = `${num1} ÷ ${num2} = ?`;
      break;
    default: // Should not happen
      return generateProblem(maxDigits, selectedOperations);
  }
  return { num1, num2, operation, question, answer };
}

export function generateShipPositions(numShips) {
  const gridCols = 6;
  const gridRows = 4;
  const cellWidth = 100 / gridCols;
  const cellHeight = 100 / gridRows;

  const allCells = [];

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      allCells.push({ row, col });
    }
  }

  // Shuffle the cells
  const shuffled = shuffleArray(allCells);

  const used = new Set(); // Track blocked cells
  const chosen = [];

  for (const cell of shuffled) {
    const key = `${cell.row},${cell.col}`;
    if (used.has(key)) continue;

    // Accept this cell
    chosen.push({
      x: (cell.col + 0.5) * cellWidth,
      y: (cell.row + 0.5) * cellHeight,
    });

    // Block adjacent cells
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nr = cell.row + dy;
        const nc = cell.col + dx;
        if (nr >= 0 && nr < gridRows && nc >= 0 && nc < gridCols) {
          used.add(`${nr},${nc}`);
        }
      }
    }

    if (chosen.length >= numShips) break;
  }

  return chosen;
}

export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

// --- Hooks ---
// Measures a sample answer ship element to determine approximate ship size as viewport percentage
export function useShipSize() {
  const [shipSize, setShipSize] = useState({ widthPercent: 10, heightPercent: 6 });

  useEffect(() => {
    const measure = () => {
      const sample = document.querySelector('.answer-ship-wrapper');
      if (sample) {
        const rect = sample.getBoundingClientRect();
        const w = (rect.width / window.innerWidth) * 100;
        const h = (rect.height / window.innerHeight) * 100;
        setShipSize({ widthPercent: w, heightPercent: h });
      }
    };
    // slight delay after first render
    const t = setTimeout(measure, 100);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return shipSize;
}

// Centralizes difficulty multiplier state and operation toggling
export function useDifficultyControls() {
  const [selectedOperations, setSelectedOperations] = useState(['+', '-', '*', '/']);
  const [difficultyMultiplier, setDifficultyMultiplier] = useState({
    initial: 1,
    selectedDuration: 1.015,
    selectedMaxDigits: 1,
    selectedNumOptions: 1.01,
    selectedOperations: 1.06131204,
    oldDifficulty: 1,
    newDifficulty: 1.015 * 1 * 1.01 * 1.06131204,
  });


  const operationMultipliers = useMemo(
    () => ({ '+': 1.01, '-': 1.01, '*': 1.02, '/': 1.02 }),
    []
  );

  const toggleOperation = useCallback(
    (op) => {
      setSelectedOperations((prev) => {
        const updated = prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op];

        // Calculate the product of multipliers for selected operations
        const opMultiplier =
          updated.length === 1 && (updated[0] === '+' || updated[0] === '-')
            ? 1
            : updated.reduce((prod, o) => prod * operationMultipliers[o], 1);

        setDifficultyMultiplier((prevDM) => ({
          ...prevDM,
          selectedOperations: opMultiplier,
          oldDifficulty: prevDM.newDifficulty,
          newDifficulty: prevDM.newDifficulty * (opMultiplier / (prevDM.selectedOperations || 1)),
        }));

        return updated;
      });
    },
    [operationMultipliers]
  );

  return { selectedOperations, setSelectedOperations, difficultyMultiplier, setDifficultyMultiplier, toggleOperation };
}

// --- Helper component to log game played activity only once per result screen ---
export const ResultsLogger = ({ userId, score, gameLog, gameName }) => {
  const dispatch = useDispatch();
  const hasLoggedRef = useRef(false);
  useEffect(() => {
    if (userId && !hasLoggedRef.current) {
      logGamePlayedActivity({
        userId,
        gameName,
        log: gameLog,
        points: score,
      }).then(() => {
        setTimeout(() => {
          dispatch(dispatchGetAchievementProgressByCreatedBy(userId));
        }, 500); // .5 second delay
      });
      hasLoggedRef.current = true;
    }
  }, [userId, score, gameLog, gameName, dispatch]);
  return null;
};
