/*global addToLog, closeModal*/

function createLocation() {
  var name = $("#locname").val();
  var desc = $("#locdescription").val();
  var loc = "[" + $("#loclocation").val() + "]";
  var url = document.getElementById("serverurlbox").innerText;

  if (url === "") {
    addToLog("FROST-URL can't be empty");
    polipop.add({ type: "error", content: "FROST-URL can't be empty" });
  } else {
    var myloc = {
      name: name,
      description: desc,
      encoding_TYPE: "application/vnd.geo+json",
      location: '{"type": "Point", "coordinates": ' + loc + "}",
    };

    var mydata = { entity: myloc, string: url };

    if (myloc.name == null || myloc.name == "") {
      polipop.add({
        type: "error",
        content: "Location could not be created, Name is invalid",
      });
      return false;
    }
    if (myloc.location == null || myloc.location == "") {
      polipop.add({
        type: "error",
        content: "Location could not be created, Coordinates are invalid",
      });
      return false;
    }
    $.ajax({
      type: "POST",
      url: "location/create",
      datatype: "json",
      contentType: "application/json",
      data: JSON.stringify(mydata),
      error: function (e) {
        polipop.add({
          type: "error",
          content: "Location could not be created, check the Log for errors",
        });
        addToLog(e.responseText);
      },
      success: function (e) {
        polipop.add({ type: "success", content: "Location created." });
        addToLog("Location created.");
        closeModal("thingdialog");

        var text = e.name + " (" + e.frostId + ")";
        var option = new Option(text, text, null, null);
        option.setAttribute("data-value", JSON.stringify(e, null, 4));

        $("#locations").append(option).trigger("change");
        $("#locations").val(text);
      },
    });
  }
}
