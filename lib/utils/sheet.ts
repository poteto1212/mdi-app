export function rowsToObjects(
  rows: string[][],
): Record<string, string | number>[] {
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0];

  return rows.slice(1).map((row, index) => {
    const obj: Record<string, string | number> = {};

    headers.forEach((header, columnIndex) => {
      if (header) {
        obj[header] = row[columnIndex] ?? "";
      }
    });

    // スプレッドシート上の実際の行番号
    obj.rowNumber = index + 2;

    return obj;
  });
}
