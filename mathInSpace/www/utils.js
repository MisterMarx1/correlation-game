// --- Helper Functions ---
export function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- Helper function to check for overlap ---
export function checkOverlap(rect1, rect2) {
    // Check if one rectangle is to the left of the other
    if (rect1.x + rect1.width < rect2.x || rect2.x + rect2.width < rect1.x) {
        return false;
    }
    // Check if one rectangle is above the other
    if (rect1.y + rect1.height < rect2.y || rect2.y + rect2.height < rect1.y) {
        return false;
    }
    // If neither of the above, they must overlap
    return true;
}

// --- Smart Incorrect Answer Generation ---
export function generateIncorrectAnswers(correctAnswer, num1, num2, operation, numOptions, maxDigits) {
    const incorrectAnswers = new Set(); // Use Set to avoid duplicates easily
    const maxPossibleValue = Math.pow(10, maxDigits) * 2; // Rough upper bound for randoms
    
    while (incorrectAnswers.size < numOptions - 1) {
        let incorrect;
        
        // Try different strategies based on operation
        switch (operation) {
            case '+':
                incorrect = correctAnswer + getRandomInt(1, 5);
                break;
            case '-':
                incorrect = correctAnswer - getRandomInt(1, 5);
                break;
            case '*':
                incorrect = correctAnswer * getRandomInt(2, 3);
                break;
            case '/':
                incorrect = correctAnswer / getRandomInt(2, 3);
                break;
            default:
                console.error(`Unknown operation: ${operation}`);
                return generateIncorrectAnswers(correctAnswer, num1, num2, '+', numOptions, maxDigits); // Fallback to addition
        }
        
        // Ensure the incorrect answer is valid
        if (incorrect > 0 && incorrect < maxPossibleValue && incorrect !== correctAnswer) {
            incorrectAnswers.add(incorrect);
        }
    }
    
    // Convert Set to Array and add correct answer
    const allAnswers = Array.from(incorrectAnswers);
    allAnswers.push(correctAnswer);
    
    // Shuffle to randomize order
    return shuffleArray(allAnswers);
}
