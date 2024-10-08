@app.route('/catalog')
def catalog():
    """
    The /catalog route handles:
    1. Theme-Based Movie Selection
    2. Search, Filter, and Pagination
    3. Featured Movies for Carousel
    """
    # Retrieve query parameters
    search_query = request.args.get('search', '').strip()
    genre_filter = request.args.get('genres', '').strip()
    year_filter = request.args.get('years', '').strip()
    page = int(request.args.get('page', 1))
    per_page = 10
    offset = (page - 1) * per_page

    # Establish database connection
    connection = connect_to_db()
    if not connection:
        return "Database connection failed", 500

    cursor = connection.cursor(dictionary=True)

    try:
        # =============================
        # 1. Theme-Based Movie Selection
        # =============================

        carousel_themes = themes
        random.shuffle(carousel_themes)
        selected_themes = []
        num_themes_needed = 5  # Number of themes to include for rotation

        # Fetch movies from the database for each theme
        for theme in carousel_themes:
            theme_query = f"""
                SELECT DISTINCT m.movie_id, COALESCE(m.format_titel, m.title) AS title, m.folder_name, 
                       m.overview, m.imdb_rating, m.poster_images
                FROM movies m
                {theme['sql_condition']}
                AND m.imdb_rating > 6.7 AND m.poster_images > 0
                LIMIT 50;
            """
            cursor.execute(theme_query)
            movies = cursor.fetchall()

            # Debug: Check if all movies have folder_name
            for movie in movies:
                if 'folder_name' not in movie or not movie['folder_name']:
                    print(f"Missing or empty 'folder_name' for movie ID: {movie.get('movie_id', 'Unknown')}, Title: {movie.get('title', 'Unknown')}")
                else:
                    print(f"Movie ID: {movie['movie_id']}, Folder Name: {movie['folder_name']}")

            if len(movies) >= 12:
                selected_themes.append({'name': theme['name'], 'movies': movies[:12]})
                if len(selected_themes) == num_themes_needed:
                    break

        # If not enough themes, add a fallback theme
        if len(selected_themes) < num_themes_needed:
            fallback_query = """
                SELECT m.movie_id, COALESCE(m.format_titel, m.title) AS title, m.folder_name, 
                       m.overview, m.imdb_rating, m.poster_images
                FROM movies m
                WHERE m.imdb_rating > 6.7 AND m.poster_images > 0
                ORDER BY RAND()
                LIMIT 50;
            """
            cursor.execute(fallback_query)
            fallback_movies = cursor.fetchall()

            # Ensure 'folder_name' exists
            for movie in fallback_movies:
                if 'folder_name' not in movie or not movie['folder_name']:
                    movie['folder_name'] = 'N/A'  # Assign a default value or handle appropriately
                    print(f"Assigned default 'folder_name' for movie ID: {movie.get('movie_id', 'Unknown')}, Title: {movie.get('title', 'Unknown')}")
                else:
                    print(f"Fallback Movie ID: {movie['movie_id']}, Folder Name: {movie['folder_name']}")

            selected_themes.append({'name': 'Featured Movies', 'movies': fallback_movies[:12]})

        # =============================
        # 2. Search, Filter, and Pagination
        # =============================

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

        # Construct the count query
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
            base_query += " AND YEAR(m.release_date) = %s"  # Assuming release_date is a DATE or DATETIME field
            count_query += " AND YEAR(m.release_date) = %s"
            params.append(int(year_filter))

        # Finalize the base query with pagination
        base_query += " GROUP BY m.movie_id ORDER BY m.release_date DESC LIMIT %s OFFSET %s"
        params.extend([per_page, offset])

        # Execute the base query to get the filtered movie data
        cursor.execute(base_query, params)
        movies = cursor.fetchall()

        # Debug: Check if all movies have folder_name
        print("Movies from Search/Filter/Pagination:")
        for movie in movies:
            if 'folder_name' not in movie or not movie['folder_name']:
                print(f"Missing or empty 'folder_name' for movie ID: {movie.get('movie_id', 'Unknown')}, Title: {movie.get('main_title', 'Unknown')}")
            else:
                print(f"Movie ID: {movie['movie_id']}, Folder Name: {movie['folder_name']}")

        # Convert 'countries' and 'genres' from strings to lists
        for movie in movies:
            movie['countries'] = movie['countries'].split(', ') if movie.get('countries') else []
            movie['genres'] = movie['genres'].split(', ') if movie.get('genres') else []

        # Execute the count query to get the total count of filtered movies
        count_params = params[:-2]  # Exclude LIMIT and OFFSET
        cursor.execute(count_query, count_params)
        total_movies = cursor.fetchone()['total']
        total_pages = math.ceil(total_movies / per_page) if per_page else 1

        # Define pagination range for the current page
        pagination_range = list(range(max(1, page - 2), min(total_pages + 1, page + 3)))

        # =============================
        # 3. Additional Debugging
        # =============================
        print(f"Selected themes: {selected_themes}")
        print(f"Movies from Search/Filter/Pagination count: {len(movies)}")
        print(f"Total movies found: {total_movies}, Total pages: {total_pages}")

        # =============================
        # 4. Pass Data to Template
        # =============================

        return render_template(
            'catalog.html',
            themes=selected_themes,
            movies=movies,
            page=page,
            total_pages=total_pages,
            search_query=search_query,
            pagination_range=pagination_range,
            featured_movies=selected_themes,  # Pass all selected themes for rotation
            selected_theme=selected_themes[0]['name'] if selected_themes else 'Featured Movies'
        )

    except Exception as e:
        print(f"Error in /catalog route: {e}")
        return "An error occurred while processing your request.", 500

    finally:
        cursor.close()
        connection.close()

