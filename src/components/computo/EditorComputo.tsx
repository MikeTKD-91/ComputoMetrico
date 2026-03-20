import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Calculator,
  FileDown,
  User,
  LayoutList,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/store/AppContext';
import { ToolbarPrimus } from '@/components/ToolbarPrimus';
import { TabellaComputo } from './TabellaComputo';
import { esportaComputoPDF, esportaComputoExcel, formattaImporto } from '@/utils/exportUtils';
import type { Categoria } from '@/types';

// ============================================
// COMPONENTE GESTIONE CATEGORIE
// ============================================
function GestioneCategorie() {
  const { state, dispatch } = useApp();
  const [nuovaCategoria, setNuovaCategoria] = useState('');
  const [categoriaInModifica, setCategoriaInModifica] = useState<Categoria | null>(null);
  const [nomeModifica, setNomeModifica] = useState('');
  const [categoriaPadre, setCategoriaPadre] = useState<string>('');
  const [capitoliSelezionati, setCapitoliSelezionati] = useState<Set<string>>(new Set());
  const [sottocategorieDaCreare, setSottocategorieDaCreare] = useState('');
  const [showCreaSottocategorie, setShowCreaSottocategorie] = useState<boolean>(true);

  const categoriePadre = state.computoCorrente?.categorie.filter(c => !c.parentId) || [];
  const categorieFiglie = state.computoCorrente?.categorie.filter(c => c.parentId) || [];

  const handleAggiungi = () => {
    if (nuovaCategoria.trim()) {
      dispatch({
        type: 'ADD_CATEGORIA',
        payload: { 
          nome: nuovaCategoria.trim(),
          parentId: categoriaPadre || undefined
        }
      });
      setNuovaCategoria('');
      setCategoriaPadre('');
    }
  };

  const handleCreaSottocategorie = () => {
    if (sottocategorieDaCreare.trim() && capitoliSelezionati.size > 0) {
      const nomiSottocategorie = sottocategorieDaCreare.split(',').map(n => n.trim()).filter(n => n);
      
      nomiSottocategorie.forEach(nome => {
        capitoliSelezionati.forEach(capId => {
          dispatch({
            type: 'ADD_CATEGORIA',
            payload: { 
              nome: nome,
              parentId: capId
            }
          });
        });
      });
      
      setSottocategorieDaCreare('');
      setCapitoliSelezionati(new Set());
      setShowCreaSottocategorie(false);
    }
  };

  const toggleCapitoloSelezionato = (capId: string) => {
    const nuoviSelezionati = new Set(capitoliSelezionati);
    if (nuoviSelezionati.has(capId)) {
      nuoviSelezionati.delete(capId);
    } else {
      nuoviSelezionati.add(capId);
    }
    setCapitoliSelezionati(nuoviSelezionati);
  };

  const selezionaTuttiCapitoli = () => {
    setCapitoliSelezionati(new Set(categoriePadre.map(c => c.id)));
  };

  const deselezionaTuttiCapitoli = () => {
    setCapitoliSelezionati(new Set());
  };

  const handleSalvaModifica = () => {
    if (categoriaInModifica && nomeModifica.trim()) {
      dispatch({
        type: 'UPDATE_CATEGORIA',
        payload: { id: categoriaInModifica.id, updates: { nome: nomeModifica.trim() } }
      });
      setCategoriaInModifica(null);
    }
  };

  const handleElimina = (id: string) => {
    const categoria = state.computoCorrente?.categorie.find(c => c.id === id);
    if (confirm(`Eliminare la categoria "${categoria?.nome}"?`)) {
      dispatch({ type: 'DELETE_CATEGORIA', payload: id });
    }
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <LayoutList className="w-5 h-5 text-blue-600" /> Capitoli e Categorie
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="flex gap-2 mb-6">
          <div className="flex-1 space-y-2">
            <Input
              value={nuovaCategoria}
              onChange={(e) => setNuovaCategoria(e.target.value)}
              placeholder="Nuovo capitolo o sottocategoria"
              onKeyDown={(e) => e.key === 'Enter' && handleAggiungi()}
              className="bg-white"
            />
            {categoriePadre.length > 0 && showCreaSottocategorie && (
              <select
                value={categoriaPadre}
                onChange={(e) => setCategoriaPadre(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-blue-400"
              >
                <option value="">— Capitolo principale —</option>
                {categoriePadre.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            )}
          </div>
          <Button onClick={handleAggiungi} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Aggiungi
          </Button>
        </div>

        {/* Sezione creazione sottocategorie multiple */}
        {categoriePadre.length > 0 && showCreaSottocategorie && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-blue-800">Crea sottocategorie per capitoli selezionati</h3>
              <div className="flex gap-2">
                <Button 
                  onClick={selezionaTuttiCapitoli} 
                  size="sm" 
                  variant="outline"
                  className="text-xs"
                >
                  Seleziona tutti
                </Button>
                <Button 
                  onClick={deselezionaTuttiCapitoli} 
                  size="sm" 
                  variant="outline"
                  className="text-xs"
                >
                  Deseleziona tutti
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
              {categoriePadre.map(cat => (
                <label key={cat.id} className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={capitoliSelezionati.has(cat.id)}
                    onChange={() => toggleCapitoloSelezionato(cat.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{cat.nome}</span>
                </label>
              ))}
            </div>

            {capitoliSelezionati.size > 0 && (
              <div className="flex gap-2">
                <Input
                  value={sottocategorieDaCreare}
                  onChange={(e) => setSottocategorieDaCreare(e.target.value)}
                  placeholder="Nomi sottocategorie (separati da virgola)"
                  className="flex-1 bg-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreaSottocategorie()}
                />
                <Button onClick={handleCreaSottocategorie} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" /> Crea sottocategorie
                </Button>
              </div>
            )}
            
            {capitoliSelezionati.size > 0 && (
              <p className="text-xs text-blue-600 mt-2">
                Verranno create {sottocategorieDaCreare.split(',').filter(n => n.trim()).length} sottocategorie per {capitoliSelezionati.size} capitoli selezionati
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          {categoriePadre.map((cat, index) => (
            <div key={cat.id}>
              <div className={`flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors group ${
                capitoliSelezionati.has(cat.id) ? 'bg-blue-50 border-blue-300' : 'bg-white'
              }`}>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={capitoliSelezionati.has(cat.id)}
                    onChange={() => toggleCapitoloSelezionato(cat.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 w-6 h-6 flex items-center justify-center rounded-full">{index + 1}</span>
                  <span className="font-semibold text-gray-700">{cat.nome}</span>
                  <Badge variant="outline" className="text-xs">Capitolo</Badge>
                  {capitoliSelezionati.has(cat.id) && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Selezionato</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setCategoriaInModifica(cat); setNomeModifica(cat.nome); }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleElimina(cat.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Sottocategorie */}
              {categorieFiglie.filter(sotto => sotto.parentId === cat.id).map((sottoCat, sottoIndex) => (
                <div key={sottoCat.id} className="flex items-center justify-between p-3 ml-8 mt-1 bg-blue-50 border border-blue-200 rounded-lg hover:border-blue-300 transition-colors group">
                  {categoriaInModifica?.id === sottoCat.id ? (
                    <div className="flex flex-1 gap-2">
                      <Input
                        value={nomeModifica}
                        onChange={(e) => setNomeModifica(e.target.value)}
                        className="h-9"
                        autoFocus
                      />
                      <Button onClick={handleSalvaModifica} size="sm" className="bg-green-600">Salva</Button>
                      <Button onClick={() => setCategoriaInModifica(null)} variant="ghost" size="sm">Annulla</Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-blue-400 bg-blue-100 w-5 h-5 flex items-center justify-center rounded-full">{index + 1}.{sottoIndex + 1}</span>
                        <span className="font-medium text-gray-700">{sottoCat.nome}</span>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Sottocategoria</Badge>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setCategoriaInModifica(sottoCat); setNomeModifica(sottoCat.nome); }}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleElimina(sottoCat.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// COMPONENTE INTESTAZIONE
// ============================================
function IntestazioneComputo() {
  const { state, dispatch } = useApp();
  
  const updateIntestazione = (field: string, value: string) => {
    if (!state.computoCorrente) return;
    dispatch({
      type: 'UPDATE_COMPUTO',
      payload: {
        id: state.computoCorrente.id,
        updates: {
          intestazione: {
            ...state.computoCorrente.intestazione,
            [field]: value
          }
        }
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
       <Card className="border-gray-200 shadow-sm">
         <CardHeader>
           <CardTitle className="text-lg flex items-center gap-2">
             <User className="w-5 h-5 text-blue-600" /> Dati Cliente
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome Cliente / Azienda</Label>
              <Input 
                value={state.computoCorrente?.intestazione.cliente || ''} 
                onChange={(e) => updateIntestazione('cliente', e.target.value)}
                placeholder="es: Mario Rossi"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Indirizzo Lavori</Label>
              <Input 
                value={state.computoCorrente?.intestazione.indirizzo || ''} 
                onChange={(e) => updateIntestazione('indirizzo', e.target.value)}
                placeholder="es: Via Roma 1, Napoli"
              />
            </div>
         </CardContent>
       </Card>

       <Card className="border-gray-200 shadow-sm">
         <CardHeader>
           <CardTitle className="text-lg flex items-center gap-2">
             <FileText className="w-5 h-5 text-blue-600" /> Dati Progetto
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Oggetto dei Lavori</Label>
              <Input 
                value={state.computoCorrente?.intestazione.oggetto || ''} 
                onChange={(e) => updateIntestazione('oggetto', e.target.value)}
                placeholder="es: Ristrutturazione appartamento"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Numero Computo</Label>
                <Input 
                  value={state.computoCorrente?.intestazione.numero || ''} 
                  onChange={(e) => updateIntestazione('numero', e.target.value)}
                  placeholder="es: 01/2024"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input 
                  type="date"
                  value={state.computoCorrente?.intestazione.data.split('T')[0] || ''} 
                  onChange={(e) => updateIntestazione('data', e.target.value)}
                />
              </div>
            </div>
         </CardContent>
       </Card>
    </div>
  );
}

// ============================================
// COMPONENTE RIEPILOGO E STAMPA
// ============================================
function RiepilogoStampa() {
  const { state, totaleGenerale } = useApp();
  if (!state.computoCorrente) return null;

  return (
    <div className="space-y-8 py-4">
       <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-gray-800">Riepilogo Finale</h2>
            <p className="text-gray-500">Controlla i totali e scarica il documento</p>
          </div>
          <div className="flex gap-3">
             <Button 
               onClick={() => esportaComputoPDF(state.computoCorrente!)}
               className="bg-blue-600 hover:bg-blue-700 font-bold"
             >
               <FileDown className="w-4 h-4 mr-2" /> Scarica PDF PriMus
             </Button>
             <Button 
               variant="outline"
               onClick={() => esportaComputoExcel(state.computoCorrente!)}
             >
               <FileDown className="w-4 h-4 mr-2" /> Esporta Excel
             </Button>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
             <CardHeader>
               <CardTitle className="text-base uppercase tracking-wider text-gray-500">Dettaglio per Categoria</CardTitle>
             </CardHeader>
             <CardContent className="px-0">
                <table className="w-full">
                   <thead>
                     <tr className="bg-gray-50 text-[10px] text-gray-400 border-y">
                        <th className="px-6 py-2 text-left">CAPITOLO</th>
                        <th className="px-6 py-2 text-center">VOCI</th>
                        <th className="px-6 py-2 text-right">IMPORTO</th>
                     </tr>
                   </thead>
                   <tbody>
                      {state.computoCorrente.categorie.map(cat => {
                        const righeCat = state.computoCorrente!.righe.filter(r => r.categoriaId === cat.id);
                        const totale = righeCat.reduce((s, r) => s + r.importo, 0);
                        return (
                          <tr key={cat.id} className="border-b last:border-0 hover:bg-gray-50/50 transition-colors">
                             <td className="px-6 py-4 font-semibold text-gray-700">{cat.nome}</td>
                             <td className="px-6 py-4 text-center text-gray-500">{righeCat.length}</td>
                             <td className="px-6 py-4 text-right font-bold text-blue-600">{formattaImporto(totale)}</td>
                          </tr>
                        );
                      })}
                   </tbody>
                </table>
             </CardContent>
          </Card>

          <Card className="bg-blue-700 text-white h-fit shadow-xl border-0">
             <CardHeader>
               <CardTitle className="text-white/80 text-xs uppercase font-black tracking-widest">Totale Generale</CardTitle>
             </CardHeader>
             <CardContent>
                <div className="text-4xl font-black mb-1">{formattaImporto(totaleGenerale)}</div>
                <div className="text-xs text-white/60">Totale calcolato su {state.computoCorrente.righe.length} voci totali</div>
                <Separator className="my-6 bg-white/20" />
                <div className="space-y-4">
                   <div className="text-xs font-bold flex justify-between">
                      <span>Imponibile</span>
                      <span>{formattaImporto(totaleGenerale)}</span>
                   </div>
                   <div className="text-xs font-bold flex justify-between">
                      <span>IVA (esclusa)</span>
                      <span>0,00 €</span>
                   </div>
                </div>
             </CardContent>
          </Card>
       </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPALE EDITOR
// ============================================
export function EditorComputo() {
  const { state, totaleGenerale, exportComputo } = useApp();
  const [tabAttiva, setTabAttiva] = useState<'intestazione' | 'computo' | 'categorie' | 'riepilogo'>('computo');
  const [categoriaEspansa, setCategoriaEspansa] = useState<Record<string, boolean>>({});

  const categoriePadre = state.computoCorrente?.categorie.filter(c => !c.parentId) || [];
  const categorieFiglie = state.computoCorrente?.categorie.filter(c => c.parentId) || [];

  React.useEffect(() => {
    if (state.computoCorrente) {
      const espansi: Record<string, boolean> = {};
      state.computoCorrente.categorie.forEach(cat => { espansi[cat.id] = true; });
      setCategoriaEspansa(espansi);
    }
  }, [state.computoCorrente?.id]);

  const toggleCategoria = (catId: string) => {
    setCategoriaEspansa(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  if (!state.computoCorrente) return null;

  return (
    <div className="w-full">
      <ToolbarPrimus
        computo={state.computoCorrente}
        totale={totaleGenerale}
        onExportPDF={() => esportaComputoPDF(state.computoCorrente!)}
        onExportExcel={() => esportaComputoExcel(state.computoCorrente!)}
        onSave={() => {}}
        onExportJSON={() => exportComputo(state.computoCorrente!.id)}
      />
      
      <div className="w-full min-h-screen bg-gray-50">
      {/* TABS STILE PRIMUS */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-8 gap-1 w-fit mx-auto shadow-inner border border-gray-200">
        {[
          { id: 'intestazione', label: 'Dati Generali', icon: User },
          { id: 'categorie', label: 'Capitoli', icon: LayoutList },
          { id: 'computo', label: 'Computo Metrico', icon: Calculator },
          { id: 'riepilogo', label: 'Riepilogo e Stampa', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabAttiva(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black transition-all ${
              tabAttiva === tab.id 
              ? 'bg-white text-blue-700 shadow-md transform scale-105' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENUTO TAB */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
        {tabAttiva === 'intestazione' && <IntestazioneComputo />}
        
        {tabAttiva === 'categorie' && <GestioneCategorie />}
        
        {tabAttiva === 'computo' && (
          <div className="space-y-4">
            {categoriePadre.map((categoria) => {
              const sottocategorie = categorieFiglie.filter(s => s.parentId === categoria.id);
              const righeCat = state.computoCorrente!.righe.filter(r => r.categoriaId === categoria.id);
              const righeSotto = sottocategorie.flatMap(sotto => 
                state.computoCorrente!.righe.filter(r => r.categoriaId === sotto.id)
              );
              const totCat = righeCat.reduce((s, r) => s + r.importo, 0) + righeSotto.reduce((s, r) => s + r.importo, 0);
              
              return (
                <div key={categoria.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleCategoria(categoria.id)}
                    className="w-full flex items-center justify-between px-6 py-4 bg-gray-50/50 hover:bg-gray-50 transition-colors border-b"
                  >
                    <div className="flex items-center gap-3">
                      {categoriaEspansa[categoria.id] ? <ChevronDown className="w-5 h-5 text-blue-600" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                      <span className="text-sm font-black text-gray-800 uppercase tracking-tight">{categoria.nome}</span>
                      <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 border-0">{righeCat.length + righeSotto.length} voci</Badge>
                    </div>
                    <span className="text-sm font-black text-blue-700">{formattaImporto(totCat)}</span>
                  </button>
                  {categoriaEspansa[categoria.id] && (
                    <div className="p-4 bg-gray-50/20">
                      {/* Tabella categoria principale */}
                      {righeCat.length > 0 && (
                        <div className="mb-6">
                          <TabellaComputo categoriaId={categoria.id} />
                        </div>
                      )}
                      
                      {/* Sottocategorie */}
                      {sottocategorie.map((sottoCat) => {
                        const righeSottoCat = state.computoCorrente!.righe.filter(r => r.categoriaId === sottoCat.id);
                        const totSotto = righeSottoCat.reduce((s, r) => s + r.importo, 0);
                        
                        return righeSottoCat.length > 0 ? (
                          <div key={sottoCat.id} className="mb-6">
                            <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                              <span className="text-sm font-semibold text-blue-800">{sottoCat.nome}</span>
                              <span className="text-sm font-bold text-blue-700">{formattaImporto(totSotto)}</span>
                            </div>
                            <TabellaComputo categoriaId={sottoCat.id} />
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tabAttiva === 'riepilogo' && <RiepilogoStampa />}
      </div>
      </div>
    </div>
  );
}
