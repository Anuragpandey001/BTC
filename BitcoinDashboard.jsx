import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────
const fmt = (v) =>
  v
    ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";

const fmtVolume = (v) => {
  if (!v) return "--";
  return v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : `$${(v / 1e6).toFixed(2)}M`;
};

// ─────────────────────────────────────────────
// CUSTOM HOOK — WebSocket
// ─────────────────────────────────────────────
function useBtcWebSocket() {
  const [ticker, setTicker] = useState({
    lastPrice: null, markPrice: null,
    high24h: null, low24h: null,
    volume24h: null, change24h: null,
  });
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectRef = useRef(0);
  const prevPriceRef = useRef(null);
  const [flashDir, setFlashDir] = useState(null); // "up" | "down" | null

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket("wss://stream.bybit.com/v5/public/linear");
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectRef.current = 0;
        setConnected(true);
        ws.send(JSON.stringify({ op: "subscribe", args: ["tickers.BTCUSDT"] }));
      };

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.topic === "tickers.BTCUSDT" && data.data) {
          const d = data.data;
          setTicker((prev) => {
            const newPrice = d.lastPrice ? parseFloat(d.lastPrice) : prev.lastPrice;
            if (prev.lastPrice && newPrice !== prev.lastPrice) {
              setFlashDir(newPrice > prev.lastPrice ? "up" : "down");
              setTimeout(() => setFlashDir(null), 600);
            }
            return {
              lastPrice:  d.lastPrice    ? parseFloat(d.lastPrice)    : prev.lastPrice,
              markPrice:  d.markPrice    ? parseFloat(d.markPrice)    : prev.markPrice,
              high24h:    d.highPrice24h ? parseFloat(d.highPrice24h) : prev.high24h,
              low24h:     d.lowPrice24h  ? parseFloat(d.lowPrice24h)  : prev.low24h,
              volume24h:  d.turnover24h  ? parseFloat(d.turnover24h)  : prev.volume24h,
              change24h:  d.price24hPcnt ? parseFloat(d.price24hPcnt) : prev.change24h,
            };
          });
        }
      };

      ws.onerror = () => setConnected(false);
      ws.onclose = () => {
        setConnected(false);
        if (reconnectRef.current < 5) {
          reconnectRef.current++;
          setTimeout(connect, 3000);
        }
      };
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return { ticker, connected, flashDir };
}

// ─────────────────────────────────────────────
// COMPONENT — ConnectionBadge
// ─────────────────────────────────────────────
function ConnectionBadge({ connected }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono uppercase tracking-widest"
      style={{
        background: "var(--bg3)",
        borderColor: "var(--border)",
        color: "var(--muted)",
      }}>
      <span
        className="w-2 h-2 rounded-full"
        style={{
          background: connected ? "#00e5a0" : "#ff4d6d",
          boxShadow: connected ? "0 0 8px #00e5a0" : "none",
          animation: connected ? "statusPulse 2s infinite" : "none",
        }}
      />
      {connected ? "Connected" : "Disconnected"}
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT — ThemeToggle
// ─────────────────────────────────────────────
function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "var(--bg3)",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "#f7931a";
        e.currentTarget.style.borderColor = "#f7931a";
        e.currentTarget.style.color = "white";
        e.currentTarget.style.boxShadow = "0 0 20px rgba(247,147,26,0.4)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "var(--bg3)";
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.color = "var(--text)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <span>{dark ? "🌙" : "☀️"}</span>
      <span>{dark ? "Dark" : "Light"}</span>
    </button>
  );
}

// ─────────────────────────────────────────────
// COMPONENT — Header
// ─────────────────────────────────────────────
function Header({ connected, dark, onToggleTheme }) {
  return (
    <header
      className="flex justify-between items-center mb-7 px-7 py-4 rounded-2xl border backdrop-blur-xl"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
          style={{
            background: "linear-gradient(135deg, #f7931a 0%, #ffb347 100%)",
            animation: "badgePulse 3s ease-in-out infinite",
          }}
        >
          ₿
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>
            Bitcoin <span style={{ color: "#f7931a" }}>Live</span>
          </h1>
          <p className="text-xs font-mono uppercase tracking-widest mt-0.5" style={{ color: "var(--muted)" }}>
            Real-time market dashboard · BTCUSDT Perpetual
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ConnectionBadge connected={connected} />
        <ThemeToggle dark={dark} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────
// COMPONENT — TickerTape
// ─────────────────────────────────────────────
function TickerTape({ ticker }) {
  const changePercent = ticker.change24h ? ticker.change24h * 100 : null;
  const isUp = changePercent >= 0;

  const items = [
    { label: "Last Price", value: ticker.lastPrice ? `$${fmt(ticker.lastPrice)}` : "--", highlight: true },
    { label: "24h Change", value: changePercent !== null ? `${isUp ? "+" : ""}${changePercent.toFixed(2)}%` : "--", highlight: true, up: isUp },
    { label: "24h High",   value: ticker.high24h  ? `$${fmt(ticker.high24h)}`  : "--", highlight: true },
    { label: "24h Low",    value: ticker.low24h   ? `$${fmt(ticker.low24h)}`   : "--", highlight: true },
    { label: "Volume",     value: fmtVolume(ticker.volume24h), highlight: true },
  ];

  const renderItems = [...items, ...items]; // duplicate for seamless loop

  return (
    <div
      className="overflow-hidden mb-6 rounded-xl border py-2.5"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex gap-16 whitespace-nowrap font-mono text-xs uppercase tracking-widest"
        style={{ animation: "tickerScroll 22s linear infinite", color: "var(--muted)" }}>
        {renderItems.map((item, i) => (
          <span key={i} className="flex items-center gap-2">
            {item.label}:{" "}
            <strong style={{
              color: item.highlight
                ? item.up !== undefined
                  ? item.up ? "#00e5a0" : "#ff4d6d"
                  : "#f7931a"
                : "inherit",
            }}>
              {item.value}
            </strong>
            <span className="opacity-30 mx-2">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT — StatCard
// ─────────────────────────────────────────────
function StatCard({ label, value, subValue, dotColor = "#f7931a", valueColor, large = false, flash, children }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-5 min-w-0 transition-transform duration-200 hover:-translate-y-1"
      style={{
        background: "var(--card)",
        borderColor: flash === "up"
          ? "rgba(0,229,160,0.3)"
          : flash === "down"
          ? "rgba(255,77,109,0.3)"
          : "var(--border)",
        boxShadow: flash === "up"
          ? "0 0 20px rgba(0,229,160,0.08)"
          : flash === "down"
          ? "0 0 20px rgba(255,77,109,0.08)"
          : "none",
        transition: "border-color 0.4s, box-shadow 0.4s, transform 0.2s",
      }}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          {label}
        </span>
      </div>

      {/* Value */}
      <div
        className="font-mono font-medium leading-none truncate"
        style={{
          fontSize: large ? "clamp(1.3rem, 2.2vw, 2rem)" : "clamp(0.95rem, 1.5vw, 1.4rem)",
          color: valueColor || "var(--text)",
          letterSpacing: "-0.01em",
        }}
      >
        {value || "--"}
      </div>

      {/* Sub value / children */}
      {subValue && <div className="mt-2">{subValue}</div>}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT — PrimaryPriceCard
// ─────────────────────────────────────────────
function PrimaryPriceCard({ ticker, flashDir }) {
  const changePercent = ticker.change24h ? ticker.change24h * 100 : null;
  const isUp = changePercent !== null ? changePercent >= 0 : null;

  return (
    <StatCard
      label="BTC Price · USDT"
      value={ticker.lastPrice ? `$${fmt(ticker.lastPrice)}` : "--"}
      large
      flash={flashDir}
      subValue={
        changePercent !== null ? (
          <div className="flex items-center gap-2 font-mono text-xs">
            <span style={{ color: isUp ? "#00e5a0" : "#ff4d6d" }}>
              {isUp ? "▲" : "▼"} vs 24h open
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: isUp ? "rgba(0,229,160,0.12)" : "rgba(255,77,109,0.12)",
                color: isUp ? "#00e5a0" : "#ff4d6d",
              }}
            >
              {isUp ? "+" : ""}{changePercent.toFixed(2)}%
            </span>
          </div>
        ) : null
      }
    >
      {/* Watermark ₿ */}
      <span
        className="absolute right-4 top-1/2 -translate-y-1/2 font-black pointer-events-none select-none"
        style={{ fontSize: "5rem", color: "#f7931a", opacity: 0.05, fontFamily: "sans-serif" }}
      >
        ₿
      </span>
    </StatCard>
  );
}

// ─────────────────────────────────────────────
// COMPONENT — StatsGrid (top row)
// ─────────────────────────────────────────────
function StatsGrid({ ticker, flashDir }) {
  return (
    <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
      <PrimaryPriceCard ticker={ticker} flashDir={flashDir} />
      <StatCard label="Mark Price"  value={ticker.markPrice ? `$${fmt(ticker.markPrice)}` : "--"} dotColor="#818cf8" />
      <StatCard label="24h High"    value={ticker.high24h   ? `$${fmt(ticker.high24h)}`   : "--"} dotColor="#00e5a0" valueColor="#00e5a0" />
      <StatCard label="24h Low"     value={ticker.low24h    ? `$${fmt(ticker.low24h)}`    : "--"} dotColor="#ff4d6d" valueColor="#ff4d6d" />
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT — SecondaryRow
// ─────────────────────────────────────────────
function SecondaryRow({ ticker }) {
  const changePercent = ticker.change24h ? ticker.change24h * 100 : null;
  const isUp = changePercent !== null ? changePercent >= 0 : null;
  const spread = ticker.high24h && ticker.low24h ? ticker.high24h - ticker.low24h : null;
  const mid    = ticker.high24h && ticker.low24h ? (ticker.high24h + ticker.low24h) / 2 : null;

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <StatCard
        label="24h Volume (USDT)"
        value={fmtVolume(ticker.volume24h)}
        dotColor="#38bdf8"
      />
      <StatCard
        label="24h Change %"
        value={changePercent !== null ? `${isUp ? "+" : ""}${changePercent.toFixed(2)}%` : "--"}
        dotColor="#f7931a"
        valueColor={isUp === null ? undefined : isUp ? "#00e5a0" : "#ff4d6d"}
      />
      <StatCard
        label="H/L Spread"
        value={spread ? `$${fmt(spread)}` : "--"}
        dotColor="#a78bfa"
      />
      <StatCard
        label="Mid Price"
        value={mid ? `$${fmt(mid)}` : "--"}
        dotColor="#fb923c"
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT — TradingViewChart
// ─────────────────────────────────────────────
function TradingViewChart({ dark }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = "";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "BYBIT:BTCUSDT",
      interval: "5",
      timezone: "Etc/UTC",
      theme: dark ? "dark" : "light",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      backgroundColor: dark ? "rgba(13,18,32,1)" : "rgba(255,255,255,1)",
      gridColor: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
      support_host: "https://www.tradingview.com",
    });
    el.appendChild(script);
  }, [dark]);

  return (
    <div
      className="rounded-2xl border overflow-hidden mb-6"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-0">
        <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--text)" }}>
          BTCUSDT · 5m Candlestick Chart
        </span>
        <span
          className="text-xs font-mono font-semibold uppercase tracking-widest px-3 py-1 rounded-full border"
          style={{
            background: "rgba(247,147,26,0.12)",
            color: "#f7931a",
            borderColor: "rgba(247,147,26,0.2)",
          }}
        >
          Bybit Perpetual
        </span>
      </div>
      <div ref={containerRef} style={{ height: 520 }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT — SparklineChart
// ─────────────────────────────────────────────
function SparklineChart({ price, dark }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const historyRef = useRef([]);

  // Init chart once
  useEffect(() => {
    if (!containerRef.current || !window.LightweightCharts) return;
    const el = containerRef.current;

    const chart = window.LightweightCharts.createChart(el, {
      width: el.clientWidth,
      height: 140,
      layout: { background: { color: "transparent" }, textColor: dark ? "#e8eaf0" : "#0d1220" },
      grid: {
        vertLines: { color: "rgba(197,203,206,0.06)" },
        horzLines: { color: "rgba(197,203,206,0.06)" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: true },
      crosshair: { mode: window.LightweightCharts.CrosshairMode.Normal },
    });

    const series = chart.addAreaSeries({
      lineColor: "#f7931a",
      topColor: "rgba(247,147,26,0.25)",
      bottomColor: "rgba(247,147,26,0.01)",
      lineWidth: 2,
      priceLineVisible: false,
    });
    series.setData([]);

    chartRef.current = chart;
    seriesRef.current = series;

    const onResize = () => chart.applyOptions({ width: el.clientWidth });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, []);

  // Update theme
  useEffect(() => {
    chartRef.current?.applyOptions({
      layout: { background: { color: "transparent" }, textColor: dark ? "#e8eaf0" : "#0d1220" },
    });
  }, [dark]);

  // Push new price tick
  useEffect(() => {
    if (!seriesRef.current || !price) return;
    const dp = { time: Math.floor(Date.now() / 1000), value: price };
    historyRef.current.push(dp);
    if (historyRef.current.length > 60) historyRef.current.shift();
    seriesRef.current.update(dp);
  }, [price]);

  return (
    <div
      className="rounded-2xl border px-6 py-5 mb-5"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#f7931a" }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Last 60s Price Movement
          </span>
        </div>
        <div
          className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full"
          style={{ background: "rgba(0,229,160,0.12)", color: "#00e5a0" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#00e5a0", animation: "statusPulse 1.5s infinite" }}
          />
          Live Feed
        </div>
      </div>
      <div ref={containerRef} style={{ height: 140 }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT — Footer
// ─────────────────────────────────────────────
function Footer() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="text-center py-5 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
      Data via <span style={{ color: "#f7931a" }}>Bybit WebSocket API</span> · Auto-reconnect enabled ·{" "}
      <span style={{ color: "#f7931a" }}>{time}</span>
    </footer>
  );
}

// ─────────────────────────────────────────────
// ROOT — App
// ─────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(true);
  const { ticker, connected, flashDir } = useBtcWebSocket();

  const theme = {
    dark: {
      "--bg": "#080b14", "--bg2": "#0d1220", "--bg3": "#111827",
      "--card": "rgba(13,18,32,0.85)", "--border": "rgba(255,255,255,0.06)",
      "--text": "#e8eaf0", "--muted": "rgba(232,234,240,0.45)",
    },
    light: {
      "--bg": "#f0f2f8", "--bg2": "#ffffff", "--bg3": "#eaecf5",
      "--card": "rgba(255,255,255,0.9)", "--border": "rgba(0,0,0,0.08)",
      "--text": "#0d1220", "--muted": "rgba(13,18,32,0.45)",
    },
  };

  const cssVars = dark ? theme.dark : theme.light;

  return (
    <>
      {/* Global keyframes + font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',sans-serif; font-size:13px; }
        @keyframes badgePulse {
          0%,100% { box-shadow: 0 0 28px rgba(247,147,26,0.4), 0 4px 16px rgba(247,147,26,0.3); }
          50%      { box-shadow: 0 0 48px rgba(247,147,26,0.5), 0 4px 24px rgba(247,147,26,0.5); }
        }
        @keyframes statusPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:0.6; transform:scale(0.85); }
        }
        @keyframes tickerScroll {
          0%   { transform:translateX(0); }
          100% { transform:translateX(-50%); }
        }
        @media (max-width: 1024px) {
          .stats-top-grid { grid-template-columns: 1fr 1fr !important; }
          .stats-sec-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .stats-top-grid { grid-template-columns: 1fr !important; }
          .stats-sec-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <div
        style={{
          ...cssVars,
          background: "var(--bg)",
          color: "var(--text)",
          minHeight: "100vh",
          transition: "background 0.4s, color 0.4s",
          position: "relative",
        }}
      >
        {/* Glow blobs */}
        <div style={{
          position: "fixed", width: 600, height: 600, top: -200, right: -100,
          borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none", zIndex: 0,
          background: "rgba(247,147,26,0.4)", opacity: dark ? 0.15 : 0.08,
        }} />
        <div style={{
          position: "fixed", width: 400, height: 400, bottom: 0, left: -150,
          borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none", zIndex: 0,
          background: "rgba(99,102,241,0.3)", opacity: dark ? 0.1 : 0.06,
        }} />

        {/* Main content */}
        <div className="relative z-10 mx-auto px-8 py-7" style={{ maxWidth: 1440 }}>
          <Header connected={connected} dark={dark} onToggleTheme={() => setDark(!dark)} />
          <TickerTape ticker={ticker} />

          {/* Top stats row */}
          <div
            className="stats-top-grid grid gap-4 mb-4"
            style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}
          >
            <PrimaryPriceCard ticker={ticker} flashDir={flashDir} />
            <StatCard label="Mark Price"  value={ticker.markPrice ? `$${fmt(ticker.markPrice)}` : "--"} dotColor="#818cf8" />
            <StatCard label="24h High"    value={ticker.high24h   ? `$${fmt(ticker.high24h)}`   : "--"} dotColor="#00e5a0" valueColor="#00e5a0" />
            <StatCard label="24h Low"     value={ticker.low24h    ? `$${fmt(ticker.low24h)}`    : "--"} dotColor="#ff4d6d" valueColor="#ff4d6d" />
          </div>

          {/* Secondary stats row */}
          <SecondaryRow ticker={ticker} />

          {/* TradingView chart */}
          <TradingViewChart dark={dark} />

          {/* Sparkline */}
          <SparklineChart price={ticker.lastPrice} dark={dark} />

          <Footer />
        </div>
      </div>
    </>
  );
}
