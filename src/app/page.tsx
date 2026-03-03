"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Session = {
  id: string;
  date: string;
};

type Exercise = {
  id: string;
  session_id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  notes: string;
};

type ExerciseDraft = {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  notes: string;
};

const DEFAULT_EXERCISE_ROWS: ExerciseDraft[] = [
  { name: "Cardio", sets: 100, reps: 20, weight: 0, notes: "" },
  { name: "Seated leg press", sets: 5, reps: 10, weight: 0, notes: "" },
  { name: "Leg extension", sets: 5, reps: 10, weight: 0, notes: "" },
  { name: "Seated leg curl", sets: 5, reps: 10, weight: 0, notes: "" },
  { name: "Abdominal", sets: 5, reps: 10, weight: 0, notes: "" },
  { name: "Back extension", sets: 5, reps: 10, weight: 0, notes: "" },
  { name: "Hip adduction", sets: 5, reps: 10, weight: 0, notes: "" },
  { name: "Hip abduction", sets: 5, reps: 10, weight: 0, notes: "" },
];

const WEIGHT_STEP = 2.5;

const roundToStep = (value: number, step = WEIGHT_STEP) => {
  return Math.round(value / step) * step;
};

const formatWeight = (value: number) => {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
};

const toIsoDate = (date = new Date()) => {
  const tzOffsetInMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetInMs).toISOString().slice(0, 10);
};

const initialExerciseDraft: ExerciseDraft = {
  name: "",
  sets: 5,
  reps: 10,
  weight: 0,
  notes: "",
};

export default function GymTracker() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionDate, setSelectedSessionDate] = useState(toIsoDate());
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newExercise, setNewExercise] = useState<ExerciseDraft>(initialExerciseDraft);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from("sessions")
      .select("id, date")
      .order("date", { ascending: false });

    if (error) {
      throw error;
    }

    const nextSessions = data ?? [];
    setSessions(nextSessions);

    if (!nextSessions.length) {
      setSelectedSessionId(null);
      setExercises([]);
      setSelectedSessionDate(toIsoDate());
      return;
    }

    setSelectedSessionId((current) => {
      if (current && nextSessions.some((session) => session.id === current)) {
        return current;
      }
      return nextSessions[0].id;
    });
  }, []);

  const loadExercises = useCallback(async (sessionId: string) => {
    const { data, error } = await supabase
      .from("exercises")
      .select("id, session_id, name, sets, reps, weight, notes")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    setExercises(data ?? []);
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setMessage(null);
      try {
        await loadSessions();
      } catch (error) {
        console.error("Fehler beim Laden der Sessions:", error);
        setMessage("Sessions konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [loadSessions]);

  useEffect(() => {
    if (!selectedSessionId) {
      return;
    }

    const session = sessions.find((item) => item.id === selectedSessionId);
    if (session) {
      setSelectedSessionDate(session.date);
    }

    const run = async () => {
      setMessage(null);
      try {
        await loadExercises(selectedSessionId);
      } catch (error) {
        console.error("Fehler beim Laden der Übungen:", error);
        setMessage("Übungen konnten nicht geladen werden.");
      }
    };

    run();
  }, [loadExercises, selectedSessionId, sessions]);

  const sortedExercises = useMemo(() => {
    const cardio = exercises.find(
      (exercise) => exercise.name.toLowerCase() === "cardio",
    );
    const strength = exercises.filter(
      (exercise) => exercise.name.toLowerCase() !== "cardio",
    );
    return { cardio, strength };
  }, [exercises]);
  const cardioExercise = sortedExercises.cardio;

  const updateExercise = async (exerciseId: string, patch: Partial<Exercise>) => {
    const { error } = await supabase.from("exercises").update(patch).eq("id", exerciseId);
    if (error) {
      throw error;
    }

    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, ...patch } : exercise,
      ),
    );
  };

  const adjustWeight = async (exerciseId: string, delta: number) => {
    const target = exercises.find((exercise) => exercise.id === exerciseId);
    if (!target) {
      return;
    }

    const nextWeight = Math.max(0, roundToStep(target.weight + delta));

    try {
      await updateExercise(exerciseId, { weight: nextWeight });
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Gewichts:", error);
      setMessage("Gewicht konnte nicht gespeichert werden.");
    }
  };

  const updateSessionDate = async () => {
    if (!selectedSessionId) {
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);
      const { error } = await supabase
        .from("sessions")
        .update({ date: selectedSessionDate })
        .eq("id", selectedSessionId);

      if (error) {
        throw error;
      }

      setSessions((current) => {
        const updated = current
          .map((session) =>
            session.id === selectedSessionId
              ? { ...session, date: selectedSessionDate }
              : session,
          )
          .sort((a, b) => b.date.localeCompare(a.date));

        return updated;
      });
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Datums:", error);
      setMessage("Datum konnte nicht gespeichert werden.");
    } finally {
      setSubmitting(false);
    }
  };

  const createNewSession = async () => {
    try {
      setSubmitting(true);
      setMessage(null);

      const sourceSessionId = sessions[0]?.id;
      const sessionDate = toIsoDate();

      const { data: insertedSession, error: sessionError } = await supabase
        .from("sessions")
        .insert([{ date: sessionDate }])
        .select("id, date")
        .single();

      if (sessionError) {
        throw sessionError;
      }

      if (sourceSessionId) {
        const { data: sourceExercises, error: sourceError } = await supabase
          .from("exercises")
          .select("name, sets, reps, weight, notes")
          .eq("session_id", sourceSessionId)
          .order("created_at", { ascending: true });

        if (sourceError) {
          throw sourceError;
        }

        const cloneSource = sourceExercises?.length
          ? sourceExercises
          : DEFAULT_EXERCISE_ROWS;

        const exercisesToInsert = cloneSource.map((exercise) => ({
          session_id: insertedSession.id,
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          notes: exercise.notes ?? "",
        }));

        if (exercisesToInsert.length) {
          const { error: exerciseInsertError } = await supabase
            .from("exercises")
            .insert(exercisesToInsert);

          if (exerciseInsertError) {
            throw exerciseInsertError;
          }
        }
      } else {
        const exercisesToInsert = DEFAULT_EXERCISE_ROWS.map((exercise) => ({
          session_id: insertedSession.id,
          ...exercise,
        }));

        const { error: exerciseInsertError } = await supabase
          .from("exercises")
          .insert(exercisesToInsert);

        if (exerciseInsertError) {
          throw exerciseInsertError;
        }
      }

      await loadSessions();
      setSelectedSessionId(insertedSession.id);
      setSelectedSessionDate(insertedSession.date);
    } catch (error) {
      console.error("Fehler beim Erstellen einer Session:", error);
      setMessage("Neues Training konnte nicht erstellt werden.");
    } finally {
      setSubmitting(false);
    }
  };

  const addExercise = async () => {
    if (!selectedSessionId) {
      setMessage("Bitte zuerst eine Session auswählen.");
      return;
    }

    const trimmedName = newExercise.name.trim();
    if (!trimmedName) {
      setMessage("Bitte einen Gerätenamen eingeben.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      const payload = {
        session_id: selectedSessionId,
        name: trimmedName,
        sets: Math.max(0, Math.floor(newExercise.sets)),
        reps: Math.max(0, Math.floor(newExercise.reps)),
        weight: Math.max(0, roundToStep(newExercise.weight)),
        notes: newExercise.notes.trim(),
      };

      const { data, error } = await supabase
        .from("exercises")
        .insert([payload])
        .select("id, session_id, name, sets, reps, weight, notes")
        .single();

      if (error) {
        throw error;
      }

      setExercises((current) => [...current, data]);
      setNewExercise(initialExerciseDraft);
    } catch (error) {
      console.error("Fehler beim Hinzufügen der Übung:", error);
      setMessage("Übung konnte nicht hinzugefügt werden.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-5xl p-6">Lade Training…</div>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Gym Tracker</h1>
            <p className="text-sm text-zinc-600">
              Geräte, Sätze, Wiederholungen und Gewicht pro Session verwalten.
            </p>
          </div>
          <button
            type="button"
            onClick={createNewSession}
            disabled={submitting}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            Neues Training
          </button>
        </div>
      </header>

      {message ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium">Training auswählen</span>
          <select
            value={selectedSessionId ?? ""}
            onChange={(event) => setSelectedSessionId(event.target.value || null)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {new Date(session.date).toLocaleDateString("de-DE")}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Datum</span>
          <input
            type="date"
            value={selectedSessionDate}
            onChange={(event) => setSelectedSessionDate(event.target.value)}
            onBlur={updateSessionDate}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
      </section>

      {selectedSessionId ? (
        <>
          {cardioExercise ? (
            <section className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <h2 className="mb-3 text-lg font-semibold">Cardio</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-sm text-zinc-700">Minuten</span>
                  <input
                    type="number"
                    min={0}
                    value={cardioExercise.reps}
                    onChange={(event) => {
                      const reps = Math.max(0, Number(event.target.value) || 0);
                      setExercises((current) =>
                        current.map((exercise) =>
                          exercise.id === cardioExercise.id
                            ? { ...exercise, reps }
                            : exercise,
                        ),
                      );
                    }}
                    onBlur={(event) => {
                      const reps = Math.max(0, Number(event.target.value) || 0);
                      updateExercise(cardioExercise.id, { reps }).catch((error) => {
                        console.error("Fehler beim Speichern von Cardio-Minuten:", error);
                        setMessage("Cardio-Minuten konnten nicht gespeichert werden.");
                      });
                    }}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-zinc-700">ZHF</span>
                  <input
                    type="number"
                    min={0}
                    value={cardioExercise.sets}
                    onChange={(event) => {
                      const sets = Math.max(0, Number(event.target.value) || 0);
                      setExercises((current) =>
                        current.map((exercise) =>
                          exercise.id === cardioExercise.id
                            ? { ...exercise, sets }
                            : exercise,
                        ),
                      );
                    }}
                    onBlur={(event) => {
                      const sets = Math.max(0, Number(event.target.value) || 0);
                      updateExercise(cardioExercise.id, { sets }).catch((error) => {
                        console.error("Fehler beim Speichern von Cardio-ZHF:", error);
                        setMessage("Cardio-ZHF konnte nicht gespeichert werden.");
                      });
                    }}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-zinc-700">Notiz</span>
                  <input
                    type="text"
                    value={cardioExercise.notes ?? ""}
                    onChange={(event) => {
                      const notes = event.target.value;
                      setExercises((current) =>
                        current.map((exercise) =>
                          exercise.id === cardioExercise.id
                            ? { ...exercise, notes }
                            : exercise,
                        ),
                      );
                    }}
                    onBlur={(event) =>
                      updateExercise(cardioExercise.id, {
                        notes: event.target.value,
                      }).catch((error) => {
                        console.error("Fehler beim Speichern der Cardio-Notiz:", error);
                        setMessage("Cardio-Notiz konnte nicht gespeichert werden.");
                      })
                    }
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </section>
          ) : null}

          <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Kraftübungen</h2>
            {sortedExercises.strength.length ? (
              sortedExercises.strength.map((exercise) => (
                <article
                  key={exercise.id}
                  className="grid gap-3 rounded-lg border border-zinc-200 p-3 sm:grid-cols-[1fr_auto]"
                >
                  <div className="space-y-2">
                    <h3 className="font-medium">{exercise.name}</h3>
                    <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
                      <label className="space-y-1">
                        <span className="text-xs text-zinc-600">Sätze</span>
                        <input
                          type="number"
                          min={0}
                          value={exercise.sets}
                          onChange={(event) => {
                            const sets = Math.max(0, Number(event.target.value) || 0);
                            setExercises((current) =>
                              current.map((item) =>
                                item.id === exercise.id ? { ...item, sets } : item,
                              ),
                            );
                          }}
                          onBlur={(event) => {
                            const sets = Math.max(0, Number(event.target.value) || 0);
                            updateExercise(exercise.id, { sets }).catch((error) => {
                              console.error("Fehler beim Speichern der Sätze:", error);
                              setMessage("Sätze konnten nicht gespeichert werden.");
                            });
                          }}
                          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-zinc-600">Wdh.</span>
                        <input
                          type="number"
                          min={0}
                          value={exercise.reps}
                          onChange={(event) => {
                            const reps = Math.max(0, Number(event.target.value) || 0);
                            setExercises((current) =>
                              current.map((item) =>
                                item.id === exercise.id ? { ...item, reps } : item,
                              ),
                            );
                          }}
                          onBlur={(event) => {
                            const reps = Math.max(0, Number(event.target.value) || 0);
                            updateExercise(exercise.id, { reps }).catch((error) => {
                              console.error("Fehler beim Speichern der Wiederholungen:", error);
                              setMessage("Wiederholungen konnten nicht gespeichert werden.");
                            });
                          }}
                          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
                        />
                      </label>
                    </div>
                    <label className="block space-y-1 sm:max-w-md">
                      <span className="text-xs text-zinc-600">Notiz</span>
                      <input
                        type="text"
                        value={exercise.notes ?? ""}
                        onChange={(event) => {
                          const notes = event.target.value;
                          setExercises((current) =>
                            current.map((item) =>
                              item.id === exercise.id ? { ...item, notes } : item,
                            ),
                          );
                        }}
                        onBlur={(event) => {
                          updateExercise(exercise.id, { notes: event.target.value }).catch(
                            (error) => {
                              console.error("Fehler beim Speichern der Notiz:", error);
                              setMessage("Notiz konnte nicht gespeichert werden.");
                            },
                          );
                        }}
                        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-end sm:justify-center">
                    <div className="flex items-center overflow-hidden rounded-md border border-zinc-300">
                      <button
                        type="button"
                        onClick={() => adjustWeight(exercise.id, -WEIGHT_STEP)}
                        className="bg-zinc-100 px-3 py-2 text-lg font-semibold transition hover:bg-zinc-200"
                        aria-label={`Gewicht für ${exercise.name} verringern`}
                      >
                        -
                      </button>
                      <div className="min-w-20 px-3 py-2 text-center font-mono text-sm">
                        {formatWeight(exercise.weight)} kg
                      </div>
                      <button
                        type="button"
                        onClick={() => adjustWeight(exercise.id, WEIGHT_STEP)}
                        className="bg-zinc-900 px-3 py-2 text-lg font-semibold text-white transition hover:bg-zinc-700"
                        aria-label={`Gewicht für ${exercise.name} erhöhen`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500">
                Keine Kraftübungen vorhanden.
              </div>
            )}
          </section>

          <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="mb-3 text-lg font-semibold">Gerät hinzufügen</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm text-zinc-700">Name</span>
                <input
                  type="text"
                  value={newExercise.name}
                  onChange={(event) =>
                    setNewExercise((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="z. B. Shoulder Press"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-zinc-700">Sätze</span>
                <input
                  type="number"
                  min={0}
                  value={newExercise.sets}
                  onChange={(event) =>
                    setNewExercise((current) => ({
                      ...current,
                      sets: Math.max(0, Number(event.target.value) || 0),
                    }))
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-zinc-700">Wdh.</span>
                <input
                  type="number"
                  min={0}
                  value={newExercise.reps}
                  onChange={(event) =>
                    setNewExercise((current) => ({
                      ...current,
                      reps: Math.max(0, Number(event.target.value) || 0),
                    }))
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="space-y-1 md:col-span-2">
                <span className="text-sm text-zinc-700">Gewicht ({WEIGHT_STEP} kg Schritte)</span>
                <div className="inline-flex items-center overflow-hidden rounded-md border border-zinc-300">
                  <button
                    type="button"
                    onClick={() =>
                      setNewExercise((current) => ({
                        ...current,
                        weight: Math.max(0, roundToStep(current.weight - WEIGHT_STEP)),
                      }))
                    }
                    className="bg-zinc-100 px-3 py-2 text-lg font-semibold transition hover:bg-zinc-200"
                  >
                    -
                  </button>
                  <div className="min-w-20 px-3 py-2 text-center font-mono text-sm">
                    {formatWeight(newExercise.weight)} kg
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setNewExercise((current) => ({
                        ...current,
                        weight: roundToStep(current.weight + WEIGHT_STEP),
                      }))
                    }
                    className="bg-zinc-900 px-3 py-2 text-lg font-semibold text-white transition hover:bg-zinc-700"
                  >
                    +
                  </button>
                </div>
              </div>

              <label className="space-y-1 md:col-span-2">
                <span className="text-sm text-zinc-700">Notiz (optional)</span>
                <input
                  type="text"
                  value={newExercise.notes}
                  onChange={(event) =>
                    setNewExercise((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={addExercise}
                disabled={submitting}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                Zeile hinzufügen
              </button>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-zinc-600">
          Noch keine Session vorhanden. Erstelle mit dem Button oben dein erstes Training.
        </section>
      )}
    </main>
  );
}
