import { getSheetObjects } from "@/lib/google/sheets";

const SPREADSHEET_ID_ENV = "GOOGLE_SPREADSHEET_MEDICATION_ID";

const SHEET_NAME = "薬品マスタ";

export async function getMedications() {
  const spreadsheetId = process.env[SPREADSHEET_ID_ENV];

  if (!spreadsheetId) {
    throw new Error(`${SPREADSHEET_ID_ENV} is not set`);
  }

  return getSheetObjects(spreadsheetId, SHEET_NAME);
}
