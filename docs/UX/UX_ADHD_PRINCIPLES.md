# UX and ADHD design principles

These come from [TIME_MANAGEMENT_RESEARCH.md](../RESEARCH/TIME_MANAGEMENT_RESEARCH.md) and the product review. Several are hypotheses that need testing in real use; those are marked **hypothesis**.

## 1. Core principles

### 1.1 Make time visible

- A large circular timer for the current task, with size and colour that change as time passes.
- A "now" line on the timeline at all times.
- Block height reflects duration, not only a number.

### 1.2 Reduce decisions

- The main screen answers "what now?" with the next block.
- Suggestions come with confirmation. Nothing is rearranged without consent.
- Sensible defaults for block length, buffer and Pomodoro.

### 1.3 Capture without friction

- Global shortcut opens a tiny capture window. Title only. Enter saves and closes.
- Extra fields can be added later from the inbox.

### 1.4 Light structure, not heavy rituals

- Morning and evening review each take under 2 minutes.
- No long mandatory forms. **Hypothesis:** heavy rituals get abandoned.

### 1.5 No shame

- An overdue task is "overdue", not "failed".
- No broken streaks, no scorekeeping that punishes.
- Neutral copy: "3 tasks carried over from yesterday. Which should happen today?"

### 1.6 Quiet notifications

- Notifications only for time events the user created: block start, timebox end.
- Free-time blocks are silent.
- Every notification can be snoozed.

### 1.7 Honest estimates

- Show "You estimated 30 min, it took 45 min" without judgement.
- After enough data, offer a personal factor (FR-27).

## 2. Visual principles

- Low density, generous spacing. One focal element per screen.
- Semantic colour is stable across views (a project has one colour everywhere).
- Colour never carries meaning alone; add icon or text.
- Calm motion, off when the OS asks for reduced motion.
- Real dark theme, not an inversion. Check Light, Dark and System.
- Typography per locale (see [FRONTEND.md](../FRONTEND/FRONTEND.md#fonts)); comfortable line height for Persian.

## 3. Main screen: Today (proposed)

Three regions:

1. **Timeline:** the day, vertical, with blocks and the now line.
2. **Focus:** current task, large timer, start / pause / finish.
3. **Inbox:** unscheduled tasks, ready to drag onto the timeline.

Focus mode keeps only the Focus region.

Region placement must be tested in both `fa` (RTL) and `en` (LTR). Use logical layout so the Focus region sits where the reading flow starts in each language, and review whether that feels right in practice.

## 4. Key flows

| Flow | Steps |
| --- | --- |
| Quick capture | Shortcut → type title → Enter. Task goes to the inbox. |
| Plan the day | Review inbox → drag to timeline → see capacity bar → resolve overload warning |
| Start focus | Click a block → choose mode (tracker, timebox, Pomodoro) → start |
| End the day | See done tasks → estimate vs actual → decide for unfinished (tomorrow, later, drop) → optional one-line note |

## 5. Accessibility

- Keyboard path for every drag action.
- Screen-reader labels from the dictionary, in the active locale.
- Contrast checked in all three theme modes.
- Target sizes large enough for pointer and touch laptops.

## 6. Testing the principles

Because these are hypotheses, build feedback in from the first version:

- A weekly note: what helped, what annoyed.
- Local counts of which views are used most (stored on device only, never sent).
- Review the principles after four weeks of real use. That review can be a video episode.
