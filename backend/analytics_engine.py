import os
import mysql.connector
from dotenv import load_dotenv
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime

# Load environment variables from .env
load_dotenv()

# Initialize NLTK Sentiment Analyzer
sia = SentimentIntensityAnalyzer()

def get_db_connection():
    """Establishes connection to the MySQL database."""
    try:
        return mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "mailengine"),
            port=int(os.getenv("DB_PORT", 3307))
        )
    except mysql.connector.Error as err:
        print(f"❌ DB Connection Error: {err}")
        return None

def analyze_sentiment(text):
    """Returns compound sentiment score from -1.0 (negative) to +1.0 (positive)."""
    if not text or not text.strip():
        return 0.0
    scores = sia.polarity_scores(text)
    return float(scores['compound'])

def calculate_draft_accuracy(original_ai_draft, final_sent_text):
    """Calculates Cosine Similarity between AI draft and final sent text (0.0 to 1.0).
    Returns None (MySQL NULL) if either text is missing or empty.
    """
    # Guard check: Ensure both inputs are non-empty strings
    if not original_ai_draft or not final_sent_text or not original_ai_draft.strip() or not final_sent_text.strip():
        return None  # Maps directly to MySQL NULL

    # Exact string match check
    if original_ai_draft.strip().lower() == final_sent_text.strip().lower():
        return 1.0

    try:
        vectorizer = TfidfVectorizer().fit_transform([original_ai_draft, final_sent_text])
        vectors = vectorizer.toarray()
        csim = cosine_similarity([vectors[0]], [vectors[1]])[0][0]
        return float(round(csim, 2))
    except Exception as e:
        print(f"⚠️ Vectorizer warning: {e}")
        return None

def process_and_update_tickets():
    conn = get_db_connection()
    if not conn:
        return

    cursor = conn.cursor(dictionary=True)

    # Query uses subqueries to guarantee 1 row per unique ticket
    query = """
        SELECT 
            t.tick_id,
            m_in.content AS complaint_text,
            COALESCE(m_draft.content, '') AS ai_draft_text,
            COALESCE(m_out.content, '') AS sent_text
        FROM tickets t
        INNER JOIN mail m_in ON m_in.mail_id = (
            SELECT mail_id FROM mail 
            WHERE tick_id = t.tick_id AND LOWER(direction) = 'incoming' 
            ORDER BY created_at ASC LIMIT 1
        )
        LEFT JOIN mail m_draft ON m_draft.mail_id = (
            SELECT mail_id FROM mail 
            WHERE tick_id = t.tick_id AND LOWER(direction) = 'internal' 
            ORDER BY created_at DESC LIMIT 1
        )
        LEFT JOIN mail m_out ON m_out.mail_id = (
            SELECT mail_id FROM mail 
            WHERE tick_id = t.tick_id AND LOWER(direction) = 'outgoing' 
            ORDER BY created_at DESC LIMIT 1
        )
        WHERE t.sentiment_score IS NULL
        LIMIT 20;
    """
    cursor.execute(query)
    tickets = cursor.fetchall()

    if not tickets:
        print("ℹ️ No unanalyzed tickets with incoming email text found.")
        cursor.close()
        conn.close()
        return

    print(f"🔍 Processing {len(tickets)} valid tickets for Sentiment & Accuracy...")

    update_query = """
        UPDATE tickets 
        SET sentiment_score = %s, ai_accuracy = %s, analyzed_at = %s
        WHERE tick_id = %s
    """

    for t in tickets:
        ticket_id = t['tick_id']
        complaint = t['complaint_text'] or ""
        sent_text = t['sent_text'] or ""
        ai_draft = t['ai_draft_text'] or ""

        # Run NLP models
        sentiment = analyze_sentiment(complaint)
        accuracy = calculate_draft_accuracy(ai_draft, sent_text)

        now = datetime.now()

        # Update MySQL (None values automatically translate to NULL in MySQL)
        cursor.execute(update_query, (sentiment, accuracy, now, ticket_id))
        
        # Safe string formatting for terminal output
        accuracy_str = f"{accuracy * 100:.0f}%" if accuracy is not None else "N/A (No Draft)"
        print(f"✅ Updated [{ticket_id}] -> Sentiment: {sentiment:.2f} | Accuracy: {accuracy_str}")

    conn.commit()
    cursor.close()
    conn.close()
    print("🎉 Day 2 Batch Complete!")

if __name__ == "__main__":
    process_and_update_tickets()