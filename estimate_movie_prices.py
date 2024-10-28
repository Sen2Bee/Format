import mysql.connector
from mysql.connector import errorcode
from tqdm import tqdm  # Importiere tqdm für den Fortschrittsbalken
from vars import db_name, db_passwd, db_user, themes, search_conditions

# Database configuration
db_config = {
    'host': 'localhost',
    'user': db_user,   # replace with your actual db_user
    'password': db_passwd,  # replace with your actual db_passwd
    'database': db_name   # replace with your actual db_name
}

import mysql.connector
from mysql.connector import errorcode
from tqdm import tqdm  # For progress bar
import math


# Maximum estimated price (for rare collector's items)
MAX_ESTIMATED_PRICE = 80.0  # Euros

# Average price range for most movies
AVERAGE_PRICE_MIN = 2.0
AVERAGE_PRICE_MAX = 10.0

def connect_to_database():
    """
    Establishes a connection to the MySQL database.
    """
    try:
        cnx = mysql.connector.connect(**db_config)
        cursor = cnx.cursor(dictionary=True)
        print("Successfully connected to the database.")
        return cnx, cursor
    except mysql.connector.Error as err:
        handle_database_error(err)

def handle_database_error(err):
    """
    Handles database connection errors.
    """
    if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        print("Error: Incorrect database username or password.")
    elif err.errno == errorcode.ER_BAD_DB_ERROR:
        print("Error: Database does not exist.")
    else:
        print(f"Database error: {err}")
    exit(1)

def add_est_price_column(cursor, cnx):
    """
    Adds the 'est_price' column to the 'movies' table if it doesn't exist.
    """
    cursor.execute("""
        SELECT COUNT(*) AS count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'movies' 
          AND COLUMN_NAME = 'est_price' 
          AND TABLE_SCHEMA = DATABASE();
    """)
    result = cursor.fetchone()
    if result['count'] == 0:
        print("Adding 'est_price' column to 'movies' table...")
        cursor.execute("""
            ALTER TABLE movies 
            ADD COLUMN est_price DECIMAL(5,2) NULL;
        """)
        cnx.commit()
        print("'est_price' column added successfully.")
    else:
        print("'est_price' column already exists.")

def fetch_movie_data(cursor):
    """
    Fetches necessary data for each movie for estimated price calculation.
    """
    cursor.execute("""
        SELECT 
            m.movie_id,
            m.imdb_rating,
            m.imdb_votes,
            m.tmdb_rating,
            m.tmdb_votes,
            m.format_ausleihen,
            m.release_date
        FROM 
            movies m
    """)
    return cursor.fetchall()

def fetch_additional_factors(cursor, movie_id):
    """
    Fetches additional factors such as awards count.
    """
    # Fetch total awards
    cursor.execute("SELECT COUNT(*) AS total_awards FROM awards WHERE movie_id = %s", (movie_id,))
    total_awards = cursor.fetchone()['total_awards']

    return total_awards

def calculate_composite_score(movie, total_awards):
    """
    Calculates a composite score based on various factors.
    """
    # Extract and clean data
    imdb_rating = float(movie['imdb_rating']) if movie['imdb_rating'] else 0.0
    imdb_votes = int(movie['imdb_votes'].replace(',', '')) if movie['imdb_votes'] else 0
    tmdb_rating = float(movie['tmdb_rating']) if movie['tmdb_rating'] else 0.0
    tmdb_votes = int(movie['tmdb_votes'].replace(',', '')) if movie['tmdb_votes'] else 0
    format_ausleihen = float(movie['format_ausleihen']) if movie['format_ausleihen'] else 0.0
    release_year = int(movie['release_date']) if movie['release_date'] else 0

    # Factors
    current_year = 2023  # Update to current year
    age_factor = (current_year - release_year) if release_year > 0 else 0
    popularity_factor = (imdb_votes + tmdb_votes) / 1000  # Scaled down
    rating_factor = (imdb_rating + tmdb_rating) / 2
    rental_factor = format_ausleihen
    awards_factor = total_awards

    # Calculate composite score
    composite_score = (
        (rating_factor * 2) + 
        (math.log1p(popularity_factor)) +  # Natural log to scale down
        (awards_factor * 3) + 
        (math.log1p(rental_factor)) -  # Rentals might reduce value due to wear
        (age_factor * 0.1)  # Older movies may be less valuable unless rare
    )

    return composite_score

def scale_price(composite_score):
    """
    Scales the composite score to a realistic price within the specified range.
    """
    # Define the maximum and minimum composite scores expected
    MAX_COMPOSITE_SCORE = 50
    MIN_COMPOSITE_SCORE = 0

    # Ensure composite score is within bounds
    composite_score = max(min(composite_score, MAX_COMPOSITE_SCORE), MIN_COMPOSITE_SCORE)

    # Scale composite score to price range
    if composite_score >= (MAX_COMPOSITE_SCORE * 0.9):
        # Rare collector's item
        est_price = MAX_ESTIMATED_PRICE
    else:
        # Linear scaling within average price range
        est_price = AVERAGE_PRICE_MIN + (
            (composite_score - MIN_COMPOSITE_SCORE) / (MAX_COMPOSITE_SCORE - MIN_COMPOSITE_SCORE)
        ) * (AVERAGE_PRICE_MAX - AVERAGE_PRICE_MIN)
    
    # Round to two decimal places
    est_price = round(est_price, 2)
    return est_price

def update_estimated_prices(cursor, cnx):
    """
    Updates the movies table with estimated prices for each movie.
    """
    movies = fetch_movie_data(cursor)

    print("Calculating estimated prices...")

    # Progress bar for tracking
    for movie in tqdm(movies, desc="Updating estimated prices"):
        movie_id = movie['movie_id']

        # Fetch additional factors
        total_awards = fetch_additional_factors(cursor, movie_id)

        # Calculate composite score
        composite_score = calculate_composite_score(movie, total_awards)

        # Scale composite score to estimated price
        est_price = scale_price(composite_score)

        # Update estimated price in the database
        cursor.execute("""
            UPDATE movies
            SET est_price = %s
            WHERE movie_id = %s
        """, (est_price, movie_id))
        cnx.commit()

def main():
    cnx, cursor = connect_to_database()
    add_est_price_column(cursor, cnx)
    update_estimated_prices(cursor, cnx)
    cursor.close()
    cnx.close()
    print("Estimated prices updated successfully.")

if __name__ == "__main__":
    main()
