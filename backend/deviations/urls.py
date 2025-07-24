# deviation_tracker_app/deviation_backend/deviations/urls.py (UPDATED - All API Endpoints)

from django.urls import path
from .views import (
    DeviationListCreateAPIView,
    DeviationDetailUpdateDeleteAPIView,
    ActionListCreateAPIView,
    ActionDetailUpdateDeleteAPIView,
    UserListAPIView,        # <--- NEW: Import UserListAPIView
    CurrentUserAPIView,     # <--- NEW: Import CurrentUserAPIView
    ReorderActionsAPIView   # <--- NEW: Import ReorderActionsAPIView
)

urlpatterns = [
    # Deviation URLs
    path('deviations/', DeviationListCreateAPIView.as_view(), name='deviation-list-create'),
    path('deviations/<str:dev_number>/', DeviationDetailUpdateDeleteAPIView.as_view(), name='deviation-detail-update-delete'),

    # Action URLs (nested under deviation)
    path('deviations/<str:dev_number>/actions/', ActionListCreateAPIView.as_view(), name='action-list-create'),
    path('deviations/<str:dev_number>/actions/<int:action_id>/', ActionDetailUpdateDeleteAPIView.as_view(), name='action-detail-update-delete'),

    # NEW: Action Reordering URL
    # This path will be accessed by the frontend as /api/deviations/{dev_number}/reorder_actions/
    path('deviations/<str:dev_number>/reorder_actions/', ReorderActionsAPIView.as_view(), name='reorder-actions'),

    # User API URLs (assuming these are part of your 'api/' namespace)
    path('users/', UserListAPIView.as_view(), name='user-list'),
    path('users/me/', CurrentUserAPIView.as_view(), name='current-user'),
]