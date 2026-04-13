import type { Metadata } from "next";
import { GymTrackerPublic } from "@/components/public/GymTrackerPublic";

export const metadata: Metadata = {
  title: "Gym Tracker One-Shot",
  description: "Öffentliche Gym-Vorlage ohne Datenbank mit Copy-Paste-Export.",
};

export default function OneShotPage() {
  return <GymTrackerPublic />;
}
