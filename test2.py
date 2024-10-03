import unittest
from flask import Flask, jsonify
from unittest.mock import patch, MagicMock
from app import app
from flask import Flask, render_template, request, send_from_directory, jsonify
import mysql.connector
from vars import db_name, db_passwd, db_user
import math

# Database configuration
db_config = {
    'host': 'localhost',
    'user': db_user,
    'password': db_passwd,
    'database': db_name
}

def connect_to_db():
    try:
        connection = mysql.connector.connect(**db_config)
        print("Successfully connected to the database.")
        return connection
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None

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

def get_counts(cursor, field, selected_years, selected_countries, selected_genres):
    table, field_name, join_clause = None, None, None

    # Determine table, field name, and join clause based on the field type
    if field == "genre":
        table, field_name, join_clause = "genres", "genre", "JOIN movies m ON genres.movie_id = m.movie_id"
    elif field == "release_date":
        table, field_name = "movies", "release_date"
    elif field == "country":
        table, field_name, join_clause = "countries", "country", "JOIN movies m ON countries.movie_id = m.movie_id"
    else:
        raise ValueError(f"Unsupported field: {field}")

    # Construct the base query
    if table == "movies":
        query = f"SELECT {field_name}, COUNT(DISTINCT movie_id) as count FROM {table}"
    else:
        query = f"SELECT {field_name}, COUNT(DISTINCT {table}.movie_id) as count FROM {table} {join_clause if join_clause else ''}"

    # Prepare WHERE clauses based on the filters
    where_clauses, params = [], []

    if selected_years and field != "release_date":
        where_clauses.append(f"{table}.movie_id IN (SELECT movie_id FROM movies WHERE release_date IN (" + ",".join(["%s"] * len(selected_years)) + "))")
        params.extend(selected_years)

    if selected_countries and field != "country":
        where_clauses.append(f"{table}.movie_id IN (SELECT movie_id FROM countries WHERE country IN (" + ",".join(["%s"] * len(selected_countries)) + "))")
        params.extend(selected_countries)

    if selected_genres and field != "genre":
        where_clauses.append(f"{table}.movie_id IN (SELECT movie_id FROM genres WHERE genre IN (" + ",".join(["%s"] * len(selected_genres)) + "))")
        params.extend(selected_genres)

    # Add the WHERE clauses to the query if they exist
    if where_clauses:
        query += " WHERE " + " AND ".join(where_clauses)

    # Add GROUP BY clause
    query += f" GROUP BY {field_name}"

    # Debug print the query and parameters
    print(f"Executing query: {query} with params: {params}")

    # Execute the query and fetch the results
    cursor.execute(query, params)
    results = cursor.fetchall()

    # Handle decade grouping if the field is `release_date`
    if field == "release_date":
        year_counts = {}
        decades = {}

        # Convert each year to string and calculate decades
        for row in results:
            year = str(row[field_name])  # Ensure the year is a string
            count = row['count']

            # Group by individual years
            year_counts[year] = count

            # Calculate the decade and add the counts
            if year.isdigit():  # Only group by decade if the year is a valid number
                decade = f"{int(year) // 10 * 10}..."
                if decade in decades:
                    decades[decade] += count
                else:
                    decades[decade] = count

        # Combine decades (sorted) and years (sorted) with decades appearing on top
        sorted_decades = sorted(decades.items(), key=lambda x: int(x[0].replace("...", "")))
        sorted_years = sorted(year_counts.items(), key=lambda x: int(x[0]))

        # Convert the lists back to a dictionary for better handling
        counts = {decade: count for decade, count in sorted_decades}
        counts.update({year: count for year, count in sorted_years})
        return counts

    # For other fields (genre or country), return the counts as a dictionary
    return {row[field_name]: row['count'] for row in results}

def filter_movies():
    try:
        # Retrieve filter values from request arguments
        selected_years = request.args.get('years', '').split(',') if request.args.get('years') else []
        selected_genres = request.args.get('genres', '').split(',') if request.args.get('genres') else []
        selected_countries = request.args.get('countries', '').split(',') if request.args.get('countries') else []
        page = int(request.args.get('page', 1))  # Retrieve the current page
        per_page = 10
        offset = (page - 1) * per_page

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
                (SELECT name FROM crew WHERE movie_id = m.movie_id AND job = 'Director' LIMIT 1) AS director,
                (SELECT GROUP_CONCAT(DISTINCT c.name ORDER BY c.popularity DESC SEPARATOR ', ') 
                FROM cast c WHERE c.movie_id = m.movie_id LIMIT 3) AS actors,
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
            SELECT COUNT(DISTINCT movie_id) as total 
            FROM movies m 
            LEFT JOIN genres g ON m.movie_id = g.movie_id 
            LEFT JOIN countries c ON m.movie_id = c.movie_id 
            WHERE 1=1
        """
        
        # Apply year conditions if available
        if years_conditions:
            base_query += f" AND ({' OR '.join(years_conditions)})"
            count_query += f" AND ({' OR '.join(years_conditions)})"

        # Apply filters
        if selected_genres:
            base_query += f" AND movie_id IN (SELECT movie_id FROM genres WHERE genre IN (" + ",".join(["%s"] * len(selected_genres)) + "))"
            count_query += f" AND movie_id IN (SELECT movie_id FROM genres WHERE genre IN (" + ",".join(["%s"] * len(selected_genres)) + "))"

        if selected_countries:
            base_query += f" AND movie_id IN (SELECT movie_id FROM countries WHERE country IN (" + ",".join(["%s"] * len(selected_countries)) + "))"
            count_query += f" AND movie_id IN (SELECT movie_id FROM countries WHERE country IN (" + ",".join(["%s"] * len(selected_countries)) + "))"
        
        # Append the parameters to the query
        params = selected_genres + selected_countries + [per_page, offset]

        # Finalize the base query with pagination
        base_query += " GROUP BY m.movie_id LIMIT %s OFFSET %s"

        # Execute the base query to get the filtered movie data
        cursor.execute(base_query, params)
        filtered_movies = cursor.fetchall()

        # Execute the count query to get the total count of filtered movies
        cursor.execute(count_query, params[:-2])  # Remove pagination params
        total_movies = cursor.fetchone()['total']
        total_pages = math.ceil(total_movies / per_page)

        # Retrieve counts for dropdown filters
        genre_counts = get_counts(cursor, "genre", selected_years, selected_countries, selected_genres)
        year_counts = get_counts(cursor, "release_date", selected_years, selected_countries, selected_genres)
        country_counts = get_counts(cursor, "country", selected_years, selected_countries, selected_genres)

        # Apply sorting to place grouped decades at the top
        year_counts = sort_years_with_decades(year_counts)

        # Close the cursor and connection
        cursor.close()
        connection.close()

        # Return updated JSON response with new grouped counts
        return jsonify({
            'movies': filtered_movies,
            'years': year_counts if year_counts else {},  # Make sure `years` is included, even if empty
            'genres': genre_counts,
            'countries': country_counts,
            'current_page': page,
            'total_pages': total_pages
        })

    except Exception as e:
        print(f"Error occurred: {e}")
        return jsonify({'error': str(e)}), 500


#/////////////////////////////////////////////////////////////////////////////////////////
class FilterMoviesTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    @patch('app.connect_to_db')
    def test_filter_movies_action_genre(self, mock_connect_to_db):
        # Mock database connection and cursor
        mock_connection = MagicMock()
        mock_cursor = MagicMock()

        # Set up the mock to return a mock connection and cursor
        mock_connect_to_db.return_value = mock_connection
        mock_connection.cursor.return_value = mock_cursor

        # Mock data for each query executed in the function
        mock_cursor.fetchall.side_effect = [
            [{'genre': 'Action', 'count': 15}],  # Mock for genre counts
            [{'release_date': 1985, 'count': 5}],  # Mock for year counts
            [{'country': 'USA', 'count': 7}],  # Mock for country counts
            [{'movie_id': 1, 'main_title': 'Movie 1', 'original_title': 'Movie Original 1',
              'release_date': 1985, 'runtime': 120, 'imdb_id': 'tt1234567',
              'imdb_rating': '7.8', 'format_fsk': 12, 'folder_name': 'Movie 1',
              'overview': 'Test overview', 'format_standort': 'Location 1',
              'countries': 'USA', 'genres': 'Action', 'director': 'Director 1',
              'actors': 'Actor 1, Actor 2', 'formats': 'DVD'}
            ]
        ]

        # Mock the count query to return the total number of movies
        mock_cursor.fetchone.return_value = {'total': 1}

        # Call the filter_movies function with a request context for genre 'Action'
        with app.test_request_context('/filter_movies?genres=Action'):
            response = filter_movies()

        # Extract the actual response and status code
        response_data = response.get_json() if hasattr(response, 'get_json') else response[0]
        status_code = response.status_code if hasattr(response, 'status_code') else response[1]

        # Check the status code
        self.assertEqual(status_code, 200)

        # Check if response is a JSON object and contains expected keys
        self.assertIn('movies', response_data)
        self.assertIn('years', response_data)
        self.assertIn('genres', response_data)
        self.assertIn('countries', response_data)

        # Check if the genres data is correct
        self.assertEqual(response_data['genres'], {'Action': 15})

        # Check the movie data for the first movie in the response
        movie = response_data['movies'][0]
        self.assertEqual(movie['main_title'], 'Movie 1')
        self.assertEqual(movie['imdb_rating'], '7.8')
        self.assertEqual(movie['genres'], 'Action')
        self.assertEqual(movie['countries'], 'USA')

        print("Test case passed successfully with genres:", response_data['genres'])


# Ensure the test script runs correctly
if __name__ == '__main__':
    unittest.main()
