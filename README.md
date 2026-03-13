# 📊 Real-Time Bitcoin (BTC/USDT) Dashboard

A **real-time cryptocurrency dashboard** that displays live Bitcoin market data using the **Bybit WebSocket API** and an embedded **TradingView Advanced Chart**.

The dashboard provides real-time updates for BTC/USDT including price, market statistics, and a live sparkline chart with **light/dark theme support**.

---

# 🚀 Features

## 📡 Real-Time Market Data
- WebSocket connection to **Bybit Public API**
- Live BTC/USDT data updates
- Automatic reconnection if the WebSocket disconnects

---

## 📈 Live BTC Statistics

The dashboard displays the following market metrics:

- Last traded price (BTC Price)
- Mark price
- 24h high
- 24h low
- 24h turnover (volume)
- 24h percent change
- High/Low spread
- Mid price

All values update **in real time** as new WebSocket messages arrive.

---

## 🎨 Dynamic Price Highlight

Price movements are visually highlighted:

- 🟢 **Green** → Price increase  
- 🔴 **Red** → Price decrease  

The main price card flashes when the price updates.

---

## 📊 TradingView Chart

The dashboard embeds a **TradingView Advanced Chart** displaying:

- BTC/USDT perpetual contract
- 5-minute candlestick chart
- Real-time market data
- Theme automatically switches between **light and dark mode**

---

## 🌙 Light / Dark Mode

Users can toggle between:

- Dark mode
- Light mode

The theme is applied across:

- Dashboard background
- Statistic cards
- TradingView chart
- Sparkline chart

---

## ⚡ Sparkline Mini Chart

A mini chart shows the **last 60 seconds of BTC price movement**.

Built using **Lightweight Charts** for high performance rendering.

---

## 🔌 WebSocket Connection Status

The dashboard displays connection state:

- 🟢 Connected
- 🔴 Disconnected

Includes **auto-reconnect logic** if the connection drops.

---

# 🛠 Technologies Used

- HTML5
- Tailwind CSS
- JavaScript (Vanilla JS)
- Bybit WebSocket API
- TradingView Advanced Chart Widget
- Lightweight Charts

---

# 📂 Project Structure

```
btc-dashboard
│
├── index.html
└── README.md
```

The project is a **single-page dashboard built using HTML and JavaScript**.

---

# ⚙️ Setup Instructions

### 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/btc-dashboard.git
```

### 2️⃣ Open the project folder

```bash
cd btc-dashboard
```

### 3️⃣ Run the project

Simply open the file in a browser:

```
index.html
```

Or run using a local server such as **VS Code Live Server**.

---

# 📡 WebSocket API

Connection endpoint:

```
wss://stream.bybit.com/v5/public/linear
```

Subscription topic:

```
tickers.BTCUSDT
```

The dashboard listens for real-time updates and refreshes the UI automatically.

---

# 📸 Dashboard Sections

The dashboard includes:

- BTC live price card
- Market statistics grid
- TradingView advanced chart
- Sparkline price movement chart
- Scrolling ticker with market stats

---

# 📌 Bonus Features Implemented

✔ Sparkline chart (last 60s BTC price)  
✔ WebSocket connection status indicator  
✔ Auto reconnect when WebSocket drops  
✔ Animated UI feedback for price movement  

---

# 📜 License

This project was created for a **technical assignment / demonstration purpose**.

---

# 👨‍💻 Author

**Anurag Pandey**  
Software Developer