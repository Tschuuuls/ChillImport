package com.chillimport.server;

import com.chillimport.server.errors.LogManager;
import com.chillimport.server.utility.FileStorageException;
import java.io.*;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.file.*;
import java.time.ZonedDateTime;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
/**
 * This class manages all File interactions (saving, loading, deleting) and
 * provides Paths for all files. These include: Configurations, Logs and file
 * uploads
 *
 * It also holds the server URL and login credentials
 */
public class FileManager {

  private static Path CONFIG_PATH = null;
  private static Path BASE_PATH = null;
  private static Path LOG_PATH = null;
  private static Path FILES_PATH = null;
  private static String USER_NAME_PASSWORD = null;
  private static String sep = File.separator;

  public FileManager() {}

  /**
   * Stores a File to the temporary file directory
   *
   * @param file the File to store
   *
   * @throws FileStorageException when the file caanot be stored for any reason
   */
  public String store(MultipartFile file) throws FileStorageException {
    String origFilename = StringUtils.cleanPath(file.getOriginalFilename());
    String[] cut = origFilename.split("\\.");

    if (cut.length < 2) {
      throw new FileStorageException("Illegal file name");
    }

    String ending = cut[cut.length - 1];

    String randomFilename = ZonedDateTime.now()
                                .toString()
                                .substring(0, 23)
                                .replaceAll(":", "-")
                                .replaceAll("\\.", "_") +
                            '.' + ending;
    try {
      if (file.isEmpty()) {
        throw new FileStorageException("Failed to store, file " +
                                       randomFilename + " is empty.");
      }
      if (randomFilename.contains("..")) {
        // This is a security check
        throw new FileStorageException(
            "Cannot store file " + randomFilename +
            " with relative path outside current directory.");
      }

      String tempfilePath = getFilesPath().toString() + sep + randomFilename;

      InputStream inputStream = file.getInputStream();
      File tempFile = new File(tempfilePath);
      tempFile.deleteOnExit();
      Files.copy(inputStream, tempFile.toPath(),
                 StandardCopyOption.REPLACE_EXISTING);

      inputStream.close();

    } catch (IOException e) {
      throw new FileStorageException(
          "Failed to store file " + randomFilename + ".", e);
    }

    return randomFilename;
  }

  /**
   * Loads a File from the temporary file directory
   *
   * @param filename the file to load
   * @return the file
   */
  public Path load(String filename) { return getFilesPath().resolve(filename.replaceAll("/", "")); }

  /**
   * Downloads a file from an internet server, stores it in temporary files and
   * loads the path to that file so it can be processed by the UploadHandler
   *
   * @param url the URL from where to download
   *
   * @return the Path to the downloaded file
   */
  public File storeFromURL(String url) throws FileStorageException {
    String origFilename = url.substring(url.lastIndexOf("/"));
    String[] cutted = origFilename.split("\\.");

    if (cutted.length < 2) {
      throw new FileStorageException("Illegal file name");
    }

    String ending = cutted[cutted.length - 1];

    String randomFilename =
        LogManager.getInstance().getDate().replaceAll("\\.", "_") + '.' +
        ending;

    File file = new File(getFilesPath().toString() + sep + randomFilename.replaceAll("\\.", "").replaceAll("/", ""));

    try {
      Files.deleteIfExists(
          Paths.get(getFilesPath().toString() + sep + randomFilename.replaceAll("\\.", "").replaceAll("/", "")));
    } catch (IOException e) {
      // Der Fehler wird später noch eine Exception werfen also kan man hier
      // ignorieren
    }

    try {
      URL website = new URL(url);
      InputStream in = website.openStream();
      Files.copy(in, file.toPath(), StandardCopyOption.REPLACE_EXISTING);
      in.close();

    } catch (MalformedURLException e) {
      throw new FileStorageException(
          "Could not store file -- Website path is malformed.");
    } catch (FileNotFoundException e) {
      throw new FileStorageException("Could not store file -- File not found.");
    } catch (IOException e) {
      throw new FileStorageException("Could not store file -- IO Exception.");
    }

    return file;
  }

  /**
   * Loads a File as a resource
   *
   * @param filename the filename of the file to load
   * @return the file as a Resource
   * @throws FileStorageException when the file cannot be loaded
   */
  public Resource download(String filename) throws FileStorageException {

    File file = new File(FileManager.getLogPath().toString() + sep +
                         "returnRows" + sep + filename.replaceAll("\\.", "").replaceAll("/", ""));
    Resource resource = new FileSystemResource(file.getAbsoluteFile());

    if (resource.exists()) {
      if (resource.isReadable()) {
        return resource;
      } else {
        throw new FileStorageException("File not readable: " + filename);
      }
    } else {
      try {
        java.awt.Desktop.getDesktop().edit(file);
      } catch (IOException e) {
        System.out.println("trt");
      }
      throw new FileStorageException("File does not exist: " + filename);
    }
  }

  /**
   * Sets the Paths for the configuration, logging and file uploads on server
   * startup.
   *
   * @param path The path that will be used for file storage
   */
  public static void setPathsOnStartup(String path) {

    if (CONFIG_PATH == null) {

      BASE_PATH = Paths.get(path);

      CONFIG_PATH = Paths.get(BASE_PATH.toString() + sep + "configurations");
      LOG_PATH = Paths.get(BASE_PATH.toString() + sep + "Log-Error");
      if (!Files.exists(LOG_PATH)) {
        try {
          Files.createDirectories(LOG_PATH);
        } catch (IOException e) {
          System.out.println("Could not create Log Path Directories");
        }
      }
      if (!Files.exists(CONFIG_PATH)) {
        try {
          Files.createDirectories(CONFIG_PATH);
        } catch (IOException e) {
          System.out.println("Could not create Config Path Directories");
        }
      }
    }
    try {
      if (FILES_PATH == null) {
        FILES_PATH = Files.createTempDirectory("tempuploads_");
        // FILES_PATH.toFile().deleteOnExit(); //TODO: Delete directories on exit
      }
    } catch (IOException e) {
      LogManager.getInstance().writeToLog(
          "Could not create temporary directory", true);
    }
  }

  /**
   * Returns the Configuration path
   *
   * @return the path as a Path
   */
  public static Path getConfigPath() {
    /*
    if (CONFIG_PATH == null) {
        FileManager.setPathsOnStartup("src" + sep + "main" + sep + "resources" +
    sep +"static" + sep + "files"); //TODO /configurations
    }
     */
    return CONFIG_PATH;
  }

  /**
   * Returns the Log path
   *
   * @return the path as a Path
   */
  public static Path getLogPath() {
    /*
    if (LOG_PATH == null) {
        FileManager.setPathsOnStartup("src" + sep + "main" + sep + "resources" +
    sep +"static" + sep + "files"); //TODO /Error-Logs
    }
            */
    return LOG_PATH;
  }

  /**
   * Returns the path to the current temporary directory
   *
   * @return the path as a Path
   */
  public static Path getFilesPath() {
    if (FILES_PATH == null) {
      try {
        FileManager.FILES_PATH = Files.createTempDirectory("tempuploads_");

      } catch (IOException e) {
        LogManager.getInstance().writeToLog(
            "Could not create temporary directory", true);
      }
    }

    return FILES_PATH;
  }

  /**
   * Reads the first line from a file located in the base directory and parses
   * its content in a String
   *
   * @param filename the file name of the file to read from
   *
   * @return The first lien of the file as a String
   */
  public static String readFromFile(String filename) {
    File file = new File(BASE_PATH + sep + filename);
    String text = "";
    try {
      BufferedReader brText = new BufferedReader(new FileReader(file));
      text = brText.readLine();

      // only read line 1

      brText.close();
    } catch (FileNotFoundException e) {
      System.out.println("File not found");
    } catch (IOException e) {
      System.out.println("Could not read File due to an I/O Error");
    }

    return text;
  }

  /*
   * Sets the FROST server URl for later use
   *
   * @param url the URL string

  public static void setServerURLOnStartup(String url) {
      SERVER_URL = url;
  }
      */

  /**
   * Sets a username and password for authetication when uplaoding
   *
   * @param name
   */
  public static void setUsernameOnStartup(String name) {
    USER_NAME_PASSWORD = name;
  }

  /**
   * Gets and returns the value of SERVER_URL
   *
   * @return the value of SERVER_URL
   */
  /*
  public static URL getServerURL() throws MalformedURLException {
      return new URL(SERVER_URL);
  }
  */

  /**
   * Gets and returns the value of USER_NAME_PASSWORD
   *
   * @return the value of USER_NAME_PASSWORD
   */
  public static String getUsername() { return USER_NAME_PASSWORD; }
}
