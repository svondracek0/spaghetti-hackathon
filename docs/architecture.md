# Debate Preparation App — Architecture

## Overview

A web application that lets users create and manage **Preparations** — structured objects representing the user's preparation for an upcoming debate. The app automatically tracks previously encountered opponents across preparations.

---

## Core Data Model

### Preparation

A preparation captures everything the user needs to know before entering a debate:

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier |
| `title` | string | User-given name for this preparation |
| `status` | enum | `Preparing` or `Ready` |
| `createdAt` | datetime | When the preparation was created |
| `updatedAt` | datetime | Last modification timestamp |
| **Debate Info** | | |
| `debateDate` | date (optional) | When the debate takes place |
| `debateFormat` | string (optional) | Format/type of debate (e.g. panel, 1v1, roundtable) |
| `debateContext` | text | Additional context (venue, audience, rules, etc.) |
| **Topic** | | |
| `topic` | string | The main topic/motion being debated |
| `userPosition` | text | The user's stance on the topic |
| **Opponents** | | |
| `opponents` | Opponent[] | List of opponents in this debate |
| **Strategy** | | |
| `winStrategy` | text | How the user plans to win |
| `keyArguments` | text[] | Main arguments to make |
| `strategyTopics` | StrategyTopic[] | Topic-specific strategy entries (see below) |

### StrategyTopic

A focused strategy block tied to a specific sub-topic or angle:

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier |
| `title` | string | Name / label for this topic angle |
| `articleIds` | string[] | IDs of relevant articles to reference |
| `sneakyQuestions` | text[] | Questions designed to put the opponent on the spot |
| `arguments` | text[] | Key arguments to make about this topic |
| `whyBadForOpponent` | text | Overview of why this topic is problematic for the opponent |


### Opponent

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier |
| `name` | string | Opponent's name |
| `organization` | string (optional) | Affiliated organization |
| `knownPositions` | text (optional) | Known stances and past positions |
| `debateStyle` | text (optional) | Observed debate style/tendencies |
| `previousEncounters` | number | Auto-tracked: how many past preparations include this opponent |

---

## UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Top Bar (App name / branding)                               │
├─────────────────┬────────────────────────────────────────────┤
│                 │                                            │
│   Sidebar       │         Main Content Area                  │
│                 │                                            │
│  ┌───────────┐  │   Displays the selected preparation:      │
│  │ Prep 1    │  │   - Debate info                           │
│  │ Prep 2    │  │   - Topic & position                      │
│  │ Prep 3    │  │   - Opponents (with encounter badges)     │
│  │ ...       │  │   - Win strategy & key arguments           │
│  │           │  │   - Strategy topics (articles, questions,  │
│  │           │  │     arguments, opponent weaknesses)        │
│  │           │  │                                            │
│  │           │  │   When nothing is selected:                │
│  │           │  │   "Create or select a preparation"        │
│  │           │  │                                            │
│  ├───────────┤  │                                            │
│  │ + New     │  │                                            │
│  │   Prep    │  │                                            │
│  └───────────┘  │                                            │
├─────────────────┴────────────────────────────────────────────┤
```

- **Left Sidebar**: Scrollable list of saved preparations, sorted by most recent. A "New Preparation" button is pinned at the bottom.
- **Main Content Area**: Shows the detail view / edit form for the selected preparation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | **React 19** (Vite + TypeScript) |
| UI Components | **shadcn/ui** (Radix primitives + Tailwind CSS) |
| Routing | **React Router** |
| State Management | React `useState` / `useContext` (upgrade to Zustand if needed) |
| Backend | **Python (FastAPI)** in `src/spaghetti_hackathon/` |
| Database | SQLite (via SQLAlchemy) for initial development |

---

## Frontend File Structure

```
frontend/src/
├── components/
│   ├── ui/                 # shadcn/ui generated components
│   ├── Sidebar.tsx          # Left sidebar with prep list + new button
│   ├── PrepCard.tsx         # Sidebar list item for a preparation
│   ├── PrepDetail.tsx       # Main content: view/edit a preparation
│   ├── PrepForm.tsx         # Form for creating/editing a preparation
│   ├── OpponentAutocomplete.tsx  # Opponent input with autocomplete dropdown
│   └── StatusBadge.tsx      # Preparing / Ready status badge
├── hooks/
│   └── usePreparations.ts   # Custom hook for API calls
├── types/
│   └── index.ts             # TypeScript interfaces (Preparation, Opponent, etc.)
├── lib/
│   └── utils.ts             # shadcn/ui utility (cn helper)
├── App.tsx
├── main.tsx
└── index.css                # Tailwind + global styles
```

---

## Key Features

1. **Create Preparation** — Fill in debate info, topic, opponents, and strategy via a form
2. **View/Edit Preparation** — Select from sidebar to view; click to edit inline
3. **Opponent Autocomplete** — Dropdown of previously used opponents when adding; badge with encounter count
4. **Status Tracking** — Each preparation is either `Preparing` or `Ready`
5. **Sidebar Navigation** — Chat-style left panel listing all preparations

---

## Resolved Decisions

| Decision | Choice |
|---|---|
| Language | **TypeScript** (`.tsx` / `.ts`) |
| Backend | **Python (FastAPI)** — wired from the start |
| Opponent autocomplete | **Yes** — dropdown of previously used opponents |
| Preparation statuses | **Preparing** / **Ready** |
| Sidebar search/filter | **No** — keep it simple |
