import mysql.connector

# Database connection configuration
db_config = {
    'host': 'localhost',
    'user': 'tom',
    'password': 'user',
    'database': 'formatdb'
}

def fetch_featured_movies():
    try:
        # Connect to the database
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)

        # Modified query to return unique movie titles where poster_images > 0
        base_query = """
            SELECT
                m.movie_id,
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
                GROUP_CONCAT(DISTINCT g.genre SEPARATOR ', ') AS genres,  -- Correct retrieval of genres      
                (SELECT name FROM crew WHERE crew.movie_id = m.movie_id AND job = 'Director' LIMIT 1) AS director,
                (SELECT GROUP_CONCAT(DISTINCT cast.name ORDER BY cast.popularity DESC SEPARATOR ', ')
                    FROM cast WHERE cast.movie_id = m.movie_id LIMIT 3) AS actors,
                TRIM(BOTH ', ' FROM CONCAT_WS(', ',
                    CASE WHEN m.format_vhs > 0 THEN CONCAT('VHS (', m.format_vhs, ')') ELSE NULL END,
                    CASE WHEN m.format_dvd > 0 THEN CONCAT('DVD (', m.format_dvd, ')') ELSE NULL END,
                    CASE WHEN m.format_blu > 0 THEN CONCAT('Blu-ray (', m.format_blu, ')') ELSE NULL END,     
                    CASE WHEN m.format_blu3 > 0 THEN CONCAT('Blu-ray 3D (', m.format_blu3, ')') ELSE NULL END 
                )) AS formats
            FROM
                movies m
                LEFT JOIN genres g ON m.movie_id = g.movie_id  -- Correct join with genres
                LEFT JOIN countries c ON m.movie_id = c.movie_id
            WHERE m.poster_images > 0
            GROUP BY m.movie_id
            ORDER BY main_title  -- Sorting Logic
            LIMIT %s OFFSET %s
        """

        base_query = f"""
            SELECT
                m.movie_id,
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
                GROUP_CONCAT(DISTINCT g.genre SEPARATOR ', ') AS genres,  -- Correct retrieval of genres
                (SELECT name FROM crew WHERE crew.movie_id = m.movie_id AND job = 'Director' LIMIT 1) AS director,
                (SELECT GROUP_CONCAT(DISTINCT cast.name ORDER BY cast.popularity DESC SEPARATOR ', ')
                    FROM cast WHERE cast.movie_id = m.movie_id LIMIT 3) AS actors,
                TRIM(BOTH ', ' FROM CONCAT_WS(', ',
                    CASE WHEN m.format_vhs > 0 THEN CONCAT('VHS (', m.format_vhs, ')') ELSE NULL END,
                    CASE WHEN m.format_dvd > 0 THEN CONCAT('DVD (', m.format_dvd, ')') ELSE NULL END,
                    CASE WHEN m.format_blu > 0 THEN CONCAT('Blu-ray (', m.format_blu, ')') ELSE NULL END,
                    CASE WHEN m.format_blu3 > 0 THEN CONCAT('Blu-ray 3D (', m.format_blu3, ')') ELSE NULL END
                )) AS formats
            FROM
                movies m
                LEFT JOIN genres g ON m.movie_id = g.movie_id  -- Correct join with genres
                LEFT JOIN countries c ON m.movie_id = c.movie_id
             WHERE m.movie_id IN (SELECT movie_id FROM genres WHERE genre IN (%s)) AND m.movie_id IN (SELECT movie_id FROM countries WHERE country IN (%s))
            GROUP BY m.movie_id
            ORDER BY m.title  -- Sorting Logic
            LIMIT %s OFFSET %s
        """        

  

        # Execute the query with limit and offset
        cursor.execute(base_query, ['1', 'Afghanistan', 10, 0])
        featured_movies = cursor.fetchall()

        # Display the results
        print("Featured Movies:")
        for movie in featured_movies:
            print(f"Movie ID: {movie['movie_id']}, Title: {movie['main_title']}, IMDb Rating: {movie['imdb_rating']}, Poster Images: {movie['folder_name']}")

        # Close the connection
        cursor.close()
        connection.close()

    except mysql.connector.Error as err:
        print(f"Database Error: {err}")
    except Exception as e:
        print(f"Unexpected error: {e}")

# Run the function
fetch_featured_movies()
