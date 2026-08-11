import { google } from "googleapis";
import type { Drug } from "@/lib/types/drug";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

function getGoogleAuth() {
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!projectId) {
    throw new Error("GOOGLE_PROJECT_ID is not set");
  }

  if (!clientEmail) {
    throw new Error("GOOGLE_CLIENT_EMAIL is not set");
  }

  if (!privateKey) {
    throw new Error("GOOGLE_PRIVATE_KEY is not set");
  }

  return new google.auth.GoogleAuth({
    credentials: {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
    scopes: SCOPES,
  });
}

export async function getSheetValues(spreadsheetId: string, shetName: string) {
  const auth = getGoogleAuth();

  const sheets = google.sheets({
    version: "v4",
    auth,
  });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: shetName,
  });

  return response.data.values ?? [];
}

export async function getAllDrugs(): Promise<Drug[]> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_MEDICATION_ID;

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SPREADSHEET_MEDICATION_ID is not set");
  }

  const values = await getSheetValues(spreadsheetId, "薬品マスタ");

  return values.slice(1).map((row, index) => ({
    rowIndex: index + 2,
    name: row[0] ?? "",
    ingredient: row[1] ?? "",
    category: row[2] ?? "",
    subcategory: row[3] ?? "",
    form: row[4] ?? "",
    dose: row[5] ?? "",
    position: row[6] ?? "",
    sameDrug: row[7] ?? "",
    crush: row[8] ?? "",
    suspension: row[9] ?? "",
    saline: row[10] ?? "",
    glucose: row[11] ?? "",
    caution: row[12] ?? "",
    note: row[13] ?? "",
  }));
}
