# 🍺⛷️ Ski Trip Beer Pong Tournament Tracker

A mobile-first Progressive Web App for tracking beer pong tournaments during your ski trip. Built with React, featuring localStorage persistence, real-time score tracking, and comprehensive tournament statistics.

## 🎯 Features

### Core Functionality
- ✅ **Player Management**: Add/remove players with duplicate detection
- ✅ **Random Team Generation**: Automatically create balanced 2v2 teams
- ✅ **Match Creation**: Select any two teams to start a game
- ✅ **Live Score Tracking**: Track cups made with +/- buttons (max 10 cups)
- ✅ **Auto Win Detection**: Automatically prompts completion when a team hits 10 cups
- ✅ **Tournament Stats**: Win/loss records, cups scored, game duration
- ✅ **Leaderboard**: Sorted by wins, then cups scored
- ✅ **Game History**: View all completed games with scores and duration
- ✅ **Data Persistence**: All data saved to localStorage (survives page refresh)
- ✅ **Export Results**: Download tournament results as JSON

### UX Enhancements
- ✅ No duplicate players allowed
- ✅ Confirmation dialogs for destructive actions
- ✅ Visual indicators for played matchups
- ✅ Prevents multiple simultaneous games
- ✅ Resume interrupted games
- ✅ Team reshuffle with warning
- ✅ Mobile-optimized responsive design
- ✅ Ski trip themed UI (mountains, beer, cyan/amber colors)

### Bug Fixes from Original Version
- ✅ **Fixed**: Win counter state management (no longer uses stale state)
- ✅ **Fixed**: Proper win/loss tracking with functional updates
- ✅ **Fixed**: Score limits (0-10 cups enforced)
- ✅ **Fixed**: Duplicate player prevention
- ✅ **Fixed**: Odd player handling with user confirmation
- ✅ **Fixed**: Duplicate game prevention
- ✅ **Fixed**: Data persistence across page refreshes

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd beer-pong-app

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Building for Production

```bash
# Create optimized production build
npm run build

# Preview production build
npm run preview
```

## 📱 How to Use

### 1. Setup Phase
1. Add all players participating in the tournament
2. Click "Generate Random Teams" to create 2v2 teams
3. Review the teams generated

### 2. Playing Games
1. From the Teams screen, select a matchup (e.g., "T1 vs T2")
2. Use +/- buttons to track cups made by each team
3. Game auto-suggests completion when a team reaches 10 cups
4. Click "Complete Game" to finish and record results

### 3. Viewing Results
- Click "Results" to see the leaderboard
- Teams ranked by wins, then cups scored
- View complete game history with durations
- Export results as JSON for record-keeping

## 🎨 Tech Stack

- **React 18**: Component-based UI
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first styling (via CDN in production)
- **Lucide React**: Icon library
- **LocalStorage API**: Data persistence

## 📂 Project Structure

```
beer-pong-app/
├── public/
│   └── manifest.json          # PWA manifest
├── src/
│   ├── App.jsx                # Main application component
│   ├── main.jsx               # React entry point
│   └── index.css              # Global styles
├── index.html                 # HTML entry point
├── package.json               # Dependencies and scripts
├── vite.config.js             # Vite configuration
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

## 🔧 Configuration

### Constants (in App.jsx)
- `CUPS_TO_WIN`: Number of cups needed to win (default: 10)
- `STORAGE_KEY`: LocalStorage key for data persistence

### PWA Configuration
Edit `public/manifest.json` to customize:
- App name and description
- Theme colors
- Icons (add your own icon files)

## 🐛 Known Limitations

- No user authentication (single device use)
- No remote sync (localStorage only)
- Icons placeholder (add custom 192x192 and 512x512 PNG icons)
- No undo/redo for individual score changes
- No bracket-style tournament structure (round-robin only)

## 🚧 Future Enhancements

- [ ] Individual player statistics
- [ ] Tournament bracket visualization
- [ ] Multiple tournament support
- [ ] Cloud sync with backend
- [ ] Push notifications for game reminders
- [ ] Photo uploads for teams
- [ ] Custom game rules (house rules, redemption, etc.)
- [ ] Share results via social media

## 📄 License

MIT License - Feel free to use and modify for your ski trips!

## 🤝 Contributing

Pull requests welcome! Please ensure:
1. Code follows existing style
2. All features tested on mobile
3. No new dependencies without discussion

## 🍻 Credits

Built for epic ski trip beer pong tournaments. Let's go! 🎿

---

**Note**: Drink responsibly. This app is for entertainment purposes. Always follow local laws and regulations.
