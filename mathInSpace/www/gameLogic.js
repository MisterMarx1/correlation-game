import React from 'react';
import { generateProblem } from './problemGenerator';
import { generateIncorrectAnswers, shuffleArray, checkOverlap, getRandomInt } from './utils';
import {
  POINTS_CORRECT_PER_DIGIT,
  POINTS_INCORRECT_PENALTY_PER_DIGIT,
  MAX_PLACEMENT_ATTEMPTS
} from './constants';

export function generateAndSetProblem(
    selectedMaxDigits,
    selectedNumOptions,
    setAnswerOptions,
    setCurrentProblem,
    gameAreaRef,
    answerOptionRefs,
    ESTIMATED_SHIP_WIDTH_PERCENT,
    ESTIMATED_SHIP_HEIGHT_PERCENT
) {
    const problem = generateProblem(selectedMaxDigits);
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
        ...incorrect.map(val => ({ value: val, isCorrect: false }))
    ]);

    const placedPositions = []; // Keep track of the areas taken by placed ships
    const positionedOptions = options.map((opt, index) => {
        let attempts = 0;
        let finalPosition = { x: 50, y: 50 }; // Default fallback position

        // Try to place the ship in a non-overlapping position
        while (attempts < MAX_PLACEMENT_ATTEMPTS) {
            const areaWidth = gameAreaRef.current.offsetWidth;
            const areaHeight = gameAreaRef.current.offsetHeight;

            // Generate random position within bounds
            const x = getRandomInt(
                0,
                areaWidth * (1 - ESTIMATED_SHIP_WIDTH_PERCENT / 100)
            );
            const y = getRandomInt(
                0,
                areaHeight * (1 - ESTIMATED_SHIP_HEIGHT_PERCENT / 100)
            );

            // Check if this position overlaps with any existing ships
            let overlaps = false;
            for (const placed of placedPositions) {
                if (checkOverlap(
                    { x, y, width: areaWidth * (ESTIMATED_SHIP_WIDTH_PERCENT / 100), height: areaHeight * (ESTIMATED_SHIP_HEIGHT_PERCENT / 100) },
                    placed
                )) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                finalPosition = { x, y };
                placedPositions.push({
                    x: finalPosition.x,
                    y: finalPosition.y,
                    width: areaWidth * (ESTIMATED_SHIP_WIDTH_PERCENT / 100),
                    height: areaHeight * (ESTIMATED_SHIP_HEIGHT_PERCENT / 100)
                });
                break;
            }

            attempts++;
        }

        // Store the ref for this option
        answerOptionRefs.current[index] = React.createRef();

        return {
            ...opt,
            position: finalPosition,
            index
        };
    });

    setAnswerOptions(positionedOptions);
    setCurrentProblem(problem);
}

export function handleAnswerClick(
    option,
    currentProblem,
    selectedMaxDigits,
    setScore,
    score,
    correctCount,
    setCorrectCount,
    incorrectCount,
    setIncorrectCount,
    setShowFeedbackFlash,
    setFeedbackType,
    triggerFeedback,
    isWaitingForNextProblem,
    setIsWaitingForNextProblem,
    generateAndSetProblem
) {
    const isCorrect = option.isCorrect;
    const basePoints = POINTS_CORRECT_PER_DIGIT * selectedMaxDigits;
    const penaltyPoints = POINTS_INCORRECT_PENALTY_PER_DIGIT * selectedMaxDigits;

    if (isCorrect) {
        setScore(score + basePoints);
        setCorrectCount(correctCount + 1);
        setFeedbackType('correct');
    } else {
        setScore(score - penaltyPoints);
        setIncorrectCount(incorrectCount + 1);
        setFeedbackType('incorrect');
    }

    setShowFeedbackFlash(true);
    triggerFeedback();
    setIsWaitingForNextProblem(true);

    // Reset feedback after a short delay
    setTimeout(() => {
        setShowFeedbackFlash(false);
    }, 1000);

    // Generate new problem after feedback animation
    setTimeout(() => {
        generateAndSetProblem();
        setIsWaitingForNextProblem(false);
    }, isCorrect ? 400 : 600); // Same duration as feedback animation
}
