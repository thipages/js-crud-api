/**
 * TestReporter - Displays test results in the interface
 */

export class TestReporter {
  constructor() {
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
  }

  /**
   * Starts a new test session
   */
  start(totalTests) {
    this.stats = { total: totalTests, passed: 0, failed: 0, skipped: 0 };
    this.updateStats();
    this.updateProgress(0, totalTests, 'Starting...');
  }

  /**
   * Reports the result of a test
   */
  reportTest(testName, result) {
    const container = document.getElementById('resultsContainer');

    // Remove "no results" message
    const noResults = container.querySelector('.no-results');
    if (noResults) {
      noResults.remove();
    }

    // Create the result element
    const resultEl = document.createElement('div');
    resultEl.className = `test-result ${result.status}`;
    console.log(`Adding result: ${testName}, status=${result.status}, classes=${resultEl.className}`);

    let content = `
      <div class="test-header">
        <div class="test-name">${this.escapeHtml(testName)}</div>
        <div class="test-status ${result.status}">${this.getStatusIcon(result.status)} ${result.status}</div>
      </div>
    `;

    if (result.details) {
      content += `<div class="test-details">${this.escapeHtml(result.details)}</div>`;
    }

    if (result.error) {
      content += `<div class="test-error">${this.escapeHtml(result.error)}</div>`;
    }

    if (result.diff) {
      content += `
        <div class="test-diff">
          <div class="diff-expected">
            <div class="diff-label">Expected:</div>
            <pre>${this.escapeHtml(JSON.stringify(result.diff.expected, null, 2))}</pre>
          </div>
          <div class="diff-actual">
            <div class="diff-label">Actual:</div>
            <pre>${this.escapeHtml(JSON.stringify(result.diff.actual, null, 2))}</pre>
          </div>
        </div>
      `;
    }

    resultEl.innerHTML = content;
    container.appendChild(resultEl);

    // Apply current filter if set
    if (window.currentFilter && window.currentFilter !== 'all') {
      if (!resultEl.classList.contains(window.currentFilter)) {
        resultEl.style.display = 'none';
      }
    }

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;

    // Update stats
    this.stats[result.status]++;
    this.updateStats();
  }

  /**
   * Updates the progress bar
   */
  updateProgress(current, total, message) {
    const percent = total > 0 ? (current / total) * 100 : 0;
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressText').textContent = message || `${current} / ${total}`;
  }

  /**
   * Updates the statistics
   */
  updateStats() {
    document.getElementById('totalTests').textContent = this.stats.total;
    document.getElementById('passedTests').textContent = this.stats.passed;
    document.getElementById('failedTests').textContent = this.stats.failed;
    document.getElementById('skippedTests').textContent = this.stats.skipped;
  }

  /**
   * Finishes the test session
   */
  finish() {
    const { total, passed, failed, skipped } = this.stats;
    const message = `Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}`;
    this.updateProgress(total, total, message);

    if (failed === 0 && passed > 0) {
      console.log('All tests passed!');
    }
    // Generate export
    this.generateExport();
  }

  /**
   * Generates exportable content
   */
  generateExport() {
    const { total, passed, failed, skipped } = this.stats;
    let content = `Stats:
${total} Total
${passed} Passed
${failed} Failed
${skipped} Skipped

`;

    // Add only failed tests
    const failedTests = document.querySelectorAll('.test-result.failed');
    if (failedTests.length > 0) {
      content += `Failed tests (${failedTests.length}):
${'='.repeat(50)}\n\n`;

      // Group by pattern
      const groups = {
        post_form: { name: 'POST form-encoded (_with_post)', tests: [] },
        query_params: { name: 'Query params (?page, ?order, ?filter, ?q, ?format)', tests: [] },
        batch: { name: 'Batch (multiple IDs)', tests: [] },
        auth: { name: 'Auth (002_auth/*)', tests: [] },
        columns: { name: 'Columns (003_columns/*)', tests: [] },
        other: { name: 'Other', tests: [] }
      };

      failedTests.forEach(test => {
        const name = test.querySelector('.test-name')?.textContent || 'Unknown';
        const details = test.querySelector('.test-details')?.textContent || '';
        const error = test.querySelector('.test-error')?.textContent || '';
        const diffExpected = test.querySelector('.diff-expected pre')?.textContent || '';
        const diffActual = test.querySelector('.diff-actual pre')?.textContent || '';

        const testInfo = { name, details, error, diffExpected, diffActual };

        // Classify
        if (name.includes('_with_post.log')) {
          groups.post_form.tests.push(testInfo);
        } else if (name.includes('002_auth/')) {
          groups.auth.tests.push(testInfo);
        } else if (name.includes('003_columns/')) {
          groups.columns.tests.push(testInfo);
        } else if (details.match(/posts\/\d+,\d+|comments\/\d+,\d+/)) {
          groups.batch.tests.push(testInfo);
        } else if (details.match(/\?(page|order|filter|q|size|format)/)) {
          groups.query_params.tests.push(testInfo);
        } else {
          groups.other.tests.push(testInfo);
        }
      });

      // Display each group
      for (const group of Object.values(groups)) {
        if (group.tests.length > 0) {
          content += `\n${group.name} (${group.tests.length}):\n${'='.repeat(50)}\n`;
          group.tests.forEach(test => {
            content += `\n${test.name}\n${test.details}\n`;
            if (test.error) {
              content += `${test.error}\n`;
            }
            if (test.diffExpected) {
              content += `Expected: ${test.diffExpected.substring(0, 200)}...\n`;
              content += `Actual: ${test.diffActual.substring(0, 200)}...\n`;
            }
          });
        }
      }
    } else {
      content += 'No failed tests!\n';
    }

    // Update the textarea
    const textarea = document.getElementById('exportTextarea');
    if (textarea) {
      textarea.value = content;
    }  }

  /**
   * Gets the icon for a status
   */
  getStatusIcon(status) {
    const icons = {
      passed: '✓',
      failed: '✗',
      skipped: '⊘'
    };
    return icons[status] || '?';
  }

  /**
   * Escapes HTML to prevent injections
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
