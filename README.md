# Etymology Trainer

Static web app (no build step) for practising words from the etymology course.

## Setup
1. Put your merged file at `data/all_sessions.json` (both output formats of the merge tool work).
2. Run locally: `python -m http.server` then open http://localhost:8000
   (opening `index.html` directly also works: choose the JSON file when asked).
3. GitHub Pages: push the repo, then Settings → Pages → deploy from the `main` branch root.

Progress (spaced repetition) is saved in the browser's localStorage.

## Features
Session/root selection · flashcards · 4-choice quiz with same-root distractors · typing · cloze ·
Leitner spaced repetition (all modes feed it; "Review" shows due + up to 20 new words) · search.
