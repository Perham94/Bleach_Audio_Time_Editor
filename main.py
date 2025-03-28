import struct
import tkinter as tk
from tkinter import filedialog
import math
import os

def read_bnk_file(filename):
    with open(filename, 'rb') as file:
        return file.read()

def save_bnk_file(filename, data):
    modified_filename = os.path.splitext(filename)[0] + "_modified.bnk"
    with open(modified_filename, 'wb') as file:
        file.write(data)
    print(f"\nModified file saved as: {modified_filename}")

def find_last_int32_address(data, value):
    addresses = []
    int_value = struct.pack('<i', value)  # Little-endian int32
    index = 0
    while index < len(data) - 4:
        if data[index:index+4] == int_value:
            addresses.append(index)
        index += 1
    if addresses:
        last_index = addresses[-1]  # Get the last occurrence
        return last_index
    return None

def find_next_non_zero_double(data, start_index):
    index = start_index + 4
    while index < len(data) - 8:
        try:
            candidate_value = struct.unpack('<d', data[index:index+8])[0]
            if not math.isclose(candidate_value, 0.0, abs_tol=1e-9):
                return index, candidate_value
        except struct.error:
            pass
        index += 1
    return None, None

def find_all_double_offsets(data, value):
    offsets = []
    index = 0
    while index < len(data) - 8:
        try:
            candidate_value = struct.unpack('<d', data[index:index+8])[0]
            if math.isclose(candidate_value, value, rel_tol=1e-9):
                offsets.append(index)
        except struct.error:
            pass
        index += 1
    return offsets

def replace_double_values(data, offsets, new_value):
    new_value_bytes = struct.pack('<d', new_value)
    data = bytearray(data)
    for offset in offsets:
        data[offset:offset+8] = new_value_bytes
    return bytes(data)

def main():
    root = tk.Tk()
    root.withdraw()

    filename = filedialog.askopenfilename(title="Select .bnk file", filetypes=[("BNK files", "*.bnk")])
    if not filename:
        print("No file selected.")
        return

    try:
        int_value = int(input("Enter the song id as a example 645147669 : "))
    except ValueError:
        print("Invalid int32 value.")
        return

    data = read_bnk_file(filename)

    # Step 1: Find the last int32 offset
    last_offset = find_last_int32_address(data, int_value)

    if last_offset is not None:
        next_addr, next_double = find_next_non_zero_double(data, last_offset)

        if next_addr is not None:
            print(f"\nLast offset with the int32 value {int_value}:")
            print(f"Offset: {hex(last_offset)}, Value: {int_value}")
            print(f"Next non-zero double after last offset: {next_double} at {hex(next_addr)}")

            # Step 3: Find all double offsets to replace
            double_offsets = find_all_double_offsets(data, next_double)

            if double_offsets:
                print(f"\nFound {len(double_offsets)} instances of the double value {next_double}.")
                try:
                    new_double_value = float(input(f"Enter the new time in millisecounds {next_double}: "))
                except ValueError:
                    print("Invalid double value.")
                    return

                # Replace all double values
                modified_data = replace_double_values(data, double_offsets, new_double_value)

                print(f"\nReplaced {len(double_offsets)} instances of the double value {next_double} with {new_double_value}:")
                for offset in double_offsets:
                    print(f"Replaced at Offset: {hex(offset)}")

                # Save the modified file
                save_bnk_file(filename, modified_data)
            else:
                print(f"No instances of the double value {next_double} found in the file.")
        else:
            print(f"\nNo non-zero double value found after the last int32 offset {hex(last_offset)}.")
    else:
        print(f"No instances of the int32 value {int_value} found in the file.")

if __name__ == "__main__":
    main()
