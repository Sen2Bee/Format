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
        featured_query = """
SELECT movie_id, COUNT(*) as count
FROM movies
GROUP BY movie_id
HAVING count = 1;"""



        # Execute the query
        cursor.execute(featured_query)
        featured_movies = cursor.fetchall()

        # Display the results
        print("Featured Movies:")
        for movie in featured_movies:
            print(f"Movie ID: {movie['movie_id']}, Title: {movie['title']}, IMDb Rating: {movie['imdb_rating']}, Poster Images: {movie['poster_images']}")

        # Close the connection
        cursor.close()
        connection.close()

    except mysql.connector.Error as err:
        print(f"Database Error: {err}")
    except Exception as e:
        print(f"Unexpected error: {e}")

# Run the function
fetch_featured_movies()
