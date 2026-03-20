import { useCallback } from 'react';
import React from 'react';
import { Plus, Trash2, Copy, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UnitàMisura, Misurazione, RigaComputo } from '@/types';
import { useApp } from '@/store/AppContext';
import { useRicercaPrezzario } from '@/App';
import { UNITA_MISURA_FORMULE } from '@/types';
import { formattaImporto, formattaNumero } from '@/utils/exportUtils';

// ============================================================
// TABELLA PRINCIPALE STILE EXCEL
// ============================================================
interface TabellaComputoProps {
  categoriaId: string;
}

export function TabellaComputo({ categoriaId }: TabellaComputoProps) {
  const { dispatch, getRighePerCategoria, totaliPerCategoria } = useApp();
  const { apriRicerca } = useRicercaPrezzario();
  const righe = getRighePerCategoria(categoriaId);
  const totaleCategoria = totaliPerCategoria.find((t: any) => t.categoriaId === categoriaId)?.totale || 0;
  
  const handleOpenRicerca = useCallback((rigaId: string) => {
    apriRicerca((voce) => {
      dispatch({
        type: 'UPDATE_RIGA',
        payload: {
          id: rigaId,
          updates: {
            codice: voce.codice,
            descrizione: voce.descrizione,
            unitaMisura: voce.unitaMisura,
            prezzoUnitario: voce.prezzoUnitario,
            note: undefined,
          },
        }
      });
    });
  }, [apriRicerca, dispatch]);

  const handleAddRiga = () => dispatch({ type: 'ADD_RIGA', payload: { categoriaId } });
  const handleUpdateRiga = (id: string, updates: Partial<RigaComputo>) => dispatch({ type: 'UPDATE_RIGA', payload: { id, updates } });
  const handleDeleteRiga = (id: string) => {
    if (confirm('Eliminare questa voce?')) dispatch({ type: 'DELETE_RIGA', payload: id });
  };
  const handleDuplicateRiga = (id: string) => dispatch({ type: 'DUPLICATE_RIGA', payload: id });
  const handleAddMisurazione = (rigaId: string) => dispatch({ type: 'ADD_MISURAZIONE', payload: { rigaId } });
  const handleUpdateMisurazione = (rigaId: string, misurazioneId: string, updates: Partial<Misurazione>) =>
    dispatch({ type: 'UPDATE_MISURAZIONE', payload: { rigaId, misurazioneId, updates } });
  const calcolaQuantitaMisurazione = (unitaMisura: UnitàMisura, mis: Misurazione) => {
    const formula = UNITA_MISURA_FORMULE[unitaMisura];
    if (formula.richiedeLunghezza || formula.richiedeLarghezza || formula.richiedeAltezza) {
      const l = mis.lunghezza ?? 0;
      const la = mis.larghezza ?? 0;
      const a = mis.altezza ?? 0;
      if (formula.richiedeLunghezza && l === 0) return 0;
      if (formula.richiedeLarghezza && la === 0) return 0;
      if (formula.richiedeAltezza && a === 0) return 0;
      return formula.formula(l, la, a) * (mis.partiUguali ?? 1);
    }
    return mis.quantitaParziale ?? 0;
  };

  const calcolaQuantitaRiga = (riga: RigaComputo) =>
    riga.misurazioni.reduce((sum, m) => sum + calcolaQuantitaMisurazione(riga.unitaMisura, m) * m.segno, 0);

  const handleDeleteMisurazione = (rigaId: string, misurazioneId: string) =>
    dispatch({ type: 'DELETE_MISURAZIONE', payload: { rigaId, misurazioneId } });

  return (
    <div className="py-2">
      {righe.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
          <p className="text-gray-400 text-sm mb-4">Nessuna voce in questa categoria</p>
          <Button onClick={handleAddRiga} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Aggiungi la prima voce
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-2 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-10">N°</th>
                  <th className="px-2 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-20">Tariffa</th>
                  <th className="px-2 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[260px]">Descrizione</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-14">U.M.</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-14">Parti</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-14">Lung.</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-14">Larg.</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-14">H/Peso</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-16">Q</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-18">Prezzo Unit.</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-20">Importo</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-18">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {righe.map((riga, index) => {
                  const formula = UNITA_MISURA_FORMULE[riga.unitaMisura as UnitàMisura];
                  const descrizioneCompleta = riga.note?.startsWith('__desc__') ? riga.note.replace('__desc__', '') : riga.descrizione;
                  const quantitaTotale = calcolaQuantitaRiga(riga);
                  const importoTotale = quantitaTotale * riga.prezzoUnitario;

                  return (
                    <React.Fragment key={riga.id}>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <td className="px-2 py-3 text-center text-sm font-bold">{index + 1}</td>
                        <td className="px-2 py-3">
                          <input
                            value={riga.codice}
                            onChange={(e) => handleUpdateRiga(riga.id, { codice: e.target.value })}
                            placeholder="Tariffa"
                            className="w-full h-8 px-2 text-xs font-mono bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-2 py-3 align-top">
                          <textarea
                            value={descrizioneCompleta}
                            onChange={(e) => handleUpdateRiga(riga.id, { descrizione: e.target.value, note: undefined })}
                            placeholder="Designazione dei lavori..."
                            className="w-full min-h-[86px] px-2 py-1 text-sm font-normal bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 resize-none"
                          />
                        </td>
                        <td className="px-2 py-3 text-center text-sm font-semibold">{riga.unitaMisura || '—'}</td>
                        <td className="px-2 py-3 text-center text-sm font-normal">—</td>
                        <td className="px-2 py-3 text-center text-sm font-normal">—</td>
                        <td className="px-2 py-3 text-center text-sm font-normal">—</td>
                        <td className="px-2 py-3 text-center text-sm font-normal">—</td>
                        <td className="px-2 py-3 text-center text-sm font-semibold">{formattaNumero(quantitaTotale)}</td>
                        <td className="px-2 py-3 text-center">
                          <input
                            type="number"
                            value={riga.prezzoUnitario || ''}
                            onChange={(e) => handleUpdateRiga(riga.id, { prezzoUnitario: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                            className="w-20 h-8 px-2 text-sm text-center font-medium bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-400"
                            step="0.01"
                          />
                        </td>
                        <td className="px-2 py-3 text-center font-bold text-blue-700">{formattaImporto(importoTotale)}</td>
                        <td className="px-2 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleOpenRicerca(riga.id)} title="Cerca nel prezzario" className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                              <Search className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDuplicateRiga(riga.id)} title="Duplica voce" className="p-1 text-gray-500 hover:bg-gray-100 rounded">
                              <Copy className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteRiga(riga.id)} title="Elimina voce" className="p-1 text-red-500 hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {riga.misurazioni.map((mis, misIndex) => {
                        const qMis = calcolaQuantitaMisurazione(riga.unitaMisura, mis);
                        const importoMisurazione = qMis * riga.prezzoUnitario * mis.segno;

                        return (
                          <tr key={mis.id} className="border-b border-gray-100 bg-white">
                            <td className="px-2 py-1 text-center text-xs text-gray-500">{index + 1}.{misIndex + 1}</td>
                            <td className="px-2 py-1"></td>
                            <td className="px-2 py-1">
                              <input
                                value={mis.descrizione}
                                onChange={(e) => handleUpdateMisurazione(riga.id, mis.id, { descrizione: e.target.value })}
                                placeholder="Descrizione misurazione"
                                className="w-full h-7 px-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-400"
                              />
                            </td>
                            <td className="px-2 py-1 text-center text-xs">{riga.unitaMisura}</td>
                            <td className="px-2 py-1 text-center">
                              <input
                                type="number"
                                value={mis.partiUguali ?? 1}
                                onChange={(e) => handleUpdateMisurazione(riga.id, mis.id, { partiUguali: e.target.value ? parseFloat(e.target.value) : 1 })}
                                className="w-14 h-7 px-1 text-xs text-center border border-gray-200 rounded focus:ring-1 focus:ring-blue-400"
                                step="1"
                                min="1"
                              />
                            </td>
                            <td className="px-2 py-1 text-center">
                              {formula.richiedeLunghezza ? (
                                <input
                                  type="number"
                                  value={mis.lunghezza ?? ''}
                                  onChange={(e) => handleUpdateMisurazione(riga.id, mis.id, { lunghezza: e.target.value ? parseFloat(e.target.value) : null })}
                                  className="w-14 h-7 px-1 text-xs text-center border border-gray-200 rounded focus:ring-1 focus:ring-blue-400"
                                  step="0.01"
                                />
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-2 py-1 text-center">
                              {formula.richiedeLarghezza ? (
                                <input
                                  type="number"
                                  value={mis.larghezza ?? ''}
                                  onChange={(e) => handleUpdateMisurazione(riga.id, mis.id, { larghezza: e.target.value ? parseFloat(e.target.value) : null })}
                                  className="w-14 h-7 px-1 text-xs text-center border border-gray-200 rounded focus:ring-1 focus:ring-blue-400"
                                  step="0.01"
                                />
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-2 py-1 text-center">
                              {formula.richiedeAltezza ? (
                                <input
                                  type="number"
                                  value={mis.altezza ?? ''}
                                  onChange={(e) => handleUpdateMisurazione(riga.id, mis.id, { altezza: e.target.value ? parseFloat(e.target.value) : null })}
                                  className="w-14 h-7 px-1 text-xs text-center border border-gray-200 rounded focus:ring-1 focus:ring-blue-400"
                                  step="0.01"
                                />
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-2 py-1 text-center text-xs font-semibold">{formattaNumero(Math.abs(qMis))}</td>
                            <td className="px-2 py-1"></td>
                            <td className="px-2 py-1 text-center text-xs font-bold text-blue-700">{formattaImporto(importoMisurazione)}</td>
                            <td className="px-2 py-1 text-center">
                              <div className="flex justify-center gap-1">
                                <button onClick={() => handleAddMisurazione(riga.id)} title="Aggiungi misurazione" className="p-1 text-green-600 hover:bg-green-50 rounded">
                                  <Plus className="w-3 h-3" />
                                </button>
                                {riga.misurazioni.length > 1 && (
                                  <button onClick={() => handleDeleteMisurazione(riga.id, mis.id)} title="Elimina misurazione" className="p-1 text-red-500 hover:bg-red-50 rounded">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      <tr className="bg-blue-50 text-xs font-bold">
                        <td className="px-2 py-2 text-center" colSpan={8}>SOMMANO</td>
                        <td className="px-2 py-2 text-center">{formattaNumero(quantitaTotale)}</td>
                        <td className="px-2 py-2 text-center"></td>
                        <td className="px-2 py-2 text-center font-bold">{formattaImporto(importoTotale)}</td>
                        <td className="px-2 py-2"></td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center bg-blue-600 text-white px-6 py-4 rounded-xl shadow-lg mt-4">
             <Button onClick={handleAddRiga} className="bg-white text-blue-700 hover:bg-blue-50 border-0 font-bold gap-2">
               <Plus className="w-5 h-5" /> Aggiungi Voce
             </Button>
             <div className="text-right">
                <span className="text-xs opacity-80 uppercase font-bold block">Totale Categoria</span>
                <span className="text-2xl font-black">{formattaImporto(totaleCategoria)}</span>
             </div>
          </div>
        </>
      )}    </div>
  );
}
