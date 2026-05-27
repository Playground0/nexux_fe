import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { API_BASE, WS_URL } from '../config';

export default function DigitGuess() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [playerName] = useState(localStorage.getItem('playerName') || '');

  const [sessionInfo, setSessionInfo] = useState(null);
  const [gameState, setGameState] = useState({
    phase: 'SETUP',
    digitCount: 0,
    playersPicked: [],
    currentTurnPlayer: null,
    revealedDigits: {},
    guessHistory: {},
    winner: null,
    errorMsg: null
  });

  const [inputDigitCount, setInputDigitCount] = useState(4);
  const [inputSecret, setInputSecret] = useState('');
  const [inputGuess, setInputGuess] = useState('');

  const { client, connected } = useWebSocket(WS_URL);

  useEffect(() => {
    if (!playerName) { navigate('/'); return; }
    fetch(`${API_BASE}/${sessionId}`)
      .then(res => res.json())
      .then(data => setSessionInfo(data))
      .catch(err => console.error(err));
  }, [playerName, navigate, sessionId]);

  useEffect(() => {
    if (client && connected) {
      client.publish({
        destination: '/app/join',
        body: JSON.stringify({ sessionId, playerName })
      });

      const sub = client.subscribe(`/topic/digitguess/${sessionId}`, (message) => {
        setGameState(JSON.parse(message.body));
      });

      const lobbySub = client.subscribe(`/topic/lobby/${sessionId}`, (message) => {
        const updated = JSON.parse(message.body);
        if (updated.status === 'FINISHED') {
          setGameState(prev => ({ ...prev, phase: 'FINISHED', winner: prev.winner || 'Session Ended' }));
        }
      });

      return () => { sub.unsubscribe(); lobbySub.unsubscribe(); };
    }
  }, [client, connected, sessionId, playerName]);

  const sendAction = (actionType, payload = {}) => {
    client.publish({
      destination: '/app/digitguess/action',
      body: JSON.stringify({ sessionId, playerName, actionType, ...payload })
    });
  };

  const endSession = async () => {
    try { await fetch(`${API_BASE}/${sessionId}/end`, { method: 'POST' }); } catch (e) { console.error(e); }
    navigate('/');
  };

  if (!sessionInfo) return <div className="title">Loading Game...</div>;

  const isHost = sessionInfo.hostName === playerName;
  const isMyTurn = gameState.currentTurnPlayer === playerName;

  // Find opponent name
  const opponent = sessionInfo.players?.find(p => p !== playerName);

  // revealedDigits[opponent] = what I've cracked of opponent's number
  const myRevealOfOpponent = opponent && gameState.revealedDigits ? (gameState.revealedDigits[opponent] || []) : [];
  // guessHistory[opponent] = history of guesses against opponent's number (i.e., my guesses)
  const myGuessHistory = opponent && gameState.guessHistory ? (gameState.guessHistory[opponent] || []) : [];
  // guessHistory[playerName] = history of guesses against my number (i.e., opponent's guesses)
  const opponentGuessHistory = gameState.guessHistory ? (gameState.guessHistory[playerName] || []) : [];

  return (
    <div className="glass-panel game-panel">
      <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>Digit Guesser</h1>
      <div style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
        Session: {sessionId} | You: <strong style={{ color: 'var(--primary-color)' }}>{playerName}</strong>
        {opponent && <> | Opponent: <strong style={{ color: 'var(--secondary-color)' }}>{opponent}</strong></>}
      </div>

      {gameState.errorMsg && (
        <div className="animate-fade-in" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
          {gameState.errorMsg}
        </div>
      )}

      {/* ===================== SETUP PHASE ===================== */}
      {gameState.phase === 'SETUP' && (
        <div style={{ textAlign: 'center' }}>
          {isHost ? (
            <div>
              <h2 style={{ marginBottom: '1rem' }}>How many digits?</h2>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Choose the number of digits for the secret number (e.g. 3, 4, or 5).</p>
              <input type="number" className="input-field" value={inputDigitCount} onChange={e => setInputDigitCount(e.target.value)} min="2" max="8" style={{ maxWidth: '200px', margin: '0 auto 1rem' }} />
              <br />
              <button className="btn" onClick={() => sendAction('SET_DIGITS', { digitCount: parseInt(inputDigitCount) })}>
                Set Digits & Start
              </button>
            </div>
          ) : (
            <h2>Waiting for Host to set the digit count...</h2>
          )}
        </div>
      )}

      {/* ===================== PICKING PHASE ===================== */}
      {gameState.phase === 'PICKING' && (
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Pick your Secret Number</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Enter a {gameState.digitCount}-digit number. Duplicates are allowed.
          </p>
          {gameState.playersPicked.includes(playerName) ? (
            <div style={{ color: '#10b981', fontSize: '1.25rem' }}>✅ Locked in! Waiting for opponent...</div>
          ) : (
            <div>
              <input
                type="text"
                className="input-field"
                placeholder={`Enter ${gameState.digitCount} digits`}
                value={inputSecret}
                onChange={e => setInputSecret(e.target.value.replace(/\D/g, '').slice(0, gameState.digitCount))}
                maxLength={gameState.digitCount}
                style={{ maxWidth: '250px', margin: '0 auto 1rem', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px' }}
              />
              <br />
              <button className="btn" onClick={() => sendAction('PICK', { secretNumber: inputSecret })} disabled={inputSecret.length !== gameState.digitCount}>
                Lock It In!
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================== PLAYING PHASE ===================== */}
      {gameState.phase === 'PLAYING' && (
        <div>
          {/* Turn indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
            <div>
              <h3>Turn</h3>
              <p style={{ color: isMyTurn ? '#10b981' : 'var(--text-secondary)' }}>
                {isMyTurn ? "Your turn to guess!" : `Waiting for ${gameState.currentTurnPlayer}...`}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3>Digits</h3>
              <p>{gameState.digitCount}-digit number</p>
            </div>
          </div>

          {/* Revealed digits of opponent's number */}
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem' }}>Opponent's Number (Your Progress)</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              {myRevealOfOpponent.map((d, i) => (
                <div key={i} className={`digit-box ${d !== '_' ? 'digit-revealed' : ''}`}>
                  {d}
                </div>
              ))}
            </div>
          </div>

          {/* Guess input */}
          {isMyTurn && (
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <input
                type="text"
                className="input-field"
                placeholder={`Enter ${gameState.digitCount} digits`}
                value={inputGuess}
                onChange={e => setInputGuess(e.target.value.replace(/\D/g, '').slice(0, gameState.digitCount))}
                maxLength={gameState.digitCount}
                style={{ maxWidth: '250px', margin: '0 auto 1rem', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px' }}
              />
              <br />
              <button className="btn" onClick={() => { sendAction('GUESS', { guess: inputGuess }); setInputGuess(''); }} disabled={inputGuess.length !== gameState.digitCount}>
                Submit Guess
              </button>
            </div>
          )}

          {/* Guess histories side by side */}
          <div className="two-col-grid">
            <div>
              <h3 style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Your Guesses (vs {opponent})</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {myGuessHistory.map((log, i) => (
                  <li key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>{log}</li>
                ))}
                {myGuessHistory.length === 0 && <li style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No guesses yet.</li>}
              </ul>
            </div>
            <div>
              <h3 style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>{opponent}'s Guesses (vs You)</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {opponentGuessHistory.map((log, i) => (
                  <li key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>{log}</li>
                ))}
                {opponentGuessHistory.length === 0 && <li style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No guesses yet.</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ===================== FINISHED PHASE ===================== */}
      {gameState.phase === 'FINISHED' && (
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', color: '#10b981', marginBottom: '1rem' }}>🎉 Game Over!</h2>
          <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>
            {gameState.winner === 'Session Ended' ? 'Session was ended.' : `${gameState.winner} cracked the code and wins!`}
          </p>
        </div>
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button className="btn btn-secondary" onClick={endSession} style={{ width: '100%' }}>
          End Session & Return Home
        </button>
      </div>
    </div>
  );
}
