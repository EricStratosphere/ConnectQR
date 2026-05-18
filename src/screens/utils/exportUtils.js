import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

// Helper to share the generated file
const shareFile = async (uri, mimeType) => {
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, { UTI: mimeType, mimeType });
  }
};

export const exportToCSV = async (data, filename = 'attendance_report.csv') => {
  if (!data || data.length === 0) return;

  // Extract headers
  const headers = Object.keys(data[0]).join(',');
  // Map rows
  const rows = data.map(row => 
    Object.values(row).map(val => `"${val}"`).join(',')
  ).join('\n');
  
  const csvString = `${headers}\n${rows}`;
  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(fileUri, 'text/csv');
};

export const exportToPDF = async (data, filename = 'AttendanceReport') => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);

  // Generate simple HTML table
  const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica'; padding: 20px; }
          h1 { color: #1c625c; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
          th { background-color: #f1f5f9; color: #1e293b; }
        </style>
      </head>
      <body>
        <h1>Attendance Report</h1>
        <table>
          <tr>${headers.map(h => `<th>${h.toUpperCase()}</th>`).join('')}</tr>
          ${data.map(row => `
            <tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>
          `).join('')}
        </table>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html: htmlContent });
  await shareFile(uri, 'application/pdf');
};