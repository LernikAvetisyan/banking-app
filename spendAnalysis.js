// Function to load Chart.js if not already present
function loadChartJs(callback) {
  if (typeof Chart !== 'undefined') {
    callback();
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = callback;
    document.head.appendChild(script);
  }
}

function initSpendAnalysis() {
  console.log("initSpendAnalysis called");

  // 1) Load Chart.js first
  loadChartJs(function() {
    // 2) Read transactions/wallets from localStorage (no fallback data)
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    const wallets = JSON.parse(localStorage.getItem('wallets')) || [];

    // 3) DOM references
    const cardFilter = document.getElementById('cardFilter');
    const monthFilter = document.getElementById('monthFilter');
    const transactionBody = document.getElementById('transactionBody');

    // Populate card filter
    cardFilter.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Cards';
    cardFilter.appendChild(allOption);

    wallets.forEach(wallet => {
      const option = document.createElement('option');
      option.value = wallet.cardNumber;
      option.textContent = `${wallet.cardType} •••• ${wallet.cardNumber.slice(-4)}`;
      cardFilter.appendChild(option);
    });

    // --- Load previously saved filters ---
    const savedCard = localStorage.getItem('spendAnalysisSelectedCard') || 'all';
    const savedMonth = localStorage.getItem('spendAnalysisSelectedMonth') || '';
    cardFilter.value = savedCard;
    monthFilter.value = savedMonth;

    // 4) Create the line chart with 2 datasets: Daily Spending & Daily Income
    const trendCtx = document.getElementById('spendingTrendChart').getContext('2d');
    const spendingTrendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: [], // We'll fill these in updateDisplay()
        datasets: [
          {
            label: 'Daily Spending',
            data: [],
            borderColor: '#dc3545',         // Red line for spending
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(220,53,69,0.1)'
          },
          {
            label: 'Daily Income',
            data: [],
            borderColor: '#28a745',         // Green line for income
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(40,167,69,0.1)'
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    // 5) Filter event listeners – Save selections on change
    cardFilter.addEventListener('change', () => {
      localStorage.setItem('spendAnalysisSelectedCard', cardFilter.value);
      updateDisplay();
    });
    monthFilter.addEventListener('change', () => {
      localStorage.setItem('spendAnalysisSelectedMonth', monthFilter.value);
      updateDisplay();
    });

    // 6) Initial display
    updateDisplay();

    function updateDisplay() {
      const selectedCard = cardFilter.value;
      const selectedMonth = monthFilter.value;
    
      // Filter transactions
      const filteredTx = transactions.filter(tx => {
        const matchesCard = (selectedCard === 'all') || (tx.cardNumber === selectedCard);
        const matchesMonth = (!selectedMonth) || tx.date.startsWith(selectedMonth);
        return matchesCard && matchesMonth;
      });
    
      // Build rows for Transaction History
      transactionBody.innerHTML = filteredTx.map(tx => {
        // Decide if it's income or expense for full-row coloring
        const rowClass = tx.amount < 0 ? 'row-expense' : 'row-income';
    
        return `
          <tr class="${rowClass}">
            <td>${tx.date}</td>
            <td>${tx.description}</td>
            <td>${tx.category || ''}</td>
            <td>$${Math.abs(tx.amount).toLocaleString()}</td>
            <td>•••• ${tx.cardNumber.slice(-4)}</td>
          </tr>
        `;
      }).join('');
    
      // 7) Build daily spending & daily income for the line chart
      const dailySpending = {};  // negative amounts
      const dailyIncome = {};    // positive amounts

      filteredTx.forEach(tx => {
        if (!tx.date) return;
        if (tx.amount < 0) {
          dailySpending[tx.date] = (dailySpending[tx.date] || 0) + Math.abs(tx.amount);
        } else {
          dailyIncome[tx.date] = (dailyIncome[tx.date] || 0) + tx.amount;
        }
      });

      // Combine all dates and sort them
      const allDates = new Set([...Object.keys(dailySpending), ...Object.keys(dailyIncome)]);
      const sortedDates = Array.from(allDates).sort();

      // Create data arrays for each line
      const spendingData = sortedDates.map(date => dailySpending[date] || 0);
      const incomeData = sortedDates.map(date => dailyIncome[date] || 0);

      // Update the chart labels & data
      spendingTrendChart.data.labels = sortedDates;
      spendingTrendChart.data.datasets[0].data = spendingData; // Daily Spending
      spendingTrendChart.data.datasets[1].data = incomeData;     // Daily Income
      spendingTrendChart.update();
    }
  });
}

// Attach to window so other scripts can call initSpendAnalysis
window.initSpendAnalysis = initSpendAnalysis;
