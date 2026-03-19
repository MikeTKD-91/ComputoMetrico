import { createContext, useContext, useState, useCallback } from 'react';
import { 
  Calculator, 
  FolderOpen, 
  Database, 
  Menu,
  X,
  ChevronLeft,
  Save,
  FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/store/AppContext';
import { ListaComputi } from '@/components/computo/ListaComputi';
import { EditorComputo } from '@/components/computo/EditorComputo';
import { ImportaPrezzario } from '@/components/prezzario/ImportaPrezzario';
import { RicercaPrezzario } from '@/components/prezzario/RicercaPrezzario';
import { esportaComputoPDF, esportaComputoExcel } from '@/utils/exportUtils';
import type { VocePrezzario } from '@/types';
import './App.css';

// ============================================================
// CONTEXT GLOBALE PER LA RICERCA PREZZARIO
// ============================================================

interface RicercaCtx {
  apriRicerca: (onSelect: (v: VocePrezzario) => void) => void;
}

const RicercaContext = createContext<RicercaCtx>({ apriRicerca: () => {} });

export function useRicercaPrezzario() {
  return useContext(RicercaContext);
}

// ============================================================
// SIDEBAR
// ============================================================

function Sidebar() {
  const { state, dispatch, totaleGenerale } = useApp();

  const menuItems = [
    { id: 'computo', label: 'Computi', icon: FolderOpen, badge: state.computi.length },
    { id: 'prezzario', label: 'Prezzario', icon: Database, badge: state.prezzario.length },
  ] as const;

  return (
    <aside className={`fixed left-0 top-0 h-full bg-white border-r z-40 transition-all duration-300 ease-in-out ${state.ui.sidebarOpen ? 'w-64' : 'w-16'}`}>
      <div className="h-16 flex items-center justify-between px-4 border-b">
        {state.ui.sidebarOpen ? (
          <>
            <div className="flex items-center gap-2">
              <Calculator className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-lg">ComputoMetrico</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })} className="h-8 w-8 p-0 mx-auto">
            <Menu className="h-4 w-4" />
          </Button>
        )}
      </div>

      <nav className="p-2 space-y-1">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: item.id })}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${state.ui.activeTab === item.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'} ${!state.ui.sidebarOpen && 'justify-center'}`}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {state.ui.sidebarOpen && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge > 0 && <Badge variant="secondary" className="text-xs">{item.badge}</Badge>}
              </>
            )}
          </button>
        ))}
      </nav>

      <Separator className="my-4" />

      {state.ui.sidebarOpen && state.computoCorrente && (
        <div className="px-4 py-2">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-medium mb-1">COMPUTO APERTO</p>
            <p className="font-semibold text-sm truncate">{state.computoCorrente.nome}</p>
            <p className="text-xs text-gray-500 mt-1">{state.computoCorrente.righe.length} righe</p>
            <p className="text-lg font-bold text-blue-700 mt-2">
              {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(totaleGenerale)}
            </p>
          </div>
        </div>
      )}

      {state.ui.sidebarOpen && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <p className="text-xs text-gray-400 text-center">Computo Metrico Estimativo v1.0</p>
        </div>
      )}
    </aside>
  );
}

// ============================================================
// HEADER
// ============================================================

function Header() {
  const { state, dispatch } = useApp();

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {state.computoCorrente && (
          <>
            <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'CLOSE_COMPUTO' })}>
              <X className="h-4 w-4 mr-1" />Chiudi
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="font-semibold">{state.computoCorrente.nome}</h1>
              <p className="text-xs text-gray-500">Modificato: {new Date(state.computoCorrente.dataModifica).toLocaleString('it-IT')}</p>
            </div>
          </>
        )}
        {!state.computoCorrente && (
          <h1 className="font-semibold text-lg">
            {state.ui.activeTab === 'computo' && 'Gestione Computi'}
            {state.ui.activeTab === 'prezzario' && 'Gestione Prezzario'}
          </h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        {state.computoCorrente && (
          <>
            <Button variant="outline" size="sm" onClick={() => { dispatch({ type: 'SAVE_COMPUTO' }); alert('Computo salvato!'); }}>
              <Save className="h-4 w-4 mr-1" />Salva
            </Button>
            <Button variant="outline" size="sm" onClick={() => esportaComputoPDF(state.computoCorrente!)}>
              <FileDown className="h-4 w-4 mr-1" />PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => esportaComputoExcel(state.computoCorrente!)}>
              <FileDown className="h-4 w-4 mr-1" />Excel
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

// ============================================================
// MAIN CONTENT
// ============================================================

function MainContent() {
  const { state } = useApp();

  if (state.ui.activeTab === 'prezzario') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Gestione Prezzario</h2>
          <p className="text-gray-500">Importa il prezzario da CSV o aggiungi voci manualmente.</p>
        </div>
        <ImportaPrezzario />
      </div>
    );
  }

  if (state.ui.activeTab === 'computo') {
    if (state.computoCorrente) return <EditorComputo />;
    return <ListaComputi />;
  }

  return null;
}

// ============================================================
// APP ROOT — la RicercaPrezzario viene montata QUI, al livello
// più alto del DOM, completamente fuori da sidebar/header/main
// ============================================================

function App() {
  const { state } = useApp();
  const [ricercaCallback, setRicercaCallback] = useState<((v: VocePrezzario) => void) | null>(null);

  const apriRicerca = useCallback((onSelect: (v: VocePrezzario) => void) => {
    setRicercaCallback(() => onSelect);
  }, []);

  const chiudiRicerca = useCallback(() => {
    setRicercaCallback(null);
  }, []);

  const handleSelect = useCallback((voce: VocePrezzario) => {
    ricercaCallback?.(voce);
    chiudiRicerca();
  }, [ricercaCallback, chiudiRicerca]);

  return (
    <RicercaContext.Provider value={{ apriRicerca }}>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className={state.ui.sidebarOpen ? 'ml-64' : 'ml-16'} style={{ transition: 'margin-left 0.3s ease-in-out' }}>
          <Header />
          <div className="p-6">
            <MainContent />
          </div>
        </main>

        {/* RICERCA PREZZARIO — montata direttamente in App, fuori da tutto */}
        {ricercaCallback !== null && (
          <RicercaPrezzario
            onSelect={handleSelect}
            onClose={chiudiRicerca}
          />
        )}
      </div>
    </RicercaContext.Provider>
  );
}

export default App;
