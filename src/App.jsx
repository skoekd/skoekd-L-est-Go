import React, { useState, useEffect } from 'react';
import { Users, Shuffle, Trophy, Plus, X, Beer, Mountain, RotateCcw, Download, History, Timer } from 'lucide-react';

// Constants
const CUPS_TO_WIN = 10;
const STORAGE_KEY = 'beerPongTournament';

export default function App() {
  const [screen, setScreen] = useState('setup');
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [gameStartTime, setGameStartTime] = useState(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.players) setPlayers(data.players);
        if (data.teams) setTeams(data.teams);
        if (data.games) setGames(data.games);
        if (data.currentGame) {
          setCurrentGame(data.currentGame);
          setGameStartTime(data.currentGame.startTime || Date.now());
        }
        if (data.screen) setScreen(data.screen);
      } catch (e) {
        console.error('Failed to load saved data:', e);
      }
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      const data = {
        players,
        teams,
        games,
        screen: currentGame ? 'games' : screen,
        currentGame
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded. Consider clearing old games.');
        // Optionally: Keep only last 10 games to save space
      } else {
        console.error('Failed to save data:', e);
      }
    }
  }, [players, teams, games, screen, currentGame]);

  // Add player
  const addPlayer = () => {
    if (newPlayerName.trim()) {
      const isDuplicate = players.some(p => 
        p.name.toLowerCase() === newPlayerName.trim().toLowerCase()
      );
      
      if (isDuplicate) {
        alert('Player name already exists!');
        return;
      }
      
      setPlayers([...players, { id: Date.now(), name: newPlayerName.trim() }]);
      setNewPlayerName('');
    }
  };

  // Remove player
  const removePlayer = (id) => {
    if (teams.length > 0) {
      if (!confirm('This will reset all teams and games. Continue?')) {
        return;
      }
      setTeams([]);
      setGames([]);
    }
    setPlayers(players.filter(p => p.id !== id));
  };

  // Generate random teams
  const generateTeams = () => {
    if (players.length < 2) {
      alert('Need at least 2 players!');
      return;
    }

    if (players.length % 2 !== 0) {
      if (!confirm(`You have ${players.length} players (odd number). One player will sit out. Continue?`)) {
        return;
      }
    }
    
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const newTeams = [];
    
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      newTeams.push({
        id: `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
        player1: shuffled[i],
        player2: shuffled[i + 1],
        name: `${shuffled[i].name} & ${shuffled[i + 1].name}`,
        wins: 0,
        losses: 0,
        ties: 0,
        cupsScored: 0
      });
    }
    
    setTeams(newTeams);
    setGames([]);
    setScreen('teams');
  };

  // Regenerate teams
  const regenerateTeams = () => {
    if (!confirm('This will reset all teams and games. Continue?')) {
      return;
    }
    generateTeams();
  };

  // Check if matchup already exists (completed games only)
  const matchupExists = (team1Id, team2Id) => {
    return games.some(g => 
      g.completed &&
      ((g.team1.id === team1Id && g.team2.id === team2Id) ||
       (g.team1.id === team2Id && g.team2.id === team1Id))
    );
  };

  // Create new game
  const createGame = (team1, team2) => {
    if (currentGame) {
      alert('Please finish the current game first!');
      return;
    }

    const existingGame = games.find(g => 
      !g.completed &&
      ((g.team1.id === team1.id && g.team2.id === team2.id) ||
       (g.team1.id === team2.id && g.team2.id === team1.id))
    );

    if (existingGame) {
      setCurrentGame(existingGame);
      setGameStartTime(existingGame.startTime || Date.now());
      setScreen('games');
      return;
    }

    const newGame = {
      id: Date.now(),
      team1: { ...team1 },
      team2: { ...team2 },
      score1: 0,
      score2: 0,
      completed: false,
      startTime: Date.now(),
      endTime: null
    };
    
    setGames([...games, newGame]);
    setCurrentGame(newGame);
    setGameStartTime(Date.now());
    setScreen('games');
  };

  // Update game score with max cups limit
  const updateScore = (gameId, team, delta) => {
    const updatedGames = games.map(g => {
      if (g.id === gameId) {
        if (team === 1) {
          const newScore = Math.max(0, Math.min(CUPS_TO_WIN, g.score1 + delta));
          return { ...g, score1: newScore };
        } else {
          const newScore = Math.max(0, Math.min(CUPS_TO_WIN, g.score2 + delta));
          return { ...g, score2: newScore };
        }
      }
      return g;
    });
    
    setGames(updatedGames);
    
    if (currentGame?.id === gameId) {
      const updated = updatedGames.find(g => g.id === gameId);
      setCurrentGame(updated);
      
      // Auto-complete if someone hits 10 cups
      if (updated.score1 === CUPS_TO_WIN || updated.score2 === CUPS_TO_WIN) {
        setTimeout(() => {
          if (confirm(`${updated.score1 === CUPS_TO_WIN ? updated.team1.name : updated.team2.name} wins! Complete game?`)) {
            completeGame(gameId);
          }
        }, 500);
      }
    }
  };

  // Complete game with proper win tracking
  const completeGame = (gameId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    if (game.score1 === game.score2) {
      if (!confirm("Game is tied! Are you sure you want to complete it?")) {
        return;
      }
    }
    
    // Mark game as completed
    const completedGame = {
      ...game,
      completed: true,
      endTime: Date.now()
    };
    
    const updatedGames = games.map(g => 
      g.id === gameId ? completedGame : g
    );
    setGames(updatedGames);
    
    // Update team stats properly
    setTeams(prevTeams => prevTeams.map(t => {
      if (t.id === game.team1.id) {
        return {
          ...t,
          wins: game.score1 > game.score2 ? t.wins + 1 : t.wins,
          losses: game.score1 < game.score2 ? t.losses + 1 : t.losses,
          ties: game.score1 === game.score2 ? (t.ties || 0) + 1 : (t.ties || 0),
          cupsScored: t.cupsScored + game.score1
        };
      }
      if (t.id === game.team2.id) {
        return {
          ...t,
          wins: game.score2 > game.score1 ? t.wins + 1 : t.wins,
          losses: game.score2 < game.score1 ? t.losses + 1 : t.losses,
          ties: game.score1 === game.score2 ? (t.ties || 0) + 1 : (t.ties || 0),
          cupsScored: t.cupsScored + game.score2
        };
      }
      return t;
    }));
    
    setCurrentGame(null);
    setGameStartTime(null);
    setScreen('results');
  };

  // Cancel current game
  const cancelGame = () => {
    if (!confirm('Cancel this game? Progress will be lost.')) {
      return;
    }
    
    setGames(games.filter(g => g.id !== currentGame.id));
    setCurrentGame(null);
    setGameStartTime(null);
    setScreen('teams');
  };

  // Reset everything
  const resetAll = () => {
    if (!confirm('Reset entire tournament? This cannot be undone!')) {
      return;
    }
    setPlayers([]);
    setTeams([]);
    setGames([]);
    setCurrentGame(null);
    setGameStartTime(null);
    setScreen('setup');
    localStorage.removeItem(STORAGE_KEY);
  };

  // Export results as JSON
  const exportResults = () => {
    const data = {
      tournament: 'Ski Trip Beer Pong',
      date: new Date().toISOString(),
      players,
      teams,
      games: games.filter(g => g.completed),
      leaderboard: [...teams].sort((a, b) => b.wins - a.wins)
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beer-pong-results-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format game duration
  const formatDuration = (startTime, endTime) => {
    const duration = Math.floor((endTime - startTime) / 1000 / 60);
    return `${duration} min`;
  };

  // Setup Screen
  if (screen === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 p-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8 pt-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Mountain className="w-10 h-10 text-cyan-400" />
              <Beer className="w-12 h-12 text-amber-400" />
              <Mountain className="w-10 h-10 text-cyan-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">SKI TRIP</h1>
            <h2 className="text-2xl font-bold text-amber-400">BEER PONG</h2>
            <p className="text-cyan-300 text-lg mt-2">Let's Go! 🎿</p>
          </div>

          {/* Add Players */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Add Players ({players.length})
            </h3>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                placeholder="Player name..."
                className="flex-1 px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <button
                onClick={addPlayer}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-semibold transition flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Players List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20"
                >
                  <span className="text-white font-medium">
                    {index + 1}. {player.name}
                  </span>
                  <button
                    onClick={() => removePlayer(player.id)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            {players.length === 0 && (
              <p className="text-white/50 text-center py-4">No players yet</p>
            )}
          </div>

          {/* Generate Teams Button */}
          <button
            onClick={generateTeams}
            disabled={players.length < 2}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-2xl font-bold text-lg transition flex items-center justify-center gap-3 shadow-lg disabled:cursor-not-allowed mb-3"
          >
            <Shuffle className="w-6 h-6" />
            Generate Random Teams
          </button>
          
          {players.length < 2 && (
            <p className="text-amber-300 text-center mb-4">Add at least 2 players</p>
          )}

          {/* Continue to existing tournament */}
          {teams.length > 0 && (
            <button
              onClick={() => setScreen('teams')}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition mb-3"
            >
              Continue Tournament
            </button>
          )}

          {/* Reset Button */}
          {(players.length > 0 || teams.length > 0) && (
            <button
              onClick={resetAll}
              className="w-full py-3 bg-red-600/50 hover:bg-red-600 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Reset Everything
            </button>
          )}
        </div>
      </div>
    );
  }

  // Teams Screen
  if (screen === 'teams') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 p-4">
        <div className="max-w-md mx-auto pb-20">
          <div className="text-center mb-6 pt-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Beer className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Teams</h1>
          </div>

          {/* Teams List */}
          <div className="space-y-3 mb-6">
            {teams.map((team, index) => (
              <div
                key={team.id}
                className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-cyan-400">Team {index + 1}</h3>
                  <div className="text-right">
                    <span className="text-amber-400 font-bold">{team.wins}W</span>
                    <span className="text-white/50 mx-1">-</span>
                    <span className="text-red-400 font-bold">{team.losses}L</span>
                    {(team.ties || 0) > 0 && (
                      <>
                        <span className="text-white/50 mx-1">-</span>
                        <span className="text-gray-400 font-bold">{team.ties}T</span>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-white font-medium mb-1">{team.name}</p>
                <p className="text-white/60 text-sm">{team.cupsScored} cups scored</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={regenerateTeams}
              className="py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
            >
              <Shuffle className="w-5 h-5" />
              Reshuffle
            </button>
            <button
              onClick={() => setScreen('results')}
              className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5" />
              Results
            </button>
          </div>

          {/* Match Maker */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-4 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">Create Match</h3>
            <p className="text-white/70 mb-4 text-sm">Select two teams to start a game</p>
            
            <div className="grid grid-cols-2 gap-3">
              {teams.map((team1, i) => 
                teams.slice(i + 1).map(team2 => {
                  const hasPlayed = matchupExists(team1.id, team2.id);
                  return (
                    <button
                      key={`${team1.id}-${team2.id}`}
                      onClick={() => createGame(team1, team2)}
                      className={`p-3 ${
                        hasPlayed 
                          ? 'bg-white/10 text-white/50' 
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white'
                      } rounded-xl font-semibold text-sm transition`}
                    >
                      T{i + 1} vs T{teams.indexOf(team2) + 1}
                      {hasPlayed && <div className="text-xs mt-1">Played ✓</div>}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => setScreen('setup')}
            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition"
          >
            Back to Setup
          </button>
        </div>
      </div>
    );
  }

  // Game Screen
  if (screen === 'games' && currentGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6 pt-6">
            <h1 className="text-3xl font-bold text-white mb-2">Game On! 🍺</h1>
            <p className="text-cyan-300">First to {CUPS_TO_WIN} cups wins!</p>
          </div>

          {/* Team 1 */}
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 mb-4 shadow-xl">
            <h3 className="text-white/80 text-sm font-medium mb-1">TEAM 1</h3>
            <h2 className="text-2xl font-bold text-white mb-4">{currentGame.team1.name}</h2>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => updateScore(currentGame.id, 1, -1)}
                disabled={currentGame.score1 === 0}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-bold text-2xl transition"
              >
                -
              </button>
              <div className="flex-1 text-center">
                <div className="text-6xl font-bold text-white">{currentGame.score1}</div>
                <div className="text-white/70 text-sm">cups</div>
              </div>
              <button
                onClick={() => updateScore(currentGame.id, 1, 1)}
                disabled={currentGame.score1 === CUPS_TO_WIN}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-bold text-2xl transition"
              >
                +
              </button>
            </div>
          </div>

          {/* VS */}
          <div className="text-center text-3xl font-bold text-amber-400 mb-4">VS</div>

          {/* Team 2 */}
          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 mb-6 shadow-xl">
            <h3 className="text-white/80 text-sm font-medium mb-1">TEAM 2</h3>
            <h2 className="text-2xl font-bold text-white mb-4">{currentGame.team2.name}</h2>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => updateScore(currentGame.id, 2, -1)}
                disabled={currentGame.score2 === 0}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-bold text-2xl transition"
              >
                -
              </button>
              <div className="flex-1 text-center">
                <div className="text-6xl font-bold text-white">{currentGame.score2}</div>
                <div className="text-white/70 text-sm">cups</div>
              </div>
              <button
                onClick={() => updateScore(currentGame.id, 2, 1)}
                disabled={currentGame.score2 === CUPS_TO_WIN}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-bold text-2xl transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Complete Game */}
          <button
            onClick={() => completeGame(currentGame.id)}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-bold text-lg transition flex items-center justify-center gap-2 shadow-lg mb-3"
          >
            <Trophy className="w-6 h-6" />
            Complete Game
          </button>

          <button
            onClick={cancelGame}
            className="w-full py-3 bg-red-600/50 hover:bg-red-600 text-white rounded-xl font-semibold transition"
          >
            Cancel Game
          </button>
        </div>
      </div>
    );
  }

  // Results Screen
  if (screen === 'results') {
    const sortedTeams = [...teams].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.cupsScored - a.cupsScored;
    });
    const completedGames = games.filter(g => g.completed);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 p-4 pb-20">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6 pt-6">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2" />
            <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          </div>

          {/* Standings */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">Standings</h3>
            {sortedTeams.length === 0 ? (
              <div className="text-center text-white/70 py-8">
                No teams yet! Generate teams first.
              </div>
            ) : (
              <div className="space-y-3">
                {sortedTeams.map((team, index) => (
                  <div
                  key={team.id}
                  className={`p-4 rounded-xl ${
                    index === 0 
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500' 
                      : 'bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-white">#{index + 1}</span>
                      <span className="text-white font-medium">{team.name}</span>
                    </div>
                    <span className="text-2xl font-bold text-white">{team.wins}W</span>
                  </div>
                  <div className="text-white/80 text-sm">
                    {team.losses} losses{(team.ties || 0) > 0 ? ` • ${team.ties} ties` : ''} • {team.cupsScored} cups scored
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Game History */}
          {completedGames.length > 0 && (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <History className="w-6 h-6" />
                Game History ({completedGames.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {[...completedGames].reverse().map((game) => (
                  <div key={game.id} className="bg-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className={`font-medium ${game.score1 > game.score2 ? 'text-green-400' : 'text-white/70'}`}>
                        {game.team1.name}
                      </span>
                      <span className="text-white font-bold">
                        {game.score1} - {game.score2}
                      </span>
                      <span className={`font-medium ${game.score2 > game.score1 ? 'text-green-400' : 'text-white/70'}`}>
                        {game.team2.name}
                      </span>
                    </div>
                    {game.endTime && (
                      <div className="text-white/50 text-xs flex items-center justify-center gap-1">
                        <Timer className="w-3 h-3" />
                        {formatDuration(game.startTime, game.endTime)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={() => setScreen('teams')}
              className="py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-2xl font-bold transition shadow-lg"
            >
              Back to Teams
            </button>
            <button
              onClick={exportResults}
              className="py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-2xl font-bold transition shadow-lg flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>

          <button
            onClick={() => setScreen('setup')}
            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition"
          >
            Setup
          </button>
        </div>
      </div>
    );
  }

  return null;
}
