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

 // Formats a transaction’s date/time into the format "YYYY-MM-DD (at hh:mm AM/PM)".
function formatDateTime(tx) {
  const raw = tx.createdAt || tx.date; 
  const dateObj = new Date(raw);

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  // 12-hour format with leading zero if needed and AM/PM marker
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  return `${year}-${month}-${day} (at ${timeStr})`;
}

function initSpendAnalysis() {
  console.log("initSpendAnalysis called");

  loadChartJs(function() {
    // 1) Get the logged-in user from sessionStorage
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (!user || !user.accountId) {
      console.error("No valid user found in sessionStorage.");
      return;
    }
    const accountId = user.accountId;
    console.log("User accountId:", accountId);

    // 2) Get DOM references for filters and transaction display
    const cardFilter = document.getElementById('cardFilter');
    const monthFilter = document.getElementById('monthFilter');
    const transactionBody = document.getElementById('transactionBody');

    // 3) Fetch wallets for the user to populate the card filter dropdown
    fetch(`/api/wallet?accountId=${accountId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch wallets");
        return res.json();
      })
      .then(wallets => {
        // Populate card filter dropdown
        cardFilter.innerHTML = '';
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Cards';
        cardFilter.appendChild(allOption);

        wallets.forEach(wallet => {
          const option = document.createElement('option');
          option.value = wallet.cardNumber; // using cardNumber as the identifier
          // The option displays card type and a masked number (last 4 digits)
          option.textContent = `${wallet.cardType} •••• ${wallet.cardNumber.slice(-4)}`;
          cardFilter.appendChild(option);
        });

        // Set default filter values
        cardFilter.value = 'all';
        monthFilter.value = '';

        // 4) Create the Chart.js line chart (spendingTrendChart)
        const trendCtx = document.getElementById('spendingTrendChart').getContext('2d');
        const spendingTrendChart = new Chart(trendCtx, {
          type: 'line',
          data: {
            labels: [],
            datasets: [
              {
                label: 'Daily Spending',
                data: [],
                borderColor: '#dc3545',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(220,53,69,0.1)'
              },
              {
                label: 'Daily Income',
                data: [],
                borderColor: '#28a745',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(40,167,69,0.1)'
              }
            ]
          },
          options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
          }
        });

        /*
          updateDisplay
          Fetches spend analysis data based on the current filter settings (selected card and month),
          updates the spending trend chart with daily income and spending,
          and updates the Transaction History table with completed transactions.
         */
        function updateDisplay() {
          const selectedCard = cardFilter.value; // "all" or specific cardNumber
          const selectedMonth = monthFilter.value; // e.g., "2025-03" or empty

          // Build the query URL for spend analysis data
          let url = `/api/spend-analysis?accountId=${accountId}`;
          if (selectedCard !== 'all') {
            url += `&cardNumber=${encodeURIComponent(selectedCard)}`;
          }
          if (selectedMonth) {
            url += `&month=${encodeURIComponent(selectedMonth)}`;
          }

          fetch(url)
            .then(res => res.json())
            .then(data => {
              // Use transactions from backend, filtering for only confirmed (completed) transactions
              let { transactions } = data;
              transactions = transactions.filter(tx =>
                tx.status && tx.status.toLowerCase() === 'completed'
              );

              // Sort transactions so that the newest appear at the top
              transactions.sort((a, b) => {
                const timeA = new Date(a.createdAt || a.date).getTime();
                const timeB = new Date(b.createdAt || b.date).getTime();
                return timeB - timeA;
              });

              // Recalculate daily sums from the filtered transactions
              const dailySpending = {};
              const dailyIncome = {};

              transactions.forEach(tx => {
  const date   = tx.date;
  const amount = parseFloat(tx.amount);
  const type   = tx.type.toLowerCase();

  if (type === 'deposit request') {
    dailySpending[date] = (dailySpending[date] || 0) + Math.abs(amount);

  } else if (type === 'requested deposit') {
    dailyIncome[date] = (dailyIncome[date] || 0) + Math.abs(amount);

  } else if (type === 'withdrawal request') {
    dailySpending[date] = (dailySpending[date] || 0) + Math.abs(amount);

  } else if (type === 'requested withdrawal') {
    dailySpending[date] = (dailySpending[date] || 0) + Math.abs(amount);

  } else if (type === 'withdrawal' || type === 'withdraw') {
    // ← catch your external withdrawals
    dailySpending[date] = (dailySpending[date] || 0) + Math.abs(amount);

  } else {
    // Fallback: use the sign of the amount
    if (amount < 0) {
      dailySpending[date] = (dailySpending[date] || 0) + Math.abs(amount);
    } else {
      dailyIncome[date] = (dailyIncome[date] || 0) + amount;
    }
  }
});


              // Create a sorted list of dates from both spending and income records
              const allDates = Array.from(new Set([...Object.keys(dailySpending), ...Object.keys(dailyIncome)]));
              allDates.sort((a, b) => new Date(a) - new Date(b));

              const spendingArray = allDates.map(date => dailySpending[date] || 0);
              const incomeArray = allDates.map(date => dailyIncome[date] || 0);

              // Update the spendingTrendChart with the recalculated data
              spendingTrendChart.data.labels = allDates;
              spendingTrendChart.data.datasets[0].data = spendingArray;
              spendingTrendChart.data.datasets[1].data = incomeArray;
              spendingTrendChart.update();

              transactionBody.innerHTML = transactions.map(tx => {
                const type      = (tx.type || '').toLowerCase();
                const descLower = (tx.description || '').toLowerCase();
              
                let isExpense, direction, origin;
              
                if (type === 'deposit request') {
                  // User2 paying → outgoing
                  isExpense = true;
                  direction = 'Outgoing';
                  origin    = 'Bank Users';
                } else if (type === 'requested deposit') {
                  // User1 receiving → incoming
                  isExpense = false;
                  direction = 'Incoming';
                  origin    = 'Bank Users';
                } else if (type === 'withdrawal request') {
                  // User2 receiving → incoming
                  isExpense = false;
                  direction = 'Incoming';
                  origin    = 'Bank Users';
                } else if (type === 'requested withdrawal') {
                  // User1 sending → outgoing
                  isExpense = true;
                  direction = 'Outgoing';
                  origin    = 'Bank Users';
                } else if (descLower.includes('admin deposit')) {
                  isExpense = false;
                  direction = 'Deposit';
                  origin    = 'Admin';
                } else if (descLower.includes('admin withdrawal')) {
                  isExpense = true;
                  direction = 'Withdrawal';
                  origin    = 'Admin';
                } else if (
                  type.includes('withdraw') ||
                  descLower.includes('external withdrawal')
                ) {
                  // EXTERNAL withdrawals → outgoing from user
                  isExpense = true;
                  direction = 'Outgoing';
                  origin    = 'Out of Bank Users';
                } else {
                  // fallback: sign + fromAccountId
                  isExpense = parseFloat(tx.amount) < 0;
                  direction = isExpense ? 'Outgoing' : 'Incoming';
                  origin    = tx.fromAccountId ? 'Bank Users' : 'Out of Bank Users';
                }
              
                const rowClass     = isExpense ? 'row-expense' : 'row-income';
                const displayAmt   = isExpense
                  ? `-$${Math.abs(tx.amount).toLocaleString()}`
                  : `$${Math.abs(tx.amount).toLocaleString()}`;
                const dateTimeStr  = formatDateTime(tx);
                const customDesc   = `${origin} (${direction}) transaction`;
              
                return `
                  <tr class="${rowClass}">
                    <td>${dateTimeStr}</td>
                    <td>${customDesc}</td>
                    <td>${displayAmt}</td>
                    <td>•••• ${tx.cardNumber ? tx.cardNumber.slice(-4) : 'N/A'}</td>
                  </tr>
                `;
              }).join('');                            
              
            })
            .catch(err => {
              console.error("Error fetching spend analysis data:", err);
            });
        }

        // Attach event listeners to the filters so that the display updates on change.
        cardFilter.addEventListener('change', updateDisplay);
        monthFilter.addEventListener('change', updateDisplay);

        // 6) Initial display update.
        updateDisplay();
      })
      .catch(err => {
        console.error("Error fetching wallets:", err);
      });
  });
}

// Attach initSpendAnalysis to the global window so it can be called from elsewhere.
window.initSpendAnalysis = initSpendAnalysis;