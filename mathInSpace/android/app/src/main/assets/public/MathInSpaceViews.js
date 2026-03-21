// client/src/games/mathInSpace/MathInSpaceViews.js
import { QUESTION_TIMEOUT } from './MathInSpaceParts';

export const SetupScreen = ({
  username,
  selectedDuration,
  setSelectedDuration,
  selectedMaxDigits,
  setSelectedMaxDigits,
  selectedNumOptions,
  setSelectedNumOptions,
  selectedOperations,
  toggleOperation,
  difficultyMultiplier,
  setDifficultyMultiplier,
  onStart,
}) => (
  <div className="setup-content">
    <h1>Math In Space!</h1>
    <h2>Welcome, {username}! Prepare for your math mission.</h2>
    <div className="settings-grid">
      <div className="setting-group">
        <label htmlFor="duration">Mission Duration:</label>
        <select
          id="duration"
          value={selectedDuration}
          onChange={(e) => {
            const value = Number(e.target.value);
            setSelectedDuration(value);
            setDifficultyMultiplier((prev) => ({
              ...prev,
              oldDifficulty: prev.newDifficulty,
              selectedDuration: 0.985 + value / 2000,
              newDifficulty:
                prev.initial * (0.985 + value / 2000) * prev.selectedMaxDigits * prev.selectedNumOptions * prev.selectedOperations,
            }));
          }}
        >
          <option value={30}>30 Seconds</option>
          <option value={60}>60 Seconds</option>
          <option value={90}>90 Seconds</option>
        </select>
      </div>
      <div className="setting-group">
        <label htmlFor="maxDigits">Max Digits:</label>
        <select
          id="maxDigits"
          value={selectedMaxDigits}
          onChange={(e) => {
            const value = Number(e.target.value);
            setSelectedMaxDigits(value);
            setDifficultyMultiplier((prev) => ({
              ...prev,
              oldDifficulty: prev.newDifficulty,
              selectedMaxDigits: Number(0.98 + value / 50),
              newDifficulty:
                prev.initial * (0.98 + value / 50) * prev.selectedDuration * prev.selectedNumOptions * prev.selectedOperations,
            }));
          }}
        >
          <option value={1}>1 digit (0-9)</option>
          <option value={2}>2 digits (10-99)</option>
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
            const value = Number(e.target.value);
            setSelectedNumOptions(value);
            setDifficultyMultiplier((prev) => ({
              ...prev,
              oldDifficulty: prev.newDifficulty,
              selectedNumOptions: 0.97 + value / 100,
              newDifficulty:
                prev.initial * (0.97 + value / 100) * prev.selectedDuration * prev.selectedMaxDigits * prev.selectedOperations,
            }));
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
        <span className="difficulty-multiplier-display">~{difficultyMultiplier.newDifficulty.toFixed(3)}x</span>
      </div>
      <button onClick={onStart} className="start-button" disabled={selectedOperations.length === 0}>
        Engage!
      </button>
    </div>
  </div>
);

export const PlayingScreen = ({
  score,
  timeLeft,
  handleQuit,
  currentProblem,
  answerOptions,
  clamp,
  clickedShipId,
  clickedShipFeedback,
  correctShipId,
  isWaitingForNextProblem,
  handleAnswerSelect,
  answerOptionRefs,
  playerShipRef,
  correctWidth,
  timeoutWidth,
  incorrectWidth,
  correctCount,
  timeoutCount,
  incorrectCount,
  questionTimeLeft,
  speedBonusDisplay,
}) => (
  <>
    <div className="game-hud">
      <span>Score: {score}</span>
      <span>Time: {timeLeft}s</span>
      <button className="quit-button" onClick={handleQuit}>
        Quit
      </button>
    </div>

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
          whiteSpace: 'pre-line',
          textAlign: 'center',
        }}
      >
        {speedBonusDisplay.value}
      </div>
    )}

    <div className="question-area">
      <p className="question">{currentProblem.question}</p>
    </div>

    <div className="answer-options-container">
      {answerOptions.map((option) => (
        <div
          key={option.id}
          className="answer-ship-wrapper"
          style={{ left: `${clamp(option.position.x, 20, 80)}%`, top: `${clamp(option.position.y, 20, 80)}%` }}
        >
          <div
            ref={(el) => (answerOptionRefs.current[option.id] = el)}
            className={`answer-ship-inner ${
              clickedShipId === option.id && clickedShipFeedback === 'correct'
                ? 'clicked-correct'
                : clickedShipId === option.id && clickedShipFeedback === 'incorrect'
                ? 'clicked-incorrect'
                : correctShipId === option.id && clickedShipFeedback === 'incorrect'
                ? 'show-correct'
                : ''
            } ${isWaitingForNextProblem ? 'disabled' : ''}`}
            onClick={() => handleAnswerSelect(option)}
          >
            {(() => {
              const len = String(option.value).length;
              let fontSize;
              if (len >= 5) fontSize = '0.5em';
              else if (len === 4) fontSize = '0.7em';
              else if (len === 3) fontSize = '0.9em';
              else if (len === 2) fontSize = '1em';
              else fontSize = '1.2em';
              return (
                <span className="answer-value" style={{ fontSize }}>
                  {option.value}
                </span>
              );
            })()}
          </div>
        </div>
      ))}
    </div>

    <div className="player-ship-area" ref={playerShipRef}>{/* Optional: Add a ship image */}</div>

    <div className="progress-bar-container">
      <div className="progress-bar correct" title={`Correct: ${correctCount}`} style={{ width: `${correctWidth}%` }}></div>
      <div className="progress-bar timeout" title={`Timeout: ${timeoutCount}`} style={{ width: `${timeoutWidth}%` }}></div>
      <div className="progress-bar incorrect" title={`Incorrect: ${incorrectCount}`} style={{ width: `${incorrectWidth}%` }}></div>
    </div>
    <div className="question-timer-container" title={`Time Remaining: ${Math.ceil(questionTimeLeft)}s`}>
      <div className="question-timer-bar" style={{ width: `${(questionTimeLeft / QUESTION_TIMEOUT) * 100}%` }} />
    </div>
  </>
);

export const ResultsScreen = ({
  username,
  score,
  selectedMaxDigits,
  selectedNumOptions,
  selectedDuration,
  selectedOperations,
  correctWidth,
  timeoutWidth,
  incorrectWidth,
  totalQuestionsAnswered,
  correctCount,
  incorrectCount,
  timeoutCount,
  speedBonusCount,
  playAgain,
  gameLog,
}) => (
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
      <p className="results-ops">Max Digits: {selectedMaxDigits}</p>
      <p className="results-ops">Max Options: {selectedNumOptions}</p>
    </div>
    <p className="results-ops" style={{ fontSize: '1.1em' }}>
      Duration: {selectedDuration} seconds
    </p>

    <p className="results-ops" style={{ fontSize: '1.1em' }}>
      Operations used:&nbsp;
      {`${selectedOperations
        .map((sym) => (sym === '+' ? '+' : sym === '-' ? '-' : sym === '*' ? '×' : '÷'))
        .join('  ')}`}
    </p>

    <div className="progress-bar-container results-bars">
      <div className="progress-bar correct" style={{ width: `${correctWidth}%` }} title={`Correct: ${correctCount}`}></div>
      <div className="progress-bar timeout" style={{ width: `${timeoutWidth}%` }} title={`Timeout: ${timeoutCount}`}></div>
      <div className="progress-bar incorrect" style={{ width: `${incorrectWidth}%` }} title={`Incorrect: ${incorrectCount}`}></div>
    </div>
    <p className="results-summary">
      Total Questions: {totalQuestionsAnswered} | Correct: {correctCount} | Incorrect: {incorrectCount} | Timeouts: {timeoutCount} |{' '}
      <strong>Speed Bonuses: {speedBonusCount}</strong>
    </p>
    <button onClick={playAgain} className="play-again-button">
      New Mission
    </button>
    <hr className="results-divider" />
    <div className="log-output">
      <h3>Mission Log</h3>
      <textarea readOnly value={JSON.stringify(gameLog, null, 2)} rows={8} />
    </div>
  </div>
);
