function addRow(tableId, size1, size2) {
  tableId.find("tbody").append(
    $("<tr>")
      .append(
        $("<td>").append($("<input>").attr("size", size1).attr("type", "text"))
      )
      .append(
        $("<td>").append($("<input>").attr("size", size2).attr("type", "text"))
      )
      .append(
        $("<td>").append(
          $("<button>")
            .attr("class", "btn btn-secondary")
            .attr("onclick", "delRow($(this))")
            .attr("style", "width:auto")
            .html("<span class='fas fa-minus'></span>")
        )
      )
  );
}

function delRow($element) {
  if ($element.closest("tbody").find("tr").length > 1) {
    $element.closest("tr").remove();
  }
}

function delLastRow(tableId) {
  var table = document.getElementById(tableId);
  var length = table.rows.length;
  if (length > 2) table.deleteRow(length - 1);
}

function modal(id, url, fnc, text) {
  if (fnc) {
    $("#" + id)
      .find(".modal-body")
      .load(url, function () {
        $("#" + id).modal({ keyboard: false });
        $("#" + id).modal("show");
        fnc();
      });
  } else {
    $("#" + id)
      .find(".modal-body")
      .load(url, function () {
        $("#" + id).modal({ keyboard: false });
        $("#" + id).modal("show");
      });
  }
  $("#" + id)
    .find(".headertext")
    .text(text);
}

function closeModal(id) {
  $("#" + id).modal("toggle");
}

$(document).ready(function () {
  $("#selecttime").select2({
    placeholder: "Select a timezone",
    width: "style",
    dropdownAutoWidth: true,
  });

  $("#things").select2({
    placeholder: "Select a thing",
    width: "style",
    dropdownAutoWidth: true,
  });

  $("#configs").select2({
    placeholder: "Select a configuration",
    width: "style",
    dropdownAutoWidth: true,
  });
});
// Notifications/Toasts
var polipop = new Polipop("notifications", {
  layout: "popups",
  insert: "before",
  pool: 5,
  sticky: false,
});
