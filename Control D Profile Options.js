// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: magic;

// Get the API key from Shortcuts input
const API_TOKEN = args.shortcutParameter;

if (!API_TOKEN) {
  throw new Error("No API key provided. Please pass an API key from Shortcuts.");
}

const API_BASE_URL = "https://api.controld.com";

async function fetchProfiles() {
  let req = new Request(`${API_BASE_URL}/profiles`);
  req.headers = { 
    "Authorization": `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  try {
    const response = await req.loadJSON();
    if (!response.success) {
      throw new Error(`Error fetching profiles: ${response.error.message} (Code: ${response.error.code})`);
    }
    return response.body.profiles;
  } catch (error) {
    console.error("Failed to fetch profiles:", error.message);
    throw error;
  }
}

async function fetchOptionMetadata() {
  let req = new Request(`${API_BASE_URL}/profiles/options`);
  req.headers = { 
    "Authorization": `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  try {
    const response = await req.loadJSON();
    if (!response.success) {
      throw new Error(`Error fetching options: ${response.error.message} (Code: ${response.error.code})`);
    }
    return response.body.options;
  } catch (error) {
    console.error("Failed to fetch options:", error.message);
    throw error;
  }
}

function mapTitlesToOptions(profileOptions, optionMetadata) {
  const predefinedOrder = [
    "ai_malware", // AI Malware Filter
    "safesearch", // Safe Search
    "safeyoutube", // Restricted Youtube
    "block_rfc1918", // DNS Rebind Protection
    "no_dnssec", // Disable DNSSEC
    "ttl_blck", // Block TTL
    "ttl_spff", // Redirect TTL
    "ttl_pass", // Bypass TTL
    "b_resp", // Block Response
    "spoof_ipv6", // Compatibility Mode
    "dns64" // Enable DNS64
  ];

  let mappedOptions = [];
  profileOptions.forEach(option => {
    const pk = option.PK;
    const value = option.value;

    const metadata = optionMetadata[pk];
    if (metadata) {
      let title = metadata.title;
      let displayValue;

      if (metadata.type === "dropdown") {
        displayValue = metadata.default_value[String(value)] || value;
      } else if (metadata.type === "toggle") {
        displayValue = value === 1 ? "Enabled" : "Disabled";
      } else if (metadata.type === "field") {
        displayValue = value;
      }

      // Only include if it's "Enabled" or has a non-default value
      if ((metadata.type === "toggle" && value === 1) || 
          (metadata.type !== "toggle" && value !== metadata.default_value)) {
        mappedOptions.push({ title, displayValue, pk });
      }
    }
  });

  // Sort options based on the predefined order
  mappedOptions.sort((a, b) => {
    const indexA = predefinedOrder.indexOf(a.pk);
    const indexB = predefinedOrder.indexOf(b.pk);

    // If not found in predefinedOrder, keep them at the end
    return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA) -
           (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB);
  });

  return mappedOptions;
}
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

async function main() {
  const title = "Control D Profile Options";
  const timestamp = `Generated on ${getTimestamp()}`;

  let report = `${title}\n${timestamp}\n\n`;

  try {
    const profiles = await fetchProfiles();
    const optionMetadata = {};
    const optionsResponse = await fetchOptionMetadata();
    optionsResponse.forEach(option => {
      optionMetadata[option.PK] = option;
    });

    profiles.forEach(profile => {
      const name = profile.name;
      const options = profile.profile.opt.data;
      const mappedOptions = mapTitlesToOptions(options, optionMetadata);

      report += `Profile: ${name}\n`;
      if (mappedOptions.length > 0) {
        report += "  Options:\n";
        mappedOptions.forEach(opt => {
          report += `    ${opt.title}: ${opt.displayValue}\n`;
        });
      } else {
        report += "  No options found.\n";
      }
      report += "-".repeat(40) + "\n";
    });

    if (profiles.length === 0) {
      report += "No profiles found.\n";
    }
  } catch (error) {
    // Append error details to the report
    report += `Error occurred while fetching data:\n${error.message}\n`;
  }

  return report;
}

main().then(report => {
  Script.setShortcutOutput(report);
  Script.complete();
}).catch(error => {
  const title = "Control D Profile Options";
  const timestamp = `Generated on ${getTimestamp()}`;
  const errorMessage = `${title}\n${timestamp}\n\nError:\n${error.message}`;
  Script.setShortcutOutput(errorMessage);
  Script.complete();
});