import mysql.connector
from vars import db_name, db_passwd, db_user, themes, search_conditions

# Database configuration
db_config = {
    'host': 'localhost',
    'user': db_user,   # replace with your actual db_user
    'password': db_passwd,  # replace with your actual db_passwd
    'database': db_name   # replace with your actual db_name
}

# Connect to the database
def connect_to_db():
    try:
        connection = mysql.connector.connect(
            host=db_config['host'],
            user=db_config['user'],
            password=db_config['password'],
            database=db_config['database']
        )
        return connection
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None

# Test query function
def test_query():
    connection = connect_to_db()
    if not connection:
        print("Failed to connect to the database.")
        return

    cursor = connection.cursor(dictionary=True)

    # Test SQL Query - Modify this query based on your testing needs
    query = """
        SELECT
            m.movie_id,
            COALESCE(m.format_titel, m.title) AS main_title,
            m.original_title,
            m.release_date,
            m.runtime,
            m.imdb_id,
            m.imdb_rating,
            m.fsk,
            m.folder_name,
            m.overview,
            m.standort,
            GROUP_CONCAT(DISTINCT c.country SEPARATOR ', ') AS countries,
            GROUP_CONCAT(DISTINCT g.genre SEPARATOR ', ') AS genres,
            GROUP_CONCAT(DISTINCT cr.name SEPARATOR ', ') AS director,
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
            LEFT JOIN genres g ON m.movie_id = g.movie_id
            LEFT JOIN countries c ON m.movie_id = c.movie_id
            LEFT JOIN crew cr ON m.movie_id = cr.movie_id AND cr.job = 'Director'
        WHERE m.release_date = %s
        GROUP BY m.movie_id
        ORDER BY m.release_date DESC
        LIMIT 10;
    """
    #23254
    query =         """SELECT
                    m.movie_id,
                    COALESCE(m.title, m.title) AS main_title,
                    m.original_title,
                    m.release_date,
                    m.rating,
                    m.folder_name,
                    m.overview,
                    m.format_inhalt,
                    m.poster_images
                FROM
                    movies m

                GROUP BY m.movie_id
                HAVING m.rating > 6.7 AND m.poster_images > 0
                ORDER BY RAND()
                LIMIT 20;"""
    query =         """SELECT
                    m.movie_id,
                    COALESCE(m.title, m.title) AS main_title,
                    m.original_title,
                    m.release_date,
                    m.rating,
                    m.folder_name,
                    m.overview,
                    m.format_inhalt,
                    m.poster_images
                FROM
                    movies m

                GROUP BY m.movie_id
                HAVING m.poster_images > 0
                ORDER BY RAND()
                LIMIT 20;"""

    # Test year (e.g., 1916)
    year_param = 1916
    query = "select count(movie_id) from countries;"
    try:


        # cursor.execute(query, (year_param,))
        # query = "SELECT release_date FROM movies where release_date = 1916 LIMIT 10;"
        cursor.execute(query)

        results = cursor.fetchall()
        print(len(results))
        # Print results
        for row in results:
            print(row)

    except mysql.connector.Error as err:
        print(f"SQL Error: {err}")
    finally:
        cursor.close()
        connection.close()

# Run the test query
test_query()
