# Project Charter & Product Roadmap: SCP Digital Board Game

## 1. Executive Summary & Product Vision

**Project Name:** *Working Title: Site Containment / Protocol Breach*

**Genre:** Digital 2D Tabletop / Strategic Board Game with Hidden Roles & Social Deduction

**Core Inspiration:** *Talisman* (concentric risk-progression board structure, stat growth, encounter decks) combined with *FATE* (Fudge dice probability distribution) and *SCP Foundation* lore (containment procedures, anomalous entities, cognitive hazards, and covert agendas).

**Vision:**

Deliver an accessible, browser-first 2D digital board game that feels like a polished, tactile tabletop experience. Players navigate a breached SCP Foundation facility across concentric security rings, balancing resource and stat progression against hidden personal objectives, dynamic side quests, fragile player alliances, and the constant paranoia that another player may have been replaced by an anomalous entity.

**Target Audience & Accessibility:**

* Players who enjoy strategic tabletop games, asymmetric goals, and sci-fi/horror containment themes.
* Zero-install web accessibility to ensure frictionless testing, sharing, and multi-device play.
* Full bilingual support (**English and Spanish**) built into the product from day one.

---

## 2. Core Product Decisions & Guardrails

The following strategic and design decisions establish the boundaries for planning and future technical execution:

| Decision Area | Agreed Direction | Rationale |
| --- | --- | --- |
| **Platform & Distribution** | **Web-First (Browser-Based)** | Maximizes accessibility (instant play via link, zero installation) and accelerates iteration across playtesting stages. |
| **Visual Presentation** | **Polished 2D Tabletop Aesthetic** | Delivers high visual quality (illustrated board, thematic dossier cards, crisp animations, audio feedback) without the overhead of 3D engines (e.g., Unreal/Godot). |
| **Core Board Structure** | **Concentric 3-Ring Facility Map** | Adapts *Talisman*'s Outer/Middle/Inner ring progression into escalating containment security zones (*Safe* → *Euclid* → *Keter*). |
| **Resolution System** | **Fudge / FATE Dice (`4dF`)** | Replaces swingy `1d6` rolls with bell-curve probability (`-4` to `+4`), rewarding character stats/gear while supporting tiered outcomes (critical success, partial success/cost, failure). |
| **Win Conditions** | **Dual Victory Paths (Standard + Hidden)** | Players can win via the classic central objective OR by fulfilling a secret personal mission, creating parallel races and unpredictable endgames. |
| **Social Dynamics** | **Alliances, Betrayal & Hidden Transformation** | Players can form temporary pacts or betray each other, and may secretly transform into an anomalous entity (e.g., Doppelgänger) with hidden stats and a new win condition. |
| **Localization** | **Bilingual (English & Spanish)** | All UI, cards, rules, narratives, and mission prompts must support seamless EN/ES switching from the ground up. |
| **Scope Philosophy** | **Phased Rollout (MVP → Advanced Mechanics)** | Validate the core board loop and pacing first before layering hidden agendas, Fudge resolution nuances, and entity transformations. |

---

## 3. Phased Product Roadmap

### Stage 1: Core Loop & 2D Tabletop Foundation (MVP)

**Objective:** Validate the fundamental board game pacing, ring progression, encounter economy, and bilingual UI in a playable 2D environment.

* **The 3-Ring Facility Board:**
* **Outer Ring (Administrative & Residential — *Safe*):** Low-risk zones for baseline equipment, healing, recruiting D-Class/staff, and initial stat building.
* **Middle Ring (Heavy Containment — *Euclid*):** Medium-risk laboratories, active containment cells, anomalous items, and rival faction interference (e.g., Chaos Insurgency).
* **Inner Ring (Critical Core — *Keter*):** High-lethality zones leading to the central **Command Center / Alpha Warhead** space.
* **Access Gates:** Checkpoints between rings requiring specific Security Clearance Levels (Levels 1–4) or skill checks to cross.
* **SCAPE: Im evaluating to be more like an scape the room like too. not in the way of find a way to scape but you are scaping from these creatures. **

* **Playable Roles & Core Attributes:**
* Asymmetric starting characters (e.g., *MTF Field Agent*, *Senior Researcher*, *D-Class Personnel*, *Containment Specialist*).
* Core stats: **Combat** (physical/tactical capability), **Intellect / Clearance** (scientific, memetic, and containment capability), **Integrity** (health), and **Security Clearance Level** (1–4).


* **Turn Flow & Encounter Decks:**
* Movement along the active ring, resolving space actions, and drawing ring-specific Encounter Cards (*Anomalies*, *Equipment/Anomalous Objects*, *Facility Events*, *Allies*).
* Neutralizing or containing anomalies yields trophies/records used to upgrade character stats.


* **Standard Win Condition:**
* Reaching the central Command Center with Level 4 Clearance and successfully initiating the **Global Recontainment Protocol** (or surviving the **Alpha Warhead** countdown).


* **Bilingual Foundation (EN / ES):**
* Language selector allowing instant toggle between English and Spanish across all cards, board spaces, and rules text.



---

### Stage 2: Tactical Depth, Hidden Agendas & Anomalous Transformation

**Objective:** Evolve the game from a pure *Talisman* derivative into a distinct social-tactical SCP experience driven by probability control, secrecy, and deception.

* **Fudge / FATE Dice Resolution (`4dF`):**
* Replace standard 6-sided dice combat/checks with `4dF` (`-4` to `+4` + character modifiers).
* Introduce graduated outcomes: *Clean Containment / Critical Success*, *Success with Collateral Cost*, *Stalemate / Escalation*, and *Containment Breach / Failure*.


* **Secret Personal Missions (Alternative Win Conditions):**
* Each player receives a private, hidden primary mission at match start independent of their chosen character (e.g., *Extract two Euclid samples*, *Sabotage the central core before recontainment*, *Survive with specific anomalous artifacts*).
* Fulfilling a personal mission grants an immediate or triggered victory, competing directly against the standard central win condition.


* **Dynamic Side Quests:**
* Optional secondary objectives acquired from terminal spaces, research nodes, or event cards during play.
* Completing side quests grants tactical rewards (stat boosts, clearance upgrades, rare gear, or intel on other players).


* **Alliances & Betrayal Mechanics:**
* Structured player-to-player agreements (e.g., cooperative encounter assistance, resource trades, temporary non-aggression pacts) with clear mechanical consequences when honored or broken.


* **Hidden Entity Transformation (e.g., Doppelgänger / Mimic):**
* Specific anomalous encounters, cognitive hazards, or event triggers can secretly convert a player into an anomalous entity.
* **Asymmetric Information:** Upon transformation, the player's true role, altered stats, special abilities, and new win condition (e.g., *Eliminate/infect remaining staff*, *Trigger total site breach*) remain hidden from all other players, who only observe indirect behavioral clues.



---

### Stage 3: Visual Polish, "Game Feel" & Content Expansion

**Objective:** Elevate the 2D web experience to commercial tabletop standards and expand replayability.

* **2D Tabletop Art & Atmosphere:**
* High-resolution illustrated facility board, custom dossier-styled cards with classification stamps (*Safe*, *Euclid*, *Keter*), and clear visual states for locked gates, active breaches, and player tokens.


* **Audio & Kinesthetic Feedback:**
* Smooth token movement, 2D dice roll animations, containment alarm lighting shifts during global breach escalations, and thematic sound effects.


* **Content Scaling & Game Modes:**
* Expanded pool of SCP anomalies, personal missions, side quests, and transformable entity archetypes.
* Support for local *pass-and-play* (with privacy screens for hidden missions/identities), AI bots for solo play, and optional real-time online multiplayer.



---

## 4. Key Non-Functional & Business Requirements

* **Information Security & Privacy UX:** Because Stage 2 relies on hidden personal missions and secret entity transformations, the product must cleanly separate **public board visibility** from **private player visibility** (including privacy-safe transitions when sharing a single screen locally).
* **Content Extensibility:** All cards, board spaces, missions, anomalies, and translations (EN/ES) should be treated as structured, modular game content so new SCPs and scenarios can be added without redesigning core game rules.
* **Licensing Awareness (SCP IP):** Any direct use of existing SCP Wiki entries, names, or text must comply with **Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0)** attribution and share-alike obligations, unless original anomalies and lore are authored specifically for the game.

---

## 5. Immediate Next Steps for Implementation Planning

1. **Technical Architecture Selection:** Define the web stack, state management model (public vs. private player state), and 2D rendering approach based on this roadmap.
2. **Stage 1 Content Specification:** Finalize the exact count of board spaces per ring, starting character profiles, and the initial starter deck (in both English and Spanish) to build the Stage 1 playable prototype.
3. **Stage 2 Rulebook Definition:** Establish exact `4dF` outcome thresholds, pact/betrayal rules, and the trigger/detection rules for hidden entity transformations.