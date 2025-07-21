#!/usr/bin/env python3
"""
CSV Condenser Script
Removes redundant T2-T5 components from WorkingCopy.csv, keeping only T1 versions.

The T2-T5 versions are predictable since they only add the previous tier as the first ingredient
while keeping all other ingredients the same.
"""

import csv
import os

def condense_csv(input_file, output_file=None):
    """
    Condense the CSV by keeping only T1 components (OutputTier = 1)
    
    Args:
        input_file (str): Path to the input CSV file
        output_file (str): Path to the output CSV file (if None, overwrites input)
    """
    if output_file is None:
        output_file = input_file
    
    # Read the original CSV
    t1_rows = []
    header = None
    total_rows = 0
    t1_count = 0
    
    print(f"Reading {input_file}...")
    
    with open(input_file, 'r', newline='', encoding='utf-8') as infile:
        reader = csv.reader(infile)
        
        # Read header
        header = next(reader)
        t1_rows.append(header)
        
        # Process each row
        for row in reader:
            total_rows += 1
            
            # Check if this is a T1 component (OutputTier column is index 5)
            if len(row) > 5 and row[5] == '1':
                t1_rows.append(row)
                t1_count += 1
            
            # Print progress every 1000 rows
            if total_rows % 1000 == 0:
                print(f"Processed {total_rows} rows, found {t1_count} T1 components...")
    
    print(f"\nOriginal file: {total_rows} rows")
    print(f"T1 components: {t1_count}")
    print(f"Rows removed: {total_rows - t1_count}")
    print(f"Reduction: {((total_rows - t1_count) / total_rows * 100):.1f}%")
    
    # Write the condensed CSV
    print(f"\nWriting condensed CSV to {output_file}...")
    
    with open(output_file, 'w', newline='', encoding='utf-8') as outfile:
        writer = csv.writer(outfile)
        writer.writerows(t1_rows)
    
    print(f"Condensed CSV saved with {len(t1_rows)} rows (including header)")
    
    return t1_count, total_rows

def main():
    """Main function to run the script"""
    input_file = 'WorkingCopy.csv'
    
    # Check if file exists
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found!")
        print("Please run this script from the directory containing WorkingCopy.csv")
        return
    
    # Create backup
    backup_file = 'WorkingCopy_backup.csv'
    print(f"Creating backup: {backup_file}")
    
    with open(input_file, 'r', encoding='utf-8') as src:
        with open(backup_file, 'w', encoding='utf-8') as dst:
            dst.write(src.read())
    
    # Condense the CSV
    try:
        t1_count, total_rows = condense_csv(input_file)
        
        print(f"\n✅ Success! CSV condensed from {total_rows} to {t1_count} components")
        print(f"📁 Backup saved as: {backup_file}")
        print(f"📄 Condensed file: {input_file}")
        
        print(f"\n📊 Summary:")
        print(f"   • Original components: {total_rows}")
        print(f"   • T1 components kept: {t1_count}")
        print(f"   • T2-T5 components removed: {total_rows - t1_count}")
        print(f"   • File size reduction: ~{((total_rows - t1_count) / total_rows * 100):.1f}%")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Restoring from backup...")
        
        # Restore backup if something went wrong
        with open(backup_file, 'r', encoding='utf-8') as src:
            with open(input_file, 'w', encoding='utf-8') as dst:
                dst.write(src.read())
        
        print("Original file restored.")

if __name__ == "__main__":
    main() 