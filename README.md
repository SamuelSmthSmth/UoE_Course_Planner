# 🎓 University of Exeter - MMath Course Planner

An interactive, visual degree planner built for Mathematics students at the University of Exeter. This application allows students to map out their 4-year MMath degree, automatically validating prerequisites, tracking credit limits, and visualizing the entire module dependency tree. However, the application can also be forked or modified to map out other degree options.

**[View Live Demo Here](https://SamuelSmthSmth.github.io/UoE_Course_Planner/)**

## Features
* **Interactive Dependency Graph:** Visualizes the corequisites and prerequisites of the entire MMath syllabus.
* **Smart Validation Engine:** Actively prevents users from selecting modules if they lack prerequisites or if it conflicts with an incompatible module.
* **Credit & Term Tracking:** Enforces the 120-credit yearly limit and calculates the Autumn/Spring term split.
* **Dynamic Layouts:** Toggle between a top-down "Waterfall" view and a perfectly balanced "Centered" view.
* **Seamless Dark Mode:** A polished dark UI that shifts the node colors and dependency lines.

## Running Locally

```bash
git clone [https://github.com/SamuelSmthSmth/UoE_Course_Planner.git](https://github.com/SamuelSmthSmth/UoE_Course_Planner.git)
cd UoE_Course_Planner
npm install
npm run dev
