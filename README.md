# University Academic Calculator

A production-quality, Apple-inspired academic utility for university students. Engineered with clean typography, high contrast in Light and Dark modes, exact mathematical rigor, and client-side privacy.

---

## 🌐 Live Deployments

- **Vercel Production**: [https://university-academic-calculator.vercel.app/](https://university-academic-calculator.vercel.app/)
- **GitHub Pages**: [https://dileepkumarpallapu.github.io/University-Academic-Calculator/](https://dileepkumarpallapu.github.io/University-Academic-Calculator/)
- **GitHub Repository**: [https://github.com/DileepKumarPallapu/University-Academic-Calculator](https://github.com/DileepKumarPallapu/University-Academic-Calculator)

---

## 👨‍💻 Developer & Author

- **Author**: **Pallapu Dileep Kumar**
- **Role**: CSE Student • Developer
- **GitHub**: [https://github.com/DileepKumarPallapu](https://github.com/DileepKumarPallapu)
- **LinkedIn**: [https://www.linkedin.com/in/dileep-kumar-pallapu](https://www.linkedin.com/in/dileep-kumar-pallapu)
- **Copyright**: © 2026 Pallapu Dileep Kumar. All rights reserved.

---

## 🌟 Core Calculators

1. **Internal Marks Calculator (Max 40 Marks)**
   - **Theory Mode**: 3 Tests of 30 raw marks each $\rightarrow$ converted via $(\text{raw} / 30) \times 10$ to 10 marks each + Attendance (5) + Assignment (5) = Max 40.
   - **Integrated Mode**: 2 Mid-term tests of 20 raw marks each $\rightarrow$ converted via $(\text{raw} / 20) \times 5$ to 5 marks each + Model Practical Lab (20) + Attendance (5) + Assignment (5) = Max 40.

2. **SGPA Calculator**
   - Semester Grade Point Average with strict credit weighting:
     $$\text{SGPA} = \frac{\sum (\text{Credits} \times \text{Grade Point})}{\sum \text{Credits}}$$
   - Full support for institutional regulations: **VTR15**, **VTR18**, **VTR21**, and **VTR25**.
   - Built-in **View Grade Scale** modal displaying grade points and letter grade classifications.

3. **CGPA Calculator**
   - Cumulative Grade Point Average weighted across all completed semesters:
     $$\text{CGPA} = \frac{\sum (\text{Semester SGPA} \times \text{Semester Credits})}{\sum \text{Semester Credits}}$$
   - Prevents unweighted arithmetic averaging.

4. **Attendance Calculator**
   - Exact percentage calculation based on faculty sessions conducted:
     $$\text{Attendance \%} = \left(\frac{\text{Sessions Attended}}{\text{Faculty Sessions}}\right) \times 100$$
   - Target attendance threshold planner (e.g. required sessions to achieve 75% or 85%).
   - Future planned absences and projected attendance simulator.

---

## 📄 Print / Save as PDF Reports

- Clean, single-page A4 printable academic report via `window.print()`.
- Strips all screen UI, navigation bars, buttons, and theme toggles.
- Displays:
  - Student Profile (Name, Register/Roll Number, Department, Year, Semester).
  - Assessment tables and credit breakdown.
  - Calculation formula and substitution summary.
  - Native offline SVG QR code pointing to the live application.
  - Dedicated **Print Footer**:
    ```text
    Academic Calculator
    Developed by Pallapu Dileep Kumar
    CSE Student • Developer

    GitHub • LinkedIn
    https://github.com/DileepKumarPallapu • https://www.linkedin.com/in/dileep-kumar-pallapu
    © 2026 Pallapu Dileep Kumar
    ```

---

## 📱 PWA & Offline Support

- **PWA Manifest**: `manifest.webmanifest` configured for standalone installation.
- **Service Worker**: `sw.js` caches core application assets for complete offline functionality.
- **Client-Side Privacy**: All calculations are executed locally in the browser with zero cloud tracking.

---

## 🛠 Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (Apple monochrome design system)
- **Icons**: Lucide React
- **QR Code**: Native vector SVG via `qrcode`
- **Testing**: Vitest (15 unit tests)

---

## 🚀 Development & Build

```bash
# Install dependencies
npm install

# Run Vitest test suite
npm test

# Start local development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```
