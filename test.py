import mysql.connector

# Database connection configuration
db_config = {
    'host': 'localhost',
    'user': 'tom',          # Replace with your database username
    'password': 'user',     # Replace with your database password
    'database': 'formatdb'  # Replace with your database name
}

# Sample movie ID to test with (Replace with a valid format_filmId from your database)
sample_movie_id = 1234  # Update with an actual format_filmId from your database

# Function to fetch detailed movie information for a given format_filmId
def fetch_movie_details(movie_id):
    try:
        # Connect to the database
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)
        
        # SQL query to fetch detailed movie information
        query = """
        SELECT 
            m.format_filmId, 
            COALESCE(m.format_titel, m.title) AS main_title,  
            m.original_title, 
            m.release_date, 
            m.runtime, 
            m.imdb_id, 
            m.imdb_rating, 
            m.format_fsk, 
            m.folder_name, 
            m.overview, 
            m.format_standort,  
            GROUP_CONCAT(DISTINCT c.country SEPARATOR ', ') AS countries,
            GROUP_CONCAT(DISTINCT g.genre SEPARATOR ', ') AS genres,
            (SELECT name FROM crew WHERE crew.movie_id = m.format_filmId AND job = 'Director' LIMIT 1) AS director,
            (SELECT GROUP_CONCAT(DISTINCT cast.name ORDER BY cast.popularity DESC SEPARATOR ', ') 
                FROM cast WHERE cast.movie_id = m.format_filmId LIMIT 3) AS actors,
            TRIM(BOTH ', ' FROM CONCAT_WS(', ',
                CASE WHEN m.format_vhs > 0 THEN CONCAT('VHS (', m.format_vhs, ')') ELSE NULL END, 
                CASE WHEN m.format_dvd > 0 THEN CONCAT('DVD (', m.format_dvd, ')') ELSE NULL END, 
                CASE WHEN m.format_blu > 0 THEN CONCAT('Blu-ray (', m.format_blu, ')') ELSE NULL END, 
                CASE WHEN m.format_blu3 > 0 THEN CONCAT('Blu-ray 3D (', m.format_blu3, ')') ELSE NULL END
            )) AS formats
        FROM 
            movies m
            LEFT JOIN genres g ON m.format_filmId = g.movie_id
            LEFT JOIN countries c ON m.format_filmId = c.movie_id
        WHERE 1=1

        """
        
        # Execute the query with the provided format_filmId
        cursor.execute(query, (movie_id,))
        
        # Fetch and display the results
        movie_details = cursor.fetchone()
        if movie_details:
            print(f"Movie details for format_filmId {movie_id}:")
            for key, value in movie_details.items():
                print(f"{key}: {value}")
        else:
            print(f"No details found for format_filmId {movie_id}.")
        
        # Close the connection
        cursor.close()
        connection.close()

    except mysql.connector.Error as err:
        print(f"Error: {err}")
    except Exception as e:
        print(f"Unexpected error: {e}")

# Run the test function
if __name__ == "__main__":
    fetch_movie_details(sample_movie_id)
