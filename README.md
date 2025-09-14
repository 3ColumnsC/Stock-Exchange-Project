## 📊 Stock Exchange Project

This project is a Node.js-based alert system that monitors price changes and news for a custom list of stocks and cryptocurrencies.

Current Version: 2.0:

## 🛠️ Old Versions

 - 1.3: Control Panel updated, Email Template updated, assets updated, additional changes. (11/08/2025)
 - 1.2: Control Panel updated, log messages improved, assets updated, 24/7 activity enabled, additional changes. (14/06/2025)
 - 1.1: Control Panel added, bugs fixed, assets fast control added, log messages improved, additional changes.
 - 1.0: Script Control added, additional changes.
 - 0.9: Discord WeebHook messages added, bugs fixed, additional changes.
 - 0.8: GitHub automated control (old repository).
 - 0.7: Preliminary script version ready, GitHub repository added, additional changes.
 - N/A: Previous Versions Not Available.

## 📢 Join Our Discord

Get free stock and cryptocurrency alerts and connect with the community!

Join here: https://discord.gg/8RE9Fsuty5

## 🚀 Features

- 📈 Real-time price monitoring for 100+ assets (you can modify the assets list freely in assets.js)
- 🔔 Sends email and Discord alerts when a price changes more than ±5%
- 🗂️ Caches alerts to avoid duplicates
- 📆 Scheduled to run every 5 minutes
- 🧾 Generates daily logs and cleans up old data
- 🌐 Multi-language support (18+ languages)
- 🎨 Dark/Light theme with system preference

## 🖥️ Requirements
- Node.js 22.19.0(LTS) or higher
- Internet connection.
- Discord account and server.

## ⚙️ How to Use

1. Clone the repository
2. Open the folder with cmd
3. Run `npm install`
4. Modify the .env.example file in the project, complete it and save it as .env
5. Start the system with `npm start`

## 📝 .env required information

# Example of a .env file:

RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
FROM_EMAIL=domain-email@example.com
ALERT_EMAIL=your-personal-email@example.com
THRESHOLD=5
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

## ⚖️ License

Copyright © 2025 3ColumnsCreations. CC BY-NC 4.0 License.
