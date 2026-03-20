import { useCallback } from 'react';
import { Plus, Trash2, Copy, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/store/AppContext';
import { useRicercaPrezzario } from '@/App';
import type { RigaComputo, Misurazione, UnitàMisura } from '@/types';
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
      const titoloBreve = voce.voceBreve?.trim() || voce.descrizione.slice(0, 120);
      const descCompleta = voce.descrizione;
      
      dispatch({
        type: 'UPDATE_RIGA',
        payload: {
          id: rigaId,
          updates: {
            codice: voce.codice,
            descrizione: titoloBreve,
            unitaMisura: voce.unitaMisura,
            prezzoUnitario: voce.prezzoUnitario,
            note: descCompleta !== titoloBreve ? `__desc__${descCompleta}` : undefined,
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
  const handleDeleteMisurazione = (rigaId: string, misurazioneId: string) =>
    dispatch({ type: 'DELETE_MISURAZIONE', payload: { rigaId, misurazioneId } });

  // Prepara le righe per la tabella Excel-style
  const righeTabella: Array<{
    riga: RigaComputo;
    misurazione: Misurazione;
    isFirstMisurazione: boolean;
    rowspan: number;
  }> = [];

  righe.forEach(riga => {
    riga.misurazioni.forEach((mis, index) => {
      righeTabella.push({
        riga,
        misurazione: mis,
        isFirstMisurazione: index === 0,
        rowspan: riga.misurazioni.length
      });
    });
  });

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
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-16">N°</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-32">Codice Articolo</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[200px]">Descrizione Lavori</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-12">±</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[150px]">Dettaglio Misurazione</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-20">Parti Uguali</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Lunghezza (m)</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Larghezza (m)</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">H/Peso</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Quantità</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-28">Prezzo Unitario</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-32">Importo Totale</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-20">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {righeTabella.map((item) => {
                  const { riga, misurazione, isFirstMisurazione, rowspan } = item;
                  const formula = UNITA_MISURA_FORMULE[riga.unitaMisura as UnitàMisura];
                  const isManuale = !formula.richiedeLunghezza && !formula.richiedeLarghezza && !formula.richiedeAltezza;
                  const isNeg = misurazione.segno === -1;
                  const quantitaMisurazione = isManuale ? misurazione.quantitaParziale : 
                    (misurazione.lunghezza || 0) * (misurazione.larghezza || 0) * (misurazione.altezza || 0) * (misurazione.partiUguali || 1);
                  const importoMisurazione = quantitaMisurazione * riga.prezzoUnitario * misurazione.segno;

                  return (
                    <tr key={`${riga.id}-${misurazione.id}`} className={`border-b border-gray-100 hover:bg-gray-50/50 ${isNeg ? 'bg-red-50/30' : ''}`}>
                      {/* Numero - solo per la prima misurazione */}
                      {isFirstMisurazione && (
                        <td className="px-3 py-2 text-center text-sm font-bold text-gray-500" rowSpan={rowspan}>
                          {righe.findIndex(r => r.id === riga.id) + 1}
                        </td>
                      )}

                      {/* Codice Articolo - solo per la prima misurazione */}
                      {isFirstMisurazione && (
                        <td className="px-3 py-2" rowSpan={rowspan}>
                          <input
                            value={riga.codice}
                            onChange={(e) => handleUpdateRiga(riga.id, { codice: e.target.value })}
                            placeholder="Codice"
                            className="w-full h-8 px-2 text-xs font-mono bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-400"
                          />
                        </td>
                      )}

                      {/* Descrizione Lavori - solo per la prima misurazione */}
                      {isFirstMisurazione && (
                        <td className="px-3 py-2" rowSpan={rowspan}>
                          <div className="space-y-1">
                            <input
                              value={riga.descrizione}
                              onChange={(e) => handleUpdateRiga(riga.id, { descrizione: e.target.value })}
                              placeholder="Descrizione lavorazione..."
                              className="w-full h-8 px-2 text-sm font-medium bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-400"
                            />
                            <select
                              value={riga.unitaMisura}
                              onChange={(e) => handleUpdateRiga(riga.id, { unitaMisura: e.target.value as UnitàMisura })}
                              className="w-full h-6 px-1 text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-400"
                            >
                              {Object.entries(UNITA_MISURA_FORMULE).map(([key]: [string, typeof UNITA_MISURA_FORMULE[UnitàMisura]]) => (
                                <option key={key} value={key}>{key}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      )}

                      {/* Segno */}
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleUpdateMisurazione(riga.id, misurazione.id, { segno: isNeg ? 1 : -1 })}
                          className={`w-8 h-8 rounded font-bold text-sm flex items-center justify-center mx-auto transition-colors ${isNeg ? 'bg-red-200 text-red-700 hover:bg-red-300' : 'bg-green-200 text-green-700 hover:bg-green-300'}`}
                        >
                          {isNeg ? '−' : '+'}
                        </button>
                      </td>

                      {/* Dettaglio Misurazione */}
                      <td className="px-3 py-2">
                        <input
                          value={misurazione.descrizione}
                          onChange={(e) => handleUpdateMisurazione(riga.id, misurazione.id, { descrizione: e.target.value })}
                          placeholder="es: piano terra, bagno..."
                          className="w-full h-8 px-2 text-sm border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded hover:bg-white/50 transition-colors"
                        />
                      </td>

                      {/* Parti Uguali */}
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          value={misurazione.partiUguali ?? 1}
                          onChange={(e) => handleUpdateMisurazione(riga.id, misurazione.id, { partiUguali: e.target.value ? parseFloat(e.target.value) : 1 })}
                          placeholder="1"
                          className="w-full h-8 px-2 text-sm text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded font-medium"
                          step="1"
                          min="1"
                        />
                      </td>

                      {/* Lunghezza */}
                      <td className="px-3 py-2 text-center">
                        {formula.richiedeLunghezza ? (
                          <input
                            type="number"
                            value={misurazione.lunghezza ?? ''}
                            onChange={(e) => handleUpdateMisurazione(riga.id, misurazione.id, { lunghezza: e.target.value ? parseFloat(e.target.value) : null })}
                            placeholder="0.00"
                            className="w-full h-8 px-2 text-sm text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded"
                            step="0.01"
                          />
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Larghezza */}
                      <td className="px-3 py-2 text-center">
                        {formula.richiedeLarghezza ? (
                          <input
                            type="number"
                            value={misurazione.larghezza ?? ''}
                            onChange={(e) => handleUpdateMisurazione(riga.id, misurazione.id, { larghezza: e.target.value ? parseFloat(e.target.value) : null })}
                            placeholder="0.00"
                            className="w-full h-8 px-2 text-sm text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded"
                            step="0.01"
                          />
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Altezza/Peso */}
                      <td className="px-3 py-2 text-center">
                        {formula.richiedeAltezza ? (
                          <input
                            type="number"
                            value={misurazione.altezza ?? ''}
                            onChange={(e) => handleUpdateMisurazione(riga.id, misurazione.id, { altezza: e.target.value ? parseFloat(e.target.value) : null })}
                            placeholder="0.00"
                            className="w-full h-8 px-2 text-sm text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded"
                            step="0.01"
                          />
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Quantità */}
                      <td className="px-3 py-2 text-center font-medium">
                        {isManuale ? (
                          <input
                            type="number"
                            value={misurazione.quantitaParziale || ''}
                            onChange={(e) => handleUpdateMisurazione(riga.id, misurazione.id, { quantitaParziale: e.target.value ? parseFloat(e.target.value) : 0 })}
                            placeholder="0.00"
                            className="w-full h-8 px-2 text-sm text-center border-0 bg-transparent focus:ring-1 focus:ring-blue-400 rounded font-bold"
                            step="0.01"
                          />
                        ) : (
                          <span className={`${isNeg ? 'text-red-600' : 'text-gray-700'}`}>
                            {formattaNumero(Math.abs(quantitaMisurazione))}
                          </span>
                        )}
                      </td>

                      {/* Prezzo Unitario - solo per la prima misurazione */}
                      {isFirstMisurazione && (
                        <td className="px-3 py-2 text-center" rowSpan={rowspan}>
                          <input
                            type="number"
                            value={riga.prezzoUnitario || ''}
                            onChange={(e) => handleUpdateRiga(riga.id, { prezzoUnitario: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                            className="w-full h-8 px-2 text-sm text-center font-medium bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-400"
                            step="0.01"
                          />
                        </td>
                      )}

                      {/* Importo Totale */}
                      <td className="px-3 py-2 text-center font-bold text-blue-700">
                        {formattaImporto(importoMisurazione)}
                      </td>

                      {/* Azioni */}
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isFirstMisurazione && (
                            <>
                              <button onClick={() => handleOpenRicerca(riga.id)} title="Cerca nel prezzario" className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                <Search className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDuplicateRiga(riga.id)} title="Duplica voce" className="p-1 text-gray-500 hover:bg-gray-100 rounded">
                                <Copy className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteRiga(riga.id)} title="Elimina voce" className="p-1 text-red-500 hover:bg-red-50 rounded">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button onClick={() => handleAddMisurazione(riga.id)} title="Aggiungi misurazione" className="p-1 text-green-600 hover:bg-green-50 rounded">
                            <Plus className="w-4 h-4" />
                          </button>
                          {riga.misurazioni.length > 1 && (
                            <button onClick={() => handleDeleteMisurazione(riga.id, misurazione.id)} title="Elimina misurazione" className="p-1 text-red-500 hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
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
      )}
    </div>
  );
}
