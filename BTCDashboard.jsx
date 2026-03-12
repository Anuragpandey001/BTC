import { useState, useEffect, useRef, useCallback } from "react";

const SPARKLINE_MAX = 60;

const formatPrice = (val) =>
  val ? `$${parseFloat(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";

const formatVolume = (val) => {
  if (!val) return "—";
  const n = parseFloat(val);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
};

const Sparkline = ({ data, isDark }) => {
  if (data.length < 2) return null;
  const w = 200, h = 48;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const last = data[data.length - 1];
  const first = data[0];
  const rising = last >= first;
  const color = rising ? "#22c55e" : "#ef4444";
  const fillPts = `0,${h} ${pts.join(" ")} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill="url(#sg)" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const StatCard = ({ label, value, icon, highlight, isDark, sub }) => {
  const [flash, setFlash] = useState(null);
  const prevVal = useRef(value);
  useEffect(() => {
    if (prevVal.current !== value && prevVal.current) {
      const prev = parseFloat(prevVal.current?.replace(/[^0-9.-]/g, "") || 0);
      const curr = parseFloat(value?.replace(/[^0-9.-]/g, "") || 0);
      setFlash(curr >= prev ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 800);
      prevVal.current = value;
      return () => clearTimeout(t);
    }
    prevVal.current = value;
  }, [value]);

  const bg = isDark
    ? flash === "up" ? "rgba(34,197,94,0.08)" : flash === "down" ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)"
    : flash === "up" ? "rgba(34,197,94,0.07)" : flash === "down" ? "rgba(239,68,68,0.07)" : "rgba(0,0,0,0.03)";

  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.09)";
  const labelColor = isDark ? "#9ca3af" : "#6b7280";
  const valColor = highlight === "green" ? "#22c55e" : highlight === "red" ? "#ef4444" : isDark ? "#f9fafb" : "#111827";

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 14,
      padding: "20px 22px",
      transition: "background 0.4s ease",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: labelColor, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            {label}
          </div>
          <div style={{ fontSize: 22, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: valColor, letterSpacing: "-0.02em", lineHeight: 1 }}>
            {value || <span style={{ opacity: 0.3 }}>loading…</span>}
          </div>
          {sub && <div style={{ fontSize: 11, color: labelColor, marginTop: 5, fontFamily: "'IBM Plex Mono', monospace" }}>{sub}</div>}
        </div>
        <div style={{ fontSize: 22, opacity: 0.5 }}>{icon}</div>
      </div>
    </div>
  );
};

export default function BTCDashboard() {
  const [isDark, setIsDark] = useState(true);
  const [ticker, setTicker] = useState({});
  const [prevPrice, setPrevPrice] = useState(null);
  const [connStatus, setConnStatus] = useState("Connecting");
  const [sparkline, setSparkline] = useState([]);
  const wsRef = useRef(null);
  const retryRef = useRef(null);
  const chartContainerRef = useRef(null);
  const scriptRef = useRef(null);

  const priceDir = (() => {
    if (!prevPrice || !ticker.lastPrice) return null;
    return parseFloat(ticker.lastPrice) >= parseFloat(prevPrice) ? "green" : "red";
  })();

  const connect = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket("wss://stream.bybit.com/v5/public/linear");
    wsRef.current = ws;
    ws.onopen = () => {
      setConnStatus("Connected");
      ws.send(JSON.stringify({ op: "subscribe", args: ["tickers.BTCUSDT"] }));
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.topic === "tickers.BTCUSDT" && msg.data) {
          const d = msg.data;
          setTicker(prev => {
            const merged = { ...prev, ...d };
            if (d.lastPrice) {
              setPrevPrice(prev.lastPrice || null);
              setSparkline(s => {
                const next = [...s, parseFloat(d.lastPrice)];
                return next.slice(-SPARKLINE_MAX);
              });
            }
            return merged;
          });
        }
      } catch (_) {}
    };
    ws.onerror = () => setConnStatus("Error");
    ws.onclose = () => {
      setConnStatus("Disconnected");
      retryRef.current = setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // Inject TradingView widget
  useEffect(() => {
    if (!chartContainerRef.current) return;
    chartContainerRef.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "BYBIT:BTCUSDT.P",
      interval: "1",
      timezone: "Etc/UTC",
      theme: isDark ? "dark" : "light",
      style: "1",
      locale: "en",
      allow_symbol_change: false,
      calendar: false,
      hide_side_toolbar: false,
      backgroundColor: isDark ? "#0d0d0d" : "#ffffff",
    });
    chartContainerRef.current.appendChild(script);
    scriptRef.current = script;
  }, [isDark]);

  const pct = ticker.price24hPcnt ? (parseFloat(ticker.price24hPcnt) * 100).toFixed(2) : null;
  const pctColor = pct ? (parseFloat(pct) >= 0 ? "green" : "red") : null;

  const bg = isDark ? "#0d0d0d" : "#f4f4f0";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textMuted = isDark ? "#6b7280" : "#9ca3af";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";
  const accentColor = "#f59e0b"; // amber

  const statusColors = { Connected: "#22c55e", Disconnected: "#ef4444", Error: "#ef4444", Connecting: "#f59e0b" };

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'IBM Plex Mono', monospace", transition: "background 0.3s ease" }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes fadeIn { from { opacity:0; transform: translateY(8px) } to { opacity:1; transform: translateY(0) } }
        .stat-card { animation: fadeIn 0.4s ease both; }
      `}</style>

      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 32px", borderBottom: `1px solid ${borderColor}`,
        background: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: accentColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#000"
          }}>₿</div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: textPrimary, letterSpacing: "-0.02em" }}>
              BTC/USDT <span style={{ color: accentColor }}>Live</span>
            </div>
            <div style={{ fontSize: 10, color: textMuted, letterSpacing: "0.1em" }}>BYBIT · PERPETUAL FUTURES</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Connection status */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: statusColors[connStatus] }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%", background: statusColors[connStatus],
              animation: connStatus === "Connected" ? "pulse 2s infinite" : "none",
            }} />
            {connStatus}
          </div>

          {/* Dark/Light toggle */}
          <button
            onClick={() => setIsDark(d => !d)}
            style={{
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
              border: `1px solid ${borderColor}`,
              borderRadius: 8, padding: "7px 14px", cursor: "pointer",
              fontSize: 12, color: textPrimary, fontFamily: "'IBM Plex Mono', monospace",
              transition: "all 0.2s", display: "flex", alignItems: "center", gap: 7,
            }}
          >
            {isDark ? "☀ Light" : "☾ Dark"}
          </button>
        </div>
      </header>

      <main style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>

        {/* Price Hero */}
        <div style={{
          background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
          border: `1px solid ${borderColor}`, borderRadius: 18,
          padding: "28px 32px", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 11, color: textMuted, letterSpacing: "0.1em", marginBottom: 8 }}>LAST TRADED PRICE</div>
            <div style={{
              fontSize: 48, fontWeight: 600, letterSpacing: "-0.04em",
              color: priceDir === "green" ? "#22c55e" : priceDir === "red" ? "#ef4444" : textPrimary,
              transition: "color 0.5s ease",
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              {ticker.lastPrice ? `$${parseFloat(ticker.lastPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : <span style={{ opacity: 0.2 }}>$——.——</span>}
            </div>
            {pct && (
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  background: parseFloat(pct) >= 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  color: parseFloat(pct) >= 0 ? "#22c55e" : "#ef4444",
                  borderRadius: 6, padding: "3px 10px", fontSize: 13, fontWeight: 500,
                }}>
                  {parseFloat(pct) >= 0 ? "▲" : "▼"} {Math.abs(pct)}%
                </span>
                <span style={{ fontSize: 11, color: textMuted }}>24h change</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div style={{ fontSize: 11, color: textMuted, letterSpacing: "0.08em" }}>60s PRICE HISTORY</div>
            <Sparkline data={sparkline} isDark={isDark} />
            <div style={{ fontSize: 10, color: textMuted }}>{sparkline.length} / {SPARKLINE_MAX} ticks</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
          {[
            { label: "Mark Price", value: formatPrice(ticker.markPrice), icon: "◈", delay: "0.05s" },
            { label: "24h High", value: formatPrice(ticker.highPrice24h), icon: "↑", highlight: "green", delay: "0.1s" },
            { label: "24h Low", value: formatPrice(ticker.lowPrice24h), icon: "↓", highlight: "red", delay: "0.15s" },
            { label: "24h Volume", value: formatVolume(ticker.turnover24h), icon: "◉", delay: "0.2s" },
            { label: "Open Interest", value: formatVolume(ticker.openInterestValue), icon: "⬡", delay: "0.25s" },
            { label: "Index Price", value: formatPrice(ticker.indexPrice), icon: "◇", delay: "0.3s" },
          ].map((card, i) => (
            <div key={card.label} className="stat-card" style={{ animationDelay: card.delay }}>
              <StatCard {...card} isDark={isDark} />
            </div>
          ))}
        </div>

        {/* TradingView Chart */}
        <div style={{
          background: isDark ? "#0d0d0d" : "#fff",
          border: `1px solid ${borderColor}`, borderRadius: 18, overflow: "hidden",
          height: 520,
        }}>
          <div style={{
            padding: "14px 20px", borderBottom: `1px solid ${borderColor}`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: accentColor, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: textMuted, letterSpacing: "0.1em" }}>ADVANCED CHART · BTCUSDT PERP · 1M</span>
          </div>
          <div
            ref={chartContainerRef}
            className="tradingview-widget-container"
            style={{ height: "calc(100% - 45px)", width: "100%" }}
          />
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 10, color: textMuted, letterSpacing: "0.08em" }}>
          DATA VIA BYBIT WEBSOCKET · NOT FINANCIAL ADVICE
        </div>
      </main>
    </div>
  );
}
