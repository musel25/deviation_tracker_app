# deviation_backend/deviations/excel_data_manager.py (CLEANED VERSION - NO DEBUG PRINTS)

import pandas as pd
import os
from datetime import datetime
from django.db import transaction
from .models import Deviation, Action # Import your Django models

# Define the absolute path to your Excel file directly.
# IMPORTANT: REPLACE THIS WITH THE EXACT ABSOLUTE PATH TO YOUR Deviation_Matrix.xlsx file.
# Example: EXCEL_FILE_PATH = r"C:\Users\ersosa\Documents\Dev_tracker_app\Deviation_Matrix.xlsx"
EXCEL_FILE_PATH = r"C:\Users\ersosa\Documents\deviation_tracker_app\Deviation_Matrix.xlsx" # <--- YOUR HARDCODED PATH HERE! CONFIRM IT!

def import_deviations_from_excel_to_db():
    """
    Reads deviation data from the Excel file and imports/updates it into the Django database.
    This version handles deviations that span multiple rows for their actions,
    and correctly filters out truly blank action rows.
    """
    if not os.path.exists(EXCEL_FILE_PATH):
        print(f"Error: Excel file not found at: {EXCEL_FILE_PATH}")
        return

    try:
        df = pd.read_excel(EXCEL_FILE_PATH)
        df.columns = df.columns.str.strip() # Clean column names (remove leading/trailing spaces)

        # --- CRITICAL: Adjust this column mapping ---
        # Map your EXACT Excel column headers (keys) to your Django Model field names (values)
        # Ensure these match the columns in your deviation_matrix.xlsx
        column_mapping = {
            'Primary Column': 'primary_column',
            'Year': 'year',
            'DEV NUMBER': 'dev_number', # Match your Excel header exactly!
            'Created By': 'created_by',
            'Owner Plant': 'owner_plant',
            'Affected Plant': 'affected_plant',
            'SBU': 'sbu',
            'Release Date': 'release_date',
            'Effectivity Date': 'effectivity_date',
            'Expiration Date': 'expiration_date',
            'Drawing Number': 'drawing_number',
            'Back to Back Deviation': 'back_to_back_deviation',
            'Defect Category': 'defect_category',
            'Assembly Defect Type': 'assembly_defect_type',
            'Molding Defect Type': 'molding_defect_type',
            'Actions': 'action_description_excel',
            'Action Responsible': 'action_responsible_excel', # CONFIRMED: This is the correct column name for Action Responsible
            'Action Expiration Date': 'action_expiration_date_excel',
        }

        # Filter model fields to update only those present in your Deviation model
        model_deviation_fields = [f.name for f in Deviation._meta.get_fields() if f.name != 'id']

        # Rename columns in DataFrame to match our mapping, if they exist
        df = df.rename(columns=column_mapping)

        # Apply forward fill (ffill) to propagate values downwards for logical deviation records
        deviation_detail_cols = [col for col in model_deviation_fields if col in df.columns]
        df[deviation_detail_cols] = df[deviation_detail_cols].ffill()

        df.dropna(subset=['dev_number'], inplace=True) # Drop rows where 'dev_number' is still empty


        with transaction.atomic(): # Use a database transaction for atomic import
            imported_deviations_count = 0
            updated_deviations_count = 0
            imported_actions_count = 0

            grouped_deviations = df.groupby('dev_number')

            for dev_number, dev_rows in grouped_deviations:
                first_row = dev_rows.iloc[0] # Get the first row for main deviation details

                deviation_data_for_db = {}
                for model_field_name in model_deviation_fields:
                    if model_field_name in first_row and pd.notna(first_row.get(model_field_name)):
                        value = first_row[model_field_name]
                        if 'date' in model_field_name:
                            # MODIFIED DATE HANDLING FOR DEVIATION FIELDS
                            if isinstance(value, (datetime, pd.Timestamp)):
                                parsed_date = value
                            else:
                                parsed_date = pd.to_datetime(value, errors='coerce') # 'coerce' invalid dates to NaT

                            if pd.isna(parsed_date): # Check if parsing failed
                                deviation_data_for_db[model_field_name] = None
                            else:
                                deviation_data_for_db[model_field_name] = parsed_date.date() # Convert to date object
                        elif model_field_name == 'back_to_back_deviation':
                            deviation_data_for_db[model_field_name] = str(value).strip().lower() == 'true'
                        else:
                            deviation_data_for_db[model_field_name] = value

                deviation, created = Deviation.objects.update_or_create(
                    dev_number=dev_number,
                    defaults=deviation_data_for_db
                )
                if created:
                    imported_deviations_count += 1
                else:
                    updated_deviations_count += 1

                # Clear existing actions for this deviation before importing new ones
                Action.objects.filter(deviation=deviation).delete()

                # Iterate through ALL rows for this deviation to find actions
                for _, action_row in dev_rows.iterrows():
                    # Get raw values from pandas. These might be NaN/NaT for empty cells.
                    raw_action_description = action_row.get('action_description_excel')
                    raw_action_responsible = action_row.get('action_responsible_excel')
                    raw_action_expiration_date = action_row.get('action_expiration_date_excel')

                    # Convert raw values to strings for a consistent check
                    action_description_str = str(raw_action_description).strip()
                    action_responsible_str = str(raw_action_responsible).strip()
                    action_expiration_date_str = str(raw_action_expiration_date).strip()

                    # --- CRITICAL MODIFIED CONDITION: Only create action if fields are truly populated ---
                    # Check if description and responsible are NOT pandas NaN and NOT the string 'nan' (from empty cells)
                    has_valid_description = pd.notna(raw_action_description) and action_description_str != 'nan' and action_description_str != ''
                    has_valid_responsible = pd.notna(raw_action_responsible) and action_responsible_str != 'nan' and action_responsible_str != ''

                    if has_valid_description and has_valid_responsible:
                        action_expiration_date_obj = None
                        try:
                            if pd.notna(raw_action_expiration_date): # Only try to parse if not already NaN
                                if isinstance(raw_action_expiration_date, (datetime, pd.Timestamp)):
                                    parsed_date = raw_action_expiration_date
                                else:
                                    parsed_date = pd.to_datetime(action_expiration_date_str, errors='coerce') # 'coerce' invalid dates to NaT

                                if pd.isna(parsed_date): # Check if parsing failed (it's NaT)
                                    action_expiration_date_obj = None
                                else:
                                    action_expiration_date_obj = parsed_date.date() # Convert to date object
                            else: # raw_action_expiration_date was already NaN or blank
                                action_expiration_date_obj = None

                        except Exception as date_err:
                            action_expiration_date_obj = None

                        # Create the Action record in the database
                        Action.objects.create(
                            deviation=deviation,
                            action_description=action_description_str,
                            action_responsible=action_responsible_str,
                            action_expiration_date=action_expiration_date_obj,
                            reminder_sent=False
                        )
                        imported_actions_count += 1
                    # else: (Removed debugging else block)

            print(f"\n--- Excel Import Summary ---")
            print(f"Deviations: Imported {imported_deviations_count} new, updated {updated_deviations_count} existing.")
            print(f"Actions: Imported {imported_actions_count} new (existing actions were replaced for deviations).")
            print("Please verify data in your database via the Django Admin or API after restarting the server.")

    except pd.errors.EmptyDataError:
        print(f"Error: Excel file '{EXCEL_FILE_PATH}' is empty or has no data rows.")
    except FileNotFoundError:
        print(f"Error: Excel file not found at: {EXCEL_FILE_PATH}")
    except Exception as e:
        print(f"!!! AN UNEXPECTED ERROR OCCURRED DURING EXCEL IMPORT !!!")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Details: {e}")
        print("\nCommon issues: Incorrect Excel column names in 'column_mapping', or unexpected data formats.")
        print("Please double-check your Excel headers (spelling, spacing, capitalization) against the 'column_mapping' keys.")