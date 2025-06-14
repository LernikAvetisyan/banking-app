// Global variables to store Chart.js instances so they can be destroyed before new charts are created.
window.pieChartInstance = null;
window.lineChartInstance = null;


window.initDashboard = function () {
  console.log("initDashboard called");

  // 1) Get the logged-in user from sessionStorage
  const user = JSON.parse(sessionStorage.getItem("user"));
  if (!user || !user.accountId) {
    console.error("No valid user found in sessionStorage.");
    return;
  }
  const accountId = user.accountId;

  // 2) DOM references
  const dashboardCards = document.getElementById('dashboard-cards');
  if (!dashboardCards) {
    console.error("Dashboard cards container not found.");
    return;
  }
  const overallBalanceEl = document.getElementById('overall-balance');

  // 3) Clear the dashboard container and create the layout
  dashboardCards.innerHTML = '';

  // Card: Spending Breakdown
  const spendingBreakdownCard = document.createElement('div');
  spendingBreakdownCard.className = 'card';
  spendingBreakdownCard.innerHTML = `
    <h3>Spending Breakdown</h3>
    <div class="dashboard-chart">
      <canvas id="miniPieChart"></canvas>
    </div>
  `;
  dashboardCards.appendChild(spendingBreakdownCard);

  // Card: Spending Trend
  const spendingTrendCard = document.createElement('div');
  spendingTrendCard.className = 'card';
  spendingTrendCard.innerHTML = `
    <h3>Spending Trend</h3>
    <div class="dashboard-chart">
      <canvas id="miniLineChart"></canvas>
    </div>
  `;
  dashboardCards.appendChild(spendingTrendCard);

  // Card: Recent Activity
  const activityCard = document.createElement('div');
  activityCard.className = 'card';
  activityCard.innerHTML = `
    <h3>Recent Activity</h3>
    <ul class="activity-list" id="recent-activity">
      <li>No recent transactions.</li>
    </ul>
  `;
  dashboardCards.appendChild(activityCard);

  // 4) Fetch real data from backend
  fetch(`/api/dashboard?accountId=${accountId}`)
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    })
    .then(data => {
      const { wallets, transactions } = data;
      if (!Array.isArray(wallets) || !Array.isArray(transactions)) {
        console.error("Invalid data structure from /api/dashboard");
        return;
      }

      // 4a) Calculate Overall Balance (sum of all wallet balances)
      const overallBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
      if (overallBalanceEl) {
        overallBalanceEl.textContent = `$${overallBalance.toLocaleString()}`;
      }

      // 4b) Update stats grid
      updateStatsGrid(wallets, transactions);

      // 4c) Update recent activity (newest first)
      updateRecentActivity(transactions);

      // 4d) Load Chart.js and initialize charts
      loadChartJs(() => {
        initCharts(transactions);
      });
    })
    .catch(err => {
      console.error("Error fetching dashboard data:", err);
    });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}

/*
  loadChartJs
  Ensures Chart.js is loaded on the page.
  If Chart.js is not defined, it creates a <script> element to load it from the CDN,
  then calls the provided callback once loading is complete.
 */
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

/*
  initCharts
  Initializes the dashboard charts using Chart.js:
   - Calculates total income and expenses from transactions.
   - Creates a doughnut chart (miniPieChart) for income vs. expenses.
   - Creates a line chart (miniLineChart) for monthly spending trends.
  
  Before each chart is created, it checks if an existing instance exists on the canvas,
  and if so, destroys it to prevent the "Canvas is already in use" error.
 */
function initCharts(transactions) {
  // Calculate total income and total expenses with special handling
  let totalIncome = 0;
  let totalExpenses = 0;
  transactions.forEach(tx => {
    const type = tx.type.toLowerCase();
    // For User 2: A "Deposit Request" means money sent out (expense)
    if (type === "deposit request") {
      totalExpenses += Math.abs(tx.amount);
    }
    // For User 2: A "Withdrawal Request" means money received (income)
    else if (type === "withdrawal request") {
      totalIncome += Math.abs(tx.amount);
    }
    // Otherwise, use the sign of the amount
    else {
      if (tx.amount >= 0) totalIncome += tx.amount;
      else totalExpenses += Math.abs(tx.amount);
    }
  });

  // 1) Spending Breakdown Chart (Doughnut)
  const pieCanvas = document.getElementById('miniPieChart');
  const pieCtx = pieCanvas.getContext('2d');
  // If an existing chart is present, destroy it first
  if (window.pieChartInstance) {
    window.pieChartInstance.destroy();
  }
  window.pieChartInstance = new Chart(pieCtx, {
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

  // 2) Spending Trend Chart (Line) for the past 6 months
  const monthlyData = calculateMonthlySpending(transactions, 6);
  const lineCanvas = document.getElementById('miniLineChart');
  const lineCtx = lineCanvas.getContext('2d');
  // Destroy existing chart instance if present
  if (window.lineChartInstance) {
    window.lineChartInstance.destroy();
  }
  window.lineChartInstance = new Chart(lineCtx, {
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
      scales: { y: { beginAtZero: true } }
    }
  });
}

/*
  calculateMonthlySpending
  Aggregates transaction data for the past `monthsBack` months.
  Sums only expense amounts (negative amounts from the transactions) as positive values,
  and returns an object containing:
   - labels: an array of month labels (e.g., "Jan", "Feb", …)
   - data: an array of the corresponding expense sums.
 */
function calculateMonthlySpending(transactions, monthsBack = 6) {
  const result = {};
  const now = new Date();
  const months = [];

  // Build an array of the past `monthsBack` months
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('en-US', { month: 'short' });
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label });
    result[key] = 0;
  }

  // Sum negative amounts (expenses) by month
  transactions.forEach(tx => {
    const d = new Date(tx.date);
    if (isNaN(d)) return;
    // For chart, consider only expenses (money out) as positive values
    const type = tx.type.toLowerCase();
    let amount = 0;
    if (type === "deposit request") {
      amount = Math.abs(tx.amount);
    } else if (tx.amount < 0) {
      amount = Math.abs(tx.amount);
    }
    if (amount === 0) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (result[key] !== undefined) {
      result[key] += amount;
    }
  });

  const labels = months.map(m => m.label);
  const data = months.map(m => result[m.key]);
  return { labels, data };
}

/*
  updateStatsGrid
  Updates the dashboard statistics grid with:
   - Total number of wallets.
   - Total income and total expenses.
  The function calculates totals from the provided wallets and transactions arrays.
 */
function updateStatsGrid(wallets, transactions) {
  const totalWalletsEl = document.getElementById('total-wallets');
  if (totalWalletsEl) {
    totalWalletsEl.textContent = wallets.length;
  }

  // Calculate totals with special handling for deposit and withdrawal requests.
  const totals = transactions.reduce((acc, tx) => {
    const type = tx.type.toLowerCase();
    if (type === "deposit request") {
      // Money sent out by User 2 is an expense.
      acc.expenses += Math.abs(tx.amount);
    } else if (type === "withdrawal request") {
      // Money received by User 2 is income.
      acc.income += Math.abs(tx.amount);
    } else {
      if (tx.amount >= 0) acc.income += tx.amount;
      else acc.expenses += Math.abs(tx.amount);
    }
    return acc;
  }, { income: 0, expenses: 0 });

  const totalIncomeEl = document.getElementById('total-income');
  if (totalIncomeEl) {
    totalIncomeEl.textContent = `$${totals.income.toLocaleString()}`;
  }

  const totalExpensesEl = document.getElementById('total-expenses');
  if (totalExpensesEl) {
    totalExpensesEl.textContent = `$${totals.expenses.toLocaleString()}`;
  }
}

/*
 * updateRecentActivity
   Updates the "Recent Activity" list on the dashboard.
   Sorts the transactions by date (using createdAt or date) in descending order
   and displays the five most recent transactions with a custom description.
 */
   function updateRecentActivity(transactions) {
    const activityList = document.getElementById('recent-activity');
    if (!activityList) return;
  
    // Sort transactions by createdAt (or date) in descending order
    const sorted = [...transactions].sort((a, b) =>
      new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
    );
    const recentTx = sorted.slice(0, 5);
  
    if (!recentTx.length) {
      activityList.innerHTML = `<li>No recent transactions.</li>`;
      return;
    }
  
    activityList.innerHTML = recentTx.map(tx => {
      const typeLC = (tx.type || "").toLowerCase();
      const desc    = (tx.description || "").toLowerCase();
  
      // Determine origin & direction
      let origin, direction;
      if (desc.includes("admin deposit")) {
        origin = "Admin";
        direction = "Deposit";
      } else if (desc.includes("admin withdrawal")) {
        origin = "Admin";
        direction = "Withdrawal";
      } else if (typeLC === "deposit request") {
        origin = "Bank Users";
        direction = "Outgoing";
      } else if (typeLC === "requested deposit") {
        origin = "Bank Users";
        direction = "Incoming";
      } else if (typeLC === "withdrawal request") {
        origin = "Bank Users";
        direction = "Incoming";
      } else if (typeLC === "requested withdrawal") {
        origin = "Bank Users";
        direction = "Outgoing";
      } else if (!tx.fromAccountId) {
        if (typeLC.includes("withdraw")) {
          origin = "Out of Bank Users";
          direction = "Outgoing";
        } else {
          origin = "Out of Bank Users";
          direction = "Incoming";
        }
      } else {
        origin = "Bank Users";
        direction = tx.amount < 0 ? "Outgoing" : "Incoming";
      }
  
      const customDesc = `${origin} (${direction}) transaction`;
  
      // New: Treat **any** Withdrawal—especially Admin Withdrawal—as red:
      const isRed = direction === "Outgoing"
                  || (origin === "Admin" && direction === "Withdrawal");
  
      const colorStyle = isRed
        ? 'style="color: #dc3545;"'
        : 'style="color: #28a745;"';
  
      // Format date & amount
      const dateStr = formatDashboardDate(tx);
      const amtStr  = `$${Math.abs(tx.amount).toLocaleString()}`;
  
      return `
        <li class="activity-item">
          <div>
            <div class="activity-description" ${colorStyle}>
              ${customDesc}
            </div>
            <div class="activity-date">${dateStr}</div>
          </div>
          <div class="activity-amount" ${colorStyle}>
            ${isRed ? '-' : ''}${amtStr}
          </div>
        </li>
      `;
    }).join('');
  }
  

/*
  formatDashboardDate
  Formats a transaction's date into a readable string in the format:
    "MM-DD-YYYY (at hh:mm AM/PM)" using the 'America/Los_Angeles' time zone.
  It uses tx.createdAt if available; otherwise, it falls back to tx.date.
 */
function formatDashboardDate(tx) {
  const raw = tx.createdAt ? tx.createdAt : tx.date;
  const dateObj = new Date(raw);
  const dateOptions = { month: '2-digit', day: '2-digit', year: 'numeric', timeZone: 'America/Los_Angeles' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles' };
  const dateStr = dateObj.toLocaleDateString('en-US', dateOptions);
  const timeStr = dateObj.toLocaleTimeString('en-US', timeOptions);
  return `${dateStr} (${timeStr})`;
}