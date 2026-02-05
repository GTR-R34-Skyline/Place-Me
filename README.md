# AI-Powered Placement Recommendation System

AI-driven placement intelligence platform that recommends job roles and internships to students while helping placement cells make data-backed decisions using explainable logic.

**Event:** IdeateX’25
**Problem Statement ID:** IX2506
**Category:** Software
**Team:** Captain Cool

---

## Problem Statement

Traditional placement processes rely heavily on CGPA and manual screening, which:

* Misses skill-based talent
* Lacks transparency for students
* Increases workload for placement cells

This system introduces **placement decision intelligence** — focused on skills, interests, and readiness, not just marks.

---

## Solution Overview

A centralized web platform that:

* Recommends roles, internships, and skill paths to students
* Matches students with recruiter requirements
* Provides explainable recommendations
* Supports placement cells with analytics and insights

---

## Key Features

### Student Module

* Secure authentication
* Profile creation (CGPA, skills, interests)
* Resume upload (PDF)
* Ranked job & internship recommendations
* Match percentage with explanation
* Skill Readiness Score (0–100)
* Skill gap identification
* Clean, modern, student-friendly UI

### Placement Cell Admin Module

* Job & internship management
* Student readiness overview
* Placement status tracking
* Analytics dashboard:

  * Role-wise student distribution
  * Average readiness scores
  * Top in-demand skills

---

## Recommendation Logic

Explainable weighted scoring model:

* Skill match: **50%**
* CGPA relevance: **25%**
* Interest alignment: **25%**

Highlights:

* No CGPA-only filtering
* Skill-first recommendations
* Cold-start handling using interests
* Clear “Why recommended” reasoning
* Lightweight feedback-based improvement

---

## Tech Stack

**Frontend**

* Modern web UI
* Card-based layouts
* Responsive design

**Backend**

* REST API (FastAPI / Django-style)
* JWT authentication

**Database & Storage**

* PostgreSQL
* File storage for resumes

**AI / Intelligence**

* Rule-based recommendation engine
* Transparent and explainable logic

---

## System Architecture

```
Student Web App
        |
Admin Dashboard
        |
     REST API
        |
Recommendation Engine
        |
     PostgreSQL
        |
   Resume Storage
```

---

## Feasibility & Scalability

* Uses existing student data
* No new infrastructure required
* Low deployment cost
* Can be rolled out in phases:

  1. Recommendations
  2. Admin dashboard
  3. Analytics & optimization

Scalable to inter-college or SaaS deployment.

---

## Project Status

* Core recommendation logic implemented
* Student & admin flows integrated
* Seed data added for demo
* Ready for evaluation and presentation

---

## Team

**Captain Cool**
Sri Venkateswara College of Engineering

---

## License

Academic and demonstration use only.

---

If you want a **one-page README**, **judge-optimized version**, or **README with screenshots**, say it.
