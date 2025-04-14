# NutriCare AI: Personalized Vietnamese Nutrition Advisor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Project Status: Active](https://img.shields.io/badge/status-active-success.svg)](https://github.com/technoob05/NutriAI) <!-- Assuming this is the repo path -->

**Team:** 404 Brain Not Found

**Live Demo (Deployed on Firebase):**

## ✨ **[https://studio--vietnamese-diet-planner.us-central1.hosted.app/](https://studio--vietnamese-diet-planner.us-central1.hosted.app/)** ✨

![image](https://github.com/user-attachments/assets/daa563a0-1f77-44b9-a463-6883c7dd75e6)

## 🧠 Backend API
Toàn bộ logic về phân tích dinh dưỡng và hệ thống đề xuất thực phẩm được xử lý bởi backend riêng biệt, bạn có thể tham khảo tại đây:
👉 **[Food Recommendation API Repository](https://github.com/trungkiet2005/NutriCare-Recommend-API)**  
> Đây là nơi tập trung core logic cho gợi ý thực đơn, phân tích hồ sơ sức khỏe người dùng và các xử lý liên quan đến dữ liệu dinh dưỡng.(Chứa các endpoints RESTful phục vụ cho hệ thống NutriCare AI Agents)

## Table of Contents

*   [Introduction](#introduction)
*   [The Problem](#the-problem)
*   [Our Solution: NutriCare AI](#our-solution-nutricare-ai)
    *   [Key Features](#key-features)
    *   [Responsible AI Principles](#responsible-ai-principles)
*   [Technology Stack](#technology-stack)
*   [System Architecture](#system-architecture)
*   [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Installation](#installation)
    *   [Environment Variables](#environment-variables)
    *   [Running the Application](#running-the-application)
*   [Usage Guide](#usage-guide)
*   [Future Development](#future-development)
*   [Meet the Team](#meet-the-team)
*   [Contributing](#contributing)
*   [License](#license)
*   [Contact](#contact)

---

## Introduction

**NutriCare AI** (Project NutriAI) is an intelligent nutrition support system developed for the **GDGOC Hackathon Vietnam 2025**. It leverages cutting-edge AI, including Graph Neural Networks (GNN) and a multi-agent Large Language Model (LLM) system, combined with deep nutritional knowledge, specifically tailored for the Vietnamese population.

Our core mission is to provide **personalized, explainable, accessible, and culturally relevant dietary recommendations** to help users improve their health and well-being. We address the critical need for tailored nutritional guidance in Vietnam, considering individual health conditions, preferences, budget, and regional culinary diversity.

---

## The Problem

In Vietnam, inadequate nutrition contributes significantly to various health issues:

*   **Rising Non-Communicable Diseases:** Unhealthy diets (high in processed foods, low in fruits/vegetables) are linked to increasing rates of cardiovascular disease, diabetes, and cancer (74% of deaths in Vietnam).
*   **Digestive Health Issues:** Poor dietary habits affect up to 10% of the population, leading to gastrointestinal problems.
*   **Lack of Specific Guidance:** Generic advice like "eat less sugar" is insufficient. Users need detailed, personalized meal plans.
*   **Taste vs. Health:** Healthy options often don't align with user preferences, hindering long-term adherence.
*   **Culinary Knowledge Gap:** Many struggle to choose healthy, palatable meals, especially with busy schedules.
*   **Data Relevance:** Existing apps often use foreign data, ignoring Vietnamese cuisine and regional variations.
*   **Accessibility Barriers:**
    *   **Cost:** 78% cannot afford professional nutritionists.
    *   **Time:** 65% lack time for detailed meal planning.
    *   **Inclusivity:** Current tools often exclude people with disabilities (especially visual impairments) and the elderly.
    *   **Financial Constraints:** 52% find healthy diets unaffordable.

These issues lead to increased disease rates, higher healthcare costs, reduced quality of life, and health inequities. There's a clear need for a solution that is personalized, culturally appropriate, inclusive, budget-conscious, and user-friendly.

---

## Our Solution: NutriCare AI

NutriCare AI tackles these challenges with a multi-faceted approach:

### Key Features

1.  **Personalized Recommendations:** Utilizes a Graph Neural Network (GNN) model trained on user health data (demographics, conditions, preferences) and extensive Vietnamese food data (2000+ dishes, 500+ ingredients) to suggest meals tailored to individual needs.
2.  **Multi-Objective Optimization:** Employs Pareto optimization to balance three key goals: health suitability, taste preference, and nutritional diversity.
3.  **Explainable AI (XAI):** Features a Responsible Multi-Agent System (using Gemini & LangGraph) that explains *why* specific recommendations are made, citing reliable sources (WHO, Vietnam National Institute of Nutrition) and detailing the impact on health metrics.
    *   **Search Agent:** Fact-checks recommendations against trusted sources.
    *   **RAG Agent:** Retrieves information from internal knowledge bases.
    *   **Reasoning Agent:** Explains the decision-making process.
    *   **Content Writer:** Formulates clear explanations.
    *   **Schedule Agent:** Creates personalized daily/weekly meal plans, considering budget constraints (low/medium/high cost).
    *   **UI/UX Agent:** Presents information effectively.
4.  **Vietnamese Cuisine Focus:** Incorporates a rich database of local dishes and ingredients.
5.  **Inclusive Design:** Supports voice commands (via Google Speech-to-Text) for accessibility, catering to users with visual impairments or mobility issues.
6.  **Budget Optimization:** Suggests meal plans and ingredient substitutions based on user-defined financial constraints.
7.  **Data Privacy:** User history is processed locally on the device to ensure privacy and personalization. Users can export or delete their data.

### Responsible AI Principles

NutriCare AI is built with responsibility at its core:

*   **Inclusivity:** Designed for everyone, including people with disabilities and the elderly.
*   **Financial Equity:** Provides options for all income levels.
*   **Transparency:** Visualizes the reasoning process behind recommendations.
*   **Accountability:** Cites credible sources for nutritional information.
*   **Clarity:** Explains the health impact of food choices.
*   **Privacy & Security:** Prioritizes user data protection with on-device processing and user control.

---

## Technology Stack

*   **Frontend:** Next.js, React, Tailwind CSS, HTML/CSS, TypeScript
*   **Backend:** Google Cloud Functions, Firebase Authentication, TypeScript
*   **Data Storage & Querying:** Firebase Realtime Database, Google Cloud Storage, BigQuery
*   **AI & Machine Learning:**
    *   **Recommendation Engine:** TensorFlow (for GNN - LightGCN, SignedGCN, SGSL), Vertex AI (Training & Deployment)
    *   **Explainability & Interaction:** Langchain/LangGraph, Gemini 2.0 Flash (fine-tuned for Vietnamese & nutrition), Gemma (optional LLM)
*   **Analytics:** Google Analytics
*   **Accessibility:** Google Speech-to-Text
*   **Future Integrations:** Google Cloud Vision API (food recognition), Google Maps (food sourcing)

---

## System Architecture

```mermaid
graph TD
    subgraph "User Interface (Next.js)"
        UI[Web Application]
        Voice[Voice Input]
    end

    subgraph "Backend Services (Firebase/Google Cloud)"
        Auth[Firebase Authentication]
        API[Cloud Functions API]
        RTDB[Firebase Realtime DB]
        GCS[Cloud Storage]
        BQ[BigQuery]
    end

    subgraph "AI Core (Vertex AI / Google Cloud)"
        GNN[Recommendation Model (GNN on Vertex AI)]
        MultiAgent[Multi-Agent System (LangGraph + Gemini/Gemma)]
        STT[Speech-to-Text API]
        Vision[Cloud Vision API (Future)]
    end

    subgraph "External Data Sources"
        WHO[WHO Guidelines]
        NIN[Vietnam NIN Data]
        FoodDB[Vietnamese Food DB]
        UserHealth[User Health Data (NHANES/Surveys)]
    end

    UI -- User Input/Requests --> API
    Voice -- Processed Text --> API
    API -- Authentication --> Auth
    API -- Data Storage/Retrieval --> RTDB
    API -- User Analytics --> BQ
    API -- File Storage --> GCS
    API -- Recommendation Request --> GNN
    API -- Explanation Request --> MultiAgent
    API -- Voice Processing --> STT

    GNN -- Trained Model --> Vertex AI Deployment
    GNN -- Uses Data --> FoodDB
    GNN -- Uses Data --> UserHealth

    MultiAgent -- Uses LLM --> Gemini/Gemma
    MultiAgent -- Fact-Checking --> SearchAgent(Search Agent)
    MultiAgent -- Internal Knowledge --> RAGAgent(RAG Agent)
    MultiAgent -- Reasoning --> ReasoningAgent(Reasoning Agent)
    MultiAgent -- Content Generation --> ContentWriter(Content Writer)
    MultiAgent -- Planning --> ScheduleAgent(Schedule Agent)

    SearchAgent -- Accesses --> WHO
    SearchAgent -- Accesses --> NIN
    RAGAgent -- Accesses --> InternalDocs(Internal Documents/DB)

    UI <-- Responses/Recommendations --- API

    %% Styling
    classDef frontend fill:#f9f,stroke:#333,stroke-width:2px;
    classDef backend fill:#ccf,stroke:#333,stroke-width:2px;
    classDef ai fill:#cfc,stroke:#333,stroke-width:2px;
    classDef data fill:#ffc,stroke:#333,stroke-width:2px;

    class UI,Voice frontend;
    class Auth,API,RTDB,GCS,BQ backend;
    class GNN,MultiAgent,STT,Vision ai;
    class WHO,NIN,FoodDB,UserHealth data;

```

*This diagram provides a high-level overview. The Multi-Agent System involves complex interactions between specialized agents.*

---

## Getting Started

Follow these instructions to set up and run the NutriCare AI project locally.

### Prerequisites

*   **Node.js:** Version 18.x or later (Download: [https://nodejs.org/](https://nodejs.org/))
*   **npm** or **yarn:** Package manager (comes with Node.js)
*   **Git:** Version control system (Download: [https://git-scm.com/](https://git-scm.com/))
*   **Firebase Account:** For authentication and database services ([https://firebase.google.com/](https://firebase.google.com/))
*   **Google Cloud Account:** For AI services (Vertex AI, Speech-to-Text, etc.) ([https://cloud.google.com/](https://cloud.google.com/))

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/technoob05/NutriAI.git # Replace with your actual repo URL if different
    cd NutriAI # Navigate into the project directory
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Environment Variables

The application requires environment variables for connecting to Firebase and Google Cloud services.

1.  Create a `.env.local` file in the root of the project directory:
    ```bash
    touch .env.local
    ```

2.  Add the necessary environment variables to `.env.local`. You will need to obtain these keys and configuration details from your Firebase and Google Cloud project settings:

    ```plaintext
    # Firebase Configuration (Get from Firebase Project Settings > General > Your apps > SDK setup and configuration)
    NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
    NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID # Optional

    # Google Cloud Configuration (Credentials for Vertex AI, Speech-to-Text, etc.)
    # How you configure Google Cloud access depends on the specific setup (e.g., service account key file path, Application Default Credentials)
    # Example for a service account key file:
    # GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json

    # Other API Keys (if any)
    # NEXT_PUBLIC_SOME_OTHER_API_KEY=YOUR_OTHER_KEY
    ```

    **Important:** Ensure your Google Cloud environment is properly authenticated (e.g., via `gcloud auth application-default login` or by setting `GOOGLE_APPLICATION_CREDENTIALS`).

### Running the Application

1.  **Start the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```

2.  Open your browser and navigate to `http://localhost:3000` (or the port specified in the console).

---

## Usage Guide

1.  **Registration/Login:** Create an account or log in using Firebase Authentication.
2.  **Profile Setup:** Provide initial health information (age, gender, health conditions, dietary restrictions, preferences, budget level). This helps personalize recommendations.
3.  **Get Recommendations:** Request meal plans or specific dish suggestions.
4.  **Interact with AI:**
    *   Ask for explanations about why a meal was recommended.
    *   Request modifications based on taste or ingredient availability.
    *   Use voice commands for hands-free interaction.
5.  **View Meal Plans:** Access daily or weekly meal schedules generated by the Schedule Agent.
6.  **Explore Food Database:** Browse information about Vietnamese dishes and ingredients.

---

## Future Development

Our roadmap includes expanding NutriCare AI's capabilities:

*   **Wider Scope:**
    *   Support for 50+ health conditions.
    *   Regional customization (North, Central, South Vietnam).
    *   Versions for specific demographics (children, pregnant women, athletes).
    *   Community platform for sharing recipes and experiences.
*   **Deeper Analysis:**
    *   Budget optimization with seasonal/local ingredient substitutions.
    *   Micronutrient analysis (vitamins, minerals).
    *   **Vision Integration:** Analyze nutrition from food photos (Google Cloud Vision API).
    *   **Smart Device Integration:** Connect with wearables like Google Pixel Watch (via Google Fit).
    *   **Image Generation:** Create illustrative images of recommended dishes (e.g., using Gemini API).
*   **Platform Expansion:**
    *   API for third-party integration.
    *   Clinical versions for hospitals and clinics.

**Project Goals & Impact:**

*   **Improve Public Health:** Aim to reduce nutrition-related disease costs by 15% in 3 years and improve quality of life for chronic patients by 25%.
*   **Promote Social Equity:** Provide high-quality nutritional advice to all, regardless of income or ability.
*   **Empower Users:** Enable individuals to take control of their health through informed dietary choices.
*   **Sustainability:** Reduce food waste by 30% through smarter planning and promote local/seasonal food consumption.

---

## Meet the Team (404 Brain Not Found)

*   **Nguyễn Lâm Phú Quý:** Product Manager / Data Scientist
*   **Huỳnh Trung Kiệt:** AI Engineer
*   **Đào Sỹ Duy Minh:** AI Engineer
*   **Bàng Mỹ Linh:** AI Engineer
*   **Phan Bá Thanh:** Data Engineer

---

## Contributing

We welcome contributions! Please read our `CONTRIBUTING.md` file (if available) for guidelines on how to contribute to the project. <!-- Add a CONTRIBUTING.md if you plan to accept contributions -->

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. <!-- Create a LICENSE file with MIT License text -->

---

## Contact

*   **Project Lead:** Nguyễn Lâm Phú Quý
*   **Email:** [nguyenlamphuquykh@gmail.com](mailto:nguyenlamphuquykh@gmail.com)
*   **Phone:** 0392794728
*   **CVs/Portfolio:** [Team Drive Folder](https://drive.google.com/drive/folders/11mYK9Y27pWBh4bT4Tzd7kN8u9u6O-PU3?usp=sharing)
*   **GitHub:** [technoob05](https://github.com/technoob05)
