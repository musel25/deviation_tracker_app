# Deviation Tracker App

This project is a web application for tracking deviations, actions, and related documents. It uses Django and Django REST Framework for the backend, and React for the frontend.

## Features
- User authentication (JWT)
- Deviation management
- Action tracking
- File attachments
- Excel data import/export

## Project Structure
- `deviation_backend/`: Django backend configuration
- `deviations/`: Main Django app for deviation tracking
- `frontend/`: React frontend
- `media/`: Uploaded files and attachments

## Setup

### Backend
1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run migrations:
   ```bash
   python manage.py migrate
   ```
3. Start the backend server:
   ```bash
   python manage.py runserver
   ```

## Database Recreation

To completely restore the database with all users, deviations, and file attachments, follow these steps:

### Prerequisites
Ensure these data files are present in the correct locations:

```
deviation_tracker_app/
├── backend/
│   ├── master_user_list.csv        # User data (required)
│   ├── Deviation_Matrix.xlsx       # Deviation data (required)
│   └── manage.py
└── media/
    └── deviation_attachments/       # PDF attachment files
        ├── DEV24-0439.pdf
        ├── DEV25-0003.pdf
        └── *.pdf files...
```

### Step-by-Step Recreation Commands

Navigate to the backend directory first:
```bash
cd backend
```

#### 1. Apply Database Migrations
```bash
python manage.py migrate
```
This creates the database schema with all necessary tables.

#### 2. Import Users (328 users)
```bash
python manage.py import_users
```
- Imports users from `master_user_list.csv`
- Creates usernames from email addresses
- Generates random passwords in format RBXXXX
- Expected result: 328 users imported

#### 3. Import Deviations and Actions
```bash
python manage.py import_deviations
```
- Imports deviations from `Deviation_Matrix.xlsx`
- Creates associated actions for each deviation
- Expected result: ~21 deviations, ~11 actions imported

#### 4. Link PDF Attachments
```bash
python manage.py link_attachments
```
- Links existing PDF files in `media/deviation_attachments/` to their corresponding deviations
- Matches files by deviation number (e.g., DEV24-0439.pdf → DEV24-0439)
- Expected result: ~22 PDF files linked to deviations

#### 5. Create Admin User (Optional)
```bash
python manage.py createsuperuser
```
Follow prompts to create an admin user for Django admin interface.

#### 6. Start the Server
```bash
python manage.py runserver
```

### Verification Commands

Verify the import was successful:

```bash
# Check data counts
python manage.py shell -c "
from django.contrib.auth.models import User
from deviations.models import Deviation, Action
print(f'Users: {User.objects.count()}')
print(f'Deviations: {Deviation.objects.count()}') 
print(f'Actions: {Action.objects.count()}')
print(f'Deviations with attachments: {Deviation.objects.filter(attachment__isnull=False).count()}')
"

# Test file access
curl -I http://localhost:8000/media/deviation_attachments/DEV24-0439.pdf
```

Expected output:
```
Users: 328
Deviations: 21
Actions: 11
Deviations with attachments: 22
```

### Troubleshooting

**Missing CSV/Excel files:**
- Ensure `master_user_list.csv` and `Deviation_Matrix.xlsx` are in the `backend/` folder
- Check file permissions are readable

**PDF files not accessible:**
- Verify PDF files are in `media/deviation_attachments/` directory
- Check `MEDIA_ROOT` setting in `settings.py`
- Ensure development server is running (`python manage.py runserver`)

**Import command errors:**
- Run `python manage.py migrate` first
- Check that CSV/Excel files have the expected column headers
- Verify Django dependencies are installed (`pip install -r requirements.txt`)

**File linking issues:**
- PDF filenames must start with deviation numbers (e.g., `DEV24-0439.pdf`)
- Run `python manage.py link_attachments` after importing deviations

### Data Files Format

**master_user_list.csv** should contain:
- `full_name`: Full name of user
- `email_address`: User's email address

**Deviation_Matrix.xlsx** should contain columns like:
- `DEV NUMBER`: Deviation identifier
- `Created By`: Person who created the deviation
- `Actions`: Action descriptions
- `Action Responsible`: Person responsible for actions
- Additional deviation metadata columns

### Frontend
1. Install Node.js dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the frontend server:
   ```bash
   npm start
   ```

## Usage
- Access the frontend at `http://localhost:3000`
- Backend API is available at `http://localhost:8000`

## Requirements
- Python 3.10+
- Node.js 18+
- Django 5.2.4
- djangorestframework 3.16.0

## License
MIT
