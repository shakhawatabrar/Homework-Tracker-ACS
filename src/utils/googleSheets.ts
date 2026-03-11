export const createOrUpdateSpreadsheet = async (
  token: string,
  title: string,
  sheets: { title: string; data: any[][] }[],
  existingSpreadsheetId?: string
) => {
  const baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  let spreadsheetId = existingSpreadsheetId;

  if (!spreadsheetId) {
    // Create new spreadsheet
    const createRes = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        properties: { title },
        sheets: sheets.map(s => ({ properties: { title: s.title } })),
      }),
    });

    if (!createRes.ok) {
      const errorData = await createRes.json();
      throw new Error(errorData.error?.message || 'Failed to create spreadsheet');
    }

    const createData = await createRes.json();
    spreadsheetId = createData.spreadsheetId;
  } else {
    // Clear existing data
    const ranges = sheets.map(s => `'${s.title}'!A:Z`);
    const clearRes = await fetch(`${baseUrl}/${spreadsheetId}/values:batchClear`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ranges }),
    });

    if (!clearRes.ok) {
      const errorData = await clearRes.json();
      throw new Error(errorData.error?.message || 'Failed to clear spreadsheet');
    }
  }

  // Update data
  const updateData = sheets.map(s => ({
    range: `'${s.title}'!A1`,
    values: s.data,
  }));

  const updateRes = await fetch(`${baseUrl}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: updateData,
    }),
  });

  if (!updateRes.ok) {
    const errorData = await updateRes.json();
    throw new Error(errorData.error?.message || 'Failed to update spreadsheet');
  }

  return {
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
};
