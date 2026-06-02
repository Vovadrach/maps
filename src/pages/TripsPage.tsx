import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context.tsx';
import { Plus, ListFilter, Trash2, Map, Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export function TripsPage() {
  const { trips, deleteTrip } = useAppContext();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto w-full">
      <div className="bg-white border-b border-slate-200 px-4 py-4 md:px-8 md:py-6 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Мої Рейси</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">Управління циклами завантажень</p>
        </div>
        <button 
          onClick={() => navigate('/trips/new')}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm flex items-center"
        >
          <Plus className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Створити Рейс</span>
        </button>
      </div>

      <div className="p-4 md:p-8 w-full max-w-5xl mx-auto pb-24 md:pb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <ListFilter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none shadow-sm cursor-pointer hover:border-slate-300 transition-colors">
              <option>Всі рейси</option>
              <option>Тільки нові</option>
            </select>
          </div>
          <span className="text-sm text-slate-500 font-medium">{trips.length} рейсів</span>
        </div>

        {trips.length === 0 ? (
          <motion.div 
             initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
             className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 flex flex-col items-center justify-center text-center shadow-sm"
          >
             <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
               <Map className="w-8 h-8" />
             </div>
             <h3 className="text-lg font-semibold text-slate-800 mb-2">Немає збережених рейсів</h3>
             <p className="text-slate-500 text-sm max-w-sm mb-6">Створіть свій перший рейс, завантажте злеценя та сплануйте свій цикл розвантажень.</p>
             <button 
                onClick={() => navigate('/trips/new')}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-colors"
              >
                Почати роботу
              </button>
          </motion.div>
        ) : (
          <motion.div 
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.05 }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          >
            {[...trips].sort((a,b) => b.createdAt - a.createdAt).map((trip, i) => (
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                key={`trip-${trip.id}-${i}`} 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col"
              >
                <div className="p-4 md:p-5 flex-1 cursor-pointer" onClick={() => navigate(`/trips/${trip.id}`)}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-slate-800 line-clamp-1">{trip.name}</h3>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded tracking-wider shrink-0 ml-2">
                      {trip.points.length} ТОЧКИ
                    </span>
                  </div>
                  
                  <div className="flex items-center text-xs text-slate-500 mb-4 font-medium">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    {new Date(trip.createdAt).toLocaleDateString()}
                  </div>

                  <div className="space-y-2 mt-4 relative">
                    <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-slate-100 rounded-full"></div>
                    {trip.points.slice(0, 3).map((p, i) => (
                      <div key={i} className="flex items-center text-sm relative z-10">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm shrink-0 mr-3 ${
                          p.type === 'loading' ? 'bg-emerald-500' : p.type === 'unloading' ? 'bg-violet-500' : 'bg-sky-500'
                        }`}></div>
                        <span className="text-slate-600 truncate">{p.name || 'Точка'}</span>
                      </div>
                    ))}
                    {trip.points.length > 3 && (
                      <div className="text-xs text-slate-400 pl-6 font-medium">та ще {trip.points.length - 3}</div>
                    )}
                  </div>
                </div>
                
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-b-2xl">
                   <button 
                     onClick={(e) => { e.stopPropagation(); deleteTrip(trip.id); }}
                     className="text-slate-400 hover:text-red-500 p-1.5 -ml-1.5 rounded-md transition-colors"
                     title="Видалити"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                   
                   <button 
                     className="text-violet-600 font-medium text-sm flex items-center group-hover:text-violet-700 transition-colors"
                     onClick={() => navigate(`/trips/${trip.id}`)}
                   >
                     Деталі <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                   </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
