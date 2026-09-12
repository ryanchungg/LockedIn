# LockedIn

> Multi-discipline social accountability and commitment engine built with React Native (Expo 56) and Supabase.

LockedIn replaces passive tracking with active commitment contracts. Whether grinding LeetCode, endurance sports, studying, or creative craft, members join accountability pacts where consistency is mandatory, verified by proof, and enforced by peers.

---

## Core Mechanics

### 1. Active Commitment Clubs
Unlike passive logging platforms, groups in LockedIn enforce participation rules defined by the creator:
- Check-In Cadence: Configurable targets from 1 to 7 times per week.
- Proof of Work Verification: Optional mandatory photo uploads to validate session completion.
- Enforcement Policies:
  - Auto-Kick: Immediate ejection upon missing a cycle quota.
  - Three-Strikes: Members accumulate warning strikes before automated removal.
  - Social Shame: Inactive members are flagged with FELL OFF status and placed on public probation.

### 2. Democratic Kick Voting
When a group uses the Social Shame policy, active members gain the ability to initiate a democratic vote to eject members who fell off. Once votes cross a 50% majority threshold of active group members, the system automatically removes the inactive user.

### 3. Unified Multi-Group Check-Ins
A single logged workout or study session can fulfill check-in quotas across multiple relevant groups simultaneously with an optional toggle to publish the session to the community feed.

### 4. Anonymous Proof of Work
Users can participate in public accountability feeds while keeping their personal identity private by toggling anonymous posting.

---

## Tech Stack

- Framework: Expo SDK 56 (React Native 0.85, React 19)
- Language: TypeScript (Strict Mode)
- Navigation: React Navigation v7 (Bottom Tabs + Native Stack)
- Database & Auth: Supabase (PostgreSQL 15)
- Security & Authorization: Row-Level Security (RLS) + Security Definer Stored Procedures (RPCs)
- Cryptography: pgcrypto (bcrypt hashing for private group secrets)
- Storage: @react-native-async-storage/async-storage

---

## Architecture & Database Security

All business logic, password validation, voting thresholds, and quota tracking run server-side inside PostgreSQL functions (SECURITY DEFINER) with Row-Level Security enabled across all tables:

- public.profiles: Automatic handle and profile generation via auth triggers.
- public.groups: Discoverability filtering (Global, Local, Hidden) with member count triggers.
- public.group_secrets: Dedicated, RLS-isolated table for bcrypt-hashed private group passwords.
- public.group_members: Tracking check-in counts, cycle status (safe, pending, fell_off), and strike counts.
- public.group_kick_votes: Vote ledger enforcing one vote per voter per target.
- public.activities & public.group_checkins: Feed posts and check-in audit records.

---

## Getting Started

### Prerequisites
- Node.js >= 20.x
- npm or yarn
- Expo Go app on iOS/Android or an emulator (iOS Simulator / Android Emulator)
- A free Supabase account

### Installation & Setup

1. Clone the repository:
   git clone https://github.com/your-username/lockedin.git
   cd lockedin

2. Install dependencies:
   npm install

3. Set up the Supabase database:
   - Create a project at https://supabase.com
   - Open the SQL Editor, paste the contents of schema.sql, and click Run.

4. Configure environment variables in .env:
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1

5. Start the development server:
   npx expo start -c

---

## Project Structure

src/
├── api/             # Supabase data queries & RPC callers
├── components/      # Modular UI library (Cards, Badges, Modals, Feed items)
├── constants/       # 12 sport presets, grind categories, obsidian theme tokens
├── context/         # AuthContext (session) & DataContext (global state & sync)
├── navigation/      # React Navigation bottom tabs & auth stack
├── screens/         # Feed, Groups Hub, Group Detail, Goals, Profile, Auth
└── types/           # TypeScript database & domain interfaces

---

## License

This project is licensed under the MIT License — see the LICENSE file for details.
