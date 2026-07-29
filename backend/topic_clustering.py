import os
import mysql.connector
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
import numpy as np

load_dotenv()

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

def determine_category_name(top_words):
    """Maps cluster top keywords to human-readable categories based on domain rules."""
    words_set = set(top_words)
    
    # Category rule matching
    if words_set & {"charge", "refund", "card", "billing", "money", "charged", "bank", "payment"}:
        return "Billing & Refunds"
    elif words_set & {"login", "password", "reset", "account", "access", "expired", "link", "dashboard"}:
        return "Account & Access"
    elif words_set & {"bug", "crash", "crashed", "error", "session", "system", "downtime", "failed"}:
        return "Technical Issues"
    elif words_set & {"thank", "thanks", "great", "service", "good", "excellent", "love"}:
        return "Customer Feedback"
    else:
        return "General Inquiry"

def cluster_and_categorize_tickets(num_clusters=4):
    conn = get_db_connection()
    if not conn:
        return

    cursor = conn.cursor(dictionary=True)

    # 1. Fetch tickets where category is NULL or unassigned
    query = """
        SELECT 
            t.tick_id,
            m_in.content AS complaint_text
        FROM tickets t
        INNER JOIN mail m_in ON m_in.mail_id = (
            SELECT mail_id FROM mail 
            WHERE tick_id = t.tick_id AND LOWER(direction) = 'incoming' 
            ORDER BY created_at ASC LIMIT 1
        )
        WHERE t.category IS NULL OR t.category = '';
    """
    cursor.execute(query)
    tickets = cursor.fetchall()

    if not tickets:
        print("ℹ️ No uncategorized tickets found in database.")
        cursor.close()
        conn.close()
        return

    if len(tickets) < num_clusters:
        print(f"⚠️ Need at least {num_clusters} tickets to run clustering. Found {len(tickets)}.")
        cursor.close()
        conn.close()
        return

    print(f"🔍 Running K-Means Topic Clustering on {len(tickets)} tickets...")

    # Extract corpus text list and track ticket IDs
    corpus = [t['complaint_text'] for t in tickets]
    ticket_ids = [t['tick_id'] for t in tickets]

    # 2. Vectorize text using TF-IDF with English stop words filtering
    vectorizer = TfidfVectorizer(stop_words='english', max_features=500)
    X = vectorizer.fit_transform(corpus)

    # 3. Fit K-Means Model
    kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
    kmeans.fit(X)

    # 4. Identify top terms per cluster center
    terms = vectorizer.get_feature_names_out()
    cluster_category_map = {}

    print("\n--- Identified Topic Clusters ---")
    for cluster_id in range(num_clusters):
        # Sort terms by centroid weight
        centroid = kmeans.cluster_centers_[cluster_id]
        top_term_indices = centroid.argsort()[-8:][::-1]
        top_words = [terms[i] for i in top_term_indices]
        
        # Determine category label based on keywords
        category_name = determine_category_name(top_words)
        cluster_category_map[cluster_id] = category_name
        
        print(f"Cluster {cluster_id} -> Top Terms: {top_words[:4]} => Tagged as: [{category_name}]")

    # 5. Assign predictions and update MySQL
    update_query = "UPDATE tickets SET category = %s WHERE tick_id = %s"
    
    updated_count = 0
    for idx, cluster_label in enumerate(kmeans.labels_):
        assigned_category = cluster_category_map[cluster_label]
        tick_id = ticket_ids[idx]
        cursor.execute(update_query, (assigned_category, tick_id))
        updated_count += 1

    conn.commit()
    cursor.close()
    conn.close()
    print(f"\n🎉 Day 3 Batch Complete! Categorized {updated_count} tickets.")

if __name__ == "__main__":
    cluster_and_categorize_tickets(num_clusters=4)