/*global addToLog, closeModal*/
function initSensor() {
  var data = [
    { id: "", text: "" },
    { id: "application/pdf", text: "application/pdf" },
    { id: "application/json", text: "application/json" },
    { id: "text", text: "text" },
  ];

  $("#senEncTypes").select2({
    data: data,
    placeholder: "Choose an encoding type",
    width: "style",
    dropdownParent: $("#dsdialog"),
    dropdownAutoWidth: true,
  });
}

function createSensor() {
  var name = $("#senname").val();
  var desc = $("#sendescription").val();
  var encType = $("#senEncTypes").val();
  if (!encType || encType === "") {
    polipop.add({ type: "error", content: "Encoding Type is invalid" });
    return false;
  }
  var meta = $("#senmeta").val();

  var mySensor = {
    name: name,
    description: desc,
    encoding_TYPE: encType,
    metadata: meta,
  };
  var url = document.getElementById("serverurlbox").innerText;

  var mydata = { entity: mySensor, string: url };
  if (name == null || name == "") {
    polipop.add({
      type: "error",
      content: "Sensor could not be created, Name is invalid",
    });
    return false;
  }
  $.ajax({
    type: "POST",
    url: "sensor/create",
    datatype: "json",
    contentType: "application/json",
    data: JSON.stringify(mydata),
    error: function (e) {
      polipop.add({
        type: "error",
        content: "Sensor could not be created, check the Log for errors",
      });
      addToLog(e.responseText);
    },
    success: function (e) {
      polipop.add({ type: "success", content: "Sensor created." });
      addToLog("Sensor created.");
      closeModal("dsdialog");

      var text = e.name + " (" + e.frostId + ")";
      var option = new Option(text, text, null, null);
      option.setAttribute("data-value", JSON.stringify(e, null, 4));

      var sensors = $("#streamsensors");
      sensors.append(option).trigger("change");
      sensors.val(text);
    },
  });
}
