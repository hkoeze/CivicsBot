# CivicsBot Setup Guide

A step-by-step guide to connecting your ElevenLabs voice agent to Google Sheets with automatic AI feedback.

---

## What You'll Need

- A Google account
- Your ElevenLabs voice agent (already set up)
- About 15-20 minutes

---

## Part 1: Create Your Google Spreadsheet

### Step 1.1: Create a new spreadsheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Click the **+ Blank** button to create a new spreadsheet
3. Click on "Untitled spreadsheet" at the top-left and rename it to something like **"CivicsBot Transcripts"**

### Step 1.2: Create the Settings sheet

Your new spreadsheet already has one sheet (look at the tab at the bottom - it probably says "Sheet1").

1. **Rename the first sheet:** Right-click on the "Sheet1" tab at the bottom and select **Rename**. Type `Settings` and press Enter.

2. **Set up the Settings sheet** with this layout:

   | | A | B |
   |---|---|---|
   | **1** | API Key | (leave empty for now) |
   | **2** | Prompt | (leave empty for now) |

   - Click cell **A1** and type: `API Key`
   - Click cell **A2** and type: `Prompt`
   - Leave B1 and B2 empty - we'll fill these in later

### Step 1.3: Create the Data sheet

1. Click the **+** button at the bottom-left (next to your Settings tab) to add a new sheet
2. Right-click on the new tab and select **Rename**. Type `Data` and press Enter.
3. You can leave this sheet empty - the script will automatically add headers when it runs

### Step 1.4: Copy your Spreadsheet ID

This is important! You need to tell the script which spreadsheet to use.

1. Look at your browser's address bar. You'll see a URL like this:
   ```
   https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789/edit
   ```

2. The **Spreadsheet ID** is the long string of letters and numbers between `/d/` and `/edit`. In the example above, it would be:
   ```
   1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789
   ```

3. **Select and copy this ID** (Ctrl+C on Windows, Cmd+C on Mac). You'll need it soon!

---

## Part 2: Get a Gemini API Key

The Gemini API is what analyzes your transcripts and generates feedback. You need an API key to use it.

### Step 2.1: Go to Google AI Studio

1. Open a new browser tab
2. Go to [aistudio.google.com](https://aistudio.google.com)
3. Sign in with your Google account if prompted

### Step 2.2: Create an API Key

1. Click on **Get API Key** in the left sidebar (or look for it in the top menu)
2. Click **Create API Key**
3. If asked, select a Google Cloud project or create a new one (just click through the prompts)
4. Your API key will appear - it looks something like: `AIzaSyB1234567890abcdefghijklmnop`
5. Click the **Copy** button to copy your API key

### Step 2.3: Add the API Key to your spreadsheet

1. Go back to your Google Spreadsheet
2. Click on the **Settings** tab at the bottom
3. Click on cell **B1** (next to "API Key")
4. Paste your API key (Ctrl+V or Cmd+V)

> **Keep this key private!** Don't share your spreadsheet with people who shouldn't have access to your API key.

---

## Part 3: Write Your Feedback Prompt

The prompt tells Gemini how to analyze each conversation. This goes in cell B2 of your Settings sheet.

### Step 3.1: Add your prompt

1. In your spreadsheet, make sure you're on the **Settings** tab
2. Click on cell **B2** (next to "Prompt")
3. Type or paste your feedback prompt

### Example prompts you can use:

**For a civics tutor:**
```
You are evaluating a civics tutoring conversation. Please analyze this transcript and provide:

1. ACCURACY: Were the facts presented correct? Note any errors.
2. CLARITY: Was the explanation easy to understand?
3. ENGAGEMENT: Did the tutor keep the student engaged?
4. AREAS FOR IMPROVEMENT: What could be done better?

Keep your feedback concise and constructive.
```

**For a customer service bot:**
```
Analyze this customer service conversation and rate it on:
- Problem Resolution: Was the customer's issue resolved?
- Tone: Was the agent polite and helpful?
- Efficiency: Was the conversation focused and productive?

Provide a brief summary and score out of 10.
```

**For a language learning assistant:**
```
Review this language learning conversation. Evaluate:
1. Did the tutor correct mistakes appropriately?
2. Was the difficulty level appropriate?
3. Was encouragement given?
Provide 2-3 specific suggestions for improvement.
```

---

## Part 4: Set Up Google Apps Script

Now we'll add the code that connects everything together.

### Step 4.1: Open Apps Script

1. In your Google Spreadsheet, click on **Extensions** in the top menu
2. Click on **Apps Script**
3. A new tab will open with the Apps Script editor

### Step 4.2: Clear the default code

You'll see some default code that looks like:
```javascript
function myFunction() {

}
```

1. Select ALL of this text (Ctrl+A or Cmd+A)
2. Delete it (press Delete or Backspace)

### Step 4.3: Paste the CivicsBot code

1. Copy the entire code from the `code.gs` file in this repository
2. Paste it into the Apps Script editor (Ctrl+V or Cmd+V)

### Step 4.4: Add your Spreadsheet ID

1. Look at the top of the code you just pasted. You'll see this line:
   ```javascript
   var SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";
   ```

2. Replace `YOUR_SPREADSHEET_ID_HERE` with the Spreadsheet ID you copied in Part 1, Step 1.4

3. Make sure to keep the quotation marks! It should look like:
   ```javascript
   var SPREADSHEET_ID = "1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789";
   ```

### Step 4.5: Save the project

1. Click **File** > **Save** (or press Ctrl+S / Cmd+S)
2. If prompted to name the project, call it something like "CivicsBot"

---

## Part 5: Test Your Setup

Before deploying, let's make sure everything is configured correctly.

### Step 5.1: Run the test function

1. In the Apps Script editor, look for the dropdown menu near the top that says **"Select function"** (it might show "doPost" or "myFunction")
2. Click the dropdown and select **testSetup**
3. Click the **Run** button (the play icon ▶)

### Step 5.2: Authorize the script

The first time you run the script, Google will ask for permission:

1. A popup will appear saying "Authorization required"
2. Click **Review permissions**
3. Select your Google account
4. You might see a warning saying "Google hasn't verified this app" - this is normal for personal scripts
   - Click **Advanced**
   - Click **Go to CivicsBot (unsafe)** - don't worry, this is your own code!
5. Click **Allow** to grant the necessary permissions

### Step 5.3: Check the test results

1. After the script runs, click **View** > **Logs** (or press Ctrl+Enter)
2. You should see output like:
   ```
   === CivicsBot Setup Test ===
   ✓ Spreadsheet ID is configured
   ✓ Successfully opened spreadsheet: CivicsBot Transcripts
   ✓ 'Data' sheet found
   ✓ 'Settings' sheet found
   ✓ Gemini API key found (length: 39 chars)
   ✓ System prompt found (length: 245 chars)

   Testing Gemini API connection...
   ✓ Gemini API working: API connection successful!

   === Setup Test Complete ===
   ```

3. If you see any ❌ errors, go back and fix the issue mentioned, then run the test again.

### Step 5.4: Run a test webhook (optional)

To see everything working end-to-end:

1. In the function dropdown, select **testWebhook**
2. Click **Run**
3. Go to your spreadsheet and check the **Data** tab - you should see a test entry!

---

## Part 6: Deploy as a Web App

Now we'll make your script accessible to ElevenLabs.

### Step 6.1: Create a deployment

1. In the Apps Script editor, click **Deploy** (blue button, top-right)
2. Click **New deployment**

### Step 6.2: Configure the deployment

1. Click the **gear icon** next to "Select type" and choose **Web app**

2. Fill in the settings:
   - **Description:** `CivicsBot v1` (or whatever you like)
   - **Execute as:** Select **Me** (your email address)
   - **Who has access:** Select **Anyone**

   > **Why "Anyone"?** This allows ElevenLabs servers to send data to your script. The script only accepts properly formatted webhook data.

3. Click **Deploy**

### Step 6.3: Copy your Web App URL

1. After deployment, you'll see a **Web app URL** that looks like:
   ```
   https://script.google.com/macros/s/AKfycbx1234567890abcdefg.../exec
   ```

2. Click the **Copy** button to copy this URL

3. **Save this URL somewhere!** You'll need it for the next step.

---

## Part 7: Connect to ElevenLabs

Finally, let's tell your voice agent to send transcripts to your new app.

### Step 7.1: Open your ElevenLabs agent settings

1. Go to [elevenlabs.io](https://elevenlabs.io) and sign in
2. Navigate to your voice agent
3. Find the **Webhook** or **Post-call webhook** settings (this might be under "Advanced" or "Integrations")

### Step 7.2: Configure the webhook

1. **Enable** the post-call webhook if it's not already enabled
2. In the **Webhook URL** field, paste the Web App URL you copied in Step 6.3
3. Make sure the webhook is set to trigger **after each call ends**
4. **Save** your changes

---

## Part 8: You're Done!

Your setup is complete. Here's what happens now:

1. Someone has a conversation with your ElevenLabs voice agent
2. When the call ends, ElevenLabs sends the transcript to your Google Apps Script
3. The script saves the transcript to your Google Sheet
4. The script sends the transcript to Gemini for analysis
5. Gemini's feedback is saved alongside the transcript

### Check your Data sheet

After a few calls, your **Data** sheet will look something like this:

| Timestamp | Call ID | Transcript | Gemini Feedback | Raw JSON |
|-----------|---------|------------|-----------------|----------|
| 1/15/2026 10:30 | conv_abc123 | USER: What is... | ACCURACY: The facts... | {"data":... |
| 1/15/2026 11:45 | conv_def456 | USER: Can you... | CLARITY: The explanation... | {"data":... |

---

## Troubleshooting

### "Error: Missing Gemini API Key"
- Go to your Settings sheet and make sure your API key is in cell **B1**

### "Missing required sheet: 'Data'" or "'Settings'"
- Check that your sheets are named exactly `Data` and `Settings` (case-sensitive!)

### Webhook not working / No new entries appearing
1. Check that your Web App URL is correctly pasted in ElevenLabs
2. Make sure you deployed as "Anyone" can access
3. Try running `testWebhook` in Apps Script to verify the script works

### "Gemini API Error: 400" or "403"
- Your API key might be invalid or expired
- Go to [aistudio.google.com](https://aistudio.google.com) and create a new API key

### Changes to code not taking effect
After editing your code, you need to create a **new deployment**:
1. Click **Deploy** > **Manage deployments**
2. Click the **pencil icon** to edit
3. Under "Version," select **New version**
4. Click **Deploy**

---

## Updating Your Prompt

You can change your feedback prompt anytime:

1. Open your Google Spreadsheet
2. Go to the **Settings** tab
3. Edit cell **B2** with your new prompt
4. That's it! The next transcript will use the new prompt.

No need to redeploy - the script reads the prompt fresh each time.

---

## Need Help?

If you run into issues:
1. Re-run the `testSetup` function and check the logs for error messages
2. Make sure all the sheet names and cell references match exactly
3. Double-check that your Spreadsheet ID is correct (no extra spaces!)

---

*Setup guide for CivicsBot - ElevenLabs Voice Transcript Pipeline*
