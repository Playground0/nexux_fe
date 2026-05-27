import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { Users, Play, Copy, CheckCircle } from 'lucide-react';
import { API_BASE, WS_URL } from '../config';

export default function Lobby() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');
  const [copied, setCopied] = useState(false);
  
  const { client, connected } = useWebSocket(WS_URL);

  useEffect(() => {
    if (!playerName) {
      alert("Player name is missing, please return to home.");
      navigate('/');
      return;
    }

    const fetchSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/${sessionId}`);
        if (!res.ok) throw new Error("Failed to fetch session");
        const data = await res.json();
        setSession(data);
        if (data.status === 'IN_PROGRESS') {
          navigate(`/game/${data.gameType.toLowerCase()}/${sessionId}`);
        }
      } catch (err) {
        alert(err.message);
        navigate('/');
      }
    };

    fetchSession();
  }, [sessionId, playerName, navigate]);

  useEffect(() => {
    if (client && connected && session) {
      const subscription = client.subscribe(`/topic/lobby/${sessionId}`, (message) => {
        const updatedSession = JSON.parse(message.body);
        setSession(updatedSession);
        
        if (updatedSession.status === 'IN_PROGRESS') {
          navigate(`/game/${updatedSession.gameType.toLowerCase()}/${sessionId}`);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [client, connected, sessionId, session?.status, navigate]);

  const startGame = async () => {
    try {
      const res = await fetch(`${API_BASE}/${sessionId}/start`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      alert("Error starting game: " + err.message);
    }
  };

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!session) return <div className="title">Loading Lobby...</div>;

  const isHost = session.hostName === playerName;
  const canStart = session.players.length >= session.minPlayers && isHost;

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        Game Lobby
      </h1>
      
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Session ID:</span>
        <strong style={{ fontSize: '1.25rem', letterSpacing: '2px' }}>{sessionId}</strong>
        <button 
          onClick={copySessionId} 
          style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title="Copy Session ID"
        >
          {copied ? <CheckCircle size={20} color="#10b981" /> : <Copy size={20} />}
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Users size={24} color="#ec4899" /> 
          Players ({session.players.length}/{session.maxPlayers})
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {session.players.map((p, index) => (
            <li key={index} style={{ 
              background: 'rgba(255,255,255,0.05)', 
              padding: '0.75rem', 
              borderRadius: '8px',
              borderLeft: p === session.hostName ? '4px solid #a855f7' : '4px solid transparent',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>{p} {p === playerName && '(You)'}</span>
              {p === session.hostName && <span style={{ color: '#a855f7', fontSize: '0.8rem', textTransform: 'uppercase' }}>Host</span>}
            </li>
          ))}
          {/* Empty slots placeholders */}
          {Array.from({ length: session.maxPlayers - session.players.length }).map((_, i) => (
            <li key={`empty-${i}`} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Waiting for player...
            </li>
          ))}
        </ul>
      </div>

      {isHost ? (
        <button 
          className="btn" 
          onClick={startGame} 
          disabled={!canStart}
          style={{ width: '100%', fontSize: '1.2rem', padding: '1rem' }}
        >
          <Play size={20} /> Start Game
        </button>
      ) : (
        <div style={{ padding: '1rem', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '8px', color: '#ec4899' }}>
          Waiting for host to start the game...
        </div>
      )}
    </div>
  );
}
