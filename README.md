# Jotform Frontend Challenge Project

## User Information

- **Name**: Ege Ural

## Project Description

A frontend web application built for the 2026 Jotform Frontend Challenge (Ankara). The app features an interactive investigation/quiz system with a map interface, game logic, and event filtering — built with vanilla JavaScript and Vite.

## Features

### Evidence Dashboard
The app fetches live data from five Jotform form sources — **Check-ins**, **Messages**, **Sightings**, **Notes**, and **Tips** — and displays each as a categorized card feed. A stats bar at the top shows submission counts per category, and all data refreshes on demand with the Refresh button.

### Advanced Filtering & Sorting
Every evidence category has a dedicated filter bar with:
- **Full-text search** across all fields (name, location, note content, etc.)
- **Location dropdown** populated dynamically from the data
- **Sort options** — by time (ascending/descending) or name (A–Z / Z–A)
- **Urgency/confidence level chips** (Low / Medium / High) for Messages and Tips, supporting multi-select

### All Events View
A unified timeline that merges all five categories into a single chronological feed. Supports cross-category text search, location filtering, time sorting, and type chips to toggle individual categories on/off.

### Interactive Map (Leaflet)
A full Leaflet.js map that plots every event with a geographic location as a pin. Clicking a pin opens a sidebar with the event details. The map supports **dark and light tile layers** that switch automatically with the theme toggle.

### Investigation Mode
A modal-based mini-game that analyzes all loaded evidence to identify the most suspicious person connected to Podo's disappearance. It:
- Extracts every named person from all evidence
- Scores each candidate using weighted signals: sightings with Podo, message urgency, tip confidence, timeline overlaps (within a 30-minute window), and location patterns
- Presents the top 4 suspects for the user to choose from
- Reveals a detailed breakdown after submission — suspicion score, connection count, Podo sightings, timeline overlap, and linked locations
- Compares the user's pick against the highest-scoring suspect and gives a verdict

### Podo-rdle (Wordle Game)
A cat-detective-themed Wordle clone accessible from the header. Features:
- A curated word list of 5-letter mystery/cat-themed words
- Daily word selection based on the current date
- 6-guess limit with color-coded tile feedback (correct / present / absent)
- On-screen keyboard with letter-state coloring
- Physical keyboard support (type, Backspace, Enter)
- Win/lose messages and a "Play Again" button

### Dark / Light Theme
A persistent theme toggle (saved to `localStorage`) that switches the entire UI between dark and light modes, including the map tile layer.

### Mobile-Responsive Layout
A collapsible sidebar with a burger menu and overlay, a bottom mobile navigation bar for tab switching, and responsive card layouts for all screen sizes.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm (comes with Node.js)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/egeural/2026-frontend-challenge-ankara.git
   cd 2026-frontend-challenge-ankara
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Project

Start the development server:
```bash
npm run dev
```

Then open your browser and navigate to `http://localhost:300x`.

### Build for Production

```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

---

# 🚀 Challenge Duyurusu

## 📅 Tarih ve Saat
Cumartesi günü başlama saatinden itibaren üç saattir.

## 🎯 Challenge Konsepti
Bu challenge'da, size özel hazırlanmış bir senaryo üzerine web uygulaması geliştirmeniz istenecektir. Challenge başlangıcında senaryo detayları paylaşılacaktır. Katılımcılar, verilen GitHub reposunu fork ederek kendi geliştirme ortamlarını oluşturacaklardır.

## 📦 GitHub Reposu
Challenge için kullanılacak repo: https://github.com/cemjotform/2026-frontend-challenge-ankara

## 🛠️ Hazırlık Süreci
1. GitHub reposunu fork edin
2. Tercih ettiğiniz framework ile geliştirme ortamınızı hazırlayın
3. Hazırladığınız setup'ı fork ettiğiniz repoya gönderin

## 💡 Önemli Notlar
- Katılımcılar kendi tercih ettikleri framework'leri kullanabilirler
