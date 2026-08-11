import { google } from "googleapis";
import { rowsToObjects } from "@/lib/utils/sheet";

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

export async function getSheetValues(spreadsheetId: string, sheetName: string) {
  const auth = getGoogleAuth();

  const sheets = google.sheets({
    version: "v4",
    auth,
  });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });

  return response.data.values ?? [];
}

export async function getSheetObjects(
  spreadsheetId: string,
  sheetName: string,
) {
  const rows = await getSheetValues(spreadsheetId, sheetName);

  return rowsToObjects(rows);
}
