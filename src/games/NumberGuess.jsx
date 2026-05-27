import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { API_BASE, WS_URL } from '../config';

export default function NumberGuess() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [playerName] = useState(localStorage.getItem('playerName') || '');
  
  const [sessionInfo, setSessionInfo] = useState(null);
  const [gameState, setGameState] = useState({
    phase: 'SETUP', // SETUP, PICKING, PLAYING, FINISHED
    maxRange: null,
    playersPicked: [],
    currentTurnPlayer: null,
    pendingGuess: null,
    history: [],
    winner: null,
    errorMsg: null
  });

  const [inputRange, setInputRange] = useState(100);
  const [inputSecret, setInputSecret] = useState('');
  const [inputGuess, setInputGuess] = useState('');

  const { client, connected } = useWebSocket(WS_URL);

  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
    }

    // Fetch initial session to know who the host is
    fetch(`${API_BASE}/${sessionId}`)
      .then(res => res.json())
      .then(data => setSessionInfo(data))
      .catch(err => console.error(err));
  }, [playerName, navigate, sessionId]);

  useEffect(() => {
    if (client && connected) {
      // Send join event
      client.publish({
        destination: '/app/join',
        body: JSON.stringify({ sessionId, playerName })
      });

      // To trigger initial state sync, we can just send an empty action or wait for someone.
      // But actually the state only broadcasts on action. Let's make the backend broadcast on join?
      // Since it's a simple app, we can just let the host set the range to trigger the first broadcast.

      const subscription = client.subscribe(`/topic/numberguess/${sessionId}`, (message) => {
        setGameState(JSON.parse(message.body));
      });

      const lobbySub = client.subscribe(`/topic/lobby/${sessionId}`, (message) => {
        const updatedSession = JSON.parse(message.body);
        if (updatedSession.status === 'FINISHED') {
          setGameState(prev => ({ ...prev, phase: 'FINISHED', winner: prev.winner || 'Session Ended' }));
        }
      });

      return () => {
        subscription.unsubscribe();
        lobbySub.unsubscribe();
      };
    }
  }, [client, connected, sessionId, playerName]);

  const sendAction = (actionType, payload = {}) => {
    client.publish({
      destination: '/app/numberguess/action',
      body: JSON.stringify({ sessionId, playerName, actionType, ...payload })
    });
  };

  const endSession = async () => {
    try {
      await fetch(`${API_BASE}/${sessionId}/end`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    navigate('/');
  };

  if (!sessionInfo) return <div className="title">Loading Game...</div>;

  const isHost = sessionInfo.hostName === playerName;
  const isMyTurn = gameState.currentTurnPlayer === playerName;

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>Number Guesser</h1>
      <div style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
        Session: {sessionId} | You are: <strong style={{ color: 'var(--primary-color)' }}>{playerName}</strong>
      </div>

      {gameState.errorMsg && (
        <div className="animate-fade-in" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
          {gameState.errorMsg}
        </div>
      )}

      {gameState.phase === 'SETUP' && (
        <div style={{ textAlign: 'center' }}>
          {isHost ? (
            <div>
              <h2 style={{ marginBottom: '1rem' }}>Set the Range</h2>
              <p style={{ marginBottom: '1rem' }}>Choose the maximum number (e.g. 1 to 100):</p>
              <input 
                type="number" 
                className="input-field" 
                value={inputRange} 
                onChange={e => setInputRange(e.target.value)} 
                min="10"
              />
              <button className="btn" onClick={() => sendAction('SET_RANGE', { maxRange: parseInt(inputRange) })}>
                Set Range & Start
              </button>
            </div>
          ) : (
            <h2>Waiting for Host to set the range...</h2>
          )}
        </div>
      )}

      {gameState.phase === 'PICKING' && (
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Pick your Secret Number</h2>
          <p style={{ marginBottom: '1rem' }}>Must be between 1 and {gameState.maxRange}</p>
          
          {gameState.playersPicked.includes(playerName) ? (
            <div style={{ color: '#10b981' }}>Number locked in! Waiting for opponent...</div>
          ) : (
            <div>
              <input 
                type="number" 
                className="input-field" 
                value={inputSecret} 
                onChange={e => setInputSecret(e.target.value)} 
                min="1"
                max={gameState.maxRange}
              />
              <button 
                className="btn" 
                onClick={() => sendAction('PICK', { number: parseInt(inputSecret) })}
                disabled={!inputSecret}
              >
                Lock It In!
              </button>
            </div>
          )}
        </div>
      )}

      {gameState.phase === 'PLAYING' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
            <div>
              <h3>Turn</h3>
              <p style={{ color: isMyTurn ? '#10b981' : 'var(--text-secondary)' }}>
                {isMyTurn ? "It's your turn to guess!" : `Waiting for ${gameState.currentTurnPlayer} to guess...`}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3>Range</h3>
              <p>1 - {gameState.maxRange}</p>
            </div>
          </div>

          {gameState.pendingGuess !== null ? (
            <div style={{ textAlign: 'center', background: 'rgba(236, 72, 153, 0.1)', padding: '2rem', borderRadius: '12px' }}>
              <h2 style={{ color: '#ec4899', marginBottom: '1rem' }}>
                {gameState.currentTurnPlayer} guessed: {gameState.pendingGuess}
              </h2>
              {!isMyTurn ? (
                <div>
                  <p style={{ marginBottom: '1rem' }}>Is your secret number Greater, Less, or Equal?</p>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn" style={{ background: '#3b82f6' }} onClick={() => sendAction('RESPOND', { response: 'LESS' })}>Less</button>
                    <button className="btn" style={{ background: '#10b981' }} onClick={() => sendAction('RESPOND', { response: 'EQUAL' })}>Equal!</button>
                    <button className="btn" style={{ background: '#ef4444' }} onClick={() => sendAction('RESPOND', { response: 'GREATER' })}>Greater</button>
                  </div>
                </div>
              ) : (
                <p>Waiting for opponent to respond...</p>
              )}
            </div>
          ) : (
            isMyTurn && (
              <div style={{ textAlign: 'center' }}>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="Enter your guess"
                  value={inputGuess}
                  onChange={e => setInputGuess(e.target.value)}
                />
                <button className="btn" onClick={() => sendAction('GUESS', { number: parseInt(inputGuess) })} disabled={!inputGuess}>
                  Submit Guess
                </button>
              </div>
            )
          )}

          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Guess History</h3>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {gameState.history.map((log, i) => (
                <li key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                  {log}
                </li>
              ))}
              {gameState.history.length === 0 && <li style={{ color: 'var(--text-secondary)' }}>No guesses yet.</li>}
            </ul>
          </div>
        </div>
      )}

      {gameState.phase === 'FINISHED' && (
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', color: '#10b981', marginBottom: '1rem' }}>Game Over!</h2>
          <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>
            {gameState.winner === 'Session Ended' ? 'Session was ended.' : `${gameState.winner} won the game!`}
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
