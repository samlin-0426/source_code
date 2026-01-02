// Main Logic
let GLOBAL_STOCK_LIST = []; // To store processed objects

document.addEventListener('DOMContentLoaded', () => {
    if (typeof STOCK_CSV_DATA === 'undefined') {
        console.error("Data file not loaded!");
        alert("Error: Data file missing.");
        return;
    }

    // Modal Events
    document.getElementById('btn-show-gainers').addEventListener('click', () => showSortedList('gainers'));
    document.getElementById('btn-show-losers').addEventListener('click', () => showSortedList('losers'));
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('data-modal').addEventListener('click', (e) => {
        if (e.target.id === 'data-modal') closeModal();
    });

    processData(STOCK_CSV_DATA);
});

function closeModal() {
    document.getElementById('data-modal').classList.add('hidden');
}

function processData(csvText) {
    Papa.parse(csvText, {
        complete: function (results) {
            const lines = results.data;
            analyzeStockData(lines);
        },
        error: function (err) {
            console.error("CSV Parse Error:", err);
        }
    });
}

function analyzeStockData(lines) {
    let stockUp = 0;
    let stockDown = 0;
    let stockNoChange = 0;
    let transactionVolumeOverMillion = 0;
    let transactionVolumeBelowTenThousand = 0;
    let totalRecords = 0;

    let startRead = false;

    // Helper functions
    const clean = (str) => {
        if (!str) return "";
        return str.toString().replace(/,/g, "").replace(/"/g, "").trim();
    };
    const parseDec = (str) => parseFloat(clean(str)) || 0;
    const parseLong = (str) => parseInt(clean(str), 10) || 0;

    GLOBAL_STOCK_LIST = []; // Reset

    for (let i = 0; i < lines.length; i++) {
        const row = lines[i];

        if (!startRead) {
            if (row.length > 0 && row[0] && row[0].includes("證券代號")) {
                startRead = true;
            }
            continue;
        }

        if (row.length > 0 && row[0] && row[0].startsWith("說明")) break;
        if (row.length < 8) continue;

        const code = clean(row[0]);
        if (code.length !== 4 || isNaN(code)) continue;

        const name = clean(row[1]); // Assuming col 1 is name
        const volume = parseLong(row[2]);
        const open = parseDec(row[5]);
        const close = parseDec(row[8]);

        // Change logic
        const change = close - open;
        const changePercent = open !== 0 ? (change / open) * 100 : 0;

        totalRecords++;

        // Store for sorting
        GLOBAL_STOCK_LIST.push({
            code, name, volume, open, close, change, changePercent
        });

        // Stats
        if (close > open) stockUp++;
        else if (close < open) stockDown++;
        else stockNoChange++;

        if (volume > 1000000) transactionVolumeOverMillion++;
        if (volume < 10000) transactionVolumeBelowTenThousand++;
    }

    console.log("Analysis Complete:", { stockUp, stockDown, totalRecords });

    // Update Main UI
    updateUI(stockUp, stockDown, stockNoChange, transactionVolumeOverMillion, transactionVolumeBelowTenThousand, totalRecords);

    // Feature: Update Top 5 Volume Sidebar
    updateTopVolumeSidebar();
}

function updateUI(up, down, noChange, volHigh, volLow, total) {
    animateValue("total-count", 0, total, 1000);
    animateValue("up-count", 0, up, 1000);
    animateValue("down-count", 0, down, 1000);

    const ctx = document.getElementById('stockChart').getContext('2d');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['股價上漲', '股價下跌', '股價平盤', '成交股數 > 1M', '成交股數 < 10,000'],
            datasets: [{
                label: 'Stock Count',
                data: [up, down, noChange, volHigh, volLow],
                backgroundColor: [
                    'rgba(248, 113, 113, 0.8)',
                    'rgba(52, 211, 153, 0.8)',
                    'rgba(96, 165, 250, 0.8)',
                    'rgba(251, 146, 60, 0.8)',
                    'rgba(251, 146, 60, 0.5)'
                ],
                borderColor: [
                    'rgba(248, 113, 113, 1)',
                    'rgba(52, 211, 153, 1)',
                    'rgba(96, 165, 250, 1)',
                    'rgba(251, 146, 60, 1)',
                    'rgba(251, 146, 60, 1)'
                ],
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#94a3b8', font: { family: 'Inter' } },
                    border: { display: false }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { family: 'Inter', weight: 600 } },
                    border: { display: false }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
}

function updateTopVolumeSidebar() {
    // Sort by Volume descending
    const sorted = [...GLOBAL_STOCK_LIST].sort((a, b) => b.volume - a.volume).slice(0, 5);

    const listEl = document.getElementById('top-volume-list');
    listEl.innerHTML = '';

    sorted.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = "flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700 hover:border-blue-500 transition";
        li.innerHTML = `
            <div>
                <span class="text-blue-400 font-bold mr-2">#${index + 1}</span>
                <span class="text-white font-semibold">${item.name}</span>
                <span class="text-xs text-slate-500 block">${item.code}</span>
            </div>
            <div class="text-right">
                <span class="block text-sm font-bold text-slate-200">${(item.volume / 1000).toFixed(0)}k</span>
                <span class="text-xs text-slate-400">Vol</span>
            </div>
        `;
        listEl.appendChild(li);
    });
}

function showSortedList(type) {
    const modal = document.getElementById('data-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-list-body');

    modal.classList.remove('hidden');
    body.innerHTML = '';

    let sorted = [];
    if (type === 'gainers') {
        title.innerText = "🔥 Top Gainers (Highest % Increase)";
        // Sort by ChangePercent Descending
        sorted = [...GLOBAL_STOCK_LIST].filter(x => x.change > 0)
            .sort((a, b) => b.changePercent - a.changePercent).slice(0, 50);
    } else {
        title.innerText = "📉 Top Losers (Highest % Decrease)";
        // Sort by ChangePercent Ascending (most negative first)
        sorted = [...GLOBAL_STOCK_LIST].filter(x => x.change < 0)
            .sort((a, b) => a.changePercent - b.changePercent).slice(0, 50);
    }

    sorted.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-700/50 hover:bg-slate-700/30 transition";

        const colorClass = item.change > 0 ? 'text-red-400' : (item.change < 0 ? 'text-emerald-400' : 'text-slate-400');
        const sign = item.change > 0 ? '+' : '';

        tr.innerHTML = `
            <td class="py-3 px-2 font-mono text-slate-300">${item.code}</td>
            <td class="py-3 px-2 font-semibold text-white">${item.name}</td>
            <td class="py-3 px-2 text-right text-slate-200">${item.close}</td>
            <td class="py-3 px-2 text-right font-bold ${colorClass}">
                ${sign}${item.changePercent.toFixed(2)}%
                <span class="text-xs opacity-70 block">${sign}${item.change.toFixed(2)}</span>
            </td>
        `;
        body.appendChild(tr);
    });
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}
