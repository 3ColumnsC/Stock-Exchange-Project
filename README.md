# 📊 Stock Exchange Project

![Version](https://img.shields.io/badge/version-2.0-blue)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC_BY--NC_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.19.0-brightgreen)](https://nodejs.org/)
![Status](https://img.shields.io/badge/status-in--development-orange)

A powerful Node.js application that monitors stock and cryptocurrency prices in real-time and sends alerts when significant price changes occur. Stay informed about your favorite assets without constantly checking the markets.

## 🌟 Features

- 📈 **Real-time Monitoring**: Almost 100 stocks and cryptocurrencies
- 🔔 **Instant Alerts**: Get notified via email and/or Discord when prices change significantly
- 🎯 **Customizable Thresholds**: Set your own price change percentage for alerts (default: ±5%)
- 🌍 **Multi-language Support**: 18+ languages available
- 🎨 **Themes**: Automatic dark/light mode based on system preferences
- ⏰ **24/7 Operation**: Monitors markets around the clock
- 🛡 **Duplicate Prevention**: Smart alert caching to avoid notification spam

### 📝 Important Note:

- Email and Discord notifications are only supported in English.

## 📚 Current Version

- **2.0 Major Release**

✨ Complete UI overhaul.
🌍 Multi-language support.
📊 Current asset price display.
🌓 Light/Dark theme support.
🛠️ Bug fixes & stability improvements.

## 📢 Join our Discord Server

You can join to our [Discord server](https://discord.gg/8RE9Fsuty5) to get access to notifications (English only - Not 24/7).

We will also explain how to configure your own Discord bot, how to complete the .env file, and provide an FAQ.

### 📝 Quick FAQ

**Q: Do I need programming knowledge?**  
A: Not for using the app. But if you want to customize it, some knowledge of JavaScript/React will help.

**Q: How to configure my own Discord bot?**  
A: You can find instructions in our [Discord server](https://discord.gg/8RE9Fsuty5).

**Q: Does the app keep running if my computer sleeps?**  
A: No. Please disable sleep mode while running the app.

**Q: How often are alerts checked?**  
A: Every 5 minutes.

## 🚀 Quick Start

### Prerequisites
- Node.js 22.19.0 (LTS) or higher
- npm (comes with Node.js)
- Internet connection
- Discord account and server for Discord notifications

### Installation

1. **Clone the repository or download it**
   ```bash
   git clone https://github.com/3ColumnsC/Stock-Exchange-Project.git
   cd Stock-Exchange-Project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Update the variables in `.env` with your configuration

4. **Start the application**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DISCORD_WEBHOOK_URL` | Your Discord webhook URL for receiving alerts | `https://discord.com/api/webhooks/...` |
| `THRESHOLD` | Price change percentage that triggers an alert (default: 5) | `5` |

### Optional Email Configuration
Email alerts are optional. If you want email notifications, configure these:

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | API key for Resend email service | `re_xxxxxxxxxxxxxxxxxxxxxxxx` |
| `FROM_EMAIL` | Sender email address (must be verified in Resend) | `alerts@yourdomain.com` |
| `ALERT_EMAIL` | Recipient email for alerts | `your-email@example.com` |

### Example `.env` File
```env
# Required
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
THRESHOLD=5

# Optional - Email Configuration
# RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
# FROM_EMAIL=alerts@yourdomain.com
# ALERT_EMAIL=your-email@example.com
```

## 🛠 Customization

### Adding/Removing Assets
Edit the `assets.js` file to customize which stocks and cryptocurrencies to monitor:

```javascript
// assets.js
module.exports = [
  { name: 'Apple Inc.', symbol: 'AAPL', type: 'stock' },
  { name: 'Bitcoin', symbol: 'BTC-USD', type: 'crypto' },
  // Add or remove assets as needed
];
```

### Changing Alert Threshold
Modify the `THRESHOLD` value in your `.env` file to adjust the price change percentage that triggers alerts.

## 📚 Documentation

### Project Structure
```
├── src/                    # Source files
│   ├── hooks/              # Custom React hooks
│   ├── i18n/               # Language files
│   ├── App.jsx             # Main application component
│   └── ...
├── price_history/          # Historical price data
├── diary_logs/             # Application logs
├── index.js                # Main application entry point
├── assets.js               # Asset configuration
└── ...
```

## 📜 License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** license. See the [LICENSE.md](LICENSE.md) file for details.

## ⚠️ Disclaimer

This is a project in continuous development.  
Errors or unexpected behavior may occur.  
We are working to improve the visual interface to reduce the need for direct code modifications.

## 🛠️ Version History

- **Current Version**: 2.0: Complete UI overhaul, multi-language support, current asset price display, light/dark theme support, bug fixes & stability improvements.
- 1.3: Control Panel updated, Email Template updated, assets updated, additional changes. (11/08/2025)
- 1.2: Control Panel updated, log messages improved, assets updated, 24/7 activity enabled, additional changes. (14/06/2025)
- 1.1: Control Panel added, bugs fixed, assets fast control added, log messages improved, additional changes.
- 1.0: Script Control added, additional changes.
- 0.9: Discord WeebHook messages added, bugs fixed, additional changes.
- 0.8: GitHub automated control (old repository).
- 0.7: Preliminary script version ready, GitHub repository added, additional changes.
- N/A: Previous Versions Not Available.
