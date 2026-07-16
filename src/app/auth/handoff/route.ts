import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    {
      error:
        "Der alte Session-Handoff ist deaktiviert. Bitte den direkten App-Login verwenden.",
    },
    {
      headers: { "cache-control": "no-store" },
      status: 410,
    },
  );
}
