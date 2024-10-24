# app.py

from flask import Flask, render_template, request, send_from_directory, jsonify
import mysql.connector
from vars import db_name, db_passwd, db_user, themes, search_conditions, movies_path
import math
import os
import redis
import random

from flask_caching import Cache  # Import Cache

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

# Initialize the cache with SimpleCache
app.config['CACHE_TYPE'] = 'SimpleCache'
app.config['CACHE_DEFAULT_TIMEOUT'] = 300  # Cache timeout in seconds
cache = Cache(app)

def connect_to_db():
    """Establish a connection to the MySQL database."""
    try:
        connection = mysql.connector.connect(**db_config)
        print("Successfully connected to the database.")
        return connection
    except mysql.connector.Error as err:
        print(f"Error connecting to database: {err}")
        return None

@app.route('/movie_images/<path:filename>')
def movie_images(filename):
    """Serve movie images from the specified directory."""
    return send_from_directory(MOVIE_IMAGES_BASE_DIR, filename)

@app.route('/')
def index():
    """Render the index page."""
    print("Rendering the index page.")
    return render_template('index.html')

@cache.cached(timeout=300)  # Cache this route
@app.route('/movie/<int:movie_id>')
def movie_details(movie_id):
    """Fetch and render details for a specific movie."""
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
            movie['actors'] = movie['actors'].split(', ') if movie['actors'] else []
            movie['director'] = movie['director'].split(', ') if movie['director'] else []

        cursor.close()
        connection.close()

        if movie:
            return render_template('movie_details.html', movie=movie)
        else:
            return "Movie not found", 404

    except Exception as e:
        print(f"An error occurred while fetching movie details: {e}")
        return jsonify({'error': str(e)}), 500

@cache.cached(timeout=300, query_string=True)  # Cache this route with query string parameters
@app.route('/catalog')
def catalog():
    """Render the catalog page with movies and featured movies based on filters."""
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
            m.format_inhalt,  
            GROUP_CONCAT(DISTINCT CONCAT(c.country, ' (', c.country_code, ')') SEPARATOR ', ') AS countries,
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

    try:
        # Execute the base query to get the filtered movie data
        cursor.execute(base_query, pag_params)
        movies = cursor.fetchall()

        # Convert 'countries' and 'genres' from strings to lists
        for movie in movies:
            movie['countries'] = movie['countries'].split(', ') if movie['countries'] else []
            movie['genres'] = movie['genres'].split(', ') if movie['genres'] else []
            movie['actors'] = movie['actors'].split(', ') if movie['actors'] else []
            movie['director'] = movie['director'].split(', ') if movie['director'] else []

        # Execute the count query to get the total count of filtered movies
        cursor.execute(count_query, tuple(params))
        total_movies = cursor.fetchone()['total']
        total_pages = math.ceil(total_movies / per_page)

        # Define pagination range for the current page
        pagination_range = list(range(max(1, page - 2), min(total_pages + 1, page + 3)))

        # Determine the selected theme
        selected_theme = None

        if genre_filter:
            matched_themes = [theme for theme in themes if theme['name'].lower().startswith(genre_filter.lower()) or genre_filter.lower() in theme['name'].lower()]
            if matched_themes:
                selected_theme = matched_themes[0]
            else:
                selected_theme = random.choice([theme for theme in themes if "genre" in theme['sql_condition'].lower()])
        else:
            selected_theme = random.choice(themes)

        # Fetch featured movies based on the selected theme's sql_condition
        if selected_theme:
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
                    m.format_inhalt,
                    m.poster_images
                FROM 
                    movies m
                    {theme_sql_condition}
                GROUP BY m.movie_id
                HAVING m.imdb_rating > 6.7 AND m.poster_images > 0
                ORDER BY RAND()
                LIMIT 10;
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

        print("in catalog_"*10, movies[:1])

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

    except Exception as e:
        print(f"An error occurred in catalog: {e}")
        cursor.close()
        connection.close()
        return jsonify({'error': str(e)}), 500

@app.route('/filter_movies', methods=['GET'])
def filter_movies():
    try:
        # **1. Retrieve Filter Parameters**
        selected_years = request.args.get('years', '').split(',') if request.args.get('years') else []
        selected_genres = request.args.get('genres', '').split(',') if request.args.get('genres') else []
        selected_countries = request.args.get('countries', '').split(',') if request.args.get('countries') else []
        search_query = request.args.get('search', '').strip()
        standorte = request.args.get('standorte', '').split(',') if request.args.get('standorte') else []
        media = request.args.get('media', '').split(',') if request.args.get('media') else []
        sort_by = request.args.get('sort_by', 'Zufall')  # Default sort by 'Zufall' (random)
        page = int(request.args.get('page', 1))
        
        # **2. Establish Database Connection**
        connection = connect_to_db()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = connection.cursor(dictionary=True)

        # **3. Build the Count Query to Get total_movies**
        count_query = """
            SELECT COUNT(DISTINCT m.movie_id) as total 
            FROM movies m 
            LEFT JOIN genres g ON m.movie_id = g.movie_id
            LEFT JOIN countries c ON m.movie_id = c.movie_id
            LEFT JOIN crew cr ON m.movie_id = cr.movie_id AND cr.job = 'Director'
        """

        where_clauses = []
        params = []

        # **Apply Search Condition**
        if search_query:
            where_clauses.append("(m.title LIKE %s OR m.original_title LIKE %s OR cr.name LIKE %s)")
            search_pattern = f"%{search_query}%"
            params.extend([search_pattern, search_pattern, search_pattern])

        # **Apply Genre Filter**
        if selected_genres:
            genre_placeholders = ','.join(['%s'] * len(selected_genres))
            where_clauses.append(f"m.movie_id IN (SELECT movie_id FROM genres WHERE genre IN ({genre_placeholders}))")
            params.extend(selected_genres)

        # **Apply Year Filter**
        if selected_years:
            year_filters = []
            for year in selected_years:
                if "..." in year:  # Handle decade ranges
                    start_year = int(year.split("...")[0])
                    end_year = start_year + 9
                    year_filters.append("m.release_date BETWEEN %s AND %s")
                    params.extend([start_year, end_year])
                else:
                    year_filters.append("m.release_date = %s")
                    params.append(int(year))
            where_clauses.append(f"({' OR '.join(year_filters)})")

        # **Apply Country Filter**
        if selected_countries:
            country_placeholders = ','.join(['%s'] * len(selected_countries))
            where_clauses.append(f"m.movie_id IN (SELECT movie_id FROM countries WHERE country IN ({country_placeholders}))")
            params.extend(selected_countries)

        # **Apply Standorte (Location) Filter**
        if standorte:
            standort_placeholders = ','.join(['%s'] * len(standorte))
            where_clauses.append(f"m.format_standort IN ({standort_placeholders})")
            params.extend(standorte)

        # **Apply Media Filter**
        if media:
            media_filters = [f"m.{medium} > 0" for medium in media]
            where_clauses.append(f"({' OR '.join(media_filters)})")

        # **Construct WHERE Clause for Count Query**
        if where_clauses:
            count_query += " WHERE " + " AND ".join(where_clauses)
        else:
            count_query += " WHERE 1=1"

        # **Execute Count Query to Get total_movies**
        cursor.execute(count_query, tuple(params))
        total_movies = cursor.fetchone()['total']

        # **4. Determine columns_per_row and items_per_page**
        # Ensure a maximum of 10 rows, based on the number of columns per row
        if total_movies > 1000:
            columns_per_row = 5
        elif total_movies > 100:
            columns_per_row = 4
        elif total_movies > 20:
            columns_per_row = 3
        else:
            columns_per_row = 1

        # Items per page should be columns_per_row * 10 (max 10 rows)
        items_per_page = columns_per_row * 10

        # **5. Calculate total_pages**
        total_pages = math.ceil(total_movies / items_per_page) if items_per_page else 1

        # **6. Adjust Page Number if Out of Bounds**
        if page < 1:
            page = 1
        elif page > total_pages:
            page = total_pages

        # **7. Calculate OFFSET for Pagination**
        offset = (page - 1) * items_per_page

        # Detailed print log
        print(f"""
        Pagination Debugging Log:
        --------------------------
        Selected Page: {page}
        Items Per Page: {items_per_page}
        Total Movies: {total_movies}
        Total Pages: {total_pages}
        Calculated Offset: {offset}
        --------------------------
        """)

        # **8. Build the Base Query to Fetch Movies with Filters and Pagination**
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
                m.format_inhalt,
                GROUP_CONCAT(DISTINCT CONCAT(c.country, ' (', c.country_code, ')') SEPARATOR ', ') AS countries,
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
        """

        # **Construct WHERE Clause for Base Query**
        if where_clauses:
            base_query += " WHERE " + " AND ".join(where_clauses)
        else:
            base_query += " WHERE 1=1"

        # **Build Sort Expression**
        sort_by_expression, sort_options = build_sort_expression(sort_by)
        base_query += f" GROUP BY m.movie_id ORDER BY {sort_by_expression} LIMIT %s OFFSET %s"

        # **Append LIMIT and OFFSET to Parameters**
        base_params = params + [items_per_page, offset]

        try:
            # **Execute Base Query to Fetch Movies**
            cursor.execute(base_query, tuple(base_params))
            filtered_movies = cursor.fetchall()

            # **Convert 'countries' and 'genres' from Strings to Lists**
            for movie in filtered_movies:
                movie['countries'] = movie['countries'].split(', ') if movie['countries'] else []
                movie['genres'] = movie['genres'].split(', ') if movie['genres'] else []
                movie['director'] = movie['director'].split(', ') if movie['director'] else []

            # **9. Fetch Counts for Dropdown Filters**
            genre_counts = get_counts(cursor, "genre", selected_years, selected_countries, selected_genres, search_query)
            year_counts = get_counts(cursor, "release_date", selected_years, selected_countries, selected_genres, search_query)
            country_counts = get_counts(cursor, "country", selected_years, selected_countries, selected_genres, search_query)
            standorte_counts = get_counts(cursor, "format_standort", selected_years, selected_countries, selected_genres, search_query)
            media_counts = get_counts(cursor, "media", selected_years, selected_countries, selected_genres, search_query)

            # **Sort Years with Decades**
            year_counts = sort_years_with_decades(year_counts)

            # **10. Determine the Selected Theme (Optional)**
            # This part depends on your application logic. Ensure it's compatible with the new pagination.

            # **11. Close Cursor and Connection**
            cursor.close()
            connection.close()

            # **12. Return JSON Response**
            return jsonify({
                'movies': filtered_movies,
                'years': year_counts,
                'genres': genre_counts,
                'countries': country_counts,
                'standorte': standorte_counts,
                'media': media_counts,
                'current_page': page,
                'total_pages': total_pages,
                'total_movies': total_movies,
                'columns_per_row': columns_per_row,
                'items_per_page': items_per_page,
                'sort_options': sort_options
            })
        
        except Exception as e:
            print(f"Error occurred in filter_movies: {e}")
            # It's important to log or handle variables like base_query and base_params carefully to avoid exposing sensitive information.
            return jsonify({'error': str(e)}), 500
        
    except Exception as e:
        print(f"Error occurred in filter_movies: {e}")
        # It's important to log or handle variables like base_query and base_params carefully to avoid exposing sensitive information.
        return jsonify({'error': str(e)}), 500

def build_sort_expression(sort_option):
    """
    Builds the sort expression based on the sort_option.
    Returns the SQL sort expression and a list of available sort options.
    """
    sort_options = {
        "Zufall": "RAND()",  # Random
        "Titel asc": "m.title ASC",  # Ascending order by movie title
        "Titel desc": "m.title DESC",  # Descending order by movie title
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
    # Fetch the corresponding SQL expression
    sort_expression = sort_options.get(sort_option, default_sort)

    return sort_expression, list(sort_options.keys())

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

    print(sorted_combined_dict)

    return sorted_combined_dict

def get_counts(cursor, field, selected_years=None, selected_countries=None, selected_genres=None, search_query=None):
    """
    Generalized helper function to get counts of distinct values for the specified field,
    including search query filtering and filters for years, countries, and genres.
    """
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
            LEFT JOIN crew cr ON m.movie_id = cr.movie_id AND cr.job = 'Director'
            WHERE 1=1
        """
    elif field == "genre":
        # Handle genre field, which is in the 'genres' table
        count_query = """
            SELECT g.genre, COUNT(DISTINCT m.movie_id) AS count
            FROM movies m
            LEFT JOIN genres g ON m.movie_id = g.movie_id
            LEFT JOIN countries c ON m.movie_id = c.country
            LEFT JOIN crew cr ON m.movie_id = cr.movie_id AND cr.job = 'Director'
            WHERE 1=1
        """
    elif field == "country":
        # Handle country field, which is in the 'countries' table
        count_query = """
            SELECT c.country, COUNT(DISTINCT m.movie_id) AS count
            FROM movies m
            LEFT JOIN genres g ON m.movie_id = g.movie_id
            LEFT JOIN countries c ON m.movie_id = c.movie_id
            LEFT JOIN crew cr ON m.movie_id = cr.movie_id AND cr.job = 'Director'
            WHERE 1=1
        """
    else:
        # Construct the base count query for other fields
        count_query = f"""
            SELECT m.{field}, COUNT(DISTINCT m.movie_id) AS count
            FROM movies m
            LEFT JOIN genres g ON m.movie_id = g.movie_id
            LEFT JOIN countries c ON m.movie_id = c.movie_id
            LEFT JOIN crew cr ON m.movie_id = cr.movie_id AND cr.job = 'Director'
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
                SELECT 1 FROM crew cr WHERE cr.movie_id = m.movie_id AND cr.job = 'Director' AND cr.name LIKE %s
            ))
        """)
        count_query += search_conditions
        params.extend([search_pattern] * 6)

    # Apply year filters if available
    if selected_years:
        year_filters = []
        for year in selected_years:
            if "..." in year:  # Handle decade ranges
                start_year = int(year.split("...")[0])
                end_year = start_year + 9
                year_filters.append("m.release_date BETWEEN %s AND %s")
                params.extend([start_year, end_year])
            else:
                year_filters.append("m.release_date = %s")
                params.append(int(year))
        count_query += f" AND ({' OR '.join(year_filters)})"

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

    # **Special Handling for Media Fields**
    if field == "media":
        # No additional grouping needed
        pass
    else:
        # Group by the field and order by count descending
        group_field = "g.genre" if field == "genre" else "c.country" if field == "country" else f"m.{field}"
        count_query += f" GROUP BY {group_field} ORDER BY count DESC"

    # **Execute Count Query**
    cursor.execute(count_query, tuple(params))
    
    if field == "media":
        result = cursor.fetchone()
        return {
            'format_vhs': result['vhs_count'],
            'format_dvd': result['dvd_count'],
            'format_blu': result['blu_count'],
            'format_blu3': result['blu3_count']
        }
    else:
        # Convert the fetched rows into a dictionary with proper key types
        result = {}
        for row in cursor.fetchall():
            key = row[field if field not in ["genre", "country"] else ("genre" if field == "genre" else "country")]

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

@cache.cached(timeout=300, query_string=True)  # Cache this route with query string parameters
@app.route('/autocomplete')
def autocomplete():
    """
    Handle autocomplete AJAX requests by searching in movies, cast, and crew.
    Returns suggestions with associated movie_ids for efficient filtering.
    """
    query = request.args.get('query', '').strip()
    suggestions = []

    if len(query) >= 2:
        connection = connect_to_db()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        try:
            cursor = connection.cursor(dictionary=True)

            # Search in movie titles
            movie_query = """
                SELECT movie_id, title 
                FROM movies 
                WHERE title LIKE %s OR original_title LIKE %s
                LIMIT 10
            """
            search_pattern = f"%{query}%"
            cursor.execute(movie_query, (search_pattern, search_pattern))
            movie_matches = cursor.fetchall()
            for movie in movie_matches:
                suggestions.append({
                    'name': movie['title'],
                    'type': 'Title',
                    'movie_ids': [movie['movie_id']]
                })

            # Search in cast names
            cast_query = """
                SELECT movie_id, name 
                FROM cast 
                WHERE name LIKE %s
                LIMIT 10
            """
            cursor.execute(cast_query, (search_pattern,))
            cast_matches = cursor.fetchall()
            for cast_member in cast_matches:
                suggestions.append({
                    'name': cast_member['name'],
                    'type': 'Actor',
                    'movie_ids': [cast_member['movie_id']]
                })

            # Search in crew names (e.g., directors)
            crew_query = """
                SELECT movie_id, name 
                FROM crew 
                WHERE name LIKE %s AND job = 'Director'
                LIMIT 10
            """
            cursor.execute(crew_query, (search_pattern,))
            crew_matches = cursor.fetchall()
            for crew_member in crew_matches:
                suggestions.append({
                    'name': crew_member['name'],
                    'type': 'Director',
                    'movie_ids': [crew_member['movie_id']]
                })

        except Exception as e:
            print(f"Error in autocomplete: {e}")
            return jsonify({"error": "Internal Server Error"}), 500
        finally:
            cursor.close()
            connection.close()

    return jsonify(suggestions)

@app.route('/get_person_images/<movie_folder>', methods=['GET'])
def get_person_images(movie_folder):
    folder_path = os.path.join(movies_path, movie_folder, 'person')
    try:
        # List all files in the 'person' folder of the given movie
        available_images = [f for f in os.listdir(folder_path) if f.endswith('.jpg')]
        return jsonify({"images": available_images})
    except Exception as e:
        return jsonify({"error": str(e), "images": []}), 500

if __name__ == '__main__':
    app.run(debug=True)
