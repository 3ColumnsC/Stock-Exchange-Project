import React, { useState, useEffect, useRef } from 'react';
import { ASSETS } from '../assets.js';
import { useTranslation } from './hooks/useTranslations.js';

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [alertPrice, setAlertPrice] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceError, setPriceError] = useState('');
  const [themeMode, setThemeMode] = useState('system');
  const { t, tl, language, changeLanguage } = useTranslation();
  const [pendingThemeMode, setPendingThemeMode] = useState('system');
  const [pendingLanguage, setPendingLanguage] = useState('es');
  const [assetQuery, setAssetQuery] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [helpStep, setHelpStep] = useState(0);
  // Not using
  const [helpInitialized, setHelpInitialized] = useState(false);

  const renderHelpSteps = (steps) => {
    if (!steps) return null;
    return (
      <ol className="list-decimal pl-5 space-y-1">
        {steps.map((step, index) => (
          <li key={index} className="pb-1">
            <span dangerouslySetInnerHTML={{
              __html: step
                .replace('{{startButton}}', `<strong>${t('startMonitoring')}</strong>`)
                .replace('{{stopButton}}', `<strong>${t('stopMonitoring')}</strong>`)
                .replace('{{threshold}}', '<code>±5%</code>')
                .replace('{{resendLink}}', `<a class="text-blue-500 font-bold" href="https://resend.com" target="_blank" rel="noopener noreferrer">${tHelp('resendLink')}</a>`)
                .replace('{{discordLink}}', `<a class="text-blue-500 font-bold" href="https://discord.gg/8RE9Fsuty5" target="_blank" rel="noopener noreferrer">${tHelp('discordLink')}</a>`)
                .replace('{{licenseLink}}', `<a class="text-blue-500 font-bold" href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer">${tHelp('licenseLink')}</a>`)
            }} />
          </li>
        ))}
      </ol>
    );
  };

  const logContainerRef = useRef(null);

  // Maximum number of logs to display

  // Activity log
  // The button ("exportLog": "Export latest available logs") exports all available logs to a .txt file (2000 by default)

  const MAX_LOGS = 1000; // Change this valor to increase the number of logs displayed in the "Activity Log" panel (Increase this valor can generate lag in the long term)

  // Translate log messages to match the active language
  const translateLogMessage = (raw) => {
    try {
      let s = String(raw);
      // Replace common phrases with their translations
      s = s.replace('Configuración guardada', t('saveSettings'));
      s = s.replace('Tema', t('theme'));
      s = s.replace('Idioma', t('language'));
      s = s.replace('Limpiar registro', t('clearLog'));
      s = s.replace('Registro de Actividad', t('activityLog'));
      // Translate price and error messages
      s = s.replace('Precio actual', t('currentPrice'));
      s = s.replace('Precio', t('currentPrice'));
      s = s.replace('ERROR', t('error'));
      return s;
    } catch {
      return String(raw);
    }
  };

  // Get translations at the component level
  const { t: tCommon } = useTranslation('common');
  const { t: tHelp, ready: helpTranslationsReady } = useTranslation('help');
  
  // Debug: Log when showHelp changes
  useEffect(() => {
    console.log('showHelp changed to:', showHelp);
    if (showHelp) {
      console.log('Help step:', helpStep);
    }
  }, [showHelp, helpStep]);
  
  // Get help navigation translations
  const helpNav = tHelp('navigation', { returnObjects: true }) || {};

  // Render help content based on current step
  const renderHelpContent = () => {
    if (helpStep === 0) {
      return (
        <div className="space-y-4 text-sm leading-relaxed">
          <div>
            <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              {tHelp('sections.autoMonitoring.title')}
            </h3>
            <p className="pb-2 pt-1">{tHelp('sections.autoMonitoring.content')}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              {tHelp('sections.startMonitoring.title')}
            </h3>
            {renderHelpSteps(tHelp('sections.startMonitoring.steps', { returnObjects: true }))}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              {tHelp('sections.stopMonitoring.title')}
            </h3>
            <p 
              className="pb-2 pt-1" 
              dangerouslySetInnerHTML={{ 
                __html: tHelp('sections.stopMonitoring.content')
                  .replace('{{stopButton}}', `<strong>${t('stopMonitoring')}</strong>`)
              }} 
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              {tHelp('sections.viewAlerts.title')}
            </h3>
            {renderHelpSteps(tHelp('sections.viewAlerts.steps', { returnObjects: true }))}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              {tHelp('sections.settings.title')}
            </h3>
            {renderHelpSteps(tHelp('sections.settings.steps', { returnObjects: true }))}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              {tHelp('sections.importantNotes.title')}
            </h3>
            {renderHelpSteps(tHelp('sections.importantNotes.steps', { returnObjects: true }))}
          </div>
        </div>
      );
    }
    if (helpStep === 1) {
      return (
        <div className="space-y-4 text-sm leading-relaxed">
          <div>
            <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              {tHelp('sections.envFile.title')}
            </h3>
            {renderHelpSteps(tHelp('sections.envFile.steps', { returnObjects: true }))}
          </div>
        </div>
      );
    }
    if (helpStep === 2) {
      return (
        <div className="space-y-4 text-sm leading-relaxed">
          <div>
            <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              {tHelp('sections.thankYou.title')}
            </h3>
            <p className="pb-2 pt-1">{tHelp('sections.thankYou.content')}</p>
          </div>
        </div>
      );
    }
    if (helpStep === 3) {
      return (
        <div className="space-y-4 text-sm leading-relaxed">
          <div>
            <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              {tHelp('sections.license.title')}
            </h3>
            {renderHelpSteps(tHelp('sections.license.steps', { returnObjects: true }))}
            <p className="pt-2 text-xs opacity-75">{tHelp('sections.license.copyright')}</p>
          </div>
        </div>
      );
    }
    // Default placeholder
    return (
      <div className="text-sm opacity-75">
        {tHelp('sections.defaultHelpMessage', { step: helpStep + 1 })}
      </div>
    );
  };

  // List of available assets (API symbol and user-visible label)
  const assets = Array.from(new Map(ASSETS.map(a => [a.symbol, a])).values())
    .map(a => ({ symbol: a.symbol, label: `${a.name} (${a.symbol})` }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const filteredAssets = assets.filter(a =>
    a.label.toLowerCase().includes(assetQuery.toLowerCase())
  );

  useEffect(() => {
    // Set up IPC listeners for communication with the main process
    const logListener = (message) => {
      const now = Date.now();
      const newEntries = [];
      const pushMsg = (msg) => newEntries.push({ id: now + Math.random(), ts: now, message: msg });

      // Extract balanced JSON objects from a string, handling quotes and escapes
      const extractJsonSegments = (s) => {
        const segs = [];
        let depth = 0, inStr = false, esc = false, start = -1;
        for (let i = 0; i < s.length; i++) {
          const ch = s[i];
          if (inStr) {
            if (esc) { esc = false; continue; }
            if (ch === '\\') { esc = true; continue; }
            if (ch === '"') { inStr = false; continue; }
            continue;
          }
          if (ch === '"') { inStr = true; continue; }
          if (ch === '{') { if (depth === 0) start = i; depth++; continue; }
          if (ch === '}') { depth--; if (depth === 0 && start !== -1) { segs.push({ start, end: i + 1, text: s.slice(start, i + 1) }); start = -1; } continue; }
        }
        return segs;
      };

      try {
        if (typeof message === 'object' && message && message.code) {
          // Structured already
          pushMsg(tl(message.code, message.params || {}));
        } else if (typeof message === 'string') {
          const s = message.trim();
          const segs = extractJsonSegments(s);
          if (segs.length > 0) {
            const leading = s.slice(0, segs[0].start).trim();
            if (leading) pushMsg(translateLogMessage(leading));
            for (const seg of segs) {
              try {
                const obj = JSON.parse(seg.text);
                if (obj && obj.code) {
                  pushMsg(tl(obj.code, obj.params || {}));
                } else {
                  pushMsg(translateLogMessage(seg.text));
                }
              } catch {
                pushMsg(translateLogMessage(seg.text));
              }
            }
          } else {
            pushMsg(translateLogMessage(s));
          }
        } else {
          pushMsg(translateLogMessage(String(message)));
        }
      } catch {
        pushMsg(translateLogMessage(String(message)));
      }

      // Append all generated entries with a high safety cap
      setLogs(prev => {
        const next = [...prev, ...newEntries];
        return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
      });

      // If any entry shows a $amount, update current price
      for (const e of newEntries) {
        if (typeof e.message === 'string' && e.message.includes('$')) {
          const priceMatch = e.message.match(/\$([\d.,]+)/);
          if (priceMatch && priceMatch[1]) {
            const num = parseFloat(priceMatch[1].replace(/,/g, ''));
            if (!Number.isNaN(num)) setCurrentPrice(num);
          }
        }
      }
    };

    const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
    if (!api || typeof api.onAlertLog !== 'function') {
      return () => {};
    }
    const unsubscribe = api.onAlertLog(logListener);
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [language, t, tl]);

  // Get current price for selected symbol
  const handleFetchPrice = async () => {
    try {
      setPriceError('');
      // Determine which symbol to query:
      // - If searching and there are filtered results, use the first one shown
      // - If searching but no results, show error
      // - If not searching, use the currently selected symbol
      const searching = assetQuery.trim().length > 0;
      // If searching, give priority to the selected asset if it's in the filtered list;
      // otherwise, use the first filtered item.
      let symbolToQuery;
      if (searching) {
        const selectedIsInFiltered = filteredAssets.some(a => a.symbol === selectedSymbol);
        symbolToQuery = selectedIsInFiltered ? selectedSymbol : (filteredAssets[0]?.symbol || null);
      } else {
        symbolToQuery = selectedSymbol;
      }

      if (searching && !symbolToQuery) {
        // No results: don't show error to avoid breaking the UI, just don't query
        return;
      }
      const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
      if (!api || typeof api.getPrice !== 'function') {
        setPriceError(t('apiUnavailable'));
        return;
      }
      const res = await api.getPrice(symbolToQuery);
      if (res?.success && typeof res.price === 'number') {
        setCurrentPrice(res.price);
        setLogs(prev => ([...prev, { id: Date.now()+Math.random(), ts: Date.now(), message: `${t('currentPrice')} ${res.symbol}: $${res.price}` }]));
      } else {
        const msg = res?.error || t('error');
        setPriceError(msg);
        setLogs(prev => ([...prev, { id: Date.now()+Math.random(), ts: Date.now(), message: `${t('error')} (${symbolToQuery}): ${msg}` }]));
      }
    } catch (e) {
      setPriceError(e.message);
      setLogs(prev => ([...prev, { id: Date.now()+Math.random(), ts: Date.now(), message: `${t('error')}: ${e.message}` }]));
    }
  };


  // Handle safe app shutdown
  useEffect(() => {
    if (!window.electronAPI?.onAppWillQuit) return;

    const cleanup = async () => {
      console.log('Performing cleanup before shutdown...');
      
      try {
        // Stop any running monitoring
        if (isRunning) {
          console.log('Stopping monitoring...');
          try {
            await window.electronAPI.stopAlerts?.();
          } catch (error) {
            console.warn('Warning while stopping alerts:', error.message);
          } finally {
            setIsRunning(false);
          }
        }

        // Clean up any intervals or timeouts
        console.log('Cleaning up timeouts and intervals...');
        try {
          const maxId = setTimeout(() => {});
          for (let i = 1; i < maxId; i++) {
            clearTimeout(i);
            clearInterval(i);
          }
        } catch (e) {
          console.warn('Unable to clean up some timeouts/intervals:', e.message);
        }

        // Clean up custom event listeners
        console.log('Cleaning up event listeners...');
        try {
          window.electronAPI.removeAllAlertLogListeners?.();
        } catch (e) {
          console.warn('Unable to clean up some event listeners:', e.message);
        }
        
        console.log('Application is ready to close');
      } catch (error) {
        console.error('Error during shutdown cleanup:', error);
      }
    };

    let unsubscribe;
    try {
      unsubscribe = window.electronAPI.onAppWillQuit(async () => {
        console.log('Received app shutdown notification');
        await cleanup();
        // No force close here, let the main process handle it
      });
    } catch (error) {
      console.error('Error configuring shutdown listener:', error);
    }

    // Clean up on unmount
    return () => {
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (e) {
          console.warn('Error unsubscribing from shutdown listener:', e);
        }
      }
    };
  }, [isRunning]);

  // Auto-scroll log to bottom when new entries are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs.length]);

  // Load preferences (theme and language) from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('themeMode');
    const savedLang = localStorage.getItem('language');
    if (savedTheme) {
      setThemeMode(savedTheme);
      setPendingThemeMode(savedTheme);
    }
    if (savedLang) {
      setPendingLanguage(savedLang);
      changeLanguage(savedLang);
    }
  }, []);

  // Apply selected theme
  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode) => {
      if (mode === 'dark') {
        root.classList.add('dark');
      } else if (mode === 'light') {
        root.classList.remove('dark');
      } else {
        // System theme preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
      }
    };

    apply(themeMode);
    localStorage.setItem('themeMode', themeMode);

    // Listen for system theme changes when in 'system' mode
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (themeMode === 'system') apply('system'); };
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, [themeMode]);

  // Keyboard navigation for Help
  useEffect(() => {
    if (!showHelp) return;
    const onKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setHelpStep((s) => (s + 1) % 4);
      } else if (e.key === 'ArrowLeft') {
        setHelpStep((s) => (s + 3) % 4);
      } else if (e.key === 'Escape') {
        setShowHelp(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showHelp]);

  const handleStart = async () => {
    try {
      const result = await window.electronAPI.startAlerts();
      setIsRunning(true);
      console.log(result);
    } catch (error) {
      console.error('Error al iniciar el sistema:', error);
    }
  };

  const handleStop = () => {
    window.electronAPI.stopAlerts();
    setIsRunning(false);
  };

  const handleCloseApp = () => {
    if (window.electronAPI?.close) {
      window.electronAPI.close();
    } else if (window.electron?.send) {
      window.electron.send('exit-app');
    }
  };

  // Save settings (applies theme and language from the panel)
  const handleSaveConfig = () => {
    changeLanguage(pendingLanguage);
    setThemeMode(pendingThemeMode);
    localStorage.setItem('themeMode', pendingThemeMode);
    setLogs(prev => ([...prev, { id: Date.now()+Math.random(), ts: Date.now(), message: `${t('saveSettings')}: ${t('theme').toLowerCase()}=${pendingThemeMode}, ${t('language').toLowerCase()}=${pendingLanguage}` }]))
    localStorage.setItem('language', pendingLanguage);
  };

  const handleAddAlert = (e) => {
    e.preventDefault();
    if (!selectedAsset || !alertPrice) return;
    
    const newAlert = {
      id: Date.now(),
      asset: selectedAsset,
      price: parseFloat(alertPrice),
      active: true
    };
    
    setAlerts([...alerts, newAlert]);
    setSelectedAsset('');
    setAlertPrice('');
    console.log('Nueva alerta:', newAlert);
  };

  // No using
  const toggleAlert = (id) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, active: !alert.active } : alert
    ));
  };

  const removeAlert = (id) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-400">{t('appTitle')}</h1>
          <div className="flex flex-wrap gap-3 items-center">
            <button 
              onClick={handleStart} 
              disabled={isRunning}
              title={t('startMonitoring')}
              className={`will-change-transform px-6 py-2 rounded-md font-medium flex items-center ${isRunning ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
              <span className="mr-2">▶</span> {t('startMonitoring')}
            </button>
            <button 
              onClick={handleStop} 
              disabled={!isRunning}
              title={t('stopMonitoring')}
              className={`will-change-transform px-6 py-2 rounded-md font-medium flex items-center ${!isRunning ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>
              <span className="mr-2">⏹</span> {t('stopMonitoring')}
            </button>
            <button 
              onClick={() => {}}
              title={t('comingSoon')}
              className="will-change-transform px-6 py-2 rounded-md font-medium flex items-center bg-gray-800 cursor-not-allowed hover:bg-gray-800/40">
              <span className="mr-2">⚙️</span> {t('comingSoon')}
            </button>
            <button 
              onClick={handleCloseApp} 
              title={t('closeApp')}
              className="will-change-transform px-6 py-2 rounded-md font-medium flex items-center bg-purple-600 hover:bg-purple-700">
              <span className="mr-2">⏻</span> {t('closeApp')}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Actual Price Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-300">{t('currentPrice')}</h2>
            <div className="mb-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-4 fade-soft">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('asset')}</label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className={`will-change-transform w-full bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white rounded-md p-2 text-sm border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${assetQuery ? 'animate-fade-in-up' : ''}`}
                >
                  {filteredAssets.map(a => (
                    <option key={a.symbol} value={a.symbol}>{a.label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-4 fade-soft">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('search')}</label>
                <div className={`relative ${assetQuery ? 'animate-fade-in-up' : ''}`}>
                  <input
                    type="text"
                    value={assetQuery}
                    onChange={(e) => setAssetQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="w-full will-change-transform bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white rounded-md p-2 pr-8 pl-2 text-sm placeholder-gray-400 border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  {assetQuery && (
                    <button
                      type="button"
                      onClick={() => setAssetQuery('')}
                      className="will-change-transform absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:hover:text-white bg-transparent rounded p-1"
                      title={t('clearSearch')}
                      aria-label={t('clearSearch')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div className="md:col-span-4 flex gap-2 items-end">
                <button
                  onClick={handleFetchPrice}
                  className={`will-change-transform w-full relative overflow-hidden group rounded-md text-sm font-semibold py-2 text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg transition-transform duration-300 hover:-translate-y-[1px]`}
                  title={t('query')}
                >
                  <span className="will-change-transform relative pt-0.5 z-10 flex items-center justify-center gap-2">
                    <span className="inline-block">🔎</span>
                    {t('query')}
                  </span>
                  <span className="will-change-transform absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity"></span>
                </button>
                <div className="self-center text-sm text-red-500 whitespace-nowrap">{priceError}</div>
              </div>
            </div>
            <div className="text-center py-8">
              {currentPrice ? (
                <div>
                  <div className="text-4xl font-bold text-green-400 -mt-6">${currentPrice.toFixed(2)}</div>
                  <div className="text-sm text-gray-400 dark:text-gray-400 mt-1">{t('lastUpdate')}: {new Date().toLocaleTimeString()}</div>
                </div>
              ) : (
                <div className="text-gray-600 dark:text-gray-400">{t('noData')}</div>
              )}
            </div>

          </div>

          {/* Conf Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg fade-soft animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-300">{t('quickSettings')}</h2>
              <button
                type="button"
                title={t('help')}
                aria-label={t('help')}
                className="will-change-transform w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white shadow transition duration-300 hover:opacity-80 hover:scale-105"
                onClick={() => {
                  setHelpStep(0);
                  setShowHelp(true);
                }}
              >
                ?
              </button>
            </div>
            <div className="space-y-4">
              <div className="fade-soft">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('language')}</label>
                <select value={pendingLanguage} onChange={(e) => setPendingLanguage(e.target.value)} className="will-change-transform w-full bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white rounded-md p-2 text-sm border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-transparent transition animate-fade-in-up">
                  <option value="en">English (EN)</option>
                  <option value="es">Español (ES)</option>
                  <option value="de">Deutsch (DE)</option>
                  <option value="fr">Français (FR)</option>
                  <option value="pt">Português (PT)</option>
                  <option value="it">Italiano (IT)</option>
                  <option value="sv">Svenska (SV)</option>
                  <option value="nl">Nederlands (NL)</option>
                  <option value="no">Norsk (NO)</option>
                  <option value="fi">Suomi (FI)</option>
                  <option value="pl">Polski (PL)</option>
                  <option value="tr">Türkçe (TR)</option>
                  <option value="ru">Русский (RU)</option>
                  <option value="ja">日本語 (JA)</option>
                  <option value="zh-CN">中文 (zh-CN)</option>
                  <option value="zh-TW">中文 (zh-TW)</option>
                  <option value="ko">한국어 (KO)</option>
                  <option value="ar">العربية (AR)</option>          

                </select>
              </div>
              <div className="fade-soft">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('theme')}</label>
                <select value={pendingThemeMode} onChange={(e) => setPendingThemeMode(e.target.value)} className="will-change-transform w-full bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white rounded-md p-2 text-sm border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-transparent transition animate-fade-in-up">
                  <option value="dark">{t('dark')}</option>
                  <option value="light">{t('light')}</option>
                  <option value="system">{t('system')}</option>
                </select>
              </div>
              <div className="pt-2">
                <button onClick={handleSaveConfig} title={t('saveSettings')} className="will-change-transform w-full relative overflow-hidden group rounded-md text-sm font-semibold py-2 px-4 text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg transition-transform duration-300s hover:-translate-y-[1px]">
                  <span className="will-change-transform pt-0.5 relative z-10 flex items-center justify-center gap-2">
                    <span className="inline-block">✔</span>
                    {t('saveSettings')}
                  </span>
                  <span className="will-change-transform absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity"></span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 animate-fade-in-up" onClick={() => setShowHelp(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xl rounded-xl w-[92vw] max-w-3xl mx-4 p-6 animate-fade-in-up border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-300">{t('help')}</h3>
                  <div className="text-xs opacity-70">
                    {helpNav?.step?.replace('{{current}}', helpStep + 1).replace('{{total}}', '4')}
                  </div>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="will-change-transform w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white transition hover:scale-105 duration-300"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setHelpStep((s) => (s + 3) % 4)}
                  className="will-change-transform px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-900/30 text-gray-800 dark:text-white text-sm transition hover:scale-105 duration-500"
                  title={helpNav?.prevTitle}
                >
                  ◀ {helpNav?.previous}
                </button>
                <div className="text-sm opacity-75">
                  {helpNav?.step?.replace('{{current}}', helpStep + 1).replace('{{total}}', '4')}
                </div>
                <button
                  onClick={() => setHelpStep((s) => (s + 1) % 4)}
                  className="will-change-transform px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700/30  text-white text-sm transition hover:scale-105 duration-500"
                  title={helpNav?.nextTitle}
                >
                  {helpNav?.next} ▶
                </button>
              </div>
              
              {/* Per-step help content */}
              {renderHelpContent()}

              {/* Quick tips / links area */}
              <div className="mt-3 text-xs opacity-75 space-y-1">
                <p>{helpNav?.tip}</p>
              </div>
            </div>
          </div>
        )}

        {/* Activity Log */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-300">{t('activityLog')}</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  try {
                    const lines = logs.map(log => {
                      const isObj = typeof log === 'object' && log !== null;
                      const msg = isObj ? log.message : String(log);
                      const ts = isObj ? log.ts : Date.now();
                      const time = new Date(ts).toLocaleTimeString();
                      return `[${time}] ${msg}`;
                    });
                    const content = lines.join('\n');
                    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    const pad = (n) => String(n).padStart(2, '0');
                    const d = new Date();
                    const fileName = `activity-sep-log-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.txt`;
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  } catch (e) {
                    console.error('Error exporting log:', e);
                  }
                }}
                disabled={logs.length === 0}
                className={`will-change-transform text-sm ${logs.length === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                title={t('exportLog')}
              >
                {t('exportLog')}
              </button>
              <button onClick={() => setLogs([])} className="will-change-transform text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">{t('clearLog')}</button>
            </div>
          </div>
          <div ref={logContainerRef} className="bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white rounded-md p-4 h-[60vh] overflow-y-auto font-mono text-sm fade-soft">
            {logs.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-center py-8">{t('noRecentActivity')}</div>
            ) : (
              logs.map((log, index) => {
                const isObj = typeof log === 'object' && log !== null;
                const msg = isObj ? log.message : String(log);
                const ts = isObj ? log.ts : Date.now();
                const time = new Date(ts).toLocaleTimeString();
                return (
                  <div key={isObj ? log.id : index} className="border-b border-gray-300 dark:border-gray-700 py-1.5 animate-fade-in-up">
                    <span className="text-gray-600 dark:text-gray-400">[{time}]</span>{' '}
                    <span className={(msg.includes('ERROR') || msg.includes(t('error'))) ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}>
                      {msg}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
