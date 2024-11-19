# db_setup.py

import mysql.connector
from mysql.connector import Error
import os

# Database configuration using environment variables
db_config = {
    'host': 'localhost',
    'user': os.environ.get('DB_USER', 'your_default_user'),
    'password': os.environ.get('DB_PASSWORD', 'your_default_password'),
    'database': os.environ.get('DB_NAME', 'your_default_database')
}

def connect_to_db():
    try:
        connection = mysql.connector.connect(**db_config)
        return connection
    except Error as err:
        print(f"Error: {err}")
        return None

def drop_and_create_tables(cursor):
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")  # Disable foreign key checks

    # Retrieve all table names from the database
    cursor.execute("SHOW TABLES;")
    tables = cursor.fetchall()
    for table in tables:
        table_name = table[0]
        cursor.execute(f"DROP TABLE IF EXISTS `{table_name}`;")
        print(f"Dropped table {table_name}")

    # Now recreate the tables
    # Create movies table with format_filmId as the primary key
    cursor.execute("""
        CREATE TABLE movies (
            format_filmId INT PRIMARY KEY,
            title VARCHAR(255),
            imdb_id VARCHAR(50),
            original_title VARCHAR(255),
            release_date YEAR,
            runtime INT,
            aspect_ratio TEXT,
            color_info TEXT,
            sound_mix TEXT,
            overview TEXT,
            poster_images INT,
            person_images INT,
            backdrop_images INT,
            wiki_critics TEXT,
            wiki_awards TEXT,
            wiki_background TEXT,
            wiki_url TEXT,
            format_titel VARCHAR(255),
            format_orig_titel VARCHAR(255),
            format_fsk INT,
            standort VARCHAR(255),
            format_vhs INT,
            format_dvd INT,
            format_blu INT,
            format_blu3 INT,
            format_minmedium INT,
            format_ausleihen DECIMAL(14, 6),
            format_alpha VARCHAR(255),
            format_aufindex INT,
            folder_name VARCHAR(255)
        ) ENGINE=InnoDB;
    """)

    # Create related tables referencing format_filmId
    cursor.execute("""
        CREATE TABLE genres (
            id INT AUTO_INCREMENT PRIMARY KEY,
            movie_id INT NOT NULL,
            genre VARCHAR(100),
            FOREIGN KEY (movie_id) REFERENCES movies(format_filmId) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    """)

    cursor.execute("""
        CREATE TABLE production_companies (
            id INT AUTO_INCREMENT PRIMARY KEY,
            movie_id INT NOT NULL,
            company_name VARCHAR(255),
            FOREIGN KEY (movie_id) REFERENCES movies(format_filmId) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    """)

    cursor.execute("""
        CREATE TABLE countries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            movie_id INT NOT NULL,
            country VARCHAR(100),
            FOREIGN KEY (movie_id) REFERENCES movies(format_filmId) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    """)

    cursor.execute("""
        CREATE TABLE spoken_languages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            movie_id INT NOT NULL,
            language VARCHAR(100),
            FOREIGN KEY (movie_id) REFERENCES movies(format_filmId) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    """)

    cursor.execute("""
        CREATE TABLE cast (
            id INT AUTO_INCREMENT PRIMARY KEY,
            movie_id INT NOT NULL,
            name VARCHAR(255),
            role TEXT,
            popularity DECIMAL(7, 3),
            tmdb_id VARCHAR(50),
            FOREIGN KEY (movie_id) REFERENCES movies(format_filmId) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    """)

    cursor.execute("""
        CREATE TABLE crew (
            id INT AUTO_INCREMENT PRIMARY KEY,
            movie_id INT NOT NULL,
            name VARCHAR(255),
            job VARCHAR(255),
            tmdb_id VARCHAR(50),
            FOREIGN KEY (movie_id) REFERENCES movies(format_filmId) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    """)

    cursor.execute("""
        CREATE TABLE certificates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            movie_id INT NOT NULL,
            country VARCHAR(100),
            rating VARCHAR(20),
            additional_info TEXT,
            FOREIGN KEY (movie_id) REFERENCES movies(format_filmId) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    """)

    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")  # Enable foreign key checks

if __name__ == "__main__":
    connection = connect_to_db()
    if connection:
        cursor = connection.cursor()
        try:
            drop_and_create_tables(cursor)
            connection.commit()
            print("Database setup completed.")
        except Error as e:
            print(f"Error during database setup: {e}")
        finally:
            cursor.close()
            connection.close()
    else:
        print("Failed to connect to the database.")
