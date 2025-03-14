// incomingDepositsBadge.js

// (Optional) Remove the following sample data block if deposits are already initialized in incomingdeposits.js.
// if (!localStorage.getItem("incomingDeposits")) {
//   localStorage.setItem("incomingDeposits", JSON.stringify([
//     { id: 1, date: '2023-10-15', amount: 1500, fromAccount: '987654321', toUserId: 'UABC12345', viewed: false },
//     { id: 2, date: '2023-10-16', amount: 2500, fromAccount: '123123123', toUserId: 'UABC12345', viewed: false },
//     { id: 3, date: '2023-10-17', amount: 3000, fromAccount: '555666777', toUserId: 'UXYZ98765', viewed: false }
//   ]));
// }
  
// Reads localStorage and updates the "Incoming Deposits" badge.
function updateIncomingBadgeCount() {
  const user = JSON.parse(localStorage.getItem("user")) || { userId: "UABC12345" };
  let allDeposits = JSON.parse(localStorage.getItem("incomingDeposits")) || [];
  // Count only deposits for the current user that have not been viewed.
  const count = allDeposits.filter(d => d.toUserId === user.userId && !d.viewed).length;
  console.log("Badge count:", count); // Debug line
  const badgeEl = document.getElementById("incomingBadge");
  if (badgeEl) {
    badgeEl.textContent = count > 0 ? count : "";
  }
}
    
// Marks all deposits for the user as viewed and updates localStorage.
function markAllIncomingAsViewed() {
  const user = JSON.parse(localStorage.getItem("user")) || { userId: "UABC12345" };
  let allDeposits = JSON.parse(localStorage.getItem("incomingDeposits")) || [];
  allDeposits = allDeposits.map(d => {
    if (d.toUserId === user.userId) {
      d.viewed = true;
    }
    return d;
  });
  localStorage.setItem("incomingDeposits", JSON.stringify(allDeposits));
  updateIncomingBadgeCount();
}

// Expose the functions globally.
window.updateIncomingBadgeCount = updateIncomingBadgeCount;
window.markAllIncomingAsViewed = markAllIncomingAsViewed;
