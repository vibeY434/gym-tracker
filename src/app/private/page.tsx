import type { Metadata } from "next";
import { GymTrackerPrivate } from "@/components/private/GymTrackerPrivate";

export const metadata: Metadata = {
  title: "Gym Tracker Privat",
  description: "Private Trainingsdatenbank mit Supabase, Session-Historie und Login-Vorbereitung.",
};

interface PrivatePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PrivatePage({ searchParams }: PrivatePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const loginError = getFirstSearchParam(resolvedSearchParams.error);

  return <GymTrackerPrivate loginError={loginError} />;
}
