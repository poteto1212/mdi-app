import { NextResponse } from "next/server";
import { getMedications } from "@/lib/repositories/medicationRepository";

export async function GET() {
  try {
    const medications = await getMedications();

    return NextResponse.json({
      success: true,
      medications,
    });
  } catch (error) {
    console.error("Medication API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch medication data",
      },
      { status: 500 },
    );
  }
}
