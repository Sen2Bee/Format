import requests
from bs4 import BeautifulSoup
import mysql.connector
from mysql.connector import errorcode
from tqdm import tqdm
import re
import time
import random
import math
from vars import db_user, db_passwd, db_name  # Replace with actual path to your credentials

db_config = {
    'host': 'localhost',
    'user': db_user,  
    'password': db_passwd,
    'database': db_name
}

def connect_to_database():
    """
    Establishes a connection to the MySQL database.
    """
    try:
        cnx = mysql.connector.connect(**db_config)
        cursor = cnx.cursor(dictionary=True)
        print("Successfully connected to the database.")
        return cnx, cursor
    except mysql.connector.Error as err:
        handle_database_error(err)

def handle_database_error(err):
    """
    Handles database connection errors.
    """
    if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        print("Error: Incorrect database username or password.")
    elif err.errno == errorcode.ER_BAD_DB_ERROR:
        print("Error: Database does not exist.")
    else:
        print(f"Database error: {err}")
    exit(1)

def create_ebay_prices_table(cursor, cnx):
    """
    Creates the 'ebay_prices' table if it does not exist.
    """
    create_table_query = """
    CREATE TABLE IF NOT EXISTS ebay_prices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        movie_id INT NOT NULL,
        format ENUM('DVD', 'Blu-ray', 'Blu-ray 3D') NOT NULL,
        bid_price DECIMAL(6,2) NULL,
        sold_price DECIMAL(6,2) NULL,
        scrape_date DATE,
        FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
    """

    try:
        cursor.execute(create_table_query)
        cnx.commit()
        print("Table 'ebay_prices' created successfully or already exists.")
    except mysql.connector.Error as err:
        print(f"Error creating 'ebay_prices' table: {err}")
        exit(1)


def validate_price(price):
    if price is None:
        return None
    elif isinstance(price, (int, float)) and -9999.99 <= price <= 9999.99 and math.isfinite(price):
        return round(price, 2)
    else:
        return None

def extract_price(price_text):
    """
    Extracts a numerical price from a text string.
    """
    try:
        # Handle price ranges like "$5.99 to $9.99"
        if 'to' in price_text.lower():
            price_text = price_text.lower().split('to')[0].strip()
        # Remove currency symbols and commas
        price_text = re.sub(r'[^\d\.]', '', price_text)
        return float(price_text)
    except (ValueError, TypeError):
        return None

def calculate_average_price(prices):
    """
    Calculates the average price from a list of prices, returns None if list is empty.
    """
    if prices:
        avg_price = sum(prices) / len(prices)
        if math.isfinite(avg_price):
            return round(avg_price, 2)
    return None

def convert_to_eur(price, currency):
    """
    Converts a price to EUR if it is in a different currency (e.g., USD).
    Note: Here we assume a fixed conversion rate; in a real scenario, consider using an API.
    """
    conversion_rates = {
        'USD': 0.85  # Example conversion rate
    }
    if currency in conversion_rates:
        return round(price * conversion_rates[currency], 2)
    return price  # Return the original price if no conversion is needed

def scrape_ebay_prices(movie_title, year):
    """
    Scrapes eBay for bid and sold prices for a given movie title across different formats.
    """
    formats = {"DVD": "dvd", "Blu-ray": "blu-ray", "Blu-ray 3D": "blu-ray+3d"}
    sites = ["https://www.ebay.com/sch/i.html?_nkw=", "https://www.ebay.de/sch/i.html?_nkw="]
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    prices_by_format = {}

    for media_format, format_str in formats.items():
        total_bid_prices = []
        total_sold_prices = []

        for site in sites:
            # search_query = f"{movie_title} {year} {format_str}".replace(' ', '+')
            search_query = f"{movie_title} {year} {format_str} used".replace(' ', '+') if "ebay.com" in site else f"{movie_title} {year} {format_str} gebraucht".replace(' ', '+')
            url = f"{site}{search_query}"

            try:
                response = requests.get(url, headers=headers, timeout=10)
                response.raise_for_status()

                soup = BeautifulSoup(response.content, 'lxml')
                listings = soup.find_all('li', {'class': 's-item'})

                bid_prices, sold_prices = [], []

                for item in listings:
                    if item.find('span', {'class': 's-item__ad-badge-text'}):
                        continue
                    price_elem = item.find('span', {'class': 's-item__price'})
                    if price_elem:
                        price_text = price_elem.get_text()
                        currency = 'USD' if '.com' in site else 'EUR'
                        price = extract_price(price_text)
                        if price:
                            price = convert_to_eur(price, currency)
                            if "Best Offer" in item.get_text():
                                sold_prices.append(price)
                            else:
                                bid_prices.append(price)

                total_bid_prices.extend(bid_prices)
                total_sold_prices.extend(sold_prices)
                time.sleep(random.uniform(1, 2))
           

            except requests.exceptions.RequestException as e:
                print(f"Error fetching data for {movie_title} ({media_format}): {e}")
                prices_by_format[media_format] = (None, None)

        avg_bid_price = calculate_average_price(total_bid_prices)
        avg_sold_price = calculate_average_price(total_sold_prices)
        # Validate prices
        avg_bid_price = validate_price(avg_bid_price)
        avg_sold_price = validate_price(avg_sold_price)   
                  
        prices_by_format[media_format] = (avg_bid_price, avg_sold_price)
        print(f"Prices for {movie_title} ({media_format}): Bid - {avg_bid_price}, Sold - {avg_sold_price}")

    return prices_by_format

def fetch_movie_titles(cursor):
    """
    Fetches movie titles and related data from the 'movies' table.
    """
    cursor.execute("SELECT movie_id, title, original_title, release_date FROM movies")
    return cursor.fetchall()

def update_ebay_prices_table(cursor, cnx):
    """
    Updates the 'ebay_prices' table with scraped prices for each movie and format.
    """
    movies = fetch_movie_titles(cursor)

    print("Updating eBay prices...")

    for movie in tqdm(movies, desc="Updating eBay prices"):
        movie_id = movie['movie_id']
        title = movie['title'] or movie['original_title']
        year = movie['release_date']

        if not title or not year:
            print(f"Skipping movie ID {movie_id} due to missing title or year.")
            continue

        prices = scrape_ebay_prices(title, year)

        if prices:
            for format_type, (bid_price, sold_price) in prices.items():
                insert_query = """
                    INSERT INTO ebay_prices (movie_id, format, bid_price, sold_price, scrape_date)
                    VALUES (%s, %s, %s, %s, CURDATE())
                """
                cursor.execute(insert_query, (movie_id, format_type, bid_price, sold_price))
            cnx.commit()

def main():
    # Connect to the database
    cnx, cursor = connect_to_database()

    # Create the 'ebay_prices' table if it does not exist
    create_ebay_prices_table(cursor, cnx)

    # Update eBay prices and insert them into the table
    update_ebay_prices_table(cursor, cnx)

    # Close the connection
    cursor.close()
    cnx.close()
    print("eBay prices successfully updated.")

if __name__ == "__main__":
    main()
