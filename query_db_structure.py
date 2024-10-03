import mysql.connector

# Database credentials
db_user = "tom"
db_passwd = "user"
db_name = "formatdb"

# Function to connect to the database
def connect_to_db():
    try:
        connection = mysql.connector.connect(
            host="localhost",
            user=db_user,
            passwd=db_passwd,
            database=db_name
        )
        if connection.is_connected():
            print("Connected to the database")
            return connection
    except mysql.connector.Error as e:
        print(f"Error: {e}")
        return None

# Function to retrieve all table structures
def get_table_structures(connection):
    cursor = connection.cursor()
    try:
        # Get all tables in the database
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()

        # Loop through each table and describe its structure
        for (table_name,) in tables:
            print(f"\nStructure of table `{table_name}`:")
            cursor.execute(f"DESCRIBE {table_name}")
            structure = cursor.fetchall()

            # Print table structure
            for column in structure:
                print(column)
    except mysql.connector.Error as e:
        print(f"Error: {e}")
    finally:
        cursor.close()

# Main function to connect and retrieve table structures
if __name__ == "__main__":
    connection = connect_to_db()
    if connection:
        get_table_structures(connection)
        connection.close()
