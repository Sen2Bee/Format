from flask import Flask, render_template, request, send_from_directory, jsonify
import mysql.connector
from vars import db_name, db_passwd, db_user
import math
import os
import redis

os.environ['FLASK_ENV'] = 'development'

app = Flask(__name__)

# Database configuration
db_config = {
    'host': 'localhost',
    'user': db_user,
    'password': db_passwd,
    'database': db_name
}

MOVIE_IMAGES_BASE_DIR = "e:/Format_FV/_Movies/_Movies_Fertig"

def connect_to_db():
    try:
        connection = mysql.connector.connect(**db_config)
        print("Successfully connected to the database.")
        return connection
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None

@app.route('/movie_images/<path:filename>')
def movie_images(filename):
    # print(f"Serving image for: {filename}")
    return send_from_directory(MOVIE_IMAGES_BASE_DIR, filename)

@app.route('/')
def index():
    print("Rendering the index page.")
    return render_template('index.html')

#region SQL
@app.route('/movie/<int:movie_id>')
def movie_details(movie_id):
    print(f"Fetching details for movie ID: {movie_id}")
    connection = connect_to_db()
    if not connection:
        return "Database connection failed", 500

    try:
        cursor = connection.cursor(dictionary=True)
        
        # Construct the query to fetch detailed movie information
        query = """
            SELECT 
                m.movie_id, 
                m.title, 
                m.original_title, 
                m.release_date, 
                m.runtime, 
                m.imdb_id, 
                m.imdb_rating, 
                m.format_fsk, 
                m.folder_name, 
                m.overview, 
                m.format_standort,
                GROUP_CONCAT(DISTINCT c.country ORDER BY c.country SEPARATOR ', ') AS countries,
                GROUP_CONCAT(DISTINCT g.genre ORDER BY g.genre SEPARATOR ', ') AS genres,
                (SELECT name 
                 FROM crew 
                 WHERE movie_id = m.movie_id AND job = 'Director' 
                 LIMIT 1) AS director,
                GROUP_CONCAT(DISTINCT cast.name ORDER BY cast.popularity DESC SEPARATOR ', ') AS actors,
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
                LEFT JOIN cast ON m.movie_id = cast.movie_id
            WHERE 
                m.movie_id = %s
            GROUP BY 
                m.movie_id
        """
        
        # Debugging: Print the query and the movie_id parameter
        # print(f"Executing movie details query: {query} with movie_id: {movie_id}")
        
        # Execute the query with the provided movie ID
        cursor.execute(query, (movie_id,))
        movie = cursor.fetchone()

        # Debugging: Print the fetched movie details
        # print(f"Movie details fetched: {movie}")

        # Close the cursor and connection
        cursor.close()
        connection.close()

        # Render the movie details page if the movie is found
        if movie:
            return render_template('movie_details.html', movie=movie)
        else:
            # Return a 404 error if the movie is not found
            return "Movie not found", 404

    except Exception as e:
        # Print and return error information for troubleshooting
        print(f"An error occurred while fetching movie details: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/catalog')
def catalog():
    search_query = request.args.get('search', '')
    genre_filter = request.args.get('genre', '')
    year_filter = request.args.get('year', '')
    page = int(request.args.get('page', 1))
    per_page = 10
    offset = (page - 1) * per_page

    # print(f"Catalog search - search_query: '{search_query}', genre_filter: '{genre_filter}', year_filter: '{year_filter}', page: {page}")

    # Establish database connection
    connection = connect_to_db()
    if not connection:
        return "Database connection failed", 500

    cursor = connection.cursor(dictionary=True)

    # Construct the base query to retrieve movies with the applied filters
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
            GROUP_CONCAT(DISTINCT g.genre SEPARATOR ', ') AS genres,
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
            LEFT JOIN genres g ON m.movie_id = g.movie_id
            LEFT JOIN countries c ON m.movie_id = c.movie_id
        WHERE 1=1
    """
    
    # Construct the count query to get the total count of movies
    count_query = """
        SELECT COUNT(DISTINCT m.movie_id) as total 
        FROM movies m 
        LEFT JOIN genres g ON m.movie_id = g.movie_id
        LEFT JOIN countries c ON m.movie_id = c.movie_id
        WHERE 1=1
    """

    params = []

    # Apply search condition
    if search_query:
        base_query += " AND (m.title LIKE %s OR m.original_title LIKE %s)"
        count_query += " AND (m.title LIKE %s OR m.original_title LIKE %s)"
        search_pattern = f"%{search_query}%"
        params.extend([search_pattern, search_pattern])

    # Apply genre filter
    if genre_filter:
        base_query += " AND m.movie_id IN (SELECT movie_id FROM genres WHERE genre = %s)"
        count_query += " AND m.movie_id IN (SELECT movie_id FROM genres WHERE genre = %s)"
        params.append(genre_filter)

    # Apply year filter
    if year_filter:
        base_query += " AND m.release_date = %s"
        count_query += " AND m.release_date = %s"
        params.append(year_filter)

    # Finalize the base query with pagination
    base_query += " GROUP BY m.movie_id ORDER BY m.release_date DESC LIMIT %s OFFSET %s"
    params.extend([per_page, offset])

    # Debug: Print query and parameters
    # print(f"Executing catalog query: {base_query} with params: {params}")

    # Execute the base query to get the filtered movie data
    cursor.execute(base_query, params)
    movies = cursor.fetchall()
    print(f"Movies fetched: {len(movies)}")

    # Remove pagination parameters for the count query
    count_params = params[:-2]
    # print(f"Executing count query: {count_query} with params: {count_params}")

    # Execute the count query to get the total count of filtered movies
    cursor.execute(count_query, count_params)
    total_movies = cursor.fetchone()['total']
    total_pages = math.ceil(total_movies / per_page)

    # Define pagination range for the current page
    pagination_range = list(range(max(1, page - 2), min(total_pages + 1, page + 3)))

    # Close cursor and database connection
    cursor.close()
    connection.close()

    # Debug: Output total movies and pages
    # print(f"Total movies: {total_movies}, Total pages: {total_pages}, Current page: {page}")

    # Render the catalog template with the movies and pagination data
    return render_template('catalog.html', 
                           movies=movies, 
                           page=page, 
                           total_pages=total_pages, 
                           search_query=search_query, 
                           pagination_range=pagination_range)

# Redis cache setup
redis_cache = redis.StrictRedis(host='localhost', port=6379, db=0)

@app.route('/filter_movies', methods=['GET'])
def filter_movies():
    try:
        # Retrieve filter values from request arguments
        selected_years = request.args.get('years', '').split(',') if request.args.get('years') else []
        selected_genres = request.args.get('genres', '').split(',') if request.args.get('genres') else []
        selected_countries = request.args.get('countries', '').split(',') if request.args.get('countries') else []
        page = int(request.args.get('page', 1))  # Retrieve the current page
        per_page = 10
        offset = (page - 1) * per_page

        print(f"selected_years: {selected_years} (Type: {type(selected_years)})")
        print(f"selected_genres: {selected_genres} (Type: {type(selected_genres)})")
        print(f"selected_countries: {selected_countries} (Type: {type(selected_countries)})")


        # Connect to the database
        connection = connect_to_db()
        if not connection:
            return "Database connection failed", 500

        cursor = connection.cursor(dictionary=True)

        # Determine if the year filters are for single years or decades
        years_conditions = []
        for year in selected_years:
            if "..." in year:  # Handle decade format
                start_year = int(year.split("...")[0])
                end_year = start_year + 9
                years_conditions.append(f"m.release_date BETWEEN {start_year} AND {end_year}")
            else:
                years_conditions.append(f"m.release_date = {year}")

        # Construct the base query
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
                GROUP_CONCAT(DISTINCT g.genre SEPARATOR ', ') AS genres,
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
                LEFT JOIN genres g ON m.movie_id = g.movie_id
                LEFT JOIN countries c ON m.movie_id = c.movie_id
            WHERE 1=1
        """

        count_query = """
            SELECT COUNT(DISTINCT m.movie_id) as total 
            FROM movies m 
            LEFT JOIN genres g ON m.movie_id = g.movie_id
            LEFT JOIN countries c ON m.movie_id = c.movie_id
            WHERE 1=1
        """

        # Apply year conditions if available
        if years_conditions:
            year_filter = f" AND ({' OR '.join(years_conditions)})"
            base_query += year_filter
            count_query += year_filter

        # Apply genre and country filters
        params = []  # Parameters to be passed to the SQL queries
        if selected_genres:
            genre_filter = f" AND m.movie_id IN (SELECT movie_id FROM genres WHERE genre IN ({','.join(['%s'] * len(selected_genres))}))"
            base_query += genre_filter
            count_query += genre_filter
            params.extend(selected_genres)

        if selected_countries:
            country_filter = f" AND m.movie_id IN (SELECT movie_id FROM countries WHERE country IN ({','.join(['%s'] * len(selected_countries))}))"
            base_query += country_filter
            count_query += country_filter
            params.extend(selected_countries)

        # Append pagination to the base query
        base_query += " GROUP BY m.movie_id ORDER BY m.release_date DESC LIMIT %s OFFSET %s"
        params.extend([per_page, offset])

        # Execute the base query to get the filtered movie data
        cursor.execute(base_query, params)
        filtered_movies = cursor.fetchall()

        # Execute the count query to get the total count of filtered movies
        cursor.execute(count_query, params[:-2])  # Remove pagination params for the count query
        total_movies = cursor.fetchone()['total']
        total_pages = math.ceil(total_movies / per_page)

        # Fetch counts for dropdown filters
        genre_counts = get_counts(cursor, "genre", selected_years, selected_countries, selected_genres)
        year_counts = get_counts(cursor, "release_date", selected_years, selected_countries, selected_genres)
        country_counts = get_counts(cursor, "country", selected_years, selected_countries, selected_genres)

        # Apply sorting to place grouped decades at the top
        year_counts = sort_years_with_decades(year_counts)

        # Close the cursor and connection
        cursor.close()
        connection.close()

        # Return updated JSON response with new grouped counts and movie data
        return jsonify({
            'movies': filtered_movies,
            'years': year_counts if year_counts else {},  # Ensure `years` is included, even if empty
            'genres': genre_counts,
            'countries': country_counts,
            'current_page': page,
            'total_pages': total_pages
        })

    except Exception as e:
        print(f"Error occurred: {e}")
        return jsonify({'error': str(e)}), 500

def get_counts(cursor, field, selected_years, selected_countries, selected_genres):
    """
    Helper function to get counts of distinct values for the specified field.
    """

    # Ensure field is a valid column name to prevent SQL injection
    if field not in {"genre", "release_date", "country"}:
        raise ValueError(f"Invalid field name: {field}")

    # Construct the base count query
    count_query = f"""
        SELECT {field}, COUNT(DISTINCT m.movie_id) AS count
        FROM movies m
        LEFT JOIN genres g ON m.movie_id = g.movie_id
        LEFT JOIN countries c ON m.movie_id = c.movie_id
        WHERE 1=1
    """

    params = []

    # Apply year filters if available
    if selected_years:
        years_conditions = []
        for year in selected_years:
            if isinstance(year, str) and "..." in year:  # Handle decade ranges in string format
                start_year = int(year.split("...")[0])
                end_year = start_year + 9
                years_conditions.append(f"m.release_date BETWEEN {start_year} AND {end_year}")
            else:
                # Treat single years as integers for SQL comparison
                years_conditions.append(f"m.release_date = {int(year)}")
        count_query += f" AND ({' OR '.join(years_conditions)})"

    # Apply genre filters if available
    if selected_genres:
        count_query += f" AND m.movie_id IN (SELECT movie_id FROM genres WHERE genre IN (" + ",".join(["%s"] * len(selected_genres)) + "))"
        params.extend(selected_genres)

    # Apply country filters if available
    if selected_countries:
        count_query += f" AND m.movie_id IN (SELECT movie_id FROM countries WHERE country IN (" + ",".join(["%s"] * len(selected_countries)) + "))"
        params.extend(selected_countries)

    # Group by the field and order by count descending
    count_query += f" GROUP BY {field} ORDER BY count DESC"

    # Execute the query and fetch the results
    cursor.execute(count_query, params)
    
    # Convert the fetched rows into a dictionary with proper key types
    result = {}
    for row in cursor.fetchall():
        key = row[field]
        
        # Handle None values for the keys
        if key is None:
            key = 'Unknown'  # Replace None with a placeholder or remove this line to skip None keys

        # Ensure that all keys are strings for consistent comparison and sorting
        if isinstance(key, bytes):  # Handle potential binary values from database
            key = key.decode("utf-8")
        elif isinstance(key, int):  # Ensure int keys (e.g., years) are strings
            key = str(key)

        result[key] = row['count']

    # Debugging: Print the resulting dictionary
    print(f"Counts for {field}: {result}")
    return result

#endregion SQL

def sort_years_with_decades(year_counts):
    """Sorts year counts so that grouped decades appear at the top of the list."""
    # Separate decades and years
    decades = {key: value for key, value in year_counts.items() if "..." in key}
    years = {key: value for key, value in year_counts.items() if "..." not in key}

    # Create sorted lists for both groups
    sorted_decades = sorted(decades.items(), key=lambda x: int(x[0].split("...")[0]))
    sorted_years = sorted(years.items(), key=lambda x: int(x[0]))

    # Combine: Decades first, followed by Years
    sorted_combined = sorted_decades + sorted_years

    return dict(sorted_combined)

if __name__ == '__main__':
    app.run(debug=True)
