/*global addToLog, closeModal*/
var mappingData = []; // the current mapping is stored here

/**
 * saves the current mapping from the gui
 */
function saveMapping() {
  var obj = [];
  valid = true;
  $("#mappingTable")
    .find("tbody tr")
    .each(function () {
      column = $(this).find("td:eq(0) input").val();
      if (isNaN(column) || column < 0 || column == "") {
        notifier.alert('At least one Column Number is invalid');
        valid = false;
        return false;
      }
      if (valid) {
        obj.push({
          column: $(this).find("td:eq(0) input").val(),
          first: $(this).find("td:eq(1) input").val(),
          second: $(this).find("td:eq(2) input").val(),
        });
      }
    });
  if (valid) {
    mappingData = Array.from(obj);
    notifier.success('Mapping saved.');
    addToLog("Mapping saved.");
    closeModal("dialog");
  }
}

/**
 * deletes the current mapping data
 */
function resetMapping() {
  mappingData = [];
}

/**
 * adds a row to the mapping table
 *
 * @param tableId
 *            id of the table, here it is always the same
 * @param size1
 *            size of the first column
 * @param size2
 *            size of the 2nd column
 * @param size3
 *            size of the 3rd column
 */
function mapAddRow(tableId, size1, size2, size3) {
  $(tableId)
    .find("tbody")
    .append(
      $("<tr>")
        .append(
          $("<td>").append(
            $("<input>")
              .attr("size", size1)
              .attr("type", "number")
              .attr("min", "0")
              .attr("oninput", 'validity.valid||(value="");')
          )
        )
        .append(
          $("<td>").append(
            $("<input>").attr("size", size2).attr("type", "text")
          )
        )
        .append(
          $("<td>").append(
            $("<input>").attr("size", size3).attr("type", "text")
          )
        )
        .append(
          $("<td>").append(
            $("<button>")
              .attr("class", "btn btn-secondary")
              .attr("onclick", "removeMapping(this)")
              .attr("style", "height: 100%; width:auto")
              .html(
                "<span class='fas fa-trash-alt' style='height: 100%; width:auto'></span>"
              )
          )
        )
    );
}

/**
 * loads the mapping from a config and shows it on the page
 */
function loadMapping() {
  var length = mappingData.length;
  var mapping = $("#mappingAddRow");
  var table = $("#mappingTable");
  mapping.hide();

  for (var i = 0; i < length; i++) {
    mapAddRow(table, "20", "20", "20");
  }
  var counter = 0;
  table.find("tbody tr").each(function () {
    var tr = $(this);
    tr.find("td:eq(0) input").val(mappingData[counter].column);
    tr.find("td:eq(1) input").val(mappingData[counter].first);
    tr.find("td:eq(2) input").val(mappingData[counter].second);
    counter = counter + 1;
  });

  mapping.show();
}

/**
 * removes a row from the mapping table
 *
 * @param mapping
 *            the row of the mapping
 */
function removeMapping(mapping) {
  $(mapping).parents("tr").remove();
}
