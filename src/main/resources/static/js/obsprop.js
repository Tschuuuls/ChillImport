/*global addToLog, closeModal, getOprops*/
function createObsprop() {
  var name = $("#obsname").val();
  var desc = $("#obsdescription").val();
  var def = $("#obsdefinition").val();

  var myOP = { name: name, description: desc, definition: def };

  var url = document.getElementById("serverurlbox").innerText;

  if (myOP.name == null || myOP.name == "") {
    notifier.alert("Observed Property could not be created, name is invalid");
    return false;
  }
  var mydata = { entity: myOP, string: url };
  addToLog(JSON.stringify(mydata));

  $.ajax({
    type: "POST",
    url: "observedProperty/create",
    datatype: "json",
    contentType: "application/json",
    data: JSON.stringify(mydata),
    error: function (e) {
      notifier.alert(
        "Observed Property could not be created, check the Log for errors"
      );
      addToLog(e.responseText);
    },
    success: function (e) {
      notifier.success("Observed Property created");
      addToLog("Observed Property created.");
      closeModal("dsdialog");
      getOprops();
    },
  });
}
