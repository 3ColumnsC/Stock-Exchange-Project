import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from './hooks/useTranslations';

export default function SymbolModal({ isOpen, onClose, onSaved }) {
  const { t: tSymbol } = useTranslation('symbol');
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('stock');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const [assets, setAssets] = useState([]);
  const [selectedToRemove, setSelectedToRemove] = useState('');
  // Staged (not yet persisted) operations
  const [stagedAdds, setStagedAdds] = useState([]); // [{symbol,name,type}]
  const [stagedRemoves, setStagedRemoves] = useState([]); // [symbol]

  const api = typeof window !== 'undefined' ? window.electronAPI : undefined;

  const combinedAssets = useMemo(() => {
    // base -> remove stagedRemoves -> add stagedAdds
    const map = new Map((assets || []).map(a => [String(a.symbol).toUpperCase(), { ...a }]));
    for (const sym of stagedRemoves) {
      map.delete(String(sym).toUpperCase());
    }
    for (const add of stagedAdds) {
      map.set(String(add.symbol).toUpperCase(), { ...add });
    }
    return Array.from(map.values())
      .map(a => ({ symbol: a.symbol, name: a.name, type: a.type, label: `${a.name} (${a.symbol})` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [assets, stagedAdds, stagedRemoves]);

  const refreshAssets = async () => {
    try {
      if (api?.getAssets) {
        const res = await api.getAssets();
        if (res?.success && Array.isArray(res.assets)) {
          setAssets(res.assets);
          return;
        }
      }
    } catch (e) {
      console.warn('IPC getAssets failed, falling back to direct import:', e.message);
    }
    // Fallback: dynamic import from assets.js
    try {
      const mod = await import('../assets.js');
      const list = Array.isArray(mod.ASSETS) ? mod.ASSETS : ([]);
      setAssets(list);
    } catch (e) {
      console.warn('Unable to load assets from assets.js:', e.message);
      setAssets([]);
    }
  };

  const handleSaveAndClose = async () => {
    try {
      // Persist staged removes first, then adds
      if (!api) throw new Error(tSymbol('apiUnavailable'));
      // Removes
      for (const sym of stagedRemoves) {
        if (api.removeAsset) {
          const res = await api.removeAsset(sym);
          if (!res?.success) throw new Error(res?.error || tSymbol('unableToRemove', { sym }));
        }
      }
      // Adds
      for (const a of stagedAdds) {
        if (api.addAsset) {
          const res = await api.addAsset(a);
          if (!res?.success) throw new Error(res?.error || tSymbol('unableToAdd', { sym: a.symbol }));
        }
      }
      await onSaved?.();
      if (typeof window !== 'undefined' && window.electronAPI?.reloadApp) {
        await window.electronAPI.reloadApp();
      }
    } finally {
      onClose?.();
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccess('');
      setSymbol('');
      setName('');
      setType('stock');
      setSelectedToRemove('');
      setStagedAdds([]);
      setStagedRemoves([]);
      refreshAssets();
    }
  }, [isOpen]);

  const handleAdd = async (e) => {
    e?.preventDefault?.();
    setError('');
    setSuccess('');
    const sym = symbol.trim();
    const nm = name.trim();
    const tp = type.trim();
    if (!sym || !nm || !tp) { setError(tSymbol('allFieldsRequired')); return; }
    if (!api?.validateSymbol) { setError(tSymbol('apiUnavailable')); return; }

    try {
      setIsBusy(true);
      const val = await api.validateSymbol(sym);
      if (!val?.success) {
        setError(val?.error || tSymbol('symbolNotFound'));
        return;
      }
      // Stage add (do not persist yet)
      const upper = sym.toUpperCase();
      const alreadyPresent = combinedAssets.some(a => a.symbol.toUpperCase() === upper);
      if (alreadyPresent) { setError(tSymbol('assetAlreadyPresent')); return; }
      setStagedAdds(prev => [...prev, { symbol: upper, name: nm, type: tp }]);
      setSuccess(tSymbol('assetStagedToAdd'));
      setSymbol('');
      setName('');
      setType('stock');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async () => {
    setError('');
    setSuccess('');
    if (!selectedToRemove) { setError(tSymbol('selectAssetToRemove')); return; }
    try {
      setIsBusy(true);
      // Stage removal (do not persist yet)
      const sym = String(selectedToRemove).toUpperCase();
      const existsNow = combinedAssets.some(a => a.symbol.toUpperCase() === sym);
      if (!existsNow) { setError(tSymbol('assetNotFound')); return; }
      setStagedRemoves(prev => prev.includes(sym) ? prev : [...prev, sym]);
      // If was also staged to add, cancel that staged add
      setStagedAdds(prev => prev.filter(a => a.symbol.toUpperCase() !== sym));
      setSuccess(tSymbol('assetStagedToRemove'));
      setSelectedToRemove('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  // No Save action needed; add/remove writes immediately

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{tSymbol('title')}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-md bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-sm">{error}</div>
          )}
          {success && (
            <div className="p-3 mb-4 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-sm">{success}</div>
          )}

          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{tSymbol('symbol')}</label>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder={tSymbol('symbolPlaceholder')}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white rounded-md p-2 text-sm border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{tSymbol('name')}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tSymbol('namePlaceholder')}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white rounded-md p-2 text-sm border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{tSymbol('type')}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white rounded-md p-2 text-sm border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="stock">Stock</option>
                <option value="crypto">Crypto</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                disabled={isBusy}
                className={`will-change-transform w-full relative overflow-hidden group rounded-md text-sm font-semibold py-2 text-white shadow-lg transition-transform duration-300 ${isBusy ? 'bg-gray-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-600 hover:-translate-y-[1px]'}`}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">➕ {tSymbol('add')}</span>
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity"></span>
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{tSymbol('removeAsset')}</label>
              <div className="flex gap-2">
                <select
                  value={selectedToRemove}
                  onChange={(e) => setSelectedToRemove(e.target.value)}
                  onFocus={refreshAssets}
                  className="flex-1 bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white rounded-md p-2 text-sm border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{tSymbol('selectAsset')}</option>
                  {combinedAssets.map(a => (
                    <option key={a.symbol} value={a.symbol}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleRemove}
                  disabled={!selectedToRemove || isBusy}
                  className={`will-change-transform px-4 rounded-md text-sm font-semibold py-2 text-white ${(!selectedToRemove || isBusy) ? 'cursor-not-allowed bg-gray-500' : 'transition duration-300 hover:-translate-y-[1px] bg-green-600 hover:bg-green-700'} `}
                >
                  {tSymbol('remove')}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`will-change-transform w-full relative overflow-hidden group rounded-md text-sm font-semibold py-2 text-white bg-gradient-to-r from-gray-600 to-gray-700 shadow-lg transition-transform duration-300 hover:-translate-y-[1px]`}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">✕ {tSymbol('cancel')}</span>
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity"></span>
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className={`will-change-transform w-full relative overflow-hidden group rounded-md text-sm font-semibold py-2 text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg transition-transform duration-300 hover:-translate-y-[1px]`}
            >
              <span className="relative z-10 flex items-center justify-center gap-2"><span className="inline-block">✔</span>{tSymbol('saveAndClose')}</span>
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
