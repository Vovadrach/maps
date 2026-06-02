import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, MapPin, Truck, ArrowDownToLine, Navigation, Box } from 'lucide-react';
import type { Point } from '../types.ts';

interface SortablePointProps {
  key?: React.Key;
  point: Point;
  index: number;
  onRemove: (id: string) => void;
  assignedCargo?: number;
}

export function SortablePoint({ point, index, onRemove, assignedCargo }: SortablePointProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: point.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  const getIcon = () => {
    switch (point.type) {
      case 'loading': return <ArrowDownToLine className="w-4 h-4 text-emerald-500" />;
      case 'unloading': return <Truck className="w-4 h-4 text-violet-500" />;
      case 'transit': return <Navigation className="w-4 h-4 text-sky-500" />;
      default: return <MapPin className="w-4 h-4 text-slate-500" />;
    }
  };

  const getBadgeColor = () => {
    switch (point.type) {
      case 'loading': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'unloading': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'transit': return 'bg-sky-50 text-sky-700 border-sky-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getLabel = () => {
    switch (point.type) {
      case 'loading': return 'Завантаження';
      case 'unloading': return 'Розвантаження';
      case 'transit': return 'Доїзд';
      default: return 'Точка';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group bg-white border border-slate-200 rounded-xl mb-2 shadow-sm flex items-stretch overflow-hidden ${isDragging ? 'ring-2 ring-violet-500' : 'hover:border-slate-300'}`}
    >
      {/* Drag Handle */}
      <button
        type="button"
        className="px-2 flex items-center justify-center bg-slate-50 border-r border-slate-100 cursor-grab active:cursor-grabbing hover:bg-slate-100 transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4 text-slate-400" />
      </button>

      <div className="flex-1 p-3 flex flex-col justify-center overflow-hidden">
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center space-x-2">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getBadgeColor()} flex items-center space-x-1`}>
              {getIcon()}
              <span>{getLabel()}</span>
            </span>
            {point.company && <span className="text-xs font-medium text-slate-600 truncate">{point.company}</span>}
          </div>
          <div className="flex items-center space-x-2">
            {assignedCargo ? (
              <span className="text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded flex items-center">
                <Box className="w-3 h-3 mr-1" />
                {assignedCargo} вант.
              </span>
            ) : null}
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 border border-slate-200 px-1.5 rounded">
              #{index + 1}
            </span>
          </div>
        </div>
        <span className="text-sm text-slate-900 font-medium truncate" title={point.name}>{point.name}</span>
      </div>

      <button
        onClick={() => onRemove(point.id)}
        className="px-3 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors hover:bg-red-50 border-l border-slate-100"
        title="Видалити точку"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
