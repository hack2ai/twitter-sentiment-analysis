import os
import pickle
from ml.preprocess import clean_text
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

MODEL_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(MODEL_DIR, "sentiment_model.pkl")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "vectorizer.pkl")

# Initialize VADER as a fallback/immediate model
vader_analyzer = SentimentIntensityAnalyzer()

model = None
vectorizer = None

def load_custom_model():
    global model, vectorizer
    if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
        try:
            with open(MODEL_PATH, "rb") as f:
                model = pickle.load(f)
            with open(VECTORIZER_PATH, "rb") as f:
                vectorizer = pickle.load(f)
            print("Custom ML model loaded successfully.")
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    return False

# Attempt to load custom model on startup
load_custom_model()

def predict_sentiment(text: str) -> dict:
    """
    Predicts sentiment. Uses custom Scikit-Learn model if available,
    otherwise falls back to VADER SentimentIntensityAnalyzer.
    """
    cleaned_text = clean_text(text)
    
    if model and vectorizer:
        # Use custom ML model
        vec_text = vectorizer.transform([cleaned_text])
        prediction = model.predict(vec_text)[0]
        
        # Get probability (confidence score)
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(vec_text)[0]
            confidence = float(max(proba))
        else:
            confidence = 1.0 # Default if model doesn't support proba
            
        return {
            "sentiment": prediction,
            "confidence": confidence,
            "method": "custom_ml",
            "cleaned_text": cleaned_text
        }
    else:
        # Fallback to VADER
        scores = vader_analyzer.polarity_scores(cleaned_text if cleaned_text else text)
        compound = scores['compound']
        
        if compound >= 0.05:
            sentiment = "positive"
        elif compound <= -0.05:
            sentiment = "negative"
        else:
            sentiment = "neutral"
            
        # VADER compound score is roughly equivalent to a "confidence" between -1 and 1
        confidence = abs(compound) if abs(compound) > 0 else 0.5
        
        return {
            "sentiment": sentiment,
            "confidence": confidence,
            "method": "vader_fallback",
            "cleaned_text": cleaned_text
        }

if __name__ == "__main__":
    print(predict_sentiment("I absolutely love this new AI feature! It is amazing."))
    print(predict_sentiment("This is the worst experience I have ever had. Terrible."))
    print(predict_sentiment("The sky is blue today."))
