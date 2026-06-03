/**
 * Google Apps Script for Shramik Awas Portal
 * 
 * Instructions to set up:
 * 1. Open Google Sheets (https://sheets.google.com).
 * 2. Click on "Extensions" -> "Apps Script".
 * 3. Delete any code in the editor and paste this entire code.
 * 4. Save the project (e.g., name it "Shramik Awas Database").
 * 5. Click on "Deploy" (top right) -> "New deployment".
 * 6. Select "Web app" as the deployment type.
 * 7. Set "Execute as" to "Me (your-email@gmail.com)".
 * 8. Set "Who has access" to "Anyone" (This is crucial for the web form to access it).
 * 9. Click "Deploy". Authorize permissions when prompted.
 * 10. Copy the Web App URL (the URL ending in /exec) and paste it into the `App.tsx` config section.
 */

// Handle POST request from the web form
function doPost(e) {
  var corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  
  try {
    var stringData = e.postData.contents;
    var data = JSON.parse(stringData);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = data.sheetName || "Registrations";
    var sheet = ss.getSheetByName(sheetName);
    
    // Create sheet if it does not exist
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var headers = getHeadersForSheet(sheetName);
      sheet.appendRow(headers);
      
      // Styling headers
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#1e3a8a"); // Navy Blue
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }
    
    var rowData = [];
    if (sheetName === "Registrations") {
      rowData = [
        new Date(), // Timestamp
        data.registrationNum || "",
        data.date || "",
        data.fullName || "",
        data.fatherHusbandName || "",
        data.age || "",
        data.subCaste || "",
        data.aadhaarNum ? "'" + data.aadhaarNum : "", // Force string to avoid scientific notation
        data.rationCardNum ? "'" + data.rationCardNum : "",
        data.familyId ? "'" + data.familyId : "",
        data.mobileNum ? "'" + data.mobileNum : "",
        data.altMobileNum ? "'" + data.altMobileNum : "",
        data.permanentAddress || "",
        data.workType || "",
        data.totalFamilyMembers || "",
        
        // Members serialize
        data.member1_name || "", data.member1_age || "", data.member1_relation || "", data.member1_aadhaar ? "'" + data.member1_aadhaar : "",
        data.member2_name || "", data.member2_age || "", data.member2_relation || "", data.member2_aadhaar ? "'" + data.member2_aadhaar : "",
        data.member3_name || "", data.member3_age || "", data.member3_relation || "", data.member3_aadhaar ? "'" + data.member3_aadhaar : "",
        data.member4_name || "", data.member4_age || "", data.member4_relation || "", data.member4_aadhaar ? "'" + data.member4_aadhaar : "",
        data.member5_name || "", data.member5_age || "", data.member5_relation || "", data.member5_aadhaar ? "'" + data.member5_aadhaar : "",
        
        // Fees
        data.annualFee || "",
        data.monthlyRent || "",
        data.validFrom || "",
        data.validTo || "",
        
        // Documents (Boolean checkboxes represented as text)
        data.docAadhaar ? "Yes" : "No",
        data.docRationCard ? "Yes" : "No",
        data.docFamilyId ? "Yes" : "No",
        data.docPhoto ? "Yes" : "No",
        
        // Photo attachment Base64 payload (Optional, for small uploads)
        data.photoBase64 ? "Uploaded" : "None"
      ];
    } else if (sheetName === "Payments") {
      rowData = [
        new Date(), // Timestamp
        data.receiptNum || "",
        data.date || "",
        data.registrationNum || "",
        data.receiverName || "",
        data.registreeName || "",
        data.fatherHusbandName || "",
        data.annualFeePaid || 0,
        data.validityPeriod || "",
        data.monthlyRentPaid || 0,
        data.monthsRentFor || "",
        data.otherFeePaid || 0,
        data.totalAmount || 0,
        data.amountInWords || "",
        data.paymentMode || ""
      ];
    }
    
    sheet.appendRow(rowData);
    sheet.autoResizeColumns(1, rowData.length);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data successfully written to Google Sheet",
      row: sheet.getLastRow()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET request (Can be used to test or fetch simple stats)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var regSheet = ss.getSheetByName("Registrations") || { getLastRow: function() { return 1; } };
    var paySheet = ss.getSheetByName("Payments") || { getLastRow: function() { return 1; } };
    
    var stats = {
      status: "active",
      totalRegistrations: Math.max(0, regSheet.getLastRow() - 1),
      totalPayments: Math.max(0, paySheet.getLastRow() - 1)
    };
    
    return ContentService.createTextOutput(JSON.stringify(stats))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

// Preflight CORS request handling (Optional but safe for browser invokes)
function doOptions(e) {
  return ContentService.createTextOutput("")
                       .setMimeType(ContentService.MimeType.TEXT)
                       .setHeaders({
                         "Access-Control-Allow-Origin": "*",
                         "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                         "Access-Control-Allow-Headers": "Content-Type"
                       });
}

// Get standard headers for the sheet
function getHeadersForSheet(name) {
  if (name === "Registrations") {
    return [
      "Timestamp", "Registration Number", "Date of Registration", "Applicant Name", 
      "Father/Husband Name", "Age", "Sub-Caste (Upjati)", "Aadhaar Card Number", 
      "Ration Card Number", "Family ID", "Mobile Number", "Alternative Number", 
      "Permanent Address", "Type of Work", "Total Family Members",
      "M1 Name", "M1 Age", "M1 Relation", "M1 Aadhaar",
      "M2 Name", "M2 Age", "M2 Relation", "M2 Aadhaar",
      "M3 Name", "M3 Age", "M3 Relation", "M3 Aadhaar",
      "M4 Name", "M4 Age", "M4 Relation", "M4 Aadhaar",
      "M5 Name", "M5 Age", "M5 Relation", "M5 Aadhaar",
      "Annual Membership Fee", "Monthly Minimum Rent", "Validity Start", "Validity End",
      "Doc: Aadhaar Submitted", "Doc: Ration Card Submitted", "Doc: Family ID Submitted", "Doc: Photos Submitted",
      "Photo Uploaded"
    ];
  } else if (name === "Payments") {
    return [
      "Timestamp", "Receipt Number", "Receipt Date", "Registration Number", 
      "Receiver Name", "Payer (Registree) Name", "Father/Husband Name", 
      "Annual Membership Fee Paid", "Fee Validity Period", "Monthly Rent Paid", 
      "Rent Month(s)", "Other Fee Paid", "Total Amount", "Amount in Words", "Payment Mode"
    ];
  }
  return ["Timestamp", "Data"];
}
