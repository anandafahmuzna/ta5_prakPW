document.addEventListener('DOMContentLoaded', () => {
    // --- Elemen DOM ---
    const display = document.getElementById('display');
    const expressionDisplay = document.getElementById('current-expression');
    const buttonsGrid = document.getElementById('buttons-grid');
    const clearBtn = document.getElementById('clear-btn'); 
    const operatorButtons = document.querySelectorAll('.btn-op');
    const advancedPanel = document.getElementById('advanced-panel');
    const showHistoryBtn = document.getElementById('show-history');
    const showMemoryBtn = document.getElementById('show-memory');
    const memoryButtons = document.querySelectorAll('button[data-action="memory"]');

    // --- State Kalkulator ---
    let currentInput = '0';
    let expression = '';
    let operatorActive = null;
    let waitForNewNumber = true; 
    let history = []; 
    let memory = 0; 
    let lastResult = null; 
    let isShowingHistory = false;
    let isShowingMemory = false;

    // --- Utility Functions ---

    /**
     * Memperbarui tampilan utama dan status tombol AC/C
     */
    const updateDisplay = () => {
        const maxDisplayLength = 9; 
        let displayedValue = currentInput.includes('.') ? currentInput : parseFloat(currentInput).toLocaleString('en-US', {maximumFractionDigits: 9});

        // Tangani notasi ilmiah
        const num = parseFloat(currentInput);
        if (Math.abs(num) >= 1e9 || (Math.abs(num) < 1e-6 && num !== 0)) {
            displayedValue = num.toExponential(5);
        } else if (displayedValue.length > maxDisplayLength && !displayedValue.includes('e')) {
            displayedValue = currentInput;
        }

        display.textContent = displayedValue;
        expressionDisplay.textContent = expression.replace(/\*/g, '×').replace(/\//g, '÷');
        
        // Logika AC/C mirip iPhone
        if (clearBtn) {
            if (currentInput !== '0' || expression !== '' || lastResult !== null) {
                clearBtn.textContent = 'C';
                clearBtn.dataset.value = 'C';
            } else {
                clearBtn.textContent = 'AC';
                clearBtn.dataset.value = 'AC';
            }
        }
    };

    /**
     * Mengevaluasi ekspresi matematika
     */
    const calculate = (expr) => {
        try {
            let safeExpr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/%/g, '/100'); 
            let result = new Function('return ' + safeExpr)();
            if (isNaN(result) || !isFinite(result)) throw new Error("Invalid calculation");
            result = parseFloat(result.toFixed(9));
            return result.toString();
        } catch (e) {
            return 'Error';
        }
    };
    
    /**
     * Mengganti tombol operator aktif (oranye)
     */
    const toggleOperatorActive = (operator) => {
        operatorButtons.forEach(btn => btn.classList.remove('active'));
        if (operator && operator !== '=') {
            const btn = document.querySelector(`.btn-op[data-value="${operator}"]`);
            if (btn) btn.classList.add('active');
        }
    };

    // 1. Tombol Angka (0-9) dan Desimal (.)
    const handleNumberInput = (value) => {
        toggleOperatorActive(null);
        lastResult = null; 
        if (currentInput.length >= 15 && !currentInput.includes('e')) return; 

        if (waitForNewNumber) {
            currentInput = value === '.' ? '0.' : value;
            waitForNewNumber = false;
        } else if (currentInput === '0' && value !== '.') {
            currentInput = value;
        } else if (value === '.') {
            if (!currentInput.includes('.')) {
                currentInput += value;
            }
        } else {
            currentInput += value;
        }
        updateDisplay();
    };

    // 2. Tombol Operator (+, -, ×, ÷, %)
    const handleOperator = (op) => {
        if (op === '±') { 
            if (currentInput !== '0' && currentInput !== 'Error') currentInput = (parseFloat(currentInput) * -1).toString();
            toggleOperatorActive(null);
            updateDisplay();
            return;
        } 
        if (op === '%') { 
            if (currentInput !== '0' && currentInput !== 'Error') currentInput = (parseFloat(currentInput) / 100).toString();
            toggleOperatorActive(null);
            updateDisplay();
            return;
        }
        
        toggleOperatorActive(op);
        lastResult = null;
        
        if (!waitForNewNumber) {
            expression += currentInput + ` ${op} `;
            try { currentInput = calculate(expression.slice(0, -3)); } catch (e) { /* ignore */ }
            waitForNewNumber = true;
        } else if (expression.endsWith(' + ') || expression.endsWith(' - ') || expression.endsWith(' × ') || expression.endsWith(' ÷ ')) {
             expression = expression.slice(0, -3) + ` ${op} `; 
        }
        updateDisplay();
    };

    // 3. Tombol Sama Dengan (=)
    const handleEquals = () => {
        toggleOperatorActive(null);
        if (expression === '' && lastResult === null) return;
        
        let expressionToEvaluate = expression.trim();
        if (!expressionToEvaluate.endsWith(currentInput) && !waitForNewNumber) {
             expressionToEvaluate += currentInput;
        } else if (expressionToEvaluate === '' && currentInput !== '0') {
            expressionToEvaluate = currentInput;
        }
        
        let result = calculate(expressionToEvaluate);
        // Simpan riwayat (hanya jika berhasil)
        if (result !== 'Error') {
             history.unshift({ expression: expressionToEvaluate.replace(/\*/g, '×').replace(/\//g, '÷'), result: result });
        }
        
        currentInput = result;
        lastResult = result;
        expression = ''; 
        waitForNewNumber = true;
        
        updateDisplay();
    };

    // 4. Tombol Clear (AC/C), Clear Entry (CE), dan Backspace
    const handleClear = (action) => {
        if (action === 'AC') {
            currentInput = '0';
            expression = '';
            lastResult = null;
            toggleOperatorActive(null);
            waitForNewNumber = true;
        } else if (action === 'C' || action === 'CE') {
            currentInput = '0';
            waitForNewNumber = true;
            lastResult = null;
        } else if (action === 'Backspace') {
            if (currentInput === '0' || waitForNewNumber) return;
            if (currentInput.length === 1 || (currentInput.length === 2 && currentInput.startsWith('-'))) {
                currentInput = '0';
                waitForNewNumber = true;
            } else {
                currentInput = currentInput.slice(0, -1);
            }
        }
        updateDisplay();
    };
    
    // 5. Tombol Memori (M+, M-, MR, MC)
    const updateMemoryDisplay = () => {
        const memoryFormatted = memory.toFixed(2).replace(/\.?0+$/, '');
        if (showMemoryBtn) {
            showMemoryBtn.textContent = `Memory (${memoryFormatted})`;
        }
        if (isShowingMemory) {
             renderMemoryPanel();
        }
        // Tombol MR dan MC hanya aktif jika memory tidak nol
        memoryButtons.forEach(btn => {
            if (btn.dataset.value === 'MR' || btn.dataset.value === 'MC') {
                 btn.disabled = memory === 0;
            }
        });
    };
    
    const handleMemory = (action) => {
        const currentValue = parseFloat(currentInput);
        
        if (action === 'M+') {
            memory += currentValue;
            waitForNewNumber = true;
        } else if (action === 'M-') {
            memory -= currentValue;
            waitForNewNumber = true;
        } else if (action === 'MR') {
            currentInput = memory.toString();
            waitForNewNumber = false;
        } else if (action === 'MC') {
            memory = 0;
        }
        updateMemoryDisplay();
        updateDisplay();
    };

    // --- Panel Advanced (History/Memory) ---
    
    const renderHistoryPanel = () => {
        advancedPanel.innerHTML = history.map(item => `
            <div class="p-2 border-b border-[#333333] last:border-b-0 cursor-pointer hover:bg-[#2c2c2c] rounded-md" 
                 onclick="window.calculator.loadHistoryResult('${item.result}')">
                <div class="text-sm text-gray-400">${item.expression} =</div>
                <div class="text-lg text-white font-semibold">${item.result}</div>
            </div>
        `).join('') || '<div class="text-center p-4 text-gray-500">Riwayat kosong.</div>';
    };

    const renderMemoryPanel = () => {
         const memoryFormatted = memory.toFixed(9).replace(/\.?0+$/, '');
         advancedPanel.innerHTML = `
            <div class="p-2 text-center">
                <div class="text-sm text-gray-400">Memori Saat Ini (M)</div>
                <div class="text-2xl text-white font-bold">${memoryFormatted}</div>
            </div>
         `;
    };

    const togglePanel = (type) => {
        const shouldShow = (type === 'history' && !isShowingHistory) || (type === 'memory' && !isShowingMemory);
        
        isShowingHistory = false;
        isShowingMemory = false;
        advancedPanel.classList.add('hidden');
        if (showHistoryBtn) showHistoryBtn.classList.remove('bg-[#2c2c2c]');
        if (showMemoryBtn) showMemoryBtn.classList.remove('bg-[#2c2c2c]');

        if (shouldShow) {
            advancedPanel.classList.remove('hidden');
            if (type === 'history') {
                isShowingHistory = true;
                renderHistoryPanel();
                if (showHistoryBtn) showHistoryBtn.classList.add('bg-[#2c2c2c]');
            } else {
                isShowingMemory = true;
                renderMemoryPanel();
                if (showMemoryBtn) showMemoryBtn.classList.add('bg-[#2c2c2c]');
            }
            advancedPanel.scrollTop = 0;
        }
    };

    if (showHistoryBtn) showHistoryBtn.addEventListener('click', () => togglePanel('history'));
    if (showMemoryBtn) showMemoryBtn.addEventListener('click', () => togglePanel('memory'));
    
    // Fungsi untuk memuat hasil riwayat ke kalkulator
    window.calculator = {
        loadHistoryResult: (result) => {
            currentInput = result;
            expression = '';
            waitForNewNumber = false;
            lastResult = null; 
            togglePanel(null); // Menutup panel
            updateDisplay();
        }
    };
    
    // --- KEYBOARD LISTENER UTAMA ---
    const triggerButtonFromKey = (selector, value) => {
        const button = document.querySelector(selector);
        
        if (button) {
            const action = button.dataset.action;

            if (action === 'number' || action === 'decimal') {
                 handleNumberInput(value);
            } else if (action === 'operator') {
                handleOperator(value);
            } else if (action === 'equals') {
                handleEquals();
            } else if (action === 'clear' || action === 'clear-entry') {
                handleClear(value);
            } else if (action === 'memory') {
                 handleMemory(value);
            }
            
            // Animasi Visual
            button.classList.add('key-active');
            setTimeout(() => {
                button.classList.remove('key-active');
            }, 100); 
        }
    };

    document.addEventListener('keydown', (e) => {
        let key = e.key;

        if (['/', '*', '-', '+', '=', 'Enter', 'Escape'].includes(key)) {
            e.preventDefault();
        }

        // Mapping Angka/Desimal
        if (/[0-9]/.test(key)) {
            triggerButtonFromKey(`[data-action="number"][data-value="${key}"]`, key);
        } else if (key === '.' || key === ',') {
            triggerButtonFromKey(`[data-action="decimal"]`, '.');
        }
        
        // Mapping Operator
        else if (key === '+') {
            triggerButtonFromKey(`[data-action="operator"][data-value="+"]`, '+');
        } else if (key === '-') {
            triggerButtonFromKey(`[data-action="operator"][data-value="-"]`, '-');
        } else if (key === '*' || key.toLowerCase() === 'x') {
            triggerButtonFromKey(`[data-action="operator"][data-value="×"]`, '×');
        } else if (key === '/') {
            triggerButtonFromKey(`[data-action="operator"][data-value="÷"]`, '÷');
        } else if (key === '%') {
            triggerButtonFromKey(`[data-action="operator"][data-value="%"]`, '%');
        }
        
        // Mapping Equals dan Clear/Backspace
        else if (key === '=' || key === 'Enter') {
            triggerButtonFromKey(`[data-action="equals"]`, '=');
        } else if (key === 'Escape') {
             const clearAction = clearBtn ? clearBtn.dataset.value : 'AC';
             triggerButtonFromKey(`#clear-btn`, clearAction);
        } else if (key === 'Backspace') {
             handleClear('Backspace');
        }
        
        // Mapping Memory (Contoh: Shift+M untuk M+)
        // if (e.shiftKey && key.toLowerCase() === 'm') {
        //     triggerButtonFromKey(`button[data-action="memory"][data-value="M+"]`, 'M+');
        // }
    });
    
    // --- Event Listener Tombol Fisik (Klik Layar) ---
    buttonsGrid.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-base');
        if (!button) return;

        const action = button.dataset.action;
        const value = button.dataset.value;

        switch (action) {
            case 'number':
            case 'decimal':
                handleNumberInput(value);
                break;
            case 'operator':
                handleOperator(value);
                break;
            case 'equals':
                handleEquals();
                break;
            case 'clear':
            case 'clear-entry': 
                handleClear(value);
                break;
            default:
                break;
        }
    });

    // Event listener Memory (Tombol M+, M-, MR, MC)
    document.querySelector('.grid.grid-cols-4.gap-3.mt-4')?.addEventListener('click', (e) => {
         const button = e.target.closest('button[data-action="memory"]');
         if (button) {
            handleMemory(button.dataset.value);
         }
    });
    
    // Inisialisasi tampilan
    updateDisplay();
    updateMemoryDisplay();
});