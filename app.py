# app.py

from flask import Flask, render_template, request, send_from_directory, jsonify
import mysql.connector
from vars import db_name, db_passwd, db_user, themes, search_conditions
import math
import os
import redis
import random

os.environ['FLASK_ENV'] = 'development'

app = Flask(__name__)
# Redis cache setup
redis_cache = redis.StrictRedis(host='localhost', port=6379, db=0)

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
    return send_from_directory(MOVIE_IMAGES_BASE_DIR, filename)

@app.route('/')
def index():
    print("Rendering the index page.")
    return render_template('index.html')

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
        
        cursor.execute(query, (movie_id,))
        movie = cursor.fetchone()

        # Convert 'countries' and 'genres' into lists
        if movie:
            movie['countries'] = movie['countries'].split(', ') if movie['countries'] else []
            movie['genres'] = movie['genres'].split(', ') if movie['genres'] else []

        cursor.close()
        connection.close()

        if movie:
            return render_template('movie_details.html', movie=movie)
        else:
            return "Movie not found", 404

    except Exception as e:
        print(f"An error occurred while fetching movie details: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/catalog')
def catalog():
    search_query = request.args.get('search', '')
    genre_filter = request.args.get('genres', '')
    year_filter = request.args.get('years', '')
    page = int(request.args.get('page', 1))
    per_page = 10
    offset = (page - 1) * per_page

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
    """

    # Construct the count query to get the total count of movies
    count_query = """
        SELECT COUNT(DISTINCT m.movie_id) as total 
        FROM movies m 
        LEFT JOIN genres g ON m.movie_id = g.movie_id
        LEFT JOIN countries c ON m.movie_id = c.movie_id
    """

    params = []

    # Initialize WHERE clause
    where_clauses = []

    # Apply search condition
    if search_query:
        where_clauses.append("(m.title LIKE %s OR m.original_title LIKE %s)")
        search_pattern = f"%{search_query}%"
        params.extend([search_pattern, search_pattern])

    # Apply genre filter
    if genre_filter:
        where_clauses.append("m.movie_id IN (SELECT movie_id FROM genres WHERE genre = %s)")
        params.append(genre_filter)

    # Apply year filter
    if year_filter:
        where_clauses.append("m.release_date = %s")
        params.append(year_filter)

    # Append WHERE clauses to base_query and count_query
    if where_clauses:
        base_query += " WHERE " + " AND ".join(where_clauses)
        count_query += " WHERE " + " AND ".join(where_clauses)
    else:
        base_query += " WHERE 1=1"
        count_query += " WHERE 1=1"

    # Finalize the base query with pagination and grouping
    base_query += " GROUP BY m.movie_id ORDER BY m.release_date DESC LIMIT %s OFFSET %s"
    pag_params = params + [per_page, offset]

    # Execute the base query to get the filtered movie data
    cursor.execute(base_query, pag_params)
    movies = cursor.fetchall()

    # Convert 'countries' and 'genres' from strings to lists
    for movie in movies:
        movie['countries'] = movie['countries'].split(', ') if movie['countries'] else []
        movie['genres'] = movie['genres'].split(', ') if movie['genres'] else []

    # Execute the count query to get the total count of filtered movies
    cursor.execute(count_query, params)
    total_movies = cursor.fetchone()['total']
    total_pages = math.ceil(total_movies / per_page)

    # Define pagination range for the current page
    pagination_range = list(range(max(1, page - 2), min(total_pages + 1, page + 3)))

    # Determine the selected theme
    selected_theme = None

    if genre_filter:
        # Find the theme that matches the genre_filter
        matched_themes = [theme for theme in themes if theme['name'].lower().startswith(genre_filter.lower()) or genre_filter.lower() in theme['name'].lower()]
        if matched_themes:
            selected_theme = matched_themes[0]
        else:
            # If no exact match, select a random theme excluding certain genres
            selected_theme = random.choice([theme for theme in themes if "genre" in theme['sql_condition'].lower()])
    else:
        # Select a random theme from the themes list
        selected_theme = random.choice(themes)

    # Fetch featured movies based on the selected theme's sql_condition
    if selected_theme:
        # Extract the JOIN and WHERE conditions from the selected theme's sql_condition
        theme_sql_condition = selected_theme['sql_condition']

        featured_query = f"""
            SELECT 
                m.movie_id, 
                COALESCE(m.format_titel, m.title) AS main_title,  
                m.original_title, 
                m.release_date, 
                m.imdb_rating, 
                m.folder_name, 
                m.overview,
                m.poster_images
            FROM 
                movies m
                {theme_sql_condition}
            GROUP BY m.movie_id
            HAVING m.imdb_rating > 6.7 AND m.poster_images > 0
            ORDER BY RAND()
            LIMIT 50;
        """
        cursor.execute(featured_query, ())
        featured_movies = cursor.fetchall()

        # Convert 'countries' and 'genres' from strings to lists if needed
        for movie in featured_movies:
            movie['countries'] = movie['countries'].split(', ') if 'countries' in movie and movie['countries'] else []
            movie['genres'] = movie['genres'].split(', ') if 'genres' in movie and movie['genres'] else []
    else:
        featured_movies = []

    # Close cursor and database connection
    cursor.close()
    connection.close()

    # Render the catalog template with the movies and pagination data
    ret_val = render_template('catalog.html', 
                               movies=movies, 
                               page=page, 
                               total_pages=total_pages, 
                               search_query=search_query, 
                               pagination_range=pagination_range,
                               featured_movies=featured_movies,
                               selected_theme=selected_theme['name'] if selected_theme else "Featured")

    return ret_val


def build_sort_expression(sort_option):
    """
    Builds the sort expression based on the sort_option.
    """
    sort_options = {
        "Zufall": "RAND()",  # Zufall remains random, no asc or desc needed
        "Title asc": "m.title ASC",  # Ascending order by movie title
        "Title desc": "m.title DESC",  # Descending order by movie title
        "Jahr asc": "m.release_date ASC",  # Ascending order by release date
        "Jahr desc": "m.release_date DESC",  # Descending order by release date
        "Bewertung asc": "CAST(m.imdb_rating AS DECIMAL(3,1)) ASC",  # Ascending order by IMDb rating
        "Bewertung desc": "CAST(m.imdb_rating AS DECIMAL(3,1)) DESC",  # Descending order by IMDb rating
        "Regisseur asc": "director ASC",  # Ascending order by director's name
        "Regisseur desc": "director DESC",  # Descending order by director's name
        "Länge asc": "m.runtime ASC",  # Ascending order by runtime
        "Länge desc": "m.runtime DESC",  # Descending order by runtime
    }
   
    
    # Default sort option
    default_sort = 'm.release_date DESC'
    print(sort_option)
    # Fetch the corresponding SQL expression
    sort_expression = sort_options.get(sort_option, default_sort)

    return sort_expression, sort_options

# Existing route with new parameters and logic integrated
@app.route('/filter_movies', methods=['GET'])
def filter_movies():
    try:
        # Retrieve filter values from request arguments
        selected_years = request.args.get('years', '').split(',') if request.args.get('years') else []
        selected_genres = request.args.get('genres', '').split(',') if request.args.get('genres') else []
        selected_countries = request.args.get('countries', '').split(',') if request.args.get('countries') else []
        search_query = request.args.get('search', '').strip()  # Retrieve search query

        # New parameters
        standorte = request.args.get('standorte', '')
        media = request.args.get('media', '')

        # Define available sorting options as a dictionary
        sort_by = request.args.get('sort_by', 'Title')  # Default sorting by title
        sort_by_expression, sort_options = build_sort_expression(sort_by)    

        page = int(request.args.get('page', 1))  # Retrieve the current page
        per_page = 10
        offset = (page - 1) * per_page

        # Connect to the database
        connection = connect_to_db()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = connection.cursor(dictionary=True)

        # Initialize conditions and parameters lists
        where_conditions = []
        params = []

        # **Apply Search Condition**
        if search_query:
            search_pattern = f"%{search_query}%"
            where_conditions.append("(m.title LIKE %s OR m.original_title LIKE %s OR cr.name LIKE %s)")
            params.extend([search_pattern, search_pattern, search_pattern])

        # **Apply Year Conditions**
        if selected_years:
            year_filters = []
            for year in selected_years:
                if "..." in year:  # Handle decade ranges in string format
                    start_year = int(year.split("...")[0])
                    end_year = start_year + 9
                    year_filters.append("m.release_date BETWEEN %s AND %s")
                    params.extend([start_year, end_year])
                else:
                    year_filters.append("YEAR(m.release_date) = %s")
                    params.append(int(year))
            where_conditions.append(f"({' OR '.join(year_filters)})")

        # **Apply Genre Filter**
        if selected_genres:
            genre_placeholders = ','.join(['%s'] * len(selected_genres))
            where_conditions.append(f"m.movie_id IN (SELECT movie_id FROM genres WHERE genre IN ({genre_placeholders}))")
            params.extend(selected_genres)

        # **Apply Country Filter**
        if selected_countries:
            country_placeholders = ','.join(['%s'] * len(selected_countries))
            where_conditions.append(f"m.movie_id IN (SELECT movie_id FROM countries WHERE country IN ({country_placeholders}))")
            params.extend(selected_countries)

        # **Apply Standorte (Location) Filter**
        if standorte:
            standort_list = standorte.split(',')
            standort_placeholders = ','.join(['%s'] * len(standort_list))
            where_conditions.append(f"m.format_standort IN ({standort_placeholders})")
            params.extend(standort_list)

        # **Apply Media Filter**
        if media:
            media_list = media.split(',')
            media_filters = [f"m.{medium} > 0" for medium in media_list]
            where_conditions.append(f"({' OR '.join(media_filters)})")

        # **Construct the WHERE Clause**
        where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""

        # **Construct the Base Query with Proper JOIN and Aggregation**
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
                GROUP_CONCAT(DISTINCT cr.name SEPARATOR ', ') AS director,  -- Aggregated directors
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
                LEFT JOIN crew cr ON m.movie_id = cr.movie_id AND cr.job = 'Director'  -- JOIN with crew for director
            {where_clause}
            GROUP BY m.movie_id
            ORDER BY {sort_by_expression}
            LIMIT %s OFFSET %s
        """

        # **Construct the Count Query with Proper JOIN and Aggregation**
        count_query = f"""
            SELECT COUNT(DISTINCT m.movie_id) as total 
            FROM movies m 
                LEFT JOIN genres g ON m.movie_id = g.movie_id
                LEFT JOIN countries c ON m.movie_id = c.movie_id
                LEFT JOIN crew cr ON m.movie_id = cr.movie_id AND cr.job = 'Director'  -- JOIN with crew for director
            {where_clause}
        """

        # **Append Pagination Parameters to Base Query**
        base_query_params = params.copy()
        base_query_params.extend([per_page, offset])

        # **Execute the Base Query to Get Filtered Movie Data**
        print("Executing Base Query:", base_query)
        print("With Parameters:", base_query_params)

        cursor.execute(base_query, tuple(base_query_params))
        filtered_movies = cursor.fetchall()

        # **Convert 'countries' and 'genres' from Strings to Lists**
        for movie in filtered_movies:
            movie['countries'] = movie['countries'].split(', ') if movie['countries'] else []
            movie['genres'] = movie['genres'].split(', ') if movie['genres'] else []
            movie['director'] = movie['director'].split(', ') if movie['director'] else []  # Convert directors to list

        # **Execute the Count Query to Get Total Number of Filtered Movies**
        cursor.execute(count_query, tuple(params))
        total_movies = cursor.fetchone()['total']
        total_pages = math.ceil(total_movies / per_page) if per_page else 1  # Avoid division by zero

        # **Fetch Counts for Dropdown Filters**
        genre_counts = get_counts(cursor, "genre", selected_years, selected_countries, selected_genres, search_query)
        year_counts = get_counts(cursor, "release_date", selected_years, selected_countries, selected_genres, search_query)
        country_counts = get_counts(cursor, "country", selected_years, selected_countries, selected_genres, search_query)
        standorte_counts = get_counts(cursor, "format_standort", selected_years, selected_countries, selected_genres, search_query)
        media_counts = get_counts(cursor, "media", selected_years, selected_countries, selected_genres, search_query)

        # **Sort Years with Decades**
        year_counts = sort_years_with_decades(year_counts)

        # **Close the Cursor and Connection**
        cursor.close()
        connection.close()

        # **Return the JSON Response**
        return jsonify({
            'movies': filtered_movies,
            'years': year_counts,
            'genres': genre_counts,
            'countries': country_counts,
            'standorte': standorte_counts,
            'media': media_counts,
            'current_page': page,
            'total_pages': total_pages,
            'total_movies': total_movies,  # Include total_movies in the response
            'sort_options': sort_options
        })
    except Exception as e:
        print(f"Error occurred: {e}")
        return jsonify({'error': str(e)}), 500
def get_counts(cursor, field, selected_years=None, selected_countries=None, selected_genres=None, search_query=None):
    """
    Generalized helper function to get counts of distinct values for the specified field,
    including search query filtering and filters for years, countries, and genres.
    """
    print("get_counts", search_query)

    # Ensure field is valid to prevent SQL injection and handle media formats separately
    valid_fields = {"genre", "release_date", "country", "format_standort", "media"}
    if field not in valid_fields:
        raise ValueError(f"Invalid field name: {field}")

    # Special case for media formats
    if field == "media":
        count_query = """
            SELECT
                SUM(CASE WHEN m.format_vhs > 0 THEN 1 ELSE 0 END) AS vhs_count,
                SUM(CASE WHEN m.format_dvd > 0 THEN 1 ELSE 0 END) AS dvd_count,
                SUM(CASE WHEN m.format_blu > 0 THEN 1 ELSE 0 END) AS blu_count,
                SUM(CASE WHEN m.format_blu3 > 0 THEN 1 ELSE 0 END) AS blu3_count
            FROM movies m
            LEFT JOIN genres g ON m.movie_id = g.movie_id
            LEFT JOIN countries c ON m.movie_id = c.movie_id
            WHERE 1=1
        """
    elif field == "genre":
        # Handle genre field, which is in the 'genres' table
        count_query = """
            SELECT g.genre, COUNT(DISTINCT m.movie_id) AS count
            FROM movies m
            LEFT JOIN genres g ON m.movie_id = g.movie_id
            LEFT JOIN countries c ON m.movie_id = c.movie_id
            WHERE 1=1
        """
    elif field == "country":
        # Handle country field, which is in the 'countries' table
        count_query = """
            SELECT c.country, COUNT(DISTINCT m.movie_id) AS count
            FROM movies m
            LEFT JOIN genres g ON m.movie_id = g.movie_id
            LEFT JOIN countries c ON m.movie_id = c.movie_id
            WHERE 1=1
        """
    else:
        # Construct the base count query for other fields
        count_query = f"""
            SELECT m.{field}, COUNT(DISTINCT m.movie_id) AS count
            FROM movies m
            LEFT JOIN genres g ON m.movie_id = g.movie_id
            LEFT JOIN countries c ON m.movie_id = c.movie_id
            WHERE 1=1
        """

    params = []

    # Apply search filter if available
    if search_query:
        search_pattern = f"%{search_query}%"
        search_conditions = ("""
            AND (m.title LIKE %s 
            OR m.original_title LIKE %s 
            OR m.format_titel LIKE %s 
            OR m.wiki_awards LIKE %s
            OR EXISTS (
                SELECT 1 FROM cast c WHERE c.movie_id = m.movie_id AND c.name LIKE %s
            )
            OR EXISTS (
                SELECT 1 FROM crew cr WHERE cr.movie_id = m.movie_id AND cr.job = 'director' AND cr.name LIKE %s
            ))
        """)
        count_query += search_conditions
        params.extend([search_pattern] * 6)

    # Apply year filters if available
    if selected_years:
        years_conditions = []
        for year in selected_years:
            if "..." in year:  # Handle decade ranges in string format
                start_year = int(year.split("...")[0])
                end_year = start_year + 9
                years_conditions.append("m.release_date BETWEEN %s AND %s")
                params.extend([start_year, end_year])
            else:
                years_conditions.append("m.release_date = %s")
                params.append(int(year))
        count_query += f" AND ({' OR '.join(years_conditions)})"

    # Apply genre filters if available
    if selected_genres:
        genre_placeholders = ','.join(['%s'] * len(selected_genres))
        count_query += f" AND m.movie_id IN (SELECT movie_id FROM genres WHERE genre IN ({genre_placeholders}))"
        params.extend(selected_genres)

    # Apply country filters if available
    if selected_countries:
        country_placeholders = ','.join(['%s'] * len(selected_countries))
        count_query += f" AND m.movie_id IN (SELECT movie_id FROM countries WHERE country IN ({country_placeholders}))"
        params.extend(selected_countries)
    
    

    
    # Special handling for media fields
    if field == "media":
        cursor.execute(count_query, params)
        result = cursor.fetchone()
        return {
            'format_vhs': result['vhs_count'],
            'format_dvd': result['dvd_count'],
            'format_blu': result['blu_count'],
            'format_blu3': result['blu3_count']
        }
    else:
        
        # Group by the field and order by count descending
        count_query += f" GROUP BY {('g.genre' if field == 'genre' else 'c.country' if field == 'country' else 'm.' + field)} ORDER BY count DESC"

        cursor.execute(count_query, params)

        # Convert the fetched rows into a dictionary with proper key types
        result = {}
        for row in cursor.fetchall():
            key = row[field if field != "genre" and field != "country" else "genre" if field == "genre" else "country"]

            # Handle None values for the keys
            if key is None:
                key = 'Unknown'  # Replace None with a placeholder, or handle as needed

            # Ensure all keys are strings for consistent comparison and sorting
            if isinstance(key, bytes):  # Handle potential binary values from the database
                key = key.decode("utf-8")
            elif isinstance(key, int):  # Ensure int keys (e.g., years) are strings
                key = str(key)

            result[key] = row['count']
        

        return result

def sort_years_with_decades(year_counts):
    """Sorts year counts so that grouped decades appear at the top of the list."""
    # Group years into decades
    decade_counts = {}
    individual_years = {}

    for year, count in year_counts.items():
        try:
            # Convert year to an integer (handle exceptions for unexpected values)
            year_int = int(year)
            # Determine the start year of the decade (e.g., 1990 for 1992)
            decade_start = (year_int // 10) * 10
            # Format as '1990...1999'
            decade_key = f"{decade_start}...{decade_start + 9}"
            if decade_key in decade_counts:
                decade_counts[decade_key] += count
            else:
                decade_counts[decade_key] = count
        except ValueError:
            # If `year` is not a valid integer, treat it as an individual year or skip
            individual_years[year] = count

    # Separate decades and individual years for sorting
    sorted_decades = sorted(decade_counts.items(), key=lambda x: int(x[0].split("...")[0]))
    # Sort individual years as strings to avoid ValueErrors
    sorted_years = sorted(
        year_counts.items(),
        key=lambda x: (int(x[0]) if x[0].isdigit() else float('inf')),  # Non-numeric years go last
        reverse=True
    )
    
    # Combine: Decades first, followed by individual years in descending order
    sorted_combined = sorted_decades + sorted_years

    # Convert back to dictionary format
    sorted_combined_dict = dict(sorted_combined)

    # print(sorted_combined_dict)

    return sorted_combined_dict

@app.route('/autocomplete', methods=['GET'])
def autocomplete():
    query = request.args.get('query', '').strip()

    if not query:
        return jsonify([])  # Return an empty list if the query is empty

    try:
        # Connect to the database
        connection = connect_to_db()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = connection.cursor(dictionary=True)

        # Construct the query for autocomplete suggestions (movies, cast, directors)
        search_pattern = f"%{query}%"
        autocomplete_query = """
            SELECT title AS name, 'movie' AS type FROM movies WHERE title LIKE %s
            UNION
            SELECT name AS name, 'cast' AS type FROM cast WHERE name LIKE %s
            UNION
            SELECT name AS name, 'director' AS type FROM crew WHERE job = 'Director' AND name LIKE %s
            LIMIT 10;
        """
        cursor.execute(autocomplete_query, (search_pattern, search_pattern, search_pattern))
        results = cursor.fetchall()

        # Close the cursor and connection
        cursor.close()
        connection.close()

        # Return the results as JSON
        return jsonify(results)

    except Exception as e:
        print(f"Error during autocomplete: {e}")
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True)
