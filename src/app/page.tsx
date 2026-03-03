"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Session {
  id: string;
  date: string;
}

interface Exercise {
  id: string;
  session_id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  notes?: string;
}

const DEFAULT_EXERCISES = [
  "Cardio",
  "Seated leg press",
  "Leg extension",
  "Seated leg curl",
  "Abdominal",
  "Back extension",
  "Hip adduction",
  "Hip abduction"
];

export default function GymTracker() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardioMinutes, setCardioMinutes] = useState(20);
  const [cardioZhf, setCardioZhf] = useState(100);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchExercises(selectedSession);
    }
  }, [selectedSession]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
      
      if (!selectedSession && data && data.length > 0) {
        setSelectedSession(data[0].id);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExercises = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('session_id', sessionId)
        .order('name');

      if (error) throw error;
      setExercises(data || []);
      
      const cardio = data?.find(e => e.name === "Cardio");
      if (cardio) {
        setCardioMinutes(cardio.reps);
        setCardioZhf(cardio.sets);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Übungen:', error);
    }
  };

  const updateWeight = async (exerciseId: string, newWeight: number) => {
    try {
      const { error } = await supabase
        .from('exercises')
        .update({ weight: newWeight })
        .eq('id', exerciseId);
      if (error) throw error;
      setExercises(prev => prev.map(ex => ex.id === exerciseId ? { ...ex, weight: newWeight } : ex));
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
    }
  };

  const incrementWeight = (exerciseId: string) => {
    const ex = exercises.find(e => e.id === exerciseId);
    if (ex) updateWeight(exerciseId, parseFloat((ex.weight + 2.5).toFixed(1)));
  };

  const decrementWeight = (exerciseId: string) => {
    const ex = exercises.find(e => e.id === exerciseId);
    if (ex) updateWeight(exerciseId, Math.max(0, parseFloat((ex.weight - 2.5).toFixed(1))));
  };

  const updateCardio = async () => {
    if (!selectedSession) return;
    const cardio = exercises.find(e => e.name === "Cardio");
    if (cardio) {
      await supabase.from('exercises').update({ sets: cardioZhf, reps: cardioMinutes }).eq('id', cardio.id);
    }
  };

  const createNewSession = async () => {
    try {
      const { data: latestSession } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      const today = new Date().toISOString().split('T')[0];

      if (latestSession && latestSession.length > 0) {
        const { data: exercisesFromLast } = await supabase
          .from('exercises')
          .select('*')
          .eq('session_id', latestSession[0].id);

        const { data: newSession } = await supabase
          .from('sessions')
          .insert([{ date: today }])
          .select();

        if (newSession && exercisesFromLast) {
          const exercisesToInsert = exercisesFromLast.map(ex => ({
            session_id: newSession[0].id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            notes: ex.notes
          }));

          if (exercisesToInsert.length > 0) {
            await supabase.from('exercises').insert(exercisesToInsert);
          }
        }
      } else {
        await supabase.from('sessions').insert([{ date: today }]);
      }
      fetchSessions();
    } catch (error) {
      console.error('Fehler beim Erstellen:', error);
    }
  };

  if (loading) return <div className="container mx-auto p-4">Lade...</div>;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🏋️ Gym Tracker</h1>
        <button onClick={createNewSession} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Neues Training
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Training auswählen:</label>
        <select value={selectedSession || ''} onChange={(e) => setSelectedSession(e.target.value || null)} className="w-full p-2 border border-gray-300 rounded-md">
          {sessions.map(session => (
            <option key={session.id} value={session.id}>{new Date(session.date).toLocaleDateString('de-DE')}</option>
          ))}
        </select>
      </div>

      {selectedSession && exercises.length > 0 ? (
        <div className="space-y-4">
          {exercises.filter(e => e.name !== "Cardio").map(exercise => (
            <div key={exercise.id} className="border p-4 rounded-lg shadow-sm flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{exercise.name}</h3>
                <p className="text-gray-600">{exercise.sets} Sätze × {exercise.reps} Wdh.</p>
              </div>
              <div className="flex items-center">
                <button onClick={() => decrementWeight(exercise.id)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-l">-</button>
                <div className="bg-gray-100 border-y border-gray-300 py-2 px-6 text-center font-mono">{exercise.weight} kg</div>
                <button onClick={() => incrementWeight(exercise.id)} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-r">+</button>
              </div>
            </div>
          ))}
          
          <div className="border p-4 rounded-lg shadow-sm bg-blue-50">
            <h3 className="font-semibold text-lg mb-2">❤️ Cardio</h3>
            <div className="flex gap-4">
              <div>
                <label className="text-sm text-gray-600">Minuten:</label>
                <input type="number" value={cardioMinutes} onChange={(e) => setCardioMinutes(parseInt(e.target.value))} onBlur={updateCardio} className="ml-2 w-20 p-1 border rounded" />
              </div>
              <div>
                <label className="text-sm text-gray-600">ZHF:</label>
                <input type="number" value={cardioZhf} onChange={(e) => setCardioZhf(parseInt(e.target.value))} onBlur={updateCardio} className="ml-2 w-20 p-1 border rounded" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">Keine Übungen gefunden. Starte mit "Neues Training".</div>
      )}
    </div>
  );
}
