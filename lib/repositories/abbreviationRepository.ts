import { getSheetObjects } from "@/lib/google/sheets";

const SPREADSHEET_ID_ENV = "GOOGLE_SPREADSHEET_ABBREVIATION_ID";

const SHEET_NAME = "用語マスタ";

export async function getAbbreviations() {
  const spreadsheetId = process.env[SPREADSHEET_ID_ENV];

  if (!spreadsheetId) {
    throw new Error(`${SPREADSHEET_ID_ENV} is not set`);
  }

  return getSheetObjects(spreadsheetId, SHEET_NAME);
}
