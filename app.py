from flask import Flask, render_template, request, send_from_directory, jsonify, url_for, send_file, abort
import mysql.connector
from mysql.connector import pooling
from vars import db_name, db_passwd, db_user, themes, search_conditions, IS_PRIVATE
import math
import os
import random
import logging
import time
import hashlib

from flask_caching import Cache  # Import Cache

# Set Flask environment
os.environ['FLASK_ENV'] = 'development'

app = Flask(__name__)

# Database configuration
db_config = {
    'host': 'localhost',
    'user': db_user,
    'password': db_passwd,
    'database': db_name
}

import os

# Define the base directory relative to the script's location
MOVIES_BASE_DIRS = [
    r"E:\Movies\Katalog",
    r"F:\Katalog",
]


# Initialize the cache with SimpleCache
app.config['CACHE_TYPE'] = 'SimpleCache'
app.config['CACHE_DEFAULT_TIMEOUT'] = 300  # Cache timeout in seconds
cache = Cache(app)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


# Initialize MySQL Connection Pool
try:
    connection_pool = pooling.MySQLConnectionPool(pool_name="mypool",
                                                  pool_size=10,
                                                  **db_config)
    logging.info("MySQL connection pool created successfully.")
except mysql.connector.Error as err:
    logging.error(f"Error creating connection pool: {err}")
    connection_pool = None


def connect_to_db():
    """Establish a connection to the MySQL database using connection pooling."""
    if not connection_pool:
        logging.error("Connection pool is not initialized.")
        return None
    try:
        connection = connection_pool.get_connection()
        logging.info("Successfully connected to the database via pool.")
        return connection
    except mysql.connector.Error as err:
        logging.error(f"Error getting connection from pool: {err}")
        return None
    
# -------------------------------------------------------------------------
# HELPER FUNCTIONS FOR MULTIPLE DIRECTORIES
# -------------------------------------------------------------------------
def find_file_in_base_dirs(rel_path: str) -> str:
    """
    Given a relative path (e.g. "folder_name/poster/poster_1.jpg"),
    search each directory in MOVIES_BASE_DIRS and return the absolute file path
    if it exists. Otherwise return None.
    """
    for base_dir in MOVIES_BASE_DIRS:
        candidate = os.path.join(base_dir, rel_path)
        if os.path.isfile(candidate):
            return candidate
    return None
def find_folder_in_base_dirs(rel_path: str) -> str:
    """
    Similar to find_file_in_base_dirs, but checks for a directory.
    Return the first matching directory path or None if not found.
    """
    for base_dir in MOVIES_BASE_DIRS:
        candidate = os.path.join(base_dir, rel_path)
        if os.path.isdir(candidate):
            return candidate
    return None

@app.route('/movie_images/<path:filename>')
def movie_images(filename):
    """
    Serve movie images from whichever base directory they exist in.
    The `filename` is a relative path: e.g. "SomeFolder/poster/poster_1.jpg".
    """
    abs_path = find_file_in_base_dirs(filename)
    if not abs_path:
        abort(404, description="Image file not found in any base directory.")
    
    # We can send the file directly:
    return send_file(abs_path)


@app.route('/')
def index():
    """Render the index page."""
    logging.info("Rendering the index page.")
    return render_template('index.html')


@cache.cached(timeout=300)  # Cache this route
@app.route('/movie/<int:movie_id>')
def get_movie_details(movie_id):
    try:
        connection = connect_to_db()
        cursor = connection.cursor(dictionary=True)
        
        # Fetch movie details
        movie_query = """
        SELECT m.*, 
        GROUP_CONCAT(DISTINCT g.genre SEPARATOR ', ') AS genres,
        GROUP_CONCAT(DISTINCT c.country SEPARATOR ', ') AS countries,
        GROUP_CONCAT(DISTINCT p.company_name SEPARATOR ', ') AS production_companies
        FROM movies m
        LEFT JOIN genres g ON m.movie_id = g.movie_id
        LEFT JOIN countries c ON m.movie_id = c.movie_id
        LEFT JOIN production_companies p ON m.movie_id = p.movie_id
        WHERE m.movie_id = %s
        GROUP BY m.movie_id
        """
        cursor.execute(movie_query, (movie_id,))
        movie = cursor.fetchone()
        print(movie)
        
        if movie:
            # Split genres and countries into lists
            movie['genres'] = movie['genres'].split(', ') if movie['genres'] else []
            movie['countries'] = movie['countries'].split(', ') if movie['countries'] else []
            movie['production_companies'] = movie['production_companies'].split(', ') if movie['production_companies'] else []

            # Fetch directors with tmdb_id
            director_query = """
            SELECT name, tmdb_id
            FROM crew
            WHERE movie_id = %s AND job = 'Director'
            """
            cursor.execute(director_query, (movie_id,))
            directors = cursor.fetchall()
            movie['directors'] = [{'name': d['name'], 'tmdb_id': d['tmdb_id']} for d in directors]
            
            # Fetch actors with tmdb_id
            actor_query = """
            SELECT name, tmdb_id
            FROM movie_cast
            WHERE movie_id = %s
            ORDER BY popularity DESC
            LIMIT 10
            """
            cursor.execute(actor_query, (movie_id,))
            actors = cursor.fetchall()
            movie['actors'] = [{'name': a['name'], 'tmdb_id': a['tmdb_id']} for a in actors]
            
            # Fetch awards
            award_query = """
            SELECT award
            FROM awards
            WHERE movie_id = %s
            """
            cursor.execute(award_query, (movie_id,))
            awards = cursor.fetchall()
            movie['awards'] = [a['award'] for a in awards]
            
            # Fetch spoken languages
            lang_query = """
            SELECT language
            FROM spoken_languages
            WHERE movie_id = %s
            """
            cursor.execute(lang_query, (movie_id,))
            languages = cursor.fetchall()
            movie['spoken_languages'] = [l['language'] for l in languages]
            
            # Fetch video links
            video_query = """
            SELECT video_link
            FROM video_links
            WHERE movie_id = %s LIMIT 1
            """
            cursor.execute(video_query, (movie_id,))
            video_link = cursor.fetchone()
            movie['video_link'] = video_link['video_link'] if video_link else None

            # Add formats
            formats = []

            # Safely get values and handle None
            format_vhs = movie.get('format_vhs') or 0
            format_dvd = movie.get('format_dvd') or 0
            format_blu = movie.get('format_blu') or 0
            format_blu3 = movie.get('format_blu3') or 0

            # Ensure values are integers
            format_vhs = int(format_vhs)
            format_dvd = int(format_dvd)
            format_blu = int(format_blu)
            format_blu3 = int(format_blu3)

            if format_vhs > 0:
                formats.append(f"VHS ({format_vhs})")
            if format_dvd > 0:
                formats.append(f"DVD ({format_dvd})")
            if format_blu > 0:
                formats.append(f"Blu-ray ({format_blu})")
            if format_blu3 > 0:
                formats.append(f"Blu-ray 3D ({format_blu3})")
            movie['formats'] = ', '.join(formats)
            # Fetch posters and backdrops
            movie['posters'] = get_poster_images(movie['folder_name'])
            movie['backdrops'] = get_backdrop_images(movie['folder_name'])
            # movie_folder_path = os.path.join(MOVIES_BASE_DIR, movie['folder_name'], movie['moviefilename'])
            movie_file_path = validate_movie_file(movie)
            
            movie['movie_file_url'] = url_for('serve_movie_file', movie_id=movie_id) if movie_file_path else None


            cursor.close()
            connection.close()
            return render_template('movie_details.html', movie=movie)
        else:
            cursor.close()
            connection.close()
            return None
    except Exception as e:
        logging.error(f"An error occurred while fetching movie details: {e}")
        cursor.close()
        connection.close()
        return None

def get_movie_awards(cursor, movie_id):
    query = """
        SELECT award
        FROM awards
        WHERE movie_id = %s
    """
    cursor.execute(query, (movie_id,))
    awards = cursor.fetchall()
    return [award['award'] for award in awards] if awards else []


def get_movie_embeddable_video_link(cursor, movie_id):
    # Fetch the video link for the movie
    query = """
        SELECT video_link
        FROM video_links
        WHERE movie_id = %s
        LIMIT 1
    """
    cursor.execute(query, (movie_id,))
    result = cursor.fetchone()
    
    # Check if a video link was found
    if result and result['video_link']:
        video_url = result['video_link']
        
        # Convert to embeddable format if it’s a YouTube link
        if 'youtube.com/watch' in video_url:
            video_id = video_url.split('v=')[1]
            ampersand_position = video_id.find('&')
            if ampersand_position != -1:
                video_id = video_id[:ampersand_position]
            embeddable_link = f'https://www.youtube.com/embed/{video_id}'
        else:
            # For non-YouTube URLs, return the original link
            embeddable_link = video_url
        
        return embeddable_link
    
    # Return None if no video link exists
    return None


def get_movie_certificates(cursor, movie_id):
    query = """
        SELECT country, rating, additional_info
        FROM certificates
        WHERE movie_id = %s
    """
    cursor.execute(query, (movie_id,))
    certificates = cursor.fetchall()
    return [{'country': cert['country'], 'rating': cert['rating'], 'additional_info': cert['additional_info']} for cert in certificates] if certificates else []

def get_production_companies(cursor, movie_id):
    query = """
        SELECT company_name
        FROM production_companies
        WHERE movie_id = %s
    """
    cursor.execute(query, (movie_id,))
    companies = cursor.fetchall()
    return [company['company_name'] for company in companies] if companies else []

def get_spoken_languages(cursor, movie_id):
    query = """
        SELECT language
        FROM spoken_languages
        WHERE movie_id = %s
    """
    cursor.execute(query, (movie_id,))
    languages = cursor.fetchall()
    return [lang['language'] for lang in languages] if languages else []

@app.route('/get_backdrop_images/<path:movie_folder>')
def get_backdrop_images_route(movie_folder):
    """API endpoint to retrieve backdrop images."""
    backdrops = get_backdrop_images(movie_folder)
    return jsonify({"images": [os.path.basename(url) for url in backdrops]})

@app.route('/get_poster_images/<path:movie_folder>')
def get_poster_images_route(movie_folder):
    """API endpoint to retrieve poster images."""
    posters = get_poster_images(movie_folder)
    return jsonify({"images": [os.path.basename(url) for url in posters]})

def get_poster_images(movie_folder):
    """Retrieve poster image URLs for a specific movie folder."""
    return get_images(movie_folder, 'poster')

def get_backdrop_images(movie_folder):
    """Retrieve backdrop image URLs for a specific movie folder."""
    # If you want to only include '.avif' files for backdrops, specify the extensions parameter
    return get_images(movie_folder, 'backdrop', extensions=('.avif',))

def get_images(movie_folder, image_type, extensions=('.avif', '.jpg', '.jpeg', '.png', '.webp')):
    """
    Retrieve image URLs for a specific movie folder & subdir type
    ('poster' or 'backdrop'). We look for the subdirectory across all base dirs.
    """
    images = []
    # 1) Find a matching subfolder in any of the base directories
    subdir = find_folder_in_base_dirs(os.path.join(movie_folder, image_type))
    if not subdir:
        logging.warning(f"No {image_type} directory found for folder: {movie_folder}")
        return images

    # 2) List all files in that subdir matching the given extensions
    for filename in sorted(os.listdir(subdir)):
        if filename.lower().endswith(extensions):
            # The relative path needed by the `movie_images` route:
            rel_path = os.path.join(movie_folder, image_type, filename).replace("\\","/")
            # Use `url_for('movie_images', filename=rel_path)`
            image_url = url_for('movie_images', filename=rel_path)
            images.append(image_url)

    return images


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

    logging.info("Rendering catalog page")
    logging.info(f"Search Query: {search_query}, Genre Filter: {genre_filter}, Year Filter: {year_filter}, Page: {page}")

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
            m.rating, 
            m.fsk, 
            m.folder_name, 
            m.overview, 
            m.standort,  
            m.format_inhalt,  
            GROUP_CONCAT(DISTINCT CONCAT(c.country, ' (', c.country_code, ')') SEPARATOR ', ') AS countries,
            GROUP_CONCAT(DISTINCT g.genre SEPARATOR ', ') AS genres,
            (SELECT name FROM crew WHERE crew.movie_id = m.movie_id AND job = 'Director' LIMIT 1) AS director,
            (SELECT GROUP_CONCAT(DISTINCT movie_cast.name ORDER BY movie_cast.popularity DESC SEPARATOR ', ') 
                FROM movie_cast WHERE movie_cast.movie_id = m.movie_id LIMIT 3) AS actors,
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
        start_time = time.time()

        # Execute the base query to get the filtered movie data
        logging.info("Executing base query for movies")
        cursor.execute(base_query, pag_params)
        movies = cursor.fetchall()

        # Convert 'countries' and 'genres' from strings to lists
        for movie in movies:
            movie['countries'] = movie['countries'].split(', ') if movie['countries'] else []
            movie['genres'] = movie['genres'].split(', ') if movie['genres'] else []
            movie['actors'] = movie['actors'].split(', ') if movie['actors'] else []
            movie['director'] = movie['director'].split(', ') if movie['director'] else []

        # Execute the count query to get the total count of filtered movies
        logging.info("Executing count query for total movies")
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
            theme_sql_condition = "" if IS_PRIVATE else selected_theme['sql_condition']
            featured_query = f"""
                SELECT 
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
                    {theme_sql_condition}
                GROUP BY m.movie_id
                HAVING m.rating > 6.7 AND m.poster_images > 0
                ORDER BY RAND()
                LIMIT 20;
            """
            
            logging.info("Executing featured movies query")
            cursor.execute(featured_query, ())
            featured_movies = cursor.fetchall()
            print("featured_movies2", featured_query)

            # Convert 'countries' and 'genres' from strings to lists if needed
            for movie in featured_movies:
                movie['countries'] = movie['countries'].split(', ') if 'countries' in movie and movie['countries'] else []
                movie['genres'] = movie['genres'].split(', ') if 'genres' in movie and movie['genres'] else []
        else:
            featured_movies = []
        

        # Close cursor and database connection
        cursor.close()
        connection.close()

        end_time = time.time()
        logging.info(f"Catalog data fetched in {end_time - start_time:.2f} seconds")

        logging.debug(f"Fetched movies: {movies[:1]}")

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
        logging.error(f"An error occurred while fetching catalog: {e}")
        return jsonify({'error': str(e)}), 500
        

@cache.cached(timeout=300, query_string=True)  # Cache this route with query string parameters
@app.route('/filter_movies', methods=['GET'])

def filter_movies():
    try:
        include_counts = request.args.get('include_counts', 'true').lower() == 'true'
        # **1. Retrieve Filter Parameters**
        start_time = time.time()
        selected_years = request.args.get('years', '').split(',') if request.args.get('years') else []
        selected_genres = request.args.get('genres', '').split(',') if request.args.get('genres') else []
        selected_countries = request.args.get('countries', '').split(',') if request.args.get('countries') else []
        search_query = request.args.get('search', '').strip()
        standorte = request.args.get('standorte', '').split(',') if request.args.get('standorte') else []
        media = request.args.get('media', '').split(',') if request.args.get('media') else []
        sort_by = request.args.get('sort_by', 'Zufall')  # Default sort by 'Zufall' (random)
        page = int(request.args.get('page', 1))
        
        logging.info("Filtering movies")
        logging.info(f"Parameters - Years: {selected_years}, Genres: {selected_genres}, Countries: {selected_countries}, Search Query: '{search_query}', Standorte: {standorte}, Media: {media}, Sort By: {sort_by}, Page: {page}")

        # **Build the filters and parameters**
        where_clauses = []
        params = []

        # **Apply Search Condition**
        if search_query:
            where_clauses.append("""
                                    (
                                        m.title LIKE %s 
                                        OR m.original_title LIKE %s 
                                        OR cr.name LIKE %s 
                                        OR EXISTS (
                                            SELECT 1 
                                            FROM movie_cast mc 
                                            WHERE mc.movie_id = m.movie_id 
                                            AND mc.name LIKE %s
                                        )
                                    )
                                """)
            search_pattern = f"%{search_query}%"
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

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
            where_clauses.append(f"m.standort IN ({standort_placeholders})")
            params.extend(standorte)

        # **Apply Media Filter**
        if media:
            media_filters = [f"m.{medium} > 0" for medium in media]
            where_clauses.append(f"({' OR '.join(media_filters)})")

        # **Construct WHERE Clause for Queries**
        where_clause = " AND ".join(where_clauses) if where_clauses else "1=1"

        # **Generate a Hash for the Current Filters**
        filters_string = f"{selected_years}_{selected_genres}_{selected_countries}_{search_query}_{standorte}_{media}"
        filters_hash = hashlib.md5(filters_string.encode('utf-8')).hexdigest()

        # **Generate Cache Key for Counts**
        counts_cache_key = f"counts_{filters_hash}"

        # **Check if Counts are Cached**
        counts_cached = cache.get(counts_cache_key)

        # **2. Establish Database Connection**
        connection = connect_to_db()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = connection.cursor(dictionary=True)

        # **3. Build the Count Query to Get total_movies**
        count_query = f"""
            SELECT COUNT(DISTINCT m.movie_id) as total 
            FROM movies m 
            LEFT JOIN genres g ON m.movie_id = g.movie_id
            LEFT JOIN countries c ON m.movie_id = c.movie_id
            LEFT JOIN crew cr ON m.movie_id = cr.movie_id AND cr.job = 'Director'
            LEFT JOIN movie_cast mc ON m.movie_id = mc.movie_id
            WHERE {where_clause}
        """

        # **Execute Count Query to Get total_movies**
        logging.info("Executing count query for total movies")
        cursor.execute(count_query, tuple(params))
        logging.info("after count query for total movies")
        total_movies = cursor.fetchone()['total']


        # **4. Determine columns_per_row and items_per_page**
        # Ensure a maximum of 10 rows, based on the number of columns per row
        rows_per_page = 3
        columns_per_row = 4

        # Items per page should be columns_per_row * rows_per_page
        items_per_page = columns_per_row * rows_per_page

        # **5. Calculate total_pages**
        total_pages = math.ceil(total_movies / items_per_page) if items_per_page else 1
       

        # **6. Adjust Page Number if Out of Bounds**
        if page < 1:
            page = 1
        elif page > total_pages:
            page = total_pages

        # **7. Calculate OFFSET for Pagination**
        offset = (page - 1) * items_per_page

        # Detailed log
        logging.info(f"""
        Pagination Debugging Log:
        --------------------------
        Selected Page: {page}
        Items Per Page: {items_per_page}
        Total Movies: {total_movies}
        Total Pages: {total_pages}
        Calculated Offset: {offset}
        Columns Per Row: {columns_per_row}
        --------------------------
        """)

        # **8. Build the Base Query to Fetch Movies with Filters and Pagination**
        sort_expression, sort_options = build_sort_expression(sort_by)
        base_query = f"""
            SELECT
                m.movie_id,
                COALESCE(m.format_titel, m.title) AS main_title,
                m.original_title,
                m.release_date,
                m.runtime,
                m.imdb_id,
                m.rating,
                m.fsk,
                m.folder_name,
                m.overview,
                m.standort,
                m.format_inhalt,
                GROUP_CONCAT(DISTINCT CONCAT(c.country, ' (', c.country_code, ')') SEPARATOR ', ') AS countries,
                GROUP_CONCAT(DISTINCT g.genre SEPARATOR ', ') AS genres,
                GROUP_CONCAT(DISTINCT cr.name SEPARATOR ', ') AS director,
                (SELECT GROUP_CONCAT(DISTINCT movie_cast.name ORDER BY movie_cast.popularity DESC SEPARATOR ', ')
                    FROM movie_cast WHERE movie_cast.movie_id = m.movie_id LIMIT 3) AS actors,
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
            WHERE {where_clause}
            GROUP BY m.movie_id
            ORDER BY {sort_expression}
            LIMIT %s OFFSET %s
        """
        offset_value = max(0, offset) 
        base_params = params + [items_per_page, offset_value]
        print(base_query, base_params)

        try:
            # **Execute Base Query to Fetch Movies**
            logging.info("Executing base query for filtered movies")
            cursor.execute(base_query, tuple(base_params))
            filtered_movies = cursor.fetchall()

            # **Convert 'countries' and 'genres' from Strings to Lists**
            for movie in filtered_movies:
                movie['countries'] = movie['countries'].split(', ') if movie['countries'] else []
                movie['genres'] = movie['genres'].split(', ') if movie['genres'] else []
                movie['director'] = movie['director'].split(', ') if movie['director'] else []

            # **9. Fetch Counts for Dropdown Filters if include_counts is True**
            if include_counts:
                if counts_cached:
                    logging.info("Using cached counts for dropdown filters")
                    genre_counts, year_counts, country_counts, standorte_counts, media_counts = counts_cached
                else:
                    logging.info("Fetching counts for dropdown filters")

                    # **Fetch Counts for Each Filter Field**
                    genre_counts = get_counts(cursor, 'genre', where_clause, params)
                    year_counts = get_counts(cursor, 'release_date', where_clause, params)
                    country_counts = get_counts(cursor, 'country', where_clause, params)
                    standorte_counts = get_counts(cursor, 'standort', where_clause, params)
                    media_counts = get_counts(cursor, 'media', where_clause, params)

                    # **Sort Years with Decades**
                    year_counts = sort_years_with_decades(year_counts)

                    # **Cache the Counts**
                    cache.set(counts_cache_key, (genre_counts, year_counts, country_counts, standorte_counts, media_counts), timeout=300)
            else:
                # Do not fetch counts
                genre_counts = {}
                year_counts = {}
                country_counts = {}
                standorte_counts = {}
                media_counts = {}

            # **10. Close Cursor and Connection**
            cursor.close()
            connection.close()

            end_time = time.time()
            logging.info(f"Filtered movies fetched in {end_time - start_time:.2f} seconds")

            # **11. Prepare JSON Response**
            response_data = {
                'movies': filtered_movies,
                'current_page': page,
                'total_pages': total_pages,
                'total_movies': total_movies,
                'columns_per_row': columns_per_row,
                'items_per_page': items_per_page,
                'sort_options': sort_options
            }

            if include_counts:
                response_data.update({
                    'years': year_counts,
                    'genres': genre_counts,
                    'countries': country_counts,
                    'standorte': standorte_counts,
                    'media': media_counts
                })

            # **12. Return JSON Response**
            return jsonify(response_data)
        
        except Exception as e:
            logging.error(f"Error occurred in filter_movies: {e}")
            cursor.close()
            connection.close()
            return jsonify({'error': str(e)}), 500
        
    except Exception as e:
        logging.error(f"Error occurred in filter_movies: {e}")
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
        "Bewertung asc": "CAST(m.rating AS DECIMAL(3,1)) ASC",  # Ascending order by IMDb rating
        "Bewertung desc": "CAST(m.rating AS DECIMAL(3,1)) DESC",  # Descending order by IMDb rating
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
        individual_years.items(),
        key=lambda x: (int(x[0]) if x[0].isdigit() else float('inf')),  # Non-numeric years go last
        reverse=True
    )
    
    # Combine: Decades first, followed by individual years in descending order
    sorted_combined = sorted_decades + sorted_years

    # Convert back to dictionary format
    sorted_combined_dict = dict(sorted_combined)

    logging.debug(f"Sorted years with decades: {sorted_combined_dict}")

    return sorted_combined_dict


def get_counts(cursor, field, where_clause, params):
    """
    Generalized helper function to get counts of distinct values for the specified field,
    including search query filtering and filters for years, countries, and genres.
    """
    logging.info(f"Getting counts for field: {field}")

    if field == "media":
        # For media counts, calculate the sum of each media format
        count_query = f"""
            SELECT
                SUM(CASE WHEN m.format_vhs > 0 THEN 1 ELSE 0 END) AS format_vhs,
                SUM(CASE WHEN m.format_dvd > 0 THEN 1 ELSE 0 END) AS format_dvd,
                SUM(CASE WHEN m.format_blu > 0 THEN 1 ELSE 0 END) AS format_blu,
                SUM(CASE WHEN m.format_blu3 > 0 THEN 1 ELSE 0 END) AS format_blu3
            FROM movies m
            LEFT JOIN crew cr ON m.movie_id = cr.movie_id AND cr.job = 'Director'
            WHERE {where_clause}
        """
        cursor.execute(count_query, tuple(params))
        result = cursor.fetchone()
        return {
            'format_vhs': result['format_vhs'],
            'format_dvd': result['format_dvd'],
            'format_blu': result['format_blu'],
            'format_blu3': result['format_blu3']
        }
    else:
        # For other fields (genre, release_date, country, standort)
        if field == "genre":
            group_field = "g.genre"
            join_clause = "LEFT JOIN genres g ON m.movie_id = g.movie_id"
        elif field == "country":
            group_field = "c.country"
            join_clause = "LEFT JOIN countries c ON m.movie_id = c.movie_id"
        elif field == "release_date":
            group_field = "m.release_date"
            join_clause = ""
        elif field == "standort":
            group_field = "m.standort"
            join_clause = ""
        else:
            raise ValueError(f"Invalid field name: {field}")

        # Construct the count query
        count_query = f"""
            SELECT {group_field} AS field_value, COUNT(DISTINCT m.movie_id) AS count
            FROM movies m
            {join_clause}
            LEFT JOIN crew cr ON m.movie_id = cr.movie_id AND cr.job = 'Director'
            WHERE {where_clause}
        """

        # Add GROUP BY and ORDER BY clauses
        if field in ["genre", "country"]:
            count_query += f" GROUP BY {group_field} ORDER BY count DESC"
        else:
            # For release_date and standort
            count_query += f" GROUP BY {group_field} ORDER BY {group_field} DESC"

        cursor.execute(count_query, tuple(params))
        results = cursor.fetchall()

        counts = {}
        for row in results:
            key = row['field_value'] if row['field_value'] else 'Unknown'
            counts[key] = row['count']

        return counts


@cache.cached(timeout=300, query_string=True)  # Cache this route with query string parameters
@app.route('/autocomplete')
def autocomplete():
    """
    Handle autocomplete AJAX requests by searching in movies, movie_cast, and crew.
    Returns suggestions with associated movie_ids for efficient filtering.
    """
    query = request.args.get('query', '').strip()
    suggestions = []

    logging.info(f"Handling autocomplete for query: '{query}'")

    if len(query) >= 2:
        connection = connect_to_db()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500

        try:
            cursor = connection.cursor(dictionary=True)

            # Search in movie titles
            movie_query = """
                SELECT DISTINCT title, movie_id
                FROM movies 
                WHERE title LIKE %s OR original_title LIKE %s OR format_orig_titel LIKE %s
                ORDER BY title
                LIMIT 10
            """
            search_pattern = f"%{query}%"
            cursor.execute(movie_query, (search_pattern,) * 3)
            movie_matches = cursor.fetchall()
            for movie in movie_matches:
                suggestions.append({
                    'name': movie['title'],
                    'type': 'Title',
                    'id': movie['movie_id']  # Include the actual movie_id
                })

            # Search in cast names
            cast_query = """
                SELECT DISTINCT name, id
                FROM movie_cast 
                WHERE name LIKE %s
                ORDER BY name
                LIMIT 10
            """
            cursor.execute(cast_query, (search_pattern,))
            cast_matches = cursor.fetchall()
            for cast_member in cast_matches:
                suggestions.append({
                    'name': cast_member['name'],
                    'type': 'Actor',
                    'id': cast_member['id']  # Include the actual movie_id
                })

            # Search in crew names (e.g., directors)
            crew_query = """
                SELECT DISTINCT name, id 
                FROM crew 
                WHERE name LIKE %s AND job = 'Director'
                ORDER BY name
                LIMIT 10
            """
            cursor.execute(crew_query, (search_pattern,))
            crew_matches = cursor.fetchall()
            for crew_member in crew_matches:
                suggestions.append({
                    'name': crew_member['name'],
                    'type': 'Director',
                    'id': crew_member['id']  # Include the actual movie_id
                })

        except Exception as e:
            logging.error(f"Error in autocomplete: {e}")
            return jsonify({"error": "Internal Server Error"}), 500
        finally:
            cursor.close()
            connection.close()

    print(suggestions)

    return jsonify(suggestions)

def get_movie_file(MOVIE_FOLDER):
    folder = os.path.join(MOVIE_FOLDER, movie_id)
    if not os.path.exists(MOVIE_FOLDER):
        return None
    for file in os.listdir(folder):
        if file.lower().endswith(('.mp4', '.mkv', '.avi', '.mov', '.webm', '.ogg')):
            return os.path.join(folder, file)
    return None

def get_subtitle_files(movie_id):
    folder = os.path.join(MOVIE_FOLDER, movie_id)
    subtitle_files = []
    if not os.path.exists(folder):
        return subtitle_files
    for file in os.listdir(folder):
        if file.lower().endswith(('.vtt', '.srt', '.ass')):
            subtitle_files.append(file)
    return subtitle_files

def convert_subtitle_to_vtt(subtitle_path):
    ext = os.path.splitext(subtitle_path)[1].lower()
    vtt_path = subtitle_path + '.vtt'  # Temporary file
    if ext == '.vtt':
        return subtitle_path  # Already in VTT format
    try:
        with open(subtitle_path, 'r', encoding='utf-8') as infile:
            content = infile.read()
        # Basic conversion; for complex files, use a library like pysrt or pycaption
        content = 'WEBVTT\n\n' + content.replace(',', '.')
        with open(vtt_path, 'w', encoding='utf-8') as outfile:
            outfile.write(content)
        return vtt_path
    except Exception as e:
        print(f"Error converting subtitle: {e}")
        return None

# A route to serve the actual movie file if it exists
@app.route('/movie_file/<int:movie_id>')
def serve_movie_file(movie_id):
    """
    Return the movie file as an attachment or a streamed response if available.
    """
    # We need to look up the folder name + moviefilename in DB or fetch from context
    connection = connect_to_db()
    if not connection:
        abort(500, "DB connection failed.")
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT folder_name, moviefilename FROM movies WHERE movie_id = %s", (movie_id,))
        row = cursor.fetchone()
        cursor.close()
        connection.close()
        if not row:
            abort(404, "Movie not found in DB.")

        folder_name = row.get('folder_name', '')
        moviefilename = row.get('moviefilename', '')
        rel_path = os.path.join(folder_name, moviefilename)
        abs_path = find_file_in_base_dirs(rel_path)
        if abs_path and os.path.isfile(abs_path):
            return send_file(abs_path, mimetype='video/mp4', conditional=True)
        else:
            abort(404, "Movie file not found on disk.")
    except Exception as e:
        logging.error(f"Error in serve_movie_file for ID {movie_id}: {e}")
        abort(500, "Internal server error.")


# Example route for a subtitle file
@app.route('/subtitle/<folder_name>/<subtitle_file>')
def serve_subtitle(folder_name, subtitle_file):
    # We combine folder_name & subtitle_file -> then find in base dirs
    rel_path = os.path.join(folder_name, subtitle_file)
    abs_path = find_file_in_base_dirs(rel_path)
    if not abs_path or not os.path.isfile(abs_path):
        abort(404, description="Subtitle file not found")

    # If the subtitle is in SRT format, convert it to VTT on the fly
    if subtitle_file.lower().endswith('.srt'):
        vtt_content = convert_srt_to_vtt(abs_path)
        return Response(vtt_content, mimetype='text/vtt')
    # Otherwise, just serve the file
    return send_file(abs_path, mimetype='text/vtt')

from urllib.parse import unquote
from flask import send_file
@app.route("/play_movie/<path:folder_name>/<path:filename>")
def play_movie(folder_name, filename):
    folder_name = unquote(folder_name)
    filename = unquote(filename)
    folder_path = find_folder_in_base_dirs(folder_name)
    if not folder_path:
        abort(404, description="Folder not found")
    
    abs_path = os.path.join(folder_path, filename)
    if not os.path.isfile(abs_path):
        abort(404, description="File not found")

    # Provide the correct MIME type, if known.
    print("play_movie", abs_path)
    return send_file(abs_path, mimetype="video/mp4")

# app.py

@app.route('/movie_player/<folder_name>/<filename>')
def movie_player(folder_name, filename):
    """
    Basic route to show a video player in a template,
    optionally with subtitles in the same folder.
    """
    folder_path = find_folder_in_base_dirs(folder_name)
    print("movie_player", folder_path)
    if not folder_path:
        abort(404, description="Movie folder not found in any base directory.")

    movie_path = os.path.join(folder_path, filename)
    if not os.path.isfile(movie_path):
        abort(404, description="Movie file not found")

    # Detect subtitle files in the same folder
    subtitles = []
    for file in os.listdir(folder_path):
        if file.lower().endswith(('.srt', '.vtt')):
            subtitles.append(file)
    logging.info(f"Found subtitles: {subtitles}")
    # print(f"Folder: {folder_name}")
    # print(f"Filename: {filename}")

    return render_template(
        'movie_player.html',
        folder_name=folder_name,
        filename=filename,
        subtitles=subtitles
    )

from flask import Response

def convert_srt_to_vtt(srt_path):
    with open(srt_path, 'r', encoding='utf-8') as srt_file:
        content = srt_file.read()
    # Simple conversion: replace commas with periods in timestamps
    content = content.replace(',', '.')
    return 'WEBVTT\n\n' + content

# For validating a single movie file:
def validate_movie_file(movie):
    """
    Check if the movie file path is valid across the multiple directories.
    `movie['folder_name']` and `movie['moviefilename']` are used to locate the file.
    """
    folder_name = movie.get('folder_name', '')
    moviefilename = movie.get('moviefilename', '')
    if not folder_name or not moviefilename:
        return None

    rel_path = os.path.join(folder_name, moviefilename)
    found_path = find_file_in_base_dirs(rel_path)
    return found_path if found_path and os.path.isfile(found_path) else None

if __name__ == '__main__':
    app.run(debug=True)
