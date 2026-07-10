const STORAGE_KEY = "inferinfra.projects";
const PROJECT_PAGE = "projeto.html";

const backboneSpecificationModule =
  await import("../backbone/especificacaoBackbone.js");
const horizontalSpecificationModule =
  await import("../malha-horizontal/especificacaoMalha.js");

const { createDefaultBackboneSpec, calculateBackboneSpecification } =
  backboneSpecificationModule;

const { createDefaultHorizontalSpec, calculateHorizontalSpecification } =
  horizontalSpecificationModule;

const projectId = new URLSearchParams(window.location.search).get("id");
const projectTitleEl = document.getElementById("project-name");
const projectDescriptionEl = document.getElementById("project-description");
const projectNameInputEl = document.getElementById("project-name-input");
const projectDescriptionInputEl = document.getElementById(
  "project-description-input",
);
const modulesGridEl = document.getElementById("modules-grid");

let currentProject = null;
let autosaveTimer = null;

function loadProjects() {
  try {
    const rawProjects = localStorage.getItem(STORAGE_KEY);
    const parsedProjects = rawProjects ? JSON.parse(rawProjects) : [];
    return Array.isArray(parsedProjects) ? parsedProjects : [];
  } catch {
    return [];
  }
}

function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function ensureProjectShape(project) {
  const fallbackProject = {
    id: projectId,
    name: "Projeto sem nome",
    description: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    modules: {},
  };

  const normalizedProject = {
    ...fallbackProject,
    ...project,
  };

  normalizedProject.modules = {
    backbone: {
      enabled: false,
      spec: createDefaultBackboneSpec(),
      ...(project.modules?.backbone || {}),
    },
    horizontal: {
      enabled: false,
      spec: createDefaultHorizontalSpec(),
      ...(project.modules?.horizontal || {}),
    },
  };

  normalizedProject.modules.backbone.spec = {
    ...createDefaultBackboneSpec(),
    ...(project.modules?.backbone?.spec || {}),
    building1: {
      ...createDefaultBackboneSpec().building1,
      ...(project.modules?.backbone?.spec?.building1 || {}),
    },
    building2: {
      ...createDefaultBackboneSpec().building2,
      ...(project.modules?.backbone?.spec?.building2 || {}),
    },
  };

  normalizedProject.modules.horizontal.spec = {
    ...createDefaultHorizontalSpec(),
    ...(project.modules?.horizontal?.spec || {}),
  };

  return normalizedProject;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readProject() {
  const projects = loadProjects();
  const project = projects.find((item) => item.id === projectId);
  return project ? ensureProjectShape(project) : null;
}

function persistCurrentProject() {
  if (!currentProject) return;

  const projects = loadProjects();
  const projectIndex = projects.findIndex(
    (item) => item.id === currentProject.id,
  );
  if (projectIndex === -1) return;

  currentProject.updatedAt = new Date().toISOString();
  projects[projectIndex] = currentProject;
  saveProjects(projects);
}

function scheduleAutosave() {
  if (autosaveTimer) window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(() => persistCurrentProject(), 350);
}

function updateSummary() {
  projectTitleEl.textContent = currentProject?.name || "Projeto não encontrado";
  projectDescriptionEl.textContent =
    currentProject?.description ||
    "Edite os dados do projeto e adicione os módulos necessários.";
  projectNameInputEl.value = currentProject?.name || "";
  projectDescriptionInputEl.value = currentProject?.description || "";
}

function updateGenerateButtonState() {
  const backboneReady = Boolean(currentProject?.modules.backbone.enabled);
  const horizontalReady = Boolean(currentProject?.modules.horizontal.enabled);
}

function buildBackbonePayload() {
  if (!currentProject?.modules.backbone.enabled) return null;
  const spec = currentProject.modules.backbone.spec;

  return {
    predios: [
      {
        nome: spec.building1.name,
        numAndares: Number(spec.building1.floors),
        alturaPiso: Number(spec.building1.floorHeight),
        distRackShaft: Number(spec.building1.rackShaftDistance),
        numLinksAtivos:
          Number(spec.building1.linksPerFloor) * Number(spec.building1.floors),
        dist: 0,
      },
      {
        nome: spec.building2.name,
        numAndares: Number(spec.building2.floors),
        alturaPiso: Number(spec.building2.floorHeight),
        distRackShaft: Number(spec.building2.rackShaftDistance),
        numLinksAtivos:
          Number(spec.building2.linksPerFloor) * Number(spec.building2.floors),
        dist: Number(spec.building2.distance),
        forma: spec.building2.infraMode,
      },
    ],
    velocidade: spec.outdoorSpeed,
    folga: Number(spec.growthMargin),
  };
}

function buildHorizontalPayload() {
  if (!currentProject?.modules.horizontal.enabled) return null;
  const spec = currentProject.modules.horizontal.spec;

  return {
    cableType: spec.cableType,
    growthMargin: Number(spec.growthMargin),
    averageDistanceOption: Number(spec.averageDistanceOption),
    floorsData: spec.floorsData,
  };
}

function renderBackboneResult() {
  const payload = buildBackbonePayload();
  if (!payload) return null;

  const result = calculateBackboneSpecification(
    payload.predios,
    payload.velocidade,
    payload.folga,
  );
  const resultPanel = document.createElement("section");
  resultPanel.className = "result-panel";

  const title = document.createElement("h3");
  title.textContent = "Especificação de Backbone";

  const list = document.createElement("div");
  list.className = "result-list";

  const items = [
    [
      "Fibras especificadas",
      result.fibrasEspecificadas.join(", ") || "Nenhuma",
    ],
    ["DIOs totais", String(result.totalDios)],
    ["Patch cords ópticos", String(result.totalPatchCordsOpticos)],
    ["Switches híbridos", String(result.totalSwitchesHibridos)],
    ["Switches SEQ", String(result.numSwitchesSeq)],
    ["Pigtails", `${result.pigtails.quantidade} ${result.pigtails.tipo}`],
    [
      "Cordões ópticos",
      `${result.cordoesOpticos.quantidade} ${result.cordoesOpticos.tipo}`,
    ],
    [
      "Switch core",
      `${result.switches.core.quantidade} x ${result.switches.core.modelo}`,
    ],
    [
      "Switch acesso",
      `${result.switches.acesso.quantidade} x ${result.switches.acesso.modelo}`,
    ],
    [
      "Transceptores",
      `${result.transceptores.quantidade} x ${result.transceptores.modelo}`,
    ],
  ];

  for (const [labelText, valueText] of items) {
    const item = document.createElement("div");
    item.className = "result-item";
    item.innerHTML = `<strong>${labelText}</strong>: <span>${valueText}</span>`;
    list.append(item);
  }

  resultPanel.append(title, list);
  return resultPanel;
}

function renderRackResult() {
    const horizontalPayload = buildHorizontalPayload();
    if (!horizontalPayload) return null;

    const result = calculateHorizontalSpecification(
        horizontalPayload.cableType,
        horizontalPayload.growthMargin,
        horizontalPayload.averageDistanceOption,
        horizontalPayload.floorsData
    );

    const container = document.createElement("div");
    container.className = "result-panel rack-container-group";

    const mainTitle = document.createElement("h3");
    mainTitle.textContent = "Especificação de Racks por Andar";
    container.append(mainTitle);

    result.detalhePorAndar.forEach((andar) => {
        const resultPanel = document.createElement("div");
        resultPanel.className = "result-floor-rack";
        resultPanel.style.borderTop = "1px solid #ccc";
        resultPanel.style.marginTop = "1rem";
        resultPanel.style.paddingTop = "1rem";

        const title = document.createElement("h4");
        title.textContent = `Rack do Andar ${andar.andar}`;

        const list = document.createElement("div");
        list.className = "result-list";

        const items = [
            ["Rack de 19\" sugerido", `${andar.uNecessarios}U de altura`],
            ["Cálculo interno ocupado", andar.detalheU],
            ["DIOs alocados", `${andar.dioUnits > 0 ? (andar.andar === 1 ? "1x DIO Core + 1x DIO Distribuição" : "1x DIO Distribuição") : "0"} unidades`],
            ["Patch Panels 24 Portas", `${andar.patchPanels} unidades`],
            ["Switches de Acesso 24P", `${andar.switches} unidades`],
            ["DVR de 24 portas", `${andar.dvr} unidades`],
            ["Organizadores de cabos", `${andar.organizadores} unidades`],
            ["Bandejas / Exaustores", "1x Bandeja Fixo (4U) + 1x Exaustor (2U)"],
            ["Régua de Tomadas", `${andar.reguaTomadas} tomadas`],
            ["Porcas Gaiola / Parafusos", `${andar.porcasGaiola} unidades`]
        ];

        for (const [labelText, valueText] of items) {
            const item = document.createElement("div");
            item.className = "result-item";
            item.innerHTML = `<strong>${labelText}</strong>: <span>${valueText}</span>`;
            list.append(item);
        }

        resultPanel.append(title, list);
        container.append(resultPanel);
    });

    return container;
}

function renderHorizontalResult() {
    const payload = buildHorizontalPayload();
    if (!payload) return null;

    const result = calculateHorizontalSpecification(
        payload.cableType,
        payload.growthMargin,
        payload.averageDistanceOption,
        payload.floorsData
    );

    const resultPanel = document.createElement("section");
    resultPanel.className = "result-panel";

    const title = document.createElement("h3");
    title.textContent = "Especificação de Malha Horizontal";

    const list = document.createElement("div");
    list.className = "result-list";

    const items = [
        ["Categoria do cabo / Conectores", `${result.cabeamento.categoria} UTP`],
        ["Metragem total de cabo", `${result.cabeamento.metragemTotal} metros`],
        ["Caixas de cabo (305m)", `${result.cabeamento.caixas305m} caixas`],
        ["Conectores Fêmea RJ-45", `${result.areaDeTrabalho.conectoresFemea} unidades`],
        ["Patch Cords Usuário (Azul)", `${result.cordoes.patchCordsUsuario.quantidade} un (${result.cordoes.patchCordsUsuario.tamanho}m)`],
        ["Patch Cords Rack - Azul (Dados)", `${result.cordoes.patchCordsRack.azulDados.quantidade} un (${result.cordoes.patchCordsRack.azulDados.tamanho}m)`],
        ["Patch Cords Rack - Amarelo (Voz)", `${result.cordoes.patchCordsRack.amareloVoz.quantidade} un (${result.cordoes.patchCordsRack.amareloVoz.tamanho}m)`],
        ["Patch Cords Rack - Vermelho (CFTV)", `${result.cordoes.patchCordsRack.vermelhoCftv.quantidade} un (${result.cordoes.patchCordsRack.vermelhoCftv.tamanho}m)`],
        ["Etiquetas de Identificação (Cabos/Tomadas)", `${result.areaDeTrabalho.etiquetasTomada + result.identificacao.etiquetasPatchCord} unidades`]
    ];

    for (const [labelText, valueText] of items) {
        const item = document.createElement("div");
        item.className = "result-item";
        item.innerHTML = `<strong>${labelText}</strong>: <span>${valueText}</span>`;
        list.append(item);
    }

    resultPanel.append(title, list);
    return resultPanel;
}

const specListEl = document.querySelector(".spec-list");

function renderGenerationArea() {
    document.querySelectorAll(".specification-output-wrapper, .result-panel").forEach((el) => el.remove());

    const outputWrapper = document.createElement("div");
    outputWrapper.className = "specification-output-wrapper";

    const backboneResult = renderBackboneResult();
    if (backboneResult) {
        outputWrapper.appendChild(backboneResult);
    }

    const horizontalResult = renderHorizontalResult();
    if (horizontalResult) {
        outputWrapper.appendChild(horizontalResult);
    }

    const rackResult = renderRackResult();
    if (rackResult) {
        outputWrapper.appendChild(rackResult);
    }

    if (outputWrapper.hasChildNodes() && specListEl) {
        specListEl.appendChild(outputWrapper);
    }
}

function renderBackboneCard() {
  const card = document.createElement("article");
  card.className = "module-card";
  card.dataset.module = "backbone";

  const spec = currentProject.modules.backbone.spec;
  card.innerHTML = `
        <header>
            <p class="eyebrow">Módulo 01</p>
            <h3>Backbone</h3>
            <p class="module-status">${currentProject.modules.backbone.enabled ? "Ativo" : "Não adicionado"}</p>
        </header>
        <div class="module-actions">
            <button type="button" data-action="toggle-backbone">${currentProject.modules.backbone.enabled ? "Remover backbone" : "Adicionar backbone"}</button>
        </div>
        <div class="spec-panel" ${!currentProject.modules.backbone.enabled ? "hidden" : ""}>
            ${
              currentProject.modules.backbone.enabled
                ? `
            <fieldset>
                <legend>Configurações gerais do link</legend>
                <div class="spec-grid">
                    <div class="field">
                        <label for="backbone-outdoor-speed">Velocidade do link externo</label>
                        <select id="backbone-outdoor-speed" data-module-field="outdoorSpeed">
                            <option value="1 GB" ${spec.outdoorSpeed === "1 GB" ? "selected" : ""}>1 Gbps (Gigabit)</option>
                            <option value="10 GB" ${spec.outdoorSpeed === "10 GB" ? "selected" : ""}>10 Gbps (10 Gigabit)</option>
                        </select>
                    </div>
                    <div class="field">
                        <label for="backbone-growth-margin">Margem de crescimento / folga (%)</label>
                        <input id="backbone-growth-margin" data-module-field="growthMargin" type="number" min="0" value="${spec.growthMargin}" />
                    </div>
                </div>
            </fieldset>
            <fieldset>
                <legend>Prédio 1 (onde fica a SEQ)</legend>
                <div class="spec-grid">
                    <div class="field"><label for="backbone-building-1-name">Nome do prédio</label><input id="backbone-building-1-name" data-module-field="building1.name" type="text" value="${escapeHtml(spec.building1.name)}" /></div>
                    <div class="field"><label for="backbone-building-1-floors">Número de andares</label><input id="backbone-building-1-floors" data-module-field="building1.floors" type="number" min="1" value="${spec.building1.floors}" /></div>
                    <div class="field"><label for="backbone-building-1-floor-height">Altura do piso (m)</label><input id="backbone-building-1-floor-height" data-module-field="building1.floorHeight" type="number" min="1" value="${spec.building1.floorHeight}" /></div>
                    <div class="field"><label for="backbone-building-1-rack-shaft-dist">Distância rack-shaft (m)</label><input id="backbone-building-1-rack-shaft-dist" data-module-field="building1.rackShaftDistance" type="number" min="0" value="${spec.building1.rackShaftDistance}" /></div>
                    <div class="field"><label for="backbone-building-1-links-per-floor">Links ativos por andar</label><input id="backbone-building-1-links-per-floor" data-module-field="building1.linksPerFloor" type="number" min="1" value="${spec.building1.linksPerFloor}" /></div>
                </div>
            </fieldset>
            <fieldset>
                <legend>Prédio 2 (remoto)</legend>
                <div class="spec-grid">
                    <div class="field"><label for="backbone-building-2-name">Nome do prédio</label><input id="backbone-building-2-name" data-module-field="building2.name" type="text" value="${escapeHtml(spec.building2.name)}" /></div>
                    <div class="field"><label for="backbone-building-2-floors">Número de andares</label><input id="backbone-building-2-floors" data-module-field="building2.floors" type="number" min="1" value="${spec.building2.floors}" /></div>
                    <div class="field"><label for="backbone-building-2-floor-height">Altura do piso (m)</label><input id="backbone-building-2-floor-height" data-module-field="building2.floorHeight" type="number" min="1" value="${spec.building2.floorHeight}" /></div>
                    <div class="field"><label for="backbone-building-2-rack-shaft-dist">Distância rack-shaft (m)</label><input id="backbone-building-2-rack-shaft-dist" data-module-field="building2.rackShaftDistance" type="number" min="0" value="${spec.building2.rackShaftDistance}" /></div>
                    <div class="field"><label for="backbone-building-2-links-per-floor">Links ativos por andar</label><input id="backbone-building-2-links-per-floor" data-module-field="building2.linksPerFloor" type="number" min="1" value="${spec.building2.linksPerFloor}" /></div>
                    <div class="field"><label for="backbone-building-2-distance">Distância entre prédios (m)</label><input id="backbone-building-2-distance" data-module-field="building2.distance" type="number" min="1" value="${spec.building2.distance}" /></div>
                    <div class="field"><label for="backbone-building-2-inframode">Infraestrutura externa</label><select id="backbone-building-2-inframode" data-module-field="building2.infraMode"><option value="subterraneo" ${spec.building2.infraMode === "subterraneo" ? "selected" : ""}>Subterrâneo (Duto)</option><option value="aereo" ${spec.building2.infraMode === "aereo" ? "selected" : ""}>Aéreo (Posteado)</option></select></div>
                </div>
            </fieldset>`
                : ""
            }
        </div>
    `;
  return card;
}

function renderHorizontalCard() {
  const card = document.createElement("article");
  card.className = "module-card";
  card.dataset.module = "horizontal";

  const spec = currentProject.modules.horizontal.spec;
  const currentDist = spec.averageDistanceOption;

  let floorsHtml = "";
  spec.floorsData.forEach((floor, index) => {
    floorsHtml += `
            <fieldset style="margin-top: 1rem;">
                <legend>Andar ${floor.floorIndex}</legend>
                <div class="spec-grid">
                    <div class="field">
                        <label>Pontos Telecom</label>
                        <input data-floor-index="${index}" data-floor-field="telecomPoints" type="number" min="0" value="${floor.telecomPoints || 0}" />
                    </div>
                    <div class="field">
                        <label>Pontos Rede</label>
                        <input data-floor-index="${index}" data-floor-field="networkPoints" type="number" min="0" value="${floor.networkPoints || 0}" />
                    </div>
                    <div class="field">
                        <label>Pontos CFTV</label>
                        <input data-floor-index="${index}" data-floor-field="cftvPoints" type="number" min="0" value="${floor.cftvPoints || 0}" />
                    </div>
                </div>
            </fieldset>
        `;
  });

  card.innerHTML = `
        <header>
            <p class="eyebrow">Módulo 02</p>
            <h3>Malha horizontal</h3>
            <p class="module-status">${currentProject.modules.horizontal.enabled ? "Ativa" : "Não adicionada"}</p>
        </header>
        <div class="module-actions">
            <button type="button" data-action="toggle-horizontal">${currentProject.modules.horizontal.enabled ? "Remover malha horizontal" : "Adicionar malha horizontal"}</button>
        </div>
        <div class="spec-panel" ${!currentProject.modules.horizontal.enabled ? "hidden" : ""}>
            ${
              currentProject.modules.horizontal.enabled
                ? `
            <fieldset>
                <legend>Configurações globais da malha</legend>
                <div class="spec-grid">
                    <div class="field">
                        <label for="horizontal-cable-type">Tipo de cabo</label>
                        <select id="horizontal-cable-type" data-module-field="cableType">
                            <option value="Cat5" ${spec.cableType === "Cat5" ? "selected" : ""}>Cat5 (100 Mbps)</option>
                            <option value="Cat5e" ${spec.cableType === "Cat5e" ? "selected" : ""}>Cat5e (1 Gbps)</option>
                            <option value="Cat6" ${spec.cableType === "Cat6" ? "selected" : ""}>Cat6 (1 Gbps / 10 Gbps a curtas distâncias)</option>
                            <option value="Cat6A" ${spec.cableType === "Cat6A" ? "selected" : ""}>Cat6A (10 Gbps)</option>
                            <option value="Cat7" ${spec.cableType === "Cat7" ? "selected" : ""}>Cat7 (10 Gbps / 40 Gbps a curtas distâncias)</option>
                        </select>
                    </div>
                    <div class="field">
                        <label for="horizontal-floors-count">Quantidade de andares</label>
                        <input id="horizontal-floors-count" data-module-field="floorsCount" type="number" min="1" value="${spec.floorsData.length}" />
                    </div>
                    <div class="field">
                        <label for="horizontal-average-distance">Distância média por ponto (m)</label>
                        <select id="horizontal-average-distance" data-module-field="averageDistanceOption">
                            <option value="25" ${Number(currentDist) === 25 ? "selected" : ""}>25 metros</option>
                            <option value="30" ${Number(currentDist) === 30 || !currentDist ? "selected" : ""}>30 metros</option>
                        </select>
                    </div>
                    <div class="field">
                        <label for="horizontal-growth-margin">Margem de crescimento (%)</label>
                        <input id="horizontal-growth-margin" data-module-field="growthMargin" type="number" min="0" value="${spec.growthMargin}" />
                    </div>
                </div>
            </fieldset>
            <div class="floors-container">
                ${floorsHtml}
            </div>`
                : ""
            }
        </div>
    `;
  return card;
}

function renderModules() {
  if (!currentProject) {
    modulesGridEl.innerHTML = "";
    return;
  }
  modulesGridEl.replaceChildren(renderBackboneCard(), renderHorizontalCard());
  updateGenerateButtonState();
}

function updateModuleField(moduleName, fieldPath, value) {
  const moduleState = currentProject.modules[moduleName];
  const pathParts = fieldPath.split(".");

  if (pathParts.length === 1) {
    const key = pathParts[0];
    moduleState.spec[key] =
      typeof moduleState.spec[key] === "number" ? Number(value) : value;

    if (moduleName === "horizontal" && key === "floorsCount") {
      adjustHorizontalFloorsData(Number(value));
    }
    return;
  }

  const [groupName, propertyName] = pathParts;
  moduleState.spec[groupName][propertyName] =
    typeof moduleState.spec[groupName][propertyName] === "number"
      ? Number(value)
      : value;
}

function adjustHorizontalFloorsData(targetCount) {
  const spec = currentProject.modules.horizontal.spec;
  if (!spec.floorsData) spec.floorsData = [];

  const currentCount = spec.floorsData.length;

  if (targetCount > currentCount) {
    for (let i = currentCount + 1; i <= targetCount; i++) {
      spec.floorsData.push({
        floorIndex: i,
        telecomPoints: 12,
        networkPoints: 24,
        cftvPoints: 6,
      });
    }
  } else if (targetCount < currentCount) {
    spec.floorsData = spec.floorsData.slice(0, targetCount);
  }
}

function readNumericValue(input) {
  const numericValue = Number(input.value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function syncModuleField(event) {
  const target = event.target;
  const moduleCard = target.closest("[data-module]");

  if (!moduleCard) return;

  if (target.matches("[data-module-field]")) {
    const moduleName = moduleCard.dataset.module;
    const fieldPath = target.dataset.moduleField;
    const value =
      target.type === "number" ? readNumericValue(target) : target.value;

    updateModuleField(moduleName, fieldPath, value);

    if (fieldPath === "floorsCount") {
      renderModules();
    }

    scheduleAutosave();
    updateGenerateButtonState();
    renderGenerationArea();
  } else if (target.matches("[data-floor-field]")) {
    const floorIndex = Number(target.dataset.floorIndex);
    const floorField = target.dataset.floorField;
    const value = readNumericValue(target);

    currentProject.modules.horizontal.spec.floorsData[floorIndex][floorField] =
      value;

    scheduleAutosave();
    updateGenerateButtonState();
    renderGenerationArea();
  }
}

function toggleModule(moduleName) {
  currentProject.modules[moduleName].enabled =
    !currentProject.modules[moduleName].enabled;

  if (moduleName === "backbone" && currentProject.modules[moduleName].enabled) {
    currentProject.modules[moduleName].spec = {
      ...createDefaultBackboneSpec(),
      ...currentProject.modules[moduleName].spec,
    };
  }

  if (
    moduleName === "horizontal" &&
    currentProject.modules[moduleName].enabled
  ) {
    currentProject.modules[moduleName].spec = {
      ...createDefaultHorizontalSpec(),
      ...currentProject.modules[moduleName].spec,
    };
  }

  renderModules();
  renderGenerationArea();
  persistCurrentProject();
}

function handleModuleAction(event) {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) return;

  const action = actionButton.dataset.action;
  if (action === "toggle-backbone") toggleModule("backbone");
  if (action === "toggle-horizontal") toggleModule("horizontal");
}

function attachProjectInputListeners() {
  projectNameInputEl.addEventListener("input", () => {
    if (!currentProject) return;
    currentProject.name = projectNameInputEl.value.trim() || "Projeto sem nome";
    updateSummary();
    scheduleAutosave();
  });

  projectDescriptionInputEl.addEventListener("input", () => {
    if (!currentProject) return;
    currentProject.description = projectDescriptionInputEl.value.trim();
    updateSummary();
    scheduleAutosave();
  });

  modulesGridEl.addEventListener("input", syncModuleField);
  modulesGridEl.addEventListener("change", syncModuleField);
  modulesGridEl.addEventListener("click", handleModuleAction);
}

function renderMissingProject() {
  projectTitleEl.textContent = "Projeto não encontrado";
  projectDescriptionEl.textContent = `Abra um projeto existente em ${PROJECT_PAGE} a partir da lista de projetos.`;
  projectNameInputEl.value = "";
  projectDescriptionInputEl.value = "";
  projectNameInputEl.disabled = true;
  projectDescriptionInputEl.disabled = true;
  modulesGridEl.innerHTML = "";
}

function initProjectPage() {
  attachProjectInputListeners();
  currentProject = readProject();

  if (!currentProject) {
    renderMissingProject();
    return;
  }

  updateSummary();
  renderModules();
  renderGenerationArea();
  persistCurrentProject();
}

window.addEventListener("storage", ({ key }) => {
  if (key !== STORAGE_KEY || !currentProject) return;
  currentProject = readProject();
  if (!currentProject) {
    renderMissingProject();
    return;
  }
  updateSummary();
  renderModules();
  renderGenerationArea();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProjectPage);
} else {
  initProjectPage();
}
