import type { Metadata } from "next";
import { GymTrackerPrivate } from "@/components/private/GymTrackerPrivate";

export const metadata: Metadata = {
  title: "Gym Tracker Privat",
  description: "Private Trainingsdatenbank mit Supabase, Session-Historie und Login-Vorbereitung.",
};

export default function PrivatePage() {
  return <GymTrackerPrivate />;
}
