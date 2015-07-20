/*
PROPERTIES FORMAT-----------------------------:
{"user":{"password":"f", "name":"", "(optional)token":"", "currentTimeoutId":"(may be filled)", "currentTimeoutTime":"mscsSinceEpoch" or ""} ...
"potentialUsers": {will be filled later}
bookingId: {all the stuff about this reservation} ... 

Things to do:
make a checkToken function, use across code

{adminEmail:{"password":hashedPasswordInt, "name":"Millan Philipose", "currentTimeoutId":"", "currentTimeoutTime":""}

THINGS TO DO
*CHECK!* Whenever I make a token, I must make sure that the token is not already being used.
*CHECK!* Check whether email addresses are taken (in account creation)
*CHECK!* Delete password change token on use (and have a nice message to the user if the token is invalid)
*CHECK!* drop down meny for calendar
*CHECK!* make sure you handle hitting "confirm" button on confirmation email twice or more
*CHECK!* enlarge font size of error, sucess messages larger on login screen
*CHECK!* convert from onclick to links on login screen
*CHECK!* move logout to top right hand corner
*CHECK!* notify user when rejects booking
format emails to users better
what if two people request at once
convert the badly styled h3s to plain h1s
add myRequests page
*/
var adminEmail = "millan.philipose@gmail.com";
function roomsList_() {
  return ["Room 1", "Room 2", "Room 3", "Room 4"];
}
function doGet(e) {
//  Logger.log(JSON.stringify(e))
//  if (e["parameter"]["creation"] === "c") {
//    Logger.log("FEFF")
//    return HtmlService.createHtmlOutputFromFile('teset').setSandboxMode(HtmlService.SandboxMode.IFRAME);
//  }
//  -----
  if (typeof(e["parameter"]["admin"]) !== "undefined") {
    return HtmlService.createTemplateFromFile("adminGateway").evaluate().setTitle("Admin - Malabar House");
  } else if (typeof(e["parameter"]["creation"]) !== "undefined") {
    return HtmlService.createHtmlOutputFromFile("create");
  } else if (typeof(e["parameter"]["forgot"]) !== "undefined") {
    return HtmlService.createHtmlOutputFromFile("forgot");
  } else {
    var t = HtmlService.createTemplateFromFile("gateway");
    t.notLoggingOut = true;
    return t.evaluate().setTitle("Malabar House").setSandboxMode(HtmlService.SandboxMode.NATIVE);
//    return HtmlService.createHtmlOutputFromFile("teset")
  }
}
function doPost(e) {
  Logger.log("ASDASDASDASDASDASDASD");
  Logger.log("BLAHHHHHHHHHHHHHH");
// //I will want to use UrlFetchApp.fetch(paypal's url, {"method":"post"})
  var parameters = e["parameter"];
//  MailApp.sendEmail(adminEmail,"params",JSON.stringify(parameters));
  if (typeof(parameters["whereFrom"]) === "undefined") {
    // Perform confirmation that the post is, indeed, from PayPal
    // Add to calendar and spreadsheet
    // If paid === true;

      var confirmed = paymentIsConfirmed_(e);
      if (confirmed === true) {
        MailApp.sendEmail(adminEmail, "payment suzesss", JSON.stringify(parameters));
        
        var orderInfoString = PropertiesService.getScriptProperties()
        .getProperty(parameters["custom"]);
        var orderInfo = JSON.parse(orderInfoString);
        addCalendarEvent_(orderInfo, false);
        addSpreadsheetEntry_(orderInfo);
        PropertiesService.getScriptProperties().deleteProperty(
          parameters["custom"]);
        // MailApp.sendEmail({
        // to:adminEmail,
        // subject:"sent an email",
        // htmlBody:""+e.getResponseCode()
        // });
      } else if (confirmed === "Something went wrong") {
        MailApp.sendEmail(adminEmail, "payment faild", "gnu get it");
      } else {
        MailApp.sendEmail(adminEmail, "payment faild", "u get it");
      }
    
  } else if (parameters["whereFrom"] === "fromConfirmation") {
    if (parameters["acceptOrReject"] === "accept") {
      var orderInfoString = PropertiesService.getScriptProperties()
      .getProperty(parameters["orderID"]);
      var orderInfo = JSON.parse(orderInfoString);
      addCalendarEvent_(orderInfo, false);
      addSpreadsheetEntry_(orderInfo);
    }
    PropertiesService.getScriptProperties().deleteProperty(
      parameters["orderID"]);
  } else if (parameters["whereFrom"] === "passwordChangeEmail") {
    return dealWithPasswordChangeEmail_(parameters);
  } else if (parameters["whereFrom"] === "accountConfirmationEmail") {
    return dealWithAccountConfirmationEmail_(parameters);
  }
  Logger.log("Has posted")
  return ContentService.createTextOutput("Submitted. Please close this tab.");
  //  // return HtmlService.createHtmlOutputFromFile('booking'); */
}
function warmUpServer() {
  
}
function include_(htmlFile) {
  return HtmlService.createHtmlOutputFromFile(htmlFile).getContent();
}
function giveBasic(thing) {
  if (thing === "forgot" || thing === "gateway" || thing === "create") {
    var t = HtmlService.createTemplateFromFile(thing);
    t.notLoggingOut = false;
    return t.evaluate().getContent();
  }
}
//A bit useless. Maybe finish this if you want to make this a framework.
function createNeededCalendars() {
  var room;
  var roomList = roomsList_()
  for (var n in roomList) {
    room = roomList[n];
    if (CalendarApp.getOwnedCalendarsByName(room).length === 0) {
      Logger.log("Room Booking for "+room);
      CalendarApp.createCalendar(room);
    }
    if (CalendarApp.getOwnedCalendarsByName("Requests for "+room).length === 0) {
      Logger.log("Room Request for "+room);
      var cal = CalendarApp.createCalendar("Requests for "+room)
    }
  }
}
function dealWithPasswordChangeEmail_(params) {
  var scriptProps = PropertiesService.getScriptProperties();
  var accounts = JSON.parse(scriptProps.getProperty("accounts"));
  if (params["token"] === accounts[params["user"]]["accountEmailToken"]) {
    var t = HtmlService.createTemplateFromFile("changePassword");
    t.token = params["token"];
    t.user = params["user"];
    return t.evaluate();
  } else {
    return ContentService.createTextOutput("Looks like you've already used this password change request! Go to the site to generate another one, and while you're at it, delete the email that took you here.");
  }
}
function changePassword(form) {
  var scriptProps = PropertiesService.getScriptProperties();
  var accounts = JSON.parse(scriptProps.getProperty("accounts"));
  if (form["token"] === accounts[form["user"]]["accountEmailToken"]) {
    delete accounts[form["user"]]["accountEmailToken"];
    accounts[form["user"]]["password"] = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, form["pwd"]);
    scriptProps.setProperty("accounts", JSON.stringify(accounts))
  }
}
function sendPasswordChangeMail(form) {
  var user = form["username"];
  Logger.log(user)
  var token = setAccountEmailToken_(user, "accounts");
  var t = HtmlService.createTemplateFromFile("passwordChangeEmail");
  t.token = token;
  t.user = user;
  var text = t.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
  MailApp.sendEmail({
    to:user,
    subject:"PAssword cchange",
    htmlBody:text
  });
}
function getRelativeDate(daysOffset, hour) {
  var date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}
function setAccountEmailToken_(user, typeOfAccounts) {
  var scriptProps = PropertiesService.getScriptProperties();
  var accounts = JSON.parse(scriptProps.getProperty(typeOfAccounts));
  var token;
  if (typeof(accounts[user]["accountEmailToken"]) !== "undefined") {
    token = accounts[user]["accountEmailToken"];
  } else {
    token = randomNumberString_(1,100000000000000000000);
    accounts[user]["accountEmailToken"] = token;
    //write accounts
    scriptProps.setProperty(typeOfAccounts, JSON.stringify(accounts));
  }
  return token;
}
function randomNumberString_(min, max) {
  return String(Math.floor(Math.random() * (max - min + 1) + min));
}
function isUnused_(tokenType, token) {
  var scriptProps = PropertiesService.getScriptProperties();
  var props = scriptProps.getProperties();
  switch (tokenType) {
    case "requestId":
      for (var prop in props) {
        if (prop === "a"+token) {
          return false;
        }
      }
      break;
    case "token":
      var accounts = props["accounts"];
      for (var user in accounts) {
        if (accounts[user]["token"] === token) {
          return false;
        }
      }
      break;
  }
  return true;
}
function generateUnusedToken_(tokenType) {
  var scriptProps = PropertiesService.getScriptProperties();
  var unused = false;
  var rand;
  var props = scriptProps.getProperties();
  while (unused===false) {
    rand = randomNumberString_(1,1000000000000000000000000000000000000000000);
    switch (tokenType) {
      case "requestId":
        for (var prop in props) {
          if (prop === "a"+rand) {
            
          }
        }
        break;
      case "token":
        
    }
  }
}
function paymentIsConfirmed_(e) {
    var params = {method:"post"};
    var resp = UrlFetchApp.fetch("https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_notify-validate&"+e.postData.contents, params).getContentText();
    if (resp === "VERIFIED") {
      return true;
    } else if (resp === "INVALID") {
      return false;
    } else {
      return "Something went wrong";
    }
}
function giveDash(form) {
  var password = form["pwd"];
  Logger.log("running givedash")
  if (adminPasswordCheck_(password)) {
    var t = HtmlService.createTemplateFromFile("dashboard");
    var scriptProps = PropertiesService.getScriptProperties();
    var accounts = JSON.parse(scriptProps.getProperty("accounts"));
    if (typeof(accounts["admin"]["token"]) === "undefined") {
      var tok = randomNumberString_(1,1000000000000000);
      accounts["admin"]["token"] = tok;
      scriptProps.setProperty("accounts", JSON.stringify(accounts));
    } else {
      var tok = accounts["admin"]["token"];
    }
    refreshTimeout_("admin");
    t.token = tok;
    Logger.log("GEGEO");
    return t.evaluate().getContent();
  }
  return "";
}
function passwordCheck(credentialsDict) {
  Logger.log("HELLO")
  var scriptProps = PropertiesService.getScriptProperties();
  var props = scriptProps.getProperties();
  Logger.log("prop")
  var accounts = JSON.parse(props["accounts"]);
  Logger.log("and it is... "+String(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, credentialsDict["pwd"])))
  // accounts[credentialsDict[user]] will be a list; first element: known
  // password. second element: known active auth codes, if any.
  if (String(accounts[credentialsDict["user"]]["password"]) === String(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, credentialsDict["pwd"]))) {
    //if accounts[given_user][1] (in other words, existing auth token for this user) is undefined...
    if (typeof(accounts[credentialsDict["user"]]["token"]) === "undefined") {
      // generate an auth token. Make sure to convert to string, so that when
      // page feeds it back to script, it is in correct format	
      //for checking against known string
      
      // a lot of zeroes
      var tok = randomNumberString_(1,1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000);
      //write generated token to list of known tokens
      //first, insert token in accounts dictionary.
      accounts[credentialsDict["user"]]["token"] = tok;
      //then, write stringed accounts back to props
      scriptProps.setProperty("accounts", JSON.stringify(accounts));
      //finally, use token to get(home)Page
      Logger.log("HIGINB")
      return givePage('home', tok);
    } else {
      return givePage('home', accounts[credentialsDict["user"]]["token"]);
      //-- which is a string already.
    }
  } else {
    //return false, causing client page to alert "invalid password"
    return false;
  }
}
function adminPasswordCheck_(password) {
	var scriptProps = PropertiesService.getScriptProperties();
    var props = scriptProps.getProperties();
    var accounts = JSON.parse(props["accounts"]);
    var adminPassword = accounts["admin"]["password"];
    if (String(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, password)) === String(adminPassword)) {
      return true;
    } else {
      return false
    }
}
function deleteTrigger_(triggerId) {
  // Loop over all triggers.
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    // If the current trigger is the correct one, delete it.
    if (allTriggers[i].getUniqueId() == triggerId) {
      ScriptApp.deleteTrigger(allTriggers[i]);
      break;
    }
  } 
}
function clearTriggers_(user, andToken) {
  var scriptProps = PropertiesService.getScriptProperties();
  var props = scriptProps.getProperties();
  var accounts = JSON.parse(props["accounts"]);
  var currentTriggerId = accounts[user]["currentTimeoutId"];
  if (currentTriggerId !== "") {
    deleteTrigger_(currentTriggerId);
    accounts[user]["currentTimeoutId"] = "";
    accounts[user]["currentTimeoutTime"] = "";
    if (andToken) {
      delete accounts[user]["token"];
    }
  }
  scriptProps.setProperty("accounts", JSON.stringify(accounts));
}
function refreshTimeout_(user) {
  var scriptProps = PropertiesService.getScriptProperties();
  var props = scriptProps.getProperties();
  var accounts = JSON.parse(props["accounts"]);
  //If a timeout exists, delete it.
  clearTriggers_(user, false);
  var newTriggerId = createTimeout_();
  var now = new Date();
  var newTimeoutTime = now.getTime() + 600000;
  accounts[user]["currentTimeoutId"] = newTriggerId;
  accounts[user]["currentTimeoutTime"] = newTimeoutTime; //newTimeoutTime is an integre
  var stringedAccounts = JSON.stringify(accounts);
  scriptProps.setProperty("accounts", stringedAccounts);
}
function logOut(token, user) {
  var scriptProps = PropertiesService.getScriptProperties();
  var accounts = JSON.parse(scriptProps.getProperty("accounts"));
  if (accounts[user]["token"] === token) {
    clearTriggers_(user, true);
    var t = HtmlService.createTemplateFromFile("gateway");
    t.notLoggingOut = false;
    return t.evaluate().getContent();
  }
}
function givePage(page, accessToken) {
  var scriptProps = PropertiesService.getScriptProperties();
  var props = scriptProps.getProperties();
  var accounts = JSON.parse(props["accounts"]);
  var tokenValid = false;
  // check if the token is valid, by looping through existing auth tokens and
  // checking whether each is equal to accessToken
  for ( var account in accounts) {
		// If the second entry in the account exists (meaning that this only
    // checks the auth tokens, not the passwords)
    if (typeof (accounts[account]["token"]) !== 'undefined') {
      if (accounts[account]["token"] === accessToken) {
        //set tokenValid to true. Also, refresh user's timeout.
        refreshTimeout_(account);
        Logger.log('token is vlaid')
        tokenValid = true;
        var currentUser = account;
      }
    }
  }
  Logger.log('got here')
  if (tokenValid) {
    if (page === "dashboard") {
      if (accounts["admin"]["token"] === accessToken) {
        var tokenedHtml = makeDashboardHtml_(accessToken);
      } else {
        var tokenedHtml = "For security reasons, you have been timed out. Please reload and log in again.";
      }
    } else {
      var t = HtmlService.createTemplateFromFile(page);
      t.token = accessToken;
      t.user = currentUser;
      t.realname = accounts[currentUser]["name"];
      var tokenedHtml = t.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).getContent();
    }
    Logger.log(tokenedHtml)
    return tokenedHtml;
  } else {
    return "For security reasons, you have been timed out. Please reload and log in again.";
  }
}
//works
function rejectAccount(authToken, potentialUser) {
  var scriptProps = PropertiesService.getScriptProperties();
  var potentialAccounts = JSON.parse(scriptProps.getProperty("potentialAccounts"));
  var accounts = JSON.parse(scriptProps.getProperty("accounts"));
  var adminToken = accounts["admin"]["token"];
  if (adminToken === authToken) {
    delete potentialAccounts[potentialUser];
    //write to scriptProps
    var ptacstring = JSON.stringify(potentialAccounts);
    scriptProps.setProperty("potentialAccounts", ptacstring);
    MailApp.sendEmail({
      to:potentialUser,
      subject:"Your House Account has been rejected",
      htmlBody:"Good riddance!",
    });
  }
  return "potential:"+potentialUser;
}
//works NEXT STEP add confirmation token to email
// jasodifjasepofjasdoifjasdoi FIX THIS!!!!!!!!!!!!!!!!
function dealWithAccountConfirmationEmail_(parameters) {
  var scriptProps = PropertiesService.getScriptProperties();
  var potentialAccounts = JSON.parse(scriptProps.getProperty("potentialAccounts"));
  var accounts = JSON.parse(scriptProps.getProperty("accounts"));
  var potentialUser = parameters["potentialUser"];
  if (typeof(potentialAccounts[potentialUser]) !== "undefined") {
    if (potentialAccounts[potentialUser]["accountEmailToken"] === parameters["accountEmailToken"]) {
      potentialAccounts[potentialUser]["accountEmailToken"] = "";
      var ptacstring = JSON.stringify(potentialAccounts)
      scriptProps.setProperty("potentialAccounts", ptacstring);
      return ContentService.createTextOutput("Submitted. Please close this tab and delete the email that took you here.");
    }
  } else {
    return ContentService.createTextOutput("Looks like you've already confirmed your identity! Please delete the email that took you here.");
  }
}
function approveAccount(authToken, potentialUser) {
  var scriptProps = PropertiesService.getScriptProperties();
  var potentialAccounts = JSON.parse(scriptProps.getProperty("potentialAccounts"));
  var accounts = JSON.parse(scriptProps.getProperty("accounts"));
  var adminToken = accounts["admin"]["token"];
  var realname = potentialAccounts[potentialUser]["name"];
  if (adminToken === authToken) {
    var userDict = potentialAccounts[potentialUser];
    userDict["currentTimeoutTime"] = "";
    userDict["currentTimeoutId"] = "";
    accounts[potentialUser] = userDict;
    delete potentialAccounts[potentialUser];
    //write to scriptProps
    var acstring = JSON.stringify(accounts);
    var ptacstring = JSON.stringify(potentialAccounts);
    scriptProps.setProperty("accounts", acstring);
    scriptProps.setProperty("potentialAccounts", ptacstring);
  }
  return [potentialUser, realname, authToken];
}
function deleteAccount(authToken, user) {
  Logger.log(authToken);
  Logger.log(user)
  var scriptProps = PropertiesService.getScriptProperties();
  var props = scriptProps.getProperties();
  var accounts = JSON.parse(props["accounts"]);
  if (accounts["admin"]["token"] === authToken) {
    delete accounts[user];
    scriptProps.setProperty("accounts", JSON.stringify(accounts));
    MailApp.sendEmail(user, "House Account deleted", "For some reason, Sheri has deleted your account. So... bye!");
  }
  return user;
}
//works
function makeStatusText_(user) {
  var scriptProps = PropertiesService.getScriptProperties();
  var props = scriptProps.getProperties();
  var requestList = [];
  var text;
  var request;
  var thereIsAtLeastOneRequest;
  for (var x in props) { 
    text="";
    if (x !== "accounts" && x !== "potentialAccounts") {
      request = JSON.parse(props[x]);
      if (request["email"] === user) {
        thereIsAtLeastOneRequest = true;
        text += "Request for ";
        text += request["rooms"];
        text += " from ";
        text += request["arrive"];
        text += " to ";
        text += request["leave"];
        text += "."
        requestList.push([text, x]);
      }
    }
  }
  if (thereIsAtLeastOneRequest) {
    return requestList;
  } else {
    return false;
  }
}
function setApproved_(id) {
  var scriptProps = PropertiesService.getScriptProperties();
  var request = JSON.parse(scriptProps.getProperty(id));
  request["approved"] = true;
  scriptProps.setProperty(id, JSON.stringify(request));
}
function freeApproval(token, id) {
  Logger.log(token);
  Logger.log(id);
  var scriptProps = PropertiesService.getScriptProperties();
  var accounts = JSON.parse(scriptProps.getProperty("accounts"));
  if (accounts["admin"]["token"] === token) {
    /*
    * Send an email confirming that they want to finalize the
    * reservation
    */
    var text = "Your request for a stay at Malabar House has been approved. Select the appropriate statement, then press Submit.";
    text += "<form action=\"https://script.google.com/macros/s/AKfycbx9i34rLM6A7Q4qzdhX_8BM_WV9V8ElNh28X9su9h4_avJwTCY/exec\" method=\"post\">\
<input type=\"radio\" name=\"acceptOrReject\" value=\"accept\">I confirm and finalize this reservation   \
<input type=\"radio\" name=\"acceptOrReject\" value=\"reject\">I want to cancel this reservation   \
<input type=\"hidden\" name=\"orderID\" value=\"insert order id here\">\
<input type=\"hidden\" name=\"whereFrom\" value=\"fromConfirmation\">\
<input type=\"submit\"  value=\"Submit\">\
</form>";
    text = text.replace("insert order id here", id);
    var request = JSON.parse(scriptProps.getProperty(id));
    var email = request["email"]
    MailApp.sendEmail({
      to : email,
      subject : "you need not pay",
      htmlBody : text
    });
    setApproved_(id);
  }
  return id;
}
function paidApproval(token, id) {
  Logger.log(token);
  Logger.log(id);
  var scriptProps = PropertiesService.getScriptProperties();
  var accounts = JSON.parse(scriptProps.getProperty("accounts"));
  if (accounts["admin"]["token"] === token) {
    var t = HtmlService.createTemplateFromFile("paymentEmail");
    t.orderId = id;
    var text = t.evaluate().getContent();
    // Replace "placeidhere" with the id
    text = "Your request for a stay at Malabar House has been approved. Please click Buy Now and pay a small fee to complete the process." + text;
    var request = JSON.parse(scriptProps.getProperty(id));
    var email = request["email"]
    MailApp.sendEmail({
      to : email,
      subject : "you must pay",
      htmlBody : text
    });
    setApproved_(id);
  }
  return id;
}
// Make this also remove the calendar event
// FINISH THIS!!!!!!!!!!! (seems to work, neeeds more tests)
function rejectRequest(token, id) {
  Logger.log(token)
  Logger.log(id)
  var scriptProps = PropertiesService.getScriptProperties();
  var accounts = JSON.parse(scriptProps.getProperty("accounts"));
  if (accounts["admin"]["token"] === token) {
    var scriptProps = PropertiesService.getScriptProperties();
    var request = JSON.parse(scriptProps.getProperty(id));
    var email = request["email"]
    // Send email informing them of rejection
    MailApp.sendEmail({
      to :email,
      subject : "Your Malabar House request has been rejected",
      htmlBody : "G'bai! ;)"
    });
    var room;
    var roomCalId;
    var eventIdPositionInList = 0;
    for (var n in request["rooms"]) {
      room = request["rooms"][n];
      roomCalId = CalendarApp.getOwnedCalendarsByName("Requests for "+room)[0].getId();
      //MUST CHECK WHETHER THIS EVENT EXISTS!!!!!!!
      Calendar.Events.remove(roomCalId, request["eventIds"][eventIdPositionInList]);
      eventIdPositionInList += 1;
    }
    scriptProps.deleteProperty(id);
  }
  return id;
}
function makeActionButtonsHtml_(authToken, requestId) {
  var text = "<td>";
  //add a successHandler. Also, of course, MAKE THESE FUNCTIONS!!
  authToken = "\"" + authToken + "\"";
  requestId = "\"" + requestId + "\"";
  text += "<form>"
  text += "<input type='button' value='Approve for free' onclick='google.script.run.freeApproval(insertAuthTokenHere, insertIdHere)'>";
  text += "<input type='button' value='Approve with fee ($)' onclick='google.script.run.paidApproval(insertAuthTokenHere, insertIdHere)'>";
  text += "<input type='button' value='Reject' onclick='google.script.run.rejectRequest(insertAuthTokenHere, insertIdHere)'>";
//  text += "<input type='button' value='Approve for free' onclick=''>";
//  text += "<input type='button' value='Approve with fee ($)' onclick='google.script.run.paidApproval(insertAuthTokenHere, insertIdHere)'>";
//  text += "<input type='button' value='Reject' onclick='google.script.run.rejectRequest(insertAuthTokenHere, insertIdHere)'>";
  text += "</form>";
  Logger.log('hhem: request id is' + requestId)
  text = text.replace(/insertAuthTokenHere/g, authToken)
  text = text.replace(/insertIdHere/g, requestId);
  text += "</td>";
  return text;
//  return "<td>HELLO WORLD</td>"
}
function makeDashboardHtml_(authToken) {
  var t = HtmlService.createTemplateFromFile("dashboard");
  t.token = authToken;
  var newHtmlString = t.evaluate().getContent();
  return newHtmlString;
}
function usernameIsAvailable_(username) {
  var scriptProps = PropertiesService.getScriptProperties();
  var accounts = JSON.parse(scriptProps.getProperty("accounts"));
  var potentialAccounts = JSON.parse(scriptProps.getProperty("potentialAccounts"));
  if (username in accounts || username in potentialAccounts) {
    return false;
  }
  return true;
}
function adminEmail() {
  var text = "On "+today_()+", "+form["name"]+" has requested a website account, using the email "+form["username"]+". Visit the <a href='https://script.google.com/macros/s/AKfycbx9i34rLM6A7Q4qzdhX_8BM_WV9V8ElNh28X9su9h4_avJwTCY/exec?admin=admin'>Website Management Dashboard</a> to take action.";
  MailApp.sendEmail({
    to:adminEmail,
    subject:"New account request on your website",
    htmlBody:text,
  }); 
}
function sendAccountRequest(form) {
  var username = form["username"];
  if (usernameIsAvailable_(username) === false) {
    return false;
  }
  var scriptProps = PropertiesService.getScriptProperties();
  var potentialAccounts = JSON.parse(scriptProps.getProperty("potentialAccounts"));
  var accounts = JSON.parse(scriptProps.getProperty("accounts"));
  var newPotentialAccountDict = form;
  var encryptedPassword = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, form["password"]);
  Logger.log(encryptedPassword);
  newPotentialAccountDict["password"] = encryptedPassword;
  delete newPotentialAccountDict["username"];
  delete newPotentialAccountDict["reenter"];
  potentialAccounts[username] = newPotentialAccountDict;
  scriptProps.setProperty("potentialAccounts", JSON.stringify(potentialAccounts));
  var t = HtmlService.createTemplateFromFile("accountConfirmationEmail");
  t.potentialUser = username;
  t.accountEmailToken = setAccountEmailToken_(username, "potentialAccounts");
  var htmlBody = t.evaluate().getContent();
  MailApp.sendEmail({
    to:username,
    subject:"Malabar House Account -- Confirm that it's really you",
    htmlBody:htmlBody,
  });
  return true;
}
function createTimeout_() {
  var triggerObject = ScriptApp.newTrigger('timeoutSweep').timeBased().after(600000).create();
  var id = triggerObject.getUniqueId();
  return id;
}
function timeoutSweep() {
  Logger.log("hello?")
  var scriptProps = PropertiesService.getScriptProperties();
  var accounts = JSON.parse(scriptProps.getProperty("accounts"));
  var userDict;
  Logger.log(typeof(accounts))
  for (var userName in accounts) {
    userDict=accounts[userName];
    var now = new Date();
    Logger.log("currentTimeoutTime: "+userDict["currentTimeoutTime"]+" time now is "+now.getTime())
    if (userDict["currentTimeoutTime"]  < now.getTime()) {
      Logger.log("timeout time is less than the current time, therefore it has passed");
      //delete trigger andToken
      clearTriggers_(userName, true);
    }
  }
}
function In_(element, array) {
	for ( var n in array) {
		if (String(array[n]) === String(element)) {
			return true;
		}
	}
	return false;
}
function getElementsFromDict_(dict) {
	var elements = [];
	for ( var key in dict) {
		Logger.log(key);
		if (key === "rooms") {
			if (typeof (dict[key] === "object")) {
				dict[key] = JSON.stringify(dict[key]);
			} else if (typeof (dict[key] === "string")) {

			}
		}
		if (key === "pageHistory" || key === "fbzx" || key === "draftResponse") {

		} else {
			Logger.log("NOT ROOMS KEY IS " + key);
			elements.push(dict[key]);
			Logger.log("GOT HERE");
		}
	}
	Logger.log("GOT TO END");
	return elements;
}
function convertDate_(date) {
	if (typeof (date) === "string") {
		Logger.log("type of date is string");
		var months = {
			"01" : "January",
			"02" : "February",
			"03" : "March",
			"04" : "April",
			"05" : "May",
			"06" : "June",
			"07" : "July",
			"08" : "August",
			"09" : "September",
			"10" : "October",
			"11" : "November",
			"12" : "December"
        };
        var splitString = date.split("/");
        var string = months[splitString[0]] + " " + splitString[1] + ", "
        + splitString[2];
      return string;
    } else {
		
		var string = (date.getMonth()+1) + "/" + date.getDate() + "/" + date.getFullYear()
		return string;
	}
}

function today_() {
	var months = {
		1 : "January",
		2 : "February",
		3 : "March",
		4 : "April",
		5 : "May",
		6 : "June",
		7 : "July",
      8 : "August",
      9 : "September",
		10 : "October",
      11 : "November",
		12 : "December"
    };
  var today = new Date();
  var d = today.getDate();
	var m = months[today.getMonth()+1];
	var y = today.getFullYear();
	return m + " " + d + ", " + y;
}
//function translateFormDict_(dict) {
//	var translation = {
//		"entry.1172957590" : "name",
//		"entry.1788478969" : "rooms",
//		"entry.1296939032" : "arrive",
//		"entry.2108423837" : "leave",
//		"entry.172066212" : "extra",
//		"entry.1452866060" : "email"
//	};
//	var keys = Object.keys(dict);
//	var newDict = {};
//	var key;
//	var newKey;
//	for ( var i in keys) {
//		// COMPLETE
//		key = keys[i];
//		if (key in translation) {
//			newKey = translation[key];
//		} else {
//			newKey = key;
//		}
//		newDict[newKey] = dict[key];
//	}
//	return newDict;
//}

//function dictLatestResponse_(url, isReservations) {
//	// Open a form by ID and log the responses to each question.
//	var responses = {};
//	Logger.log(url);
//	if (isReservations === true) {
//		return translateFormDict_(url);
//	} else {
//		var form = FormApp.openByUrl(url);
//		var formResponses = form.getResponses();
//		var i = formResponses.length - 1
//		var formResponse = formResponses[i];
//		var itemResponses = formResponse.getItemResponses();
//		for (var j = 0; j < itemResponses.length; j++) {
//			var itemResponse = itemResponses[j];
//			// Logger.log('Response #%s to the question "%s" was "%s"',
//			// (i + 1).toString(),
//			// itemResponse.getItem().getTitle(),
//			// itemResponse.getResponse());
//			if (isReservations === false) {
//				Logger.log("Got here");
//				Logger.log(itemResponse.getResponse());
//				Logger.log(itemResponse.getResponse());
//				return itemResponse.getResponse();
//			}
//		}
//	}
//	this.responses = responses;
//}
//function createRequestForm_() {
//	var requestform = FormApp.create('Reservation Request');
//	var question = requestform.addMultipleChoiceItem();
//	question
//			.setTitle(
//					'Will you allow the reservation specified in the email to go through? (formID then add whatever is the FORM ID!!!')
//			.setChoices(
//					[ question.createChoice('Allow'),
//							question.createChoice('Reject') ]);
//	this.url = requestform.getPublishedUrl();
//	var id = requestform.getPublishedUrl();
//	var scriptProps = PropertiesService.getUserProperties();
//	var triggerObject = ScriptApp.newTrigger('onRequestFormSubmit').forForm(
//			requestform).onFormSubmit().create();
//	scriptProps.setProperty(id, triggerObject.getUniqueId());
//	MailApp.sendEmail({
//		to : adminEmail,
//		subject : "sent an email",
//		htmlBody : triggerObject.getUniqueId() + " " + id,
//	});
//	return requestform.getPublishedUrl();
//};
function onRequestFormSubmit_(e) {
	// LAST LEG!!@!H@!UH!IO@HI!UH@I!UH@IOUH !IUO@H CI!U@H COI!U@H C!IUO@
	// CH!IOU!!!!!!!!!
	// var response = this.dictLatestResponse_(this.url,false);
	// Logger.log(response);
	// if (response === "Approve") {
	// addCalendarEvent_();
	// }
	Logger.log("HI");
	Logger.log(e.response);
	var scriptProps = PropertiesService.getUserProperties();
	var response = e.response;
	// var srcID = src.getId();
	// var srcURL = src.getPublishedUrl();
	// var triggerID = scriptProps.getProperty(srcURL);
	// var triggers = ScriptApp.getProjectTriggers();
	// var itemResponses = response.getItemResponses();
	Logger.log("preloop " + response.getItemResponses[0].getResponse());
	var itemResponses = response.getItemResponses()
	for (var j = 0; j < itemResponses.length; j++) {
		var itemResponse = itemResponses[j];
		Logger.log("Got to the email sending")
		MailApp.sendEmail({
			to : adminEmail,
			subject : "sent an email",
			htmlBody : String(itemResponse.getResponse()),
		});
		Logger.log("Got past");
	}
	// deleteTrigger(triggerID);
}
function deleteTrigger_(triggerId) {
	// Loop over all triggers.
	var allTriggers = ScriptApp.getProjectTriggers();
	for (var i = 0; i < allTriggers.length; i++) {
		// If the current trigger is the correct one, delete it.
		if (allTriggers[i].getUniqueId() == triggerId) {
			ScriptApp.deleteTrigger(allTriggers[i]);
			break;
		}
	}
}
function removeRoomRequestEvents(bookingProfileDict) {
  var roomRequestCalName;
  var roomRequestCalId;
  //This "n" will be the index of the event id AS WELL as the room it refers to.
  for (var n in bookingProfileDict["eventIds"]) {
    roomRequestCalName = "Requests for "+bookingProfileDict["rooms"][n];
    roomRequestCalId = CalendarApp.getOwnedCalendarsByName(roomRequestCalName)[0].getId();
    // ******************************* DO TE DELEETIN HEAR ****************
    Calendar.Events.remove(roomRequestCalId, bookingProfileDict["eventIds"][n])
  }
}
// Find out how to get trigger by id
function addCalendarEvent_(responses, isRequest) {
  Logger.log(String(responses["rooms"]));
  removeRoomRequestEvents(responses);
  if (typeof (responses["rooms"]) === "object") {
    ;
  } else if (typeof (responses["rooms"]) === "string") {
    responses["rooms"] = [responses["rooms"]];
  }
  var oneRoomResponse = responses;
  var room;
  var eventIds = [];
  for (var i in responses["rooms"]) {
    room = responses["rooms"][i];
    oneRoomResponse["room"] = room;
    eventIds.push(addBookingToCalendarNew_(oneRoomResponse, isRequest));
  }
  return eventIds;
}
function addSpreadsheetEntry_(orderInfo) {
  var spread = SpreadsheetApp
  .openByUrl("https://docs.google.com/spreadsheets/d/1c0vPswpCuJeU389cMVhH8WUnrfk_24cyhg-O3X7QRl8/edit?usp=sharing");
  spread.appendRow(getElementsFromDict_(orderInfo));
}
//function addBookingToCalendar_(responseDict) {
//  var calendarId = 'rrc6pg8t2mgtrca0nusnr1au1k@group.calendar.google.com';
//  var roomNumber = getRoomNumber_(responseDict["room"])
//  Logger.log(responseDict["arrive"]);
//  Logger.log(responseDict["leave"]);
//  var event = {
//    summary: (responseDict["room"]+", "+responseDict["name"]),
//    location: 'Malabar House',
//    description: 'A stay with x extras',
//    start: {
//      date:responseDict["arrive"],
//    },
//    end: {
//      date:responseDict["leave"],
//    },
//   
//    // Red background. Use Calendar.Colors.get() for the full list.
//  };
//  if (roomNumber === "House") {
//    event.colorId = "7";
//  } else {
//    event.colorId = roomNumber;
//  }
//  event = Calendar.Events.insert(event, calendarId);
//  Logger.log('Event ID: ' + event.getId());
//}
function addBookingToCalendarNew_(responseDict, isRequest) {
  var roomCalName = responseDict["room"];
  var roomOnCalendarEvent = responseDict["room"];
  if (isRequest === true) {
    roomCalName = "Requests for "+roomCalName;
    roomOnCalendarEvent = "Request for "+roomOnCalendarEvent;
  }
  var calendarId = CalendarApp.getOwnedCalendarsByName(roomCalName)[0].getId();
  var startDate = new Date(convertDate_(responseDict["arrive"]));
  var endDate = new Date(convertDate_(responseDict["leave"]))
  var event = {
    summary: (roomOnCalendarEvent+", "+responseDict["name"]),
    location: 'Malabar House',
    description: 'A stay with x extras',
    start: {
      date:startDate.toISOString().slice(0,10),
    },
    end: {
      date:endDate.toISOString().slice(0,10),
    },
   
    // Red background. Use Calendar.Colors.get() for the full list.
  };
  event = Calendar.Events.insert(event, calendarId);
  return event.id;
}
function errorCheck(form) {
	// dictLatestResponse_(form,true);
	// var responses = this.responses;
	// var available = isAvailable_(new Date(convertDate_(responses["arrive"])),
	// new Date(convertDate_(responses["leave"])), responses["rooms"])
	// if (available===true) {
	// sendEmail_(form);
	// Logger.log("available")
	// return "Your response has been recorded";
	// } else {
	// Logger.log(available);
	// return available;
	// }
	// 10-15-2014: Fully implement leaveAfterArrive (make it tell the user that
  // leave is after arrive)
  var latestResponse = form;
  var arrive = new Date(convertDate_(latestResponse["arrive"]));
  var leave = new Date(convertDate_(latestResponse["leave"]));
  var rooms = latestResponse["rooms"];
  if (arrive.getTime() < leave.getTime() - 86399999) {
    var leaveAfterArrive = true;
  } else {
    var leaveAfterArrive = false;
  }
  var available = isAvailableNew_(arrive, leave, rooms);
  if (available === true && leaveAfterArrive === true) {
    var eventIds = addCalendarEvent_(form, true);
    form["eventIds"] = eventIds;
    sendEmail_(form);
    return "Your response has been recorded";
  } else {
    return available;
  }
  
}
function sendEmail_(form) {
	// this.addCalendarEvent_();
  var responses = form;
  responses["approved"] = false;
  var randomID =randomNumberString_(1,1000000000);
  var stringedId = "a" + randomID;
  PropertiesService.getScriptProperties().setProperty(stringedId,
                                                      JSON.stringify(responses))
  Logger.log(responses);
  var date = today_();
  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////IMPLEMENT
  // THE CHARGE OR NOT CHECKBOX
  var text = "On "
  + date
  + ", "
  + responses["name"]
  + " ("
  + responses["email"]
  + ") put in a request to use Malabar House room(s) "
  + responses["rooms"]
  + " from "
  + convertDate_(responses["arrive"])
  + " to "
  + convertDate_(responses["leave"])
  + ". Visit the <a href='https://script.google.com/macros/s/AKfycbx9i34rLM6A7Q4qzdhX_8BM_WV9V8ElNh28X9su9h4_avJwTCY/exec?admin=admin'>Website Management Dashboard</a> to take action.";
  MailApp.sendEmail({
    to : adminEmail,
    subject : "Reservation Request",
    htmlBody : text,
  });
}
/*
 * WORKS! Next step: add simple date checking : is it within the next year (ask
 * Sheri about how long this should be) ? is the departure date after the
 * arrival date? are both the dates in the future?
 */
function getRoomNumber_(eventString) {
  var splitByComma = eventString.split(", ");
  var roomDescription = splitByComma[0];
  return roomDescription.split(" ")[1];
}
//function isAvailable_(arrive, leave, rooms) {
//  var cal = CalendarApp
//  .getOwnedCalendarById("rrc6pg8t2mgtrca0nusnr1au1k@group.calendar.google.com");
//  var eventTitle;
//  var roomNumber;
//  var eventsOnDate;
//  var currentCheckDate;
//  var room;
//  var errorLogEntry;
//  var errors = [];
//  if (typeof (rooms) === "string") {
//    rooms = [ rooms ];
//  }
//  for ( var n in rooms) {
//    room = rooms[n];
//    currentCheckDate = arrive;
//    Logger.log("GOt to for room in rooms");
//    while (currentCheckDate.getTime() !== leave.getTime() + 86400000) {
//      eventsOnDate = eventsForDay_(currentCheckDate, cal);
//      Logger.log("number of events on date " + currentCheckDate.getDate()
//      + ": " + eventsOnDate.length);
//      Logger.log("error string is " + String(errors)
//      + "and string of [] is " + String([]));
//      for ( var i in eventsOnDate) {
//        eventTitle = eventsOnDate[i].getTitle();
//        Logger.log("Event Title: " + eventTitle);
//        Logger.log("error string is " + String(errors));
//        // Redo the events so that it doesn't show names
//        // THIS SPLITTING IS BROKEN!!!!!! MAKE IT SPLIT BY ", "!!!!!! (done Mar 11, 2015)
//        roomNumber = getRoomNumber_(eventTitle);
//        Logger.log(roomNumber);
//        if (roomNumber === room.split(" ")[1] || roomNumber === "House" || room === "Whole House") {
//          Logger.log("False");
//          // ***************************************************************************!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//          errorLogEntry = [ convertDate_(currentCheckDate), room ];
//          Logger.log(errorLogEntry);
//          Logger.log(errors[0]);
//          if (In_(errorLogEntry, errors) === false) {
//            errors.push(errorLogEntry);
//            Logger.log("errorlogentry not in errors");
//          }
//        }
//        ;
//      }
//      // 86400000 is the number of milliseconds in a day
//      // getTime gets milliseconds after the epoch for given date
//      currentCheckDate = new Date(currentCheckDate.getTime() + 86400000);
//    }
//  }
//  Logger.log("error string is " + String(errors));
//  if (String(errors) === "") {
//    return true;
//  }
//  Logger.log(typeof (errors));
//  return createErrorMessage_(errors);
//}
function asdfadfuuuu() {
  var x = new Date("April 16, 2015");
  var y = new Date("April 18, 2015");
  Logger.log(isAvailableNew_(x,y,["Room 1","Room 2"]))
}
function isAvailableNew_(arrive, leave, rooms) {
  var cal;
  var eventTitle;
  var roomNumber;
  var eventsOnDate;
  var currentCheckDate;
  var room;
  var errorLogEntry;
  var calsForRoom = [];
  var errors = [];
  if (typeof (rooms) === "string") {
    rooms = [ rooms ];
  }
  for ( var n in rooms) {
    room = rooms[n];
    calsForRoom = [CalendarApp.getOwnedCalendarsByName(room)[0], CalendarApp.getOwnedCalendarsByName("Requests for "+room)[0]]
    for (var i in calsForRoom) {
      cal = calsForRoom[i];
      Logger.log(" I IS: "+i)
      currentCheckDate = arrive;
      while (currentCheckDate.getTime() !== leave.getTime() + 86400000) {
        eventsOnDate = cal.getEventsForDay(currentCheckDate);
        Logger.log(eventsOnDate);
        if (eventsOnDate.length !== 0) {
          Logger.log("Now, i is "+(i==1));
          errorLogEntry = [convertDate_(currentCheckDate), room, false]; // last false is the isRequest
          
          if (i == 1) { //For whatever reason, I must have only two ==s
            Logger.log("Gttin true")
            errorLogEntry[2] = true;
          }
          errors.push(errorLogEntry);
        }
        // 86400000 is the number of milliseconds in a day
        // getTime gets milliseconds after the epoch for given date
        currentCheckDate = new Date(currentCheckDate.getTime() + 86400000);
      }
    }
  }
  Logger.log("error string is " + String(errors));
  if (String(errors) === "") {
    return true;
  }
  Logger.log(typeof (errors));
  return createErrorMessage_(errors);
//  return errors;
}
function createErrorMessage_(errors) {
  var text = "Correct these errors:\n";
  text += "<ul>";
  var error;
  for ( var n in errors) {
    error = errors[n];
    if (error[2] === false) { //check if not isRequest
      text += "<li>On " + error[0] + ", your request for " + error[1]
    + " overlaps with an existing booking.</li>";
    } else {
      text += "<li>Just so you know: On " + error[0] + ", your request for " + error[1]
    + " overlaps with an existing room request. There is a higher chance of your request being rejected.</li>";
    }
  }
  text += "</ul>";
  return text;
}
      // function sendApprovalMessage() {
// var htmlText =
// "Your booking request for Malabar House has been approved. To complete the
// process,
// }
function eventsForDay_(date, cal) {
	var dateTime = date.getTime();
	var start = new Date(dateTime /*+ 43200000*/);
	var end = new Date(dateTime + 43300000);
	return cal.getEvents(start, end);
}