(function () {
  "use strict";
  const seed = {
    projects: [
      {
        id: 1,
        name: "Mini & Moi",
        desc: "Boutique e-commerce de démonstration autour du Babycook BÉABA.",
        progress: 35,
        category: "E-commerce",
      },
      {
        id: 2,
        name: "Publicité Babycook",
        desc: "Créer une publicité vidéo réaliste pour la boutique.",
        progress: 15,
        category: "Marketing",
      },
    ],
    tasks: [
      { id: 1, text: "Définir le design de Mini & Moi", done: true },
      {
        id: 2,
        text: "Tester le panier et le parcours de commande",
        done: false,
      },
      { id: 3, text: "Préparer le storyboard de la publicité", done: false },
      { id: 4, text: "Connecter les API via un serveur sécurisé", done: false },
    ],
    messages: [
      {
        role: "system",
        text: "Bienvenue ! Choisis un mode, ajuste les missions et décris ton projet pour démarrer une collaboration réelle.",
      },
    ],
  };
  let data = structuredClone(seed);
  let ready = false,
    busy = false,
    lastRequest = null,
    missionList = [],
    activeMission = null,
    saveQueue = Promise.resolve();
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function persist() {
    if (!ready) return;
    const snapshot = JSON.stringify(data);
    $("saveStatus").textContent = "Enregistrement…";
    saveQueue = saveQueue
      .catch(() => {})
      .then(async () => {
        try {
          const r = await fetch("/api/workspace", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: snapshot,
          });
          if (!r.ok) throw new Error();
          $("saveStatus").textContent = "Espace enregistré.";
        } catch {
          $("saveStatus").textContent =
            "Échec de sauvegarde. Exporte tes données avant de quitter.";
          toast("Sauvegarde indisponible : exporte tes données.");
        }
      });
  }
  function toast(msg) {
    document.querySelector(".toast")?.remove();
    let el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.append(el);
    setTimeout(() => el.remove(), 3500);
  }
  function card(p) {
    let div = document.createElement("article");
    div.className = "card project";
    div.innerHTML = `<div class="between"><span class="tag">${esc(p.category || "Projet")}</span><button class="btn secondary small" data-delete="${p.id}" aria-label="Supprimer ${esc(p.name)}">×</button></div><h3>${esc(p.name)}</h3><p class="muted">${esc(p.desc || "Aucune description")}</p><div class="progress"><span style="width:${Math.min(100, Math.max(0, Number(p.progress) || 0))}%"></span></div><div class="between"><span class="muted" style="font-size:12px">Progression estimée</span><span>${Number(p.progress) || 0}%</span></div><div style="display:flex;gap:8px;margin-top:15px"><button class="btn secondary small" data-progress="${p.id}">+ 10 %</button><button class="btn secondary small" data-chat="${p.id}">Collaborer →</button></div>`;
    return div;
  }
  function renderProjects() {
    for (let id of ["recentProjects", "allProjects"]) {
      let node = $(id);
      node.replaceChildren();
      let arr =
        id === "recentProjects" ? data.projects.slice(0, 3) : data.projects;
      if (!arr.length)
        node.innerHTML =
          '<p class="empty">Aucun projet. Crée ton premier projet !</p>';
      arr.forEach((p) => node.append(card(p)));
    }
    renderProjectSelect();
    $("countProjects").textContent = data.projects.length;
    $("countDone").textContent = data.tasks.filter((x) => x.done).length;
  }
  function renderTasks() {
    let node = $("taskList");
    node.replaceChildren();
    data.tasks.forEach((t) => {
      let row = document.createElement("div");
      row.className = "task" + (t.done ? " done" : "");
      row.innerHTML = `<input type="checkbox" data-task="${t.id}" ${t.done ? "checked" : ""} aria-label="Terminer la tâche"><span style="flex:1">${esc(t.text)}</span><button class="btn secondary small" data-remove-task="${t.id}" aria-label="Supprimer la tâche">×</button>`;
      node.append(row);
    });
    if (!data.tasks.length)
      node.innerHTML = '<p class="empty">Aucune tâche pour le moment.</p>';
  }
  function renderChat() {
    const node = $("thread");
    node.replaceChildren();
    const projectId = $("projectSelect").value;
    const rows = missionList.filter((m) => m.projectId === projectId);
    for (const m of rows) {
      const block = document.createElement("div");
      block.className = "message system";
      const title = document.createElement("strong");
      title.textContent = m.prompt;
      block.append(title);
      const date = document.createElement("p");
      date.className = "muted";
      date.textContent =
        new Date(m.createdAt).toLocaleString("fr-FR") +
        " · " +
        m.results.length +
        "/3 étapes";
      block.append(date);
      m.results.forEach((r, i) => {
        const text = document.createElement("p");
        text.textContent =
          [
            "1. ChatGPT — Proposition",
            "2. Claude — Vérification",
            "3. ChatGPT — Résultat final",
          ][i] +
          "\n" +
          r.text +
          "\n(" +
          r.tokens +
          " jetons)";
        block.append(text);
      });
      if (m.error) {
        const err = document.createElement("p");
        err.textContent = m.error;
        block.append(err);
      }
      if (m.status !== "completed") {
        const btn = document.createElement("button");
        btn.className = "btn secondary small";
        btn.textContent = "Reprendre la mission";
        btn.disabled = busy;
        btn.onclick = () => runMission(m.id);
        block.append(btn);
      }
      node.append(block);
    }
    if (!rows.length) {
      node.textContent =
        "Aucune mission pour ce projet. Décris ton objectif pour démarrer.";
    }
    node.scrollTop = node.scrollHeight;
  }
  function renderProjectSelect() {
    const selected = $("projectSelect").value;
    $("projectSelect").replaceChildren(
      ...data.projects.map((p) => {
        const o = document.createElement("option");
        o.value = p.id;
        o.textContent = p.name;
        return o;
      }),
    );
    if (data.projects.some((p) => String(p.id) === selected))
      $("projectSelect").value = selected;
    renderChat();
  }
  async function loadMissions() {
    const r = await fetch("/api/missions", {
      signal: AbortSignal.timeout(15000),
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error || "Historique indisponible.");
    missionList = result.missions;
    renderChat();
  }
  const agents = [
    ["✦", "ChatGPT", "Stratégie, contenu et conception"],
    ["◇", "Claude", "Développement et vérification"],
  ];
  $("agentCards").innerHTML = agents
    .map(
      (a) =>
        `<div class="card agent"><div class="symbol">${a[0]}</div><h3>${a[1]}</h3><p class="muted">${a[2]}</p><span class="tag">API serveur · vérification à l’envoi</span></div>`,
    )
    .join("");
  $("participants").innerHTML = agents
    .map(
      (a) =>
        `<div style="padding:13px 0;border-bottom:1px solid #293149"><strong>${a[0]} ${a[1]}</strong><div class="muted" style="font-size:12px;margin-top:6px">API serveur · vérification à l’envoi</div></div>`,
    )
    .join("");
  const labels = {
    dashboard: "Tableau de bord",
    projects: "Mes projets",
    collab: "Collaboration IA",
    tasks: "Tâches",
    settings: "Paramètres",
  };
  function go(view) {
    document
      .querySelectorAll(".view")
      .forEach((x) => x.classList.toggle("hidden", x.id !== view));
    document
      .querySelectorAll("[data-view]")
      .forEach((x) => x.classList.toggle("active", x.dataset.view === view));
    $("breadcrumb").textContent = "Espace personnel / " + labels[view];
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.addEventListener("click", (e) => {
    let nav = e.target.closest("[data-view]");
    if (nav) go(nav.dataset.view);
    let link = e.target.closest("[data-go]");
    if (link) go(link.dataset.go);
    let del = e.target.closest("[data-delete]");
    if (del && confirm("Supprimer ce projet ?")) {
      data.projects = data.projects.filter((p) => p.id != del.dataset.delete);
      persist();
      renderProjects();
      toast("Projet supprimé");
    }
    let inc = e.target.closest("[data-progress]");
    if (inc) {
      let p = data.projects.find((p) => p.id == inc.dataset.progress);
      if (p) {
        p.progress = Math.min(100, (Number(p.progress) || 0) + 10);
        persist();
        renderProjects();
        toast("Progression mise à jour");
      }
    }
    let chat = e.target.closest("[data-chat]");
    if (chat) {
      let p = data.projects.find((p) => p.id == chat.dataset.chat);
      go("collab");
      $("projectSelect").value = p.id;
      renderChat();
      $("messageInput").value =
        "Organiser le projet : " + p.name + ". " + p.desc;
      $("messageInput").focus();
    }
    let rem = e.target.closest("[data-remove-task]");
    if (rem) {
      data.tasks = data.tasks.filter((t) => t.id != rem.dataset.removeTask);
      persist();
      renderTasks();
      renderProjects();
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches("[data-task]")) {
      let t = data.tasks.find((t) => t.id == e.target.dataset.task);
      if (t) {
        t.done = e.target.checked;
        persist();
        renderTasks();
        renderProjects();
      }
    }
  });
  function openModal() {
    $("modalWrap").classList.remove("hidden");
    $("projectName").focus();
  }
  function closeModal() {
    $("modalWrap").classList.add("hidden");
    $("projectName").value = "";
    $("projectDesc").value = "";
  }
  $("heroNew").onclick = openModal;
  $("newProject").onclick = openModal;
  $("cancelModal").onclick = closeModal;
  $("modalWrap").onclick = (e) => {
    if (e.target === $("modalWrap")) closeModal();
  };
  $("saveProject").onclick = () => {
    let name = $("projectName").value.trim(),
      desc = $("projectDesc").value.trim();
    if (!name) {
      toast("Donne un nom au projet");
      $("projectName").focus();
      return;
    }
    data.projects.unshift({
      id: Date.now(),
      name,
      desc,
      progress: 0,
      category: "Nouveau projet",
    });
    persist();
    renderProjects();
    closeModal();
    go("projects");
    toast("Projet créé !");
  };
  $("addTask").onclick = () => {
    let text = $("taskInput").value.trim();
    if (!text) return;
    data.tasks.push({ id: Date.now(), text, done: false });
    $("taskInput").value = "";
    persist();
    renderTasks();
    renderProjects();
    toast("Tâche ajoutée");
  };
  $("taskInput").onkeydown = (e) => {
    if (e.key === "Enter") $("addTask").click();
  };
  async function api(body, method) {
    const r = await fetch("/api/missions", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(50000),
    });
    let result;
    try {
      result = await r.json();
    } catch {
      throw new Error(
        "Serveur indisponible. Recharge les missions avant de reprendre.",
      );
    }
    if (result.mission) {
      missionList = [
        result.mission,
        ...missionList.filter((m) => m.id !== result.mission.id),
      ];
      renderChat();
    }
    if (!r.ok) throw new Error(result.error || "Appel impossible.");
    return result.mission;
  }
  function lock(value) {
    busy = value;
    [
      "sendMessage",
      "clearChat",
      "resetData",
      "projectSelect",
      "openaiRole",
      "anthropicRole",
      "refreshMissions",
    ].forEach((id) => ($(id).disabled = value));
    renderChat();
  }
  async function runMission(id) {
    if (busy || !ready) return;
    lock(true);
    $("chatError").classList.add("hidden");
    try {
      let m = missionList.find((m) => m.id === id);
      if (!m) {
        await saveQueue;
        m = await api(
          {
            projectId: Number($("projectSelect").value),
            prompt: $("messageInput").value.trim(),
            roles: {
              openai: $("openaiRole").value,
              anthropic: $("anthropicRole").value,
            },
          },
          "POST",
        );
        $("messageInput").value = "";
      }
      while (m.results.length < 3) {
        const step = m.results.length;
        $("chatStatus").textContent = [
          "1/3 · ChatGPT propose…",
          "2/3 · Claude vérifie…",
          "3/3 · ChatGPT finalise…",
        ][step];
        $("missionProgress").value = step;
        m = await api({ id: m.id, step }, "PUT");
        $("missionProgress").value = m.results.length;
      }
      $("chatStatus").textContent = "3/3 · Mission terminée et enregistrée.";
    } catch (e) {
      $("chatError").textContent = /Timeout|Abort/.test(e.name)
        ? "Délai dépassé. Recharge les missions pour vérifier le résultat avant de reprendre."
        : e.message;
      $("chatError").classList.remove("hidden");
      $("chatStatus").textContent =
        "Mission interrompue. Les étapes enregistrées restent disponibles.";
    } finally {
      lock(false);
    }
  }
  function send() {
    if (!$("projectSelect").value) {
      toast("Crée un projet pour démarrer.");
      return;
    }
    const prompt = $("messageInput").value.trim();
    if (!prompt) return;
    if (prompt.length > 8000) {
      toast("Limite de 8 000 caractères.");
      return;
    }
    runMission();
  }
  $("sendMessage").onclick = send;
  $("projectSelect").onchange = () => {
    $("missionProgress").value = 0;
    $("chatStatus").textContent = "";
    renderChat();
  };
  $("refreshMissions").onclick = () =>
    loadMissions().catch((e) => toast(e.message));
  $("messageInput").onkeydown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
  };
  $("clearChat").onclick = () => {
    $("messageInput").value = "";
    $("chatError").classList.add("hidden");
    $("chatStatus").textContent =
      "Nouvelle consigne. Les missions restent dans l’historique.";
  };
  $("exportData").onclick = () => {
    let blob = new Blob(
        [JSON.stringify({ ...data, missions: missionList }, null, 2)],
        { type: "application/json" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "ai-studio-donnees.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Export demandé");
  };
  $("resetData").onclick = () => {
    if (
      confirm("Réinitialiser les projets et tâches ? Les missions enregistrées restent conservées.")
    ) {
      data = JSON.parse(JSON.stringify(seed));
      persist();
      renderProjects();
      renderTasks();
      renderChat();
      toast("Espace réinitialisé");
    }
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
  renderProjects();
  renderTasks();
  renderChat();
  document
    .querySelectorAll("main button,main input,main textarea,main select")
    .forEach((el) => (el.disabled = true));
  fetch("/api/workspace")
    .then(async (r) => {
      if (!r.ok) throw new Error();
      const { state } = await r.json();
      if (state) data = state;
      ready = true;
      renderProjects();
      renderTasks();
      renderChat();
      document
        .querySelectorAll("main button,main input,main textarea,main select")
        .forEach((el) => (el.disabled = false));
      loadMissions().catch((e) => toast(e.message));
      $("saveStatus").textContent =
        "Espace prêt. Sauvegarde automatique activée.";
      if (!state) persist();
    })
    .catch(() => {
      $("saveStatus").textContent =
        "Chargement impossible. Recharge la page pour réessayer.";
      toast("Espace indisponible. Recharge la page pour réessayer.");
      $("exportData").disabled = false;
    });
})();
