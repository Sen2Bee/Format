import mysql.connector

db_config = {
    'host': 'localhost',
    'user': 'tom',          # Replace with your database username
    'password': 'user',     # Replace with your database password
    'database': 'formatdb'  # Replace with your database name
}

def rename_column():
    try:
        # Establish the database connection
        connection = mysql.connector.connect(**db_config)

        cursor = connection.cursor()

        # SQL command to rename the column
        alter_table_query = """
        ALTER TABLE movies CHANGE format_filmId movie_id INT;
        """

        # Execute the command
        cursor.execute(alter_table_query)
        connection.commit()  # Commit the changes

        print("Column name changed successfully from 'format_filmId' to 'movie_id'.")

    except mysql.connector.Error as error:
        print(f"Error: {error}")

    finally:
        # Close the cursor and connection
        if connection.is_connected():
            cursor.close()
            connection.close()
            print("MySQL connection is closed.")

# Run the script
if __name__ == "__main__":
    rename_column()
