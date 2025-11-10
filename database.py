import mysql.connector
from mysql.connector import Error
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'reeliz_db')
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def get_next_transaction_id():
    """
    Get the next transaction ID that will be used
    Returns: tuple (success: bool, next_id: int or None, barcode: str or None)
    """
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return False, None, None
        
        cursor = connection.cursor()
        
        # Get the latest ID from the transaction table
        cursor.execute("SELECT COALESCE(MAX(id), 0) FROM transaction")
        result = cursor.fetchone()
        latest_id = result[0] if result else 0
        next_id = latest_id + 1
        
        print(f"Latest ID in database: {latest_id}, Next ID will be: {next_id}")
        
        return True, next_id, None
        
    except Error as e:
        print(f"Database error in get_next_transaction_id: {e}")
        import traceback
        traceback.print_exc()
        return False, None, None
        
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

def insert_transaction_with_barcode(transaction_id, date, name, room, movie, sits, amount, barcode):
    """
    Insert a complete transaction with barcode when user clicks "Done"
    The ID in the barcode determines the transaction ID
    Returns: tuple (success: bool, message: str)
    """
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return False, "Failed to connect to database"
        
        cursor = connection.cursor()
        
        print(f"=== INSERTING TRANSACTION ===")
        print(f"ID: {transaction_id}, Date: {date}, Name: {name}, Room: {room}")
        print(f"Movie: {movie}, Sits: {sits}, Amount: {amount}, Barcode: {barcode}")
        
        # Ensure all values are strings for database insertion
        date_str = str(date)
        name_str = str(name)
        room_str = str(room)
        movie_str = str(movie)
        sits_str = str(sits)
        amount_str = str(amount)
        barcode_str = str(barcode)
        
        # Insert the complete transaction with explicit ID and barcode
        insert_query = """
        INSERT INTO transaction (id, date, name, room, movie, sits, amount, barcode)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(insert_query, (transaction_id, date_str, name_str, room_str, movie_str, sits_str, amount_str, barcode_str))
        connection.commit()
        
        print(f"✓ Transaction inserted successfully with ID: {transaction_id}")
        
        # Verify insertion
        cursor.execute("SELECT id, date, name, room, movie, sits, amount, barcode FROM transaction WHERE id = %s", (transaction_id,))
        result = cursor.fetchone()
        if result:
            print(f"✓ Verified complete transaction:")
            print(f"  ID={result[0]}, Date={result[1]}, Name={result[2]}, Room={result[3]}")
            print(f"  Movie={result[4]}, Sits={result[5]}, Amount={result[6]}, Barcode={result[7]}")
            return True, "Transaction saved successfully"
        else:
            print(f"✗ Warning: Could not verify transaction ID {transaction_id}")
            return False, "Transaction not found after insert"
        
    except Error as e:
        if connection:
            connection.rollback()
        print(f"Database error in insert_transaction_with_barcode: {e}")
        import traceback
        traceback.print_exc()
        return False, f"Database error: {str(e)}"
        
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

def get_occupied_seats(movie_title, cinema_room):
    """
    Get all occupied seats for a specific movie and cinema room (without date filtering)
    Returns: list of seat codes (e.g., ['A1', 'A2', 'B3'])
    """
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return []
        
        cursor = connection.cursor()
        
        # Query to get all seats for matching movie and room (no date filter)
        query = """
        SELECT sits FROM transaction 
        WHERE movie = %s AND room = %s
        """
        
        cursor.execute(query, (movie_title, cinema_room))
        results = cursor.fetchall()
        
        # Collect all seats from all transactions
        occupied_seats = []
        for row in results:
            sits_str = row[0]  # Format: "A1, A2, B3" or "A3, A4, A6"
            if sits_str:
                # Split by comma and strip whitespace
                seats = [seat.strip() for seat in sits_str.split(',')]
                occupied_seats.extend(seats)
        
        print(f"Occupied seats for '{movie_title}' in Cinema {cinema_room}: {occupied_seats}")
        return occupied_seats
        
    except Error as e:
        print(f"Database error in get_occupied_seats: {e}")
        return []
        
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

def format_datetime_for_db():
    """
    Format current datetime as MM/DD:HH
    Example: 11/10:14 for November 10th at 2 PM
    """
    now = datetime.now()
    return now.strftime("%m/%d:%H")
