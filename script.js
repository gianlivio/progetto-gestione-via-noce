// Attendiamo che il DOM sia completamente caricato
document.addEventListener('DOMContentLoaded', () => {
    // Inizializzazione di variabili e listener
    initializeApp();
    
    // Effetto parallasse sull'header
    window.addEventListener('scroll', handleParallaxEffect);
  });
  
  /**
   * Inizializza tutte le funzionalità dell'app
   */
  function initializeApp() {
    // Inizializza funzionalità di download
    setupDownload();
    
    // Inizializza funzionalità di upload
    setupUpload();
    
    // Abilita la modifica delle celle per il totale
    setupEditableCells();
  }
  
  /**
   * Configura la funzionalità di download dei dati
   */
  function setupDownload() {
    const downloadBtn = document.getElementById('downloadBtn');
    
    if (!downloadBtn) return;
    
    downloadBtn.addEventListener('click', () => {
      // Selezioniamo le righe della tabella (tbody)
      const rows = document.querySelectorAll('#calendario tbody tr');
      
      if (!rows.length) {
        showNotification('Nessun dato da scaricare nella tabella.', 'error');
        return;
      }
      
      let output = 'Mese;Attività;Tot\n'; // intestazione CSV
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        // Gestisco sia righe con celle normali che con rowspan
        if (cells.length >= 1) {
          // Ottieni il mese - controlla se c'è una cella visibile o prendi dall'attributo
          let mese = '';
          if (cells[0].innerText && cells[0].innerText.trim() !== '') {
            mese = cells[0].innerText.trim();
          } else {
            // Cerca la riga di intestazione del mese precedente
            let currentRow = row.previousElementSibling;
            while (currentRow) {
              const monthCell = currentRow.querySelector('td:first-child');
              if (monthCell && monthCell.rowSpan > 1 && monthCell.innerText.trim() !== '') {
                mese = monthCell.innerText.trim();
                break;
              }
              currentRow = currentRow.previousElementSibling;
            }
          }
          
          // Ottieni l'attività
          const attivita = cells.length > 1 ? cells[cells.length-2].innerText.trim() : '';
          
          // Ottieni il totale - o dalla cella visibile o dalla riga del mese
          let tot = '';
          if (cells.length > 1 && cells[cells.length-1].innerText) {
            tot = cells[cells.length-1].innerText.trim();
          } else {
            // Cerca la cella di totale nel rowspan
            let currentRow = row.previousElementSibling;
            while (currentRow) {
              const totCell = currentRow.querySelector('td:last-child');
              if (totCell && totCell.rowSpan > 1 && totCell.innerText.trim() !== '') {
                tot = totCell.innerText.trim();
                break;
              }
              currentRow = currentRow.previousElementSibling;
            }
          }
          
          if (mese && attivita) {
            output += `${mese};${attivita};${tot}\n`;
          }
        }
      });
      
      // Creiamo un blob di testo
      const blob = new Blob([output], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Creiamo un link "finto" per il download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'calendario_casa_via_della_noce.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification('Calendario scaricato con successo!', 'success');
    });
  }
  
  /**
   * Configura la funzionalità di upload dei dati
   */
  function setupUpload() {
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadBtn || !fileInput) return;
    
    uploadBtn.addEventListener('click', () => {
      fileInput.click(); // apre la finestra di selezione file
    });
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const content = ev.target.result;
          // Ogni riga => Mese;Attività;Tot
          const lines = content.split('\n').filter(l => l.trim().length > 0);
          // Saltiamo la riga di intestazione (lines[0]) se vogliamo
          const dataLines = lines.slice(1);
          
          if (!dataLines.length) {
            showNotification('Il file caricato non contiene dati validi.', 'error');
            return;
          }
          
          // Raggruppa le attività per mese
          const monthlyActivities = {};
          
          dataLines.forEach(line => {
            const parts = line.split(';');
            if (parts.length < 2) return; // riga non valida
            
            const mese = parts[0].trim();
            const attivita = parts[1].trim();
            const tot = parts[2] ? parts[2].trim() : '';
            
            if (!monthlyActivities[mese]) {
              monthlyActivities[mese] = {
                activities: [],
                total: tot
              };
            }
            
            // Aggiungi solo l'attività se non è vuota
            if (attivita) {
              monthlyActivities[mese].activities.push(attivita);
            }
            
            // Prendi l'ultimo valore del totale se ce n'è più di uno
            if (tot) {
              monthlyActivities[mese].total = tot;
            }
          });
          
          // Ricostruisci la tabella
          rebuildCalendarTable(monthlyActivities);
          
          showNotification('Tabella aggiornata dal file caricato!', 'success');
        } catch (error) {
          showNotification('Si è verificato un errore durante l\'elaborazione del file.', 'error');
          console.error('Errore di elaborazione:', error);
        }
      };
      
      reader.onerror = () => {
        showNotification('Errore nella lettura del file.', 'error');
      };
      
      reader.readAsText(file);
    });
  }
  
  /**
   * Ricostruisce la tabella del calendario con i dati caricati
   * @param {Object} monthlyActivities - Attività raggruppate per mese
   */
  function rebuildCalendarTable(monthlyActivities) {
    const tbody = document.querySelector('#calendario tbody');
    if (!tbody) return;
    
    tbody.innerHTML = ''; // Svuota le righe esistenti
    
    // Mesi nell'ordine corretto
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    
    months.forEach(month => {
      const monthData = monthlyActivities[month] || { activities: [], total: '' };
      const activities = monthData.activities;
      const total = monthData.total;
      
      // Determina quante righe servono per questo mese (almeno 4 o più se necessario)
      const rowCount = Math.max(4, activities.length);
      
      // Crea la prima riga del mese
      const firstRow = document.createElement('tr');
      firstRow.className = 'month-row';
      
      // Cella del mese con rowspan
      const monthCell = document.createElement('td');
      monthCell.textContent = month;
      monthCell.rowSpan = rowCount;
      firstRow.appendChild(monthCell);
      
      // Cella prima attività
      const firstActivityCell = document.createElement('td');
      firstActivityCell.textContent = activities[0] || '';
      firstRow.appendChild(firstActivityCell);
      
      // Cella totale con rowspan
      const totalCell = document.createElement('td');
      totalCell.textContent = total;
      totalCell.rowSpan = rowCount;
      totalCell.className = 'editable';
      firstRow.appendChild(totalCell);
      
      tbody.appendChild(firstRow);
      
      // Crea le righe rimanenti per il mese
      for (let i = 1; i < rowCount; i++) {
        const row = document.createElement('tr');
        
        const activityCell = document.createElement('td');
        activityCell.textContent = activities[i] || '';
        row.appendChild(activityCell);
        
        tbody.appendChild(row);
      }
    });
    
    // Reinizializza le celle editabili
    setupEditableCells();
  }
  
  /**
   * Abilita la modifica delle celle nella colonna totale
   */
  function setupEditableCells() {
    // Rendere la colonna "Tot" modificabile
    const totCells = document.querySelectorAll('#calendario tbody td.editable');
    
    totCells.forEach(cell => {
      cell.addEventListener('click', function() {
        if (this.hasAttribute('contenteditable')) return;
        
        this.setAttribute('contenteditable', 'true');
        this.focus();
        
        // Seleziona tutto il testo esistente
        const range = document.createRange();
        range.selectNodeContents(this);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        
        // Aggiunge una classe per lo stile quando in editing
        this.classList.add('editing');
      });
      
      cell.addEventListener('blur', function() {
        this.removeAttribute('contenteditable');
        this.classList.remove('editing');
      });
      
      cell.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.blur();
        }
      });
    });
  }
  
  /**
   * Gestisce l'effetto parallasse per l'header
   */
  function handleParallaxEffect() {
    const scrollPosition = window.scrollY;
    const hero = document.querySelector('.hero');
    
    if (hero && scrollPosition > 0) {
      const parallaxValue = scrollPosition * 0.3;
      hero.style.backgroundPosition = `center -${parallaxValue}px`;
    }
  }
  
  /**
   * Mostra una notifica all'utente
   * @param {string} message - Il messaggio da mostrare
   * @param {string} type - Il tipo di messaggio ('success', 'error', 'info')
   */
  function showNotification(message, type = 'info') {
    // Verifica se esiste già una notifica
    let notification = document.querySelector('.notification');
    
    // Se non esiste, creala
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'notification';
      document.body.appendChild(notification);
    }
    
    // Modifica il contenuto e lo stile in base al tipo
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Mostra la notifica
    notification.style.display = 'block';
    notification.style.opacity = '1';
    
    // Aggiungi regole CSS per la notifica se non sono già state definite
    const styleElement = document.getElementById('notificationStyles') || document.createElement('style');
    if (!document.getElementById('notificationStyles')) {
      styleElement.id = 'notificationStyles';
      styleElement.textContent = `
        .notification {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 15px 25px;
          border-radius: 6px;
          color: white;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000;
          transform: translateY(100px);
          opacity: 0;
          transition: all 0.3s ease;
        }
        
        .notification.success {
          background-color: #4caf50;
        }
        
        .notification.error {
          background-color: #f44336;
        }
        
        .notification.info {
          background-color: #2196f3;
        }
        
        .editable {
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .editable:hover {
          background-color: rgba(90, 138, 81, 0.1);
        }
        
        .editable.editing {
          background-color: rgba(90, 138, 81, 0.2);
          outline: 2px solid #5a8a51;
        }
      `;
      document.head.appendChild(styleElement);
    }
    
    // Animazione di entrata
    setTimeout(() => {
      notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Chiudi automaticamente dopo 3 secondi
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(100px)';
      
      // Rimuovi l'elemento dopo la transizione
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }