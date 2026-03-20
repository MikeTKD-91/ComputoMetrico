import { FileDown, Save, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Computo } from '@/types';
import { formattaImporto } from '@/utils/exportUtils';

interface ToolbarPrimusProps {
  computo: Computo | null;
  totale: number;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onSave: () => void;
  onExportJSON: () => void;
}

export function ToolbarPrimus({
  computo,
  totale,
  onExportPDF,
  onExportExcel,
  onSave,
  onExportJSON
}: ToolbarPrimusProps) {
  if (!computo) return null;

  return (
    <div className="toolbar-primus">
      {/* Info computo */}
      <div className="toolbar-computo-info">
        <h1 className="toolbar-computo-nome">{computo.nome}</h1>
        <p className="toolbar-computo-cliente">
          Cliente: {computo.intestazione.cliente} • Oggetto: {computo.intestazione.oggetto}
        </p>
      </div>

      {/* Totale */}
      <div className="toolbar-totale">
        <span className="toolbar-totale-label">Totale Computo</span>
        <div className="toolbar-totale-valore">{formattaImporto(totale)}</div>
      </div>

      {/* Pulsanti azioni */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="bg-white text-blue-900 hover:bg-gray-100 border border-white/30"
          onClick={onSave}
        >
          <Save className="h-4 w-4 mr-1" />
          Salva
        </Button>

        <div className="relative group">
          <Button
            size="sm"
            className="bg-white text-blue-900 hover:bg-gray-100 border border-white/30"
          >
            <FileDown className="h-4 w-4 mr-1" />
            Esporta
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
          <div className="absolute right-0 mt-0 w-40 bg-white border border-gray-200 rounded shadow-lg hidden group-hover:block z-50">
            <button
              onClick={onExportPDF}
              className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700"
            >
              Esporta PDF
            </button>
            <button
              onClick={onExportExcel}
              className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 border-t"
            >
              Esporta Excel
            </button>
            <button
              onClick={onExportJSON}
              className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 border-t"
            >
              Esporta JSON
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
