package com.chillimport.server.converter;

import com.chillimport.server.Table;
import com.chillimport.server.TableDataTypes;
import com.chillimport.server.config.Configuration;
import com.chillimport.server.errors.LogManager;
import java.io.*;
import java.util.*;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/**
 * Reads an excel (XLS/XLSX) file and converts it into a Table instance
 */
public class ExcelConverter implements Converter {

  /**
   * Converts a File representing a 2-dimensional table to an instance of the
   * class Table representing the same table. <p> The converter uses a
   * configuration which tells the method how to precess certain elements of the
   * table, for example how to choose a delimiter on CSV-style tables.
   *
   * @param file the File containing the table
   * @param cfg  The configuration to use while processing the File
   *
   * @return the Table representing the File
   *
   * @throws IOException when the File has not been found or is corrupt
   */
  public static Table convert(File file, Configuration cfg)
      throws IOException, InvalidFormatException {

    Sheet sheet = null;
    sheet = WorkbookFactory.create(file)
                .sheetIterator()
                .next(); // get only the first sheet of every excel file

    Iterator<Row> rowIterator = sheet.iterator();
    Table table = new Table();
    boolean firstRow = true;

    for (int i = 0; i < cfg.getNumberOfHeaderlines(); i++) {
      rowIterator.next(); // skip headerlines
    }

    while (rowIterator.hasNext()) { // iterate over each row of a sheet
      Row row = rowIterator.next();

      ArrayList<com.chillimport.server.Cell> rowList = new ArrayList<>();

      int lastColumn = row.getLastCellNum();
      if (firstRow) {

        firstRow = false;

        parseRow(row, rowList, lastColumn);
        table.appendRow(rowList);

      } else {
        firstRow = false;
        parseRow(row, rowList, lastColumn);
        table.appendRow(rowList);
      }
    }
    return table;
  }

  private static void parseRow(Row row,
                               ArrayList<com.chillimport.server.Cell> rowList,
                               int lastColumn) {
    for (int cn = 0; cn <= lastColumn; cn++) {
      Cell cell = row.getCell(cn, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
      if (cell == null) {
        rowList.add(new com.chillimport.server.Cell());
      } else {
        CellType cellType = cell.getCellType();
        switch (cellType) {
        case _NONE:
          rowList.add(new com.chillimport.server.Cell());
          break;
        case BLANK:
          rowList.add(new com.chillimport.server.Cell());
          break;
        case BOOLEAN:
          rowList.add(
              new com.chillimport.server.Cell(cell.getBooleanCellValue()));
          break;
        case ERROR:
          LogManager.getInstance().writeToLog(
              "Encountered an error cell, this should not happen. will try upload anyways",
              false);
          rowList.add(new com.chillimport.server.Cell());
          break;
        case FORMULA:
          rowList.add(new com.chillimport.server.Cell(cell.getCellFormula()));
          break;
        case NUMERIC:
          if (DateUtil.isCellDateFormatted(cell)) {
            rowList.add(
                new com.chillimport.server.Cell((Date)cell.getDateCellValue()));
          } else {
            rowList.add(
                new com.chillimport.server.Cell(cell.getNumericCellValue()));
          }
          break;
        case STRING:
          rowList.add(
              new com.chillimport.server.Cell(cell.getStringCellValue()));
          break;
        default:
          // Dieser Case DARF nicht eintreten
          LogManager.getInstance().writeToLog(
              "The file conversion probably failed, but we will try to upload the Observations "
                  + "anyways",
              false);
          rowList.add(new com.chillimport.server.Cell());
          break;
        }
      }
    }
  }

  /**
   * This method converts a Table back to a File.
   * <p>
   * The File should after completion represent a 2-dim. table so that a call to
   * convert() with the same configuration yields an identical instance of Table
   * (i.e. compare(...) == true). The Configuration used is necessary to get an
   * exact output that could have matched an input File from before convert(...)
   * was called on this File.
   *
   * @param table the Table to convert
   * @param cfg   the Configuration to use
   *
   * @return the File representing the table with it's form given by the
   *     Configuration
   */
  public static void convertBack(Table table, Configuration cfg, String path)
      throws IOException {
    File file = new File(path);
    file.getParentFile().mkdirs();
    if (!file.exists()) {
      file.createNewFile();
    }

    Workbook wb = new XSSFWorkbook();
    Sheet sheet1 = wb.createSheet("Upload Errors");

    for (int i = 0; i < cfg.getNumberOfHeaderlines(); i++) {
      Row row = sheet1.createRow(i);
    }

    for (int i = 0; i < table.getRowCount(); i++) {
      int j = i + cfg.getNumberOfHeaderlines(); // Offset von Position damit die
                                                // ersten Zeilen nicht wieder
                                                // überschrieben werden
      Row row = sheet1.createRow(j);
      ArrayList<com.chillimport.server.Cell> tableRowList = table.getRow(i);
      for (int k = 0; k < tableRowList.size(); k++) {

        Cell cell = row.createCell(k);
        com.chillimport.server.Cell c = tableRowList.get(k);
        TableDataTypes type = c.getCellType();

        switch (type) {
        case INT:
          cell.setCellType(CellType.NUMERIC);
          cell.setCellValue(c.toDouble());
          break;
        case BOOL:
          cell.setCellType(CellType.BOOLEAN);
          cell.setCellValue(c.toBoolean());
          break;
        case DOUBLE:
          cell.setCellType(CellType.NUMERIC);
          cell.setCellValue(c.toDouble());
          break;
        case STRING:
          cell.setCellType(CellType.STRING);
          cell.setCellValue(c.toString());
          break;
        case URI:
          cell.setCellType(CellType.STRING);
          cell.setCellValue(c.toString());
          break;
        case URL:
          cell.setCellType(CellType.STRING);
          cell.setCellValue(c.toString());
          break;
        case DATE:
          CellStyle cellStyle = wb.createCellStyle();
          cellStyle.setDataFormat(
              wb.getCreationHelper().createDataFormat().getFormat(
                  ("dd.MM.yyyy HH:mm:ss.SSS")));
          cell.setCellValue(c.toDate());
          cell.setCellStyle(cellStyle);
          break;
        case FLOAT:
          cell.setCellType(CellType.NUMERIC);
          cell.setCellValue(c.toDouble());
          break;
        case NULL:
          cell.setCellType(CellType.BLANK);
          break;
        }
      }
    }

    OutputStream fileOut = new FileOutputStream(path);
    wb.write(fileOut);
    fileOut.flush();
    fileOut.close();
    wb.close();
  }

  /**
   * Returns the first three rows of an Excel XLS/XLSX file (or less if it is
   * shorter) for a file preview as a 2-dimensional List of Strings
   *
   * @param file   The file to convert, must be a Table of some sort
   * @param cfg    the configuration after which to Convert the file
   * @param rownum the number of rows to convert
   *
   * @return the first x rows as a ArrayList of ArrayLists
   *
   * @throws IOException when the file is not found
   * @throws InvalidFormatException
   */
  public static ArrayList<ArrayList<String>>
  filePreview(File file, Configuration cfg, int rownum)
      throws IOException, InvalidFormatException {
    Table table = convert(file, cfg);
    ArrayList<ArrayList<String>> firstThreeRowsOfTable = new ArrayList<>();
    Iterator<ArrayList<com.chillimport.server.Cell>> rowIterator =
        table.rowIterator();
    int maxsize = rownum;

    if (table.getRowCount() < maxsize || maxsize <= 0) {
      maxsize = 3;
    }

    for (int i = 0; i < 3; i++) {
      if (rowIterator.hasNext()) {
        ArrayList<com.chillimport.server.Cell> row = rowIterator.next();
        Iterator<com.chillimport.server.Cell> iterator = row.iterator();
        ArrayList<String> stringRow = new ArrayList<>();

        while (iterator.hasNext()) {
          stringRow.add(iterator.next().toString());
        }

        firstThreeRowsOfTable.add(stringRow);
      }
    }

    return firstThreeRowsOfTable;
  }
}
