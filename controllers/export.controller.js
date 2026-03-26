const { Readable } = require("stream");
const excel = require("exceljs");

function createExcelWorkbook() {
  return new excel.Workbook();
}

function addExcelWorksheet(workbook, sheetName, data) {
  try {
    const worksheet = workbook.addWorksheet(sheetName);

    if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      data.forEach((item) => {
        const rowData = headers.map((header) => item[header]);
        worksheet.addRow(rowData);
      });
    }

    return workbook;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

function setExcelResponseHeaders(res, filename) {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}.xlsx"`
  );
}

async function sendExcelWorkbookAsDownload(res, workbook) {
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(res);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

module.exports = {
  createExcelWorkbook,
  addExcelWorksheet,
  setExcelResponseHeaders,
  sendExcelWorkbookAsDownload,
};
