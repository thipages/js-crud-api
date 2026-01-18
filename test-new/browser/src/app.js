/**
 * Application principale des tests navigateur
 */

import { parseLogFile } from '../../shared/log-parser.js';
import { TestRunner } from './test-runner.js';
import { TestReporter } from './test-reporter.js';

let testData = null;
let testRunner = null;
let currentFilter = 'all';

// Exposer currentFilter globalement pour le reporter
window.currentFilter = 'all';

/**
 * Charge les données de test depuis le fichier JSON bundlé
 */
async function loadTestData() {
  try {
    const response = await fetch('./test-data.json');
    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }
    testData = await response.json();
    console.log('✅ Tests chargés:', Object.keys(testData).length, 'fichiers');
    return testData;
  } catch (error) {
    console.error('❌ Erreur lors du chargement des tests:', error);
    alert('Impossible de charger les tests. Assurez-vous que test-data.json existe (lancez: npm run test:build)');
    throw error;
  }
}

/**
 * Remplit le sélecteur de suites de tests
 */
function populateTestSuiteSelector(data) {
  const select = document.getElementById('testSuite');
  select.innerHTML = '<option value="">-- Toutes les suites --</option>';
  
  // Regrouper par catégorie (001_records, 002_auth, etc.)
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
  
  // Ajouter les catégories
  for (const [category, files] of categories) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = `${category} (${files.length} tests)`;
    select.appendChild(option);
  }
  
  // Ajouter les tests individuels
  const individualGroup = document.createElement('optgroup');
  individualGroup.label = 'Tests individuels';
  for (const path of Object.keys(data)) {
    const option = document.createElement('option');
    option.value = path;
    option.textContent = path;
    individualGroup.appendChild(option);
  }
  select.appendChild(individualGroup);
}

/**
 * Récupère les tests à exécuter selon la sélection
 */
function getTestsToRun() {
  const selected = document.getElementById('testSuite').value;
  
  if (!selected) {
    // Tous les tests
    return Object.entries(testData);
  } else if (selected.includes('/')) {
    // Test individuel
    return [[selected, testData[selected]]];
  } else {
    // Catégorie
    return Object.entries(testData).filter(([path]) => path.startsWith(selected + '/'));
  }
}

/**
 * Lance les tests
 */
async function runTests() {
  console.log('▶️ runTests() appelée');
  const baseUrl = document.getElementById('baseUrl').value;
  const strictMode = document.getElementById('strictMode').checked;
  const logRequests = document.getElementById('logRequests').checked;
  
  if (!baseUrl) {
    alert('Veuillez entrer une URL de base');
    return;
  }
  
  const tests = getTestsToRun();
  
  if (tests.length === 0) {
    alert('Aucun test à exécuter');
    return;
  }

  console.log(`📋 ${tests.length} tests à exécuter`);

  // Reset automatique de la base avant les tests
  console.log('🔄 Reset automatique de la base de données...');
  try {
    await resetDatabaseSilent(baseUrl);
    console.log('✅ Base réinitialisée');
  } catch (error) {
    console.warn('⚠️ Reset DB échoué:', error.message);
    if (!confirm('Le reset de la DB a échoué. Continuer quand même ?')) {
      return;
    }
  }
  
  console.log('🚀 Démarrage des tests...');
  
  // Préparer l'interface
  document.getElementById('runTests').disabled = true;
  document.getElementById('runAllTests').disabled = true;
  document.getElementById('stopTests').disabled = false;
  document.getElementById('resultsContainer').innerHTML = '';
  
  // Créer le runner et le reporter
  const reporter = new TestReporter();
  testRunner = new TestRunner(baseUrl, { strictMode, logRequests }, reporter);
  
  try {
    await testRunner.runTests(tests);
  } catch (error) {
    console.error('Erreur lors de l\'exécution:', error);
    alert('Erreur: ' + error.message);
  } finally {
    document.getElementById('runTests').disabled = false;
    document.getElementById('runAllTests').disabled = false;
    document.getElementById('stopTests').disabled = true;
    testRunner = null;
  }
}

/**
 * Reset de la base de données (silencieux, pour auto-reset)
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
 * Reset de la base de données
 */
async function resetDatabase() {
  const baseUrl = document.getElementById('baseUrl').value;
  if (!baseUrl) {
    alert('Veuillez entrer une URL de base');
    return;
  }
  
  // Extraire le baseURL sans api.php
  const url = new URL(baseUrl);
  const resetUrl = url.origin + url.pathname.replace(/api\.php.*$/, 'reset-db.php');
  
  if (!confirm(`Voulez-vous vraiment réinitialiser la base de données?\n\nURL: ${resetUrl}`)) {
    return;
  }
  
  try {
    const btn = document.getElementById('resetDb');
    btn.disabled = true;
    btn.textContent = '⏳ Reset en cours...';
    
    await resetDatabaseSilent(baseUrl);
    
    console.log('Reset DB: success');
    alert('✅ Base de données réinitialisée avec succès');
  } catch (error) {
    console.error('Erreur reset DB:', error);
    alert('❌ Erreur lors du reset de la DB:\n' + error.message + '\n\nAssurez-vous que reset-db.php existe et est accessible.');
  } finally {
    const btn = document.getElementById('resetDb');
    btn.disabled = false;
    btn.textContent = '🔄 Reset DB';
  }
}

/**
 * Arrête les tests en cours
 */
function stopTests() {
  if (testRunner) {
    testRunner.stop();
  }
}

/**
 * Copie le contenu du textarea export
 */
function copyExport() {
  const textarea = document.getElementById('exportTextarea');
  if (!textarea.value) {
    return;
  }
  
  textarea.select();
  navigator.clipboard.writeText(textarea.value).catch(err => {
    console.error('Erreur copie:', err);
  });
}

/**
 * Gère les filtres de résultats
 */
function setupFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      window.currentFilter = currentFilter; // Exposer globalement
      applyFilter();
    });
  });
}

/**
 * Applique le filtre actuel
 */
function applyFilter() {
  const results = document.querySelectorAll('.test-result');
  console.log(`Filtre: ${currentFilter}, Résultats trouvés: ${results.length}`);
  
  let visibleCount = 0;
  results.forEach(result => {
    if (currentFilter === 'all') {
      result.style.display = '';
      visibleCount++;
    } else {
      const hasClass = result.classList.contains(currentFilter);
      result.style.display = hasClass ? '' : 'none';
      if (hasClass) visibleCount++;
      console.log(`Élément: classes=${result.className}, filter=${currentFilter}, visible=${hasClass}`);
    }
  });
  
  console.log(`${visibleCount} résultats visibles après filtre`);
}

/**
 * Sauvegarde la configuration dans localStorage
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
 * Charge la configuration depuis localStorage
 */
function loadConfig() {
  try {
    const config = JSON.parse(localStorage.getItem('jca-test-config'));
    if (config) {
      if (config.baseUrl) document.getElementById('baseUrl').value = config.baseUrl;
      document.getElementById('strictMode').checked = config.strictMode || false;
      document.getElementById('logRequests').checked = config.logRequests || false;
    }
  } catch (error) {
    // Ignorer les erreurs de parsing
  }
}

/**
 * Initialise l'application
 */
export async function initApp() {
  console.log('🚀 Initialisation de l\'application de tests...');
  
  // Charger la config sauvegardée
  loadConfig();
  
  // Sauvegarder la config à chaque modification
  document.getElementById('baseUrl').addEventListener('change', saveConfig);
  document.getElementById('strictMode').addEventListener('change', saveConfig);
  document.getElementById('logRequests').addEventListener('change', saveConfig);
  
  // Charger les données de test
  try {
    await loadTestData();
    populateTestSuiteSelector(testData);
  } catch (error) {
    return;
  }
  
  // Setup des event listeners
  document.getElementById('runTests').addEventListener('click', runTests);
  document.getElementById('runAllTests').addEventListener('click', () => {
    document.getElementById('testSuite').value = '';
    runTests();
  });
  document.getElementById('resetDb').addEventListener('click', resetDatabase);
  document.getElementById('stopTests').addEventListener('click', stopTests);
  document.getElementById('copyExport').addEventListener('click', copyExport);
  
  setupFilters();
  
  console.log('✅ Application prête!');
  
  // Auto-lancer les tests au chargement
  setTimeout(() => runTests(), 500);
}
