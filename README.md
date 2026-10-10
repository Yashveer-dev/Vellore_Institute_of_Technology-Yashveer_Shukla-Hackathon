**Real-Time AI/NLP Financial Risk Engine & Wholesale Portfolio Stress Tester - S&P Global & Crisil Campus Hackathon**

**Candidate Name:** Yashveer Shukla

**College Email ID:** <yashveer.24bca7532@vitapstudent.ac.in>

**College / Campus:** Vellore Institute of Technology

**1\. Project Overview / Problem Statement & Approach**

Traditional financial risk management systems rely heavily on lagging numerical reporting cycles. Early indicators of liquidity crises, central bank rate shifts, or geopolitical disruptions often emerge first across unstructured channels like breaking news headlines, financial wires, and social media. This latency exposes institutions to unmitigated downside risks.

To solve this challenge, we built an end-to-end institutional financial risk intelligence platform designed to ingest unstructured market wires in real time, extract structured risk signals using financial NLP, and execute automated portfolio stress testing on wholesale banking assets. The platform bridges unstructured text processing and quantitative risk modeling through two core components: an **AI/NLP Risk Engine** powered by ProsusAI/FinBERT and automated geocoding, and **Module B (Strategic Portfolio Stress Tester)**, which monitors emitted risk signals and automatically triggers multi-asset shock simulations against a wholesale banking portfolio valued at **\$278.5M USD**. The system features a dual interface comprising an analytical Streamlit control panel and an interactive React/Vite 3D WebGL risk geosphere.

**2\. Architecture & Tech Stack**

- **System Design & Data Flow:**
  1. **Data Ingestion Tier:** Live connectors fetch breaking headlines from GDELT 2.0, Google News RSS, NewsAPI, and Finnhub.
  2. **AI/NLP Processing Engine:** ProsusAI/FinBERT transformer model and financial lexicons extract sentiment scores, event classifications, and geocoded coordinates.
  3. **Data Exchange:** Structured JSON payloads are served via an asynchronous FastAPI backend (api_server.py).
  4. **Downstream Stress Testing:** High-severity events () trigger quantitative mark-to-market haircuts and probability-of-default (PD) surges across wholesale banking exposures.
  5. **Presentation Tier:** Interactive dashboards built with Streamlit (app.py) and a React/Vite frontend featuring an interactive Three.js 3D WebGL RiskGlobe component.
- **Key Frameworks, Databases, and Libraries:**
  1. **Backend & API:** Python 3.11, FastAPI, Uvicorn, Pydantic V2
  2. **NLP & Analytics:** HuggingFace Transformers (ProsusAI/FinBERT), TextBlob, Pandas, Plotly
  3. **Frontend & Visualization:** React, Vite, TypeScript, Tailwind CSS, Three.js, Lucide Icons
  4. **Analytical Dashboard:** Streamlit

**3\. Dataset Used**

- **Source & Nature of Data:** The platform combines real-time live REST API ingestion feeds (GDELT 2.0, Google News RSS, NewsAPI, Finnhub) with a curated, institutional benchmark dataset of historical financial risk shocks. Downstream stress testing utilizes a synthetic wholesale banking portfolio representing **\$278.5M USD Exposure at Default (EAD)** across five asset classes (Corporate Loans, Sovereign Bonds, Derivatives, Commercial Real Estate, and High-Yield Notes) conforming to Basel III and CRISIL/S&P reporting standards.
- **Assumptions:** Assumes standard Basel III wholesale asset class risk weightings, linear mark-to-market depreciation under specified stress multipliers, and primary financial hub geocoding mappings.

**4\. Quickstart & Installation**

**Runtime:** Python 3.11 / Node.js 20+ tested on Windows PowerShell / macOS / Linux

Step-by-step commands to set up the environment and run your code locally:

Bash

\# 1. Clone the repository

git clone &lt;https://github.com/Yashveer-dev/Vellore_Institute_of_Technology-Yashveer_Shukla-Hackathon/&gt;

cd &lt;repo-folder&gt;

\# 2. Set up Python Backend & Install Dependencies

python -m venv venv

\# On Windows PowerShell:

.\\venv\\Scripts\\activate

\# On macOS / Linux:

\# source venv/bin/activate

pip install -r requirements.txt

\# 3. Run the NLP Risk Engine to generate base signals

python risk_engine.py

\# 4. Start the FastAPI backend server (Port 8000)

python api_server.py

\# 5. In a separate terminal, launch the Streamlit analytical dashboard

streamlit run app.py

\# 6. In another terminal, set up and run the React frontend

cd frontend

npm install

npm run dev


**5\. Key Results & Domain Impact**

- **Prototype Outputs:**
  - Converts unstructured breaking news wires into standardized, machine-readable JSON payloads containing normalized sentiment polarity, event taxonomy classification, and impact severity scores.
  - Automatically executes event-driven wholesale portfolio stress tests, reducing portfolio valuation from **\$278.50M to \$253.52M (-8.97% MTM)** and surging expected losses when high-severity shocks are detected.
  - Renders an interactive 3D WebGL risk geosphere featuring dotted continental landmasses, latitude/longitude grid lines, mouse drag/hover controls, and animated contagion flow arcs targeting institutional portfolio hubs (e.g., Mumbai).
- **Business Value:** Shifts institutional risk management from reactive reporting to real-time predictive monitoring, automating Basel III compliance workflows and providing granular geospatial visibility into cross-border financial contagion.
