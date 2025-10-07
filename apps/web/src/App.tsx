import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { JoinPage } from './pages/JoinPage';
import { TVDisplay } from './pages/TVDisplay';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/join/:gameId" element={<JoinPage />} />
          <Route path="/tv/:gameId" element={<TVDisplay />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
