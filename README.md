# 📊 Stock Exchange Project

![Version](https://img.shields.io/badge/version-2.2-blue)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC_BY--NC_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.19.0-brightgreen)](https://nodejs.org/)
![Status](https://img.shields.io/badge/status-maintenance-orange)

A powerful Node.js application that monitors stock and cryptocurrency prices in real-time and sends alerts when significant price changes occur. Stay informed about your favorite assets without constantly checking the markets.

## 🔒 Project Status

**This project is in maintenance mode.**

No new features or content updates are planned.  
Only the following will be maintained:

- Security fixes
- Dependency / Node.js updates
- Asset list updates (if required)

## 🌟 Features

- 📈 **Real-time Monitoring**: Almost 100 stocks and cryptocurrencies
- 🔔 **Instant Alerts**: Get notified via email and/or Discord when prices change significantly
- 🎯 **Customizable Thresholds**: Set your own price change percentage for alerts (default: ±5%)
- 🌍 **Multi-language Support**: 18+ languages available
- 🎨 **Themes**: Automatic dark/light mode based on system preferences
- ⏰ **24/7 Operation**: Monitors markets around the clock
- 🛡 **Duplicate Prevention**: Smart alert caching to avoid notification spam

### 📝 Important Note:

- Email and Discord notifications are only supported in English by default.

## 🖥️ Supported Platforms

- Windows 10/11

## 📚 Current Version

### **2.2 – Stable (Maintenance Release)**

- ⚙️ Minor fixes
- 📊 No functional changes planned

### ❓ Frequently Asked Questions (FAQ)

**Q: Do I need to pay to use this app?**  
A: No. The app is completely free to use. No subscriptions or hidden costs.

**Q: Do I need programming knowledge?**  
A: Not for using the app. But if you want to customize it, some knowledge of JavaScript/React will help.

**Q: Does the app keep running if my computer sleeps?**  
A: No. Please disable sleep mode while running the app.

**Q: How often are alerts checked?**  
A: Every 5 minutes by default, but you can change it in the (⚙️) configuration.

**Q: Can I add or remove assets?**  
A: Yes, you can add or remove assets opening the "Add Symbol" configuration.

**Q: Why does the app restart after saving Settings?**  
A: This is expected behavior. The app briefly restarts to apply configuration changes and update the `.env` file.

**Q: Is this project still under active development?**  
A: No.  
This project is in **maintenance mode**. No new features are planned.  
Only security fixes, dependency updates, and minor adjustments may be applied.

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

3. **Start the application**
   ```bash
   npm start
   ```

4. **Wait till the app loads**

   - Do not open the http://localhost:3000

## 🛠️ How to Configure the App

### 1️⃣ Configure via Settings (Recommended)

The easiest and safest way to configure the app is **directly inside the application**.

1. Open the app
2. Click the **⚙️ Settings** button (top right)
3. Fill in the fields — each option includes a short explanation in the app

### Required Settings

- **Alert Threshold (%)**  
  Percentage change required to trigger an alert.  
  Example: `5` = alert when price moves ±5%.

- **Check Interval (minutes)**  
  How often the app checks asset prices.  
  - Default: `5`  
  - Minimum: `5`  
  - Maximum: `60`  
  Lower values mean more frequent checks.

- **Cooldown Between Alerts (minutes)**  
  Minimum time before sending another alert for the same asset.  
  Default: `360`  
  Prevents repeated alerts during the same price movement.

### Optional Settings (Email Alerts)

- **Resend API Key**  
  API key used to send email alerts via Resend.

- **From Email**  
  Sender email address (must belong to a verified domain in Resend).

- **Alert Email**  
  Recipient email address where alerts will be delivered.

### Optional Settings (Discord Alerts)

- **Discord Webhook URL**  
  Webhook URL of the Discord channel where alerts will be posted.

### 📝 Important Notes

- The first time you open **Settings**, the app may briefly restart (≈1 second).  
  This is normal and required to create the initial `.env` file.
- Click **💾 Save Changes** after configuring.
- You can modify these settings at any time using the Settings panel.

### ⚠️ Alert Delivery Note

If no email or Discord webhook is configured, alerts will **only be logged to the console** and will not be sent externally.

### 💡 Advanced Users (Manual `.env`)

Advanced users may configure the app manually using the `.env` file.  
However, using the **Settings panel is recommended** to avoid configuration errors.

✅ Extras: the app includes a built-in email template — no coding required. Fill Resend/From/Alert to enable email alerts. 

## 🤖 How to Configure Discord Alerts (Webhook)

Discord alerts are optional, but **required if you want alerts to be delivered to Discord**.  
The app does **not** provide or manage Discord bots or servers.

---

### Step 1: Create Your Own Discord Server

1. Open Discord and click the **“+”** icon in the server list.
2. Select **Create My Own**.
3. Give your server a name.
4. Click **Create**.

Your private Discord server is now ready.

---

### Step 2: Create a Discord Webhook

1. Open the channel where you want to receive alerts.
2. Click **Edit Channel** (⚙️).
3. Go to **Integrations**.
4. Click **Create Webhook**.
5. (Optional) Change the webhook name or icon.
6. Make sure the correct channel is selected.
7. Click **Copy Webhook URL**.

Example:
```
https://discord.com/api/webhooks/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Step 3: Configure the Webhook in the App

1. Start the app:
   ```bash
   npm start
   ```
2. Open the app and click ⚙️ Settings.
3. Paste the webhook link into Discord Webhook URL.
4. Click 💾 Save Changes.

##  Documentation

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
├── .env.example            # Example environment variables (You can configure this file or use the (⚙️) button. If you configure this file, rename it to .env)
└── ...
```

## 📜 License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** license. See the [LICENSE.md](LICENSE.md) file for details.

## ⚠️ Disclaimer

- This project is provided as-is.
- No active support is provided.
- Use at your own risk.

## 🛠️ Version History

- **Current Version**: 2.2: Stable maintenance release, no new features planned.
- 2.1: Settings button added, Add/Remove assets button (Add Symbol) added, error fixed.
- 2.0.1: Error fixed.
- 2.0: Complete UI overhaul, multi-language support, current asset price display, light/dark theme support, bug fixes & stability improvements.
- 1.3: Control Panel updated, Email Template updated, assets updated, additional changes. (11/08/2025)
- 1.2: Control Panel updated, log messages improved, assets updated, 24/7 activity enabled, additional changes. (14/06/2025)
- 1.1: Control Panel added, bugs fixed, assets fast control added, log messages improved, additional changes.
- 1.0: Script Control added, additional changes.
- 0.9: Discord WeebHook messages added, bugs fixed, additional changes.
- 0.8: GitHub automated control (old repository).
- 0.7: Preliminary script version ready, GitHub repository added, additional changes.
- N/A: Previous Versions Not Available.
