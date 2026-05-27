import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import TicTacToe from './games/TicTacToe';
import Trivia from './games/Trivia';
import NumberGuess from './games/NumberGuess';
import DigitGuess from './games/DigitGuess';

function App() {
  return (
    <Router>
      <div className="app-container animate-fade-in">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby/:sessionId" element={<Lobby />} />
          <Route path="/game/tic_tac_toe/:sessionId" element={<TicTacToe />} />
          <Route path="/game/trivia/:sessionId" element={<Trivia />} />
          <Route path="/game/number_guess/:sessionId" element={<NumberGuess />} />
          <Route path="/game/digit_guess/:sessionId" element={<DigitGuess />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
