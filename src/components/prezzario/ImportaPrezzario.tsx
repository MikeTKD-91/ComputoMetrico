import { useState, useCallback } from 'react';
import { Plus, Search, Trash2, Edit2, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/store/AppContext';
import { UNITA_MISURA_FORMULE } from '@/types';
import type { VocePrezzario, UnitàMisura } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const UNITA_OPTIONS = Object.keys(UNITA_MISURA_FORMULE) as UnitàMisura[];

function VoceForm({
  voce,
  onSave,
  onCancel,
}: {
  voce: Partial<VocePrezzario>;
  onSave: (v: VocePrezzario) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    codice: voce.codice ?? '',
    descrizione: voce.descrizione ?? '',
    unitaMisura: voce.unitaMisura ?? ('mq' as UnitàMisura),
    prezzoUnitario: voce.prezzoUnitario ?? 0,
    categoria: voce.categoria ?? '',
  });

  const valid = form.codice.trim() && form.descrizione.trim() && form.prezzoUnitario > 0;

  const handleSave = () => {
    if (!valid) return;
    onSave({
      id: voce.id ?? uuidv4(),
      codice: form.codice.trim(),
      descrizione: form.descrizione.trim(),
      unitaMisura: form.unitaMisura,
      prezzoUnitario: form.prezzoUnitario,
      categoria: form.categoria.trim() || undefined,
    });
  };

  return (
    <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Codice *</label>
          <Input
            value={form.codice}
            onChange={(e) => setForm(f => ({ ...f, codice: e.target.value }))}
            placeholder="es: DEM.001"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Categoria</label>
          <Input
            value={form.categoria}
            onChange={(e) => setForm(f => ({ ...f, categoria: e.target.value }))}
            placeholder="es: Demolizioni"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Descrizione *</label>
        <Input
          value={form.descrizione}
          onChange={(e) => setForm(f => ({ ...f, descrizione: e.target.value }))}
          placeholder="Descrizione della lavorazione"
          className="h-8 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Unità di misura *</label>
          <select
            value={form.unitaMisura}
            onChange={(e) => setForm(f => ({ ...f, unitaMisura: e.target.value as UnitàMisura }))}
            className="w-full h-8 px-2 text-sm border rounded bg-white"
          >
            {UNITA_OPTIONS.map(u => (
              <option key={u} value={u}>{u} — {UNITA_MISURA_FORMULE[u].descrizione}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Prezzo unitario (€) *</label>
          <Input
            type="number"
            value={form.prezzoUnitario || ''}
            onChange={(e) => setForm(f => ({ ...f, prezzoUnitario: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
            className="h-8 text-sm"
            step="0.01"
            min="0"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}><X className="h-3 w-3 mr-1" />Annulla</Button>
        <Button size="sm" onClick={handleSave} disabled={!valid}><Check className="h-3 w-3 mr-1" />Salva</Button>
      </div>
    </div>
  );
}

export function ImportaPrezzario() {
  const { state, dispatch } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const itemsPerPage = 15;

  const voci = state.prezzario;

  const filtered = useCallback(() => {
    if (!searchTerm.trim()) return voci;
    const s = searchTerm.toLowerCase();
    return voci.filter(v =>
      v.codice.toLowerCase().includes(s) ||
      v.descrizione.toLowerCase().includes(s) ||
      (v.categoria ?? '').toLowerCase().includes(s)
    );
  }, [voci, searchTerm])();

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAdd = (v: VocePrezzario) => {
    dispatch({ type: 'ADD_VOCE_PREZZARIO', payload: v });
    // persist
    const updated = [...state.prezzario, v];
    localStorage.setItem('prezzario', JSON.stringify(updated));
    setShowAddForm(false);
  };

  const handleEdit = (v: VocePrezzario) => {
    // Remove old, add updated
    const updated = state.prezzario.map(p => p.id === v.id ? v : p);
    dispatch({ type: 'SET_PREZZARIO', payload: updated });
    localStorage.setItem('prezzario', JSON.stringify(updated));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Eliminare questa voce dal prezzario?')) return;
    dispatch({ type: 'REMOVE_VOCE_PREZZARIO', payload: id });
    const updated = state.prezzario.filter(p => p.id !== id);
    localStorage.setItem('prezzario', JSON.stringify(updated));
  };

  const handleClearAll = () => {
    if (!confirm('Eliminare TUTTO il prezzario?')) return;
    dispatch({ type: 'SET_PREZZARIO', payload: [] });
    localStorage.setItem('prezzario', JSON.stringify([]));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Prezzario</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{voci.length} voci</Badge>
              {voci.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearAll} className="text-red-500 border-red-200 hover:bg-red-50">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Svuota tutto
                </Button>
              )}
              <Button size="sm" onClick={() => { setShowAddForm(true); setEditingId(null); }}>
                <Plus className="h-3 w-3 mr-1" />
                Aggiungi voce
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Nuova voce</h3>
              <VoceForm voce={{}} onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
            </div>
          )}

          {voci.length === 0 && !showAddForm ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-medium">Prezzario vuoto</p>
              <p className="text-sm mt-1">Aggiungi voci manualmente con il pulsante qui sopra.</p>
            </div>
          ) : (
            <>
              {/* Ricerca */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Cerca per codice, descrizione o categoria..."
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* Tabella voci */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 w-28">Codice</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Descrizione</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 w-24">Categoria</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600 w-16">U.M.</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600 w-28">Prezzo €</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600 w-20">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Nessun risultato per "{searchTerm}"</td></tr>
                    ) : (
                      paginated.map((voce) => (
                        editingId === voce.id ? (
                          <tr key={voce.id}>
                            <td colSpan={6} className="px-3 py-2">
                              <VoceForm voce={voce} onSave={handleEdit} onCancel={() => setEditingId(null)} />
                            </td>
                          </tr>
                        ) : (
                          <tr key={voce.id} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-blue-600 text-xs">{voce.codice}</td>
                            <td className="px-3 py-2 text-gray-800">{voce.descrizione}</td>
                            <td className="px-3 py-2 text-gray-500 text-xs">{voce.categoria ?? '—'}</td>
                            <td className="px-3 py-2 text-center"><Badge variant="outline" className="text-xs">{voce.unitaMisura}</Badge></td>
                            <td className="px-3 py-2 text-right font-medium">€ {voce.prezzoUnitario.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => { setEditingId(voce.id); setShowAddForm(false); }} className="text-gray-400 hover:text-blue-600 p-1" title="Modifica"><Edit2 className="h-3.5 w-3.5" /></button>
                                <button onClick={() => handleDelete(voce.id)} className="text-gray-400 hover:text-red-600 p-1" title="Elimina"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginazione */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                  <span>{filtered.length} voci {searchTerm && `(filtrate su ${voci.length})`}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span>Pag. {currentPage} / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
