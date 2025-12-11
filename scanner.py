import serial
import time
import mysql.connector
from datetime import datetime
import os
from dotenv import load_dotenv
import threading
import queue

load_dotenv()

# ==============================
# SHARED SCANNER STATE
# Used to communicate between scanner thread and web server
# ==============================

class ScannerState:
    """
    Manages the scanner state and communication between
    the background scanner thread and the web server.
    """
    def __init__(self):
        self.connected = False
        self.last_scan_result = None
        self.last_scan_time = 0
        self.scan_lock = threading.Lock()
        self.arduino = None
        self.running = False
        self.thread = None
        self.port = os.getenv('ARDUINO_PORT', 'COM3')
        self.baud_rate = 115200
        
    def get_last_scan(self):
        """Get the last scan result (if recent)"""
        with self.scan_lock:
            # Return scan result if it's less than 15 seconds old
            if self.last_scan_result and (time.time() - self.last_scan_time) < 15:
                result = self.last_scan_result
                return result
            return None
    
    def clear_last_scan(self):
        """Clear the last scan result after it's been displayed"""
        with self.scan_lock:
            self.last_scan_result = None
    
    def set_scan_result(self, result):
        """Set a new scan result"""
        with self.scan_lock:
            self.last_scan_result = result
            self.last_scan_time = time.time()
            
    def send_door_command(self, room):
        """Send command to Arduino to open door"""
        if not self.arduino or not self.connected:
            return False, "Arduino not connected"
        
        try:
            command = None
            if room == 1 or room == '1':
                command = b'1'
            elif room == 2 or room == '2':
                command = b'2'
            else:
                return False, f"Unknown room: {room}"
            
            self.arduino.write(command)
            self.arduino.flush()
            print(f"[SCANNER] -> Sent door command '{command.decode()}' for Room {room}")
            return True, f"Door {room} unlocked"
            
        except Exception as e:
            print(f"[SCANNER] ✗ Error sending door command: {e}")
            return False, str(e)


# Global scanner state
scanner_state = ScannerState()


def scanner_thread_function():
    """
    Background thread that continuously reads from the barcode scanner.
    This runs alongside the Flask web server.
    """
    global scanner_state
    
    print("[SCANNER] Starting background scanner thread...")
    
    # Database connection for the scanner thread
    db = None
    cursor = None
    
    try:
        # Connect to database
        db = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'reeliz_db')
        )
        cursor = db.cursor(dictionary=True)
        print("[SCANNER] ✓ Database connected")
        
        # Connect to Arduino
        print(f"[SCANNER] Connecting to Arduino on {scanner_state.port}...")
        scanner_state.arduino = serial.Serial(
            scanner_state.port, 
            scanner_state.baud_rate, 
            timeout=1
        )
        time.sleep(2)  # Wait for Arduino to initialize
        scanner_state.connected = True
        scanner_state.running = True
        print(f"[SCANNER] ✓ Arduino connected on {scanner_state.port}")
        print("[SCANNER] Waiting for barcode scans...\n")
        
        # Main scanner loop
        while scanner_state.running:
            try:
                if scanner_state.arduino.in_waiting > 0:
                    raw_data = scanner_state.arduino.readline()
                    data = raw_data.decode('utf-8', errors='ignore')
                    barcode = ''.join(c for c in data if c.isdigit())
                    
                    # Filter out short/invalid barcodes (noise from scanner)
                    # Real barcodes are 12 digits, ignore anything less than 10
                    MIN_BARCODE_LENGTH = 10
                    
                    if barcode and len(barcode) < MIN_BARCODE_LENGTH:
                        print(f"[SCANNER] Ignoring noise: '{barcode}' (too short, {len(barcode)} digits)")
                        continue  # Skip this, wait for real barcode
                    
                    if barcode:
                        print(f"\n[SCANNER] ========== BARCODE SCANNED ==========")
                        print(f"[SCANNER] Barcode: {barcode}")
                        
                        # Lookup in database - fetch ALL fields
                        query = """
                            SELECT id, date, name, room, movie, sits, amount, barcode, Remarks 
                            FROM transaction 
                            WHERE barcode = %s
                        """
                        cursor.execute(query, (barcode,))
                        result = cursor.fetchone()
                        
                        if result:
                            # Print all details to console
                            print(f"[SCANNER] ✓ Ticket Found!")
                            print(f"[SCANNER]   ID: {result['id']}")
                            print(f"[SCANNER]   Name: {result['name']}")
                            print(f"[SCANNER]   Movie: {result['movie']}")
                            print(f"[SCANNER]   Room: {result['room']}")
                            print(f"[SCANNER]   Seats: {result['sits']}")
                            print(f"[SCANNER]   Date: {result['date']}")
                            print(f"[SCANNER]   Amount: {result['amount']}")
                            print(f"[SCANNER]   Status: {result['Remarks']}")
                            
                            # Validate the ticket
                            validation = validate_ticket_for_entry(result)
                            
                            if validation['valid']:
                                seat_count = validation['seat_count']
                                current_scans = validation['current_scans']
                                scans_remaining = validation['scans_remaining']
                                
                                print(f"[SCANNER] ✓ Ticket VALID - Opening door {result['room']}")
                                print(f"[SCANNER]   This is scan {current_scans + 1} of {seat_count}")
                                
                                # Send door command
                                door_success, door_msg = scanner_state.send_door_command(result['room'])
                                
                                # Update scan count in database
                                scan_update = update_scan_count(cursor, db, barcode, seat_count, current_scans)
                                print(f"[SCANNER] ✓ {scan_update['message']}")
                                print(f"[SCANNER]   New status: {scan_update['new_remarks']}")
                                
                                # Build success message for web display
                                if scan_update['all_scanned']:
                                    web_message = f"All {seat_count} ticket(s) scanned!"
                                else:
                                    web_message = f"Ticket {scan_update['new_scan_count']} of {seat_count} : {scan_update['scans_remaining']} remaining"
                                
                                # Store result for web display
                                scanner_state.set_scan_result({
                                    'status': 'success',
                                    'ticket': {
                                        'id': result['id'],
                                        'name': result['name'],
                                        'movie': result['movie'],
                                        'room': result['room'],
                                        'sits': result['sits'],
                                        'date': result['date'],
                                        'amount': result['amount'],
                                        'barcode': barcode
                                    },
                                    'door_unlocked': door_success,
                                    'message': 'Access Granted!',
                                    'scan_info': {
                                        'current_scan': scan_update['new_scan_count'],
                                        'total_tickets': seat_count,
                                        'scans_remaining': scan_update['scans_remaining'],
                                        'all_scanned': scan_update['all_scanned'],
                                        'scan_message': web_message
                                    }
                                })
                            else:
                                print(f"[SCANNER] ✗ Ticket INVALID: {validation['reason']}")
                                
                                # Store error for web display
                                scanner_state.set_scan_result({
                                    'status': 'error',
                                    'error_type': validation['error_type'],
                                    'message': validation['reason'],
                                    'ticket_date': validation.get('ticket_date'),
                                    'today': validation.get('today'),
                                    'showtime': validation.get('showtime'),
                                    'remarks': result.get('Remarks')
                                })
                        else:
                            print(f"[SCANNER] ✗ Barcode NOT FOUND in database")
                            scanner_state.set_scan_result({
                                'status': 'error',
                                'error_type': 'not_found',
                                'message': 'Ticket not found in our system'
                            })
                        
                        print(f"[SCANNER] =====================================\n")
                
                time.sleep(0.1)
                
            except mysql.connector.Error as e:
                print(f"[SCANNER] Database error: {e}")
                # Try to reconnect
                try:
                    db.reconnect()
                    cursor = db.cursor(dictionary=True)
                except:
                    pass
                    
    except serial.SerialException as e:
        print(f"[SCANNER] ✗ Arduino connection failed: {e}")
        scanner_state.connected = False
    except Exception as e:
        print(f"[SCANNER] ✗ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        scanner_state.running = False
        scanner_state.connected = False
        if scanner_state.arduino:
            try:
                scanner_state.arduino.close()
            except:
                pass
        if cursor:
            cursor.close()
        if db:
            db.close()
        print("[SCANNER] Scanner thread stopped")


def validate_ticket_for_entry(ticket):
    """
    Validate if a ticket is valid for entry
    Returns dict with 'valid' boolean and 'reason' if invalid
    """
    remarks = ticket.get('Remarks', '')
    ticket_date = ticket.get('date', '')
    sits = ticket.get('sits', '')
    
    # Count number of seats (tickets)
    seat_count = len([s.strip() for s in sits.split(',') if s.strip()]) if sits else 1
    
    # Check if already fully scanned
    if remarks == 'Scanned':
        return {
            'valid': False,
            'error_type': 'already_scanned',
            'reason': 'All tickets for this barcode have already been used'
        }
    
    # Check scan count from remarks (format: "Active" or "Scanned:X" where X is scan count)
    current_scans = 0
    if remarks.startswith('Scanned:'):
        try:
            current_scans = int(remarks.split(':')[1])
        except:
            current_scans = 0
    
    # Check if there are scans remaining
    scans_remaining = seat_count - current_scans
    if scans_remaining <= 0:
        return {
            'valid': False,
            'error_type': 'already_scanned',
            'reason': 'All tickets for this barcode have already been used'
        }
    
    # DATE/TIME FILTERING DISABLED FOR TESTING
    # TODO: Re-enable date validation after door testing is complete
    # Currently allowing all tickets to test door functionality
    
    print(f"[SCANNER] Date filtering DISABLED - ticket date: {ticket_date}")
    print(f"[SCANNER] Seats: {seat_count}, Scanned: {current_scans}, Remaining: {scans_remaining}")
    
    return {
        'valid': True,
        'seat_count': seat_count,
        'current_scans': current_scans,
        'scans_remaining': scans_remaining
    }


def update_scan_count(cursor, db, barcode, seat_count, current_scans):
    """
    Update the scan count for a barcode.
    If all seats are scanned, mark as 'Scanned'.
    Otherwise, mark as 'Scanned:X' where X is the new scan count.
    """
    new_scan_count = current_scans + 1
    scans_remaining = seat_count - new_scan_count
    
    if scans_remaining <= 0:
        # All tickets used - mark as fully scanned
        new_remarks = 'Scanned'
        message = f'All {seat_count} ticket(s) have been scanned for this barcode'
        all_scanned = True
    else:
        # Still has remaining scans
        new_remarks = f'Scanned:{new_scan_count}'
        message = f'Ticket {new_scan_count} of {seat_count} scanned. {scans_remaining} remaining.'
        all_scanned = False
    
    update_query = "UPDATE transaction SET Remarks = %s WHERE barcode = %s"
    cursor.execute(update_query, (new_remarks, barcode))
    db.commit()
    
    return {
        'new_scan_count': new_scan_count,
        'scans_remaining': scans_remaining,
        'message': message,
        'all_scanned': all_scanned,
        'new_remarks': new_remarks
    }


def start_scanner_thread():
    """Start the background scanner thread"""
    global scanner_state
    
    if scanner_state.thread and scanner_state.thread.is_alive():
        print("[SCANNER] Scanner thread already running")
        return
    
    scanner_state.thread = threading.Thread(target=scanner_thread_function, daemon=True)
    scanner_state.thread.start()
    print("[SCANNER] Background scanner thread started")


def stop_scanner_thread():
    """Stop the background scanner thread"""
    global scanner_state
    scanner_state.running = False
    if scanner_state.thread:
        scanner_state.thread.join(timeout=2)


# ==============================
# WEB API FUNCTIONS
# These functions are used by the Flask app
# ==============================

def get_db_connection():
    """Create and return a database connection for web API"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'reeliz_db')
        )
        return connection
    except mysql.connector.Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None


def get_scanner_status():
    """Get the current status of the scanner"""
    global scanner_state
    
    return {
        'connected': scanner_state.connected,
        'ready': scanner_state.connected,
        'message': 'Ready' if scanner_state.connected else 'Scanner not connected',
        'cooldown': 0
    }


def get_last_scan_result():
    """Get the last scan result for web display"""
    global scanner_state
    return scanner_state.get_last_scan()


def clear_scan_result():
    """Clear the last scan result"""
    global scanner_state
    scanner_state.clear_last_scan()


def validate_barcode(barcode):
    """
    Validate a barcode and return ticket information
    (For manual/keyboard input on web - not used in new flow)
    """
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return {
                'status': 'error',
                'message': 'Database connection failed',
                'error_type': 'server_error'
            }
        
        cursor = connection.cursor(dictionary=True)
        
        query = """
            SELECT id, date, name, room, movie, sits, amount, barcode, Remarks 
            FROM transaction 
            WHERE barcode = %s
        """
        cursor.execute(query, (barcode,))
        result = cursor.fetchone()
        
        if not result:
            return {
                'status': 'error',
                'message': 'Ticket not found in our system',
                'error_type': 'not_found'
            }
        
        validation = validate_ticket_for_entry(result)
        
        if not validation['valid']:
            return {
                'status': 'error',
                'message': validation['reason'],
                'error_type': validation['error_type'],
                **{k: v for k, v in validation.items() if k not in ['valid', 'reason', 'error_type']}
            }
        
        return {
            'status': 'success',
            'id': result['id'],
            'name': result['name'],
            'date': result['date'],
            'room': result['room'],
            'movie': result['movie'],
            'sits': result['sits'],
            'amount': result['amount'],
            'barcode': barcode
        }
        
    except mysql.connector.Error as e:
        print(f"Database error in validate_barcode: {e}")
        return {
            'status': 'error',
            'message': 'Database error occurred',
            'error_type': 'server_error'
        }
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


def mark_ticket_as_scanned(barcode):
    """Update ticket remarks to 'Scanned'"""
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return False, "Database connection failed"
        
        cursor = connection.cursor()
        
        update_query = "UPDATE transaction SET Remarks = 'Scanned' WHERE barcode = %s"
        cursor.execute(update_query, (barcode,))
        connection.commit()
        
        if cursor.rowcount > 0:
            return True, "Ticket marked as scanned"
        else:
            return False, "Ticket not found"
        
    except mysql.connector.Error as e:
        if connection:
            connection.rollback()
        return False, f"Database error: {str(e)}"
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


def trigger_door_unlock(room):
    """Send command to Arduino to unlock the door"""
    global scanner_state
    return scanner_state.send_door_command(room)


# ==============================
# CONSOLE-BASED SCANNER (Standalone)
# ==============================

if __name__ == "__main__":
    print("=" * 50)
    print("  ReeLiz Barcode Scanner - Standalone Mode")
    print("=" * 50)
    
    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="reeliz_db"
    )
    cursor = db.cursor(dictionary=True)

    PORT = "COM3"
    BAUD_RATE = 115200

    try:
        arduino = serial.Serial(PORT, BAUD_RATE, timeout=1)
        print(f"✓ Connected to Arduino on {PORT}")
        time.sleep(2)
    except Exception as e:
        print(f"✗ Error connecting to Arduino: {e}")
        exit()

    print("Waiting for barcode scans...\n")

    try:
        while True:
            if arduino.in_waiting > 0:
                raw_data = arduino.readline()
                data = raw_data.decode('utf-8', errors='ignore')
                barcode = ''.join(c for c in data if c.isdigit())

                if barcode:
                    print(f"\n========== BARCODE: {barcode} ==========")

                    query = """
                        SELECT id, date, name, room, movie, sits, amount, barcode, Remarks 
                        FROM transaction 
                        WHERE barcode = %s
                    """
                    cursor.execute(query, (barcode,))
                    result = cursor.fetchone()

                    if result:
                        print(f"  Name: {result['name']}")
                        print(f"  Movie: {result['movie']}")
                        print(f"  Room: {result['room']}")
                        print(f"  Seats: {result['sits']}")
                        print(f"  Date: {result['date']}")
                        print(f"  Status: {result['Remarks']}")

                        if result['Remarks'] != "Active":
                            print("  ✗ Ticket already used!")
                        else:
                            room = result['room']
                            if room == 1:
                                arduino.write(b'1')
                                print("  ✓ Door 1 opened!")
                            elif room == 2:
                                arduino.write(b'2')
                                print("  ✓ Door 2 opened!")
                    else:
                        print("  ✗ Barcode not found!")
                    
                    print("=" * 40 + "\n")

            time.sleep(0.1)

    except KeyboardInterrupt:
        print("\nStopped by user.")

    finally:
        arduino.close()
        cursor.close()
        db.close()
        print("Connections closed.")