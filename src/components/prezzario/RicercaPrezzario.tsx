import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { VocePrezzario } from '@/types';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface RicercaPrezzarioProps {
  onSelect: (voce: VocePrezzario) => void;
  onClose: () => void;
}

export function RicercaPrezzario({ onSelect, onClose }: RicercaPrezzarioProps) {
  const { state } = useApp();
  const [search, setSearch] = useState('');
  const [filtroUM, setFiltroUM] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 150);

  useEffect(() => {
    // Focus e blocca scroll body
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const categorie = useMemo(() => {
    const set = new Set<string>();
    state.prezzario.forEach(v => { if (v.categoria) set.add(v.categoria); });
    return Array.from(set).sort();
  }, [state.prezzario]);

  const unitaMisuraUniche = useMemo(() => {
    const set = new Set<string>();
    state.prezzario.forEach(v => set.add(v.unitaMisura));
    return Array.from(set).sort();
  }, [state.prezzario]);

  const risultati = useMemo(() => {
    let voci = state.prezzario;
    if (filtroUM) voci = voci.filter(v => v.unitaMisura === filtroUM);
    if (filtroCategoria) voci = voci.filter(v => v.categoria === filtroCategoria);
    if (debouncedSearch.trim()) {
      const s = debouncedSearch.toLowerCase();
      voci = voci.filter(v =>
        v.codice.toLowerCase().includes(s) ||
        v.descrizione.toLowerCase().includes(s) ||
        (v.categoria ?? '').toLowerCase().includes(s)
      );
    }
    return voci.slice(0, 150);
  }, [state.prezzario, debouncedSearch, filtroUM, filtroCategoria]);

  const handleSelect = (voce: VocePrezzario) => {
    onSelect(voce);
    onClose();
  };

  return (
    // Overlay — position fixed, copre tutto lo schermo
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {/* Pannello */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '760px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Barra ricerca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <Search style={{ width: '20px', height: '20px', color: '#9ca3af', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per codice, descrizione, categoria..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: '16px', color: '#111827', backgroundColor: 'transparent',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}>
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          )}
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px', marginLeft: '4px' }}>
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Filtri */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', flexWrap: 'wrap' }}>
          <Filter style={{ width: '14px', height: '14px', color: '#9ca3af' }} />
          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff', maxWidth: '240px' }}
          >
            <option value="">Tutte le categorie</option>
            {categorie.map(c => <option key={c} value={c}>{c.length > 50 ? c.slice(0, 50) + '…' : c}</option>)}
          </select>
          <select
            value={filtroUM}
            onChange={e => setFiltroUM(e.target.value)}
            style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff' }}
          >
            <option value="">Tutte le U.M.</option>
            {unitaMisuraUniche.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          {(filtroCategoria || filtroUM) && (
            <button onClick={() => { setFiltroCategoria(''); setFiltroUM(''); }} style={{ fontSize: '12px', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>
              × Azzera filtri
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af' }}>
            {risultati.length} {risultati.length === 150 ? '(max 150)' : ''} voci
          </span>
        </div>

        {/* Lista risultati */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {state.prezzario.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
              <p style={{ fontWeight: 600, fontSize: '16px' }}>Prezzario vuoto</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>Importa un CSV dal tab Prezzario.</p>
            </div>
          ) : risultati.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
              <p style={{ fontWeight: 600, fontSize: '16px' }}>Nessun risultato</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>Prova a modificare la ricerca o i filtri.</p>
            </div>
          ) : risultati.map(voce => (
            <button
              key={voce.id}
              onClick={() => handleSelect(voce)}
              style={{
                width: '100%', textAlign: 'left', padding: '12px 16px',
                borderBottom: '1px solid #f3f4f6', border: 'none',
                backgroundColor: 'transparent', cursor: 'pointer',
                display: 'block', transition: 'background-color 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#eff6ff')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#1d4ed8', fontWeight: 600 }}>{voce.codice}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid #d1d5db', borderRadius: '4px', color: '#6b7280' }}>{voce.unitaMisura}</span>
                {voce.categoria && (
                  <span style={{ fontSize: '11px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                    {voce.categoria}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '14px', color: '#111827', flexShrink: 0 }}>
                  € {voce.prezzoUnitario.toFixed(2)}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#374151', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {voce.descrizione}
              </p>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', gap: '16px', fontSize: '12px', color: '#9ca3af' }}>
          <span>Clicca una voce per selezionarla</span>
          <span>·</span>
          <span>Esc per chiudere</span>
        </div>
      </div>
    </div>
  );
}
