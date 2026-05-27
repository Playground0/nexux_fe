import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { API_BASE, WS_URL } from '../config';

export default function TicTacToe() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [playerName] = useState(localStorage.getItem('playerName') || '');
  const [board, setBoard] = useState(Array(3).fill(null).map(() => Array(3).fill(null)));
  
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  
  const { client, connected } = useWebSocket(WS_URL);

  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
    }
  }, [playerName, navigate]);

  useEffect(() => {
    if (client && connected) {
      // Send join event to map socket to session
      client.publish({
        destination: '/app/join',
        body: JSON.stringify({ sessionId, playerName })
      });

      const subscription = client.subscribe(`/topic/game/${sessionId}`, (message) => {
        const move = JSON.parse(message.body);
        
        if (move.board) {
          setBoard(move.board);
        } else {
          setBoard((prev) => {
            const newBoard = prev.map(row => [...row]);
            newBoard[move.row][move.col] = move.playerName;
            return newBoard;
          });
        }

        if (move.gameOver) {
          setGameOver(true);
          setWinner(move.winner);
        }
      });

      // Also listen to lobby topic in case session is forcefully ended by host or disconnect
      const lobbySub = client.subscribe(`/topic/lobby/${sessionId}`, (message) => {
        const updatedSession = JSON.parse(message.body);
        if (updatedSession.status === 'FINISHED') {
          setGameOver(true);
          setWinner('Session Ended');
        }
      });

      return () => {
        subscription.unsubscribe();
        lobbySub.unsubscribe();
      };
    }
  }, [client, connected, sessionId, playerName]);

  const handleCellClick = (row, col) => {
    if (board[row][col] || !connected || gameOver) return;

    // We can enforce strict turns here by checking who made the last move, 
    // but for simplicity, we allow any valid click
    client.publish({
      destination: '/app/tictactoe/move',
      body: JSON.stringify({ sessionId, playerName, row, col, gameOver: false })
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

  return (
    <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Tic-Tac-Toe</h1>
      <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
        Session: {sessionId}
      </p>

      {gameOver && (
        <div className="animate-fade-in" style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#10b981', fontWeight: 'bold' }}>
          {winner === 'DRAW' ? "It's a DRAW!" : winner === 'Session Ended' ? "Session was ended." : `${winner} WINS!`}
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '0.5rem', 
        background: 'rgba(255,255,255,0.1)', 
        padding: '1rem',
        borderRadius: '12px',
        marginBottom: '2rem'
      }}>
        {board.map((row, rowIndex) => (
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              onClick={() => handleCellClick(rowIndex, colIndex)}
              style={{
                aspectRatio: '1',
                background: 'rgba(0,0,0,0.3)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '2rem',
                fontWeight: 'bold',
                color: cell === playerName ? 'var(--primary-color)' : 'var(--secondary-color)',
                cursor: cell || gameOver ? 'default' : 'pointer',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: gameOver && !cell ? 0.5 : 1
              }}
              disabled={!!cell || gameOver}
            >
              {cell ? cell.charAt(0).toUpperCase() : ''}
            </button>
          ))
        ))}
      </div>

      <button className="btn btn-secondary" onClick={endSession} style={{ width: '100%' }}>
        End Session & Return Home
      </button>
    </div>
  );
}
