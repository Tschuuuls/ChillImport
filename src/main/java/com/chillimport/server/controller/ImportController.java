package com.chillimport.server.controller;

import com.chillimport.server.FileManager;
import com.chillimport.server.UploadHandler;
import com.chillimport.server.config.Configuration;
import com.chillimport.server.config.DataType;
import com.chillimport.server.converter.ConverterException;
import com.chillimport.server.errors.ErrorHandler;
import com.chillimport.server.errors.LogManager;
import com.chillimport.server.utility.FileStorageException;
import com.chillimport.server.utility.UnsupportedDataTypeException;
import com.chillimport.server.utility.Upload;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URISyntaxException;
import java.rmi.server.ServerNotActiveException;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Controller class receiving requests for starting an Import
 */
@RestController
public class ImportController {

  private Queue<Upload> uploadQueue;
  private UploadHandler currentUploadHandler;
  private FileManager fileManager;

  @Autowired
  private ImportController(FileManager manager) {

    uploadQueue = new ArrayDeque<>();
    fileManager = manager;
  }

  /**
   * Uploads a file to the server from the front end
   *
   * @param file the file to upload
   *
   * @return the server status
   */
  @RequestMapping(value = "/upload", method = RequestMethod.POST)
  public ResponseEntity<?> uploadFile(@RequestParam MultipartFile file) {
    try {
      return new ResponseEntity<>(fileManager.store(file), HttpStatus.OK);
    } catch (FileStorageException e) {
      LogManager.getInstance().writeToLog(e.getMessage(), true);
      ErrorHandler.getInstance().addRows(-1, e);
      return new ResponseEntity<>("!" + e.getMessage(),
                                  HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Uploads a file from a website
   *
   * @param url the URL of the website
   *
   * @return the server status
   */
  @RequestMapping(value = "/uploadFromUrl", method = RequestMethod.POST)
  public ResponseEntity<?> uploadFile(@RequestParam String url) {
    String response;

    try {
      response = fileManager.storeFromURL(url).getName();
    } catch (FileStorageException e) {
      LogManager.getInstance().writeToLog(e.getMessage(), true);
      ErrorHandler.getInstance().addRows(-1, e);
      return new ResponseEntity<>("!" + e.getMessage(),
                                  HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return new ResponseEntity<>(response, HttpStatus.OK);
  }

  /**
   * gets the preview of a file
   *
   * @param filename the file to preview
   *
   * @return the preview as a 2d JSON array
   * @throws MalformedURLException
   */
  @RequestMapping(value = "/preview", method = RequestMethod.GET)
  public ResponseEntity<?> getPreview(@RequestParam String filename,
                                      @RequestParam int headerLines,
                                      @RequestParam String delimiter)
      throws MalformedURLException {
    Configuration sampleConfig;
    ArrayList<ArrayList<String>> firstThreeRowsOfTable;

    if (filename.endsWith(".xls") || filename.endsWith(".xlsx")) {
      sampleConfig = new Configuration(headerLines, delimiter, DataType.EXCEL);
    } else {
      if (filename.endsWith(".csv")) {
        sampleConfig = new Configuration(headerLines, delimiter, DataType.CSV);
      } else {
        return new ResponseEntity<>("File is not XSLX,XLS,CSV",
                                    HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    File file = fileManager.load(filename).toFile();
    try {
      firstThreeRowsOfTable = UploadHandler.preview(file, sampleConfig);
    } catch (IOException e) {
      ErrorHandler.getInstance().addRows(-1, e);
      return new ResponseEntity<>(e.getMessage(),
                                  HttpStatus.INTERNAL_SERVER_ERROR);
    } catch (NoSuchElementException e) {
      ErrorHandler.getInstance().addRows(-1, e);
      return new ResponseEntity<>(
          "Too many header lines. File is not that large.",
          HttpStatus.NOT_FOUND);
    } catch (InvalidFormatException e) {
      ErrorHandler.getInstance().addRows(-1, e);
      return new ResponseEntity<>(e.getMessage(),
                                  HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return new ResponseEntity<>(firstThreeRowsOfTable, HttpStatus.OK);
  }

  /**
   * Imports an Upload to the FROST server
   *
   * @param config   the configuration to use
   * @param filename the filename of the file to use
   * @param byNext   if the upload has been started automatically or not
   *
   * @return the status code
   */
  @RequestMapping(value = "/importQueue", method = RequestMethod.POST)
  @ResponseBody
  public ResponseEntity<?> importData(@RequestParam String config,
                                      @RequestParam String filename,
                                      boolean byNext) {
    ErrorHandler.getInstance().clear(); // errorHandler static Instanz -> NULL
    LogManager.getInstance()
        .clear(); // LogManager static Intanz -> NULL / File Lock releasen
    Configuration cfg;
    try {
      cfg = Configuration.convertToJava(config);
    } catch (ConverterException e) { // this should not happen with the website
      LogManager.getInstance().writeToLog(e.getMessage(), true);
      CompletableFuture.runAsync(() -> nextInQueue(filename));
      return new ResponseEntity<>(
          "Configuration could not be converted from JSON to Java.",
          HttpStatus.INTERNAL_SERVER_ERROR);
    }

    File file = fileManager.load(filename).toFile();

    if (file.getName().endsWith(".xls") || file.getName().endsWith(".xlsx")) {
      cfg.setDataType(DataType.EXCEL);
    } else {
      if (file.getName().endsWith(".csv")) {
        cfg.setDataType(DataType.CSV);
      } else {
        CompletableFuture.runAsync(() -> nextInQueue(filename));
        return new ResponseEntity<>("File is not XSLX,XLS,CSV.",
                                    HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    Upload current = new Upload(filename, cfg);

    if (!byNext) {
      uploadQueue.add(current);
      if (uploadQueue.size() > 1) {
        return new ResponseEntity<>("Upload Queued. There are currently " +
                                        (uploadQueue.size() - 1) +
                                        " Uploads  waiting",
                                    HttpStatus.ACCEPTED);
      }
    }

    currentUploadHandler = new UploadHandler(this);
    LogManager logManager = LogManager.getInstance();
    ErrorHandler errorHandler = ErrorHandler.getInstance();
    try {
      if (!new HTMLController().pingFROSTServer(cfg.getFrostURL())) {
        logManager.writeToLog("FROST-Server not reachable", true);
        errorHandler.addRows(-1, new ServerNotActiveException());
        return new ResponseEntity<>("FROST-Server not reachable",
                                    HttpStatus.SERVICE_UNAVAILABLE);
      }
      currentUploadHandler.upload(file, cfg);
      //"Was kann schon schiefgehen?" sagte er und catchte an einem Punkt 200
      //Exceptions
    } catch (URISyntaxException e) {
      String msg = "Server address malformed (URISyntaxException).";
      logManager.writeToLog(msg, true);
      e.printStackTrace();
      errorHandler.addRows(-1, e);
      return new ResponseEntity<>(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    } catch (MalformedURLException e) {
      String msg = "Server address malformed (MalformedURLException).";
      logManager.writeToLog(msg, true);
      e.printStackTrace();
      errorHandler.addRows(-1, e);
      return new ResponseEntity<>(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    } catch (ConverterException e) {
      String msg =
          "The file converter failed to convert the given file into internal table representation (usually due to wrong file format or empty file).";
      logManager.writeToLog(msg, true);
      e.printStackTrace();
      errorHandler.addRows(-1, e);
      return new ResponseEntity<>(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    } catch (IOException e) {
      String msg =
          "Could not write into ReturnFile (IOException in ErrorHandler.returnRows), windows-only.";
      logManager.writeToLog(msg, true);
      e.printStackTrace();
      errorHandler.addRows(-1, e);
      return new ResponseEntity<>(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    } catch (UnsupportedDataTypeException e) {
      logManager.writeToLog("Unknown File type", true);
      return new ResponseEntity<>("Unknown file type uploaded",
                                  HttpStatus.INTERNAL_SERVER_ERROR);
    } catch (IndexOutOfBoundsException e) {
      String msg =
          "Some Index is out of bounds (probably either wrong number of header lines or a column number in the configuration is too large).";
      logManager.writeToLog(msg, true);
      e.printStackTrace();
      errorHandler.addRows(-1, e);
      return new ResponseEntity<>(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    } catch (NullPointerException e) {
      String msg = "Null Pointer Exception";
      logManager.writeToLog(msg, true);
      e.printStackTrace();
      errorHandler.addRows(-1, e);
      return new ResponseEntity<>(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    } catch (Exception e) {
      String msg = "Unknown exception";
      logManager.writeToLog(msg, true);
      e.printStackTrace();
      errorHandler.addRows(-1, e);
      return new ResponseEntity<>(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      CompletableFuture.runAsync(() -> nextInQueue(filename));
    }
    return new ResponseEntity<>("Finished import of file " + filename + "." +
                                    ErrorHandler.getInstance().returnSize() +
                                    " Rows were skipped",
                                HttpStatus.OK);
  }

  /**
   * Letzte methode die im UploadHandler aufgerufen wird!!!
   */
  public void nextInQueue(String filename) {
    uploadQueue.remove();
    /*
    File file = fileManager.load(filename).toFile();
    try {
        FileUtils.forceDelete(file);
    } catch (IOException e) {
        LogManager.getInstance().writeToLog("File " + filename + " could not be
    deleted after Upload.", true);
    }*/
    if (!uploadQueue.isEmpty()) {
      Upload crt = uploadQueue.element();
      try {
        importData(Configuration.serialize(crt.getCfg()), crt.getFileName(),
                   true);
      } catch (JsonProcessingException e) {
        LogManager.getInstance().writeToLog("Import of " + crt.getFileName() +
                                                " failed: Configuration " +
                                                crt.getFileName() + " could "
                                                + "not be processed"
                                                + ".",
                                            true);
        ErrorHandler.getInstance().addRows(-1, e);
      } finally {
        CompletableFuture.runAsync(() -> nextInQueue(crt.getFileName()));
      }
    }
  }

  /**
   * Sends the progess of the Upload to the front end
   *
   * @return the upload progress as an integer
   */
  @RequestMapping(value = "/progress", method = RequestMethod.GET)
  @ResponseBody
  public ResponseEntity<?> getProgress() {
    if (currentUploadHandler == null) {
      return new ResponseEntity<>("Import has not started yet", HttpStatus.OK);
    }
    int row = currentUploadHandler.currentRow();
    int size = currentUploadHandler.getSize();
    if (size <= 0) {
      return new ResponseEntity<>("File has not been converted yet",
                                  HttpStatus.OK);
    }
    double progress = (double)row / size;

    int percentage = (int)(progress * 100);
    if (percentage >= 100) {
      return new ResponseEntity<>("Finished", HttpStatus.OK);
    }
    return new ResponseEntity<>(row + "/" + size + "  -- " + percentage + "%",
                                HttpStatus.OK);
  }

  @RequestMapping(value = "/queue", method = RequestMethod.GET)
  @ResponseBody
  private String queueSize() {
    String crtString = " No Row is being worked on at the moment";
    if (currentUploadHandler != null) {
      crtString = " current Row" + currentUploadHandler.currentRow();
    }
    return Integer.toString(uploadQueue.size()) + crtString;
  }
}
