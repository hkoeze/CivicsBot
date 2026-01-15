function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Prevent concurrent writes

  try {
    // 1. Parse the incoming webhook data
    // ElevenLabs sends the useful data inside a 'data' object wrapper
    var jsonString = e.postData.contents;
    var payload = JSON.parse(jsonString);
    
    // Check if the payload has the 'data' wrapper (standard ElevenLabs format)
    // or if it's flat (test events sometimes differ).
    var data = payload.data || payload;

    // 2. Extract Transcript
    var transcript = "";
    var conversationId = data.conversation_id || "Unknown ID";

    if (data.transcript && Array.isArray(data.transcript)) {
      // Loop through the transcript array to format it nicely
      transcript = data.transcript.map(function(item) {
        return item.role.toUpperCase() + ": " + item.message;
      }).join("\n\n");
    } else {
      // Fallback if transcript structure is unexpected
      transcript = JSON.stringify(data.transcript || "No transcript found");
    }

    // 3. Open Spreadsheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dataSheet = ss.getSheetByName("Data");
    var settingsSheet = ss.getSheetByName("Settings");

    // Initialize headers if sheet is empty
    if (dataSheet.getLastRow() === 0) {
      dataSheet.appendRow(["Timestamp", "Call ID", "Transcript", "Gemini Feedback", "Raw JSON"]);
    }

    // 4. Get Settings
    var apiKey = settingsSheet.getRange("B1").getValue();
    var systemPrompt = settingsSheet.getRange("B2").getValue();

    // 5. Call Gemini
    var feedback = "";
    if (apiKey && transcript.length > 10) { // Only analyze if we have content
      feedback = callGemini(apiKey, systemPrompt, transcript);
    } else if (!apiKey) {
      feedback = "Error: Missing API Key in Settings tab.";
    }

    // 6. Save to Sheet
    dataSheet.appendRow([
      new Date(),
      conversationId,
      transcript,
      feedback,
      jsonString // Keep raw data for debugging
    ]);

    // 7. Return Success (Required 200 OK)
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);

  } catch (error) {
    // Log fatal errors to the sheet so you know what happened
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Data");
    if (sheet) {
      sheet.appendRow([new Date(), "ERROR", error.toString(), "", ""]);
    }
    // Still return success to prevent ElevenLabs from retrying endlessly on script errors
    return ContentService.createTextOutput("Error logged").setMimeType(ContentService.MimeType.TEXT);
    
  } finally {
    lock.releaseLock();
  }
}

function callGemini(apiKey, systemPrompt, transcript) {
  // Using gemini-1.5-flash for speed and cost efficiency
  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
  
  var payload = {
    "contents": [{
      "parts": [{
        "text": systemPrompt + "\n\n### CALL TRANSCRIPT:\n" + transcript
      }]
    }]
  };

  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    
    if (json.candidates && json.candidates.length > 0) {
      return json.candidates[0].content.parts[0].text;
    } else if (json.error) {
      return "API Error: " + json.error.message;
    } else {
      return "No response text generated.";
    }
  } catch (e) {
    return "Fetch Failed: " + e.message;
  }
}
