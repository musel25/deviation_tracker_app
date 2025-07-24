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
