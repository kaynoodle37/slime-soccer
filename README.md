# Slime Soccer ⚽

A fast-paced, retro-styled 2D physics-based soccer game featuring bouncy slime characters competing to score goals!

![Slime Soccer](https://img.shields.io/badge/version-1.0-blue.svg)
![HTML5](https://img.shields.io/badge/HTML5-Canvas-orange.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎮 Play Now

Simply open `index.html` in any modern web browser to start playing!

## ✨ Features

- **Intuitive Physics**: Bouncy, responsive slime characters with realistic ball physics
- **Two Game Modes**:
  - Single Player vs AI
  - Local Multiplayer (2 players on same keyboard)
- **Smart AI Opponent**: Challenging but fair AI with intentional imperfections
- **Customizable Matches**: Choose match duration from 1 to 8 minutes
- **Anti-Camping System**: Penalties for players who stay in their goal too long
- **Retro Arcade Aesthetic**: Clean animations and classic gaming feel
- **Grab & Aim Mechanic**: Grab the ball and rotate your aim for strategic shots

## 🕹️ Controls

### Player 1 (Red Slime - Right Side)
- **← →** - Move Left/Right
- **↑** - Jump
- **↓** - Grab/Release Ball
- **← → (while grabbing)** - Rotate Aim

### Player 2 (Cyan Slime - Left Side)
- **A D** - Move Left/Right
- **W** - Jump
- **S** - Grab/Release Ball
- **A D (while grabbing)** - Rotate Aim

### General
- **ESC** - Pause/Resume Game

## 🎯 How to Play

1. **Objective**: Score more goals than your opponent before time runs out!

2. **Movement**: Use your character's controls to move around the field and jump

3. **Ball Control**:
   - Press the grab key when near the ball to grab it
   - While holding the ball, use left/right movement keys to aim
   - Release the grab key to shoot the ball

4. **Scoring**:
   - Player 1 (right side) scores by getting the ball into the left goal
   - Player 2 (left side) scores by getting the ball into the right goal

5. **Anti-Camping**: Don't stay in your own goal for too long or you'll receive a speed penalty!

## 🚀 Installation & Setup

### Quick Start (No Installation Required)

1. Download or clone this repository
2. Open `index.html` in your web browser
3. Start playing!

### Clone Repository

```bash
git clone https://github.com/yourusername/slime-soccer.git
cd slime-soccer
```

Then simply open `index.html` in your browser.

## 📁 Project Structure

```
slime-soccer/
├── index.html          # Main HTML file with game UI and menus
├── game.js            # Core game logic, physics engine, and AI
└── README.md          # This file
```

## 🎨 Game Specifications

- **Canvas Size**: 1200x700 pixels
- **Physics Engine**: Custom 2D physics with configurable constants
- **Frame Rate**: 60 FPS
- **Collision Detection**: Circle-circle and circle-rectangle algorithms
- **AI Difficulty**: Balanced for fairness with intentional delays and mistakes

## 🛠️ Technical Details

### Technologies Used
- HTML5 Canvas
- Vanilla JavaScript (ES6+)
- CSS3 for UI styling

### Key Components

- **Physics System**: Custom gravity, friction, and collision detection
- **Slime Class**: Character movement, jumping, and ball interaction
- **Ball Class**: Ball physics with rotation and grab mechanics
- **AI Controller**: Strategic decision-making with trajectory prediction
- **Game State Management**: Menu system, pause functionality, and match flow

### Physics Constants (Configurable)

```javascript
PHYSICS = {
    GRAVITY: 0.8,
    FRICTION: 0.92,
    AIR_RESISTANCE: 0.998,
    BALL_RESTITUTION: 0.75,
    SLIME_RESTITUTION: 0.6,
    MAX_VELOCITY: 15,
    SLIME_MOVE_SPEED: 0.8,
    SLIME_JUMP_POWER: 15
}
```

## 🎮 Game Modes

### Single Player
Play against an AI opponent that adapts to the game state:
- Defensive when ahead
- Aggressive when behind
- Predictive ball tracking
- Intentional mistakes for fairness

### Local Multiplayer
Compete against a friend on the same keyboard with separate control schemes perfectly aligned with keyboard layout.

## 🐛 Known Issues

None at this time! If you find any bugs, please open an issue.

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Future Enhancements

Potential features for future versions:
- Sound effects and background music
- Online multiplayer
- Multiple AI difficulty levels
- Character customization
- Power-ups and special abilities
- Tournament mode
- Leaderboards
- Mobile touch controls
- Additional game modes

## 📄 License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2024 Slime Soccer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

- Inspired by classic arcade sports games
- Built with HTML5 Canvas and vanilla JavaScript
- No external libraries or frameworks required

## 📧 Contact

For questions, suggestions, or feedback, please open an issue on GitHub.

---

**Enjoy the game! May the best slime win! 🎉**
