import React, { useState, useEffect } from 'react';
import { Users, Shuffle, Trophy, Plus, X, RotateCcw, Download, History, Copy, LogOut, Wifi, WifiOff } from 'lucide-react';
import { supabase, generateTournamentCode } from './supabaseClient';

const STARTING_CUPS = 10;

export default function App() {
  // Connection state
  const [screen, setScreen] = useState('join');
  const [tournamentCode, setTournamentCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Tournament state
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [tournamentRound, setTournamentRound] = useState(1);
  const [bracketMode, setBracketMode] = useState(false);

  // Real-time subscription
  useEffect(() => {
    if (!tournamentCode) return;

    const channel = supabase
      .channel(`tournament-${tournamentCode}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tournaments', 
          filter: `tournament_code=eq.${tournamentCode}` 
        },
        (payload) => {
          if (payload.new?.tournament_data) {
            loadTournamentData(payload.new.tournament_data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentCode]);

  const loadTournamentData = (data) => {
    if (data.players) setPlayers(data.players);
    if (data.teams) setTeams(data.teams);
    if (data.games) setGames(data.games);
    if (data.currentGame) setCurrentGame(data.currentGame);
    if (data.tournamentRound) setTournamentRound(data.tournamentRound);
    if (data.bracketMode !== undefined) setBracketMode(data.bracketMode);
    if (data.screen) setScreen(data.screen);
  };

  const saveTournamentData = async () => {
    if (!tournamentCode) return;

    const data = {
      players,
      teams,
      games,
      currentGame,
      tournamentRound,
      bracketMode,
      screen: currentGame ? 'games' : screen
    };

    await supabase
      .from('tournaments')
      .update({ 
        tournament_data: data,
        updated_at: new Date().toISOString()
      })
      .eq('tournament_code', tournamentCode);
  };

  useEffect(() => {
    if (tournamentCode && connected) {
      saveTournamentData();
    }
  }, [players, teams, games, currentGame, tournamentRound, bracketMode, screen]);

  const createTournament = async () => {
    setIsLoading(true);
    const code = generateTournamentCode();
    
    const { error } = await supabase
      .from('tournaments')
      .insert({
        tournament_code: code,
        tournament_data: {
          players: [],
          teams: [],
          games: [],
          currentGame: null,
          tournamentRound: 1,
          bracketMode: false,
          screen: 'setup'
        }
      });

    setIsLoading(false);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    setTournamentCode(code);
    setConnected(true);
    setScreen('setup');
  };

  const joinTournament = async () => {
    if (!joinCode || joinCode.length !== 4) {
      alert('Enter 4-digit code');
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('tournament_code', joinCode)
      .single();

    setIsLoading(false);

    if (error || !data) {
      alert('Tournament not found!');
      return;
    }

    setTournamentCode(joinCode);
    setConnected(true);
    loadTournamentData(data.tournament_data);
  };

  const leaveTournament = () => {
    if (!confirm('Leave tournament?')) return;
    setTournamentCode('');
    setConnected(false);
    setScreen('join');
    setPlayers([]);
    setTeams([]);
    setGames([]);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(tournamentCode);
    alert('Copied: ' + tournamentCode);
  };

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      if (players.some(p => p.name.toLowerCase() === newPlayerName.trim().toLowerCase())) {
        alert('Player exists!');
        return;
      }
      setPlayers([...players, { id: Date.now(), name: newPlayerName.trim() }]);
      setNewPlayerName('');
    }
  };

  const removePlayer = (id) => {
    if (teams.length > 0 && !confirm('Reset all?')) return;
    setPlayers(players.filter(p => p.id !== id));
    if (teams.length > 0) {
      setTeams([]);
      setGames([]);
    }
  };

  const generateTeams = () => {
    if (players.length < 2) {
      alert('Need 2+ players!');
      return;
    }
    if (players.length % 2 !== 0 && !confirm(`${players.length} players (odd). Continue?`)) {
      return;
    }

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const newTeams = [];
    
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      newTeams.push({
        id: `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
        player1: shuffled[i],
        player2: shuffled[i + 1],
        name: `${shuffled[i].name} & ${shuffled[i + 1].name}`,
        roundWins: 0,
        roundLosses: 0,
        tournamentWins: 0,
        cupsScored: 0
      });
    }
    
    setTeams(newTeams);
    setGames([]);
    setBracketMode(false);
    setScreen('teams');
  };

  const matchupExists = (t1, t2) => {
    return games.some(g => 
      g.completed &&
      ((g.team1.id === t1 && g.team2.id === t2) ||
       (g.team1.id === t2 && g.team2.id === t1))
    );
  };

  const createGame = (team1, team2) => {
    if (currentGame) {
      alert('Finish current game!');
      return;
    }

    const existing = games.find(g => 
      !g.completed &&
      ((g.team1.id === team1.id && g.team2.id === team2.id) ||
       (g.team1.id === team2.id && g.team2.id === team1.id))
    );

    if (existing) {
      setCurrentGame(existing);
      setScreen('games');
      return;
    }

    const newGame = {
      id: Date.now(),
      team1: {...team1},
      team2: {...team2},
      cupsRemaining1: STARTING_CUPS,
      cupsRemaining2: STARTING_CUPS,
      completed: false,
      startTime: Date.now(),
      round: tournamentRound,
      isBracket: bracketMode
    };
    
    setGames([...games, newGame]);
    setCurrentGame(newGame);
    setScreen('games');
  };

  const updateCups = (gameId, team, delta) => {
    const updatedGames = games.map(g => {
      if (g.id === gameId) {
        if (team === 1) {
          return { ...g, cupsRemaining1: Math.max(0, Math.min(STARTING_CUPS, g.cupsRemaining1 + delta)) };
        } else {
          return { ...g, cupsRemaining2: Math.max(0, Math.min(STARTING_CUPS, g.cupsRemaining2 + delta)) };
        }
      }
      return g;
    });
    
    setGames(updatedGames);
    const updated = updatedGames.find(g => g.id === gameId);
    setCurrentGame(updated);
    
    if (updated.cupsRemaining1 === 0 || updated.cupsRemaining2 === 0) {
      setTimeout(() => {
        const winner = updated.cupsRemaining1 === 0 ? updated.team1.name : updated.team2.name;
        if (confirm(`${winner} wins! Complete?`)) {
          completeGame(gameId);
        }
      }, 500);
    }
  };

  const completeGame = (gameId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const completed = { ...game, completed: true, endTime: Date.now() };
    setGames(games.map(g => g.id === gameId ? completed : g));
    
    setTeams(prevTeams => prevTeams.map(t => {
      if (t.id === game.team1.id) {
        const won = game.cupsRemaining1 < game.cupsRemaining2;
        return {
          ...t,
          roundWins: won ? t.roundWins + 1 : t.roundWins,
          roundLosses: !won && game.cupsRemaining1 !== game.cupsRemaining2 ? t.roundLosses + 1 : t.roundLosses,
          tournamentWins: won ? t.tournamentWins + 1 : t.tournamentWins,
          cupsScored: t.cupsScored + (STARTING_CUPS - game.cupsRemaining1)
        };
      }
      if (t.id === game.team2.id) {
        const won = game.cupsRemaining2 < game.cupsRemaining1;
        return {
          ...t,
          roundWins: won ? t.roundWins + 1 : t.roundWins,
          roundLosses: !won && game.cupsRemaining1 !== game.cupsRemaining2 ? t.roundLosses + 1 : t.roundLosses,
          tournamentWins: won ? t.tournamentWins + 1 : t.tournamentWins,
          cupsScored: t.cupsScored + (STARTING_CUPS - game.cupsRemaining2)
        };
      }
      return t;
    }));
    
    setCurrentGame(null);
    setScreen('results');
  };

  const cancelGame = () => {
    if (!confirm('Cancel game?')) return;
    setGames(games.filter(g => g.id !== currentGame.id));
    setCurrentGame(null);
    setScreen('teams');
  };

  const startNewRound = () => {
    if (!confirm('Start new round? Tournament wins kept.')) return;
    
    setTeams(teams.map(t => ({
      ...t,
      roundWins: 0,
      roundLosses: 0,
      cupsScored: 0
    })));
    
    setGames([]);
    setTournamentRound(tournamentRound + 1);
    setBracketMode(false);
    setScreen('teams');
  };

  const startBracket = () => {
    const sorted = [...teams].sort((a, b) => {
      if (b.roundWins !== a.roundWins) return b.roundWins - a.roundWins;
      return b.cupsScored - a.cupsScored;
    });

    if (sorted.length < 4) {
      alert('Need 4+ teams!');
      return;
    }

    setBracketMode(true);
    setScreen('bracket');
  };

  const exportResults = () => {
    const data = {
      tournament: "L'EST GO Beer Pong",
      code: tournamentCode,
      date: new Date().toISOString(),
      round: tournamentRound,
      teams: teams.map(t => ({
        name: t.name,
        tournamentWins: t.tournamentWins,
        roundWins: t.roundWins,
        roundLosses: t.roundLosses,
        cupsScored: t.cupsScored
      })),
      games: games.filter(g => g.completed)
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lest-go-${tournamentCode}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const formatDuration = (start, end) => {
    return `${Math.floor((end - start) / 60000)} min`;
  };

  // Tournament Header Component
  const TournamentHeader = () => (
    <div className="bg-white/90 backdrop-blur rounded-xl p-3 mb-4 shadow-lg flex items-center justify-between">
      <div className="flex items-center gap-3">
        {connected ? <Wifi className="w-5 h-5 text-green-500" /> : <WifiOff className="w-5 h-5 text-red-500" />}
        <div>
          <div className="text-xs text-slate-600">Code</div>
          <div className="text-2xl font-black text-slate-800 tracking-wider">{tournamentCode}</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={copyCode} className="p-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition">
          <Copy className="w-5 h-5" />
        </button>
        <button onClick={leaveTournament} className="p-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  // Join/Create Screen
  if (screen === 'join' || !tournamentCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-300 to-cyan-400 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-3xl p-8 mb-4 shadow-2xl">
              <h1 className="text-6xl font-black text-pink-400 mb-2">L'EST</h1>
              <h1 className="text-6xl font-black text-pink-400 mb-4">GO</h1>
              <div className="text-white text-xl font-bold space-y-1">
                <div>Sutton</div>
                <div>Orford</div>
                <div>Bromont</div>
                <div>Owl's Head</div>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-800">🍺 Beer Pong 🍺</h2>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl p-6 mb-4 shadow-xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Create Tournament</h3>
            <button
              onClick={createTournament}
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-black text-lg transition shadow-lg"
            >
              {isLoading ? 'Creating...' : 'Create New Tournament'}
            </button>
            <p className="text-sm text-slate-600 mt-2 text-center">Get a 4-digit code to share</p>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Join Tournament</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="CODE"
                maxLength={4}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-pink-500 focus:outline-none text-center text-2xl font-bold tracking-widest uppercase"
              />
              <button
                onClick={joinTournament}
                disabled={isLoading}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 text-white rounded-xl font-bold transition"
              >
                {isLoading ? '...' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Setup Screen  
  if (screen === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-300 to-cyan-400 p-4">
        <div className="max-w-md mx-auto">
          <div className="pt-6"><TournamentHeader /></div>
          
          <div className="text-center mb-6">
            <h1 className="text-4xl font-black text-slate-800 mb-2">L'EST GO</h1>
            <h2 className="text-2xl font-bold text-pink-600">🍺 Beer Pong 🍺</h2>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl p-6 mb-6 shadow-xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Players ({players.length})
            </h3>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                placeholder="Name..."
                className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-pink-500 focus:outline-none"
              />
              <button onClick={addPlayer} className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition">
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {players.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between bg-slate-100 rounded-xl p-3">
                  <span className="text-slate-800 font-medium">{i + 1}. {p.name}</span>
                  <button onClick={() => removePlayer(p.id)} className="text-red-500 hover:text-red-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            {players.length === 0 && <p className="text-slate-500 text-center py-4">No players</p>}
          </div>

          <button
            onClick={generateTeams}
            disabled={players.length < 2}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-2xl font-black text-lg transition shadow-lg mb-3"
          >
            <Shuffle className="w-6 h-6 inline mr-2" />
            Generate Teams
          </button>
          
          {players.length < 2 && <p className="text-slate-700 text-center font-semibold">Add 2+ players</p>}
          {teams.length > 0 && (
            <button onClick={() => setScreen('teams')} className="w-full py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold transition">
              Continue Tournament
            </button>
          )}
        </div>
      </div>
    );
  }

  // Teams Screen
  if (screen === 'teams') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-300 to-cyan-400 p-4 pb-20">
        <div className="max-w-md mx-auto">
          <div className="pt-6"><TournamentHeader /></div>
          
          <div className="text-center mb-6">
            <h1 className="text-4xl font-black text-slate-800 mb-1">L'EST GO</h1>
            <h2 className="text-2xl font-bold text-pink-600">Round {tournamentRound}</h2>
          </div>

          <div className="space-y-3 mb-6">
            {teams.map((t, i) => (
              <div key={t.id} className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-800">Team {i + 1}</h3>
                  <div className="text-right">
                    <span className="text-pink-600 font-bold text-lg">{t.tournamentWins} 🏆</span>
                    <div className="text-sm text-slate-600">{t.roundWins}W-{t.roundLosses}L</div>
                  </div>
                </div>
                <p className="text-slate-800 font-medium mb-1">{t.name}</p>
                <p className="text-slate-600 text-sm">{t.cupsScored} cups</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => setScreen('results')} className="py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition">
              <Trophy className="w-5 h-5 inline mr-1" />Results
            </button>
            <button onClick={startBracket} className="py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold transition">
              Bracket
            </button>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl p-6 mb-4 shadow-lg">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Create Match</h3>
            <div className="grid grid-cols-2 gap-3">
              {teams.map((t1, i) => 
                teams.slice(i + 1).map(t2 => {
                  const played = matchupExists(t1.id, t2.id);
                  return (
                    <button
                      key={`${t1.id}-${t2.id}`}
                      onClick={() => createGame(t1, t2)}
                      className={`p-3 ${played ? 'bg-slate-200 text-slate-500' : 'bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white'} rounded-xl font-bold text-sm transition`}
                    >
                      T{i + 1} vs T{teams.indexOf(t2) + 1}
                      {played && <div className="text-xs mt-1">✓</div>}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <button onClick={() => setScreen('setup')} className="w-full py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold transition">
            Back to Setup
          </button>
        </div>
      </div>
    );
  }

  // Game Screen
  if (screen === 'games' && currentGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-300 to-cyan-400 p-4">
        <div className="max-w-md mx-auto">
          <div className="pt-6"><TournamentHeader /></div>
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-slate-800 mb-2">🍺 Game On! 🍺</h1>
            <p className="text-slate-700 font-bold">First to 0 cups wins!</p>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-6 mb-4 shadow-xl">
            <h3 className="text-white/80 text-sm font-medium mb-1">TEAM 1</h3>
            <h2 className="text-2xl font-bold text-white mb-4">{currentGame.team1.name}</h2>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => updateCups(currentGame.id, 1, 1)}
                disabled={currentGame.cupsRemaining1 === STARTING_CUPS}
                className="w-14 h-14 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-bold text-3xl transition"
              >
                +
              </button>
              <div className="flex-1 text-center">
                <div className="text-7xl font-black text-white">{currentGame.cupsRemaining1}</div>
                <div className="text-white/80 text-sm font-bold">cups left</div>
              </div>
              <button
                onClick={() => updateCups(currentGame.id, 1, -1)}
                disabled={currentGame.cupsRemaining1 === 0}
                className="w-14 h-14 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-bold text-3xl transition"
              >
                -
              </button>
            </div>
          </div>

          <div className="text-center text-4xl font-black text-slate-800 mb-4">VS</div>

          <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl p-6 mb-6 shadow-xl">
            <h3 className="text-white/80 text-sm font-medium mb-1">TEAM 2</h3>
            <h2 className="text-2xl font-bold text-white mb-4">{currentGame.team2.name}</h2>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => updateCups(currentGame.id, 2, 1)}
                disabled={currentGame.cupsRemaining2 === STARTING_CUPS}
                className="w-14 h-14 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-bold text-3xl transition"
              >
                +
              </button>
              <div className="flex-1 text-center">
                <div className="text-7xl font-black text-white">{currentGame.cupsRemaining2}</div>
                <div className="text-white/80 text-sm font-bold">cups left</div>
              </div>
              <button
                onClick={() => updateCups(currentGame.id, 2, -1)}
                disabled={currentGame.cupsRemaining2 === 0}
                className="w-14 h-14 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-bold text-3xl transition"
              >
                -
              </button>
            </div>
          </div>

          <button
            onClick={() => completeGame(currentGame.id)}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-black text-lg transition shadow-lg mb-3"
          >
            <Trophy className="w-6 h-6 inline mr-2" />Complete Game
          </button>

          <button onClick={cancelGame} className="w-full py-3 bg-red-500/80 hover:bg-red-600 text-white rounded-xl font-bold transition">
            Cancel Game
          </button>
        </div>
      </div>
    );
  }

  // Bracket Screen
  if (screen === 'bracket') {
    const sorted = [...teams].sort((a, b) => {
      if (b.roundWins !== a.roundWins) return b.roundWins - a.roundWins;
      return b.cupsScored - a.cupsScored;
    }).slice(0, 4);

    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-300 to-cyan-400 p-4 pb-20">
        <div className="max-w-md mx-auto">
          <div className="pt-6"><TournamentHeader /></div>
          
          <div className="text-center mb-6">
            <h1 className="text-4xl font-black text-slate-800 mb-2">🏆 BRACKET 🏆</h1>
            <p className="text-slate-700 font-bold">Top 4 Teams</p>
          </div>

          <div className="bg-white/90 rounded-2xl p-6 mb-4 shadow-lg">
            <h3 className="text-center font-bold text-slate-600 mb-4">SEMIFINAL #1</h3>
            <button
              onClick={() => createGame(sorted[0], sorted[3])}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-xl font-bold transition"
            >
              {sorted[0]?.name || 'TBD'} vs {sorted[3]?.name || 'TBD'}
            </button>
          </div>

          <div className="bg-white/90 rounded-2xl p-6 mb-4 shadow-lg">
            <h3 className="text-center font-bold text-slate-600 mb-4">SEMIFINAL #2</h3>
            <button
              onClick={() => createGame(sorted[1], sorted[2])}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-xl font-bold transition"
            >
              {sorted[1]?.name || 'TBD'} vs {sorted[2]?.name || 'TBD'}
            </button>
          </div>

          <div className="text-center text-2xl font-black text-slate-800 my-6">↓ FINAL ↓</div>

          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-6 shadow-xl text-center mb-6">
            <Trophy className="w-16 h-16 text-yellow-800 mx-auto mb-2" />
            <p className="text-yellow-900 font-bold">Winners advance!</p>
          </div>

          <button onClick={() => setScreen('teams')} className="w-full py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold transition">
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  // Results Screen
  if (screen === 'results') {
    const sortedTournament = [...teams].sort((a, b) => {
      if (b.tournamentWins !== a.tournamentWins) return b.tournamentWins - a.tournamentWins;
      return b.cupsScored - a.cupsScored;
    });
    
    const sortedRound = [...teams].sort((a, b) => {
      if (b.roundWins !== a.roundWins) return b.roundWins - a.roundWins;
      return b.cupsScored - a.cupsScored;
    });

    const completed = games.filter(g => g.completed);

    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-300 to-cyan-400 p-4 pb-20">
        <div className="max-w-md mx-auto">
          <div className="pt-6"><TournamentHeader /></div>
          
          <div className="text-center mb-6">
            <Trophy className="w-12 h-12 text-yellow-600 mx-auto mb-2" />
            <h1 className="text-3xl font-black text-slate-800">Leaderboard</h1>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl p-6 mb-6 shadow-lg">
            <h3 className="text-xl font-bold text-slate-800 mb-4">🏆 Tournament Overall</h3>
            <div className="space-y-3">
              {sortedTournament.map((t, i) => (
                <div key={t.id} className={`p-4 rounded-xl ${i === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 'bg-slate-100'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black">{i === 0 ? '👑' : `#${i + 1}`}</span>
                      <span className="font-bold text-slate-800">{t.name}</span>
                    </div>
                    <span className="text-2xl font-black text-slate-800">{t.tournamentWins} 🏆</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl p-6 mb-6 shadow-lg">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Round {tournamentRound}</h3>
            <div className="space-y-3">
              {sortedRound.map((t, i) => (
                <div key={t.id} className="p-3 rounded-xl bg-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800">#{i + 1} {t.name}</span>
                    <span className="font-bold text-pink-600">{t.roundWins}W</span>
                  </div>
                  <div className="text-sm text-slate-600">{t.roundLosses}L • {t.cupsScored} cups</div>
                </div>
              ))}
            </div>
          </div>

          {completed.length > 0 && (
            <div className="bg-white/90 backdrop-blur rounded-2xl p-6 mb-6 shadow-lg">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <History className="w-6 h-6" />Game History ({completed.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {[...completed].reverse().map(g => (
                  <div key={g.id} className="bg-slate-100 rounded-xl p-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className={`font-medium ${g.cupsRemaining1 < g.cupsRemaining2 ? 'text-green-600 font-bold' : 'text-slate-600'}`}>
                        {g.team1.name}
                      </span>
                      <span className="font-bold text-slate-800">
                        {STARTING_CUPS - g.cupsRemaining1} - {STARTING_CUPS - g.cupsRemaining2}
                      </span>
                      <span className={`font-medium ${g.cupsRemaining2 < g.cupsRemaining1 ? 'text-green-600 font-bold' : 'text-slate-600'}`}>
                        {g.team2.name}
                      </span>
                    </div>
                    {g.endTime && (
                      <div className="text-slate-500 text-xs text-center">
                        {formatDuration(g.startTime, g.endTime)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={() => setScreen('teams')} className="py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-bold transition">
              Back
            </button>
            <button onClick={exportResults} className="py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold transition">
              <Download className="w-5 h-5 inline mr-1" />Export
            </button>
          </div>

          <button onClick={startNewRound} className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl font-black transition shadow-lg">
            <RotateCcw className="w-5 h-5 inline mr-2" />Start Round {tournamentRound + 1}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
