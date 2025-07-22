# deviation_tracker_app/deviations/management/commands/import_users.py (UPDATED - RBXXXX Passwords & Robust Usernames)

import pandas as pd
import random
import os
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from django.db import transaction
from pathlib import Path # Keep this import

class Command(BaseCommand):
    help = 'Imports users from a specified CSV/Excel file and creates random RBXXXX passwords for them.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='master_user_list.csv', # <--- UPDATED DEFAULT FILE NAME
            help='Path to the CSV/Excel file containing user data (relative to project root).',
        )

    def _generate_random_password(self):
        """Generates a password in the format RBXXXX (X are numbers)."""
        return f"RB{random.randint(1000, 9999)}"

    def _generate_unique_username(self, base_email, full_name, index):
        """Generates a unique username from email, then full name, then generic.
        Ensures username is unique and fits Django's max_length (150 chars)."""
        
        username_candidate = ''
        if base_email:
            # Try email prefix first, remove non-alphanumeric chars
            username_candidate = ''.join(filter(str.isalnum, base_email.split('@')[0])).lower()
            if not username_candidate: # If email prefix was empty after cleaning
                username_candidate = '' # Reset to empty string

        if not username_candidate and full_name:
            # Fallback to full name if email prefix failed
            # Take first char of first name + last name (cleaned)
            parts = full_name.split(' ', 1)
            first_initial = parts[0][0] if parts[0] else ''
            last_name_clean = ''.join(filter(str.isalnum, parts[1] if len(parts) > 1 else '')).lower()
            username_candidate = f"{first_initial}{last_name_clean}"

            if not username_candidate: # If full name was empty after cleaning
                username_candidate = '' # Reset to empty string

        if not username_candidate:
            # Final fallback: generic username
            username_candidate = f"user_{index}"

        # Ensure it starts with a letter if possible, or prefix with 'user'
        if username_candidate and not username_candidate[0].isalpha():
            username_candidate = 'user' + username_candidate
        elif not username_candidate: # If it's still empty, make it generic
            username_candidate = f"user_{index}"

        # Ensure it's not too long before adding counter
        original_username_base = username_candidate[:140] # Keep base short for counter
        counter = 0
        username = original_username_base
        while User.objects.filter(username=username).exists():
            counter += 1
            username = f"{original_username_base}{counter}"
            if len(username) > 150: # Django username max_length is 150
                # If it gets too long with counter, fall back to a truly random one
                username = f"randuser_{random.randint(10000, 99999)}"[:150]
                if User.objects.filter(username=username).exists(): # Check random one too
                    # This is highly unlikely to loop indefinitely but good to have a break
                    break 

        return username

    def handle(self, *args, **options):
        file_name = options['file']

        # CORRECTED PATH CALCULATION: This goes up 4 levels from the current file
        # import_users.py -> commands -> management -> deviations -> deviation_backend (project root)
        project_root = Path(__file__).resolve().parent.parent.parent.parent
        user_list_file_path = os.path.join(project_root, file_name)

        if not os.path.exists(user_list_file_path):
            raise CommandError(self.style.ERROR(f'User list file not found at: {user_list_file_path}'))

        self.stdout.write(self.style.SUCCESS(f'Attempting to import users from: {user_list_file_path}'))

        try:
            # Determine if it's CSV or Excel based on extension
            if file_name.lower().endswith('.csv'):
                df = pd.read_csv(user_list_file_path)
            elif file_name.lower().endswith(('.xls', '.xlsx')):
                df = pd.read_excel(user_list_file_path)
            else:
                raise CommandError("Unsupported file type. Please provide a .csv, .xls, or .xlsx file.")
            
            # Standardize column names (strip whitespace and convert to lowercase with underscores)
            df.columns = [col.strip().replace(' ', '_').lower() for col in df.columns]

            required_cols = ['full_name', 'email_address'] # Expected standardized names
            if not all(col in df.columns for col in required_cols):
                raise CommandError(self.style.ERROR(f'Missing required columns. Expected: "{required_cols[0]}" and "{required_cols[1]}". Found: {df.columns.tolist()}'))

        except Exception as e:
            raise CommandError(self.style.ERROR(f'Error reading user list file: {e}'))

        self.stdout.write(self.style.SUCCESS(f'Starting user import from {file_name}...'))
        
        created_count = 0
        updated_count = 0
        skipped_count = 0
        generated_passwords = {} # To store username: password for output

        for index, row in df.iterrows():
            # Ensure values are strings and strip whitespace
            full_name = str(row['full_name']).strip() if pd.notna(row['full_name']) else ''
            email = str(row['email_address']).strip().lower() if pd.notna(row['email_address']) else ''

            if not email:
                self.stdout.write(self.style.WARNING(f'Skipping row {index + 2} (Excel row): Email address is missing for "{full_name}".'))
                skipped_count += 1
                continue

            username = self._generate_unique_username(email, full_name, index)
            password = self._generate_random_password()

            first_name = ''
            last_name = ''
            if full_name:
                parts = full_name.split(' ', 1) # Split into at most 2 parts
                first_name = parts[0]
                if len(parts) > 1:
                    last_name = parts[1]

            try:
                with transaction.atomic():
                    # Try to get user by email. If not found, create.
                    user, created = User.objects.get_or_create(
                        email=email,
                        defaults={
                            'username': username, # Use the generated unique username for NEW users
                            'first_name': first_name,
                            'last_name': last_name,
                            'is_staff': False,
                            'is_superuser': False,
                        }
                    )
                    if created:
                        user.set_password(password)
                        user.save()
                        generated_passwords[user.username] = password
                        self.stdout.write(self.style.SUCCESS(f'Created user: {user.username} (Email: {user.email})'))
                        created_count += 1
                    else:
                        # User with this email already exists. Update their details and password.
                        # Always update password for existing users to ensure they have the new format.
                        # Update other fields as well.
                        user.username = username # Ensure username is updated to the generated unique one
                        user.first_name = first_name
                        user.last_name = last_name
                        user.set_password(password)
                        user.save(update_fields=['username', 'first_name', 'last_name', 'password'])
                        generated_passwords[user.username] = password
                        self.stdout.write(self.style.WARNING(f'Updated existing user: {user.username} (Email: {user.email})'))
                        updated_count += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error processing user {full_name} ({email}): {e}'))
                skipped_count += 1

        self.stdout.write(self.style.SUCCESS('--- User Import Summary ---'))
        self.stdout.write(self.style.SUCCESS(f'Successfully created: {created_count} users'))
        self.stdout.write(self.style.SUCCESS(f'Updated: {updated_count} existing users'))
        self.stdout.write(self.style.WARNING(f'Skipped: {skipped_count} rows due to errors or missing data'))
        
        self.stdout.write(self.style.NOTICE('\n--- Generated Passwords (IMPORTANT: Save this output securely!) ---'))
        for username, pwd in generated_passwords.items():
            self.stdout.write(f'{username}: {pwd}')
        self.stdout.write(self.style.NOTICE('------------------------------------------------------------------'))
        self.stdout.write(self.style.NOTICE('Remember to keep a record of these generated passwords!'))

