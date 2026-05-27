import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { WS_URL } from '../config';

const QUESTIONS = [
  { q: "What is the capital of France?", options: ["Berlin", "Madrid", "Paris", "Rome"], answer: 2 },
  { q: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Jupiter", "Saturn"], answer: 1 },
  { q: "What is 2 + 2?", options: ["3", "4", "5", "22"], answer: 1 },
  { q: "Who wrote Hamlet?", options: ["Charles Dickens", "William Shakespeare", "Mark Twain", "Homer"], answer: 1 }
];

export default function Trivia() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [playerName] = useState(localStorage.getItem('playerName') || '');
  const [scores, setScores] = useState({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  
  const { client, connected } = useWebSocket(WS_URL);

  useEffect(() => {
    if (!playerName) navigate('/');
  }, [playerName, navigate]);

  useEffect(() => {
    if (client && connected) {
      const subscription = client.subscribe(`/topic/trivia/${sessionId}`, (message) => {
        const state = JSON.parse(message.body);
        setScores(state.scores || {});
      });

      return () => subscription.unsubscribe();
    }
  }, [client, connected, sessionId]);

  const handleAnswer = (index) => {
    if (hasAnswered) return;
    
    setHasAnswered(true);
    
    // Check if correct
    if (index === QUESTIONS[currentQIndex].answer) {
      client.publish({
        destination: '/app/trivia/answer',
        body: JSON.stringify({ sessionId, playerName, answerIndex: index })
      });
    }

    // Move to next question after 2 seconds
    setTimeout(() => {
      if (currentQIndex < QUESTIONS.length - 1) {
        setCurrentQIndex(currentQIndex + 1);
        setHasAnswered(false);
      } else {
        alert("Game Over! Check scores.");
      }
    }, 2000);
  };

  const question = QUESTIONS[currentQIndex];

  return (
    <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '2rem' }}>
      
      {/* Quiz Section */}
      <div style={{ flex: 2 }}>
        <h1 className="title" style={{ fontSize: '2rem', marginBottom: '1rem', textAlign: 'left' }}>Trivia Time!</h1>
        
        {currentQIndex < QUESTIONS.length ? (
          <div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Q{currentQIndex + 1}: {question.q}</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {question.options.map((opt, i) => (
                <button 
                  key={i}
                  className={`btn ${hasAnswered && i === question.answer ? '' : 'btn-secondary'}`}
                  style={{ 
                    padding: '1.5rem', 
                    fontSize: '1.1rem',
                    background: hasAnswered && i === question.answer ? '#10b981' : undefined
                  }}
                  onClick={() => handleAnswer(i)}
                  disabled={hasAnswered}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <h2>Game Over</h2>
        )}
      </div>

      {/* Leaderboard Section */}
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
          Leaderboard
        </h3>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Object.entries(scores)
            .sort(([, a], [, b]) => b - a)
            .map(([name, score]) => (
              <li key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                <span style={{ fontWeight: name === playerName ? 'bold' : 'normal', color: name === playerName ? '#a855f7' : 'inherit' }}>
                  {name}
                </span>
                <span style={{ fontWeight: 'bold' }}>{score} pts</span>
              </li>
          ))}
          {Object.keys(scores).length === 0 && (
            <li style={{ color: 'var(--text-secondary)' }}>No points yet!</li>
          )}
        </ul>
      </div>

    </div>
  );
}
