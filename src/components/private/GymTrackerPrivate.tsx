"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Session as AuthSession } from "@supabase/supabase-js";
import {
  CARDIO_STEP,
  DEFAULT_DEVICE_NAMES,
  DEFAULT_TEMPLATE,
  WEIGHT_STEP,
  formatWeight,
  isCardio,
  readExercise,
  roundToWeightStep,
  sortRows,
  toInt,
  toIsoDate,
  type Exercise,
  type ExerciseTemplate,
  type TrainingSession,
} from "@/lib/gym";
import {
  gymTrackerAuthRequired,
  privateAppOrigin,
  supabase,
  supabaseConfigMissing,
} from "@/lib/supabase";

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

export function GymTrackerPrivate() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
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
  const [notice, setNotice] = useState<ReactNode | null>(null);
  const [dbSetupRequired, setDbSetupRequired] = useState(false);
  const [deletedExercise, setDeletedExercise] = useState<Exercise | null>(null);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(gymTrackerAuthRequired);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearUndoTimeout = useCallback(() => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
  }, []);

  const updateLocalRow = (exerciseId: string, patch: Partial<Exercise>) => {
    setRows((current) =>
      sortRows(current.map((row) => (row.id === exerciseId ? { ...row, ...patch } : row))),
    );
  };

  const withDbErrorHandling = (error: unknown, fallback: string) => {
    console.error(fallback, error);

    if (isMissingTableError(error)) {
      setDbSetupRequired(true);
      setNotice(
        "Supabase-Tabellen fehlen oder sind alt. Fuehre schema.sql, equipment.sql und migrations/002_authenticated_access.sql aus.",
      );
      return;
    }

    setNotice(`${fallback}: ${errorMessage(error)}`);
  };

  const loadDeviceOptions = useCallback(async (searchTerm = "") => {
    if (!supabase) {
      return;
    }

    const { data: equipmentData } = await supabase
      .from("gt_equipment")
      .select("name")
      .order("name");

    let query = supabase.from("gt_exercises").select("name").limit(50);

    if (searchTerm.trim()) {
      query = query.ilike("name", `%${searchTerm.trim()}%`);
    }

    const { data: exercisesData, error } = await query;

    if (error) {
      throw error;
    }

    const names = new Set<string>(DEFAULT_DEVICE_NAMES);

    (equipmentData ?? []).forEach((entry) => {
      const name = String(entry.name ?? "").trim();
      if (name) {
        names.add(name);
      }
    });

    (exercisesData ?? []).forEach((entry) => {
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
    setRows(sortRows(parsedRows));
  }, []);

  useEffect(() => {
    const supabaseClient = supabase;

    if (!gymTrackerAuthRequired || !supabaseClient) {
      setAuthLoading(false);
      return;
    }

    let active = true;

    const bootAuth = async () => {
      const { data, error } = await supabaseClient.auth.getSession();
      if (!active) {
        return;
      }

      if (error) {
        console.error("Auth-Session konnte nicht geladen werden", error);
      }

      setAuthSession(data.session);
      setAuthLoading(false);
    };

    void bootAuth();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setAuthSession(session);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const accessBlocked = gymTrackerAuthRequired && !authSession;

    if (supabaseConfigMissing || !supabase || authLoading || accessBlocked) {
      setLoading(false);
      return;
    }

    const boot = async () => {
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

    void boot();
  }, [authLoading, authSession, loadDeviceOptions, loadSessions]);

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

    void run();
  }, [loadRows, selectedSessionId, sessions]);

  useEffect(() => {
    return () => {
      clearUndoTimeout();
    };
  }, [clearUndoTimeout]);

  const requestMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = loginEmail.trim().toLowerCase();
    if (!email) {
      setLoginNotice("Trag eine Mailadresse ein.");
      return;
    }

    try {
      setLoginBusy(true);
      setLoginNotice(null);

      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Magic Link konnte nicht angefordert werden.");
      }

      setLoginNotice(
        payload.message ||
          "Wenn die Adresse freigeschaltet ist, ist der Magic Link unterwegs.",
      );
    } catch (error) {
      setLoginNotice(errorMessage(error));
    } finally {
      setLoginBusy(false);
    }
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setSessions([]);
    setRows([]);
    setSelectedSessionId(null);
  };

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
              reps,
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
          const { error: rollbackError } = await supabase
            .from("gt_sessions")
            .delete()
            .eq("id", newSession.id);
          if (rollbackError) {
            console.error("Rollback für leere Session fehlgeschlagen", rollbackError);
          }
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

      const exerciseToDelete = rows.find((row) => row.id === exerciseId);
      if (exerciseToDelete) {
        setDeletedExercise(exerciseToDelete);
      }

      const { error } = await supabase.from("gt_exercises").delete().eq("id", exerciseId);

      if (error) {
        throw error;
      }

      setRows((current) => current.filter((row) => row.id !== exerciseId));

      setNotice(
        <div className="flex items-center">
          Übung gelöscht.
          <button
            onClick={undoDelete}
            className="ml-2 text-blue-600 underline decoration-blue-600/30 underline-offset-4 hover:text-blue-800"
          >
            Rückgängig machen
          </button>
        </div>,
      );

      clearUndoTimeout();
      undoTimeoutRef.current = setTimeout(() => {
        setDeletedExercise(null);
        setNotice(null);
        undoTimeoutRef.current = null;
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
      setRows((current) => sortRows([...current, inserted]));
      setNewExistingDevice("");
      setNewCustomDevice("");
      setNewSets(5);
      setNewReps(10);
      setNewWeight(0);
      setNewMinutes(20);
      await loadDeviceOptions();
    } catch (error) {
      withDbErrorHandling(error, "Zeile konnte nicht hinzugefuegt werden");
    } finally {
      setBusy(false);
    }
  };

  const undoDelete = async () => {
    if (!supabase || !selectedSessionId || !deletedExercise) {
      return;
    }

    try {
      setBusy(true);
      setNotice(null);
      clearUndoTimeout();

      const { error } = await supabase
        .from("gt_exercises")
        .insert([
          {
            session_id: selectedSessionId,
            name: deletedExercise.name,
            sets: deletedExercise.sets,
            reps: deletedExercise.reps,
            weight: deletedExercise.weight,
            notes: deletedExercise.notes,
          },
        ]);

      if (error) {
        throw error;
      }

      await loadRows(selectedSessionId);
      setDeletedExercise(null);
      setNotice("Übung wiederhergestellt.");
    } catch (error) {
      withDbErrorHandling(error, "Übung konnte nicht wiederhergestellt werden");
    } finally {
      setBusy(false);
    }
  };

  const sessionOptions = useMemo(() => sessions, [sessions]);
  const selectedSession =
    sessionOptions.find((session) => session.id === selectedSessionId) ?? null;
  const isLocked = !!selectedSession && selectedSession.id !== sessionOptions[0]?.id;

  if (authLoading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 text-zinc-900">
        <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Gym Tracker</p>
          <h1 className="mt-1 text-2xl font-semibold">Privater Bereich lädt</h1>
          <p className="mt-2 text-sm text-zinc-600">Ich prüfe gerade die Session.</p>
        </section>
      </main>
    );
  }

  if (gymTrackerAuthRequired && !authSession) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 text-zinc-900">
        <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Gym Tracker</p>
              <h1 className="mt-1 text-3xl font-semibold">Privater Bereich</h1>
              <p className="mt-2 max-w-xl text-sm text-zinc-600">
                Hier hängt später die Supabase-Version mit Schreibzugriff. Öffentliche One-Shot-Nutzung läuft getrennt ohne Datenbank.
              </p>
            </div>
            <Link
              href="/one-shot"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900"
            >
              Öffentliche Vorlage
            </Link>
          </div>

          <form onSubmit={requestMagicLink} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-zinc-700">
              Mailadresse
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="deine@mail.de"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                autoComplete="email"
              />
            </label>

            <button
              type="submit"
              disabled={loginBusy || supabaseConfigMissing}
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {loginBusy ? "Link wird gesendet..." : "Magic Link senden"}
            </button>
          </form>

          {loginNotice ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {loginNotice}
            </div>
          ) : null}

          {supabaseConfigMissing ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              Supabase fehlt noch. Setz zuerst <code>NEXT_PUBLIC_SUPABASE_URL</code> und <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            </div>
          ) : null}

          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            <p className="font-semibold text-zinc-900">Damit das live wirklich dicht ist:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>in Supabase die offenen Policies mit <code>migrations/002_authenticated_access.sql</code> ersetzen</li>
              <li>nur erlaubte Nutzer einladen oder öffentliche Signups abschalten</li>
              <li><code>GYM_ALLOWED_EMAILS</code> und <code>NEXT_PUBLIC_GYM_TRACKER_REQUIRE_AUTH=true</code> setzen</li>
            </ul>
            {privateAppOrigin ? (
              <p className="mt-2 text-xs text-zinc-500">Redirect-Origin aktuell: {privateAppOrigin}</p>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8 text-zinc-900">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Gym Tracker</p>
            <h1 className="mt-1 text-3xl font-semibold">Private Trainingsdatenbank</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Neue Sessions starten mit den Werten der letzten Session. Nur die neueste Session bleibt editierbar, ältere Sessions sind schreibgeschützt.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/one-shot"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900"
            >
              Öffentliche Vorlage
            </Link>
            {authSession ? (
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900"
              >
                Abmelden
              </button>
            ) : null}
            <button
              type="button"
              onClick={createNewSession}
              disabled={busy || loading || dbSetupRequired || supabaseConfigMissing}
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              Neue Session
            </button>
          </div>
        </div>
      </section>

      {!gymTrackerAuthRequired ? (
        <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
          Login-Zwang ist noch nicht live. Der Code ist vorbereitet, aber ohne <code>NEXT_PUBLIC_GYM_TRACKER_REQUIRE_AUTH=true</code> bleibt dieser Pfad offen.
        </section>
      ) : null}

      {notice ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {notice}
        </section>
      ) : null}

      {supabaseConfigMissing ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Supabase ist hier noch nicht konfiguriert. Für den privaten Modus brauchst du <code>NEXT_PUBLIC_SUPABASE_URL</code> und <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </section>
      ) : null}

      {dbSetupRequired ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
          <h2 className="text-base font-semibold">Datenbank-Setup erforderlich</h2>
          <p className="mt-2">
            Führe <code>schema.sql</code>, <code>equipment.sql</code> und danach <code>migrations/002_authenticated_access.sql</code> im Supabase SQL Editor aus.
          </p>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-zinc-700">
            Session auswählen
            <select
              value={selectedSessionId ?? ""}
              onChange={(event) => setSelectedSessionId(event.target.value || null)}
              className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              disabled={loading || !sessions.length}
            >
              {sessions.length ? (
                sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.date}
                  </option>
                ))
              ) : (
                <option value="">Keine Sessions vorhanden</option>
              )}
            </select>
          </label>

          <label className="mt-4 block text-sm font-medium text-zinc-700">
            Datum
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              onBlur={saveSessionDate}
              className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              disabled={!selectedSessionId || isLocked}
            />
          </label>

          <p className="mt-3 text-xs text-zinc-500">
            {isLocked
              ? "Historische Session: Eingaben sind gesperrt."
              : "Aktuelle Session: Änderungen werden beim Verlassen des Felds gespeichert."}
          </p>
        </div>

        {loading ? (
          <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">
            Lade Trainingsdaten…
          </section>
        ) : selectedSession ? (
          <section className="space-y-4">
            {rows.length ? (
              rows.map((row) => {
                const cardio = isCardio(row.name);

                return (
                  <article
                    key={row.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <label className="block text-sm font-medium text-zinc-700">
                          Gerät
                          <input
                            type="text"
                            value={row.name}
                            onChange={(event) => updateLocalRow(row.id, { name: event.target.value })}
                            onBlur={async (event) => {
                              const nextName = event.target.value.trim() || row.name;
                              updateLocalRow(row.id, { name: nextName });
                              try {
                                await saveRowPatch(row.id, { name: nextName });
                                await loadDeviceOptions();
                              } catch (error) {
                                withDbErrorHandling(error, "Gerätename konnte nicht gespeichert werden");
                                if (selectedSessionId) {
                                  await loadRows(selectedSessionId);
                                }
                              }
                            }}
                            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                            disabled={isLocked}
                          />
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteRow(row.id)}
                        disabled={busy || isLocked}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-zinc-400"
                      >
                        Löschen
                      </button>
                    </div>

                    {cardio ? (
                      <div className="mt-4 flex flex-wrap items-end gap-2">
                        <label className="w-[140px] space-y-1">
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
      </section>

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

            <div className="min-w-[96px] self-end rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-center text-sm font-semibold">
              {formatWeight(newWeight)} kg
            </div>

            <button
              type="button"
              onClick={() =>
                setNewWeight((value) => Math.max(0, roundToWeightStep(value - WEIGHT_STEP)))
              }
              className="self-end rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-semibold"
              disabled={isLocked}
            >
              -
            </button>
            <button
              type="button"
              onClick={() => setNewWeight((value) => roundToWeightStep(value + WEIGHT_STEP))}
              className="self-end rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
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

      <datalist id="device-options">
        {deviceOptions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </main>
  );
}
