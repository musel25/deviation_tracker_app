# deviation_backend/urls.py (UPDATED for JWT Authentication - FINAL VERSION)

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import ( # <--- IMPORT THESE JWT VIEWS
    TokenObtainPairView,
    TokenRefreshView,
)
from deviations.views import UserListAPIView, CurrentUserAPIView # <--- IMPORT NEW USER VIEWS

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('deviations.urls')),

    # JWT Authentication URLs
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'), # Login URL
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'), # Refresh token URL

    # User API URLs
    path('api/users/', UserListAPIView.as_view(), name='user-list'), # List of all users
    path('api/users/me/', CurrentUserAPIView.as_view(), name='current-user'), # Current logged-in user
]

# Only serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)