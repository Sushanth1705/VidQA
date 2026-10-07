let servers = [];
let editIndex = -1;
let deploymentState = "Ready";
let responseLogs = [];

function setStatus(message, type = "info") {
    const statusEl = document.getElementById("statusMessage");
    statusEl.textContent = message;
    statusEl.className = `status-message visible status-${type}`;

    clearTimeout(setStatus.timeoutId);
    setStatus.timeoutId = setTimeout(() => {
        statusEl.className = "status-message";
    }, 4500);
}

function addLog(message) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    responseLogs.push(`${timestamp} — ${message}`);
    if (responseLogs.length > 18) {
        responseLogs.shift();
    }
    renderResponseConsole();
}

function renderResponseConsole() {
    const consoleEl = document.getElementById("responseConsole");
    consoleEl.innerHTML = responseLogs
        .map(entry => `<p class="console-line">${entry}</p>`)
        .join("");
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

function getFormData() {
    return {
        serverName: document.getElementById("serverName").value.trim(),
        ip: document.getElementById("ip").value.trim(),
        os: document.getElementById("os").value,
        location: document.getElementById("location").value.trim(),
        status: document.getElementById("status").value,
    };
}

function validateIPv4(ip) {
    const ipv4Pattern = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
    return ipv4Pattern.test(ip);
}

function validateCurrentForm() {
    const data = getFormData();
    if (!data.serverName || !data.ip || !data.os || !data.location || !data.status) {
        return { valid: false, message: "Please fill in all fields before validating." };
    }
    if (!validateIPv4(data.ip)) {
        return { valid: false, message: "Please enter a valid IPv4 address." };
    }
    return { valid: true, data };
}

function registerServer() {
    const validation = validateCurrentForm();
    if (!validation.valid) {
        setStatus(validation.message, "error");
        return;
    }

    servers.push(validation.data);
    addLog(`Server Registered: ${validation.data.serverName}`);
    setStatus("Server registered successfully.", "success");
    clearForm(false);
    updateDashboard();
}

function validateServers() {
    const validation = validateCurrentForm();
    if (validation.valid) {
        addLog("Validation Successful.");
        setStatus("All fields are valid and the IP format is correct.", "success");
    } else {
        addLog("Validation Failed.");
        setStatus(validation.message, "error");
    }
    updateDashboard();
}

function updateServer() {
    if (editIndex === -1) {
        setStatus("Select a server to update from the table.", "error");
        return;
    }

    const validation = validateCurrentForm();
    if (!validation.valid) {
        setStatus(validation.message, "error");
        return;
    }

    servers[editIndex] = validation.data;
    addLog(`Server Updated: ${validation.data.serverName}`);
    setStatus("Server record updated successfully.", "success");
    editIndex = -1;
    clearForm(false);
    updateDashboard();
}

function deleteSelectedServer() {
    if (editIndex === -1) {
        setStatus("Select a server from the table before using Delete.", "error");
        return;
    }

    const server = servers[editIndex];
    if (!confirm(`Delete server ${server.serverName}? This action cannot be undone.`)) {
        return;
    }

    servers.splice(editIndex, 1);
    addLog(`Server Deleted: ${server.serverName}`);
    setStatus("Server deleted successfully.", "success");
    editIndex = -1;
    clearForm(false);
    updateDashboard();
}

function deleteServer(index) {
    const server = servers[index];
    if (!confirm(`Delete server ${server.serverName}? This action cannot be undone.`)) {
        return;
    }

    servers.splice(index, 1);
    addLog(`Server Deleted: ${server.serverName}`);
    setStatus(`Removed ${server.serverName} from the registry.`, "info");
    if (editIndex === index) {
        editIndex = -1;
        clearForm(false);
    }
    updateDashboard();
}

function editServer(index) {
    const server = servers[index];
    document.getElementById("serverName").value = server.serverName;
    document.getElementById("ip").value = server.ip;
    document.getElementById("os").value = server.os;
    document.getElementById("location").value = server.location;
    document.getElementById("status").value = server.status;

    editIndex = index;
    setStatus(`Editing server record: ${server.serverName}. Click Update to save changes.`, "info");
    updateDashboard();
}

function clearForm(showStatus = true) {
    document.getElementById("serverName").value = "";
    document.getElementById("ip").value = "";
    document.getElementById("os").selectedIndex = 0;
    document.getElementById("location").value = "";
    document.getElementById("status").selectedIndex = 0;
    editIndex = -1;

    if (showStatus) {
        setStatus("Form cleared and ready for a new entry.", "info");
    }
    updateDashboard();
}

function clearAllServers() {
    if (!confirm("Remove all registered servers from the dashboard?")) {
        return;
    }
    servers = [];
    editIndex = -1;
    responseLogs = [];
    deploymentState = "Ready";
    addLog("All servers removed from registry.");
    setStatus("All servers cleared.", "success");
    clearForm(false);
    updateDashboard();
}

function deployServer() {
    if (servers.length === 0) {
        setStatus("Register a server before starting deployment.", "error");
        return;
    }

    const target = editIndex >= 0 ? servers[editIndex] : servers[servers.length - 1];
    const targetName = target.serverName || "selected server";

    setDeploymentState("Validating", `Validating deployment prerequisites for ${targetName}...`);
    addLog(`Deployment started for ${targetName}`);

    const steps = [
        { state: "Deploying", message: "Configuring server environment..." },
        { state: "Deploying", message: "Pushing deployment artifacts..." },
        { state: "Success", message: "Deployment completed successfully." },
    ];

    let stepIndex = 0;
    const deploymentInterval = setInterval(() => {
        const step = steps[stepIndex];
        setDeploymentState(step.state, step.message);
        addLog(step.message);

        stepIndex += 1;
        if (stepIndex >= steps.length) {
            clearInterval(deploymentInterval);
        }
    }, 1200);
}

function setDeploymentState(state, message) {
    deploymentState = state;
    document.getElementById("deploymentMessage").textContent = message;

    const label = document.getElementById("deploymentStateLabel");
    label.textContent = state;
    label.className = `state-pill state-${state.toLowerCase()}`;
}

function updateSummary() {
    const summary = editIndex >= 0 ? servers[editIndex] : servers[servers.length - 1] || null;
    document.getElementById("summaryName").textContent = summary ? summary.serverName : "—";
    document.getElementById("summaryIp").textContent = summary ? summary.ip : "—";
    document.getElementById("summaryOs").textContent = summary ? summary.os : "—";
    document.getElementById("summaryLocation").textContent = summary ? summary.location : "—";
    document.getElementById("summaryStatus").textContent = summary ? summary.status : "—";
}

function displayServers() {
    const output = servers
        .map((server, index) => {
            return `
                <tr>
                    <td>${server.serverName}</td>
                    <td>${server.ip}</td>
                    <td>${server.os}</td>
                    <td>${server.location}</td>
                    <td>${server.status}</td>
                    <td class="actions">
                        <button type="button" class="editBtn" onclick="editServer(${index})">Edit</button>
                        <button type="button" class="deleteBtn" onclick="deleteServer(${index})">Delete</button>
                    </td>
                </tr>`;
        })
        .join("");
    document.getElementById("serverTable").innerHTML = output;
}

function updateDashboard() {
    displayServers();
    updateSummary();
    setDeploymentState(deploymentState, document.getElementById("deploymentMessage").textContent);
    renderResponseConsole();
}

window.addEventListener("DOMContentLoaded", () => {
    addLog("Dashboard ready.");
    updateDashboard();
});
