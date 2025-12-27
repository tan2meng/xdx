/**
 * Debt Tracker App Logic
 */

const STORAGE_KEY = 'debtTrackerData';

// Utility for generating IDs
const uuid = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Utility for currency formatting
const formatMoney = (amount) => {
    return '￥' + Number(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// --- Time & Interest Calculation Helper ---
const calculateLoanDetails = (loan) => {
    const now = new Date();
    const loanDate = new Date(loan.date);
    const termMonths = Number(loan.term) || 0;

    // Calculate Due Date
    const dueDate = new Date(loanDate);
    dueDate.setMonth(dueDate.getMonth() + termMonths);

    // Time diffs
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysElapsed = Math.max(0, (now - loanDate) / msPerDay);
    const daysOverdue = (now - dueDate) / msPerDay;

    // Status Logic
    let calculatedStatus = 'active';
    let isOverdue = false;

    const paidAmount = Number(loan.paidAmount) || 0;
    const isPaid = paidAmount >= loan.amount;

    if (isPaid) {
        calculatedStatus = 'paid';
    } else if (daysOverdue > 0) {
        calculatedStatus = 'overdue';
        isOverdue = true;
    }

    // Interest Calculation (Simple Interest: Principal * Rate * Time(years))
    // Rate is treated as Annual Rate (%)
    const rate = Number(loan.rate) || 0;
    const accumulatedInterest = loan.amount * (rate / 100) * (daysElapsed / 365);

    // For paid loans, we ideally shouldn't keep accruing, but without a "paidDate", 
    // we'll just cap it at term length or show 0? 
    // Let's just show accrued interest for ACTIVE/OVERDUE loans. 
    // For PAID, maybe just assume full term interest? 
    // User request focused on "generated interest", likely for current debt.
    // We will return accruedInterest regardless, consumer decides how to use.

    return {
        dueDate,
        isOverdue,
        daysOverdue: Math.floor(daysOverdue),
        calculatedStatus,
        accumulatedInterest
    };
};

// Default State
const defaultState = {
    income: 0,
    platforms: []
};

// Application Object
const app = {
    data: { ...defaultState },
    currentPlatformId: null,
    editingLoanId: null,

    init() {
        this.loadData();
        this.render();
    },

    loadData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            this.data = JSON.parse(stored);
        }
        // Initialize inputs
        document.getElementById('monthly-income').value = this.data.income || '';
    },

    saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        this.render();
    },

    updateIncome(val) {
        this.data.income = Number(val);
        this.saveData();
    },

    // --- Modal Logic ---
    openModal(id, contextId = null) {
        document.getElementById(id).classList.remove('hidden');
        if (id === 'modal-platform') {
            this.resetPlatformForm();
        } else if (id === 'modal-loan') {
            this.currentPlatformId = contextId;
            this.updateLoanModalHeader();
            this.resetLoanForm();
            this.renderLoansList();
        }
    },

    closeModal(id) {
        document.getElementById(id).classList.add('hidden');
        if (id === 'modal-loan') {
            this.currentPlatformId = null;
        }
    },

    // --- Platform Logic ---
    resetPlatformForm() {
        document.getElementById('input-platform-name').value = '';
        document.getElementById('input-platform-icon').value = '🏦';
        // Reset emoji selections
        document.querySelectorAll('.emoji-opt').forEach(el => el.classList.remove('selected'));
        document.querySelector('.emoji-opt').classList.add('selected'); // Default first
    },

    selectEmoji(emoji, el) {
        document.getElementById('input-platform-icon').value = emoji;
        document.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
    },

    savePlatform() {
        const name = document.getElementById('input-platform-name').value;
        const icon = document.getElementById('input-platform-icon').value;

        if (!name) return alert('请输入平台名称');

        this.data.platforms.push({
            id: uuid(),
            name,
            icon,
            loans: []
        });

        this.saveData();
        this.closeModal('modal-platform');
    },

    deletePlatform(e, id) {
        e.stopPropagation();
        if (confirm('确定删除这个平台及所有记录吗？')) {
            this.data.platforms = this.data.platforms.filter(p => p.id !== id);
            this.saveData();
        }
    },

    // --- Loan Logic ---
    updateLoanModalHeader() {
        const platform = this.data.platforms.find(p => p.id === this.currentPlatformId);
        if (platform) {
            document.getElementById('current-platform-name').innerText = platform.name;
        }
    },

    resetLoanForm() {
        this.editingLoanId = null;
        document.getElementById('input-loan-id').value = '';
        document.getElementById('input-loan-amount').value = '';
        document.getElementById('input-loan-rate').value = '';
        document.getElementById('input-loan-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('input-loan-term').value = '';
        document.getElementById('input-loan-penalty').value = '';
    },

    editLoan(loanId) {
        const platform = this.data.platforms.find(p => p.id === this.currentPlatformId);
        const loan = platform.loans.find(l => l.id === loanId);
        if (!loan) return;

        this.editingLoanId = loanId;
        document.getElementById('input-loan-amount').value = loan.amount;
        document.getElementById('input-loan-rate').value = loan.rate;
        document.getElementById('input-loan-date').value = loan.date;
        document.getElementById('input-loan-term').value = loan.term;
        document.getElementById('input-loan-penalty').value = loan.penalty || 0;
        document.getElementById('input-loan-paid').value = loan.paidAmount || 0;
    },

    deleteLoan(loanId) {
        if (!confirm("删除此笔记录?")) return;
        const platform = this.data.platforms.find(p => p.id === this.currentPlatformId);
        platform.loans = platform.loans.filter(l => l.id !== loanId);
        this.saveData();
        this.renderLoansList(); // Re-render list inside modal
    },

    saveLoan() {
        const amount = Number(document.getElementById('input-loan-amount').value);
        if (!amount) return alert('请输入金额');

        const rate = Number(document.getElementById('input-loan-rate').value);
        const date = document.getElementById('input-loan-date').value;
        const term = Number(document.getElementById('input-loan-term').value);
        const penalty = Number(document.getElementById('input-loan-penalty').value);
        const paidAmount = Number(document.getElementById('input-loan-paid').value) || 0;

        // Status is derived dynamically now, but we can keep a simple 'status' prop if we want default or just ignore it.
        // We will ignore storing 'status' explicitly as it causes sync issues. `calculateLoanDetails` handles it.
        // However, existing data might have it. We will leave it undefined in new objects or update it.

        const platform = this.data.platforms.find(p => p.id === this.currentPlatformId);

        if (this.editingLoanId) {
            // Edit existing
            const loan = platform.loans.find(l => l.id === this.editingLoanId);
            loan.amount = amount;
            loan.rate = rate;
            loan.date = date;
            loan.term = term;
            loan.penalty = penalty;
            loan.paidAmount = paidAmount;
        } else {
            // New loan
            platform.loans.push({
                id: uuid(),
                amount,
                rate,
                date,
                term,
                penalty,
                paidAmount
            });
        }

        this.saveData();
        this.resetLoanForm();
        this.renderLoansList();
    },

    // --- Calculations & Rendering ---
    calculateStats() {
        let totalPrincipal = 0; // Total Borrowed (All time)
        let totalPaidPrincipal = 0; // Principal marked as paid
        let totalOutstandingPrincipal = 0; // Principal still active/overdue
        let totalOutstandingFines = 0; // Fines on active/overdue loans

        this.data.platforms.forEach(p => {
            p.loans.forEach(l => {
                const details = calculateLoanDetails(l);
                const effectiveStatus = details.calculatedStatus;

                // Base Principal
                totalPrincipal += l.amount;

                const paidAmount = l.paidAmount || 0;
                totalPaidPrincipal += paidAmount;

                if (effectiveStatus === 'paid') {
                    // Fully paid - no outstanding
                } else {
                    // Calculate remaining principal
                    const principalRemaining = Math.max(0, l.amount - paidAmount);
                    totalOutstandingPrincipal += principalRemaining;
                    // Add accumulated interest to the outstanding debt burden
                    totalOutstandingPrincipal += details.accumulatedInterest;
                    totalOutstandingFines += (l.penalty || 0);
                }
            });
        });

        // "Total Debt" displayed as Total Borrowed History to show scale
        // "Remaining" is the actual burden now (Principal + Interest + Fines)
        return {
            totalDebt: totalPrincipal,
            totalPaid: totalPaidPrincipal,
            totalRemaining: totalOutstandingPrincipal + totalOutstandingFines,
            totalFines: totalOutstandingFines
        };
    },

    render() {
        const stats = this.calculateStats();

        // Update Dashboard
        document.getElementById('disp-total-debt').innerText = formatMoney(stats.totalDebt);
        document.getElementById('disp-paid').innerText = formatMoney(stats.totalPaid);
        document.getElementById('disp-remaining').innerText = formatMoney(stats.totalRemaining);
        document.getElementById('disp-fines').innerText = formatMoney(stats.totalFines);

        // Freedom Calc
        const income = this.data.income;
        const freedomTextEl = document.getElementById('freedom-time-text');
        const freedomBarEl = document.getElementById('freedom-progress');
        const quoteEl = document.getElementById('freedom-quote');

        if (stats.totalRemaining <= 0) {
            freedomTextEl.innerText = "🎉 自由了！";
            freedomBarEl.style.width = "100%";
            quoteEl.innerText = "恭喜你！无债一身轻。";
        } else if (income > 0) {
            const months = stats.totalRemaining / income;
            // Cap visual progress
            const totalLoad = stats.totalRemaining + stats.totalPaid;
            const progress = totalLoad > 0 ? (stats.totalPaid / totalLoad) * 100 : 0;

            freedomTextEl.innerText = `${months.toFixed(1)} 个月`;
            freedomBarEl.style.width = `${progress}%`;

            if (months > 60) quoteEl.innerText = "路漫漫其修远兮... 加油赚钱！";
            else if (months > 12) quoteEl.innerText = "坚持就是胜利，按部就班。";
            else quoteEl.innerText = "曙光就在眼前！";

        } else {
            freedomTextEl.innerText = "需设置收入";
            freedomBarEl.style.width = "0%";
            quoteEl.innerText = "输入月收入来计算自由时间。";
        }

        // Render Platforms
        const container = document.getElementById('platforms-container');
        container.innerHTML = '';

        if (this.data.platforms.length === 0) {
            document.getElementById('empty-state').style.display = 'block';
        } else {
            document.getElementById('empty-state').style.display = 'none';
            this.data.platforms.forEach(p => {
                const pStats = this.getPlatformStats(p);
                const card = document.createElement('div');
                card.className = 'platform-card';
                if (pStats.hasOverdue) card.classList.add('card-overdue');

                card.onclick = () => this.openModal('modal-loan', p.id);

                let badgeHtml = '';
                if (pStats.hasOverdue) {
                    badgeHtml = `<div class="card-badge-overdue">⚠️ OVERDUE! ⚠️</div>`;
                }

                card.innerHTML = `
                    ${badgeHtml}
                    <button class="delete-platform-btn" onclick="app.deletePlatform(event, '${p.id}')">×</button>
                    <div class="platform-header">
                        <div class="platform-icon">${p.icon}</div>
                        <div class="platform-info">
                            <h4>${p.name}</h4>
                            <span>${p.loans.length} LOANS</span>
                        </div>
                    </div>
                    <div class="platform-stats">
                        <div class="p-stat">
                            <span class="label">REMAINING</span>
                            <span class="val danger">${formatMoney(pStats.remaining)}</span>
                        </div>
                        <div class="p-stat">
                            <span class="label">INTEREST</span>
                            <span class="val warning">${formatMoney(pStats.interest)}</span>
                        </div>
                        <div class="p-stat">
                            <span class="label">PAID</span>
                            <span class="val success">${formatMoney(pStats.paid)}</span>
                        </div>
                        <div class="p-stat">
                            <span class="label">FINES</span>
                            <span class="val danger">${formatMoney(pStats.fines)}</span>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    },

    getPlatformStats(platform) {
        let remaining = 0;
        let fines = 0;
        let interest = 0;
        let paid = 0;
        let hasOverdue = false;

        platform.loans.forEach(l => {
            const details = calculateLoanDetails(l);
            const effectiveStatus = details.calculatedStatus;

            if (effectiveStatus === 'paid') {
                paid += l.amount;
                // Maybe add historical interest to "paid"? 
                // For now, simplicity: Paid = Principal Paid.
            } else {
                fines += (l.penalty || 0);
                const loanPaid = l.paidAmount || 0;
                paid += loanPaid;

                const principalRemaining = Math.max(0, l.amount - loanPaid);
                const loanTotal = principalRemaining + details.accumulatedInterest;

                remaining += loanTotal;
                interest += details.accumulatedInterest; // Interest on full amount logic preserved for simplicity or update?
                // Keeping simple: Interest calculated on original amount as penalty-like

                if (details.isOverdue) hasOverdue = true;
            }
        });
        return { remaining: remaining + fines, fines, interest, paid, hasOverdue };
    },

    renderLoansList() {
        const container = document.getElementById('loans-list-container');
        container.innerHTML = '';
        const platform = this.data.platforms.find(p => p.id === this.currentPlatformId);

        if (!platform || platform.loans.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#9ca3af; padding: 20px;">暂无记录，添加一笔吧！</p>';
            return;
        }

        platform.loans.forEach(loan => {
            const div = document.createElement('div');

            // Use calculated details
            const details = calculateLoanDetails(loan);

            // Visual status preference: Manual Paid > Calculated Overdue > Active
            let displayStatus = details.calculatedStatus;

            const statusClass = displayStatus;
            div.className = `loan-item ${statusClass}`;

            const statusLabels = { 'active': '还款中', 'paid': '已还清', 'overdue': '已逾期' };

            // Build Extra Info Strings
            let extraInfo = '';
            if (displayStatus === 'overdue') {
                extraInfo += `<span style="color:var(--danger); font-weight:bold; margin-right:5px;">逾期 ${details.daysOverdue} 天!</span>`;
            }
            if (displayStatus !== 'paid') {
                if (details.accumulatedInterest > 0) {
                    extraInfo += `<span style="color:#fbbf24; font-size:0.9em;">+ 利息 ${formatMoney(details.accumulatedInterest)}</span>`;
                }
                if (loan.paidAmount > 0) {
                    extraInfo += `<div style="font-size:0.8em; color:green; margin-top:2px;">已还: ${formatMoney(loan.paidAmount)}</div>`;
                }
            }

            div.innerHTML = `
                <div class="loan-details">
                    <h5>${formatMoney(loan.amount)} ${extraInfo}</h5>
                    <p>
                        ${loan.date} 借入 | ${loan.term}个月 | 
                        <span class="status-badge ${displayStatus}">${statusLabels[displayStatus]}</span>
                        <button class="icon-btn edit-loan" onclick="app.editLoan('${loan.id}')" title="编辑">✏️</button>
                        <button class="icon-btn delete-loan" onclick="app.deleteLoan('${loan.id}')" title="删除">🗑️</button>
                    </p>
                    ${loan.penalty > 0 ? `<p style="color:var(--warning)">罚金: ${formatMoney(loan.penalty)}</p>` : ''}
                    <p style="font-size:0.8em; color:#fff; opacity:0.5;">到期日: ${details.dueDate.toISOString().split('T')[0]}</p>
                </div>
            `;
            container.appendChild(div);
        });
    }
};

// Start
app.init();
