/*global optimizeforsource, mappingData, currentDelimiter, currentHeaderLines,
 * preview, addRow, delLastRow, resetMapping, showstep1, isExcel, getLocations,
 * initDatastream, loadMapping, returnRows, showmessagetag, getCurrentFileName,
 * openaccordion, upload*/

var scrollToBottom = false;

/**
 *
 * shows the popup to create a new Thing
 */
function showThingModal() {
  var $modal = $("#indexfooter").find("button:eq(0)");
  $modal.attr("onclick", "createThing()");
  $modal.html("Create Thing");
  $modal.show();
  modal("dialog", "thing.html", getLocations, "Create a Thing");
}

/**
 * opens the popup to create a new datastream
 */
function showStreamModal() {
  var $modal = $("#indexfooter").find("button:eq(0)");
  $modal.attr("onclick", "createDS()");
  $modal.html("Create Datastream");
  $modal.show();
  modal("dialog", "datastream.html", initDatastream, "Create a Datastream");
}

/**
 * opens the popup to edit the mapping
 */
function showMappingModal() {
  var $modal = $("#indexfooter").find("button:eq(0)");
  $modal.attr("onclick", "saveMapping()");
  $modal.html("Save Mapping");
  $modal.modal({show : true});
  modal("dialog", "mapping.html", loadMapping, "Current\xa0Mapping");
}
/**
 * opens the popup to show the failed rows
 */
function showReturnModal() {
  $("#indexfooter").find("button:eq(0)").hide();
  modal("dialog", "returnRows.html", returnRows, "Skipped Rows");
}

function pad2(number) { return (number < 10 ? "0" : "") + number; }

/**
 * adds a message to the log
 *
 * @param msg
 *            the message
 */
function addToLog(msg) {
  var date = new Date();
  var time;
  var hours = pad2(date.getHours());
  var minutes = pad2(date.getMinutes());
  var seconds = pad2(date.getSeconds());
  time = hours + ":" + minutes + ":" + seconds + "  ";
  document.getElementById("log").value += time + msg + "\n";

  showmessagetag();

  if (scrollToBottom) {
    document.getElementById("log").scrollTop =
        document.getElementById("log").scrollHeight;
  }
}

/**
 * gets all configs from the backend
 */
function loadConfigs() {
  $.ajax({
    type : "GET",
    url : "config/all",
    success : function(response) {
      var json = JSON.stringify(response, null, 4);
      var jsonparsed = JSON.parse(json);

      var list = $("#configs");
      list.empty().append(new Option("", "", null, null));

      jsonparsed.forEach(function(val) {
        var option = new Option(val.name, val.name, null, null);
        option.setAttribute("data-value", JSON.stringify(val, null, 4));
        list.append(option);
      });

      list.trigger("change");
      addToLog("Loaded configurations");
    },
    error : function(e) { addToLog(e.responseText); },
  });
}

/**
 * saves a config on the server
 */
function saveConfig() {
  var currentInput;
  var parsed;
  var stop = false;
  var url = document.querySelector("#frostserverurl").value;

  try {
    new RegExp(currentDelimiter);
    if (currentDelimiter == null || currentDelimiter == "") {
      currentDelimiter = "\n";
    }
  } catch (e) {
    currentDelimiter = "\n";
  }

  if (!/^0*[0-9]{1,4}$/.test(currentHeaderLines)) {
    currentHeaderLines = 0;
  }

  var date = [];
  $("#timeTable").find("tbody tr").each(function() {
    var obj = {}, $td = $(this).find("td");
    currentInput = $td.eq(1).find("input").val();
    if ((currentInput == null || currentInput == "") && isExcel == false) {
      polipop.add({
        type : 'error',
        content : 'Please specify the date format (no empty strings allowed)'
      });
      stop = true;
      return false;
    }
    obj["string"] = currentInput;
    currentInput = $td.eq(0).find("input").val();
    if (currentInput == null || currentInput == "") {
      polipop.add({
        type : 'error',
        content :
            'Please specify the column where the date can be found (no empty field allowed) before saving the configuration'
      });
      stop = true;
      return false;
    }
    parsed = parseInt(currentInput, 10);

    if (!(currentInput == parsed) || parsed < 0) {
      polipop.add({
        type : 'error',
        content :
            'Please specify the column where the date can be found (must be a non-negative number) before saving the configuration'
      });
      stop = true;
      return false;
    }
    obj["column"] = parsed;
    date.push(obj);
  });

  if (stop == true) {
    return false;
  }

  var streams = [];
  $("#datastreams").find(".datastream").each(function() {
    var obj = {}, obs = [];
    currentInput = $(this).find("select option:selected").val();
    if (currentInput == null || currentInput == "") {
      polipop.add(
          {type : 'error', content : 'Please leave no datastream empty'});
      stop = true;
      return false;
    }
    obj["dsID"] =
        JSON.parse($(this).find("select option:selected").attr("data-value"))
            .frostId;
    $(this).find("tbody tr").each(function() {
      currentInput = $(this).find("td:eq(1) input").val();
      if (currentInput == null || currentInput == "") {
        polipop.add({
          type : 'error',
          content :
              'Please specify the column where the observations of each datastream can be found (no empty field allowed) before saving the configuration'
        });
        stop = true;
        return false;
      }

      parsed = parseInt(currentInput, 10);

      if (!(currentInput == parsed) || parsed < 0) {
        polipop.add({
          type : 'error',
          content :
              'Please specify the column where the observations of each datastream can be found (must be a non-negative number) before saving the configuration'
        });
        stop = true;
        return false;
      }
      obs.push(parsed);
    });
    if (stop == true) {
      return false;
    }

    obj["observations"] = obs;
    obj["multiStream"] = obs.length > 1;
    streams.push(obj);
  });

  if (stop == true) {
    return false;
  }

  var filetype = null;
  if ($("input[name=source]:eq(0)").is(":checked")) {
    filetype = $("#file").val();
  } else if ($("input[name=source]:eq(1)").is(":checked")) {
    filetype = $("#sourceinput").val();
  }
  if (!filetype || filetype == "") {
    addToLog("No File specified.");
  } else {
    filetype = filetype.split(".").pop().toUpperCase();
    if (filetype == "XLSX" || filetype == "XLS") {
      filetype = "EXCEL";
    } else if (filetype !== "CSV") {
      addToLog("Unknown file type.");
      return;
    }
  }

  if ($("#selecttime option:selected").attr("data-value") == null) {
    polipop.add({
      type : 'error',
      content : 'Please choose a time zone before saving the configuration'
    });
    return false;
  } else if (date.length == 0) {
    polipop.add({
      type : 'error',
      content :
          'Please specify where to find the date in your file before saving the configuration'
    });
    return false;
  } else if (streams.length == 0) {
    polipop.add({
      type : 'error',
      content : 'Please add a datastream before saving the configuration'
    });
    return false;
  }

  var map = mappingData;

  var cfgName = prompt("Name of Configuration:");
  if (cfgName == null) {
    return false;
  }
  if (cfgName == "") {
    addToLog("A configuration needs a name");
    return false;
  }

  var formData = {
    name : cfgName,
    delimiter : currentDelimiter,
    numberOfHeaderlines : parseInt(currentHeaderLines, 10),
    timezone : $("#selecttime option:selected").attr("data-value"),
    dateTime : date,
    streamData : streams,
    mapOfMagicNumbers : map,
    dataType : filetype,
    frostURL : url,
  };

  var jsoncfg = JSON.stringify(formData, null, 4);

  $.ajax({
    type : "POST",
    url : "config/create",
    contentType : "application/json",
    data : jsoncfg,
    dataType : "json",
    error : function(e) { addToLog(e.responseText); },
    success : function(e) {
      var option = new Option(e.name, e.name, null, null);
      option.setAttribute("data-value", JSON.stringify(e, null, 4));
      $("#configs").append(option).val(e.name).trigger("change");
      polipop.add({type : 'success', content : 'Configuration saved'});
      addToLog("Configuration saved.");
    },
  });
}

/**
 * loads the config with the id id
 *
 * @param id
 */
function loadConfig(id) {
  $.ajax({
    type : "GET",
    url : "config/single",
    data : {configId : id},
    success : function(response) {
      mappingData = response.mapOfMagicNumbers;
      $("#frostserverurl").val(response.frostURL);

      urlconfirmed(function() {
        $("#delimiter").val(response.delimiter);
        $("#headerlines").val(response.numberOfHeaderlines);
        currentDelimiter = response.delimiter;
        currentHeaderLines = response.numberOfHeaderlines;
        preview();

        $("#selecttime").find("option").each(function() {
          if ($(this).attr("data-value") === response.timezone) {
            $("#selecttime").val($(this).val()).trigger("change");
          }
        });

        var table = $("#timeTable");
        var lines = response.dateTime.length;
        var rows = document.getElementById("timeTable").rows.length - 1;
        while (lines > rows) {
          addRow(table, "2", "20");
          rows++;
        }
        while (lines < rows) {
          delLastRow("timeTable");
          rows--;
        }

        var i = 0;
        table.find("tbody tr").each(function() {
          var $td = $(this).find("td");
          $td.eq(0).find("input").val(response.dateTime[i].column);
          $td.eq(1).find("input").val(response.dateTime[i++].string);
        });

        lines = response.streamData.length;
        if (lines > 0) {
          thingConfig(response.streamData, response.frostURL);
        }
      });
    },
    error : function(e) { addToLog(e.responseText); },
  });
}

function thingConfig(streams, url) {
  $.ajax({
    type : "GET",
    url : "datastream/single",
    data : {
      id : parseInt(streams[0].dsID, 10),
      isMulti : streams[0].multiStream,
      url : url,
    },
    success : function(
        result) { loadThing(result.thing.frostId, streams, url); },
    error : function(e) { addToLog(e.responseText); },
  });
}

function loadStreamConfig(stream, div) {
  var url = document.getElementById("serverurlbox").innerText;
  $.ajax({
    type : "GET",
    url : "datastream/single",
    data : {
      id : parseInt(stream.dsID, 10),
      isMulti : stream.multiStream,
      url : url,
    },
    success : function(result) {
      div.find("select")
          .val(result.name + " (" + result.frostId + ")")
          .trigger("change");
      div.find("select option:selected")
          .attr("data-value", JSON.stringify(result));
      loadStream(result, div);
      loadStreamCol(stream.observations, div);
    },
    error : function(e) { addToLog(e.responseText); },
  });
}

function fillStreams(streams) {
  var child;
  streams.forEach(function(val) {
    addDatastream();
    child = $("#datastreams > div").last();
    loadStreamConfig(val, child);
  });
}

/**
 * clears all inputs for the configuration
 */
function resetConfig() {
  document.getElementById("delimiter").value = ";";
  document.getElementById("headerlines").value = "0";
  $("#things").val(null).trigger("change");
  $("#selecttime").val(null).trigger("change");
  $("#timeTable").find("tbody").find("tr").each(function() { this.remove(); });
  addRow($("#timeTable"), "2", "20");
  document.getElementById("datastreams").innerHTML = "";
  $("#configs").val(null).trigger("change");
  resetMapping();

  optimizeforsource(); // disables the delimiter and time format if the
  // source
  // file is an excel file
  showstep1();
}

/**
 * gets all things from the frost-server
 */
function getThings(fnSuccess) {
  var listTh = $("#things");
  var list2 = $("#datastreams");

  listTh.empty().append(new Option("", "", null, null));
  list2.empty().append(new Option("", "", null, null));

  listTh.trigger("change");
  list2.trigger("change");

  var url = document.getElementById("serverurlbox").innerText;
  var mydata = {frostUrlString : url};
  $.ajax({
    type : "GET",
    url : "thing/all",
    data : mydata,
    success : function(response) {
      var json = JSON.stringify(response, null, 4);
      var jsonparsed = JSON.parse(json);

      var list = $("#things");
      list.empty().append(new Option("", "", null, null));
      jsonparsed.forEach(function(val) {
        var option =
            new Option(val.name + " (" + val.frostId + ")",
                       val.name + " (" + val.frostId + ")", null, null);
        option.setAttribute("data-value", JSON.stringify(val, null, 4));
        list.append(option);
      });

      list.trigger("change");
      addToLog("Things loaded.");

      if (!(fnSuccess == null)) {
        fnSuccess();
      }
    },
    error : function(e) { addToLog(e.responseText); },
  });
}

var streamData = [];

/**
 * gets all datastreams from the thing with id id
 *
 * @param id
 *            id of a thing
 */
function getThingStreams(id, cfg, streams) {
  var url = document.getElementById("serverurlbox").innerText;
  $.ajax({
    type : "GET",
    url : "datastream/all",
    data : {thingId : id, url : url},
    success : function(response) {
      var json = JSON.stringify(response, null, 4);
      var jsonparsed = JSON.parse(json);

      streamData = [];
      var stream = {};
      stream["id"] = "";
      stream["text"] = "";
      streamData.push(stream);

      jsonparsed.forEach(function(val) {
        stream = {};
        stream["id"] = val.name + " (" + val.frostId + ")";
        stream["text"] = val.name + " (" + val.frostId + ")";
        stream["data-value"] = JSON.stringify(val, null, 4);
        streamData.push(stream);
      });

      $("#datastreams").empty();
      if (cfg) {
        fillStreams(streams);
      } else {
        addDatastream();
      }
    },
    error : function(e) { addToLog(e.responseText); },
  });
}

/**
 * deletes the stream "stream" from the stream-list in the config gui
 *
 * @param stream
 */
function removeDatastream(stream) { stream.parentNode.removeChild(stream); }

/**
 * adds an empty stream to the list in the config gui
 */
function addDatastream() {
  var streams = $("#datastreams");
  streams.append(
      $("<div>")
          .attr("class", "datastream")
          .append(
              $("<div>")
                  .append($("<label>").text("Name:").attr("style",
                                                          "margin-right:10px"))
                  .append($("<select>")
                              .attr("style", "width: 200px")
                              .attr("name", "streams")
                              .attr("class", "selectStreams"))
                  .append(
                      $("<button>")
                          .attr("class", "btn btn-secondary")
                          .attr("onclick",
                                "removeDatastream(this.parentNode.parentNode)")
                          .attr("style", "width:auto; margin-left:10px")
                          .html('<span class="fas fa-minus" ></span>')))
          .append($("<div>")
                      .attr("class", "streamtable")
                      .append($("<table>")
                                  .attr("class", "table")
                                  .append($("<thead>").append(
                                      $("<tr>")
                                          .append($("<th>").text("Unit"))
                                          .append($("<th>").text("Column"))))
                                  .append($("<tbody>")))));

  $(".selectStreams")
      .last()
      .select2({
        data : streamData,
        placeholder : "Choose a Datastream",
        width : "style",
        dropdownAutoWidth : true,
      })
      .trigger("change")
      .on("select2:select", function(e) {
        var sel = $(this);
        var parent = sel.parent().parent();
        var json;
        if (e.params.data["data-value"]) {
          json = JSON.parse(e.params.data["data-value"]);
          sel.find("option:selected").attr("data-value", JSON.stringify(json));
        } else {
          json = JSON.parse(sel.find("option:selected").attr("data-value"));
        }
        if (json) {
          loadStream(json, parent.find(".streamtable"));
        }
      });
}

function showPreview() { alert("not implemented yet"); }

var id;
var retry = 0;
var initial = 1000;

/**
 * this function triggers the import
 */
function importData() {
  var name;
  if ($("input[name=source]:eq(0)").is(":checked")) {
    name = $("#file").val().split("\\").pop();
  } else if ($("input[name=source]:eq(1)").is(":checked")) {
    name = $("#sourceinput").val().split("/").pop();
  }

  try {
    new RegExp(currentDelimiter);
    if (currentDelimiter === null || currentDelimiter === "") {
      currentDelimiter = "\n";
    }
  } catch (e) {
    currentDelimiter = "\n";
  }

  if (!/^0*[0-9]{1,4}$/.test(currentHeaderLines)) {
    currentHeaderLines = 0;
  }

  var currentInput;
  var parsed;
  var stop = false;
  var cfgName = "temp";
  var url = document.querySelector("#frostserverurl").value;
  var date = [];
  $("#timeTable").find("tbody tr").each(function() {
    var obj = {}, $td = $(this).find("td");
    currentInput = $td.eq(1).find("input").val();
    if ((currentInput === null || currentInput === "") && isExcel === false) {
      polipop.add({
        type : 'error',
        content : 'Please specify the date format (no empty strings allowed)'
      });
      stop = true;
      return false;
    }
    obj["string"] = currentInput;
    currentInput = $td.eq(0).find("input").val();
    if (currentInput === null || currentInput === "") {
      polipop.add({
        type : 'error',
        content :
            'Please specify the column where the date can be found (no empty field allowed) before importing data'
      });
      stop = true;
      return false;
    }
    parsed = parseInt(currentInput, 10);
    if (!(currentInput == parsed) || parsed < 0) {
      polipop.add({
        type : 'error',
        content :
            'Please specify the column where the date can be found (must be a non-negative number) before importing data'
      });
      stop = true;
      return false;
    }
    obj["column"] = parsed;
    date.push(obj);
  });
  if (stop === true) {
    return false;
  }
  var streams = [];
  $("#datastreams").find(".datastream").each(function() {
    var obj = {}, obs = [];
    currentInput = $(this).find("select option:selected").val();
    if (currentInput == null || currentInput == "") {
      polipop.add(
          {type : 'error', content : 'Please leave no datastream empty'});
      stop = true;
      return false;
    }
    obj["dsID"] =
        JSON.parse($(this).find("select option:selected").attr("data-value"))
            .frostId;
    $(this).find("tbody tr").each(function() {
      currentInput = $(this).find("td:eq(1) input").val();
      if (currentInput == null || currentInput == "") {
        polipop.add({
          type : 'error',
          content :
              'Please specify the column where the observations of each datastream can be found (no empty field allowed) before importing data'
        });
        stop = true;
        return false;
      }

      parsed = parseInt(currentInput, 10);

      if (!(currentInput == parsed) || parsed < 0) {
        polipop.add({
          type : 'error',
          content :
              'Please specify the column where the observations of each datastream can be found (must be a non-negative number), before importing data'
        });
        stop = true;
        return false;
      }
      obs.push(parsed);
    });
    if (stop === true) {
      return false;
    }

    obj["observations"] = obs;
    obj["multiStream"] = obs.length > 1;
    streams.push(obj);
  });
  if (stop === true) {
    return false;
  }

  var filetype = null;
  if ($("input[name=source]:eq(0)").is(":checked")) {
    filetype = $("#file").val();
  } else if ($("input[name=source]:eq(1)").is(":checked")) {
    filetype = $("#sourceinput").val();
  }
  if (!filetype || filetype === "") {
    addToLog("No File specified.");
  } else {
    filetype = filetype.split(".").pop().toUpperCase();
    if (filetype === "XLSX" || filetype === "XLS") {
      filetype = "EXCEL";
    } else if (filetype !== "CSV") {
      addToLog("Unknown file type.");
      return false;
    }
  }

  var map = mappingData;

  var formData = {
    name : cfgName,
    delimiter : currentDelimiter,
    numberOfHeaderlines : parseInt(currentHeaderLines, 10),
    timezone : $("#selecttime option:selected").attr("data-value"),
    dateTime : date,
    streamData : streams,
    mapOfMagicNumbers : map,
    dataType : filetype,
    frostURL : url,
  };

  var jsoncfg = JSON.stringify(formData, null, 4);
  var mydata = {config : jsoncfg, filename : getCurrentFileName()};
  if ($("#selecttime option:selected").attr("data-value") === null) {
    polipop.add({
      type : 'error',
      content : 'Please choose a time zone before importing data'
    });
    return false;
  } else if (date.length === 0) {
    polipop.add({
      type : 'error',
      content :
          'Please specify where to find the date in your file before importing data'
    });
    return false;
  } else if (streams.length === 0) {
    polipop.add({
      type : 'error',
      content : 'Please add a datastream before importing data'
    });
    return false;
  } else {
    polipop.add({type : 'info', content : 'Import started'});
    addToLog("Import of File " + name + " started.");
    document.getElementById("progress").value = 0;
    id = setInterval(progress, initial);
    $.ajax({
      type : "POST",
      url : "importQueue",
      data : mydata,
      success : function(e) {
        addToLog(e);
        polipop.add({type : 'success', content : 'Import finished'});
      },
      error : function(e) {
        polipop.add(
            {type : 'error', content : 'Import failed. Check log for errors'});
        addToLog(e.responseText);
        clearInterval(id);
      },
    });
  }
}

function progress() {
  $.ajax({
    type : "GET",
    url : "progress",
    success : function(response) {
      var x = false;
      check(response, x);
      if (x) {
        return;
      }
      if (response === "Import has not started yet" ||
          response === "File has not been converted yet") {
        initial = 2 * initial;
        if (initial >= 16000) {
          addToLog(
              "It seems the Import will take quite a while. Stopping progress requests.");
          clearInterval(id);
          return;
        }
        var temp = id;
        id = setInterval(progress, initial);
        clearInterval(temp);
      } else {
        var isHtml = response.match(/(<html>)/);
        if (isHtml) {
          addToLog("ishtml");
          var statusArr = response.match(/(\d\d\d)/);
          if (statusArr) {
            var statusCode = statusArr[1];
            if (statusCode !== "200") {
              addToLog(
                  "Requesting the progress failed. This does not affect the import. \n Error is: \n" +
                  response);
            } else {
              addToLog(
                  "Unexpected response for progress request. This does not affect the import.\n Response is: \n" +
                  response);
            }
          } else {
            addToLog(
                "Unexpected response for progress request. This does not affect the import.\n Response is: \n" +
                response);
          }
        } else {
          if (response !== "Finished") {
            addToLog(response);
            var resp = response;
            resp = resp.slice(-3);
            resp = resp.substring(0, 2);
            document.getElementById("progress").value = resp;
          }
        }
      }
    },
    error : function(e) {
      if (retry === 5) {
        addToLog("Progress could not be queried, stopping.");
        retry = 0;
        clearInterval(id);
        return;
      }
      retry++;
      addToLog("Could not get progress. Retrying " + 5 - retry + " more times");
    },
  });
}

function check(string, done) {
  if (string === "Finished" || string.startsWith("Upload Queued")) {
    clearInterval(id);
    document.getElementById("progress").value = 100;
    done = true;
  }
}

/**
 * loads the data needed for the gui
 */
function main() {
  loadConfigs();
  document.getElementById("log").value = "";
}

/**
 * loads the data from the frost-server
 *
 * @param fnSucess
 *            Called after successfully confirmed URL
 * @returns
 */
function urlconfirmed(fnSuccess) {
  // show loader
  document.getElementById("loader").style.display = "block";

  var url = document.querySelector("#frostserverurl").value;
  var mydata = {frostUrl : url};

  var res;
  var message;

  $.ajax({
    type : "GET",
    url : "server-check",
    data : mydata,
    success : function(response) {
      message = response;
      if (response === "Server reachable") {
        document.getElementById("serverurlbox").innerText = url;
        document.getElementById("serverurlbox").href = url;

        addToLog("FROST-Server: " + url);

        addToLog("Try to load things ...");
        getThings(function() {
          // hide loader
          document.getElementById("loader").style.display = "none";
          if (!(fnSuccess == null)) {
            fnSuccess();
          }
        });
      } else {
        var r = confirm("Can't connect to: " + url + "\nDetails: " + message);
        document.querySelector("#frostserverurl").value = "";
        document.getElementById("serverurlbox").innerText = "";
        document.getElementById("serverurlbox").href = "";
        // hide loader
        document.getElementById("loader").style.display = "none";
      }
    },
    error : function(e) {
      addToLog(e.responseText);
      document.querySelector("#frostserverurl").value = "";
      document.getElementById("serverurlbox").innerText = "";
      document.getElementById("serverurlbox").href = "";
      // hide loader
      document.getElementById("loader").style.display = "none";
    },
  });
}

function toggleScroll() {
  if (scrollToBottom) {
    scrollToBottom = false;
    document.getElementById("scrollDown").innerText = "follow log";
  } else {
    scrollToBottom = true;
    document.getElementById("scrollDown").innerText = "stop";
    document.getElementById("log").scrollTop =
        document.getElementById("log").scrollHeight;
  }
}
var maximized = false;
function resizeLog() {
  var elem = document.querySelector("#logbox");
  if (!maximized) {
    elem.style.height = "80%";
    elem.style.width = "1100px";
    elem.style.marginLeft = "-550px";
    maximized = true;
    document.getElementById("maxSize").innerText = "shrink log";
  } else {
    elem.style.width = "900px";
    elem.style.marginLeft = "-450px";
    elem.style.height = "120px";
    maximized = false;
    document.getElementById("maxSize").innerText = "maximize log";
  }
}

/**
 * writes the observations in the gui
 *
 * @param observations
 * @param div
 */
function loadStreamCol(observations, div) {
  for (var i = 0; i < observations.length; i++) {
    div.find("tbody tr").eq(i).find("td input").val(observations[i]);
  }
}

function loadThing(id, streams, url) {
  $.ajax({
    type : "GET",
    url : "thing/single",
    data : {thingId : parseInt(id, 10), frostUrlString : url},
    success : function(result) {
      $("#things")
          .val(result.name + " (" + result.frostId + ")")
          .trigger("change");
      getThingStreams(result.frostId, true, streams);
    },
    error : function(e) { addToLog(e.responseText); },
  });
}

function loadStream(stream, div) {
  var rows = stream.units_of_measurement.length;
  $(div).find("tbody").empty();
  for (var i = 0; i < rows; i++) {
    $(div).find("tbody").append(
        $("<tr>")
            .append($("<td>").text(stream.units_of_measurement[i].symbol))
            .append($("<td>").append(
                $("<input>").attr("type", "text").attr("size", "5"))));
  }
}

function getThing() {
  return JSON.parse($("#things option:selected").attr("data-value"));
}

/**
 * This function is called if a configuration is selected
 *
 * @param e
 *            a config
 */
$("#configs").on("select2:select", function(e) {
  var json = JSON.parse($("#configs option:selected").attr("data-value"));
  if (json) {
    loadConfig(json.id);
  }
  openaccordion("currentConfigAcc");
});

$("#things").on("select2:select", function(e) {
  var json = getThing();
  if (json) {
    getThingStreams(json.frostId);
  }
});

/**
 * function performed after choosing a sourcefile. Uploads file (and triggers
 * preview afterwards), and opens next part of the accordion (choice of
 * configuration)
 */
function fileConfirmed() {
  upload();
  optimizeforsource();
  openaccordion("chooseConfigAcc");
}

$(document).ready(function() { $('[data-toggle="tooltip"]').tooltip(); });
