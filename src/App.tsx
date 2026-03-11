import React, { useState } from 'react';
import { Calendar, User, Stethoscope, Ambulance, Plus, Minus, ClipboardList, Save, Archive, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Role = 'enfermeiros' | 'medicos' | 'condutores';
type TabType = Role | 'ordem' | 'armazenamento';

interface Person {
  id: string;
  name: string;
  departureDate: string;
  departureTime: string;
  isPlantonista?: boolean;
  sourceId?: string;
}

interface SavedScale {
  id: string;
  date: string;
  enfermeiros: string[];
  medicos: string[];
  condutores: string[];
}

const generateInitialData = (prefix: string, count: number, hasPlantonista: boolean = false): Person[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    name: '',
    departureDate: '',
    departureTime: '',
    isPlantonista: hasPlantonista && i === 0,
  }));
};

const sortPersons = (persons: Person[]) => {
  const plantonistas = persons.filter(p => p.isPlantonista);
  const others = persons.filter(p => !p.isPlantonista);

  const sortedOthers = others.sort((a, b) => {
    const hasDateA = !!a.departureDate;
    const hasDateB = !!b.departureDate;

    if (!hasDateA && !hasDateB) {
      const numA = parseInt(a.id.split('-').pop() || '0');
      const numB = parseInt(b.id.split('-').pop() || '0');
      return numA - numB;
    }
    if (!hasDateA) return 1;
    if (!hasDateB) return -1;

    const dateA = new Date(`${a.departureDate}T${a.departureTime || '00:00'}`).getTime();
    const dateB = new Date(`${b.departureDate}T${b.departureTime || '00:00'}`).getTime();

    if (dateA === dateB) {
      const numA = parseInt(a.id.split('-').pop() || '0');
      const numB = parseInt(b.id.split('-').pop() || '0');
      return numA - numB;
    }

    return dateA - dateB;
  });

  return [...plantonistas, ...sortedOthers];
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('enfermeiros');

  const [data, setData] = useState<Record<Role, Person[]>>({
    enfermeiros: generateInitialData('enf', 20),
    medicos: generateInitialData('med', 20),
    condutores: generateInitialData('cond', 20, false),
  });

  const [calledData, setCalledData] = useState<Record<Role, Person[]>>({
    enfermeiros: generateInitialData('call-enf', 15),
    medicos: generateInitialData('call-med', 15),
    condutores: generateInitialData('call-cond', 15, true),
  });

  const [globalCallDate, setGlobalCallDate] = useState<string>('');
  const [savedScales, setSavedScales] = useState<SavedScale[]>([]);

  const handleFieldChange = (role: Role, id: string, field: keyof Person, value: string) => {
    setData((prev) => {
      const updated = prev[role].map((p) => (p.id === id ? { ...p, [field]: value } : p));
      return { ...prev, [role]: sortPersons(updated) };
    });
  };

  const handleCalledFieldChange = (role: Role, id: string, field: keyof Person, value: string) => {
    setCalledData((prev) => {
      const updated = prev[role].map((p) => (p.id === id ? { ...p, [field]: value } : p));
      return { ...prev, [role]: updated };
    });
  };

  const handleClearCalled = (role: Role, id: string) => {
    setCalledData((prev) => {
      const updated = prev[role].map((p) => 
        p.id === id ? { ...p, name: '', sourceId: undefined } : p
      );
      return { ...prev, [role]: updated };
    });
  };

  const handleCall = (role: Role, person: Person) => {
    setCalledData((prev) => {
      const roleData = [...prev[role]];
      
      let targetIndex = -1;
      if (person.isPlantonista) {
        targetIndex = roleData.findIndex(p => p.isPlantonista);
      } else {
        targetIndex = roleData.findIndex((p) => !p.isPlantonista && !p.name && !p.sourceId);
      }
      
      if (targetIndex !== -1) {
        roleData[targetIndex] = {
          ...roleData[targetIndex],
          name: person.name,
          sourceId: person.id,
        };
      } else {
        alert(person.isPlantonista ? 'O plantonista já está preenchido na ordem de chamada.' : 'A lista de ordem de chamada para esta categoria está cheia (15 linhas).');
      }
      
      return { ...prev, [role]: roleData };
    });
  };

  const getSortedCalledData = (role: Role) => {
    const roleData = calledData[role];
    const sourceData = data[role];

    const plantonistas = roleData.filter(p => p.isPlantonista);
    const others = roleData.filter(p => !p.isPlantonista);

    const sortedOthers = others.sort((a, b) => {
      const indexA = a.sourceId ? sourceData.findIndex(p => p.id === a.sourceId) : -1;
      const indexB = b.sourceId ? sourceData.findIndex(p => p.id === b.sourceId) : -1;

      const hasSourceA = indexA !== -1;
      const hasSourceB = indexB !== -1;

      if (hasSourceA && hasSourceB) {
        return indexA - indexB;
      }
      if (hasSourceA) return -1;
      if (hasSourceB) return 1;

      const hasNameA = !!a.name;
      const hasNameB = !!b.name;
      if (!hasNameA && !hasNameB) {
        const numA = parseInt(a.id.split('-').pop() || '0');
        const numB = parseInt(b.id.split('-').pop() || '0');
        return numA - numB;
      }
      if (!hasNameA) return 1;
      if (!hasNameB) return -1;

      const numA = parseInt(a.id.split('-').pop() || '0');
      const numB = parseInt(b.id.split('-').pop() || '0');
      return numA - numB;
    });

    return [...plantonistas, ...sortedOthers];
  };

  const handleSaveScale = () => {
    if (!globalCallDate) {
      alert('Por favor, preencha a Data da Escala antes de salvar.');
      return;
    }

    const newScale: SavedScale = {
      id: Date.now().toString(),
      date: globalCallDate,
      enfermeiros: getSortedCalledData('enfermeiros').filter(p => p.name).map(p => p.isPlantonista ? `PLANTONISTA: ${p.name}` : p.name),
      medicos: getSortedCalledData('medicos').filter(p => p.name).map(p => p.name),
      condutores: getSortedCalledData('condutores').filter(p => p.name).map(p => p.isPlantonista ? `PLANTONISTA: ${p.name}` : p.name),
    };

    setSavedScales(prev => [newScale, ...prev]);

    // Clear 4th tab
    setCalledData({
      enfermeiros: generateInitialData('call-enf', 15),
      medicos: generateInitialData('call-med', 15),
      condutores: generateInitialData('call-cond', 15, true),
    });
    setGlobalCallDate('');
    alert('Escala salva com sucesso!');
  };

  const handleDeleteLastScale = () => {
    if (savedScales.length === 0) return;
    if (window.confirm('Tem certeza que deseja excluir a última escala salva?')) {
      setSavedScales(prev => prev.slice(1));
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'enfermeiros', label: 'Enfermeiros(as)', icon: <User className="w-5 h-5" /> },
    { id: 'medicos', label: 'Médicos(as)', icon: <Stethoscope className="w-5 h-5" /> },
    { id: 'condutores', label: 'Condutores', icon: <Ambulance className="w-5 h-5" /> },
    { id: 'ordem', label: 'ORDEM DE CHAMADA DOS PROFISSIONAIS', icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'armazenamento', label: 'ARMAZENAMENTO DE ESCALAS', icon: <Archive className="w-5 h-5" /> },
  ];

  const roleLabels: Record<Role, string> = {
    enfermeiros: 'Enfermeiros(as)',
    medicos: 'Médicos(as)',
    condutores: 'Condutores',
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            Escala de Saídas
          </h1>
          <p className="text-gray-500 mt-2">
            Gerencie as datas e horários de saída da equipe. A lista é ordenada automaticamente.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-xl mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content for Tabs 1-3 */}
        {['enfermeiros', 'medicos', 'condutores'].includes(activeTab) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[30px_1fr_40px_220px] sm:grid-cols-[40px_1fr_50px_300px] gap-2 sm:gap-4 bg-gray-50/50 border-b border-gray-100 px-2 sm:px-6 py-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">#</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Ação</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data e Horário</div>
            </div>
            
            {/* Body */}
            <div className="divide-y divide-gray-100 relative">
              <AnimatePresence mode="popLayout">
                {data[activeTab as Role].map((person, index) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    key={person.id}
                    className={`grid grid-cols-[30px_1fr_40px_220px] sm:grid-cols-[40px_1fr_50px_300px] gap-2 sm:gap-4 px-2 sm:px-6 py-3 items-center transition-colors ${person.isPlantonista ? 'bg-blue-50/50 hover:bg-blue-50' : 'bg-white hover:bg-gray-50/50'}`}
                  >
                    <div className="text-sm text-gray-400 text-center font-mono">
                      {index + 1}
                    </div>
                    <div>
                      {person.isPlantonista ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-xs sm:text-sm">PLANTONISTA</span>
                          <input
                            type="text"
                            value={person.name}
                            onChange={(e) => handleFieldChange(activeTab as Role, person.id, 'name', e.target.value)}
                            placeholder="Nome..."
                            className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 font-bold shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-white"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={person.name}
                          onChange={(e) => handleFieldChange(activeTab as Role, person.id, 'name', e.target.value)}
                          placeholder="Digite o nome..."
                          className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-white"
                        />
                      )}
                    </div>
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleCall(activeTab as Role, person)}
                        className="p-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                        title="Adicionar à Ordem de Chamada"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-1 sm:gap-2">
                      <input
                        type="date"
                        value={person.departureDate}
                        onChange={(e) => handleFieldChange(activeTab as Role, person.id, 'departureDate', e.target.value)}
                        className="block w-full rounded-md border-0 py-2 px-1 sm:px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-white cursor-pointer"
                      />
                      <input
                        type="time"
                        value={person.departureTime}
                        onChange={(e) => handleFieldChange(activeTab as Role, person.id, 'departureTime', e.target.value)}
                        className="block w-full rounded-md border-0 py-2 px-1 sm:px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-white cursor-pointer"
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Content for Tab 4 (Ordem de Chamada) */}
        {activeTab === 'ordem' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-8 flex items-center gap-4">
              <label htmlFor="global-date" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                Data da Escala:
              </label>
              <input
                id="global-date"
                type="date"
                value={globalCallDate}
                onChange={(e) => setGlobalCallDate(e.target.value)}
                className="block w-full max-w-xs rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-white cursor-pointer"
              />
            </div>

            {(['enfermeiros', 'medicos', 'condutores'] as Role[]).map((role) => (
              <div key={role} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 uppercase">{roleLabels[role]}</h3>
                </div>
                
                {/* Header */}
                <div className="grid grid-cols-[40px_1fr_50px] gap-4 bg-gray-50/50 border-b border-gray-100 px-6 py-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">#</div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Ação</div>
                </div>
                
                {/* Body */}
                <div className="divide-y divide-gray-100 relative">
                  <AnimatePresence mode="popLayout">
                    {getSortedCalledData(role).map((person, index) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        key={person.id}
                        className={`grid grid-cols-[40px_1fr_50px] gap-4 px-6 py-3 items-center transition-colors ${person.isPlantonista ? 'bg-blue-50/50 hover:bg-blue-50' : 'bg-white hover:bg-gray-50/50'}`}
                      >
                        <div className="text-sm text-gray-400 text-center font-mono">
                          {index + 1}
                        </div>
                        <div>
                          {person.isPlantonista ? (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-xs sm:text-sm">PLANTONISTA</span>
                              <input
                                type="text"
                                value={person.name}
                                onChange={(e) => handleCalledFieldChange(role, person.id, 'name', e.target.value)}
                                placeholder="Nome..."
                                className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 font-bold shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-white"
                              />
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={person.name}
                              onChange={(e) => handleCalledFieldChange(role, person.id, 'name', e.target.value)}
                              placeholder="Digite o nome..."
                              className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-white"
                            />
                          )}
                        </div>
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleClearCalled(role, person.id)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                            title="Remover da Ordem de Chamada"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}

            <div className="flex justify-end mt-6">
              <button
                onClick={handleSaveScale}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                SALVAR
              </button>
            </div>
          </div>
        )}

        {/* Content for Tab 5 (Armazenamento de Escalas) */}
        {activeTab === 'armazenamento' && (
          <div className="space-y-6">
            {savedScales.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Nenhuma escala salva</h3>
                <p className="text-gray-500 mt-1">As escalas salvas na aba de Ordem de Chamada aparecerão aqui.</p>
              </div>
            ) : (
              savedScales.map((scale) => (
                <div key={scale.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      Escala do dia {new Date(scale.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Enfermeiros */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 border-b pb-2">Enfermeiros(as)</h4>
                      <ul className="space-y-2">
                        {scale.enfermeiros.length > 0 ? (
                          scale.enfermeiros.map((name, i) => (
                            <li key={i} className="text-sm text-gray-800 flex items-start gap-2">
                              <span className="text-gray-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                              <span className={name.startsWith('PLANTONISTA:') ? 'font-bold' : ''}>{name}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-gray-400 italic">Nenhum registrado</li>
                        )}
                      </ul>
                    </div>

                    {/* Médicos */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 border-b pb-2">Médicos(as)</h4>
                      <ul className="space-y-2">
                        {scale.medicos.length > 0 ? (
                          scale.medicos.map((name, i) => (
                            <li key={i} className="text-sm text-gray-800 flex items-start gap-2">
                              <span className="text-gray-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                              <span>{name}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-gray-400 italic">Nenhum registrado</li>
                        )}
                      </ul>
                    </div>

                    {/* Condutores */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 border-b pb-2">Condutores</h4>
                      <ul className="space-y-2">
                        {scale.condutores.length > 0 ? (
                          scale.condutores.map((name, i) => (
                            <li key={i} className="text-sm text-gray-800 flex items-start gap-2">
                              <span className="text-gray-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                              <span className={name.startsWith('PLANTONISTA:') ? 'font-bold' : ''}>{name}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-gray-400 italic">Nenhum registrado</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              ))
            )}

            {savedScales.length > 0 && (
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleDeleteLastScale}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  EXCLUIR ÚLTIMA ESCALA
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
