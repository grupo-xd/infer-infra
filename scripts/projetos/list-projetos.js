const STORAGE_KEY = "inferinfra.projects"
const PROJECT_PAGE = "projeto.html"

const projectsSection = document.getElementById("projects-section")
const newProjectButton = document.getElementById("new-project-button")
const newProjectModal = document.getElementById("new-project-modal")
const newProjectForm = document.getElementById("new-project-form")
const projectNameInput = document.getElementById("project-name")
const projectDescriptionInput = document.getElementById("project-description")
const cancelProjectButton = document.getElementById("cancel-project")

function loadProjects() {
    try {
        const rawProjects = localStorage.getItem(STORAGE_KEY)
        const parsedProjects = rawProjects ? JSON.parse(rawProjects) : []

        if (!Array.isArray(parsedProjects)) return []

        return parsedProjects.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt)
            const dateB = new Date(b.updatedAt || b.createdAt)
            return dateB - dateA
        })
    } catch {
        return []
    }
}

function saveProjects(projects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

function createId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID()
    }

    return `project-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createDefaultProjectState(name, description) {
    const now = new Date().toISOString()

    return {
        id: createId(),
        name,
        description,
        createdAt: now,
        updatedAt: now,
        modules: {
            backbone: {
                enabled: false,
            },
            horizontal: {
                enabled: false,
            },
        },
    }
}

function formatProjectDate(dateString) {
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(dateString))
}

function renderProjects() {
    const projects = loadProjects()
    const fragment = []

    if (projects.length === 0) {
        const emptyState = document.createElement("p")
        emptyState.className = "empty-state"
        emptyState.textContent = "Nenhum projeto criado ainda. Use o botão para criar o primeiro."
        fragment.push(emptyState)
    }

    for (const project of projects) {
        const projectCard = document.createElement("article")
        projectCard.className = "project-card"

        const projectTitle = document.createElement("h3")
        projectTitle.textContent = project.name

        const projectDescription = document.createElement("p")
        projectDescription.textContent = project.description || "Sem descrição informada."

        const projectMeta = document.createElement("small")
        projectMeta.textContent = `Atualizado em ${formatProjectDate(project.updatedAt || project.createdAt)}`

        const openProjectLink = document.createElement("a")
        openProjectLink.href = `${PROJECT_PAGE}?id=${encodeURIComponent(project.id)}`
        openProjectLink.textContent = "Abrir projeto"

        projectCard.append(projectTitle, projectDescription, projectMeta, openProjectLink)
        fragment.push(projectCard)
    }

    projectsSection.replaceChildren(...fragment, newProjectButton)
}

function openModal() {
    newProjectForm.reset()

    if (typeof newProjectModal.showModal === "function") {
        newProjectModal.showModal()
        return
    }

    newProjectModal.setAttribute("open", "")
}

function closeModal() {
    if (typeof newProjectModal.close === "function") {
        newProjectModal.close()
        return
    }

    newProjectModal.removeAttribute("open")
}

newProjectButton.addEventListener("click", openModal)
cancelProjectButton.addEventListener("click", closeModal)

newProjectForm.addEventListener("submit", (event) => {
    event.preventDefault()

    const name = projectNameInput.value.trim()
    const description = projectDescriptionInput.value.trim()

    if (!name) {
        projectNameInput.focus()
        return
    }

    const projects = loadProjects()
    const project = createDefaultProjectState(name, description)

    projects.unshift(project)
    saveProjects(projects)
    closeModal()
    window.location.href = `${PROJECT_PAGE}?id=${encodeURIComponent(project.id)}`
})

window.addEventListener("storage", ({ key }) => {
    if (key === STORAGE_KEY) {
        renderProjects()
    }
})

document.addEventListener("DOMContentLoaded", renderProjects)