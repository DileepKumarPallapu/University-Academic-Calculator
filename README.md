# University Academic Calculator

A production-quality, Apple-inspired academic calculator built for university students. Provides exact conversions and weighted mathematical calculations for **Theory Internals**, **Integrated Subject Internals**, **GPA**, **CGPA**, and **Multi-Subject Tracking**.

---

## 🌟 Key Features

1. **Theory Internal Calculator (Max 40 Marks)**
   - 3 Tests of 30 raw marks each $\rightarrow$ converted via $\frac{\text{raw}}{30} \times 10$ to 10 marks each.
   - Attendance (max 5 marks) + Assignment (max 5 marks).
   - Real-time conversion display and instant results.

2. **Integrated Subject Internal Calculator (Max 40 Marks)**
   - 2 Mid-term tests of 20 raw marks each $\rightarrow$ converted via $\frac{\text{raw}}{20} \times 5$ to 5 marks each.
   - Model / Integrated Practical Lab (direct 20 marks).
   - Attendance (max 5 marks) + Assignment (max 5 marks).

3. **Semester GPA Calculator**
   - Weighted credit calculation: $\text{GPA} = \frac{\sum (\text{Credits} \times \text{Grade Points})}{\sum \text{Credits}}$.
   - Configurable university grade-point mapping ($S=10, A+=9, A=8, B+=7, B=6, C=5, D=4, F=0$) with in-app customization modal.

4. **Cumulative CGPA Calculator**
   - Weighted semester formula: $\text{CGPA} = \frac{\sum (\text{GPA} \times \text{Semester Credits})}{\sum \text{Semester Credits}}$.
   - Avoids improper unweighted arithmetic averaging.

5. **Multi-Subject Academic Manager**
   - Manage multiple courses simultaneously (supporting both Theory and Integrated courses).
   - Live course mark breakdown, standing, percentage, and cohort overview.

6. **Apple-Style Visual System**
   - Minimalist monochrome palette (`#FFFFFF`, `#000000`, `#0B0B0D`, `#1D1D1F`, `#F5F5F7`, `#E8E8ED`).
   - Native Apple font hierarchy, soft rounded cards ($16–28\text{px}$ radius), subtle shadows, and glassmorphic navigation.
   - Smooth animated count-up numbers and sliding pill segmented controls.

7. **Result Sharing & Export**
   - One-click copy formatted academic summary.
   - Native Web Share API integration with automatic clipboard fallback.
   - Text document summary download.

8. **Calculation History**
   - Persisted locally in `localStorage` with zero cloud tracking.
   - Filter by calculator type, inspect full calculation parameters, delete records, or clear history with a safety confirmation modal.

9. **Dark, Light & System Appearance**
   - Seamlessly synchronizes with system `prefers-color-scheme` or manually toggled.

---

## 📐 Formulas & Validation Rules

| Calculator | Assessment Component | Raw Scale | Conversion Formula | Converted Scale |
| :--- | :--- | :--- | :--- | :--- |
| **Theory** | Test 1 | 0 – 30 | $(\text{raw} / 30) \times 10$ | 0 – 10 |
| **Theory** | Test 2 | 0 – 30 | $(\text{raw} / 30) \times 10$ | 0 – 10 |
| **Theory** | Test 3 | 0 – 30 | $(\text{raw} / 30) \times 10$ | 0 – 10 |
| **Theory** | Attendance | 0 – 5 | Direct | 0 – 5 |
| **Theory** | Assignment | 0 – 5 | Direct | 0 – 5 |
| **Theory Total** | **Maximum 40 Marks** | | Sum of converted marks | **40 Marks** |
| **Integrated** | Mid 1 | 0 – 20 | $(\text{raw} / 20) \times 5$ | 0 – 5 |
| **Integrated** | Mid 2 | 0 – 20 | $(\text{raw} / 20) \times 5$ | 0 – 5 |
| **Integrated** | Model / Lab | 0 – 20 | Direct | 0 – 20 |
| **Integrated** | Attendance | 0 – 5 | Direct | 0 – 5 |
| **Integrated** | Assignment | 0 – 5 | Direct | 0 – 5 |
| **Integrated Total** | **Maximum 40 Marks** | | Sum of converted marks | **40 Marks** |

---

## 🚀 Running the Project

```bash
# Navigate to project directory
cd C:\Users\dilee\.gemini\antigravity\scratch\academic-calculator

# Install dependencies (already installed)
npm install

# Run Vitest test suite
npx vitest run

# Run Development Server
npm run dev

# Build for Production
npm run build
```
