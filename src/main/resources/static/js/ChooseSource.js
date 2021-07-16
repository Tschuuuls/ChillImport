/*global addToLog*/
var isExcel = false;
var isCsv = false;
var currentFileName = "";
var currentDelimiter = ";";
var currentHeaderLines = 0;

function getCurrentFileName() {
  return currentFileName;
}

/**
 * checks the input file (must be .csv or .xlsx)
 */
function checkinputfile() {
  var name = $("#file")
    .val()
    .split(/(\\|\/)/g)
    .pop();
  if (name.match(".*.csv$")) {
    $("#oksource").attr("disabled", false);
    isCsv = true;
    isExcel = false;
  } else if (name.match(".*.xlsx?$")) {
    $("#oksource").attr("disabled", false);
    isCsv = false;
    isExcel = true;
  } else {
    isExcel = false;
    isCsv = false;
    $("#oksource").attr("disabled", true);
  }
}

/**
 * checks the url of the source
 */
function checkinputurl() {
  var url = $("#sourceinput").val().toString();
  var pattern =
    /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;

  if (pattern.test(url)) {
    isExcel = false;
    isCsv = false;
    $("#oksource").attr("disabled", false);
  } else {
    isExcel = false;
    isCsv = false;
    $("#oksource").attr("disabled", true);
  }
}

function sourcefile() {
  document.getElementById("sourcetext").innerText = "Choose Source File:";
  $("#sourceinput").hide();
  $("#file").show();
  checkinputfile();
}

function sourcesite() {
  document.getElementById("sourcetext").innerText = "Choose Website:";
  $("#sourceinput").show();
  $("#file").hide();
  checkinputurl();
}

function sourceserver() {
  document.getElementById("sourcetext").innerText = "Choose Server:";
  $("#sourceinput").show();
  $("#file").hide();
}

function uploadFile() {
  var form = $("#uploader")[0];

  var data = new FormData(form);

  $.ajax({
    type: "POST",
    enctype: "multipart/form-data",
    url: "upload",
    data: data,
    processData: false,
    contentType: false,
    cache: false,
    success: function (e) {
      notifier.success('File has been uploaded');
      currentFileName = e;
      $("#importbutton").prop("disabled", false);
      addToLog("Finished processing file. Ready for import.");
      preview();
    },
    error: function (e) {
      notifier.alert('File could not be uploaded. Check Log for errors');
      addToLog(e.responseText);
    },
  });

  return false;
}

function loadPreview(values) {
  var tablebody = $("#previewTable").find("tbody:eq(0)");
  var tablehead = $("#previewTable").find("thead:eq(0)");
  tablehead.empty().append($("<tr>"));
  tablebody.empty();

  var rows = values.length;
  var columns;

  if (rows > 0) {
    columns = values[0].length;
  }

  var current;

  values.forEach(function (entry) {
    tablebody.append($("<tr>"));
    current = tablebody.find("tr").last();
    entry.forEach(function (val) {
      current.append($("<td>").text(val));
    });
  });

  current = tablehead.find("tr").last();
  for (var k = 0; k < columns; k++) {
    current.append($("<th>").text("Column " + k));
  }
}

function preview() {
  $("#previewbutton").prop("disabled", true);

  $.ajax({
    type: "GET",
    url: "preview",
    data: {
      filename: currentFileName,
      headerLines: currentHeaderLines,
      delimiter: currentDelimiter,
    },
    success: function (result) {
      loadPreview(result);
      $("#previewbutton").prop("disabled", false);
    },
    error: function (e) {
      addToLog(e.responseText);
      $("#previewbutton").prop("disabled", false);
    },
  });
}

function uploadUrl() {
  $.ajax({
    type: "POST",
    url: "uploadFromUrl",
    data: { url: $("#sourceinput").val() },
    success: function (e) {
      notifier.success('File has been uploaded');
      currentFileName = e;
      $("#importbutton").prop("disabled", false);
      addToLog("Finished processing file. Ready for import.");
      preview();
    },
    error: function (e) {
      notifier.alert('File could not be uploaded. Check Log for errors');
      addToLog(e.responseText);
    },
  });

  return false;
}

function upload() {
  $("#previewbutton").prop("disabled", true);
  $("#importbutton").prop("disabled", true);
  if ($("input[name=source]:eq(0)").is(":checked")) {
    uploadFile();
  } else if ($("input[name=source]:eq(1)").is(":checked")) {
    uploadUrl();
  }
}

/**
 * disables inputs which are not needed for excel
 */
function excelconfig() {
  $("#delimiter").attr("disabled", true);

  $("#timeTable")
    .find("tbody tr")
    .each(function () {
      var obj = {},
        $td = $(this).find("td");
      obj["string"] = $td.eq(1).find("input").attr("disabled", true);
    });
}

/**
 * enables all inputs
 */
function csvconfig() {
  $("#delimiter").attr("disabled", false);

  $("#timeTable")
    .find("tbody tr")
    .each(function () {
      var obj = {},
        $td = $(this).find("td");
      obj["string"] = $td.eq(1).find("input").attr("disabled", false);
    });
}

/**
 * adds "disabled" attribute to inputs (which are not needed for excel) if
 * source is a excel file removes "disabled" if source is a csv
 */
function optimizeforsource() {
  if (isCsv && isExcel) {
    addToLog("Unexpected source");
  } else if (isExcel && !isCsv) {
    excelconfig();
  } else if (isCsv && !isExcel) {
    csvconfig();
  } else {
    csvconfig();
  }
}
