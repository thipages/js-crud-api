/**
 * TestReporter - Affiche les résultats des tests dans l'interface
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
   * Commence une nouvelle session de tests
   */
  start(totalTests) {
    this.stats = { total: totalTests, passed: 0, failed: 0, skipped: 0 };
    this.updateStats();
    this.updateProgress(0, totalTests, 'Démarrage...');
  }

  /**
   * Rapporte le résultat d'un test
   */
  reportTest(testName, result) {
    const container = document.getElementById('resultsContainer');
    
    // Supprimer le message "aucun résultat"
    const noResults = container.querySelector('.no-results');
    if (noResults) {
      noResults.remove();
    }

    // Créer l'élément de résultat
    const resultEl = document.createElement('div');
    resultEl.className = `test-result ${result.status}`;
    console.log(`Ajout résultat: ${testName}, status=${result.status}, classes=${resultEl.className}`);
    
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
            <div class="diff-label">✓ Attendu:</div>
            <pre>${this.escapeHtml(JSON.stringify(result.diff.expected, null, 2))}</pre>
          </div>
          <div class="diff-actual">
            <div class="diff-label">✗ Reçu:</div>
            <pre>${this.escapeHtml(JSON.stringify(result.diff.actual, null, 2))}</pre>
          </div>
        </div>
      `;
    }

    resultEl.innerHTML = content;
    container.appendChild(resultEl);

    // Appliquer le filtre actuel si défini
    if (window.currentFilter && window.currentFilter !== 'all') {
      if (!resultEl.classList.contains(window.currentFilter)) {
        resultEl.style.display = 'none';
      }
    }

    // Scroller vers le bas
    container.scrollTop = container.scrollHeight;

    // Mettre à jour les stats
    this.stats[result.status]++;
    this.updateStats();
  }

  /**
   * Met à jour la barre de progression
   */
  updateProgress(current, total, message) {
    const percent = total > 0 ? (current / total) * 100 : 0;
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressText').textContent = message || `${current} / ${total}`;
  }

  /**
   * Met à jour les statistiques
   */
  updateStats() {
    document.getElementById('totalTests').textContent = this.stats.total;
    document.getElementById('passedTests').textContent = this.stats.passed;
    document.getElementById('failedTests').textContent = this.stats.failed;
    document.getElementById('skippedTests').textContent = this.stats.skipped;
  }

  /**
   * Termine la session de tests
   */
  finish() {
    const { total, passed, failed, skipped } = this.stats;
    const message = `✓ ${passed} réussis, ✗ ${failed} échoués, ⊘ ${skipped} ignorés`;
    this.updateProgress(total, total, message);
    
    if (failed === 0 && passed > 0) {
      console.log('🎉 Tous les tests sont passés!');
    }
    // Générer l'export
    this.generateExport();
  }

  /**
   * Génère le contenu exportable pour Copilot
   */
  generateExport() {
    const { total, passed, failed, skipped } = this.stats;
    let content = `Stats:
${total} Total
${passed} Réussis
${failed} Échoués
${skipped} Ignorés

`;

    // Ajouter seulement les tests échoués
    const failedTests = document.querySelectorAll('.test-result.failed');
    if (failedTests.length > 0) {
      content += `Tests échoués (${failedTests.length}):
${'='.repeat(50)}\n\n`;
      
      // Grouper par pattern
      const groups = {
        post_form: { name: 'POST form-encoded (_with_post)', tests: [] },
        query_params: { name: 'Query params (?page, ?order, ?filter, ?q, ?format)', tests: [] },
        batch: { name: 'Batch (IDs multiples)', tests: [] },
        auth: { name: 'Auth (002_auth/*)', tests: [] },
        columns: { name: 'Columns (003_columns/*)', tests: [] },
        other: { name: 'Autres', tests: [] }
      };

      failedTests.forEach(test => {
        const name = test.querySelector('.test-name')?.textContent || 'Unknown';
        const details = test.querySelector('.test-details')?.textContent || '';
        const error = test.querySelector('.test-error')?.textContent || '';
        const diffExpected = test.querySelector('.diff-expected pre')?.textContent || '';
        const diffActual = test.querySelector('.diff-actual pre')?.textContent || '';

        const testInfo = { name, details, error, diffExpected, diffActual };

        // Classifier
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

      // Afficher chaque groupe
      for (const group of Object.values(groups)) {
        if (group.tests.length > 0) {
          content += `\n${group.name} (${group.tests.length}):\n${'='.repeat(50)}\n`;
          group.tests.forEach(test => {
            content += `\n${test.name}\n${test.details}\n`;
            if (test.error) {
              content += `${test.error}\n`;
            }
            if (test.diffExpected) {
              content += `✓ Attendu: ${test.diffExpected.substring(0, 200)}...\n`;
              content += `✗ Reçu: ${test.diffActual.substring(0, 200)}...\n`;
            }
          });
        }
      }
    } else {
      content += '✅ Aucun test échoué!\n';
    }

    // Mettre à jour le textarea
    const textarea = document.getElementById('exportTextarea');
    if (textarea) {
      textarea.value = content;
    }  }

  /**
   * Récupère l'icône pour un statut
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
   * Échappe le HTML pour éviter les injections
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
