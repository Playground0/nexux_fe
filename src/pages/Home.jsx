import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Users, ArrowRight, Plus } from 'lucide-react';
import { API_BASE } from '../config';

export default function Home() {
  const [playerName, setPlayerName] = useState('');
  const [joinSessionId, setJoinSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedName = localStorage.getItem('playerName');
    if (storedName) setPlayerName(storedName);
  }, []);

  const handleNameChange = (e) => {
    setPlayerName(e.target.value);
    localStorage.setItem('playerName', e.target.value);
  };

  const createSession = async (gameType) => {
    if (!playerName) return alert("Please enter your name first!");
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType, playerName })
      });
      
      if (!res.ok) throw new Error(await res.text());
      const session = await res.json();
      navigate(`/lobby/${session.id}`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const joinSession = async () => {
    if (!playerName) return alert("Please enter your name first!");
    if (!joinSessionId) return alert("Please enter a Session ID!");
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${joinSessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName })
      });
      
      if (!res.ok) throw new Error(await res.text());
      const session = await res.json();
      
      // If game is already in progress, navigate straight to game
      if (session.status === 'IN_PROGRESS') {
        navigate(`/game/${session.gameType.toLowerCase()}/${session.id}`);
      } else {
        navigate(`/lobby/${session.id}`);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 className="title" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <Gamepad2 size={48} color="#ec4899" /> Nexus
        </h1>
        <p className="subtitle">Mini Multiplayer Gaming Platform</p>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Your Player Name</label>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Enter name (e.g. Player1)"
          value={playerName}
          onChange={handleNameChange}
        />
      </div>

      <div className="responsive-columns">
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} /> Create Game
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button 
              className="btn" 
              onClick={() => createSession('TIC_TAC_TOE')}
              disabled={isLoading || !playerName}
            >
              Tic-Tac-Toe (2P)
            </button>
            <button 
              className="btn" 
              onClick={() => createSession('NUMBER_GUESS')}
              disabled={isLoading || !playerName}
            >
              Number Guesser (2P)
            </button>
            <button 
              className="btn" 
              onClick={() => createSession('DIGIT_GUESS')}
              disabled={isLoading || !playerName}
            >
              Digit Guesser (2P)
            </button>
            {/* <button 
              className="btn" 
              onClick={() => createSession('TRIVIA')}
              disabled={isLoading || !playerName}
            >
              Trivia (2-10P)
            </button> */}
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} /> Join Game
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Session ID" 
              style={{ marginBottom: 0 }}
              value={joinSessionId}
              onChange={(e) => setJoinSessionId(e.target.value.toUpperCase())}
            />
            <button 
              className="btn btn-secondary" 
              onClick={joinSession}
              disabled={isLoading || !playerName || !joinSessionId}
            >
              Join Lobby <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
