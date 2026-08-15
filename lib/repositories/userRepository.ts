import { getSheetObjects } from "@/lib/google/sheets";

const SPREADSHEET_ID_ENV = "GOOGLE_SPREADSHEET_ACCOUNT_ID";

const SHEET_NAME = "ユーザー情報";

export async function getUsers() {
  const spreadsheetId = process.env[SPREADSHEET_ID_ENV];

  if (!spreadsheetId) {
    throw new Error(`${SPREADSHEET_ID_ENV} is not set`);
  }

  return getSheetObjects(spreadsheetId, SHEET_NAME);
}
