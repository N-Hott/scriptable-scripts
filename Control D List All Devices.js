// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: magic;

// Get the API key from Shortcuts input
const API_TOKEN = args.shortcutParameter;

if (!API_TOKEN) {
  throw new Error("No API key provided. Please pass an API key from Shortcuts.");
}

const API_BASE_URL = "https://api.controld.com";

function getTimestamp() {
  const now = new Date();
  const options = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return now.toLocaleString("en-US", options);
}

async function fetchDevices() {
  let req = new Request(`${API_BASE_URL}/devices`);
  req.headers = {
    "Authorization": `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  try {
    const response = await req.loadJSON();
    if (!response.success) {
      throw new Error(`Error fetching devices: ${response.error.message} (Code: ${response.error.code})`);
    }
    return response.body.devices;
  } catch (error) {
    console.error("Failed to fetch devices:", error.message);
    throw error;
  }
}

async function main() {
  const title = "Control D List All Devices";
  const timestamp = `Generated on ${getTimestamp()}`;

  let report = `${title}\n${timestamp}\n\n`;

  try {
    const devices = await fetchDevices();

    if (devices.length === 0) {
      report += "No devices found.\n";
    } else {
      devices.forEach(device => {
        const name = device.name;
        const pk = device.PK;

        report += `Device: ${name}\n`;
        report += `  PK: ${pk}\n`;

        if (device.clients) {
          report += "  Clients:\n";
          Object.entries(device.clients).forEach(([clientId, clientData]) => {
            const host = clientData.host || "Unknown Host";
            const mac = clientData.mac || "Unknown MAC";
            const vendor = clientData.vendor || "Unknown Vendor";

            report += `    Host: ${host}\n`;
            report += `      Client ID: ${clientId}\n`;
            report += `      MAC: ${mac}\n`;
            report += `      Vendor: ${vendor}\n`;
          });
        }
        report += "-".repeat(40) + "\n";
      });
    }
  } catch (error) {
    report += `Error occurred while fetching data:\n${error.message}\n`;
  }

  Script.setShortcutOutput(report);
  Script.complete();
}

main().then(report => {
  Script.setShortcutOutput(report);
  Script.complete();
}).catch(error => {
  const title = "Control D List All Devices";
  const timestamp = `Generated on ${getTimestamp()}`;
  const errorMessage = `${title}\n${timestamp}\n\nError:\n${error.message}`;
  Script.setShortcutOutput(errorMessage);
  Script.complete();
});