import { getRandomInt } from './utils';

// --- Problem Generation ---
export function generateProblem(maxDigits) {
    const maxVal = Math.pow(10, maxDigits) - 1;
    const minVal = maxDigits > 1 ? Math.pow(10, maxDigits - 1) : 0; // Single digit starts from 0

    let num1 = getRandomInt(minVal, maxVal);
    let num2 = getRandomInt(minVal, maxVal);
    const operation = ['+', '-', '*', '/'][getRandomInt(0, 3)];
    let question = '';
    let answer = 0;

    switch (operation) {
        case '+':
            answer = num1 + num2;
            question = `${num1} + ${num2} = ?`;
            break;
        case '-':
            // Ensure subtraction doesn't result in negative numbers
            if (num1 < num2) [num1, num2] = [num2, num1];
            answer = num1 - num2;
            question = `${num1} - ${num2} = ?`;
            break;
        case '*':
            answer = num1 * num2;
            question = `${num1} × ${num2} = ?`;
            break;
        case '/':
            // Ensure division results in whole numbers
            if (num2 === 0) num2 = 1; // Avoid division by zero
            answer = Math.floor(num1 / num2);
            question = `${num1} ÷ ${num2} = ?`;
            break;
        default:
            console.error(`Unknown operation: ${operation}`);
            return generateProblem(maxDigits); // Try again with a new random operation
    }

    return {
        question,
        answer,
        num1,
        num2,
        operation
    };
}
