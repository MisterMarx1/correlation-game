// client/src/games/mathInSpace/MathInSpace.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './MathInSpace.css';
import StarfieldBackground from './StarfieldBackground';

// --- Configuration ---
const DEFAULT_DURATION = 60;
const DEFAULT_MAX_DIGITS = 1;
const DEFAULT_NUM_OPTIONS = 4;
const POINTS_CORRECT_PER_DIGIT = 25; // Base points per digit complexity
const POINTS_INCORRECT_PENALTY_PER_DIGIT = 25; // Base penalty per digit
const POINTS_TIMEOUT_PER_DIGIT = 50; // Base penalty for timeout
const SPEED_BONUS_THRESHOLD_MS = 2000; // Answer within 2 seconds for bonus
const SPEED_BONUS_POINTS_BASE = 10; // Base speed bonus
const QUESTION_TIMEOUT = 10; // seconds per question

// --- Helper Functions ---
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- Smart Incorrect Answer Generation ---
function generateIncorrectAnswers(correctAnswer, num1, num2, operation, numOptions, maxDigits) {
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
    const randomRange = Math.max(5, Math.pow(10, maxDigits -1 || 1)); // Adjust range based on digits
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
    finalIncorrect = finalIncorrect.filter(ans => ans !== correctAnswer);

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
function generateProblem(maxDigits, selectedOperations) {
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
            if (num1 < num2) { [num1, num2] = [num2, num1]; }
            answer = num1 - num2;
            question = `${num1} - ${num2} = ?`;
            break;
        case '*':
             // Reduce numbers slightly for multiplication to keep answers manageable
             num1 = getRandomInt(minVal, Math.max(minVal+1, Math.floor(maxVal*0.7)));
             num2 = getRandomInt(minVal, Math.max(minVal+1, Math.floor(maxVal*0.7)));
            answer = num1 * num2;
            question = `${num1} × ${num2} = ?`;
            break;
        case '/':
            if (num2 === 0) num2 = getRandomInt(1, maxVal); // Avoid division by zero
            // Ensure whole number division result by generating answer first
            answer = getRandomInt(minVal, maxVal);
            num1 = answer * num2;
            // Check if num1 exceeds maxVal * maxVal (reasonable bound)
             if ((num1 > maxVal * maxVal) || (num1 > 144 && maxDigits <= 1)) { // Regenerate if product is too large
                return generateProblem(maxDigits); // Recurse to try again
             }
            question = `${num1} ÷ ${num2} = ?`;
            break;
        default: // Should not happen
            return generateProblem(maxDigits);
    }
    return { num1, num2, operation, question, answer };
}

function generateShipPositions(numShips) {
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
        y: (cell.row + 0.5) * cellHeight
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
  


// --- React Component ---
function MathInSpace() {
  // Select userProfile from Redux
  const userProfile = useSelector(state => state.auth.userProfile);

  // --- Redux State ---
    // Adjust 'auth.user.username' to your actual Redux state path
    const username = useSelector((state) => state.auth?.user?.username || 'Cadet');

    // --- Setup State ---
    const [selectedDuration, setSelectedDuration] = useState(DEFAULT_DURATION);
    const [selectedMaxDigits, setSelectedMaxDigits] = useState(DEFAULT_MAX_DIGITS);
    const [selectedNumOptions, setSelectedNumOptions] = useState(DEFAULT_NUM_OPTIONS);

    // --- Game State ---
    const [gameState, setGameState] = useState('setup'); // 'setup', 'playing', 'results'
    const [isWaitingForNextProblem, setIsWaitingForNextProblem] = useState(false);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
    const [currentProblem, setCurrentProblem] = useState(null);
    const [answerOptions, setAnswerOptions] = useState([]); // Array of { value: number, isCorrect: boolean, id: number, position: {x, y} }
    const [gameLog, setGameLog] = useState([]);

    // --- Feedback & Progress State ---
    const [feedbackType, setFeedbackType] = useState(null); // 'correct', 'incorrect', 'timeout'
    const [showFeedbackFlash, setShowFeedbackFlash] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [incorrectCount, setIncorrectCount] = useState(0);
    const [timeoutCount, setTimeoutCount] = useState(0); // Track timeouts (when main timer ends)

    // --- Speed Bonus Display ---
    const [speedBonusDisplay, setSpeedBonusDisplay] = useState(null);

    // --- Ship Size ---
    const [shipSize, setShipSize] = useState({ widthPercent: 10, heightPercent: 6 });

    // --- Ship Size Measurement ---
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
    // Delay a bit after first render
    setTimeout(measure, 100);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    }, []);


    // --- Refs ---
    const gameAreaRef = useRef(null);
    const playerShipRef = useRef(null);
    const timerRef = useRef(null);
    const problemStartTimeRef = useRef(null);
    const feedbackTimerRef = useRef(null);
    const laserTimeoutRef = useRef(null);
    const answerOptionRefs = useRef({}); // To get positions if needed dynamically

    

    // --- Memos ---
    const totalQuestionsAnswered = useMemo(() => correctCount + incorrectCount + timeoutCount, [correctCount, incorrectCount, timeoutCount]);
    const speedBonusCount = useMemo(() => {
        return gameLog.filter(entry => entry.isCorrect && entry.awardedSpeedBonus > 0).length;
      }, [gameLog]);
      


    // which operations are enabled
    const [selectedOperations, setSelectedOperations] = useState(['+', '-', '*', '/']);

    // difficulty multiplier
    const [difficultyMultiplier, setDifficultyMultiplier] = useState({
        initial: 1,
        selectedDuration: 1.015,
        selectedMaxDigits: 1,
        selectedNumOptions: 1.01,
        selectedOperations: 1.06131204,
        oldDifficulty: 1,
        newDifficulty: 1.015*1*1.01*1.06131204,
    })  
    
    useEffect(() => {
    }, [difficultyMultiplier]);
    
    // toggle one on or off
const operationMultipliers = useMemo(() => ({
    '+': 1.01,
    '-': 1.01,
    '*': 1.02,
    '/': 1.02,
}), []);

const toggleOperation = useCallback(op => {
    setSelectedOperations(prev => {
        const updated = prev.includes(op)
            ? prev.filter(o => o !== op)
            : [...prev, op];

        // Calculate the product of multipliers for selected operations
        const opMultiplier =
            (updated.length === 1 && (updated[0] === '+' || updated[0] === '-'))
                ? 1
                : updated.reduce((prod, o) => prod * operationMultipliers[o], 1);

        setDifficultyMultiplier(prev => ({
            ...prev,
            selectedOperations: opMultiplier,
            oldDifficulty: prev.newDifficulty,
            newDifficulty: prev.newDifficulty * (opMultiplier / (prev.selectedOperations || 1)),
        }));

        return updated;
    });
}, [operationMultipliers]);

    // countdown for the current question
    const [questionTimeLeft, setQuestionTimeLeft] = useState(QUESTION_TIMEOUT);

    // --- Game Logic Functions ---

    const generateAndSetProblem = useCallback(() => {
        setQuestionTimeLeft(QUESTION_TIMEOUT);
        
        // --- 1) generate problem & options ---
        const problem = generateProblem(selectedMaxDigits, selectedOperations);
        const incorrect = generateIncorrectAnswers(
          problem.answer,
          problem.num1,
          problem.num2,
          problem.operation,
          selectedNumOptions,
          selectedMaxDigits
        );
        const options = shuffleArray([
          { value: problem.answer, isCorrect: true },
          ...incorrect.map(v => ({ value: v, isCorrect: false }))
        ]);
      
        // --- 2) compute grid dimensions ---
        const count = options.length;
        const cols  = Math.ceil(Math.sqrt(count));
        const rows  = Math.ceil(count / cols);
      
        // margins so ships never budge off-screen
        const marginX = shipSize.widthPercent / 2;
        const marginY = shipSize.heightPercent / 2;
        const minX    = marginX;
        const maxX    = 100 - marginX;
        const minY    = 15 + marginY;    // play area starts at 15% down
        const maxY    = 80 - marginY;    // ends at 80% down
      
        const usableX = maxX - minX;
        const usableY = maxY - minY;
      
        // --- 3) build list of evenly spaced grid slots ---
        const slots = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            // center of each cell
            slots.push({
              x: minX + (c + 0.5) * (usableX / cols),
              y: minY + (r + 0.5) * (usableY / rows)
            });
          }
        }
            
        // --- 5) map options to positions ---
        const positions = generateShipPositions(options.length);

        const positionedOptions = options.map((opt, index) => ({
          ...opt,
          id: Date.now() + index,
          position: positions[index] || { x: 50, y: 50 } // fallback
        }));
        
      
        // --- 6) commit to state ---
        setCurrentProblem(problem);
        setAnswerOptions(positionedOptions);
        problemStartTimeRef.current = performance.now();
      
      }, [selectedMaxDigits, selectedNumOptions, selectedOperations, shipSize]);
      
      

    const triggerFeedback = useCallback((type) => {
        setFeedbackType(type);
        setShowFeedbackFlash(true);
        clearTimeout(feedbackTimerRef.current); // Clear previous timeout if any
        feedbackTimerRef.current = setTimeout(() => {
            setShowFeedbackFlash(false);
            setFeedbackType(null);
            // Only generate next problem after feedback if the game is still playing
            if (type !== 'timeout' && gameState === 'playing') {
                 generateAndSetProblem();
            }
        }, type === 'incorrect' ? 600 : 400); // Longer flash for incorrect/timeout
    }, [gameState, generateAndSetProblem]); // Added generateAndSetProblem

    const startGame = useCallback(() => {
        setScore(0);
        setTimeLeft(selectedDuration);
        setGameLog([]);
        setCorrectCount(0);
        setIncorrectCount(0);
        setTimeoutCount(0);
        setFeedbackType(null);
        setShowFeedbackFlash(false);
        setGameState('playing');
        generateAndSetProblem();

        // Clear existing timer just in case
        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 1) {
                    clearInterval(timerRef.current);
                    // Handle timeout: Log the current problem as timed out
                    if (currentProblem && gameState === 'playing') {
                        setTimeoutCount(c => c + 1);
                        setGameLog(prevLog => [
                            ...prevLog, {
                                timestamp: new Date().toISOString(),
                                problem: { ...currentProblem },
                                userAnswer: 'TIMEOUT',
                                submittedAnswerParsed: 'TIMEOUT',
                                isCorrect: false,
                                timeTakenMs: selectedDuration * 1000 - (performance.now() - problemStartTimeRef.current),
                                awardedSpeedBonus: false,
                                pointsChange: 0, // Or a penalty? Decide game rules
                                scoreAfter: score, // Score doesn't change on timeout
                                timedOut: true, // Add flag
                            },
                        ]);
                         triggerFeedback('timeout'); // Trigger timeout feedback visual
                    }
                    setGameState('results'); // Move to results AFTER logging
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

    }, [selectedDuration, generateAndSetProblem, score, currentProblem, gameState, triggerFeedback]);

    const [clickedShipId, setClickedShipId] = useState(null);
    const [clickedShipFeedback, setClickedShipFeedback] = useState(null);
    const [correctShipId, setCorrectShipId] = useState(null);

    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    const handleAnswerSelect = useCallback((selectedOption) => {
        if (gameState !== 'playing' || !currentProblem || isWaitingForNextProblem) return;

        const selectedValue = selectedOption.value;
        const timeTakenMs = performance.now() - problemStartTimeRef.current;

        const isCorrect = selectedValue === currentProblem.answer;
        let pointsChange = 0;
        let awardedSpeedBonus = 0;


        // Find the correct option to highlight it
        const correctOption = answerOptions.find(opt => opt.value === currentProblem.answer);
        setCorrectShipId(correctOption?.id);

        // Set clicked ship feedback
        setClickedShipId(selectedOption.id);
        setClickedShipFeedback(isCorrect ? 'correct' : 'incorrect');

        if (isCorrect) {
            pointsChange = Math.round(POINTS_CORRECT_PER_DIGIT * difficultyMultiplier.newDifficulty);
            // Speed bonus if answered within threshold
            if (timeTakenMs <= SPEED_BONUS_THRESHOLD_MS) {
                awardedSpeedBonus = Math.round(SPEED_BONUS_POINTS_BASE*difficultyMultiplier.newDifficulty);
                pointsChange += awardedSpeedBonus;
            
                const shipEl = answerOptionRefs.current[selectedOption.id]; // 
                if (shipEl) {
                    const rect = shipEl.getBoundingClientRect();
                    const x = rect.left + rect.width / 2;
                    const y = rect.top + rect.height / 2;
                    setSpeedBonusDisplay({ x, y, value: `+${awardedSpeedBonus}\nSpeed\nBonus!` });
            
                    setTimeout(() => setSpeedBonusDisplay(null), 1000);
                }
            }

            triggerFeedback('correct');
        } else if (selectedValue === 'TIMEOUT') {
            pointsChange = -POINTS_TIMEOUT_PER_DIGIT * selectedMaxDigits;
            triggerFeedback('timeout');
        } else {
            pointsChange = -POINTS_INCORRECT_PENALTY_PER_DIGIT * selectedMaxDigits;
            triggerFeedback('incorrect');
        }

        // Update score
        setScore(prevScore => Math.max(0, prevScore + pointsChange));
        if (selectedValue === 'TIMEOUT') {
            setTimeoutCount(prev => prev + 1);
        } else {
            setCorrectCount(prev => isCorrect ? prev + 1 : prev);
            setIncorrectCount(prev => isCorrect ? prev : prev + 1);
        }
        

        // Log the round
        setGameLog(prevLog => [
            ...prevLog,
            {
                timestamp: new Date().toISOString(),
                problem: { ...currentProblem },
                userAnswer: selectedValue,
                submittedAnswerParsed: selectedValue,
                isCorrect: isCorrect,
                timeTakenMs: Math.round(timeTakenMs),
                awardedSpeedBonus: awardedSpeedBonus,
                pointsChange: pointsChange,
                scoreAfter: score, // Use score instead of undefined currentScore
                optionsPresented: answerOptions.map(opt => opt.value)
            },
        ]);

        // Clear feedback states after animation
        clearTimeout(laserTimeoutRef.current);
        laserTimeoutRef.current = setTimeout(() => {
            setClickedShipId(null);
            setClickedShipFeedback(null);
            setCorrectShipId(null);
            setShowFeedbackFlash(false); // Clear flash
        }, isCorrect ? 400 : 400); // Longer for incorrect

        // Set waiting state and generate next problem after feedback
        setIsWaitingForNextProblem(true);
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => {
            setIsWaitingForNextProblem(false);
            if (gameState === 'playing') {
                generateAndSetProblem();
            }
        }, isCorrect ? 400 : 600); // Same duration as feedback animation
    }, [gameState, currentProblem, selectedMaxDigits, answerOptions, score, triggerFeedback, generateAndSetProblem, setShowFeedbackFlash, isWaitingForNextProblem, difficultyMultiplier]);

    const playAgain = () => {
        setGameState('setup');
        // Reset setup options if desired, or keep them
        // setSelectedDuration(DEFAULT_DURATION);
        // setSelectedMaxDigits(DEFAULT_MAX_DIGITS);
        // setSelectedNumOptions(DEFAULT_NUM_OPTIONS);
        setCurrentProblem(null);
        setAnswerOptions([]);
        if (timerRef.current) clearInterval(timerRef.current);
        clearTimeout(feedbackTimerRef.current);
        clearTimeout(laserTimeoutRef.current);
    };

    // --- Effects ---
    useEffect(() => { // Cleanup timers on unmount
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            clearTimeout(feedbackTimerRef.current);
             clearTimeout(laserTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (gameState !== 'playing') return;
      
        // tick every 100ms for smooth bar
        const qTimer = setInterval(() => {
          setQuestionTimeLeft(t => {
            if (t <= 0) {
              clearInterval(qTimer);
              // treat as timeout on this question
              handleAnswerSelect({ value: 'TIMEOUT', id: null });
              return 0;
            }
            return t - 0.1; // subtract 100ms
          });
        }, 100);
      
        return () => clearInterval(qTimer);
      }, [gameState, currentProblem, handleAnswerSelect]); 
      

      useEffect(() => {
        const sample = document.querySelector('.answer-ship-wrapper');
        if (sample) {
          const rect = sample.getBoundingClientRect();
          const w = rect.width / window.innerWidth;
          const h = rect.height / window.innerHeight;
      
          console.log('SHIP SIZE (viewport %):', { w: w * 100, h: h * 100 });
        }
      }, []);
      
    // --- Render Logic ---

    // Calculate Progress Bar Widths
    const totalAttempts = correctCount + incorrectCount + timeoutCount;
    const correctWidth = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;
    const incorrectWidth = totalAttempts > 0 ? (incorrectCount / totalAttempts) * 100 : 0;
    const timeoutWidth = totalAttempts > 0 ? (timeoutCount / totalAttempts) * 100 : 0;

    const handleQuit = () => {
        setGameState('setup');
        setScore(0);
        setTimeLeft(DEFAULT_DURATION);
        setCorrectCount(0);
        setIncorrectCount(0);
        setTimeoutCount(0);
        setFeedbackType(null);
        setShowFeedbackFlash(false);
        setCurrentProblem(null);
        setAnswerOptions([]);
        clearInterval(timerRef.current);
        clearTimeout(feedbackTimerRef.current);
        clearTimeout(laserTimeoutRef.current);
    };



        
    useEffect(() => {
        if (gameState === 'results') {


            setGameLog(prev => [
                ...prev,
                {
                type: 'summary',
                timestamp: new Date().toISOString(),
                finalScore: score,
                operationsUsed: selectedOperations.map(op =>
                    op === '+' ? '+'
                : op === '-' ? '-'
                : op === '*' ? '×'
                : '÷'),
                duration: selectedDuration,
                maxDigits: selectedMaxDigits,
                numOptions: selectedNumOptions,
                difficultyMultiplier: difficultyMultiplier.newDifficulty,
                totalQuestions: totalQuestionsAnswered,
                correct: correctCount,
                incorrect: incorrectCount,
                timeouts: timeoutCount,
                }
            ]);
        }
    }, [
        gameState,
        score,
        selectedOperations,
        totalQuestionsAnswered,
        correctCount,
        incorrectCount,
        timeoutCount,
        difficultyMultiplier,
        selectedDuration,
        selectedMaxDigits,
        selectedNumOptions,
    ]);
    
    return (
        <div
            className={`math-in-space-container ${gameState}-screen ${showFeedbackFlash ? `flash-${feedbackType}` : ''}`}
            ref={gameAreaRef}
        >
            {/* Conditionally render the Starfield */}
            {gameState === 'playing' && <StarfieldBackground />}

            {speedBonusDisplay && (
                <div
                    className="speed-bonus-floating"
                    style={{
                        position: 'absolute',
                        top: speedBonusDisplay.y,
                        left: speedBonusDisplay.x,
                        transform: 'translate(-50%, -50%)',
                        color: '#00ffcc',
                        fontWeight: 'bold',
                        fontSize: '1.2em',
                        animation: 'floatUpFade 1s ease-out',
                        pointerEvents: 'none',
                        zIndex: 100,
                        whiteSpace: 'pre-line', // <-- Add this!
                        textAlign: 'center',    // <-- Optional, for centering
                      }}
                >
                    {speedBonusDisplay.value}
                </div>
            )}

            {gameState === 'setup' && (
                <div className="setup-content">
                    <h1>Math In Space!</h1>
                    <h2>Welcome, {username}! Prepare for your math mission.</h2>
                    <div className="settings-grid">
                        <div className="setting-group">
                            <label htmlFor="duration">Mission Duration:</label>
                            <select id="duration" value={selectedDuration} onChange={(e) => {
                                setSelectedDuration(Number(e.target.value))
                                setDifficultyMultiplier(prev => ({
                                    ...prev,
                                    oldDifficulty: prev.newDifficulty,
                                    selectedDuration: (.985 + (Number(e.target.value)/2000)),
                                    newDifficulty: prev.initial * (.985 + (Number(e.target.value)/2000)) * prev.selectedMaxDigits * prev.selectedNumOptions * prev.selectedOperations
                                }))
                            }}>
                                <option value={30}>30 Seconds</option>
                                <option value={60}>60 Seconds</option>
                                <option value={90}>90 Seconds</option>
                            </select>
                        </div>
                        <div className="setting-group">
                            <label htmlFor="maxDigits">Max Digits:</label>
                            <select id="maxDigits" value={selectedMaxDigits} onChange={(e) => {
                                setSelectedMaxDigits(Number(e.target.value))
                                setDifficultyMultiplier(prev => ({
                                    ...prev,
                                    oldDifficulty: prev.newDifficulty,
                                    selectedMaxDigits: Number(.98 + (Number(e.target.value)/50)),
                                    newDifficulty: prev.initial * (.98 + (Number(e.target.value)/50)) * prev.selectedDuration * prev.selectedNumOptions * prev.selectedOperations
                                }))

                            }}>
                                <option value={1}>1 digit (0-9)</option>
                                <option value={2}>2 digits (10-99)</option>
                                {/* Add more digits if needed */}
                            </select>
                        </div>
                        <div className="setting-group">
                            <label className="operations-label">Operations: {selectedOperations.length} Selected</label>
                            <div className="operation-toggles">
                                {[
                                { sym: '+', label: '+' },
                                { sym: '-', label: '-' },
                                { sym: '*', label: '×' },
                                { sym: '/', label: '÷' },
                                ].map(({ sym, label }) => (
                                <button
                                    key={sym}
                                    type="button"
                                    className={`op-button ${selectedOperations.includes(sym) ? 'active' : ''}`}
                                    onClick={() => toggleOperation(sym)}
                                >
                                    {label}
                                </button>
                                ))}
                            </div>
                        </div>
                        <div className="setting-group">
                            <label htmlFor="numOptions">Answer Choices:</label>
                            <select 
                                id="numOptions" 
                                value={selectedNumOptions} 
                                onChange={(e) => {
                                    setSelectedNumOptions(Number(e.target.value))
                                    setDifficultyMultiplier(prev => ({
                                        ...prev,
                                        oldDifficulty: prev.newDifficulty,
                                        selectedNumOptions: (.97 + (Number(e.target.value)/100)), 
                                        newDifficulty: prev.initial * (.97 + (Number(e.target.value)/100)) * prev.selectedDuration * prev.selectedMaxDigits * prev.selectedOperations
                                    }))

                                }}
                            >
                                <option value={3}>3</option>
                                <option value={4}>4</option>
                                <option value={5}>5</option>
                                <option value={6}>6</option>
                            </select>
                        </div>
                    </div>
                    <div className="start-controls">
                        <div className="multiplier-container">
                            <div className="multiplier-label">Score Multiplier:</div>
                            <span className="difficulty-multiplier-display">
                                ~{difficultyMultiplier.newDifficulty.toFixed(3)}x
                            </span>
                        </div>
                        <button
                        onClick={startGame}
                        className="start-button"
                        disabled={selectedOperations.length === 0}
                        >
                            Engage!
                        </button>
                    </div>
                </div>
            )}

            {/* 2. Playing Screen */}
            {gameState === 'playing' && currentProblem && (
                <>
                    <div className="game-hud">
                        <span>Score: {score}</span>
                        <span>Time: {timeLeft}s</span>
                        <button className="quit-button" onClick={handleQuit}>Quit</button>
                    </div>

                    <div className="question-area">
                         <p className="question">{currentProblem.question}</p>
                    </div>

                    <div className="answer-options-container">
                        {answerOptions.map((option) => (
                            <div
                                key={option.id}
                                className="answer-ship-wrapper"
                                style={{
                                    left: `${clamp(option.position.x,20, 80)}%`,
                                    top: `${clamp(option.position.y, 20, 80)}%`,
                                }}
                            >
                                <div
                                    ref={el => answerOptionRefs.current[option.id] = el}
                                    className={`answer-ship-inner ${
                                        clickedShipId === option.id && clickedShipFeedback === 'correct' ? 'clicked-correct' :
                                        clickedShipId === option.id && clickedShipFeedback === 'incorrect' ? 'clicked-incorrect' :
                                        correctShipId === option.id && clickedShipFeedback === 'incorrect' ? 'show-correct' :
                                        ''
                                    } ${
                                        isWaitingForNextProblem ? 'disabled' : ''
                                    }`}
                                    onClick={() => handleAnswerSelect(option)}
                                >
                                    {/*
                                    compute the length once
                                    */}
                                    {(() => {
                                    const len = String(option.value).length;
                                    let fontSize;
                                    if (len >= 5)       
                                        fontSize = '0.5em';
                                    else if (len === 4) 
                                        fontSize = '0.7em';
                                    else if (len === 3) 
                                        fontSize = '0.9em';
                                    else if (len === 2) 
                                        fontSize = '1em';
                                    else                
                                        fontSize = '1.2em';
                                    return (
                                        <span
                                        className="answer-value"
                                        style={{ fontSize }}
                                        >
                                        {option.value}
                                        </span>
                                    );
                                    })()}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="player-ship-area" ref={playerShipRef}>
                         {/* Optional: Add a ship image */}
                    </div>

                     <div className="progress-bar-container">
                        <div className="progress-bar correct" title={`Correct: ${correctCount}`} style={{ width: `${correctWidth}%` }}></div>
                        <div className="progress-bar timeout" title={`Timeout: ${timeoutCount}`} style={{ width: `${timeoutWidth}%` }}></div>
                        <div className="progress-bar incorrect" title={`Incorrect: ${incorrectCount}`} style={{ width: `${incorrectWidth}%` }}></div>
                     </div>
                    <div className="question-timer-container" title={`Time Remaining: ${Math.ceil(questionTimeLeft)}s`}>
                    <div
                        className="question-timer-bar" 
                        style={{ width: `${(questionTimeLeft / QUESTION_TIMEOUT) * 100}%` }} 
                        />
                    </div>
                </>
            )}

            {/* 3. Results Screen */}
            {gameState === 'results' && (
                <ResultsLogger
                  userId={userProfile?.id}
                  score={score}
                  gameLog={gameLog}
                  gameName="MathInSpace"
                />
            )}

            {gameState === 'results' && (
                 <div className="results-content">
                    <h1>Mission Debrief, {username}!</h1>
                    <h2>Final Score: {score}</h2>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '30px',
                            fontSize: '.9em',
                        }}
                    >
                    <p className="results-ops">
                        Max Digits: {selectedMaxDigits}
                    </p>
                    <p className="results-ops">
                        Max Options: {selectedNumOptions}
                    </p>
                    </div>
                    <p className="results-ops"
                        style={{
                            fontSize: '1.1em',
                        }}
                    >
                        Duration: {selectedDuration} seconds
                    </p>

                    <p className="results-ops"
                        style={{
                            fontSize: '1.1em',
                        }}
                    >
                    Operations used:&nbsp;
                    {`${selectedOperations
                        .map(sym =>
                            sym === '+' ? '+'
                        : sym === '-' ? '-'
                        : sym === '*' ? '×'
                        : '÷'
                        )
                        .join('  ')}`}
                    </p>

                     <div className="progress-bar-container results-bars">
                        <div className="progress-bar correct" style={{ width: `${correctWidth}%` }} title={`Correct: ${correctCount}`}></div>
                        <div className="progress-bar timeout" style={{ width: `${timeoutWidth}%` }} title={`Timeout: ${timeoutCount}`}></div>
                        <div className="progress-bar incorrect" style={{ width: `${incorrectWidth}%` }} title={`Incorrect: ${incorrectCount}`}></div>
                     </div>
                     <p className="results-summary">
                         Total Questions: {totalQuestionsAnswered} | Correct: {correctCount} | Incorrect: {incorrectCount} | Timeouts: {timeoutCount} | <strong>Speed Bonuses: {speedBonusCount}</strong>
                     </p>
                    <button onClick={playAgain} className="play-again-button">New Mission</button>
                    {/* Between Play Again Button and log output, place a stylized divider */}
                    <hr className="results-divider" />
                    <div className="log-output">
                        <h3>Mission Log</h3>
                        <textarea
                            readOnly
                            value={JSON.stringify(gameLog, null, 2)}
                            rows={8} // Adjust size
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Helper component to log game played activity only once per result screen ---
const ResultsLogger = ({ userId, score, gameLog, gameName }) => {
    const dispatch = useDispatch();
    const hasLoggedRef = useRef(false);
    useEffect(() => {
    }, [userId, score, gameLog, gameName, dispatch]);
    return null;
};

export default MathInSpace;