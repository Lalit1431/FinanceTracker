# FinanceTracker 📱💰

An offline-first, privacy-focused personal finance manager built with **React Native**, **Expo SDK 58**, **TypeScript**, and **SQLite**.

Designed with clean double-entry accounting principles, modern White/Blue light theme, and pure night dark mode. Works 100% offline with zero cloud dependency and zero telemetry.

---

## ✨ Features

### 🔒 100% Offline & Private
- **Zero Cloud Dependency:** All data is stored in a local SQLite database (`expo-sqlite` on mobile, encrypted local store on web).
- **Zero Telemetry:** No tracking, no external analytics, no user accounts required.
- **App Lock:** Optional biometric authentication (Fingerprint / Face ID / PIN) via `expo-local-authentication`.

### 💵 Cash Wallet & ATM Cash Withdrawals
- **Permanent "Cash in Hand" Wallet:** Built-in cash account that is always ready.
- **Smart Auto-Routing:** Selecting **Cash** as the payment method automatically logs and deducts from your Cash Wallet without manual account picking.
- **ATM Cash Withdrawal / Transfer:** Record transfers from Bank ➔ Cash without distorting monthly expense or income charts.

### 📊 Comprehensive Income & Expense Reports
- **Dynamic Toggle:** Seamlessly switch between **Expense Reports** and **Income Reports**.
- **Interactive Visualizations:** Category distribution Pie Charts powered by `react-native-chart-kit`.
- **Category Rankings:** Proportional progress bars and percentage share for every spending category and income source.
- **Performance Summary:** Total Income, Total Expense, Net Savings, and Savings Rate at a glance.

### 📅 Advanced Date Range Filtering
- **Quick Presets:** Filter instantly by *All Dates*, *This Month*, *Last Month*, *Last 30 Days*, or *This Year*.
- **Custom From/To Dates:** Enter any custom date window (with native HTML5 calendar picker on web).
- **Dynamic Recalculations:** Transaction history, KPIs, and reports recalculate in real-time based on the selected date window.

### 🎯 Monthly Budgeting
- Set monthly spending budgets per category.
- Color-coded progress bars with over-budget warning indicators.

### 🎨 Dual Modern Theme
- **White & Blue Light Theme:** Clean, crisp UI with high-contrast blue primary accents and white surfaces.
- **Pure Night Dark Theme:** Deep slate/navy dark mode for comfortable night use.
- Automatic system theme detection with manual toggle.

### 📁 Data Portability & Backup
- **CSV Export:** Export filtered date ranges to CSV files via `expo-sharing`.
- **JSON Backup & Restore:** Create single-file local snapshots of your database and restore anytime.

---

## 🛠️ Tech Stack

- **Framework:** [React Native 0.88](https://reactnative.dev/) with [Expo SDK 58](https://expo.dev/)
- **Language:** TypeScript 6.0
- **UI Components:** [React Native Paper v5](https://callstack.github.io/react-native-paper/) (Material Design 3)
- **Icons:** `@expo/vector-icons` (Material Community Icons)
- **State Management:** [Zustand v5](https://zustand.docs.pmnd.rs/)
- **Navigation:** [React Navigation v7](https://reactnavigation.org/) (Bottom Tabs + Native Stack)
- **Database:** `expo-sqlite` (Native) + Strongly Typed Browser Adapter (Web)
- **Charts:** `react-native-chart-kit` & `react-native-svg`
- **Testing:** Jest & `ts-jest`

---

## 📂 Project Structure

```
FinanceTracker/
├── src/
│   ├── components/         # Reusable UI components (DateRangeFilter, etc.)
│   ├── database/           # SQLite migrations, schema, repositories & web adapter
│   │   ├── database.native.ts
│   │   ├── database.web.ts
│   │   ├── accountRepository.ts
│   │   ├── transactionRepository.ts
│   │   ├── transferRepository.ts
│   │   ├── categoryRepository.ts
│   │   └── budgetRepository.ts
│   ├── navigation/         # React Navigation tab & stack navigators
│   ├── screens/            # Application screens
│   │   ├── Dashboard/      # Net worth, monthly overview & trend charts
│   │   ├── AddTransaction/ # Expense, Income & ATM Transfer forms
│   │   ├── TransactionHistory/ # History list with filters
│   │   ├── TransactionDetails/ # Details, Edit & Delete views
│   │   ├── Reports/        # Income & Expense visual analytics
│   │   ├── Accounts/       # Bank, Cash & Wallet manager
│   │   ├── Categories/     # Income/Expense categories
│   │   ├── Budgets/        # Monthly budget manager
│   │   ├── Settings/       # Currency, theme, and security
│   │   └── BackupRestore/  # JSON import & export
│   ├── services/           # Analytics, CSV reporting, and Auth services
│   ├── store/              # Zustand stores (finance, theme)
│   ├── theme/              # Light and Dark theme palettes
│   ├── types/              # TypeScript models and interfaces
│   └── utils/              # Currency formatting, date calculations
├── __tests__/              # Unit test suites (calculations, transfers, date filters)
├── app.json                # Expo application configuration
├── eas.json                # EAS Build configuration (APK & Production)
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or bun

### Installation
```bash
# Clone the repository
git clone https://github.com/Lalit1431/FinanceTracker.git
cd FinanceTracker

# Install dependencies
npm install
```

### Running the App

```bash
# Start Metro bundler (interactive menu)
npx expo start

# Run on Android (device or emulator)
npx expo run:android

# Run in Web browser
npx expo start --web
```

### Running Tests

```bash
# Run Jest unit test suite
npm test

# Run TypeScript typecheck
npx tsc --noEmit

# Run Expo health check
npx expo-doctor
```

---

## 📦 Building an Installable Android APK

This project is pre-configured with EAS Build profiles (`eas.json`):

```bash
# Log in to your Expo account
npx eas-cli@latest login

# Build a standalone installable .apk
npx eas-cli@latest build -p android --profile preview
```

---

## 📄 License

This project is licensed under the MIT License.
