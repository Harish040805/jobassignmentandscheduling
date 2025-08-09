    let selectedAlgorithm = "1";
    let executionOrder = [];

    function addRow() {
      const tableBody = document.querySelector("#myTable tbody");

      const newRow = document.createElement("tr");

      const placeholders = ["P", "AT", "BT", "PR", "CT", "TAT", "WT", "RT"];
      for (let i = 0; i < placeholders.length; i++) {
        const cell = document.createElement("td");
        const input = document.createElement("input");
        if (i === 0) { input.type = "text"; input.placeholder = placeholders[i]; }
        else { input.type = "number"; input.placeholder = placeholders[i]; }

        if (i >= 4) {
          input.readOnly = true;
          cell.setAttribute("data-output", "true");
        } else {
          input.addEventListener("input", calculateResults);
        }

        cell.appendChild(input);
        newRow.appendChild(cell);
      }

      const deleteCell = document.createElement("td");
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.style.backgroundColor = "red";
      deleteButton.style.color = "white";
      deleteButton.onclick = () => {
        tableBody.removeChild(newRow);
        calculateResults();
      };
      deleteCell.appendChild(deleteButton);
      newRow.appendChild(deleteCell);

      tableBody.appendChild(newRow);
      calculateResults();
    }

    function getProcessRows() {
      const allRows = Array.from(document.querySelectorAll("#myTable tbody tr"));
      return allRows;
    }

    function calculateResults() {
      const rows = getProcessRows();
      const processes = [];

      rows.forEach(row => {
        const name = row.cells[0].querySelector("input").value.trim();
        const atVal = row.cells[1].querySelector("input").value;
        const btVal = row.cells[2].querySelector("input").value;
        const prVal = row.cells[3].querySelector("input").value;

        const at = atVal === "" ? NaN : parseInt(atVal, 10);
        const bt = btVal === "" ? NaN : parseInt(btVal, 10);
        const pr = prVal === "" ? undefined : parseInt(prVal, 10);

        if (name && !isNaN(at) && !isNaN(bt)) {
          processes.push({ name, at, bt, pr, row });
        } else {
          row.cells[4].querySelector("input").value = "";
          row.cells[5].querySelector("input").value = "";
          row.cells[6].querySelector("input").value = "";
          row.cells[7].querySelector("input").value = "";
        }
      });

      if (processes.length === 0) {
        executionOrder = [];
        updateRepresentationFrame();
        updateAverages(0, 0);
        return;
      }

      if (selectedAlgorithm === "1") {
        applyFCFS(processes);
      } else if (selectedAlgorithm === "2") {
        applySJF(processes);
      } else if (selectedAlgorithm === "3") {
        applyRoundRobin(processes);
      } else if (selectedAlgorithm === "4") {
        applyPriority(processes);
      } else {
        executionOrder = [];
      }

      updateRepresentationFrame();
    }

    function applyFCFS(processes) {
      executionOrder = [];
      processes.sort((a, b) => {
        if (a.at !== b.at) return a.at - b.at;
        return a.name.localeCompare(b.name);
      });

      let currentTime = 0;
      let totalTAT = 0, totalWT = 0;

      processes.forEach(p => {
        const start = Math.max(currentTime, p.at);
        const ct = start + p.bt;
        const tat = ct - p.at;
        const wt = tat - p.bt;
        const rt = start - p.at;

        currentTime = ct;

        p.row.cells[4].querySelector("input").value = ct;
        p.row.cells[5].querySelector("input").value = tat;
        p.row.cells[6].querySelector("input").value = wt;
        p.row.cells[7].querySelector("input").value = rt;

        totalTAT += tat;
        totalWT += wt;
        executionOrder.push(p.name);
      });

      const avgTAT = totalTAT / processes.length;
      const avgWT = totalWT / processes.length;
      updateAverages(avgTAT, avgWT);
    }

    function applySJF(processes) {
      executionOrder = [];
      const n = processes.length;
      const isCompleted = new Array(n).fill(false);
      let time = Math.min(...processes.map(p => p.at));
      let completed = 0;
      let totalTAT = 0, totalWT = 0;

      while (completed < n) {
        let idx = -1;
        let minBT = Infinity;
        for (let i = 0; i < n; i++) {
          if (!isCompleted[i] && processes[i].at <= time && processes[i].bt < minBT) {
            minBT = processes[i].bt;
            idx = i;
          }
        }

        if (idx === -1) {
          time++;
        } else {
          const p = processes[idx];
          const start = time;
          const ct = start + p.bt;
          const tat = ct - p.at;
          const wt = tat - p.bt;
          const rt = start - p.at;

          p.row.cells[4].querySelector("input").value = ct;
          p.row.cells[5].querySelector("input").value = tat;
          p.row.cells[6].querySelector("input").value = wt;
          p.row.cells[7].querySelector("input").value = rt;

          totalTAT += tat;
          totalWT += wt;
          isCompleted[idx] = true;
          completed++;
          time = ct;

          executionOrder.push(p.name);
        }
      }

      const avgTAT = totalTAT / n;
      const avgWT = totalWT / n;
      updateAverages(avgTAT, avgWT);
    }

    function applyRoundRobin(processes) {
      executionOrder = [];

      let tqInput = prompt("Enter time quantum (positive integer):", "2");
      if (tqInput === null) {
        tqInput = "2";
      }
      let tq = parseInt(tqInput, 10);
      if (isNaN(tq) || tq <= 0) {
        alert("Invalid quantum. Using default quantum = 2");
        tq = 2;
      }

      processes.sort((a, b) => (a.at - b.at) || a.name.localeCompare(b.name));

      const n = processes.length;
      const remaining = processes.map(p => p.bt);
      const arrival = processes.map(p => p.at);
      const name = processes.map(p => p.name);
      const rowRefs = processes.map(p => p.row);

      const isStarted = new Array(n).fill(false);
      const completion = new Array(n).fill(0);
      const response = new Array(n).fill(-1);

      let time = Math.min(...arrival);
      const q = [];
      const visited = new Array(n).fill(false);

      for (let i = 0; i < n; i++) {
        if (arrival[i] <= time) {
          q.push(i);
          visited[i] = true;
        }
      }

      if (q.length === 0) {
        q.push(0);
        visited[0] = true;
        time = arrival[0];
      }

      let totalTAT = 0, totalWT = 0;
      while (q.length > 0) {
        const idx = q.shift();
        if (!isStarted[idx]) {
          isStarted[idx] = true;
          if (response[idx] === -1) response[idx] = Math.max(time, arrival[idx]) - arrival[idx];
          if (time < arrival[idx]) time = arrival[idx];
        }

        const exec = Math.min(tq, remaining[idx]);
        time += exec;
        remaining[idx] -= exec;

        executionOrder.push(name[idx]);

        for (let j = 0; j < n; j++) {
          if (!visited[j] && arrival[j] <= time) {
            q.push(j);
            visited[j] = true;
          }
        }

        if (remaining[idx] > 0) {
          q.push(idx);
        } else {
          completion[idx] = time;
          const tat = completion[idx] - arrival[idx];
          const wt = tat - processes[idx].bt;
          totalTAT += tat;
          totalWT += wt;
          rowRefs[idx].cells[4].querySelector("input").value = completion[idx];
          rowRefs[idx].cells[5].querySelector("input").value = tat;
          rowRefs[idx].cells[6].querySelector("input").value = wt;
          rowRefs[idx].cells[7].querySelector("input").value = response[idx] === -1 ? 0 : response[idx];
        }

        if (q.length === 0) {
          for (let j = 0; j < n; j++) {
            if (remaining[j] > 0 && !visited[j]) {
              q.push(j);
              visited[j] = true;
              if (time < arrival[j]) time = arrival[j];
              break;
            }
          }
        }
      }

      const avgTAT = totalTAT / n;
      const avgWT = totalWT / n;
      updateAverages(avgTAT, avgWT);
    }

    function applyPriority(processes) {
      executionOrder = [];
      processes.forEach(p => {
        if (p.pr === undefined || isNaN(p.pr)) {
          p.pr = 999999; 
        }
      });

      const n = processes.length;
      const isCompleted = new Array(n).fill(false);
      let time = Math.min(...processes.map(p => p.at));
      let completed = 0;
      let totalTAT = 0, totalWT = 0;

      while (completed < n) {
        let idx = -1;
        let minPr = Infinity;
        for (let i = 0; i < n; i++) {
          if (!isCompleted[i] && processes[i].at <= time && processes[i].pr < minPr) {
            minPr = processes[i].pr;
            idx = i;
          }
        }

        if (idx === -1) {
          time++;
        } else {
          const p = processes[idx];
          const start = time;
          const ct = start + p.bt;
          const tat = ct - p.at;
          const wt = tat - p.bt;
          const rt = start - p.at;

          p.row.cells[4].querySelector("input").value = ct;
          p.row.cells[5].querySelector("input").value = tat;
          p.row.cells[6].querySelector("input").value = wt;
          p.row.cells[7].querySelector("input").value = rt;

          totalTAT += tat;
          totalWT += wt;
          isCompleted[idx] = true;
          completed++;
          time = ct;

          executionOrder.push(p.name);
        }
      }

      const avgTAT = totalTAT / n;
      const avgWT = totalWT / n;
      updateAverages(avgTAT, avgWT);
    }

    function updateAverages(avgTAT, avgWT) {
      document.getElementById("avgTAT").textContent = `Average TAT: ${avgTAT.toFixed(2)}`;
      document.getElementById("avgWT").textContent = `Average WT: ${avgWT.toFixed(2)}`;
    }

    function updateRepresentationFrame() {
      const container = document.getElementById("representationRow");
      container.innerHTML = "";

      executionOrder.forEach(proc => {
        const box = document.createElement("div");
        box.className = "representation-box";
        box.textContent = proc;
        container.appendChild(box);
      });
    }

    function showRepresentation() {
      document.getElementById("representationModal").style.display = "block";
    }

    function closeModal() {
      document.getElementById("representationModal").style.display = "none";
    }

    function showAlgorithmModal() {
      document.getElementById("algorithmModal").style.display = "block";
    }

    function closeAlgorithmModal() {
      document.getElementById("algorithmModal").style.display = "none";
    }

    function setAlgorithm(radio) {
      selectedAlgorithm = radio.value;
      const algoBtn = document.getElementById("algoBtn");
      if (selectedAlgorithm === "1") algoBtn.textContent = "Algorithm: FCFS";
      else if (selectedAlgorithm === "2") algoBtn.textContent = "Algorithm: SJF";
      else if (selectedAlgorithm === "3") algoBtn.textContent = "Algorithm: Round Robin";
      else if (selectedAlgorithm === "4") algoBtn.textContent = "Algorithm: Priority Scheduling";

      calculateResults();
      closeAlgorithmModal();
    }

    for (let i = 0; i < 3; i++) addRow();
