window.initEmployees = function() {
  console.log("initEmployees called");

  //Globals
  let employeesUsers        = [];
  let employeesCards        = [];
  let employeesTransactions = [];
  let currentPage           = 1;    // for pagination
  const pageSize            = 15;   // 15 tx per page
  let selectedEmployeeId    = null; // <-- track which user is searched

  window.selectedStatusFilters = [];

  //Fetch & map data
  fetch("/api/employees")
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch employees data");
      return res.json();
    })
    .then(data => {
      const { users, wallets, transactions } = data;

      employeesUsers = users.map(u => ({
        id: u.accountId,
        firstName: u.firstName,
        lastName: u.lastName,
        gender: u.gender,
        dob: (u.dob || "").split("T")[0],
        email: u.email
      }));

      employeesCards = wallets.map(w => ({
        userId: w.accountId,
        cardNumber: w.cardNumber,
        cardHolderName: w.cardHolderName,
        cardType: w.cardType,
        expirationDate: w.expirationDate,
        cvv: w.cvv,
        balance: w.balance
      }));

      employeesTransactions = transactions.map(tx => {
        const isWithdrawal = tx.type && tx.type.toLowerCase().includes("withdraw");
        return {
          id: tx.id,
          userId: tx.accountId,
          fromAccountId: tx.fromAccountId || null,
          date: tx.date,
          createdAt: tx.createdAt,
          type: tx.type,
          amount: isWithdrawal ? -Math.abs(tx.amount) : Math.abs(tx.amount),
          cardNumber: tx.cardNumber,
          description: tx.description,
          status: tx.status
        };
      });

      // Initial UI render
      document.getElementById('total-users').textContent = employeesUsers.length;
      renderUserTable(employeesUsers);
      renderTransactionTable(employeesTransactions);
      updateFinancialStats(employeesTransactions, null, employeesCards);
      buildCardFilter(employeesTransactions, employeesCards);
      hideSelectedCard();
      showEmployeesExtras(true);
      setupStatusFilters();
      initSearchAndFilters();
    })
    .catch(err => console.error("Error loading employee data:", err));


  //Helpers
  function formatDateTime(tx) {
    const raw = tx.createdAt || tx.date;
    const d = new Date(raw);
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${Y}-${M}-${D} (at ${t})`;
  }

  function getTransactionDirection(tx) {
    const st = (tx.status || "").toLowerCase();
    if (st === "pending")  return "pending";
    if (st === "rejected") return "rejected";
    const lt = (tx.type || "").toLowerCase();
    if (lt === "deposit request")      return "outgoing";
    if (lt === "requested deposit")    return "incoming";
    if (lt === "requested withdrawal") return "outgoing";
    if (lt === "withdrawal request")   return "incoming";
    return tx.amount < 0 ? "outgoing" : "incoming";
  }

  // ——— renderTransactionTable with per-account filtering ———
  function renderTransactionTable(transactions) {
    const tbody = document.getElementById('transactionBody');
    if (!tbody) return;

    // First, if a specific employee is selected, filter to their side only:
    let txs = transactions;
    if (selectedEmployeeId) {
      txs = txs.filter(tx => {
        const lt = (tx.type || "").toLowerCase();
        const isPairType = [
          "deposit request",
          "requested deposit",
          "withdrawal request",
          "requested withdrawal"
        ].includes(lt);

        if (isPairType) {
          // for pair‐types, only that user’s record
          return tx.userId.toString() === selectedEmployeeId.toString();
        } else {
          // for all others, either side is fine
          return tx.userId.toString() === selectedEmployeeId.toString()
              || (tx.fromAccountId && tx.fromAccountId.toString() === selectedEmployeeId.toString());
        }
      });
    }

    // 1) Deduplicate by id
    const uniqueTx = txs.filter((tx, i, self) =>
      i === self.findIndex(t => t.id === tx.id)
    );

    // 2) Sort newest → oldest
    uniqueTx.sort((a, b) =>
      new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
    );

    // 3) Apply status/direction filters
    const filteredTx = uniqueTx.filter(tx => {
      const dir = getTransactionDirection(tx);
      const st  = (tx.status || "").toLowerCase();

      // incoming → only incoming + completed
      if (window.selectedStatusFilters.includes("incoming") && !(dir === "incoming" && st === "completed")) {
        return false;
      }
      // outgoing → only outgoing
      if (window.selectedStatusFilters.includes("outgoing") && dir !== "outgoing") {
        return false;
      }
      // any pure-status filters (pending/rejected)
      const others = window.selectedStatusFilters.filter(f => f !== "incoming" && f !== "outgoing");
      if (others.length > 0 && !others.includes(st)) {
        return false;
      }
      return true;
    });

    // 4) Pagination controls
    renderPaginationControls(filteredTx.length);

    // 5) Slice for current page
    const start  = (currentPage - 1) * pageSize;
    const pageTx = filteredTx.slice(start, start + pageSize);

    // 6) Build rows
    tbody.innerHTML = pageTx.map(tx => {
      const lt = (tx.type || "").toLowerCase();
      const ld = (tx.description || "").toLowerCase();
      const dir = getTransactionDirection(tx);
      const st  = (tx.status || "").toLowerCase();

      let typeString, isExpense;
      if (ld.includes("admin deposit") || lt.includes("admin deposit")) {
        typeString = "Admin Deposit";    isExpense = false;
      }
      else if (ld.includes("admin withdrawal") || lt.includes("admin withdrawal")) {
        typeString = "Admin Withdrawal"; isExpense = true;
      }
      else if (lt === "deposit request") {
        typeString = "Withdrawal";       isExpense = true;
      }
      else if (lt === "requested deposit") {
        typeString = "Deposit";          isExpense = false;
      }
      else if (lt === "requested withdrawal") {
        typeString = "Withdrawal";       isExpense = true;
      }
      else if (lt === "withdrawal request") {
        typeString = "Deposit";          isExpense = false;
      }
      else if (lt.includes("withdraw")) {
        typeString = "Withdrawal";       isExpense = true;
      }
      else {
        isExpense  = tx.amount < 0;
        typeString = isExpense ? "Withdrawal" : "Deposit";
      }

      const origin = (ld.includes("admin") || lt.includes("admin"))
                   ? "Admin"
                   : (tx.fromAccountId ? "Bank Users" : "Out of Bank Users");

      const rowClass    = isExpense ? 'row-expense' : 'row-income';
      const displayAmt  = `$${Math.abs(tx.amount).toLocaleString('en-US')}`;
      const dateTimeStr = formatDateTime(tx);
      const colorStyle  = isExpense ? 'style="color: #dc3545;"' : 'style="color: #28a745;"';
      const customDesc  = `<span ${colorStyle}>${origin} (${dir}) transaction "${st}"</span>`;

      return `
        <tr class="${rowClass}">
          <td>${dateTimeStr}</td>
          <td>${typeString}</td>
          <td>${displayAmt}</td>
          <td>${maskCardNumber(tx.cardNumber)}</td>
          <td>${customDesc}</td>
        </tr>
      `;
    }).join('');
  }

  //Pagination controls
  function renderPaginationControls(totalCount) {
    const c = document.getElementById('paginationContainer');
    if (!c) return;
    c.innerHTML = "";
    const totalPages = Math.ceil(totalCount / pageSize);
    if (totalPages <= 1) return;

    const prev = document.createElement("button");
    prev.textContent = "Previous";
    prev.disabled   = (currentPage === 1);
    prev.onclick    = () => {
      if (currentPage > 1) {
        currentPage--;
        renderTransactionTable(employeesTransactions);
      }
    };
    c.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      if (i === currentPage) {
        btn.disabled             = true;
        btn.style.backgroundColor = "#2563eb";
        btn.style.color           = "#fff";
      }
      btn.onclick = () => {
        currentPage = i;
        renderTransactionTable(employeesTransactions);
      };
      c.appendChild(btn);
    }

    const next = document.createElement("button");
    next.textContent = "Next";
    next.disabled    = (currentPage === totalPages);
    next.onclick     = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderTransactionTable(employeesTransactions);
      }
    };
    c.appendChild(next);
  }

  // Status‐filter buttons
  function setupStatusFilters() {
    const h = document.getElementById('transactionHistoryHeader');
    if (!h) return;
    h.innerHTML = `
      Transaction History
      <span class="status-filter check-button" data-filter="all">All</span>
      <span class="status-filter check-button" data-filter="incoming">Incoming</span>
      <span class="status-filter check-button" data-filter="outgoing">Outgoing</span>
      <span class="status-filter check-button" data-filter="pending">Pending</span>
      <span class="status-filter check-button" data-filter="rejected">Rejected</span>
    `;
    window.selectedStatusFilters = [];
    const fs = h.querySelectorAll('.status-filter');
    fs.forEach(el => el.addEventListener('click', () => {
      const f = el.dataset.filter;
      if (f === "all") {
        window.selectedStatusFilters = [];
        fs.forEach(x => x.classList.remove('active'));
        el.classList.add('active');
      } else {
        h.querySelector('[data-filter="all"]').classList.remove('active');
        const idx = window.selectedStatusFilters.indexOf(f);
        if (idx > -1) {
          window.selectedStatusFilters.splice(idx, 1);
          el.classList.remove('active');
        } else {
          window.selectedStatusFilters.push(f);
          el.classList.add('active');
        }
        if (window.selectedStatusFilters.length === 0) {
          h.querySelector('[data-filter="all"]').classList.add('active');
        }
      }
      renderTransactionTable(employeesTransactions);
    }));
    h.querySelector('[data-filter="all"]').classList.add('active');
  }

  //Search & card‐filter logic
  function initSearchAndFilters() {
    const ui = document.getElementById('userSearch');
    function isBankUserTx(tx) {
      const lt = (tx.type || "").toLowerCase();
      return [
        "deposit request",
        "requested deposit",
        "withdrawal request",
        "requested withdrawal"
      ].includes(lt);
    }

    if (ui) {
      ui.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '').slice(0, 9);
        const sv = this.value.trim();

        // reset selection if empty or invalid length
        if (sv === "" || sv.length !== 9) {
          selectedEmployeeId = null;
          renderUserTable(employeesUsers);
          updateFinancialStats(employeesTransactions, null, employeesCards);
          renderTransactionTable(employeesTransactions);
          buildCardFilter(employeesTransactions, employeesCards);
          hideSelectedCard();
          showEmployeesExtras(sv === "" ? true : false);
          return;
        }

        const user = employeesUsers.find(u => u.id.toString() === sv);
        if (!user) {
          selectedEmployeeId = null;
          renderUserTable([]);
          updateFinancialStats([], null, employeesCards);
          renderTransactionTable([]);
          buildCardFilter([], employeesCards);
          hideSelectedCard();
          showEmployeesExtras(false);
        } else {
          selectedEmployeeId = user.id;
          renderUserTable([user]);

          // per‑account filter exactly like admin.js
          const userTx = employeesTransactions.filter(tx => {
            if (isBankUserTx(tx)) {
              return tx.userId.toString() === user.id.toString();
            } else {
              return tx.userId.toString() === user.id.toString()
                  || (tx.fromAccountId && tx.fromAccountId.toString() === user.id.toString());
            }
          });

          const acctCards = employeesCards.filter(c => c.userId.toString() === user.id.toString());
          updateFinancialStats(userTx, user.id, acctCards);
          renderTransactionTable(userTx);
          buildCardFilter(userTx, employeesCards);
          hideSelectedCard();
          showEmployeesExtras(true);
        }
      });
    }

    const cf = document.getElementById('cardFilter');
    if (cf) {
      cf.addEventListener('change', function() {
        const sv = ui ? ui.value.trim() : "";
        let us = employeesUsers;
        let txs = employeesTransactions;
        let uid = null;

        if (sv.length === 9) {
          const user = employeesUsers.find(u => u.id.toString() === sv);
          if (!user) return;
          uid = user.id;
          us = [user];
          // only that user’s side of pairing
          txs = employeesTransactions.filter(tx => {
            if (isBankUserTx(tx)) {
              return tx.userId.toString() === uid.toString();
            } else {
              return tx.userId.toString() === uid.toString()
                  || (tx.fromAccountId && tx.fromAccountId.toString() === uid.toString());
            }
          });
        }

        if (this.value !== 'all') {
          txs = txs.filter(tx => tx.cardNumber === this.value);
        }

        renderUserTable(us);
        renderTransactionTable(txs);
        updateFinancialStats(txs, uid, employeesCards);

        if (txs.length === 0) {
          showEmployeesExtras(false);
          hideSelectedCard();
        } else {
          showEmployeesExtras(true);
          if (this.value === 'all') {
            hideSelectedCard();
          } else {
            const c = employeesCards.find(c => c.cardNumber === this.value);
            if (c) renderSelectedCard(c);
            else hideSelectedCard();
          }
        }
      });
    }
  }

  //The rest remains exactly as in your original file
  function renderUserTable(users) {
    const tb = document.getElementById('userTableBody');
    if (!tb) return;
    tb.innerHTML = users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.firstName}</td>
        <td>${u.lastName}</td>
        <td>${u.gender}</td>
        <td>${u.dob}</td>
        <td>${u.email}</td>
      </tr>
    `).join('');
  }

  function buildCardFilter(transactions, cards) {
    const sel = document.getElementById('cardFilter');
    if (!sel) return;
    const uniq = Array.from(new Set(transactions.map(tx => tx.cardNumber).filter(Boolean)));
    sel.innerHTML = `<option value="all">All Cards</option>`;
    uniq.forEach(cn => {
      const c = cards.find(x => x.cardNumber === cn);
      const lbl = c ? `${c.cardType} ${cn.slice(-4)}` : `Unknown ${cn.slice(-4)}`;
      sel.innerHTML += `<option value="${cn}">${lbl}</option>`;
    });
    sel.value = 'all';
  }

  function maskCardNumber(n) {
    return n ? n.match(/.{1,4}/g).join(' ') : "N/A";
  }

  function updateFinancialStats(trans, userId, cards) {
    const rel = userId
      ? cards.filter(c => c.userId.toString() === userId.toString())
      : cards;

    let visa = 0, master = 0, bal = 0, inc = 0, exp = 0;
    rel.forEach(c => {
      if (c.cardNumber.startsWith('4')) visa++;
      if (c.cardNumber.startsWith('5')) master++;
    });
    trans.forEach(tx => {
      if (tx.amount >= 0) { inc += tx.amount; bal += tx.amount; }
      else             { exp += Math.abs(tx.amount); bal += tx.amount; }
    });

    document.getElementById('visa-count').textContent     = visa;
    document.getElementById('master-count').textContent   = master;
    document.getElementById('total-balance').textContent  = `$${bal}`;
    document.getElementById('total-income').textContent   = `$${inc}`;
    document.getElementById('total-expenses').textContent = `$${exp}`;
  }

  function showEmployeesExtras(show) {
    const e = document.getElementById('employeesExtras');
    if (e) e.style.display = show ? 'block' : 'none';
  }

  function renderSelectedCard(card) {
    const sc   = document.getElementById('selectedCard');
    const info = document.getElementById('selectedCardInfo');
    if (!sc || !info) return;
    sc.style.display = 'block';
    info.innerHTML = `
      <p><strong>Card Type:</strong> ${card.cardType}</p>
      <p><strong>Cardholder:</strong> ${card.cardHolderName}</p>
      <p><strong>Number:</strong> ${maskCardNumber(card.cardNumber)}</p>
      <p><strong>Expires:</strong> ${card.expirationDate}</p>
      <p><strong>CVV:</strong> ${card.cvv}</p>
      <p><strong>Balance:</strong> $${card.balance}</p>
    `;
  }

  function hideSelectedCard() {
    const sc = document.getElementById('selectedCard');
    if (sc) sc.style.display = 'none';
  }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEmployees);
} else {
  initEmployees();
}
