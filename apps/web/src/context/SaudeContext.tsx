import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Habit {
  id: string;
  name: string;
  time: string;
  checked: boolean;
  dateStr: string; // ISO date string without time to group habits by day
}

export interface BiometricLog {
  id: string;
  dateStr: string;
  sleepHours: number;
  mood: string; // "Ótimo", "Bom", "Cansada", "Estressada"
  energyLevel: number; // 1-10
}

export interface SaudeDocument {
  name: string;
  date?: string;
}

interface SaudeContextType {
  habits: Habit[];
  biometrics: BiometricLog[];
  documents: SaudeDocument[];
  toggleHabit: (id: string) => void;
  addHabit: (name: string, time: string, dateStr: string) => void;
  logBiometrics: (bio: Omit<BiometricLog, 'id'>) => void;
  uploadDocument: (fileData: { name: string }) => void;
  getHabitsByDate: (dateStr: string) => Habit[];
  getBiometricsByDate: (dateStr: string) => BiometricLog | null;
}

const SaudeContext = createContext<SaudeContextType | undefined>(undefined);

export const SaudeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [habits, setHabits] = useState<Habit[]>(() => {
    const storedHabits = localStorage.getItem('saude_habits');
    if (!storedHabits) return [];
    const generatedNames = new Set([
      'Vitamina D (Aurora)', 'Probiótico (Benício)',
      'Meditação UDV (30min)', 'Ingestão de Água (3L)',
    ]);
    const sanitized = JSON.parse(storedHabits).filter((habit: Habit) => !(
      ['1', '2', '3', '4'].includes(habit.id) && generatedNames.has(habit.name)
    ));
    localStorage.setItem('saude_habits', JSON.stringify(sanitized));
    return sanitized;
  });
  const [biometrics, setBiometrics] = useState<BiometricLog[]>(() => {
    const storedBio = localStorage.getItem('saude_biometrics');
    return storedBio ? JSON.parse(storedBio) : [];
  });
  const [documents, setDocuments] = useState<SaudeDocument[]>(() => {
    const storedDocs = localStorage.getItem('saude_documents');
    if (!storedDocs) return [];
    const generatedNames = new Set(['Hemograma_Vivi_Mar.pdf', 'Dieta_Nutri_Puerperio.pdf']);
    const sanitized = JSON.parse(storedDocs).filter((document: { name?: string }) => !(
      document.name && generatedNames.has(document.name)
    ));
    localStorage.setItem('saude_documents', JSON.stringify(sanitized));
    return sanitized;
  });

  // Load from local storage
  useEffect(() => {
  }, []);

  // Save to local storage
  useEffect(() => {
    if (habits.length > 0) localStorage.setItem('saude_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    if (biometrics.length > 0) localStorage.setItem('saude_biometrics', JSON.stringify(biometrics));
  }, [biometrics]);

  useEffect(() => {
    if (documents.length > 0) localStorage.setItem('saude_documents', JSON.stringify(documents));
  }, [documents]);

  const toggleHabit = (id: string) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, checked: !h.checked } : h));
  };

  const addHabit = (name: string, time: string, dateStr: string) => {
    const newHabit: Habit = {
      id: Date.now().toString(),
      name,
      time,
      checked: false,
      dateStr
    };
    setHabits(prev => [...prev, newHabit]);
  };

  const logBiometrics = (bio: Omit<BiometricLog, 'id'>) => {
    setBiometrics(prev => {
      // replace if same date
      const filtered = prev.filter(b => b.dateStr !== bio.dateStr);
      return [...filtered, { ...bio, id: Date.now().toString() }];
    });
  };

  const uploadDocument = (fileData: { name: string }) => {
    setDocuments(prev => [{ name: fileData.name, date: new Date().toLocaleDateString('pt-BR').substring(0, 5) }, ...prev]);
  };

  const getHabitsByDate = (dateStr: string) => habits.filter(h => h.dateStr === dateStr);
  const getBiometricsByDate = (dateStr: string) => biometrics.find(b => b.dateStr === dateStr) || null;

  return (
    <SaudeContext.Provider value={{
      habits, biometrics, documents,
      toggleHabit, addHabit, logBiometrics, uploadDocument,
      getHabitsByDate, getBiometricsByDate
    }}>
      {children}
    </SaudeContext.Provider>
  );
};

export const useSaudeData = () => {
  const context = useContext(SaudeContext);
  if (!context) throw new Error("useSaudeData must be used within a SaudeProvider");
  return context;
};
