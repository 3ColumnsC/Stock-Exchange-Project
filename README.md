# 📊 Stock & Crypto Price Alert System

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC_BY--NC_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.19.0-brightgreen)](https://nodejs.org/)
[![Discord](https://img.shields.io/discord/your-discord-server-id?color=7289DA&logo=discord&logoColor=white)](https://discord.gg/8RE9Fsuty5)

A powerful Node.js application that monitors stock and cryptocurrency prices in real-time and sends alerts when significant price changes occur. Stay informed about your favorite assets without constantly checking the markets.

## 🌟 Features

- 📈 **Real-time Monitoring**: Track 100+ stocks and cryptocurrencies
- 🔔 **Instant Alerts**: Get notified via email and/or Discord when prices change significantly
- 🎯 **Customizable Thresholds**: Set your own price change percentage for alerts (default: ±5%)
- 🌍 **Multi-language Support**: 18+ languages available
- 🎨 **Themes**: Automatic dark/light mode based on system preferences
- 📊 **Comprehensive Logging**: Daily logs with detailed price history
- ⏰ **24/7 Operation**: Monitors markets around the clock
- 🛡 **Duplicate Prevention**: Smart alert caching to avoid notification spam

## 🚀 Quick Start

### Prerequisites
- Node.js 22.19.0 (LTS) or higher
- npm (comes with Node.js)
- Internet connection
- (Optional) Discord account for Discord notifications

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/stock-exchange-alert-system.git
   cd stock-exchange-alert-system
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
│   ├── i18n/               # Internationalization files
│   ├── App.jsx             # Main application component
│   └── ...
├── price_history/          # Historical price data
├── diary_logs/             # Application logs
├── index.js                # Main application entry point
├── assets.js               # Asset configuration
└── ...
```

### Available Scripts
- `npm start` - Start the application
- `npm test` - Run tests (coming soon)
- `npm run build` - Build the application for production

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on how to contribute to this project.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** license. See the [LICENSE.md](LICENSE.md) file for details.

## 📞 Support & Community

- Join our [Discord Community](https://discord.gg/8RE9Fsuty5) for support and discussions
- Report bugs and request features in the [Issues](https://github.com/yourusername/stock-exchange-alert-system/issues) section

## 📱 Version History

- **2.0 (Current)** - Major UI overhaul, performance improvements
- 1.3 - Control Panel updates, Email Template updates, asset updates (11/08/2025)
- 1.2 - 24/7 monitoring enabled, log improvements (14/06/2025)
- 1.1 - Added Control Panel, bug fixes
- 1.0 - Initial public release
