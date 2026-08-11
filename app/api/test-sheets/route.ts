import { NextResponse } from "next/server";
import { getSheetObjects } from "@/lib/google/sheets";

export async function GET() {
  try {
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_MEDICATION_ID;

    if (!spreadsheetId) {
      throw new Error("GOOGLE_SPREADSHEET_MEDICATION_ID is not set");
    }

    const drugs = await getSheetObjects(spreadsheetId, "薬品マスタ");

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
