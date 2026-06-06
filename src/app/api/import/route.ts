import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getCurrentDbUser } from "@/lib/session";
import { importFitbitTakeout, importGoogleFitTakeout } from "@/lib/import/takeout";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const zip = await JSZip.loadAsync(buf);
  const user = await getCurrentDbUser();

  const hasFitbit = Object.keys(zip.files).some((p) => p.includes("Fitbit/"));
  const hasFit = Object.keys(zip.files).some((p) => p.includes("Fit/Daily"));

  if (!hasFitbit && !hasFit) {
    return NextResponse.json(
      { error: "Zip does not contain a Fitbit or Google Fit Takeout export." },
      { status: 400 },
    );
  }

  const results = [];
  if (hasFitbit) results.push(await importFitbitTakeout(zip, user.id));
  if (hasFit) results.push(await importGoogleFitTakeout(zip, user.id));

  return NextResponse.json({ ok: true, results });
}
