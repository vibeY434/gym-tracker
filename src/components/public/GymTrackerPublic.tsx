"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CARDIO_STEP,
  DEFAULT_DEVICE_NAMES,
  WEIGHT_STEP,
  createRowId,
  createTemplateRows,
  formatTrainingExport,
  formatWeight,
  isCardio,
  roundToWeightStep,
  sortRows,
  toInt,
  toIsoDate,
  type TrainingRow,
} from "@/lib/gym";

const STORAGE_KEY = "gym-tracker-public-one-shot";

type DraftState = {
  date: string;
  rows: TrainingRow[];
};

export function GymTrackerPublic() {
  const [selectedDate, setSelectedDate] = useState(toIsoDate());
  const [rows, setRows] = useState<TrainingRow[]>([]);
  const [newExistingDevice, setNewExistingDevice] = useState("");
  const [newCustomDevice, setNewCustomDevice] = useState("");
  const [newSets, setNewSets] = useState(5);
  const [newReps, setNewReps] = useState(10);
  const [newWeight, setNewWeight] = useState(0);
  const [newMinutes, setNewMinutes] = useState(20);
  const [notice, setNotice] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DraftState>;
        if (parsed.date) {
          setSelectedDate(parsed.date);
        }
        if (Array.isArray(parsed.rows) && parsed.rows.length) {
          setRows(sortRows(parsed.rows));
        } else {
          setRows(createTemplateRows());
        }
      } else {
        setRows(createTemplateRows());
      }
    } catch {
      setRows(createTemplateRows());
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    const payload: DraftState = { date: selectedDate, rows };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, rows, selectedDate]);

  const updateRow = (rowId: string, patch: Partial<TrainingRow>) => {
    setRows((current) =>
      sortRows(current.map((row) => (row.id === rowId ? { ...row, ...patch } : row))),
    );
  };

  const deleteRow = (rowId: string) => {
    setRows((current) => current.filter((row) => row.id !== rowId));
  };

  const addRow = () => {
    const custom = newCustomDevice.trim();
    const selected = newExistingDevice.trim();
    const rawName = custom || selected;

    if (!rawName) {
      setNotice("Bitte ein Gerät auswählen oder einen Namen eintippen.");
      return;
    }

    const name = rawName;
    const cardio = isCardio(name);

    if (cardio && rows.some((row) => isCardio(row.name))) {
      setNotice("Cardio ist schon drin. Nutz die bestehende Zeile.");
      return;
    }

    const nextRow: TrainingRow = cardio
      ? {
          id: createRowId(),
          name,
          sets: 0,
          reps: toInt(newMinutes),
          weight: 0,
          notes: "",
        }
      : {
          id: createRowId(),
          name,
          sets: toInt(newSets),
          reps: toInt(newReps),
          weight: Math.max(0, roundToWeightStep(newWeight)),
          notes: "",
        };

    setRows((current) => sortRows([...current, nextRow]));
    setNewExistingDevice("");
    setNewCustomDevice("");
    setNewSets(5);
    setNewReps(10);
    setNewWeight(0);
    setNewMinutes(20);
    setNotice(null);
  };

  const resetDraft = () => {
    setSelectedDate(toIsoDate());
    setRows(createTemplateRows());
    setNewExistingDevice("");
    setNewCustomDevice("");
    setNewSets(5);
    setNewReps(10);
    setNewWeight(0);
    setNewMinutes(20);
    setNotice("Vorlage zurückgesetzt.");
  };

  const exportText = useMemo(() => formatTrainingExport(selectedDate, rows), [rows, selectedDate]);

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setNotice("Training als Text kopiert.");
    } catch {
      setNotice("Clipboard blockiert. Unten steht der Text zum manuellen Kopieren.");
    }
  };

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center px-4 py-10 text-zinc-900">
        <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Gym Tracker</p>
          <h1 className="mt-1 text-2xl font-semibold">One-Shot-Vorlage lädt</h1>
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
            <h1 className="mt-1 text-3xl font-semibold">Öffentliche One-Shot-Vorlage</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Kein Login, keine Datenbank, kein Rückschreiben. Du trägst dein Training ein und kopierst es als Text raus. Fertig.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/private"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900"
            >
              Private Version
            </Link>
            <button
              type="button"
              onClick={resetDraft}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={copyExport}
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Text kopieren
            </button>
          </div>
        </div>
      </section>

      {notice ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {notice}
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <section className="space-y-4">
          <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <label className="block text-sm font-medium text-zinc-700">
              Datum
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
          </article>

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
                          onChange={(event) => updateRow(row.id, { name: event.target.value })}
                          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteRow(row.id)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
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
                            updateRow(row.id, {
                              reps: toInt(Number(event.target.value)),
                              sets: 0,
                              weight: 0,
                            })
                          }
                          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          updateRow(row.id, {
                            reps: Math.max(0, toInt(row.reps) - CARDIO_STEP),
                            sets: 0,
                            weight: 0,
                          })
                        }
                        className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-semibold"
                      >
                        -{CARDIO_STEP}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateRow(row.id, {
                            reps: toInt(row.reps) + CARDIO_STEP,
                            sets: 0,
                            weight: 0,
                          })
                        }
                        className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
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
                            updateRow(row.id, { sets: toInt(Number(event.target.value)) })
                          }
                          className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                        />
                      </label>

                      <label className="w-[110px] space-y-1">
                        <span className="text-xs font-medium text-zinc-600">Wiederh.</span>
                        <input
                          type="number"
                          min={0}
                          value={toInt(row.reps)}
                          onChange={(event) =>
                            updateRow(row.id, { reps: toInt(Number(event.target.value)) })
                          }
                          className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
                        />
                      </label>

                      <div className="min-w-[96px] rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-center text-sm font-semibold">
                        {formatWeight(Math.max(0, row.weight ?? 0))} kg
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateRow(row.id, {
                            weight: Math.max(
                              0,
                              roundToWeightStep((row.weight ?? 0) - WEIGHT_STEP),
                            ),
                          })
                        }
                        className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-semibold"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateRow(row.id, {
                            weight: roundToWeightStep((row.weight ?? 0) + WEIGHT_STEP),
                          })
                        }
                        className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
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
              Noch keine Zeilen drin.
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold">+ Zeile hinzufügen</h2>

            <div className="mt-3 space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-zinc-600">Gespeichertes Gerät</span>
                <input
                  list="device-options"
                  value={newExistingDevice}
                  onChange={(event) => setNewExistingDevice(event.target.value)}
                  placeholder="z. B. Seated Leg Press"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setNewWeight((value) => roundToWeightStep(value + WEIGHT_STEP))}
                  className="self-end rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={addRow}
                className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Zeile hinzufügen
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold">Copy & Paste</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Genau dafür ist der Modus da. Hier landet der rohe Text zum Wegkopieren.
            </p>
            <textarea
              readOnly
              value={exportText}
              className="mt-3 min-h-[260px] w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-3 text-sm text-zinc-800"
            />
          </section>
        </aside>
      </section>

      <datalist id="device-options">
        {DEFAULT_DEVICE_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </main>
  );
}
