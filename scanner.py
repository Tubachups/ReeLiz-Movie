import serial
import time
import mysql.connector
# ------------------------------
# MYSQL CONFIG
# ------------------------------
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",
    database="reeliz_db"
)

cursor = db.cursor(dictionary=True)

# ------------------------------
# SERIAL CONFIG
# ------------------------------
PORT = "COM5"
BAUD_RATE = 115200

try:
    arduino = serial.Serial(PORT, BAUD_RATE, timeout=1)
    print("Connected to Arduino on", PORT)
    time.sleep(2)
except Exception as e:
    print("Error connecting to Arduino:", e)
    exit()

print("Waiting for barcode scans...\n")

# ------------------------------
# MAIN LOOP
# ------------------------------
try:
    while True:
        if arduino.in_waiting > 0:
            raw_data = arduino.readline()
            # Remove ALL extra characters: carriage return, newline, null bytes, spaces
            data = raw_data.decode('utf-8', errors='ignore')
            # Extract only digits from the data
            barcode = ''.join(c for c in data if c.isdigit())

            if barcode:
                print("Barcode:", barcode)

                # ------------------------------
                # LOOKUP BARCODE IN DATABASE
                # ------------------------------
                query = "SELECT room, barcode, Remarks FROM transaction WHERE barcode = %s"
                cursor.execute(query, (barcode,))
                result = cursor.fetchone()

                if result:
                    room = result["room"]  # <-- INT(11)
                    remarks = result["Remarks"]
                    print("Room Found:", room)
                    print("Remarks:", remarks)

                    # ------------------------------
                    # CHECK IF BARCODE IS ACTIVE
                    # ------------------------------
                    if remarks != "Active":
                        print("Barcode already scanned or not active.")
                    else:
                        # ------------------------------
                        # SEND COMMAND TO ARDUINO
                        # ------------------------------
                        if room == 1:
                            arduino.write(b'1')
                            print("-> Sent command 1 to Arduino (Servo 1)")

                        elif room == 2:
                            arduino.write(b'2')
                            print("-> Sent command 2 to Arduino (Servo 2)")

                        else:
                            print("WARNING: Room number is not 1 or 2:", room)

                        # ------------------------------
                        # UPDATE REMARKS TO SCANNED
                        # ------------------------------
                        update_query = "UPDATE transaction SET Remarks = 'Scanned' WHERE barcode = %s"
                        cursor.execute(update_query, (barcode,))
                        db.commit()
                        print("Remarks updated to 'Scanned'")

                else:
                    print("Barcode not found in database.")

        time.sleep(0.1)

except KeyboardInterrupt:
    print("\nStopped by user.")

finally:
    arduino.close()
    cursor.close()
    db.close()
    print("Serial + Database closed.")