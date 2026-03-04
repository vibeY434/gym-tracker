"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, supabaseConfigMissing } from "../lib/supabase";

type Session = {
  id: string;
  date: string;
};

type Exercise = {
  id: string;
  session_id: string;
  name: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  notes: string | null;
};

type ExerciseTemplate = {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  notes: string;
};

const WEIGHT_STEP = 2.5;
const CARDIO_STEP = 5;

const DEFAULT_TEMPLATE: ExerciseTemplate[] = [
  { name: "Cardio", sets: 0, reps: 20, weight: 0, notes: "" },
  { name: "Seated Leg Press", sets: 5, reps: 10, weight: 60, notes: "" },
  { name: "Leg Extension", sets: 5, reps: 10, weight: 45, notes: "" },
  { name: "Seated Leg Curl", sets: 5, reps: 10, weight: 30, notes: "" },
  { name: "Abdominal", sets: 5, reps: 10, weight: 45, notes: "" },
  { name: "Back Extension", sets: 5, reps: 10, weight: 65, notes: "" },
  { name: "Hip Adduction", sets: 5, reps: 10, weight: 65, notes: "" },
  { name: "Hip Abduction", sets: 5, reps: 10, weight: 80, notes: "" },
];

const DEFAULT_DEVICE_NAMES = DEFAULT_TEMPLATE.map((item) => item.name);

const normalize = (value: string) => value.trim().toLowerCase();
const isCardio = (name: string) => normalize(name) === "cardio";

const toIsoDate = (date = new Date()) => {
  const tzOffsetInMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetInMs).toISOString().slice(0, 10);
};

const toInt = (value: number | null | undefined) => Math.max(0, Math.floor(value ?? 0));

const roundToWeightStep = (value: number) => {
  return Math.round(value / WEIGHT_STEP) * WEIGHT_STEP;
};

const formatWeight = (value: number) => {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
};

const errorCode = (error: unknown) => {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
};

const errorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "Unbekannter Fehler";
  }
  return "Unbekannter Fehler";
};

const isMissingTableError = (error: unknown) => errorCode(error) === "PGRST205";

const sortExercises = (rows: Exercise[]) => {
  const orderIndex = new Map(
    DEFAULT_TEMPLATE.map((item, index) => [normalize(item.name), index]),
  );

  return [...rows].sort((a, b) => {
    const aIndex = orderIndex.get(normalize(a.name));
    const bIndex = orderIndex.get(normalize(b.name));

    if (aIndex !== undefined && bIndex !== undefined) {
      return aIndex - bIndex;
    }

    if (aIndex !== undefined) {
      return -1;
    }

    if (bIndex !== undefined) {
      return 1;
    }

    return a.name.localeCompare(b.name, "de");
  });
};

const readExercise = (row: Record<string, unknown>): Exercise => {
  const numberOrNull = (value: unknown) => {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  };

  return {
    id: String(row.id),
    session_id: String(row.session_id),
    name: String(row.name ?? ""),
    sets: numberOrNull(row.sets),
    reps: numberOrNull(row.reps),
    weight: numberOrNull(row.weight),
    notes: typeof row.notes === "string" ? row.notes : null,
  };
};

export default function GymTrackerPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(toIsoDate());
  const [rows, setRows] = useState<Exercise[]>([]);

  const [deviceOptions, setDeviceOptions] = useState<string[]>(DEFAULT_DEVICE_NAMES);
  const [newExistingDevice, setNewExistingDevice] = useState("");
  const [newCustomDevice, setNewCustomDevice] = useState("");
  const [newSets, setNewSets] = useState(5);
  const [newReps, setNewReps] = useState(10);
  const [newWeight, setNewWeight] = useState(0);
  const [newMinutes, setNewMinutes] = useState(20);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<React.ReactNode | null>(null);
  const [dbSetupRequired, setDbSetupRequired] = useState(false);
  const [deletedExercise, setDeletedExercise] = useState<Exercise | null>(null);

  const updateLocalRow = (exerciseId: string, patch: Partial<Exercise>) => {
    setRows((current) =>
      sortExercises(
        current.map((row) => (row.id === exerciseId ? { ...row, ...patch } : row)),
      ),
    );
  };

  const withDbErrorHandling = (error: unknown, fallback: string) => {
    console.error(fallback, error);

    if (isMissingTableError(error)) {
      setDbSetupRequired(true);
      setNotice(
        "Supabase-Tabellen fehlen. Fuehre bitte schema.sql (und optional seed-data.sql) im Supabase SQL Editor aus.",
      );
      return;
    }

    setNotice(`${fallback}: ${errorMessage(error)}`);
  };

  const loadDeviceOptions = useCallback(async (searchTerm = "") => {
    if (!supabase) {
      return;
    }

    let query = supabase
      .from("gt_exercises")
      .select("name")
      .limit(50);

    if (searchTerm.trim()) {
      query = query.ilike("name", `%${searchTerm.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const names = new Set(DEFAULT_DEVICE_NAMES);

    (data ?? []).forEach((entry) => {
      const name = String(entry.name ?? "").trim();
      if (name) {
        names.add(name);
      }
    });

    setDeviceOptions(Array.from(names).sort((a, b) => a.localeCompare(b, "de")));
  }, []);

  const loadSessions = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { data, error } = await supabase
      .from("gt_sessions")
      .select("id, date")
      .order("date", { ascending: false });

    if (error) {
      throw error;
    }

    const nextSessions = (data ?? []).map((session) => ({
      id: String(session.id),
      date: String(session.date),
    }));

    setSessions(nextSessions);

    if (!nextSessions.length) {
      setSelectedSessionId(null);
      setSelectedDate(toIsoDate());
      setRows([]);
      return;
    }

    setSelectedSessionId((current) => {
      if (current && nextSessions.some((session) => session.id === current)) {
        return current;
      }
      return nextSessions[0].id;
    });
  }, []);

  const loadRows = useCallback(async (sessionId: string) => {
    if (!supabase) {
      return;
    }

    const { data, error } = await supabase
      .from("gt_exercises")
      .select("*")
      .eq("session_id", sessionId);

    if (error) {
      throw error;
    }

    const parsedRows = (data ?? []).map((row) => readExercise(row as Record<string, unknown>));
    setRows(sortExercises(parsedRows));
  }, []);

  useEffect(() => {
    const boot = async () => {
      if (supabaseConfigMissing || !supabase) {
        setNotice(
          "Supabase ist nicht konfiguriert. Setze NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setNotice(null);
      setDbSetupRequired(false);

      try {
        await Promise.all([loadSessions(), loadDeviceOptions()]);
      } catch (error) {
        withDbErrorHandling(error, "Initiales Laden fehlgeschlagen");
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, [loadDeviceOptions, loadSessions]);

  useEffect(() => {
    if (!selectedSessionId) {
      return;
    }

    const selected = sessions.find((session) => session.id === selectedSessionId);
    if (selected) {
      setSelectedDate(selected.date);
    }

    const run = async () => {
      try {
        await loadRows(selectedSessionId);
      } catch (error) {
        withDbErrorHandling(error, "Uebungen konnten nicht geladen werden");
      }
    };

    run();
  }, [loadRows, selectedSessionId, sessions]);

  const saveSessionDate = async () => {
    if (!supabase || !selectedSessionId) {
      return;
    }

    try {
      setBusy(true);
      setNotice(null);

      const { error } = await supabase
        .from("gt_sessions")
        .update({ date: selectedDate })
        .eq("id", selectedSessionId);

      if (error) {
        throw error;
      }

      setSessions((current) =>
        [...current]
          .map((session) =>
            session.id === selectedSessionId ? { ...session, date: selectedDate } : session,
          )
          .sort((a, b) => b.date.localeCompare(a.date)),
      );
    } catch (error) {
      withDbErrorHandling(error, "Datum konnte nicht gespeichert werden");
    } finally {
      setBusy(false);
    }
  };

  const createNewSession = async () => {
    if (!supabase) {
      return;
    }

    try {
      setBusy(true);
      setNotice(null);

      const sourceSessionId = sessions[0]?.id ?? null;
      const today = toIsoDate();

      const { data: newSession, error: sessionError } = await supabase
        .from("gt_sessions")
        .insert([{ date: today }])
        .select("id, date")
        .single();

      if (sessionError) {
        throw sessionError;
      }

      let cloneRows: Array<Record<string, unknown>> = [];

      if (sourceSessionId) {
        const { data: sourceRows, error: sourceError } = await supabase
          .from("gt_exercises")
          .select("*")
          .eq("session_id", sourceSessionId);

        if (sourceError) {
          throw sourceError;
        }

        cloneRows = (sourceRows ?? []).map((row) => row as Record<string, unknown>);
      }

      const sourceForInsert: ExerciseTemplate[] = cloneRows.length
        ? cloneRows.map((row) => {
          const name = String(row.name ?? "").trim() || "Unbenannt";
          const reps = toInt(
            typeof row.reps === "number"
              ? row.reps
              : typeof row.reps === "string"
                ? Number(row.reps)
                : 0,
          );
          const sets = toInt(
            typeof row.sets === "number"
              ? row.sets
              : typeof row.sets === "string"
                ? Number(row.sets)
                : 0,
          );
          const weightValue =
            typeof row.weight === "number"
              ? row.weight
              : typeof row.weight === "string"
                ? Number(row.weight)
                : 0;

          return {
            name,
            sets: isCardio(name) ? 0 : sets,
            reps: reps,
            weight: isCardio(name) ? 0 : Math.max(0, roundToWeightStep(weightValue || 0)),
            notes: typeof row.notes === "string" ? row.notes : "",
          };
        })
        : DEFAULT_TEMPLATE;

      if (sourceForInsert.length) {
        const payload = sourceForInsert.map((item) => ({
          session_id: newSession.id,
          name: item.name,
          sets: toInt(item.sets),
          reps: toInt(item.reps),
          weight: Math.max(0, roundToWeightStep(item.weight)),
          notes: item.notes,
        }));

        const { error: insertRowsError } = await supabase.from("gt_exercises").insert(payload);

        if (insertRowsError) {
          throw insertRowsError;
        }
      }

      await loadSessions();
      await loadDeviceOptions();
      setSelectedSessionId(String(newSession.id));
      setSelectedDate(String(newSession.date));
      await loadRows(String(newSession.id));
      setNotice("Neue Session erstellt und Werte aus der letzten Session übernommen.");
    } catch (error) {
      withDbErrorHandling(error, "Neue Session konnte nicht erstellt werden");
    } finally {
      setBusy(false);
    }
  };

  const deleteRow = async (exerciseId: string) => {
    if (!supabase) {
      return;
    }

    try {
      setBusy(true);
      setNotice(null);

      // Speichere die gelöschte Übung für Undo
      const exerciseToDelete = rows.find(row => row.id === exerciseId);
      if (exerciseToDelete) {
        setDeletedExercise(exerciseToDelete);
      }

      const { error } = await supabase.from("gt_exercises").delete().eq("id", exerciseId);

      if (error) {
        throw error;
      }

      setRows((current) => current.filter((row) => row.id !== exerciseId));

      // Zeige Undo-Nachricht an (JSX statt HTML-String)
      setNotice(
        <div className="flex items-center">
          Übung gelöscht.
          <button
            onClick={undoDelete}
            className="ml-2 text-blue-600 underline decoration-blue-600/30 underline-offset-4 hover:text-blue-800"
          >
            Rückgängig machen
          </button>
        </div>
      );

      // Automatisches Verstecken nach 5 Sekunden
      setTimeout(() => {
        setDeletedExercise(null);
        setNotice(null);
      }, 5000);
    } catch (error) {
      withDbErrorHandling(error, "Zeile konnte nicht geloescht werden");
    } finally {
      setBusy(false);
    }
  };

  const saveRowPatch = async (exerciseId: string, patch: Partial<Exercise>) => {
    if (!supabase) {
      return;
    }

    const dbPatch = {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.sets !== undefined ? { sets: patch.sets } : {}),
      ...(patch.reps !== undefined ? { reps: patch.reps } : {}),
      ...(patch.weight !== undefined ? { weight: patch.weight } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    };

    const { error } = await supabase.from("gt_exercises").update(dbPatch).eq("id", exerciseId);
    if (error) {
      throw error;
    }
  };

  const changeWeight = async (row: Exercise, delta: number) => {
    const current = row.weight ?? 0;
    const next = Math.max(0, roundToWeightStep(current + delta));
    updateLocalRow(row.id, { weight: next });

    try {
      await saveRowPatch(row.id, { weight: next });
    } catch (error) {
      withDbErrorHandling(error, "Gewicht konnte nicht gespeichert werden");
      if (selectedSessionId) {
        await loadRows(selectedSessionId);
      }
    }
  };

  const changeCardioMinutes = async (row: Exercise, delta: number) => {
    const current = row.reps ?? 0;
    const next = Math.max(0, current + delta);
    updateLocalRow(row.id, { reps: next, sets: 0, weight: 0 });

    try {
      await saveRowPatch(row.id, { reps: next, sets: 0, weight: 0 });
    } catch (error) {
      withDbErrorHandling(error, "Cardio-Minuten konnten nicht gespeichert werden");
      if (selectedSessionId) {
        await loadRows(selectedSessionId);
      }
    }
  };

  const addRow = async () => {
    if (!supabase || !selectedSessionId) {
      return;
    }

    const custom = newCustomDevice.trim();
    const selected = newExistingDevice.trim();
    const rawName = custom || selected;

    if (!rawName) {
      setNotice("Bitte ein Gerät auswählen oder neuen Namen eingeben.");
      return;
    }

    const name = rawName;
    const cardio = isCardio(name);

    if (cardio && rows.some((row) => isCardio(row.name))) {
      setNotice("Cardio ist bereits vorhanden. Bitte die bestehende Cardio-Zeile nutzen.");
      return;
    }

    try {
      setBusy(true);
      setNotice(null);

      const payload = cardio
        ? {
          session_id: selectedSessionId,
          name,
          sets: 0,
          reps: toInt(newMinutes),
          weight: 0,
          notes: "",
        }
        : {
          session_id: selectedSessionId,
          name,
          sets: toInt(newSets),
          reps: toInt(newReps),
          weight: Math.max(0, roundToWeightStep(newWeight)),
          notes: "",
        };

      const { data, error } = await supabase
        .from("gt_exercises")
        .insert([payload])
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const inserted = readExercise(data as Record<string, unknown>);
      setRows((current) => sortExercises([...current, inserted]));
      setDeviceOptions((current) =>
        Array.from(new Set([...current, name])).sort((a, b) => a.localeCompare(b, "de")),
      );

      setNewCustomDevice("");
      if (!custom) {
        setNewExistingDevice(name);
      }
      if (!cardio) {
        setNewSets(5);
        setNewReps(10);
        setNewWeight(0);
      }
    } catch (error) {
      withDbErrorHandling(error, "Neue Zeile konnte nicht hinzugefuegt werden");
    } finally {
      setBusy(false);
    }
  };

  const undoDelete = async () => {
    if (!supabase || !deletedExercise || !selectedSessionId) {
      return;
    }

    try {
      setBusy(true);
      setNotice(null);

      const payload = {
        ...deletedExercise,
        session_id: selectedSessionId
      };

      const { error } = await supabase.from("gt_exercises").insert([payload]);

      if (error) {
        throw error;
      }

      setRows(prev => sortExercises([...prev, deletedExercise]));
      setDeletedExercise(null);
      setNotice("Löschung rückgängig gemacht.");
    } catch (error) {
      withDbErrorHandling(error, "Undo fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const selectedRows = useMemo(() => sortExercises(rows), [rows]);

  const isOldSession =
    sessions.length > 0 && selectedSessionId !== null && selectedSessionId !== sessions[0].id;
  const isLocked = dbSetupRequired || supabaseConfigMissing || isOldSession;

  if (loading) {
    return <main className="mx-auto max-w-4xl p-4">Lade Daten…</main>;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 pb-10">
      <datalist id="device-options">
        {deviceOptions.map((device) => (
          <option key={device} value={device} />
        ))}
      </datalist>

      <header className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Gym Tracker</h1>
            <p className="text-sm text-zinc-600">
              Letzte Session laden, neue Session anlegen, Gewichte in 2.5kg anpassen.
            </p>
          </div>
          <button
            type="button"
            onClick={createNewSession}
            disabled={busy || dbSetupRequired || supabaseConfigMissing}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            Neue Session
          </button>
        </div>
      </header>

      {notice ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {notice}
        </section>
      ) : null}

      {dbSetupRequired ? (
        <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Supabase Setup fehlt</p>
          <p className="mt-1">
            In deinem Supabase-Projekt fehlen die Tabellen `gt_sessions` und `gt_exercises`.
            Fuehre im SQL Editor zuerst `schema.sql` und danach optional `seed-data.sql` aus.
          </p>
          <p className="mt-2 text-xs text-red-700">
            Dateien im Repo: `/home/openclaw/gym-tracker/schema.sql` und
            `/home/openclaw/gym-tracker/seed-data.sql`
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Session</span>
            <select
              value={selectedSessionId ?? ""}
              onChange={(event) => setSelectedSessionId(event.target.value || null)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              disabled={!sessions.length}
            >
              {sessions.length ? null : <option value="">Keine Session</option>}
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {new Date(session.date).toLocaleDateString("de-DE")}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Datum</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              onBlur={saveSessionDate}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              disabled={!selectedSessionId || isLocked}
            />
          </label>
        </div>
      </section>

      {selectedSessionId ? (
        <section className="space-y-3">
          {selectedRows.length ? (
            selectedRows.map((row) => {
              const cardio = isCardio(row.name);

              return (
                <article
                  key={row.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"
                >
                  <div className="grid grid-cols-[2.5rem_1fr] gap-2">
                    <button
                      type="button"
                      onClick={() => deleteRow(row.id)}
                      disabled={busy || isLocked}
                      className="rounded-lg border border-red-300 bg-red-50 px-2 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Zeile ${row.name} löschen`}
                    >
                      -
                    </button>

                    <label className="space-y-1">
                      <span className="text-xs font-medium text-zinc-600">Gerät</span>
                      <input
                        list="device-options"
                        value={row.name}
                        onChange={(event) =>
                          updateLocalRow(row.id, { name: event.target.value })
                        }
                        onBlur={async (event) => {
                          const name = event.target.value.trim();

                          if (!name) {
                            if (selectedSessionId) {
                              await loadRows(selectedSessionId);
                            }
                            return;
                          }

                          try {
                            await saveRowPatch(row.id, { name });

                            setDeviceOptions((current) =>
                              Array.from(new Set([...current, name])).sort((a, b) =>
                                a.localeCompare(b, "de"),
                              ),
                            );
                          } catch (error) {
                            withDbErrorHandling(error, "Gerät konnte nicht gespeichert werden");
                            if (selectedSessionId) {
                              await loadRows(selectedSessionId);
                            }
                          }
                        }}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        disabled={isLocked}
                      />
                    </label>
                  </div>

                  {cardio ? (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <label className="min-w-[110px] flex-1 space-y-1">
                        <span className="text-xs font-medium text-zinc-600">Minuten</span>
                        <input
                          type="number"
                          min={0}
                          value={toInt(row.reps)}
                          onChange={(event) =>
                            updateLocalRow(row.id, {
                              reps: toInt(Number(event.target.value)),
                              sets: 0,
                              weight: 0,
                            })
                          }
                          onBlur={async (event) => {
                            const minutes = toInt(Number(event.target.value));
                            try {
                              await saveRowPatch(row.id, {
                                reps: minutes,
                                sets: 0,
                                weight: 0,
                              });
                            } catch (error) {
                              withDbErrorHandling(
                                error,
                                "Cardio-Minuten konnten nicht gespeichert werden",
                              );
                              if (selectedSessionId) {
                                await loadRows(selectedSessionId);
                              }
                            }
                          }}
                          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                          disabled={isLocked}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => changeCardioMinutes(row, -CARDIO_STEP)}
                        className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-semibold"
                        disabled={isLocked}
                      >
                        -{CARDIO_STEP}
                      </button>
                      <button
                        type="button"
                        onClick={() => changeCardioMinutes(row, CARDIO_STEP)}
                        className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                        disabled={isLocked}
                      >
                        +{CARDIO_STEP}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <label className="w-[92px] space-y-1">
                        <span className="text-xs font-medium text-zinc-600">Sätze</span>
                        <input
                          type="number"
                          min={0}
                          value={toInt(row.sets)}
                          onChange={(event) =>
                            updateLocalRow(row.id, { sets: toInt(Number(event.target.value)) })
                          }
                          onBlur={async (event) => {
                            const sets = toInt(Number(event.target.value));
                            try {
                              await saveRowPatch(row.id, { sets });
                            } catch (error) {
                              withDbErrorHandling(error, "Sätze konnten nicht gespeichert werden");
                              if (selectedSessionId) {
                                await loadRows(selectedSessionId);
                              }
                            }
                          }}
                          className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                          disabled={isLocked}
                        />
                      </label>

                      <label className="w-[110px] space-y-1">
                        <span className="text-xs font-medium text-zinc-600">Wiederh.</span>
                        <input
                          type="number"
                          min={0}
                          value={toInt(row.reps)}
                          onChange={(event) =>
                            updateLocalRow(row.id, { reps: toInt(Number(event.target.value)) })
                          }
                          onBlur={async (event) => {
                            const reps = toInt(Number(event.target.value));
                            try {
                              await saveRowPatch(row.id, { reps });
                            } catch (error) {
                              withDbErrorHandling(
                                error,
                                "Wiederholungen konnten nicht gespeichert werden",
                              );
                              if (selectedSessionId) {
                                await loadRows(selectedSessionId);
                              }
                            }
                          }}
                          className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                          disabled={isLocked}
                        />
                      </label>

                      <div className="min-w-[96px] rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-center text-sm font-semibold">
                        {formatWeight(Math.max(0, row.weight ?? 0))} kg
                      </div>

                      <button
                        type="button"
                        onClick={() => changeWeight(row, -WEIGHT_STEP)}
                        className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-semibold"
                        disabled={isLocked}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => changeWeight(row, WEIGHT_STEP)}
                        className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                        disabled={isLocked}
                      >
                        +
                      </button>
                    </div>
                  )}
                </article>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">
              Keine Zeilen in dieser Session.
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">
          Keine Session vorhanden. Erstelle zuerst eine Session mit &quot;Neue Session&quot;.
        </section>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">+ Zeile hinzufügen</h2>
        </div>

        <div className="mt-3 space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-600">Gespeichertes Gerät</span>
            <input
              list="device-options"
              value={newExistingDevice}
              onChange={(event) => setNewExistingDevice(event.target.value)}
              placeholder="z. B. Seated Leg Press"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              disabled={isLocked}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-600">Oder neues Gerät</span>
            <input
              type="text"
              value={newCustomDevice}
              onChange={(event) => setNewCustomDevice(event.target.value)}
              placeholder="Neuen Gerätenamen eingeben"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              disabled={isLocked}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <label className="w-[92px] space-y-1">
              <span className="text-xs font-medium text-zinc-600">Sätze</span>
              <input
                type="number"
                min={0}
                value={newSets}
                onChange={(event) => setNewSets(toInt(Number(event.target.value)))}
                className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                disabled={isLocked}
              />
            </label>

            <label className="w-[110px] space-y-1">
              <span className="text-xs font-medium text-zinc-600">Wiederh.</span>
              <input
                type="number"
                min={0}
                value={newReps}
                onChange={(event) => setNewReps(toInt(Number(event.target.value)))}
                className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                disabled={isLocked}
              />
            </label>

            <label className="w-[110px] space-y-1">
              <span className="text-xs font-medium text-zinc-600">Cardio Min.</span>
              <input
                type="number"
                min={0}
                value={newMinutes}
                onChange={(event) => setNewMinutes(toInt(Number(event.target.value)))}
                className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                disabled={isLocked}
              />
            </label>

            <div className="min-w-[96px] rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-center text-sm font-semibold self-end">
              {formatWeight(newWeight)} kg
            </div>

            <button
              type="button"
              onClick={() => setNewWeight((value) => Math.max(0, roundToWeightStep(value - WEIGHT_STEP)))}
              className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-semibold self-end"
              disabled={isLocked}
            >
              -
            </button>
            <button
              type="button"
              onClick={() => setNewWeight((value) => roundToWeightStep(value + WEIGHT_STEP))}
              className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white self-end"
              disabled={isLocked}
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={addRow}
            disabled={!selectedSessionId || busy || isLocked}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            Zeile hinzufügen
          </button>
        </div>
      </section>
    </main>
  );
}


