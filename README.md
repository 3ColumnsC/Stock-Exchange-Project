## Stock Exchange Project

This project is a Node.js-based alert system that monitors price changes and news for a custom list of stocks and cryptocurrencies.

Current Version: 1.3: Control Panel updated, Email Template updated, assets updated, additional changes. (11/08/2025)

## 🛠️ Old Versions

 - 1.2: Control Panel updated, log messages improved, assets updated, 24/7 activity enabled, additional changes. (14/06/2025)
 - 1.1: Control Panel added, bugs fixed, assets fast control added, log messages improved, additional changes.
 - 1.0: Script Control added, additional changes.
 - 0.9: Discord WeebHook messages added, bugs fixed, additional changes.
 - 0.8: GitHub automated control (old repository).
 - 0.7: Preliminary script version ready, GitHub repository added, additional changes.
 - N/A: Previous Versions Not Available.

## 🚀 Features

- 📈 Tracks daily price movements for selected assets
- 🔔 Sends email and Discord alerts when a price changes more than ±5%
- 🗂️ Caches alerts to avoid duplicates
- 📆 Scheduled to run every 5–10 minutes
- 🧾 Generates daily logs and cleans up old data

## ⚙️ How to Use

1. Clone the repository
2. Run `npm install`
3. Create a .env file in the project root (see .env.example)
4. Start the system with `npm start`

## 📝 .env required information

- RESEND_API_KEY=your_resend_api_key
- FROM_EMAIL=your_verified_email@domain.com
- ALERT_EMAIL=recipient_email@domain.com
- THRESHOLD=5
- DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_id
