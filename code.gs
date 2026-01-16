// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
// To find your Spreadsheet ID: Open your Google Sheet and look at the URL
// https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID_IS_HERE/edit
var SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";

// ElevenLabs Webhook HMAC Secret for signature verification
// Set this same secret in your ElevenLabs webhook settings
var WEBHOOK_SECRET = "CivicsBot1";

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================
function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(10000);

  if (!hasLock) {
    return ContentService.createTextOutput("Server busy, please retry").setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    // 0. Verify HMAC signature from ElevenLabs
    var jsonString = e.postData.contents;
    if (WEBHOOK_SECRET && WEBHOOK_SECRET.length > 0) {
      var signature = e.parameter["xi-signature"] || (e.headers && e.headers["xi-signature"]);
      if (!signature) {
        return ContentService.createTextOutput("Missing signature").setMimeType(ContentService.MimeType.TEXT);
      }
      if (!verifyHmacSignature(jsonString, signature, WEBHOOK_SECRET)) {
        return ContentService.createTextOutput("Invalid signature").setMimeType(ContentService.MimeType.TEXT);
      }
    }

    // 1. Parse the incoming webhook data
    var payload = JSON.parse(jsonString);

    // ElevenLabs post-call webhook sends data in various formats depending on configuration
    // Handle both wrapped format (payload.data) and flat format
    var data = payload.data || payload;

    // 2. Extract Transcript
    var transcript = "";
    var conversationId = data.conversation_id || "Unknown ID";

    if (data.transcript && Array.isArray(data.transcript)) {
      transcript = data.transcript.map(function(item) {
        var role = item.role || "UNKNOWN";
        var message = item.message || "";
        return role.toUpperCase() + ": " + message;
      }).join("\n\n");
    } else if (typeof data.transcript === "string") {
      transcript = data.transcript;
    } else {
      transcript = "No transcript found in webhook payload";
    }

    // 3. Open Spreadsheet by ID (required for deployed web apps)
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var dataSheet = ss.getSheetByName("Data");
    var settingsSheet = ss.getSheetByName("Settings");

    // Verify required sheets exist
    if (!dataSheet) {
      throw new Error("Missing required sheet: 'Data'. Please create a sheet named 'Data' in your spreadsheet.");
    }
    if (!settingsSheet) {
      throw new Error("Missing required sheet: 'Settings'. Please create a sheet named 'Settings' in your spreadsheet.");
    }

    // Initialize headers if Data sheet is empty
    if (dataSheet.getLastRow() === 0) {
      dataSheet.appendRow(["Timestamp", "Call ID", "Transcript", "Gemini Feedback", "Raw JSON"]);
    }

    // 4. Get Settings from Settings sheet
    // Expected layout: A1="API Key", B1=[your key], A2="Prompt", B2=[your prompt]
    var apiKey = settingsSheet.getRange("B1").getValue();
    var systemPrompt = settingsSheet.getRange("B2").getValue();

    // 5. Call Gemini for feedback
    var feedback = "";
    if (!apiKey) {
      feedback = "Error: Missing Gemini API Key. Add your API key to Settings sheet cell B1.";
    } else if (transcript.length <= 10) {
      feedback = "Transcript too short for analysis.";
    } else if (!systemPrompt) {
      feedback = "Warning: No system prompt set in Settings B2. Using transcript only.";
      feedback = callGemini(apiKey, "", transcript);
    } else {
      feedback = callGemini(apiKey, systemPrompt, transcript);
    }

    // 6. Save to Data sheet
    dataSheet.appendRow([
      new Date(),
      conversationId,
      transcript,
      feedback,
      jsonString
    ]);

    // 7. Return success response
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);

  } catch (error) {
    // Log errors to the Data sheet for debugging
    try {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var sheet = ss.getSheetByName("Data");
      if (sheet) {
        sheet.appendRow([new Date(), "ERROR", error.toString(), "", e ? e.postData.contents : "No payload"]);
      }
    } catch (logError) {
      // Can't log to sheet - fail silently
      Logger.log("Failed to log error: " + logError.toString());
    }
    // Return 200 to prevent ElevenLabs from endlessly retrying
    return ContentService.createTextOutput("Error logged: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);

  } finally {
    lock.releaseLock();
  }
}

// ============================================
// HMAC SIGNATURE VERIFICATION
// ============================================
function verifyHmacSignature(payload, signature, secret) {
  try {
    var hmac = Utilities.computeHmacSha256Signature(payload, secret);
    var expectedSignature = Utilities.base64Encode(hmac);
    return signature === expectedSignature;
  } catch (e) {
    Logger.log("HMAC verification error: " + e.message);
    return false;
  }
}

// ============================================
// GEMINI API INTEGRATION
// ============================================
function callGemini(apiKey, systemPrompt, transcript) {
  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash-preview:generateContent?key=" + apiKey;

  // Build the prompt: system instructions + transcript
  var fullPrompt = "";
  if (systemPrompt && systemPrompt.trim().length > 0) {
    fullPrompt = systemPrompt + "\n\n### CALL TRANSCRIPT:\n" + transcript;
  } else {
    fullPrompt = "Please analyze the following conversation transcript:\n\n" + transcript;
  }

  var payload = {
    "contents": [{
      "parts": [{
        "text": fullPrompt
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
    var responseCode = response.getResponseCode();
    var json = JSON.parse(response.getContentText());

    if (responseCode !== 200) {
      if (json.error) {
        return "Gemini API Error (" + responseCode + "): " + json.error.message;
      }
      return "Gemini API Error: HTTP " + responseCode;
    }

    if (json.candidates && json.candidates.length > 0 && json.candidates[0].content) {
      return json.candidates[0].content.parts[0].text;
    } else if (json.promptFeedback && json.promptFeedback.blockReason) {
      return "Content blocked by Gemini: " + json.promptFeedback.blockReason;
    } else {
      return "No response generated. Check your prompt and transcript.";
    }
  } catch (e) {
    return "Gemini request failed: " + e.message;
  }
}

// ============================================
// SETUP & TESTING FUNCTIONS
// ============================================

/**
 * Run this function manually to test your setup before deploying.
 * Open the Apps Script editor, select this function, and click Run.
 */
function testSetup() {
  Logger.log("=== CivicsBot Setup Test ===\n");

  // 1. Check spreadsheet ID
  if (SPREADSHEET_ID === "YOUR_SPREADSHEET_ID_HERE") {
    Logger.log("❌ ERROR: You need to set your SPREADSHEET_ID at the top of the script.");
    Logger.log("   Open your Google Sheet and copy the ID from the URL.");
    return;
  }
  Logger.log("✓ Spreadsheet ID is configured");

  // 2. Try to open spreadsheet
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log("✓ Successfully opened spreadsheet: " + ss.getName());
  } catch (e) {
    Logger.log("❌ ERROR: Cannot open spreadsheet. Check your SPREADSHEET_ID.");
    Logger.log("   Error: " + e.message);
    return;
  }

  // 3. Check for required sheets
  var dataSheet = ss.getSheetByName("Data");
  var settingsSheet = ss.getSheetByName("Settings");

  if (!dataSheet) {
    Logger.log("❌ ERROR: Missing 'Data' sheet. Please create it.");
  } else {
    Logger.log("✓ 'Data' sheet found");
  }

  if (!settingsSheet) {
    Logger.log("❌ ERROR: Missing 'Settings' sheet. Please create it.");
    return;
  } else {
    Logger.log("✓ 'Settings' sheet found");
  }

  // 4. Check API key
  var apiKey = settingsSheet.getRange("B1").getValue();
  if (!apiKey) {
    Logger.log("❌ ERROR: No API key in Settings B1. Add your Gemini API key.");
  } else {
    Logger.log("✓ Gemini API key found (length: " + apiKey.length + " chars)");
  }

  // 5. Check prompt
  var systemPrompt = settingsSheet.getRange("B2").getValue();
  if (!systemPrompt) {
    Logger.log("⚠ WARNING: No system prompt in Settings B2. Add your feedback prompt.");
  } else {
    Logger.log("✓ System prompt found (length: " + systemPrompt.length + " chars)");
  }

  // 6. Test Gemini API
  if (apiKey) {
    Logger.log("\nTesting Gemini API connection...");
    var testResponse = callGemini(apiKey, "Say 'API connection successful!' and nothing else.", "Test");
    if (testResponse.indexOf("Error") === -1 && testResponse.indexOf("failed") === -1) {
      Logger.log("✓ Gemini API working: " + testResponse.substring(0, 50));
    } else {
      Logger.log("❌ Gemini API issue: " + testResponse);
    }
  }

  Logger.log("\n=== Setup Test Complete ===");
}

/**
 * Simulates an ElevenLabs webhook for testing purposes.
 * Run this manually to add a test entry to your spreadsheet.
 */
function testWebhook() {
  var mockPayload = {
    "data": {
      "conversation_id": "test-" + new Date().getTime(),
      "transcript": [
        { "role": "user", "message": "Hello, can you help me understand how a bill becomes a law?" },
        { "role": "agent", "message": "Of course! The process starts when a member of Congress introduces a bill..." },
        { "role": "user", "message": "What happens after it's introduced?" },
        { "role": "agent", "message": "The bill goes to a committee for review. They can approve, amend, or reject it." }
      ]
    }
  };

  var mockEvent = {
    postData: {
      contents: JSON.stringify(mockPayload)
    }
  };

  Logger.log("Sending test webhook...");
  var result = doPost(mockEvent);
  Logger.log("Result: " + result.getContent());
  Logger.log("Check your 'Data' sheet for the new entry!");
}
