const STORAGE_KEY = "task-current-items";
const STATUS_PENDING = "pending";
const STATUS_IN_PROGRESS = "in progress";
const STATUS_COMPLETED = "completed";
const STATUS_ORDER = [STATUS_PENDING, STATUS_IN_PROGRESS, STATUS_COMPLETED];
const AUTO_STATUS_INTERVAL_MS = 30000;

const form = document.querySelector("#task-form");
const input = document.querySelector("#task-input");
const statusInput = document.querySelector("#task-status");
const startInput = document.querySelector("#task-start");
const endInput = document.querySelector("#task-end");
const list = document.querySelector("#task-list");
const stats = document.querySelector("#stats");
const template = document.querySelector("#task-template");
const filterButtons = [...document.querySelectorAll(".filter")];

let tasks = loadTasks();
let activeFilter = "all";

render();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  const startTime = startInput.value ? new Date(startInput.value).toISOString() : "";
  const endTime = endInput.value ? new Date(endInput.value).toISOString() : "";

  if (!text) {
    return;
  }

  if (startTime && endTime && new Date(startTime) > new Date(endTime)) {
    window.alert("The end time must be after the start time.");
    return;
  }

  tasks.unshift({
    id: crypto.randomUUID(),
    text,
    status: getValidStatus(statusInput.value),
    subtasks: [],
    startTime,
    endTime
  });

  input.value = "";
  statusInput.value = STATUS_PENDING;
  startInput.value = "";
  endInput.value = "";
  applyAutomaticStatuses();
  persist();
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    filterButtons.forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });

    render();
  });
});

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : seedTasks();
    return normalizeTasks(parsed);
  } catch {
    return normalizeTasks(seedTasks());
  }
}

function seedTasks() {
  return [
    {
      id: "seed-1",
      text: "Sketch today's top priority",
      status: STATUS_PENDING,
      subtasks: [
        createSubtask("Outline the deliverable"),
        createSubtask("Block focused work time")
      ],
      startTime: "",
      endTime: ""
    },
    {
      id: "seed-2",
      text: "Clear one small lingering task",
      status: STATUS_COMPLETED,
      subtasks: [],
      startTime: "",
      endTime: ""
    }
  ];
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function render() {
  list.innerHTML = "";
  const changedBySchedule = applyAutomaticStatuses();

  if (changedBySchedule) {
    persist();
  }

  const visibleTasks = tasks.filter((task) => {
    return activeFilter === "all" ? true : task.status === activeFilter;
  });

  if (visibleTasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "Nothing here yet. Add a task or switch filters.";
    list.append(empty);
  } else {
    visibleTasks.forEach((task) => {
      const fragment = template.content.cloneNode(true);
      const item = fragment.querySelector(".task-item");
      const text = fragment.querySelector(".task-text");
      const schedule = fragment.querySelector(".task-schedule");
      const statusBadge = fragment.querySelector(".task-status-badge");
      const statusSelect = fragment.querySelector(".task-status-select");
      const subtaskButton = fragment.querySelector(".task-subtask");
      const subtaskList = fragment.querySelector(".subtask-list");
      const editButton = fragment.querySelector(".task-edit");
      const deleteButton = fragment.querySelector(".task-delete");

      item.dataset.id = task.id;
      item.dataset.status = task.status;
      item.classList.toggle("is-done", task.status === STATUS_COMPLETED);
      text.textContent = task.text;
      statusBadge.textContent = task.status;
      statusSelect.value = task.status;
      schedule.textContent = formatSchedule(task);
      schedule.hidden = !schedule.textContent;

      statusSelect.addEventListener("change", () => {
        updateTask(task.id, { status: getValidStatus(statusSelect.value) });
      });

      editButton.addEventListener("click", () => {
        const nextText = window.prompt("Edit task", task.text);

        if (nextText === null) {
          return;
        }

        const trimmed = nextText.trim();
        if (!trimmed) {
          return;
        }

        updateTask(task.id, { text: trimmed });
      });

      subtaskButton.addEventListener("click", () => {
        const nextText = window.prompt("New subtask");

        if (nextText === null) {
          return;
        }

        const trimmed = nextText.trim();
        if (!trimmed) {
          return;
        }

        tasks = tasks.map((itemTask) => {
          if (itemTask.id !== task.id) {
            return itemTask;
          }

          return {
            ...itemTask,
            subtasks: [...itemTask.subtasks, createSubtask(trimmed)]
          };
        });

        persist();
        render();
      });

      renderSubtasks(task, subtaskList);

      deleteButton.addEventListener("click", () => {
        tasks = tasks.filter((itemTask) => itemTask.id !== task.id);
        persist();
        render();
      });

      list.append(fragment);
    });
  }

  const completedCount = tasks.filter((task) => task.status === STATUS_COMPLETED).length;
  const scheduledCount = tasks.filter((task) => task.startTime || task.endTime).length;
  stats.innerHTML = `<span>${tasks.length} total</span><span>${completedCount} completed</span><span>${scheduledCount} scheduled</span>`;
}

function updateTask(id, changes) {
  tasks = tasks.map((task) => {
    if (task.id !== id) {
      return task;
    }

    return normalizeTask({ ...task, ...changes });
  });

  applyAutomaticStatuses();
  persist();
  render();
}

function createSubtask(text) {
  return {
    id: crypto.randomUUID(),
    text,
    done: false
  };
}

function normalizeTasks(items) {
  return items.map((task) => normalizeTask(task));
}

function normalizeTask(task) {
  return {
    id: task.id ?? crypto.randomUUID(),
    text: `${task.text ?? ""}`.trim(),
    status: task.done ? STATUS_COMPLETED : getValidStatus(task.status),
    subtasks: Array.isArray(task.subtasks)
      ? task.subtasks.map((subtask) => ({
          id: subtask.id ?? crypto.randomUUID(),
          text: `${subtask.text ?? ""}`.trim(),
          done: Boolean(subtask.done)
        })).filter((subtask) => subtask.text)
      : [],
    startTime: normalizeTime(task.startTime),
    endTime: normalizeTime(task.endTime)
  };
}

function normalizeTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function getValidStatus(status) {
  return STATUS_ORDER.includes(status) ? status : STATUS_PENDING;
}

function applyAutomaticStatuses() {
  const now = Date.now();
  let changed = false;

  tasks = tasks.map((task) => {
    const automaticStatus = getScheduledStatus(task, now);

    if (!automaticStatus || automaticStatus === task.status) {
      return task;
    }

    changed = true;
    return {
      ...task,
      status: automaticStatus
    };
  });

  return changed;
}

function getScheduledStatus(task, now) {
  const start = task.startTime ? new Date(task.startTime).getTime() : null;
  const end = task.endTime ? new Date(task.endTime).getTime() : null;

  if (start && now < start) {
    return STATUS_PENDING;
  }

  if (end && now >= end) {
    return STATUS_COMPLETED;
  }

  if ((start && now >= start) || (end && now < end)) {
    return STATUS_IN_PROGRESS;
  }

  return "";
}

function formatSchedule(task) {
  if (!task.startTime && !task.endTime) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });

  if (task.startTime && task.endTime) {
    return `Scheduled ${formatter.format(new Date(task.startTime))} to ${formatter.format(new Date(task.endTime))}`;
  }

  if (task.startTime) {
    return `Starts ${formatter.format(new Date(task.startTime))}`;
  }

  return `Ends ${formatter.format(new Date(task.endTime))}`;
}

function renderSubtasks(task, container) {
  container.innerHTML = "";

  if (!task.subtasks.length) {
    return;
  }

  task.subtasks.forEach((subtask) => {
    const item = document.createElement("li");
    item.className = "subtask-item";

    const label = document.createElement("label");
    label.className = "subtask-main";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = subtask.done;
    toggle.className = "subtask-toggle";

    const text = document.createElement("span");
    text.className = "subtask-text";
    text.textContent = subtask.text;
    text.classList.toggle("is-done", subtask.done);

    toggle.addEventListener("change", () => {
      tasks = tasks.map((itemTask) => {
        if (itemTask.id !== task.id) {
          return itemTask;
        }

        return {
          ...itemTask,
          subtasks: itemTask.subtasks.map((itemSubtask) => {
            if (itemSubtask.id !== subtask.id) {
              return itemSubtask;
            }

            return { ...itemSubtask, done: toggle.checked };
          })
        };
      });

      persist();
      render();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "ghost-button subtask-delete";
    deleteButton.textContent = "Remove";
    deleteButton.addEventListener("click", () => {
      tasks = tasks.map((itemTask) => {
        if (itemTask.id !== task.id) {
          return itemTask;
        }

        return {
          ...itemTask,
          subtasks: itemTask.subtasks.filter((itemSubtask) => itemSubtask.id !== subtask.id)
        };
      });

      persist();
      render();
    });

    label.append(toggle, text);
    item.append(label, deleteButton);
    container.append(item);
  });
}

window.setInterval(() => {
  if (applyAutomaticStatuses()) {
    persist();
    render();
  }
}, AUTO_STATUS_INTERVAL_MS);
