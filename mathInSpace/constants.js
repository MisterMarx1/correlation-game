// --- Configuration ---
export const DEFAULT_DURATION = 60;
export const DEFAULT_MAX_DIGITS = 1;
export const DEFAULT_NUM_OPTIONS = 4;
export const POINTS_CORRECT_PER_DIGIT = 50; // Base points per digit complexity
export const POINTS_INCORRECT_PENALTY_PER_DIGIT = 25; // Base penalty per digit
export const SPEED_BONUS_THRESHOLD_MS = 4000; // Answer within 4 seconds for bonus
export const SPEED_BONUS_POINTS_BASE = 25; // Base speed bonus

// --- Constants for Collision Detection ---
export const ESTIMATED_SHIP_WIDTH_PERCENT = 15; // Adjust based on your .answer-ship CSS
export const ESTIMATED_SHIP_HEIGHT_PERCENT = 10; // Adjust based on your .answer-ship CSS
export const MAX_PLACEMENT_ATTEMPTS = 50; // How many times to try finding a non-colliding spot
