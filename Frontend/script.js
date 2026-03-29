document.addEventListener('DOMContentLoaded', () => {
  // --- 1. DOM Elements ---
  const form = document.getElementById('analyzer-form');
  const ticketInput = document.getElementById('ticket-input');
  const btnAnalyze = document.getElementById('btn-analyze');
  const resultsGrid = document.getElementById('results-grid');
  const resultsEmpty = document.getElementById('results-empty');
  
  const statRuns = document.getElementById('stat-runs');
  const statPriority = document.getElementById('stat-priority');
  const statSentiment = document.getElementById('stat-sentiment');
  
  const btnTheme = document.getElementById('btn-theme');
  const htmlDoc = document.documentElement;

  let runCount = 0;
  let priorityCounts = { High: 0, Medium: 0, Low: 0 };
  let chartInstance = null;

  // --- 2. Theme Toggling ---
  const currentTheme = localStorage.getItem('theme') || 'dark';
  htmlDoc.setAttribute('data-theme', currentTheme);

  btnTheme.addEventListener('click', () => {
    const isDark = htmlDoc.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    htmlDoc.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    document.getElementById('theme-label').textContent = newTheme === 'dark' ? 'Dark' : 'Light';
    document.getElementById('theme-icon').textContent = newTheme === 'dark' ? '🌙' : '☀️';
  });

  // --- 3. Chart Setup ---
  const ctx = document.getElementById('analytics-chart').getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Critical/High', 'Medium', 'Low'],
      datasets: [{ data: [0, 0, 0], backgroundColor: ['#ef4444', '#f59e0b', '#10b981'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#a1a1aa' } } } }
  });

  function updateChart(urgency) {
    if (urgency === 'Critical' || urgency === 'High') priorityCounts.High++;
    else if (urgency === 'Medium') priorityCounts.Medium++;
    else priorityCounts.Low++;
    chartInstance.data.datasets[0].data = [priorityCounts.High, priorityCounts.Medium, priorityCounts.Low];
    chartInstance.update();
  }

  // --- 4. The API Call ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = ticketInput.value.trim();
    if (!message) return;

    btnAnalyze.classList.add('is-loading');
    btnAnalyze.disabled = true;
    btnAnalyze.querySelector('span').textContent = 'Analyzing...';

    try {
      const response = await fetch('http://127.0.0.1:8000/api/analyze-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: "TKT-123", customer_name: "Customer", message: message })
      });

      if (!response.ok) throw new Error('Backend HTTP Error');
      
      const raw_data = await response.json();
      
      // Look here! This prints the AI's raw output to your browser console
      console.log("🔥 AI RAW OUTPUT:", raw_data); 
      
      renderResult(raw_data);

    } catch (error) {
      console.error("Frontend Crash:", error);
      alert('The AI responded, but the frontend could not read the data. Press F12 and check the Console!');
    } finally {
      btnAnalyze.classList.remove('is-loading');
      btnAnalyze.disabled = false;
      btnAnalyze.querySelector('span').textContent = 'Run analysis';
    }
  });

  // --- 5. Bulletproof Rendering ---
  function renderResult(raw_data) {
    if (resultsEmpty) resultsEmpty.remove();

    // BULLETPROOF FALLBACKS: If the 1B model uses the wrong name, we catch it safely!
    const data = {
        urgency: raw_data.urgency || raw_data.priority || 'Medium',
        sentiment: raw_data.sentiment || 'Neutral',
        category: raw_data.category || 'Support',
        escalate: raw_data.escalate === true || raw_data.escalate === 'true',
        suggested_response: raw_data.suggested_response || raw_data.response || 'No response generated.',
        reasoning: raw_data.reasoning || 'No reasoning provided.'
    };

    let cardClass = 'result-card--priority-low';
    let badgeClass = 'result-card__badge--low';
    if (data.urgency === 'Critical' || data.urgency === 'High') {
      cardClass = 'result-card--priority-high';
      badgeClass = 'result-card__badge--high';
    } else if (data.urgency === 'Medium') {
      cardClass = 'result-card--priority-medium';
      badgeClass = 'result-card__badge--medium';
    }

    const cardHTML = `
      <article class="result-card ${cardClass} result-card--wide" style="animation: page-enter 0.5s ease both;">
        <h3 class="result-card__label">Analysis Complete</h3>
        <p class="result-card__value"><strong>Category:</strong> ${data.category}</p>
        <p class="result-card__value"><strong>Escalate:</strong> ${data.escalate ? '⚠️ YES - Human Required' : '✅ NO'}</p>
        <p class="result-card__meta"><strong>Reasoning:</strong> ${data.reasoning}</p>
        <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
        <h3 class="result-card__label">Suggested AI Response</h3>
        <p class="result-card__value" style="font-style: italic;">"${data.suggested_response}"</p>
        <div style="display: flex; gap: 10px;">
            <span class="result-card__badge ${badgeClass}">Urgency: ${data.urgency}</span>
            <span class="result-card__badge" style="border: 1px solid #555;">Sentiment: ${data.sentiment}</span>
        </div>
      </article>
    `;

    resultsGrid.insertAdjacentHTML('afterbegin', cardHTML);

    runCount++;
    statRuns.textContent = runCount;
    statPriority.textContent = data.urgency;
    statPriority.setAttribute('data-priority', (data.urgency === 'Critical' || data.urgency === 'High') ? 'high' : data.urgency.toLowerCase());
    statSentiment.textContent = data.sentiment;

    updateChart(data.urgency);
    ticketInput.value = '';
  }
});