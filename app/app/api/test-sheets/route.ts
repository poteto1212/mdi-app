import { NextResponse } from "next/server";
import { getAllDrugs } from "@/lib/google/sheets";

export async function GET() {
  try {
    const drugs = await getAllDrugs();

    return NextResponse.json({
      success: true,
      drugs,
    });
  } catch (error) {
    console.error("Google Sheets API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch spreadsheet data",
      },
      { status: 500 },
    );
  }
}
