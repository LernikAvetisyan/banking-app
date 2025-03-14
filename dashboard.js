window.initDashboard = function () {
  const dashboardCards = document.getElementById('dashboard-cards');
  if (!dashboardCards) {
    console.error("Dashboard cards container not found.");
    return;
  }

  // Retrieve wallets and transactions from localStorage.
  const wallets = JSON.parse(localStorage.getItem("wallets")) || [];
  const transactions = JSON.parse(localStorage.getItem("transactions")) || [];

  // Update Overall Balance
  const overallBalanceEl = document.getElementById('overall-balance');
  if (overallBalanceEl && typeof window.getOverallBalance === 'function') {
    overallBalanceEl.textContent = `$${window.getOverallBalance()}`;
  } else {
    console.error("Overall balance element not found or getOverallBalance() is not defined.");
  }

  // Clear the dashboard cards container
  dashboardCards.innerHTML = '';

  // Append cards in the desired order:
  // 1) Spending Breakdown (top-left)
  const spendingBreakdownCard = document.createElement('div');
  spendingBreakdownCard.className = 'card';
  spendingBreakdownCard.innerHTML = `
    <h3>Spending Breakdown</h3>
    <div class="dashboard-chart">
      <canvas id="miniPieChart"></canvas>
    </div>
  `;
  dashboardCards.appendChild(spendingBreakdownCard);

  // 2) Spending Trend (top-right)
  const spendingTrendCard = document.createElement('div');
  spendingTrendCard.className = 'card';
  spendingTrendCard.innerHTML = `
    <h3>Spending Trend</h3>
    <div class="dashboard-chart">
      <canvas id="miniLineChart"></canvas>
    </div>
  `;
  dashboardCards.appendChild(spendingTrendCard);

  // 3) Recent Activity (bottom row spanning both columns)
  const activityCard = document.createElement('div');
  activityCard.className = 'card';
  activityCard.innerHTML = `
    <h3>Recent Activity</h3>
    <ul class="activity-list" id="recent-activity">
      <li>No recent transactions.</li>
    </ul>
  `;
  dashboardCards.appendChild(activityCard);

  // Load Chart.js and initialize charts after ensuring it is loaded.
  loadChartJs(function () {
    initCharts();
  });

  // Update stats grid (Total Income, Total Expenses, Active Wallets)
  updateStatsGrid(wallets, transactions);

  // Update recent activity
  updateRecentActivity(transactions); 
}; 

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}

function loadChartJs(callback) {
  if (typeof Chart !== 'undefined') {
    callback();
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.defer = true;
    script.onload = callback;
    document.head.appendChild(script);
  }
}

/* Helper: Calculate monthly spending for the past N months.
   It sums only the negative transactions (expenses) and returns:
     - labels: array of month abbreviations (e.g., ["Feb", "Mar", ...])
     - data: corresponding spending totals for each month.
*/
function calculateMonthlySpending(transactions, monthsBack = 6) {
  const result = {};
  const now = new Date();
  const months = [];
  // Create an array of the past 'monthsBack' months (including current month)
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    // Use abbreviated month name (e.g., Feb)
    const label = d.toLocaleString('en-US', { month: 'short' });
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label });
    result[key] = 0;
  }
  // Sum expenses (absolute value of negative amounts) for each month.
  transactions.forEach(tx => {
    const d = new Date(tx.date);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (result.hasOwnProperty(key) && tx.amount < 0) {
      result[key] += Math.abs(tx.amount);
    }
  });
  const labels = months.map(m => m.label);
  const data = months.map(m => result[m.key]);
  return { labels, data };
}

function initCharts() {
  // --- Spending Breakdown Chart (Doughnut) for Total Income vs. Total Expenses ---
  const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
  let totalIncome = 0;
  let totalExpenses = 0;
  transactions.forEach(tx => {
    if (tx.amount > 0) totalIncome += tx.amount;
    else totalExpenses += Math.abs(tx.amount);
  });
  const pieCtx = document.getElementById('miniPieChart').getContext('2d');
  new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: ['Total Income', 'Total Expenses'],
      datasets: [{
        data: [totalIncome, totalExpenses],
        backgroundColor: ['#28a745', '#dc3545'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  // --- Spending Trend Chart (Line) based on monthly expenses ---
  const monthlyData = calculateMonthlySpending(transactions, 6);
  const lineCtx = document.getElementById('miniLineChart').getContext('2d');
  new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: monthlyData.labels,
      datasets: [{
        label: 'Monthly Spending',
        data: monthlyData.data,
        borderColor: '#007bff',
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(0,123,255,0.1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function updateStatsGrid(wallets, transactions) {
  if (document.getElementById('total-wallets')) {
    document.getElementById('total-wallets').textContent = wallets.length;
  }

  const totals = transactions.reduce((acc, tx) => {
    if (tx.amount > 0) {
      acc.income += tx.amount;
    } else {
      acc.expenses += Math.abs(tx.amount);
    }
    return acc;
  }, { income: 0, expenses: 0 });

  if (document.getElementById('total-income')) {
    document.getElementById('total-income').textContent = `$${totals.income.toLocaleString()}`;
  }
  if (document.getElementById('total-expenses')) {
    document.getElementById('total-expenses').textContent = `$${totals.expenses.toLocaleString()}`;
  }
}

function updateRecentActivity(transactions) {
  const activityList = document.getElementById('recent-activity');
  const recentTx = transactions.slice(-5).reverse();
  
  activityList.innerHTML = recentTx.length ? recentTx.map(tx => `
    <li class="activity-item">
      <div>
        <div class="activity-description">${tx.description}</div>
        <div class="activity-date">${tx.date}</div>
      </div>
      <div class="activity-amount ${tx.amount < 0 ? 'negative' : 'positive'}">
        $${Math.abs(tx.amount).toLocaleString()}
      </div>
    </li>
  `).join('') : `<li>No recent transactions.</li>`;
}

window.initDashboard = initDashboard;