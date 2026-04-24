# Task Current

Task Current is a lightweight browser-based to-do app built with plain HTML, CSS, and JavaScript. It stores tasks in `localStorage`, supports task statuses, nested subtasks, and automatic status changes based on a scheduled time slot.

## Features

- Create tasks with one of three statuses: `pending`, `in progress`, or `completed`
- Add subtasks under a main task
- Set a start and end time for a task
- Automatically switch task status based on the current time:
  - Before the start time: `pending`
  - Between the start and end time: `in progress`
  - After the end time: `completed`
- Filter tasks by status
- Edit or delete tasks and remove subtasks
- Persist all data locally in the browser

## Project Structure

- `index.html` defines the app layout and UI
- `styles.css` contains the visual design and responsive layout
- `app.js` manages task state, rendering, `localStorage`, subtasks, and scheduled status updates

## Running the Project

This is a static frontend project. No build step or package install is required.

1. Open `index.html` directly in a browser, or
2. Serve the folder with any simple static server

Example with Python:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## How Scheduling Works

- If a task has both a start and end time, the app updates its status automatically as time moves forward.
- If a task has only a start time, it becomes `in progress` once that time is reached.
- If a task has only an end time, it remains `in progress` until the end time, then becomes `completed`.
- Automatic checks run periodically while the page is open.

## Storage

Task data is saved in the browser under the local storage key:

```txt
task-current-items
```

Older saved tasks that used a simple completed flag are normalized into the new status-based format when the app loads.

## Notes

- Scheduled updates happen while the page is open in the browser.
- Because the app uses browser local storage, tasks are saved per browser and per device.
