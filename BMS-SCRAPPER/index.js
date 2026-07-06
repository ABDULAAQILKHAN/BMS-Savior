import fs from 'fs';
import path from 'path';

// Configuration: Expanded targets covering the entire e-bike ecosystem
const TARGETS = [
  // BMS Protocols
  { category: 'BMS', owner: 'syssi', repo: 'esphome-jbd-bms', path: 'docs' },
  { category: 'BMS', owner: 'maland16', repo: 'daly-bms-uart', path: '' },
  { category: 'BMS', owner: 'syssi', repo: 'esphome-ant-bms', path: 'docs' },
  
  // Motor Controllers (VESC, KT, Bafang)
  // Note: vedderb/bldc is the official VESC firmware repo
  { category: 'Controller', owner: 'vedderb', repo: 'bldc', path: 'documentation' },
  { category: 'Controller', owner: 'stancecoke', repo: 'BMSBattery_S_controllers_firmware', path: '' },
  
  // Displays / HMI
  { category: 'Display', owner: 'OpenSourceEBike', repo: 'Color_LCD', path: '' },
  { category: 'Display', owner: 'danielnilsson9', repo: 'bafang-display-custom-firmware', path: '' },

  // BLE / UART modules and generic bridging
  { category: 'BLE', owner: 'jeelabs', repo: 'esp-link', path: 'docs' }
];

// Targeted file types
const FILE_EXTENSIONS = ['.pdf', '.md', '.txt'];

// Expanded keywords to catch motor and display terminology
const KEYWORDS = [
  'protocol', 'communication', 'uart', 'spec', 'bms', 
  'canbus', 'can', 'vesc', 'bafang', 'display', 'hmi', 
  'gatt', 'bluetooth', 'ble', 'payload', 'packet'
];

/**
 * Fetches the contents of a GitHub repository directory
 */
async function fetchRepoContents(owner, repo, dirPath = '') {
  // Construct the API URL. If dirPath is empty, it fetches the root.
  const urlPath = dirPath ? `/${dirPath}` : '';
  const url = `https://api.github.com/repos/${owner}/${repo}/contents${urlPath}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NodeJS-EBike-Doc-Scraper',
        // Highly recommended to uncomment and add your token if scraping this many repos
        // 'Authorization': 'token YOUR_GITHUB_PERSONAL_ACCESS_TOKEN'
      }
    });

    if (response.status === 403 || response.status === 429) {
      console.warn(`\nRate limit hit on ${owner}/${repo}. Consider using an Authorization token.`);
      return [];
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching paths for ${owner}/${repo}:`, error.message);
    return [];
  }
}

/**
 * Filters and downloads or logs the relevant files
 */
async function scanRepository({ category, owner, repo, path: startPath }) {
  console.log(`\nScanning [${category}] target: ${owner}/${repo}/${startPath || 'root'}...`);
  const items = await fetchRepoContents(owner, repo, startPath);

  if (!Array.isArray(items)) {
    console.log(`  -> No accessible directory items found for ${owner}/${repo}`);
    return;
  }

  let matchFound = false;

  for (const item of items) {
    if (item.type === 'file') {
      const fileNameLower = item.name.toLowerCase();
      const ext = path.extname(fileNameLower);

      // Check if file matches desired extensions and contains keywords
      const matchesExt = FILE_EXTENSIONS.includes(ext);
      const matchesKeyword = KEYWORDS.some(keyword => fileNameLower.includes(keyword));

      if (matchesExt && matchesKeyword) {
        matchFound = true;
        console.log(`\n  [SUCCESS] Found relevant ${category} document:`);
        console.log(`  File: ${item.name}`);
        console.log(`  URL:  ${item.download_url}`);
        
        // Uncomment below to actually download the files
        // await downloadFile(item.download_url, `${category}_${item.name}`);
      }
    }
  }

  if (!matchFound) {
    console.log(`  -> No matching protocol files found in this directory.`);
  }
}

/**
 * Helper function to download file locally if needed
 */
async function downloadFile(url, filename) {
  try {
    const res = await fetch(url);
    const fileStream = fs.createWriteStream(filename);
    await new Promise((resolve, reject) => {
      res.body.pipe(fileStream);
      res.body.on("error", reject);
      fileStream.on("finish", resolve);
    });
    console.log(`  -> Downloaded: ${filename}`);
  } catch (err) {
    console.error(`  -> Failed to download ${filename}:`, err.message);
  }
}

// Execution block
async function run() {
  console.log('Initiating E-Bike Architecture Document Scraper...');
  for (const target of TARGETS) {
    await scanRepository(target);
    // Add a small delay between repo scans to be polite to the GitHub API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\nFull scan complete.');
}

run();