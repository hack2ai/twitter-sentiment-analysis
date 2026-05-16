import os
import pickle
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from preprocess import clean_text

MODEL_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(MODEL_DIR, "sentiment_model.pkl")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "vectorizer.pkl")

def get_training_data():
    data = {
        'text': [
            "I love this app, it is absolutely amazing!",
            "This is the worst experience I have ever had.",
            "I feel okay about this new feature, nothing special.",
            "What a fantastic day to be alive!",
            "I am so angry and disappointed with the service.",
            "The product is average, neither good nor bad.",
            "Brilliant work, highly recommended!",
            "Terrible customer support, I hate it.",
            "It's just another normal day.",
            "Superb quality and excellent design.",
            "I regret buying this, total waste of money.",
            "The color is blue."
        ] * 20, 
        'sentiment': [
            "positive", "negative", "neutral", "positive", "negative", "neutral",
            "positive", "negative", "neutral", "positive", "negative", "neutral"
        ] * 20
    }
    return pd.DataFrame(data)

def train_models():
    print("Fetching and preparing dataset...")
    df = get_training_data()
    
    print("Preprocessing text...")
    df['cleaned_text'] = df['text'].apply(clean_text)
    
    X = df['cleaned_text']
    y = df['sentiment']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Extracting features with TF-IDF...")
    vectorizer = TfidfVectorizer(max_features=5000)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000),
        "Naive Bayes": MultinomialNB(),
        "Linear SVM": LinearSVC(),
        "Random Forest": RandomForestClassifier(n_estimators=50, random_state=42)
    }
    
    best_model = None
    best_accuracy = 0
    best_model_name = ""
    
    print("Training models...")
    for name, model in models.items():
        model.fit(X_train_vec, y_train)
        y_pred = model.predict(X_test_vec)
        acc = accuracy_score(y_test, y_pred)
        print(f"{name} Accuracy: {acc:.4f}")
        
        if acc > best_accuracy:
            best_accuracy = acc
            best_model = model
            best_model_name = name
            
    print(f"\nBest model: {best_model_name} with Accuracy: {best_accuracy:.4f}")
    
    # Calculate detailed metrics for the best model
    from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix
    import json
    
    y_pred_best = best_model.predict(X_test_vec)
    metrics = {
        "accuracy": float(best_accuracy),
        "precision": float(precision_score(y_test, y_pred_best, average='weighted', zero_division=0)),
        "recall": float(recall_score(y_test, y_pred_best, average='weighted', zero_division=0)),
        "f1_score": float(f1_score(y_test, y_pred_best, average='weighted', zero_division=0)),
        "confusion_matrix": confusion_matrix(y_test, y_pred_best).tolist(),
        "classes": best_model.classes_.tolist()
    }
    
    metrics_path = os.path.join(MODEL_DIR, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
        
    print(f"Metrics saved to {metrics_path}")
    
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(best_model, f)
    with open(VECTORIZER_PATH, "wb") as f:
        pickle.dump(vectorizer, f)
        
    print(f"Model saved to {MODEL_PATH}")

if __name__ == "__main__":
    train_models()
