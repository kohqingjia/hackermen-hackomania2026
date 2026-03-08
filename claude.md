# SP Group Hackathon
# AI for Actionable Energy Behaviour Change

---

# Challenge Statement

## AI for Actionable Energy Behaviour Change

---

# Background

SP Group provides reliable and efficient energy services that power homes and communities.

Today, users can already access detailed electricity data including **half-hourly energy usage** through platforms like the **SP Utilities App**.

However, **raw data does not automatically translate into understanding or behaviour change**.

Many users:

- Do not understand what the data means
- Do not know which actions will reduce consumption
- Cannot see how their daily habits impact energy efficiency or carbon footprint

This challenge asks us to convert **granular energy data into meaningful, practical guidance** that leads to **measurable and lasting sustainable behaviours**.

---

# The Challenge

The SP App already provides **half-hourly electricity consumption data**.

While this data can offer insights, it only becomes valuable if users **know how to interpret and act on it**.

Today:

- Users see many numbers but do not know what they mean
- Peak usage times are not clearly explained
- It is not obvious when or how to shift electricity usage
- Users cannot clearly connect their daily habits with energy efficiency

In short:

> The app shows the data, but users do not know how to use it to change their behaviour.

There is an opportunity to use **AI to transform consumption data into personalised, explainable, and behaviour-driven insights** that support:

- Energy efficiency
- Peak demand management
- Long-term sustainable habits

---

# What Success Looks Like

A strong solution should:

## 1. Make Energy Data Easy to Understand

- Clearly explain half-hourly usage patterns
- Highlight peak hours and unusual spikes
- Help users understand what is driving their electricity use

## 2. Provide Actionable Behaviour Recommendations

- Suggest simple, practical behaviour changes
- Recommend specific actions (e.g. shift laundry to off-peak hours)
- Make every recommendation easy to understand and transparent
- Use gamification to encourage smarter energy use

## 3. Show Measurable Impact

- Show cost savings
- Show carbon reduction
- Show reduction in peak electricity demand

## 4. Build Long-Term Habits

- Track progress over time
- Provide feedback loops
- Reward consistent sustainable behaviours

## 5. Connect Individual Actions to the Bigger Picture

- Show how personal actions support grid reliability
- Link daily habits to broader energy efficiency goals

---

# Our Solution

## BlockBattles – Community Energy Challenge

BlockBattles transforms the SP App from a **passive energy dashboard into an active behaviour change platform**.

Instead of simply displaying energy data, the system:

- explains electricity usage patterns
- recommends actionable behaviour changes
- motivates users through **community gamification**

---

# Target Audience

## HDB Communities

Approximately **77.2% of Singapore's population lives in HDB flats**.

This makes HDB residents the **largest segment for behaviour change impact**.

HDB living also naturally supports **community-based engagement**, making it ideal for gamified energy initiatives.

---

## Key User Segments

### Busy Families

- Want to reduce electricity bills
- Have little time to analyse usage charts
- Prefer quick, practical recommendations

### Eco-Conscious Young Adults

- Want to reduce carbon footprint
- Need clear and measurable sustainability actions

### Older Homeowners

- Prefer simple explanations
- Need reminders and alerts rather than complex dashboards

---

# Core Idea

## Gamification Through Block Wars

We introduce **Block Wars**, where HDB blocks compete to reduce electricity consumption.

Instead of individuals acting alone, **entire blocks work together to save energy**.

Example:

> “Block 404 is currently beating Block 405 in the Yishun Energy Challenge.”

Residents earn points through:

- shifting usage to off-peak hours
- following AI recommendations
- reducing unnecessary electricity usage

This creates a **modern kampung spirit around energy conservation**.

---

# Improving GreenUP

The SP app currently includes **GreenUP points**, where users earn rewards by pledging sustainability actions.

However:

- Most pledges are **one-time or monthly**
- Users receive **limited feedback**
- There is little reason to return to the app frequently

---

## Our Improvement

BlockBattles extends GreenUP by introducing:

- **daily energy actions**
- **AI energy coaching**
- **community competitions**

Users can earn **GreenUP points more frequently** through everyday energy-saving behaviours.

---

# Product Screens

## Onboarding View

The onboarding process collects contextual information to personalise recommendations.

Information collected:

- Age group
- Household type
- Number of tenants *(optional)*
- Energy saving target

Example:

> Reduce electricity bill by 10%

If household size is not provided, the system can **estimate usage patterns from electricity data**.

---

## Main Dashboard

Provides a clear overview of electricity usage.

Features:

- Half-hourly energy usage graph
- AI insights explaining consumption
- Bill tracking progress
- Contribution to Block Wars

Example insight:

> “Your electricity usage spikes between 7pm and 9pm.  
Reducing air-conditioning by 30 minutes tonight could save approximately $3 this week.”

---

## Block View

Allows users to compare their electricity usage with their **block average**.

Features:

- Own usage vs block average
- Contribution to block energy reduction
- AI energy tips

### Privacy Protection

Individual household data is **not publicly visible**.

Only **aggregated averages** are displayed.

---

## Map View

Displays energy performance across blocks within a region.

Example:


Yishun Energy Challenge

Block 402 — 8% reduction
Block 404 — 12% reduction (Leading)
Block 405 — 6% reduction


---

## Leaderboard View

Shows rankings of blocks participating in the challenge.

Ranking factors:

- percentage reduction from district average
- participation rate
- consistency of energy-saving actions

Example:


Top Blocks This Week

Block 404 — 12% reduction

Block 402 — 8% reduction

Block 405 — 6% reduction


This ensures **fair comparison across households of different sizes**.

---

# AI Energy Recommender

The AI analyses electricity usage patterns and generates **personalised insights**.

Example:

> “Your electricity usage peaks at 8pm, likely due to air-conditioning.”

Suggested action:

> “Running laundry after 10pm could reduce peak demand and lower costs.”

---

# Peak Demand Optimisation

Peak electricity demand usually occurs between:

**6PM – 10PM**

This period places stress on the energy grid.

The AI recommends shifting flexible activities to **off-peak hours**.

Example:

> “If you move laundry from 8PM to 11PM, you could save around 5% on electricity costs.”

---

# Technical Implementation

## Data Source

Real SP data is not available during the hackathon.

Therefore the prototype uses **simulated electricity consumption data**.

Simulation configuration:

- household electricity data
- generated daily for one month
- each day split into **half-hour intervals**

---

## Example Data Fields

- household_id
- block_id
- timestamp
- electricity_kwh
- district
- household_profile

---

## Demo Implementation

The dashboard will:

- iterate through simulated daily data
- generate AI insights dynamically
- demonstrate behaviour-driven recommendations

---

# System Architecture

## Data Layer

Simulated electricity dataset.

---

## Analytics Layer

Detects:

- peak electricity usage
- abnormal spikes
- block-level averages
- consumption trends

---

## AI Layer

LLMs convert analytics outputs into:

- explanations
- recommendations
- behavioural nudges

---

## Application Layer

User interface components:

- Dashboard
- Block View
- Map View
- Leaderboard
- Onboarding

---

# UI Design & Colour Scheme

The prototype adopts the visual design of the **SP Utilities App** to ensure familiarity.

---

## SP Colour Palette

| Role | Colour | Hex |
|-----|-----|-----|
| Primary | Teal | #2DB7A3 |
| Secondary | Mint Green | #9DE1D3 |
| Chart Colour | Soft Mint | #BFECE4 |
| Background | Light Grey | #F5F7F7 |
| Card | White | #FFFFFF |
| Alert | Orange | #F59E0B |
| Primary Text | Dark Grey | #2F3A3A |
| Secondary Text | Grey | #6B7C7C |

---

# Success Metrics

## User Impact

- reduction in electricity consumption
- reduction in peak-hour demand
- electricity bill savings

---

## Product Metrics

- daily active users
- app engagement
- participation in Block Wars
- completion of AI recommendations

---

## Community Metrics

- block-level electricity reduction
- participation rate
- GreenUP points earned

---

# Why This Works

Behavioural science shows people are more motivated by:

- social comparison
- competition
- visible progress
- community belonging

Block Wars leverages **community motivation to encourage sustainable behaviour**.

---

# Hackathon MVP

The prototype demonstrates:

- onboarding flow
- simulated electricity dashboard
- AI energy insights
- block comparison
- block leaderboard
- gamified sustainability actions

---

# Future Expansion

Possible future improvements:

- integration with real SP electricity data
- appliance-level energy insights
- weather-aware recommendations
- smart home integration
- deeper GreenUP rewards ecosystem

---

# BlockBattles

**Turning energy data into community action.**

Target Audience: HDB blocks (77.2% of singapore population stay in hdb)

Main Idea
Gamification: Block war



Project Inspiration: why it works:
Right now the SP group app doesn’t have engagement, people only come to view and pay their bill. 

SP group app also has a gamification feature, where users can earn points and rewards by pledging.
However, the pledging are recurrent only monthly or one time, meaning users don’t have other use cases to view the app.

A solution we are thinking of would be gamification of the existing SP app GreenUP points to allow users to win points more frequently.

Benefits:
Onboarding allows for data collection for SP group


Technical Implementation
Simulated data: daily for a month
Split half hourly
Main dashboard will only be able to iterate through simulated data for current day


Game Idea:
Block war:
Simulate within a single region

Block view:
Own usage vs Block usage (percentage) (or comparing averages)
Chat with block members – Not priority
Own block leaderboard – See which houses are using the least or most electricity - not feasible, usage data cannot be identifiable
AI recommender for energy saving tips

Map View:
Block vs Block, usage vs usage

Leaderboard View:
Blocks that win most clanwars
Ranking based off average usage per block

Onboarding View
Number of tenants (not filled, will assume based off usage)
Type of family (tags)
Age group
Work from home/office



Optimiser View
Set targets
  Budget
Usage
Analysis
My usage vs block usage -> on track to be below target also
My usage now vs previous month/week usage
Budget analysis -> are you on track to be below budget etc.
+
Recommendations
