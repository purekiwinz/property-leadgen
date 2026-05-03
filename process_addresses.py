import pandas as pd
import numpy as np

def process_addresses():
    input_file = '/Users/jason/Downloads/lds-nz-addresses-CSV/nz-addresses.csv'
    output_file = '/Users/jason/Downloads/hibiscus_coast_addresses.xlsx'
    
    print(f"Loading data from {input_file}...")
    # Use chunksize if the file is too big for memory, but 750k rows should fit in ~16GB RAM.
    # We'll read specific columns to save memory.
    cols = [
        'full_road_name', 'full_address', 'address_number', 
        'suburb_locality', 'territorial_authority_ascii', 
        'shape_X', 'shape_Y'
    ]
    
    df = pd.read_csv(input_file, low_memory=False)
    
    # Hibiscus Coast bounding box
    # North (Latitude): -36.44953
    # South (Latitude): -36.76953
    # West (Longitude): 174.54862
    # East (Longitude): 174.86862
    lat_min, lat_max = -36.76953, -36.44953
    lon_min, lon_max = 174.54862, 174.86862
    
    print("Filtering by latitude and longitude...")
    df_filtered = df[(df['shape_Y'] >= lat_min) & (df['shape_Y'] <= lat_max) & 
                     (df['shape_X'] >= lon_min) & (df['shape_X'] <= lon_max)].copy()
    
    # Filter for Auckland region just in case
    df_filtered = df_filtered[df_filtered['territorial_authority_ascii'] == 'Auckland']
    
    print(f"Found {len(df_filtered)} addresses in the bounding box.")
    
    if len(df_filtered) == 0:
        print("No addresses found in the specified area. Check the bounding box.")
        return

    # Sorting logic for letterbox delivery:
    # 1. By Road Name (keep them on the same street)
    # 2. By Odd/Even (walk up one side, down the other)
    # 3. By Number (ascending on one side, descending on the other)
    
    print("Sorting addresses for walking route...")
    # Convert address_number to numeric for sorting
    df_filtered['num'] = pd.to_numeric(df_filtered['address_number'], errors='coerce').fillna(0).astype(int)
    
    # Identify odd and even addresses
    df_filtered['is_even'] = df_filtered['num'] % 2 == 0
    
    # Sort Odd ascending (up the street), Even descending (down the street)
    # We use a sort key where odd numbers stay as is, and even numbers are inverted
    df_filtered['sort_num'] = np.where(df_filtered['is_even'], -df_filtered['num'], df_filtered['num'])
    
    # Sort: Road -> Even/Odd -> Adjusted Number
    # Note: We sort by is_even as well so all odds are together and all evens are together
    df_filtered = df_filtered.sort_values(by=['full_road_name', 'is_even', 'sort_num'])
    
    # Add Delivery Order column
    df_filtered.insert(0, 'delivery_order', range(1, len(df_filtered) + 1))
    
    # Drop temporary columns
    df_filtered = df_filtered.drop(columns=['num', 'is_even', 'sort_num'])
    
    print(f"Saving results to {output_file}...")
    # Excel has a limit of ~1M rows, we have ~750k total, so filtered should be much less.
    df_filtered.to_excel(output_file, index=False)
    print(f"Done! File saved to {output_file}")

if __name__ == '__main__':
    process_addresses()
