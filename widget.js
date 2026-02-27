/**
 * Grist Email Composer Pro Widget
 * Copyright 2026 Said Hamadou (isaytoo)
 * Licensed under the Apache License, Version 2.0
 * https://github.com/isaytoo/grist-email-composer-widget
 */

// =============================================================================
// STATE
// =============================================================================

let availableTables = [];
let selectedTableId = '';
let columns = [];
let records = [];
let selectedRecipients = new Set();
let emailColumn = '';
let nameColumn = '';

// =============================================================================
// TEMPLATES
// =============================================================================

const emailTemplates = {
  invitation: {
    subject: "Invitation - {{Evenement}}",
    body: `Bonjour {{Nom}},

Vous êtes cordialement invité(e) à participer à notre événement.

Date : [À compléter]
Lieu : [À compléter]

Nous espérons vous y voir nombreux.

Cordialement,
[Votre nom]`
  },
  rappel: {
    subject: "Rappel important",
    body: `Bonjour {{Nom}},

Nous vous rappelons que votre échéance approche.

Merci de prendre les dispositions nécessaires.

Cordialement,
[Votre nom]`
  },
  confirmation: {
    subject: "Confirmation de votre demande",
    body: `Bonjour {{Nom}},

Nous confirmons la bonne réception de votre demande.

Nous reviendrons vers vous dans les plus brefs délais.

Cordialement,
[Votre nom]`
  },
  remerciement: {
    subject: "Remerciements",
    body: `Bonjour {{Nom}},

Nous tenons à vous remercier pour votre confiance et votre collaboration.

À très bientôt.

Cordialement,
[Votre nom]`
  },
  notification: {
    subject: "Notification importante",
    body: `Bonjour {{Nom}},

Nous avons le plaisir de vous informer d'une mise à jour importante.

[Détails de la notification]

Cordialement,
[Votre nom]`
  }
};

// =============================================================================
// INITIALIZATION
// =============================================================================

grist.ready({ requiredAccess: 'full' });

document.addEventListener('DOMContentLoaded', function() {
  loadTables();
  loadSavedSettings();
});

// =============================================================================
// TABLE & DATA FUNCTIONS
// =============================================================================

async function loadTables() {
  try {
    var tables = await grist.docApi.listTables();
    availableTables = tables || [];
    
    var selector = document.getElementById('table-select');
    selector.innerHTML = '<option value="">-- Sélectionnez une table --</option>';
    
    availableTables.forEach(function(t) {
      var opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      selector.appendChild(opt);
    });
    
    // Restore saved table
    var savedTable = localStorage.getItem('emailComposerTable');
    if (savedTable && availableTables.includes(savedTable)) {
      selector.value = savedTable;
      selectTable(savedTable);
    }
    
    updateStatus('Tables chargées');
  } catch(e) {
    console.error('Error loading tables:', e);
    showToast('Erreur: ' + e.message, 'error');
  }
}

async function selectTable(tableId) {
  if (!tableId) {
    columns = [];
    records = [];
    selectedRecipients.clear();
    renderRecipients();
    renderVariables();
    document.getElementById('column-mapper').style.display = 'none';
    return;
  }
  
  selectedTableId = tableId;
  localStorage.setItem('emailComposerTable', tableId);
  
  try {
    var data = await grist.docApi.fetchTable(tableId);
    
    if (data && data.id) {
      // Extract columns
      columns = Object.keys(data).filter(function(k) {
        return k !== 'id' && k !== 'manualSort' && !k.startsWith('_');
      });
      
      // Convert to records array
      records = [];
      for (var i = 0; i < data.id.length; i++) {
        var rec = { id: data.id[i] };
        columns.forEach(function(col) {
          rec[col] = data[col] ? data[col][i] : null;
        });
        records.push(rec);
      }
      
      // Show column mapper
      document.getElementById('column-mapper').style.display = 'flex';
      populateColumnSelectors();
      renderVariables();
      
      // Auto-detect email column
      autoDetectColumns();
      
      updateStatus(records.length + ' enregistrements chargés');
    }
  } catch(e) {
    console.error('Error fetching table:', e);
    showToast('Erreur: ' + e.message, 'error');
  }
}

function populateColumnSelectors() {
  var emailSelect = document.getElementById('email-column');
  var nameSelect = document.getElementById('name-column');
  
  emailSelect.innerHTML = '<option value="">-- Colonne email --</option>';
  nameSelect.innerHTML = '<option value="">-- Colonne nom --</option>';
  
  columns.forEach(function(col) {
    var opt1 = document.createElement('option');
    opt1.value = col;
    opt1.textContent = col;
    emailSelect.appendChild(opt1);
    
    var opt2 = document.createElement('option');
    opt2.value = col;
    opt2.textContent = col;
    nameSelect.appendChild(opt2);
  });
  
  // Restore saved columns
  var savedEmail = localStorage.getItem('emailComposerEmailCol');
  var savedName = localStorage.getItem('emailComposerNameCol');
  
  if (savedEmail && columns.includes(savedEmail)) {
    emailSelect.value = savedEmail;
    emailColumn = savedEmail;
  }
  if (savedName && columns.includes(savedName)) {
    nameSelect.value = savedName;
    nameColumn = savedName;
  }
  
  emailSelect.onchange = function() {
    emailColumn = this.value;
    localStorage.setItem('emailComposerEmailCol', emailColumn);
    renderRecipients();
  };
  
  nameSelect.onchange = function() {
    nameColumn = this.value;
    localStorage.setItem('emailComposerNameCol', nameColumn);
    renderRecipients();
  };
  
  renderRecipients();
}

function autoDetectColumns() {
  // Auto-detect email column
  var emailCols = columns.filter(function(c) {
    var lower = c.toLowerCase();
    return lower.includes('email') || lower.includes('mail') || lower.includes('courriel');
  });
  
  if (emailCols.length > 0) {
    document.getElementById('email-column').value = emailCols[0];
    emailColumn = emailCols[0];
    localStorage.setItem('emailComposerEmailCol', emailColumn);
  }
  
  // Auto-detect name column
  var nameCols = columns.filter(function(c) {
    var lower = c.toLowerCase();
    return lower.includes('nom') || lower.includes('name') || lower.includes('prenom');
  });
  
  if (nameCols.length > 0) {
    document.getElementById('name-column').value = nameCols[0];
    nameColumn = nameCols[0];
    localStorage.setItem('emailComposerNameCol', nameColumn);
  }
  
  renderRecipients();
}

// =============================================================================
// RECIPIENTS RENDERING
// =============================================================================

function renderRecipients() {
  var container = document.getElementById('recipients-list');
  
  if (!emailColumn || records.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div>Sélectionnez une colonne email</div>
      </div>
    `;
    document.getElementById('recipient-count').textContent = '0';
    updateToTags();
    return;
  }
  
  // Filter records with valid emails
  var validRecords = records.filter(function(rec) {
    var email = rec[emailColumn];
    return email && isValidEmail(String(email).trim());
  });
  
  if (validRecords.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div>Aucun email valide trouvé</div>
      </div>
    `;
    document.getElementById('recipient-count').textContent = '0';
    updateToTags();
    return;
  }
  
  // Select all by default
  if (selectedRecipients.size === 0) {
    validRecords.forEach(function(rec) {
      selectedRecipients.add(rec.id);
    });
  }
  
  container.innerHTML = '';
  
  validRecords.forEach(function(rec) {
    var email = String(rec[emailColumn]).trim();
    var name = nameColumn && rec[nameColumn] ? String(rec[nameColumn]) : '';
    var initials = getInitials(name || email);
    var isSelected = selectedRecipients.has(rec.id);
    
    var div = document.createElement('div');
    div.className = 'recipient-item' + (isSelected ? ' selected' : '');
    div.innerHTML = `
      <input type="checkbox" class="recipient-checkbox" ${isSelected ? 'checked' : ''}>
      <div class="recipient-avatar">${initials}</div>
      <div class="recipient-info">
        <div class="recipient-name">${name || email}</div>
        <div class="recipient-email">${email}</div>
      </div>
    `;
    
    div.onclick = function(e) {
      if (e.target.type !== 'checkbox') {
        var checkbox = div.querySelector('.recipient-checkbox');
        checkbox.checked = !checkbox.checked;
      }
      
      if (div.querySelector('.recipient-checkbox').checked) {
        selectedRecipients.add(rec.id);
        div.classList.add('selected');
      } else {
        selectedRecipients.delete(rec.id);
        div.classList.remove('selected');
      }
      
      updateRecipientCount();
      updateToTags();
    };
    
    container.appendChild(div);
  });
  
  updateRecipientCount();
  updateToTags();
}

function updateRecipientCount() {
  document.getElementById('recipient-count').textContent = selectedRecipients.size;
}

function updateToTags() {
  var container = document.getElementById('to-tags');
  
  if (selectedRecipients.size === 0) {
    container.innerHTML = '<span style="color: var(--text-muted); font-size: 13px;">Les destinataires sélectionnés apparaîtront ici</span>';
    return;
  }
  
  var selectedEmails = records
    .filter(function(rec) { return selectedRecipients.has(rec.id); })
    .map(function(rec) { return String(rec[emailColumn]).trim(); })
    .filter(function(email) { return isValidEmail(email); });
  
  if (selectedEmails.length > 5) {
    container.innerHTML = `
      <span class="email-tag">${selectedEmails.length} destinataires sélectionnés</span>
    `;
  } else {
    container.innerHTML = selectedEmails.map(function(email) {
      return `<span class="email-tag">${email}</span>`;
    }).join('');
  }
}

function getInitials(str) {
  if (!str) return '?';
  var parts = str.split(/[\s@]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return str.substring(0, 2).toUpperCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// =============================================================================
// VARIABLES
// =============================================================================

function renderVariables() {
  var container = document.getElementById('variables-bar');
  
  if (columns.length === 0) {
    container.innerHTML = `
      <span class="variables-label">Variables disponibles :</span>
      <span style="color: var(--text-muted); font-size: 12px;">Sélectionnez une table pour voir les variables</span>
    `;
    return;
  }
  
  var html = '<span class="variables-label">Variables disponibles :</span>';
  columns.forEach(function(col) {
    html += `<span class="variable-chip" onclick="insertVariable('${col}')">{{${col}}}</span>`;
  });
  
  container.innerHTML = html;
}

function insertVariable(colName) {
  var textarea = document.getElementById('email-body');
  var start = textarea.selectionStart;
  var end = textarea.selectionEnd;
  var text = textarea.value;
  var variable = '{{' + colName + '}}';
  
  textarea.value = text.substring(0, start) + variable + text.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + variable.length;
  textarea.focus();
  
  showToast('Variable {{' + colName + '}} insérée', 'success');
}

// =============================================================================
// TEMPLATES
// =============================================================================

function toggleTemplates() {
  var panel = document.getElementById('templates-panel');
  panel.classList.toggle('hidden');
}

function applyTemplate(templateId) {
  var template = emailTemplates[templateId];
  if (!template) return;
  
  document.getElementById('subject').value = template.subject;
  document.getElementById('email-body').value = template.body;
  
  showToast('Template appliqué', 'success');
  toggleTemplates();
}

// =============================================================================
// EMAIL COMPOSITION
// =============================================================================

function composeEmail() {
  var fromEmail = document.getElementById('from-email').value.trim();
  var subject = document.getElementById('subject').value.trim();
  var body = document.getElementById('email-body').value.trim();
  
  // Validation
  if (!fromEmail || !isValidEmail(fromEmail)) {
    showToast('Veuillez entrer une adresse email valide dans "De"', 'error');
    return;
  }
  
  if (selectedRecipients.size === 0) {
    showToast('Veuillez sélectionner au moins un destinataire', 'error');
    return;
  }
  
  if (!subject) {
    showToast('Veuillez entrer un objet', 'error');
    return;
  }
  
  if (!body) {
    showToast('Veuillez entrer un message', 'error');
    return;
  }
  
  // Get selected emails
  var selectedEmails = records
    .filter(function(rec) { return selectedRecipients.has(rec.id); })
    .map(function(rec) { return String(rec[emailColumn]).trim(); })
    .filter(function(email) { return isValidEmail(email); });
  
  // Build mailto URL
  // Using BCC for privacy
  var mailtoUrl = 'mailto:' + fromEmail + 
    '?bcc=' + encodeURIComponent(selectedEmails.join(',')) +
    '&subject=' + encodeURIComponent(subject) +
    '&body=' + encodeURIComponent(body);
  
  // Open in parent window (to escape iframe)
  if (window.parent && window.parent !== window) {
    window.parent.open(mailtoUrl, '_blank');
  } else {
    window.open(mailtoUrl, '_blank');
  }
  
  showToast('✉️ Client email ouvert avec ' + selectedEmails.length + ' destinataires', 'success');
  updateStatus('Email composé pour ' + selectedEmails.length + ' destinataires');
}

// =============================================================================
// SETTINGS
// =============================================================================

function loadSavedSettings() {
  var savedFrom = localStorage.getItem('emailComposerFrom');
  if (savedFrom) {
    document.getElementById('from-email').value = savedFrom;
  }
  
  // Save from email on change
  document.getElementById('from-email').addEventListener('blur', function() {
    localStorage.setItem('emailComposerFrom', this.value);
  });
}

// =============================================================================
// UI HELPERS
// =============================================================================

function updateStatus(text) {
  document.getElementById('status-text').textContent = text;
}

function showToast(message, type) {
  type = type || 'info';
  var container = document.getElementById('toast-container');
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() {
      container.removeChild(toast);
    }, 300);
  }, 3000);
}
