export function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0];

  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};

    headers.forEach((header, index) => {
      if (header) {
        obj[header] = row[index] ?? "";
      }
    });

    return obj;
  });
}
