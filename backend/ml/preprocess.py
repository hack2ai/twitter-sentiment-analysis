import re
import string
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import spacy

# Load SpaCy English model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading en_core_web_sm...")
    import subprocess
    subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
    nlp = spacy.load("en_core_web_sm")
# Ensure required NLTK resources are downloaded (this will run once)
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet', quiet=True)


def clean_text(text: str) -> str:
    """
    Cleans tweet text by removing URLs, emojis, mentions, hashtags, and stopwords.
    """
    if not isinstance(text, str):
        return ""
    
    # 1. Lowercase
    text = text.lower()
    
    # 2. Remove URLs
    text = re.sub(r"http\S+|www\S+|https\S+", '', text, flags=re.MULTILINE)
    
    # 3. Remove mentions and hashtags
    text = re.sub(r'\@\w+|\#\w+', '', text)
    
    # 4. Remove emojis (basic removal using ASCII filtering)
    text = text.encode('ascii', 'ignore').decode('ascii')
    
    # 5. Remove punctuation
    text = text.translate(str.maketrans('', '', string.punctuation))
    
    # 6. Tokenization (basic split)
    tokens = text.split()
    
    # 7. Remove stopwords
    stop_words = set(stopwords.words('english'))
    tokens = [word for word in tokens if word not in stop_words]
    
    # 8. Lemmatization using SpaCy
    doc = nlp(" ".join(tokens))
    tokens = [token.lemma_ for token in doc]
    
    return " ".join(tokens)

if __name__ == "__main__":
    # Test
    sample = "I love this AI project!!! 😍🔥 #AI @user http://example.com"
    print(f"Original: {sample}")
    print(f"Cleaned:  {clean_text(sample)}")
