/**
 * Main application for browser tests
 */

import { parseLogFile } from '../../shared/log-parser.js';
import { TestRunner } from './test-runner.js';
import { TestReporter } from './test-reporter.js';

let testData = null;
let testRunner = null;
let currentFilter = 'all';

// Expose currentFilter globally for the reporter
window.currentFilter = 'all';

/**
 * Loads test data from the bundled JSON file
 */
async function loadTestData() {
  try {
    const response = await fetch('./test-data.json');
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    testData = await response.json();
    console.log('Tests loaded:', Object.keys(testData).length, 'files');
    return testData;
  } catch (error) {
    console.error('Error loading tests:', error);
    alert('Unable to load tests. Make sure test-data.json exists (run: npm run test:build)');
    throw error;
  }
}

/**
 * Populates the test suite selector
 */
function populateTestSuiteSelector(data) {
  const select = document.getElementById('testSuite');
  select.innerHTML = '<option value="">-- All suites --</option>';

  // Group by category (001_records, 002_auth, etc.)
  const categories = new Map();

  for (const path of Object.keys(data)) {
    const match = path.match(/^(\d+_\w+)\//);
    if (match) {
      const category = match[1];
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category).push(path);
    }
  }

  // Add categories
  for (const [category, files] of categories) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = `${category} (${files.length} tests)`;
    select.appendChild(option);
  }

  // Add individual tests
  const individualGroup = document.createElement('optgroup');
  individualGroup.label = 'Individual tests';
  for (const path of Object.keys(data)) {
    const option = document.createElement('option');
    option.value = path;
    option.textContent = path;
    individualGroup.appendChild(option);
  }
  select.appendChild(individualGroup);
}

/**
 * Gets the tests to run based on selection
 */
function getTestsToRun() {
  const selected = document.getElementById('testSuite').value;

  if (!selected) {
    // All tests
    return Object.entries(testData);
  } else if (selected.includes('/')) {
    // Individual test
    return [[selected, testData[selected]]];
  } else {
    // Category
    return Object.entries(testData).filter(([path]) => path.startsWith(selected + '/'));
  }
}

/**
 * Runs the tests
 */
async function runTests() {
  console.log('runTests() called');
  const baseUrl = document.getElementById('baseUrl').value;
  const strictMode = document.getElementById('strictMode').checked;
  const logRequests = document.getElementById('logRequests').checked;

  if (!baseUrl) {
    alert('Please enter a base URL');
    return;
  }

  const tests = getTestsToRun();

  if (tests.length === 0) {
    alert('No tests to run');
    return;
  }

  console.log(`${tests.length} tests to run`);

  // Auto-reset database before tests
  console.log('Auto-resetting database...');
  try {
    await resetDatabaseSilent(baseUrl);
    console.log('Database reset done');
  } catch (error) {
    console.warn('DB reset failed (ignored):', error.message);
  }

  console.log('Starting tests...');

  // Prepare the interface
  document.getElementById('runTests').disabled = true;
  document.getElementById('runAllTests').disabled = true;
  document.getElementById('stopTests').disabled = false;
  document.getElementById('resultsContainer').innerHTML = '';

  // Create runner and reporter
  const reporter = new TestReporter();
  testRunner = new TestRunner(baseUrl, { strictMode, logRequests }, reporter);

  try {
    await testRunner.runTests(tests);
  } catch (error) {
    console.error('Execution error:', error);
    alert('Error: ' + error.message);
  } finally {
    document.getElementById('runTests').disabled = false;
    document.getElementById('runAllTests').disabled = false;
    document.getElementById('stopTests').disabled = true;
    testRunner = null;
  }
}

/**
 * Silent database reset (for auto-reset)
 */
async function resetDatabaseSilent(baseUrl) {
  const url = new URL(baseUrl);
  const resetUrl = url.origin + url.pathname.replace(/api\.php.*$/, 'reset-db.php');

  const response = await fetch(resetUrl);
  if (!response.ok) {
    throw new Error(`Reset DB failed: ${response.status}`);
  }
}

/**
 * Database reset
 */
async function resetDatabase() {
  const baseUrl = document.getElementById('baseUrl').value;
  if (!baseUrl) {
    alert('Please enter a base URL');
    return;
  }

  // Extract the baseURL without api.php
  const url = new URL(baseUrl);
  const resetUrl = url.origin + url.pathname.replace(/api\.php.*$/, 'reset-db.php');

  if (!confirm(`Do you really want to reset the database?\n\nURL: ${resetUrl}`)) {
    return;
  }

  try {
    const btn = document.getElementById('resetDb');
    btn.disabled = true;
    btn.textContent = 'Resetting...';

    await resetDatabaseSilent(baseUrl);

    console.log('Reset DB: success');
    alert('Database reset successfully');
  } catch (error) {
    console.error('Reset DB error:', error);
    alert('DB reset error:\n' + error.message + '\n\nMake sure reset-db.php exists and is accessible.');
  } finally {
    const btn = document.getElementById('resetDb');
    btn.disabled = false;
    btn.textContent = 'Reset DB';
  }
}

/**
 * Stops running tests
 */
function stopTests() {
  if (testRunner) {
    testRunner.stop();
  }
}

/**
 * Copies the export textarea content
 */
function copyExport() {
  const textarea = document.getElementById('exportTextarea');
  if (!textarea.value) {
    return;
  }

  textarea.select();
  navigator.clipboard.writeText(textarea.value).catch(err => {
    console.error('Copy error:', err);
  });
}

/**
 * Sets up result filters
 */
function setupFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      window.currentFilter = currentFilter; // Expose globally
      applyFilter();
    });
  });
}

/**
 * Applies the current filter
 */
function applyFilter() {
  const results = document.querySelectorAll('.test-result');
  console.log(`Filter: ${currentFilter}, Results found: ${results.length}`);

  let visibleCount = 0;
  results.forEach(result => {
    if (currentFilter === 'all') {
      result.style.display = '';
      visibleCount++;
    } else {
      const hasClass = result.classList.contains(currentFilter);
      result.style.display = hasClass ? '' : 'none';
      if (hasClass) visibleCount++;
      console.log(`Element: classes=${result.className}, filter=${currentFilter}, visible=${hasClass}`);
    }
  });

  console.log(`${visibleCount} results visible after filter`);
}

/**
 * Saves configuration to localStorage
 */
function saveConfig() {
  const config = {
    baseUrl: document.getElementById('baseUrl').value,
    strictMode: document.getElementById('strictMode').checked,
    logRequests: document.getElementById('logRequests').checked,
  };
  localStorage.setItem('jca-test-config', JSON.stringify(config));
}

/**
 * Computes the default API URL from the page origin.
 * Same-origin avoids any CORS issues.
 */
function getDefaultBaseUrl() {
  return `${window.location.origin}/api.php`;
}

/**
 * Loads configuration from localStorage
 */
function loadConfig() {
  const defaultUrl = getDefaultBaseUrl();
  try {
    const config = JSON.parse(localStorage.getItem('jca-test-config'));
    if (config) {
      // Ignore saved cross-origin URLs (different port)
      // to avoid CORS errors
      const savedUrl = config.baseUrl || '';
      const isSameOrigin = savedUrl.startsWith(window.location.origin);
      document.getElementById('baseUrl').value = isSameOrigin ? savedUrl : defaultUrl;
      document.getElementById('strictMode').checked = config.strictMode || false;
      document.getElementById('logRequests').checked = config.logRequests || false;
      return;
    }
  } catch (error) {
    // Ignore parsing errors
  }
  document.getElementById('baseUrl').value = defaultUrl;
}

/**
 * Initializes the application
 */
export async function initApp() {
  console.log('Initializing test application...');

  // Load saved config
  loadConfig();

  // Save config on each change
  document.getElementById('baseUrl').addEventListener('change', saveConfig);
  document.getElementById('strictMode').addEventListener('change', saveConfig);
  document.getElementById('logRequests').addEventListener('change', saveConfig);

  // Load test data
  try {
    await loadTestData();
    populateTestSuiteSelector(testData);
  } catch (error) {
    return;
  }

  // Setup event listeners
  document.getElementById('runTests').addEventListener('click', runTests);
  document.getElementById('runAllTests').addEventListener('click', () => {
    document.getElementById('testSuite').value = '';
    runTests();
  });
  document.getElementById('resetDb').addEventListener('click', resetDatabase);
  document.getElementById('stopTests').addEventListener('click', stopTests);
  document.getElementById('copyExport').addEventListener('click', copyExport);

  setupFilters();

  console.log('Application ready');

  // Auto-run tests on load
  setTimeout(() => runTests(), 500);
}
