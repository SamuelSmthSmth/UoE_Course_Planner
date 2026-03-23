# University of Exeter Course Planner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)

An interactive, visual degree planner built to map out the 4-year **MMath (Mathematics)** syllabus at the University of Exeter. 

**Live Interactive Demo: [sous.systems](https://sous.systems)**

![Project Preview](https://via.placeholder.com/800x400.png?text=Add+a+screenshot+of+your+dark+mode+graph+here!)

## Core Features
* **Interactive Dependency Graph:** Visualizes complex corequisites and prerequisites using a dynamic directed acyclic graph (DAG).
* **Smart Validation Engine:** Actively prevents users from selecting modules if they lack prerequisites or if an incompatible module is selected.
* **Credit & Term Balancing:** Automatically enforces the 120-credit yearly limit and calculates the Autumn/Spring term split to warn against unbalanced schedules.
* **Dark Mode Native:** A highly polished UI that shifts node colors and dependency lines for late-night planning.

---

While this repository is currently pre-loaded with the Exeter MMath syllabus, **the underlying engine is completely university-agnostic.** The entire graph, validation logic, and sidebar are driven by a generic JSON structure. You can easily fork this repository and swap out the data to map out *any* degree at *any* university.

**To customize for your own degree, simply replace the data in:**
* `src/data/modules.json` (The raw module data: credits, terms, description)
* `src/data/overrides.json` (Manual linkage rules for prerequisites/corequisites)

---

## Built With
* **[React](https://reactjs.org/)** - UI Framework
* **[Vite](https://vitejs.dev/)** - Build tool and bundler
* **[React Flow](https://reactflow.dev/)** - Node-based graph rendering engine
* **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
* **[TypeScript](https://www.typescriptlang.org/)** - Strict type-safety and validation

## Running Locally

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/SamuelSmthSmth/UoE_Course_Planner.git](https://github.com/SamuelSmthSmth/UoE_Course_Planner.git)
   cd UoE_Course_Planner
