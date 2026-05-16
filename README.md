# 🐦 Twitter Sentiment Analysis

An AI-powered full-stack application that analyzes Twitter posts and classifies them into Positive 😊, Negative 😡, or Neutral 😐 sentiments using Machine Learning and Natural Language Processing.

## ✨ Features
* **Machine Learning Pipeline**: Trained Scikit-Learn models (Logistic Regression, SVM, Random Forest) utilizing TF-IDF.
* **NLP Preprocessing**: Hybrid text cleaning using **SpaCy** and **NLTK** (stopwords, lemmatization, emoji/URL removal).
* **Live Sentiment Stream**: Simulates a real-time feed of tweets and visually maps the sentiment ratio.
* **Visual Dashboards**: Word Cloud generation and an interactive Model Metrics dashboard (Accuracy, F1 Score, Confusion Matrix).
* **Batch Processing**: Upload CSV files for bulk tweet sentiment evaluation.

---

## 🛠️ Tech Stack
* **Frontend**: Next.js, React, Tailwind CSS, Recharts, Lucide Icons.
* **Backend**: Python, FastAPI, Uvicorn.
* **Machine Learning**: Scikit-Learn, SpaCy, NLTK, Pandas.

---

## 🚀 How to Run Locally

You will need two separate terminal windows: one for the Python Backend and one for the Next.js Frontend.

### 1. Start the Python Backend
Open a terminal in the `backend/` folder and run the following commands:

```bash
cd backend

# Create a virtual environment (optional but recommended)
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
# source venv/bin/activate

# Install all Python dependencies
pip install -r requirements.txt

# Download the SpaCy English language model
python -m spacy download en_core_web_sm

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```
*The API will be running at `http://localhost:8000`*

### 2. Start the Next.js Frontend
Open a **new** terminal in the `frontend/` folder and run:

```bash
cd frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```
*The web application will be running at `http://localhost:3000`*

---

## 🧠 Training the Model (Optional)
If you want to re-train the machine learning models or generate a new `metrics.json` file, run the training script from the `backend/` folder:

```bash
cd backend
venv\Scripts\activate
python ml/train.py
```
