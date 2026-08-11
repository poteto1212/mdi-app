import { NextResponse } from "next/server";
import { getSheetObjects } from "@/lib/google/sheets";

export async function GET() {
  try {
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ABBREVIATION_ID;

    if (!spreadsheetId) {
      throw new Error("GOOGLE_SPREADSHEET_ABBREVIATION_ID is not set");
    }

    const abbreviations = await getSheetObjects(spreadsheetId, "用語マスタ");

    return NextResponse.json({
      success: true,
      abbreviations,
    });
  } catch (error) {
    console.error("Google Sheets API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch abbreviation data",
      },
      { status: 500 },
    );
  }
}
